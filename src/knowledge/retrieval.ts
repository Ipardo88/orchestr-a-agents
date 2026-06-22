import type { Env, AgentKnowledgeConfig, KnowledgeContext, KnowledgeChunk } from '../types';
import { embedText } from './embeddings';

interface RetrieveOptions {
  agentId: string;
  phase: string;
  userMessage: string;
  orgId: string;
  config: AgentKnowledgeConfig;
  env: Env;
}

/**
 * Two-track retrieval:
 * Track A — phase-triggered: load all chunks for the phase's topic_slugs (framework knowledge)
 * Track B — vector search: hybrid search on dynamic + company knowledge
 *
 * Results merged and deduplicated by content hash.
 */
export async function retrieveKnowledge(opts: RetrieveOptions): Promise<KnowledgeContext> {
  const { agentId, phase, userMessage, orgId, config, env } = opts;

  const phaseTopicSlugs = config.phaseTopics[phase] ?? config.phaseTopics['default'] ?? [];

  const [trackA, trackB] = await Promise.all([
    phaseTopicSlugs.length > 0
      ? fetchByTopicSlugs(agentId, phaseTopicSlugs, orgId, env)
      : Promise.resolve([] as KnowledgeChunk[]),
    hybridSearch({
      agentId,
      userMessage,
      orgId,
      knowledgeTypes: ['market_intel', 'company_docs', 'company_memory'],
      topK: config.topK,
      env,
    }),
  ]);

  const seen = new Set<string>();
  const merged: KnowledgeChunk[] = [];

  for (const chunk of [...trackA, ...trackB]) {
    const key = chunk.content.slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(chunk);
    }
  }

  return { chunks: merged, topicSlugs: phaseTopicSlugs, phase };
}

/**
 * Load all chunks for specific topic slugs (phase-triggered framework retrieval).
 * Returns them ordered by chunk_index so content reads coherently.
 */
async function fetchByTopicSlugs(
  agentId: string,
  topicSlugs: string[],
  orgId: string,
  env: Env,
): Promise<KnowledgeChunk[]> {
  const slugFilter = topicSlugs.map(s => `"${s}"`).join(',');
  const params = new URLSearchParams({
    agent_id: `eq.${agentId}`,
    topic_slug: `in.(${slugFilter})`,
    knowledge_type: `in.(framework,benchmark)`,
    order: 'chunk_index.asc',
    select: 'content,metadata',
  });
  // Also include org_id IS NULL (global) OR org_id = orgId
  const url = `${env.SUPABASE_URL}/rest/v1/knowledge_chunks?${params}&or=(org_id.is.null,org_id.eq.${orgId})`;

  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error('[retrieval] fetchByTopicSlugs failed', await res.text());
    return [];
  }

  const rows = await res.json<Array<{ content: string; metadata: Record<string, unknown> }>>();
  return rows.map(r => ({ content: r.content, metadata: r.metadata }));
}

interface HybridSearchOpts {
  agentId: string;
  userMessage: string;
  orgId: string;
  knowledgeTypes: string[];
  topK: number;
  env: Env;
}

/**
 * Hybrid RRF search via Supabase RPC.
 * Falls back to empty array on any error (degraded, not broken).
 */
async function hybridSearch(opts: HybridSearchOpts): Promise<KnowledgeChunk[]> {
  const { agentId, userMessage, orgId, knowledgeTypes, topK, env } = opts;

  try {
    const embedding = await embedText(userMessage, env);

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/hybrid_knowledge_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_query_embedding: embedding,
        p_query_text: userMessage,
        p_agent_id: agentId,
        p_knowledge_types: knowledgeTypes,
        p_org_id: orgId,
        p_top_k: topK,
      }),
    });

    if (!res.ok) {
      console.error('[retrieval] hybridSearch RPC failed', await res.text());
      return [];
    }

    return res.json<KnowledgeChunk[]>();
  } catch (err) {
    console.error('[retrieval] hybridSearch error', err);
    return [];
  }
}

interface CaptureMemoryOpts {
  agentId: string;
  orgId: string;
  userMessage: string;
  assistantResponse: string;
  env: Env;
}

/**
 * Extracts decisions/insights from a coaching exchange and stores as company_memory chunks.
 * Called fire-and-forget (captureMemory().catch(() => {})).
 * Only captures if the response looks like a strategic decision (keyword check).
 */
export async function captureMemory(opts: CaptureMemoryOpts): Promise<void> {
  const { agentId, orgId, userMessage, assistantResponse, env } = opts;

  const decisionSignals = /\bdecid|agreed|going\s+with|our\s+choice|we\s+will|confirmed|committed/i;
  if (!decisionSignals.test(userMessage) && !decisionSignals.test(assistantResponse)) {
    return;
  }

  const summary = `User: ${userMessage.slice(0, 300)}\n\nAgent: ${assistantResponse.slice(0, 500)}`;
  const embedding = await embedText(summary, env);
  const topicSlug = `memory-${agentId}-${Date.now()}`;

  const chunk = {
    agent_id: agentId,
    knowledge_type: 'company_memory',
    topic_slug: topicSlug,
    org_id: orgId,
    source: 'platform',
    source_path: `conversation/${Date.now()}`,
    chunk_index: 0,
    content: summary,
    embedding,
    metadata: { auto_captured: true, captured_at: new Date().toISOString() },
  };

  await fetch(`${env.SUPABASE_URL}/rest/v1/knowledge_chunks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(chunk),
  });
}
