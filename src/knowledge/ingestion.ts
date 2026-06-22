import type { Env, IngestRequest, SourceType } from '../types';
import { embedText } from './embeddings';
import { semanticChunk, generateDocumentSummary, contextualizeChunk } from './chunking';
import { UrlAdapter } from './adapters/url';
import { GithubAdapter } from './adapters/github';

function getAdapter(source: SourceType) {
  switch (source) {
    case 'url':    return new UrlAdapter();
    case 'github': return new GithubAdapter();
    // gcs, s3, azure_blob, platform, upload stubs — add later
    default:
      throw new Error(`Source adapter not implemented: ${source}`);
  }
}

/**
 * Full ingestion pipeline:
 * 1. Fetch raw content via source adapter (or use inline content) → store in R2
 * 2. Semantic chunk the text
 * 3. Generate document summary for contextual prefixing
 * 4. Contextualize each chunk (Anthropic pattern)
 * 5. Embed contextualized chunks
 * 6. Upsert into knowledge_chunks
 * 7. Update knowledge_registry
 */
export async function ingestDocument(
  req: IngestRequest,
  env: Env,
): Promise<{ chunkCount: number }> {
  const { agentId, knowledgeType, topicSlug, source, sourcePath, title, orgId } = req;

  // ── 1. Fetch raw content ─────────────────────────────────────────────────────
  let rawText: string;
  if (req.content) {
    rawText = req.content;
  } else {
    const adapter = getAdapter(source);
    rawText = await adapter.fetch(sourcePath);
  }

  // ── 2. Store raw in R2 (audit trail) ─────────────────────────────────────────
  const r2Key = `${agentId}/${knowledgeType}/${topicSlug}/${Date.now()}.md`;
  await env.KNOWLEDGE_BUCKET.put(r2Key, rawText, {
    httpMetadata: { contentType: 'text/markdown' },
    customMetadata: { agentId, knowledgeType, topicSlug, sourcePath, title },
  });

  // ── 3. Register document (upsert) ─────────────────────────────────────────────
  const registryId = await upsertRegistry(req, env);

  // ── 4. Delete existing chunks for this document ───────────────────────────────
  await deleteExistingChunks(agentId, knowledgeType, topicSlug, orgId ?? null, env);

  // ── 5. Chunk + contextualize + embed ──────────────────────────────────────────
  const chunks = semanticChunk(rawText);
  const docSummary = await generateDocumentSummary(rawText, env);

  const rows: Array<{
    agent_id: string;
    knowledge_type: string;
    topic_slug: string;
    org_id: string | null;
    source: string;
    source_path: string;
    chunk_index: number;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const contextualized = await contextualizeChunk(docSummary, chunks[i], env);
    const embedding = await embedText(contextualized, env);

    rows.push({
      agent_id: agentId,
      knowledge_type: knowledgeType,
      topic_slug: topicSlug,
      org_id: orgId ?? null,
      source,
      source_path: sourcePath,
      chunk_index: i,
      content: contextualized,
      embedding,
      metadata: { title, r2Key, originalChunk: chunks[i] },
    });
  }

  // ── 6. Insert chunks ──────────────────────────────────────────────────────────
  await insertChunks(rows, env);

  // ── 7. Mark registry active ───────────────────────────────────────────────────
  await markRegistryActive(registryId, rows.length, env);

  return { chunkCount: rows.length };
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function upsertRegistry(req: IngestRequest, env: Env): Promise<string> {
  // DELETE any existing row first — more reliable than merge-duplicates with expression indexes
  const params = new URLSearchParams({
    agent_id: `eq.${req.agentId}`,
    knowledge_type: `eq.${req.knowledgeType}`,
    topic_slug: `eq.${req.topicSlug}`,
  });
  if (req.orgId) params.set('org_id', `eq.${req.orgId}`);
  else params.set('org_id', 'is.null');
  await supabaseFetch(env, `knowledge_registry?${params}`, 'DELETE', undefined);

  const res = await supabaseFetch(env, 'knowledge_registry', 'POST', {
    agent_id: req.agentId,
    knowledge_type: req.knowledgeType,
    topic_slug: req.topicSlug,
    org_id: req.orgId ?? null,
    source: req.source,
    source_path: req.sourcePath,
    title: req.title,
    status: 'processing',
  }, { Prefer: 'return=representation' });
  const rows = await res.json<Array<{ id: string }>>();
  if (!rows[0]?.id) throw new Error('Failed to insert knowledge_registry');
  return rows[0].id;
}

async function deleteExistingChunks(
  agentId: string,
  knowledgeType: string,
  topicSlug: string,
  orgId: string | null,
  env: Env,
): Promise<void> {
  const params = new URLSearchParams({
    agent_id: `eq.${agentId}`,
    knowledge_type: `eq.${knowledgeType}`,
    topic_slug: `eq.${topicSlug}`,
  });
  if (orgId) params.set('org_id', `eq.${orgId}`);
  else params.set('org_id', 'is.null');

  const res = await supabaseFetch(env, `knowledge_chunks?${params}`, 'DELETE', undefined);
  await assertOk(res, 'deleteExistingChunks');
}

async function insertChunks(rows: object[], env: Env): Promise<void> {
  if (rows.length === 0) return;
  // Batch in groups of 50 to avoid request body limits
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const res = await supabaseFetch(env, 'knowledge_chunks', 'POST', batch);
    await assertOk(res, 'insertChunks batch');
  }
}

async function markRegistryActive(id: string, chunkCount: number, env: Env): Promise<void> {
  const res = await supabaseFetch(
    env,
    `knowledge_registry?id=eq.${id}`,
    'PATCH',
    { status: 'active', chunk_count: chunkCount, last_ingested_at: new Date().toISOString() },
  );
  await assertOk(res, 'markRegistryActive');
}

function supabaseFetch(
  env: Env,
  path: string,
  method: string,
  body?: unknown,
  extra?: Record<string, string>,
): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...extra,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function assertOk(res: Response, ctx: string): Promise<void> {
  if (!res.ok) throw new Error(`[ingestion] ${ctx} failed ${res.status}: ${await res.text()}`);
}
