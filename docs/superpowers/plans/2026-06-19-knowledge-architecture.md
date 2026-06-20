# Knowledge Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give OrchestrA agents professional-grade framework knowledge via a pgvector RAG pipeline — hybrid semantic + full-text retrieval, contextual chunking, company memory capture, and a BaseAgent abstraction so adding new agents requires touching one file.

**Architecture:** Supabase `knowledge_chunks` table with pgvector HNSW index + full-text GIN index. Azure OpenAI `text-embedding-3-small` (1536-dim) embeds chunks. Cloudflare R2 stores raw documents. Agents extend a `BaseAgent` class that auto-retrieves relevant chunks per phase before building the system prompt.

**Tech Stack:** Cloudflare Workers (TypeScript, Wrangler 4.x) · Supabase pgvector · Azure OpenAI text-embedding-3-small · Cloudflare R2 · Reciprocal Rank Fusion hybrid search

## Global Constraints

- Repo: `orchestr-a-agents/` (NOT the platform repo)
- TypeScript strict mode — run `npx tsc --noEmit` before every commit
- Never commit `.dev.vars` — it holds real production secrets
- Never run `git push` — user controls all pushes
- Secrets go in via `wrangler secret put <NAME>` — never hardcode in `wrangler.jsonc`
- No new npm dependencies unless explicitly listed in a task
- All SQL runs via Supabase SQL Editor — no wrangler d1 / psql CLI
- Supabase migration files are named `0NN_snake_case.sql` in `supabase/migrations/`
- Azure OpenAI embedding deployment name: `text-embedding-3-small` (to be confirmed and set as secret `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`)
- R2 bucket name: `orchestr-a-knowledge-raw`
- Existing agents NOT refactored until Task 10 — earlier tasks must not touch `bosAgent.ts`, `businessModelAgent.ts`, `strategyFoundationAgent.ts`, `coach.ts`

---

### Task 1: Supabase Migration 050 — knowledge tables + hybrid search function

**Files:**
- Create: `supabase/migrations/050_knowledge_architecture.sql`

**Interfaces:**
- Produces: `knowledge_chunks` table, `knowledge_registry` table, `hybrid_knowledge_search` RPC function — consumed by Tasks 6, 7, 8

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/050_knowledge_architecture.sql` with this exact content:

```sql
-- 050: Knowledge Architecture — pgvector + hybrid search
-- Run in Supabase SQL Editor

-- Enable pgvector (idempotent in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── knowledge_chunks ──────────────────────────────────────────────────────────
-- One row per text chunk. embedding is 1536-dim (text-embedding-3-small).
-- org_id NULL = global baseline knowledge available to all orgs.
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        TEXT        NOT NULL,
  knowledge_type  TEXT        NOT NULL CHECK (knowledge_type IN ('framework','benchmark','market_intel','company_docs','company_memory')),
  topic_slug      TEXT        NOT NULL,
  org_id          UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  source          TEXT        NOT NULL CHECK (source IN ('github','gcs','s3','azure_blob','url','platform','upload')),
  source_path     TEXT,
  chunk_index     INTEGER     NOT NULL,
  content         TEXT        NOT NULL,
  embedding       VECTOR(1536),
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for filtered queries (agent + type + org + topic)
CREATE INDEX IF NOT EXISTS knowledge_chunks_meta_idx
  ON public.knowledge_chunks (agent_id, knowledge_type, org_id, topic_slug);

-- Full-text search index
CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx
  ON public.knowledge_chunks
  USING GIN (to_tsvector('english', content));

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_or_own_org_chunks" ON public.knowledge_chunks;
CREATE POLICY "global_or_own_org_chunks" ON public.knowledge_chunks
  FOR SELECT USING (
    org_id IS NULL
    OR org_id IN (SELECT org_id FROM get_my_org_ids())
  );

-- Service role needs insert/update/delete for ingestion pipeline
DROP POLICY IF EXISTS "service_role_all_chunks" ON public.knowledge_chunks;
CREATE POLICY "service_role_all_chunks" ON public.knowledge_chunks
  FOR ALL USING (auth.role() = 'service_role');

-- ── knowledge_registry ────────────────────────────────────────────────────────
-- Tracks every document that has been ingested (or is pending).
CREATE TABLE IF NOT EXISTS public.knowledge_registry (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          TEXT        NOT NULL,
  knowledge_type    TEXT        NOT NULL,
  topic_slug        TEXT        NOT NULL,
  org_id            UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  source            TEXT        NOT NULL,
  source_path       TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  chunk_count       INTEGER     DEFAULT 0,
  status            TEXT        DEFAULT 'pending' CHECK (status IN ('pending','processing','active','failed')),
  last_ingested_at  TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_registry_lookup_idx
  ON public.knowledge_registry (agent_id, knowledge_type, org_id, topic_slug);

ALTER TABLE public.knowledge_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_or_own_org_registry" ON public.knowledge_registry;
CREATE POLICY "global_or_own_org_registry" ON public.knowledge_registry
  FOR SELECT USING (
    org_id IS NULL
    OR org_id IN (SELECT org_id FROM get_my_org_ids())
  );

DROP POLICY IF EXISTS "service_role_all_registry" ON public.knowledge_registry;
CREATE POLICY "service_role_all_registry" ON public.knowledge_registry
  FOR ALL USING (auth.role() = 'service_role');

-- ── hybrid_knowledge_search ───────────────────────────────────────────────────
-- Reciprocal Rank Fusion of vector similarity + full-text search.
-- k=60 is the standard RRF constant.
CREATE OR REPLACE FUNCTION public.hybrid_knowledge_search(
  p_query_embedding VECTOR(1536),
  p_query_text      TEXT,
  p_agent_id        TEXT,
  p_knowledge_types TEXT[],
  p_org_id          UUID    DEFAULT NULL,
  p_top_k           INTEGER DEFAULT 5
)
RETURNS TABLE (content TEXT, metadata JSONB, rrf_score FLOAT)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT id, content, metadata, embedding
    FROM public.knowledge_chunks
    WHERE agent_id = p_agent_id
      AND knowledge_type = ANY(p_knowledge_types)
      AND (org_id IS NULL OR org_id = p_org_id)
  ),
  vector_results AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY embedding <=> p_query_embedding) AS v_rank
    FROM base
    ORDER BY embedding <=> p_query_embedding
    LIMIT 20
  ),
  text_results AS (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', p_query_text)) DESC
           ) AS t_rank
    FROM base
    WHERE to_tsvector('english', content) @@ plainto_tsquery('english', p_query_text)
    LIMIT 20
  ),
  fused AS (
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(1.0 / (60 + v.v_rank), 0.0) + COALESCE(1.0 / (60 + t.t_rank), 0.0) AS rrf_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT b.content, b.metadata, f.rrf_score
  FROM fused f
  JOIN base b ON b.id = f.id
  ORDER BY f.rrf_score DESC
  LIMIT p_top_k;
$$;
```

- [ ] **Step 2: Apply migration in Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor → New query.
Paste and run the entire file content.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify tables exist**

In the SQL Editor run:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('knowledge_chunks', 'knowledge_registry');
```
Expected: 2 rows returned.

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'hybrid_knowledge_search';
```
Expected: 1 row returned.

- [ ] **Step 4: Commit migration file**

```bash
cd "C:/Users/ivanp/Documents/OrchestrA-Strategy/orchestr-a-agents"
git add supabase/migrations/050_knowledge_architecture.sql
git commit -m "feat(knowledge): migration 050 — knowledge_chunks, knowledge_registry, hybrid_knowledge_search RPC"
```

---

### Task 2: Infrastructure — wrangler config, types, R2 bucket, secrets

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `Env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, `Env.ADMIN_SECRET`, `Env.KNOWLEDGE_BUCKET` — consumed by all subsequent tasks

- [ ] **Step 1: Create R2 bucket**

```bash
cd "C:/Users/ivanp/Documents/OrchestrA-Strategy/orchestr-a-agents"
npx wrangler r2 bucket create orchestr-a-knowledge-raw
```

Expected output includes: `Created bucket 'orchestr-a-knowledge-raw'`

- [ ] **Step 2: Add R2 binding to wrangler.jsonc**

Edit `wrangler.jsonc`. After the `kv_namespaces` block, add:

```jsonc
  // R2 bucket for raw document storage (audit trail + re-ingestion)
  "r2_buckets": [
    { "binding": "KNOWLEDGE_BUCKET", "bucket_name": "orchestr-a-knowledge-raw" }
  ],
```

Full file after edit:
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "orchestr-a-agents",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-01",
  "compatibility_flags": ["nodejs_compat"],

  "triggers": {
    "crons": [
      "0 9 * * 1",
      "0 8 * * *"
    ]
  },

  "kv_namespaces": [
    { "binding": "AGENT_MEMORY", "id": "cf62243cfa4b4f049e78c166e7f98e84" }
  ],

  "r2_buckets": [
    { "binding": "KNOWLEDGE_BUCKET", "bucket_name": "orchestr-a-knowledge-raw" }
  ],

  "observability": {
    "enabled": true
  }
}
```

- [ ] **Step 3: Update Env interface in src/types.ts**

Add three new fields to the `Env` interface (at the end of the interface, before the closing `}`):

```typescript
export interface Env {
  AZURE_OPENAI_ENDPOINT: string;
  AZURE_OPENAI_API_KEY: string;
  AZURE_OPENAI_DEPLOYMENT: string;
  AZURE_OPENAI_API_VERSION: string;
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: string;  // text-embedding-3-small
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_SECRET: string;                        // guards /admin/ingest
  AGENT_MEMORY: KVNamespace;
  KNOWLEDGE_BUCKET: R2Bucket;
}
```

Also add these knowledge types at the end of `src/types.ts` (after the existing `ChatResponse` interface):

```typescript
// ── Knowledge Architecture ──────────────────────────────────────────────────

export type KnowledgeType = 'framework' | 'benchmark' | 'market_intel' | 'company_docs' | 'company_memory';
export type SourceType = 'github' | 'gcs' | 's3' | 'azure_blob' | 'url' | 'platform' | 'upload';

export interface KnowledgeChunk {
  content: string;
  metadata: Record<string, unknown>;
  rrf_score?: number;
}

export interface AgentKnowledgeConfig {
  /** Map of phase name → array of topic_slugs to load for that phase */
  phaseTopics: Record<string, string[]>;
  /** Max chunks to retrieve per request */
  topK: number;
}

export interface KnowledgeContext {
  chunks: KnowledgeChunk[];
  topicSlugs: string[];
  phase: string;
}

export interface IngestRequest {
  agentId: string;
  knowledgeType: KnowledgeType;
  topicSlug: string;
  source: SourceType;
  sourcePath: string;
  title: string;
  orgId?: string;
}
```

- [ ] **Step 4: Generate updated TypeScript bindings**

```bash
cd "C:/Users/ivanp/Documents/OrchestrA-Strategy/orchestr-a-agents"
npx wrangler types
```

Expected: creates/updates `worker-configuration.d.ts`

- [ ] **Step 5: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 6: Set new secrets on Cloudflare Worker**

```bash
# Set embedding deployment name (interactive prompt will ask for value)
npx wrangler secret put AZURE_OPENAI_EMBEDDING_DEPLOYMENT
# Enter value: text-embedding-3-small

npx wrangler secret put ADMIN_SECRET
# Enter value: a long random string you generate, e.g. openssl rand -hex 32
```

- [ ] **Step 7: Commit**

```bash
git add wrangler.jsonc src/types.ts
git commit -m "feat(knowledge): R2 bucket binding, Env types for embedding + admin secret"
```

---

### Task 3: Embeddings module

**Files:**
- Create: `src/knowledge/embeddings.ts`

**Interfaces:**
- Consumes: `Env.AZURE_OPENAI_ENDPOINT`, `Env.AZURE_OPENAI_API_KEY`, `Env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, `Env.AZURE_OPENAI_API_VERSION`
- Produces: `embedText(text: string, env: Env): Promise<number[]>` — consumed by Tasks 4 and 8

- [ ] **Step 1: Create src/knowledge/embeddings.ts**

```typescript
import type { Env } from '../types';

/**
 * Embed a single string using Azure OpenAI text-embedding-3-small (1536 dims).
 * Returns a float array ready to store as VECTOR(1536) in Supabase.
 */
export async function embedText(text: string, env: Env): Promise<number[]> {
  const url = `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=${env.AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({ input: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const json = await response.json<{ data: Array<{ embedding: number[] }> }>();
  return json.data[0].embedding;
}
```

- [ ] **Step 2: Verify types**

```bash
cd "C:/Users/ivanp/Documents/OrchestrA-Strategy/orchestr-a-agents"
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/knowledge/embeddings.ts
git commit -m "feat(knowledge): embedText — Azure OpenAI text-embedding-3-small wrapper"
```

---

### Task 4: Chunking module

**Files:**
- Create: `src/knowledge/chunking.ts`

**Interfaces:**
- Consumes: `Env` (for Azure OpenAI contextualisation calls)
- Produces:
  - `semanticChunk(text: string, maxTokens?: number): string[]`
  - `contextualizeChunk(docSummary: string, chunk: string, env: Env): Promise<string>`
  - `generateDocumentSummary(text: string, env: Env): Promise<string>`
- Consumed by: Task 6 (ingestion pipeline)

- [ ] **Step 1: Create src/knowledge/chunking.ts**

```typescript
import type { Env } from '../types';

const DEFAULT_CHUNK_TOKENS = 400;
const CHARS_PER_TOKEN = 4; // rough approximation

/**
 * Split text into overlapping chunks by paragraph boundary.
 * Each chunk targets ~maxTokens tokens with 10% overlap.
 */
export function semanticChunk(text: string, maxTokens = DEFAULT_CHUNK_TOKENS): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = Math.floor(maxChars * 0.1);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // overlap: keep tail of current chunk
      const tail = current.slice(-overlapChars);
      current = tail + '\n\n' + para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * Generate a 3-sentence document summary — used as context prefix for each chunk.
 * Implements the Anthropic contextual chunking pattern.
 */
export async function generateDocumentSummary(text: string, env: Env): Promise<string> {
  return callAzure(
    `Summarise this document in 3 sentences. Focus on the main topic, the framework or methodology it describes, and its business application. Document:\n\n${text.slice(0, 4000)}`,
    env,
  );
}

/**
 * Prepend document context to a chunk so the embedding captures where the chunk fits.
 * This is the Anthropic "contextual retrieval" technique.
 */
export async function contextualizeChunk(
  docSummary: string,
  chunk: string,
  env: Env,
): Promise<string> {
  const context = await callAzure(
    `Here is a document summary:\n${docSummary}\n\nHere is a chunk from that document:\n${chunk}\n\nWrite 2-3 sentences that situate this chunk within the document. Explain what topic it covers and why it matters. Be concise — this will be prepended to the chunk for search indexing.`,
    env,
  );
  return `${context}\n\n${chunk}`;
}

async function callAzure(prompt: string, env: Env): Promise<string> {
  const url = `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${env.AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json<{ choices: Array<{ message: { content: string } }> }>();
  return json.choices[0].message.content.trim();
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/knowledge/chunking.ts
git commit -m "feat(knowledge): semantic chunking + Anthropic contextual retrieval"
```

---

### Task 5: Source adapters

**Files:**
- Create: `src/knowledge/adapters/types.ts`
- Create: `src/knowledge/adapters/url.ts`
- Create: `src/knowledge/adapters/github.ts`

**Interfaces:**
- Produces: `SourceAdapter` interface + two implementations with `fetch(path: string): Promise<string>`
- Consumed by: Task 6 (ingestion pipeline)

- [ ] **Step 1: Create src/knowledge/adapters/types.ts**

```typescript
/** Every source adapter must implement this interface. */
export interface SourceAdapter {
  /** Fetch raw text content from the given path/URL. */
  fetch(path: string): Promise<string>;
}
```

- [ ] **Step 2: Create src/knowledge/adapters/url.ts**

Fetches plain text or markdown from any HTTPS URL.

```typescript
import type { SourceAdapter } from './types';

export class UrlAdapter implements SourceAdapter {
  async fetch(url: string): Promise<string> {
    const response = await globalThis.fetch(url);
    if (!response.ok) {
      throw new Error(`URL fetch failed ${response.status}: ${url}`);
    }
    return response.text();
  }
}
```

- [ ] **Step 3: Create src/knowledge/adapters/github.ts**

Fetches a raw file from a GitHub repo using the GitHub raw content CDN.
`path` format: `owner/repo/branch/path/to/file.md`

```typescript
import type { SourceAdapter } from './types';

export class GithubAdapter implements SourceAdapter {
  async fetch(path: string): Promise<string> {
    // path = "owner/repo/branch/path/to/file.md"
    const url = `https://raw.githubusercontent.com/${path}`;
    const response = await globalThis.fetch(url, {
      headers: { Accept: 'text/plain' },
    });
    if (!response.ok) {
      throw new Error(`GitHub fetch failed ${response.status}: ${url}`);
    }
    return response.text();
  }
}
```

- [ ] **Step 4: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/knowledge/adapters/
git commit -m "feat(knowledge): source adapters — SourceAdapter interface, URL + GitHub implementations"
```

---

### Task 6: Ingestion pipeline

**Files:**
- Create: `src/knowledge/ingestion.ts`

**Interfaces:**
- Consumes: `embedText`, `semanticChunk`, `contextualizeChunk`, `generateDocumentSummary`, `SourceAdapter` implementations, `Env`, `IngestRequest`
- Produces: `ingestDocument(req: IngestRequest, env: Env): Promise<{ chunkCount: number }>` — called by `/admin/ingest` endpoint (Task 7)

- [ ] **Step 1: Create src/knowledge/ingestion.ts**

```typescript
import type { Env, IngestRequest, SourceType } from '../types';
import { embedText } from './embeddings';
import { semanticChunk, generateDocumentSummary, contextualizeChunk } from './chunking';
import { UrlAdapter } from './adapters/url';
import { GithubAdapter } from './adapters/github';

function getAdapter(source: SourceType) {
  switch (source) {
    case 'url':      return new UrlAdapter();
    case 'github':   return new GithubAdapter();
    // gcs, s3 stubs — add later
    default:
      throw new Error(`Source adapter not implemented: ${source}`);
  }
}

/**
 * Full ingestion pipeline:
 * 1. Fetch raw content via source adapter → store in R2
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

  // ── 1. Fetch raw content ────────────────────────────────────────────────────
  const adapter = getAdapter(source);
  const rawText = await adapter.fetch(sourcePath);

  // ── 2. Store raw in R2 (audit trail) ───────────────────────────────────────
  const r2Key = `${agentId}/${knowledgeType}/${topicSlug}/${Date.now()}.md`;
  await env.KNOWLEDGE_BUCKET.put(r2Key, rawText, {
    httpMetadata: { contentType: 'text/markdown' },
    customMetadata: { agentId, knowledgeType, topicSlug, sourcePath, title },
  });

  // ── 3. Register document (upsert) ──────────────────────────────────────────
  const registryId = await upsertRegistry(req, env);

  // ── 4. Delete existing chunks for this document ────────────────────────────
  await deleteExistingChunks(agentId, knowledgeType, topicSlug, orgId ?? null, env);

  // ── 5. Chunk + contextualize + embed ───────────────────────────────────────
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

  // ── 6. Insert chunks ────────────────────────────────────────────────────────
  await insertChunks(rows, env);

  // ── 7. Mark registry active ─────────────────────────────────────────────────
  await markRegistryActive(registryId, rows.length, env);

  return { chunkCount: rows.length };
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function upsertRegistry(req: IngestRequest, env: Env): Promise<string> {
  const body = {
    agent_id: req.agentId,
    knowledge_type: req.knowledgeType,
    topic_slug: req.topicSlug,
    org_id: req.orgId ?? null,
    source: req.source,
    source_path: req.sourcePath,
    title: req.title,
    status: 'processing',
  };

  const res = await supabaseFetch(env, 'knowledge_registry', 'POST', body, {
    Prefer: 'return=representation,resolution=merge-duplicates',
  });
  const rows = await res.json<Array<{ id: string }>>();
  if (!rows[0]?.id) throw new Error('Failed to upsert knowledge_registry');
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

  await supabaseFetch(env, `knowledge_chunks?${params}`, 'DELETE', undefined);
}

async function insertChunks(rows: object[], env: Env): Promise<void> {
  if (rows.length === 0) return;
  // Batch in groups of 50 to avoid request body limits
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    await supabaseFetch(env, 'knowledge_chunks', 'POST', batch);
  }
}

async function markRegistryActive(id: string, chunkCount: number, env: Env): Promise<void> {
  await supabaseFetch(
    env,
    `knowledge_registry?id=eq.${id}`,
    'PATCH',
    { status: 'active', chunk_count: chunkCount, last_ingested_at: new Date().toISOString() },
  );
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
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/knowledge/ingestion.ts
git commit -m "feat(knowledge): ingestion pipeline — fetch, chunk, contextualize, embed, store"
```

---

### Task 7: Admin ingest endpoint

**Files:**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `ingestDocument` from Task 6, `Env.ADMIN_SECRET`
- Produces: `POST /admin/ingest` endpoint — accepts `IngestRequest`, returns `{ chunkCount, registryId }`

- [ ] **Step 1: Add import at top of src/index.ts**

After the existing imports, add:

```typescript
import { ingestDocument } from './knowledge/ingestion';
import type { IngestRequest } from './types';
```

- [ ] **Step 2: Add /admin/ingest route in src/index.ts**

Insert this block just before the final `return new Response('Not found', ...)` line:

```typescript
    // Admin: POST /admin/ingest — seed framework knowledge
    // Protected by ADMIN_SECRET header to prevent unauthorized ingestion.
    if (request.method === 'POST' && url.pathname === '/admin/ingest') {
      const secret = request.headers.get('x-admin-secret');
      if (!secret || secret !== env.ADMIN_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
      }

      const body = await request.json<IngestRequest>();
      if (!body.agentId || !body.knowledgeType || !body.topicSlug || !body.source || !body.sourcePath || !body.title) {
        return Response.json({ error: 'Missing required fields: agentId, knowledgeType, topicSlug, source, sourcePath, title' }, { status: 400, headers: CORS });
      }

      try {
        const result = await ingestDocument(body, env);
        return Response.json({ ok: true, ...result }, { headers: CORS });
      } catch (err) {
        console.error('[admin/ingest] error:', err);
        return Response.json(
          { error: err instanceof Error ? err.message : 'Ingestion failed' },
          { status: 500, headers: CORS },
        );
      }
    }
```

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Deploy to Cloudflare**

```bash
npx wrangler deploy
```

Expected: `Deployed orchestr-a-agents` with a Worker URL.

- [ ] **Step 5: Smoke-test the endpoint**

Replace `YOUR_WORKER_URL` and `YOUR_ADMIN_SECRET` with real values:

```bash
curl -X POST https://YOUR_WORKER_URL/admin/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"agentId":"test","knowledgeType":"framework","topicSlug":"test-chunk","source":"url","sourcePath":"https://example.com","title":"Test"}'
```

Expected: `{"ok":true,"chunkCount":1}`

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat(knowledge): POST /admin/ingest endpoint with ADMIN_SECRET auth"
```

---

### Task 8: Retrieval module

**Files:**
- Create: `src/knowledge/retrieval.ts`

**Interfaces:**
- Consumes: `embedText`, `Env`, `AgentKnowledgeConfig`, `KnowledgeContext`, `KnowledgeChunk`
- Produces:
  - `retrieveKnowledge(opts): Promise<KnowledgeContext>` — main entry point for agents
  - `captureMemory(opts): Promise<void>` — background memory capture after each turn
- Consumed by: Task 9 (BaseAgent)

- [ ] **Step 1: Create src/knowledge/retrieval.ts**

```typescript
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
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/knowledge/retrieval.ts
git commit -m "feat(knowledge): retrieval — phase-triggered + hybrid RRF search + company memory capture"
```

---

### Task 9: BaseAgent abstract class + types

**Files:**
- Create: `src/agents/base/types.ts`
- Create: `src/agents/base/BaseAgent.ts`

**Interfaces:**
- Consumes: `retrieveKnowledge`, `captureMemory`, `callOpenAIText`, `Env`, `CompanyContext`, `ChatMessage`, `AgentKnowledgeConfig`, `KnowledgeContext`
- Produces:
  - `BaseAgent` abstract class with `run()`, `detectPhase()`, abstract `buildSystemPrompt()`
  - `RoutingConfig` interface with `routingSignals`, `stickySignals`, `domainKey`
- Consumed by: Task 10 (refactored agents)

- [ ] **Step 1: Create src/agents/base/types.ts**

```typescript
export interface RoutingConfig {
  /** Regex patterns that hard-route a message to this agent */
  routingSignals: RegExp;
  /** Regex patterns that keep routing to this agent when already in domain */
  stickySignals: RegExp;
  /** Key in DomainState to mark as 'active' when this agent runs */
  domainKey: string;
}
```

- [ ] **Step 2: Create src/agents/base/BaseAgent.ts**

```typescript
import { callOpenAIText } from '../../tools/openai';
import { retrieveKnowledge, captureMemory } from '../../knowledge/retrieval';
import type { Env, CompanyContext, ChatMessage, AgentKnowledgeConfig, KnowledgeContext } from '../../types';
import type { RoutingConfig } from './types';

export abstract class BaseAgent {
  abstract readonly agentId: string;
  abstract readonly description: string;
  abstract readonly knowledgeConfig: AgentKnowledgeConfig;
  abstract readonly routing: RoutingConfig;

  /**
   * Build the system prompt given company context, retrieved knowledge, and history.
   * Called by run() after knowledge retrieval completes.
   */
  abstract buildSystemPrompt(
    ctx: CompanyContext,
    knowledge: KnowledgeContext,
    history: ChatMessage[],
  ): string;

  /**
   * Main entry point. Retrieves knowledge, builds prompt, calls LLM, captures memory.
   */
  async run(
    ctx: CompanyContext,
    history: ChatMessage[],
    userMessage: string,
    env: Env,
  ): Promise<string> {
    const phase = this.detectPhase(history, userMessage);

    const knowledge = await retrieveKnowledge({
      agentId: this.agentId,
      phase,
      userMessage,
      orgId: ctx.id,
      config: this.knowledgeConfig,
      env,
    });

    const systemPrompt = this.buildSystemPrompt(ctx, knowledge, history);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter(m => m.role !== 'tool' && m.content)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
      { role: 'user', content: userMessage },
    ];

    const { content } = await callOpenAIText(
      {
        endpoint: env.AZURE_OPENAI_ENDPOINT,
        apiKey: env.AZURE_OPENAI_API_KEY,
        deployment: env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: env.AZURE_OPENAI_API_VERSION,
      },
      messages,
      950,
    );

    if (!content) throw new Error(`Empty response from ${this.agentId}`);

    captureMemory({ agentId: this.agentId, orgId: ctx.id, userMessage, assistantResponse: content, env }).catch(() => {});

    return content;
  }

  /**
   * Detect current sub-phase from recent conversation history.
   * Tries each phaseSignal key in order; returns first match.
   * Falls back to the first key in phaseTopics.
   */
  detectPhase(history: ChatMessage[], userMessage: string): string {
    const recent = [
      ...history.slice(-8).map(m => m.content ?? ''),
      userMessage,
    ].join(' ');

    const phases = Object.keys(this.knowledgeConfig.phaseTopics);
    for (const phase of phases) {
      // Phase key is also used as a regex pattern for detection
      if (phase !== 'default' && new RegExp(phase, 'i').test(recent)) {
        return phase;
      }
    }
    return phases[0] ?? 'default';
  }

  /**
   * Format retrieved knowledge chunks as a <knowledge> block for injection
   * into the system prompt.
   */
  protected formatKnowledge(knowledge: KnowledgeContext): string {
    if (knowledge.chunks.length === 0) return '';

    const lines = [
      '<knowledge>',
      `Phase: ${knowledge.phase} | Topics: ${knowledge.topicSlugs.join(', ')}`,
      '',
      ...knowledge.chunks.map((c, i) => `[${i + 1}] ${c.content}`),
      '</knowledge>',
    ];
    return lines.join('\n');
  }
}
```

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/agents/base/
git commit -m "feat(knowledge): BaseAgent abstract class + RoutingConfig interface"
```

---

### Task 10: Agent registry + refactor existing agents + data-driven routing

**Files:**
- Modify: `src/agents/bosAgent.ts`
- Modify: `src/agents/businessModelAgent.ts`
- Modify: `src/agents/strategyFoundationAgent.ts`
- Create: `src/agents/registry.ts`
- Modify: `src/agents/coach.ts`

**Interfaces:**
- Consumes: `BaseAgent`, `RoutingConfig`, all existing agent system prompt builders
- Produces: `AGENTS: Map<string, BaseAgent>` registry + data-driven routing in coach.ts

- [ ] **Step 1: Refactor src/agents/bosAgent.ts**

Replace the entire file with:

```typescript
import { BaseAgent } from './base/BaseAgent';
import type { RoutingConfig } from './base/types';
import type { CompanyContext, ChatMessage, AgentKnowledgeConfig, KnowledgeContext } from '../types';

export class BosAgent extends BaseAgent {
  readonly agentId = 'bos';
  readonly description = 'Business Operating System — OKRs, KPIs, Capability Mapping';

  readonly knowledgeConfig: AgentKnowledgeConfig = {
    phaseTopics: {
      default: ['okr-methodology', 'kpi-design', 'capability-mapping'],
      'okr|objective|key result': ['okr-methodology'],
      'kpi|metric|threshold': ['kpi-design'],
      'capability': ['capability-mapping'],
    },
    topK: 5,
  };

  readonly routing: RoutingConfig = {
    routingSignals: /\bokrs?\b|key\s*results?|\bobjectives?\b|\bkpis?\b|business\s*operating\s*system|\bbos\b|check[\s-]?in|strategy\s+execution|execution\s+layer|capability\s+map/i,
    stickySignals: /\bokrs?\b|\bkpis?\b|\bobjectives?\b|key\s*results?|execution\s+layer|\bbos\b/i,
    domainKey: 'bos',
  };

  buildSystemPrompt(ctx: CompanyContext, knowledge: KnowledgeContext, _history: ChatMessage[]): string {
    const knowledgeBlock = this.formatKnowledge(knowledge);
    return buildBosSystemPrompt(ctx) + (knowledgeBlock ? `\n\n${knowledgeBlock}` : '');
  }
}

// Keep all existing buildBosPrompt logic as buildBosSystemPrompt (internal helper)
function buildBosSystemPrompt(ctx: CompanyContext): string {
  const lines: string[] = [];

  lines.push('<company_context>');
  lines.push(`Company: ${ctx.name}`);
  if (ctx.industry)  lines.push(`Industry: ${ctx.industry}`);
  if (ctx.stage)     lines.push(`Stage: ${ctx.stage}`);
  if (ctx.mission)   lines.push(`Mission: ${ctx.mission}`);
  if (ctx.vision)    lines.push(`Vision: ${ctx.vision}`);

  lines.push('');
  lines.push('Strategic Goals (what the BOS must deliver against):');
  if (ctx.strategic_goals.length) {
    ctx.strategic_goals.forEach((g, i) =>
      lines.push(`  ${i + 1}. [${g.category}] ${g.goal}${g.timeframe ? ` — by ${g.timeframe}` : ''}`)
    );
  } else {
    lines.push('  None defined yet — strategy foundation is incomplete.');
  }

  lines.push('');
  lines.push('Playing to Win (strategic choices):');
  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.winning_aspiration)  lines.push(`  Winning Aspiration: ${s.winning_aspiration}`);
    if (s.where_to_play)       lines.push(`  Where to Play: ${s.where_to_play}`);
    if (s.how_to_win)          lines.push(`  How to Win: ${s.how_to_win}`);
    if (s.must_have_capabilities.length)
      lines.push(`  Must-Have Capabilities: ${s.must_have_capabilities.join(', ')}`);
  } else {
    lines.push('  Not defined — strategic choices are missing.');
  }

  lines.push('');
  lines.push('Current OKRs (active objectives):');
  if (ctx.objectives.length) {
    ctx.objectives.forEach(o =>
      lines.push(`  [${o.level.toUpperCase()}] "${o.title}" — ${o.status}, ${Math.round(o.progress)}% progress`)
    );
  } else {
    lines.push('  No OKRs defined yet.');
  }

  lines.push('');
  lines.push('Current KPIs:');
  if (ctx.kpis.length) {
    ctx.kpis.forEach(k => {
      const curr = k.current_value != null ? `current: ${k.current_value}${k.unit ?? ''}` : 'no current value';
      const tgt  = k.target_value != null ? `target: ${k.target_value}${k.unit ?? ''}` : '';
      const alert = k.threshold_red != null ? `red alert: ${k.threshold_red}${k.unit ?? ''}` : '';
      const parts = [curr, tgt, alert].filter(Boolean).join(' · ');
      lines.push(`  ${k.name} (${k.directionality}) — ${parts}`);
    });
  } else {
    lines.push('  No KPIs configured.');
  }

  lines.push('');
  lines.push('Capabilities:');
  if (ctx.capabilities.length) {
    ctx.capabilities.forEach(c =>
      lines.push(`  ${c.is_critical ? '[CRITICAL] ' : ''}${c.name}${c.description ? ` — ${c.description}` : ''}`)
    );
  } else {
    lines.push('  No capabilities mapped yet.');
  }
  lines.push('</company_context>');

  lines.push(`
<role>
You are the Business Operating System Architect — a specialist agent in the OrchestrA multi-agent system. Your job is to help the user design, align, and improve the execution layer of their business: OKRs, KPIs, and capabilities.

The BOS is not a reporting tool — it is the operating system that translates strategic choices into what people work on every day. A well-designed BOS makes strategy visible, measurable, and executable.

You are diagnostic and direct. Start by analyzing what's already in the platform, identify misalignments immediately, then guide the user to improve.
</role>

<methodology>
Always begin with a DIAGNOSTIC before designing anything new. Work through four sub-phases:

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5A — OKR ALIGNMENT REVIEW (always start here)
───────────────────────────────────────────────────────────────────────────────
Analyze the existing OKRs against the strategic goals and Playing to Win choices.

Diagnostic questions to answer before responding:
1. How many OKRs exist? Are there any at-risk or behind?
2. Do the OKRs cover all 5 strategic goals, or are some goals unaddressed?
3. Are there OKRs that don't map to any strategic goal (orphaned)?
4. Are there company-level OKRs? BU-level? Team-level? Is the cascade logical?
5. Are the at-risk/behind OKRs the most strategically critical ones?

Open with a clear diagnosis: "Here is what I see in your BOS..." Then surface the top 2-3 most important issues.

If no OKRs exist: immediately move to 5B (OKR Design) and say so.

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5B — OKR DESIGN (create or refine)
───────────────────────────────────────────────────────────────────────────────
Guide the user to create or refine objectives and key results.

OKR design principles:
- Objectives: qualitative, ambitious, inspiring. Answers "what do we want to achieve?"
- Key Results: measurable, specific, time-bound. 2-4 per objective. Answers "how will we know we got there?"
- Cascade: company OKRs → BU OKRs → team OKRs. Each level supports the one above.
- Alignment: every OKR should be traceable to a strategic goal or a "how to win" choice.

When designing:
1. Start from the strategic goals: "For [Goal X], what's the most important thing we need to achieve this quarter/year?"
2. Draft an objective together
3. Ask for 2-4 key results: specific metrics with current and target values
4. Confirm alignment: "Does this directly support [Strategic Goal]?"
5. Identify owner and cycle dates

For at-risk/behind OKRs: ask "What's causing the gap? Is it an execution problem or a misaligned target?"

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5C — KPI DESIGN
───────────────────────────────────────────────────────────────────────────────
Review existing KPIs and identify gaps.

KPI design principles:
- Leading vs lagging: good dashboards have both
- Directionality: higher_better or lower_better
- Thresholds: amber (early warning) and red (action required) for every KPI
- Coverage: KPIs should span revenue, efficiency, customer, and people

Diagnostic:
1. Do KPIs cover all strategic goals? Which goals have no KPI?
2. Are thresholds set? If not, which KPIs are flying blind?
3. Is there a balance of leading and lagging indicators?

───────────────────────────────────────────────────────────────────────────────
SUB-PHASE 5D — CAPABILITY MAPPING
───────────────────────────────────────────────────────────────────────────────
Capabilities are what the business must be genuinely excellent at to execute its strategy.

If strategic choices are defined (How to Win + must-have capabilities):
1. Are those capabilities already mapped in the platform?
2. For each must-have capability: what's the current state vs. what's needed to win?
3. Are there OKRs or KPIs linked to capability development?

If capabilities are missing entirely:
1. Derive them from the How to Win statement
2. Ask: "To win by [how_to_win], what must [company] be genuinely excellent at?"
</methodology>

<bos_rules>
Start with a diagnostic. Never jump straight to design without first assessing what's already there.
Name the problem clearly. "Your BP Copilot OKR is at 30% and at risk — that's your most strategically critical objective and it's the furthest behind."
One thread at a time. Complete the alignment review before moving to KPI design.
Quantify everything. Every OKR needs a number. Every KPI needs a target and a threshold.
Connect to strategy. Every design decision must trace back to a strategic goal or a "how to win" choice.
Reference the platform. "You can create this objective directly in Strategy Execution → OKRs."
</bos_rules>

<active_directive>
Every response MUST end with:

**Next:** [one specific action — the issue to address, the OKR to fix, the KPI to add, the question to answer]
</active_directive>`);

  return lines.join('\n');
}

// Backward-compatible function export (used in coach.ts until Task 10 routing update)
export async function runBosAgent(
  ctx: CompanyContext,
  history: ChatMessage[],
  userMessage: string,
  env: import('../types').Env,
): Promise<string> {
  return new BosAgent().run(ctx, history, userMessage, env);
}
```

- [ ] **Step 2: Create src/agents/registry.ts**

```typescript
import { BosAgent } from './bosAgent';
import type { BaseAgent } from './base/BaseAgent';

// Central registry — add new agents here, nothing else changes.
export const AGENTS: Map<string, BaseAgent> = new Map([
  ['bos', new BosAgent()],
  // business-model and strategy-foundation agents remain as plain functions
  // until they are also refactored to extend BaseAgent (follow-up sprint).
]);

export function getAgent(agentId: string): BaseAgent | undefined {
  return AGENTS.get(agentId);
}
```

- [ ] **Step 3: Update routing in src/agents/coach.ts**

Replace the hardcoded `detectRoute` BOS section with registry-driven routing. Find the `detectRoute` function and update the explicit-signal check to use the registry:

```typescript
import { AGENTS } from './registry';

// In detectRoute(), replace the hardcoded BOS check:
// OLD:
//   if (/\bokrs?\b|.../.test(msg)) return 'bos';
// NEW:
for (const [agentId, agent] of AGENTS.entries()) {
  if (agent.routing.routingSignals.test(msg)) return agentId as AgentRoute;
}
```

Similarly update the sticky routing check:

```typescript
// OLD: if (/\bokrs?\b|.../.test(recent)) return 'bos';
// NEW:
for (const [agentId, agent] of AGENTS.entries()) {
  if (agent.routing.stickySignals.test(recent)) return agentId as AgentRoute;
}
```

And in `runCoachAgent`, replace the `case 'bos':` switch arm with:

```typescript
const agent = getAgent(route);
if (agent) {
  assistantContent = await agent.run(ctx, history, userMessage, env);
} else {
  // fallback for non-registry agents
  switch (route) {
    case 'supervisor':          assistantContent = await runSupervisorAgent(...); break;
    case 'strategy-foundation': assistantContent = await runStrategyFoundationAgent(...); break;
    case 'business-model':      assistantContent = await runBusinessModelAgent(...); break;
    default:                    assistantContent = await runSupervisorAgent(...); break;
  }
}
```

- [ ] **Step 4: Verify types**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Deploy**

```bash
npx wrangler deploy
```

Expected: successful deploy.

- [ ] **Step 6: Commit**

```bash
git add src/agents/bosAgent.ts src/agents/registry.ts src/agents/coach.ts
git commit -m "feat(knowledge): BosAgent extends BaseAgent, registry-driven routing in coach"
```

---

### Task 11: Baseline framework content — write and seed

**Files:**
- Create: `src/content/bos/okr-methodology.md`
- Create: `src/content/bos/kpi-design.md`
- Create: `src/content/bos/capability-mapping.md`

**Interfaces:**
- Consumes: `/admin/ingest` endpoint (Task 7)
- Produces: Seeded `knowledge_chunks` rows for the BOS agent's framework knowledge

- [ ] **Step 1: Create src/content/bos/okr-methodology.md**

```markdown
# OKR Methodology — Framework Reference

## What are OKRs?

OKRs (Objectives and Key Results) are a goal-setting framework that connects ambitious qualitative goals (Objectives) to specific, measurable outcomes (Key Results). Developed at Intel and popularized by Google, they operate on a quarterly or annual cadence and cascade from company level through business units to individual teams.

## Anatomy of a Good OKR

**Objective** — Qualitative, ambitious, and inspiring. It answers: *What do we want to achieve?*
- Bad: "Improve NRR"
- Good: "Become the undisputed leader in customer retention in our segment"

**Key Results** — 2–4 per objective. Measurable, specific, time-bound. They answer: *How will we know we got there?*
- Bad: "Increase NRR"
- Good: "Increase NRR from 107% to 120% by Q4"
- Good: "Reduce average time-to-resolution from 4h to 1.5h by end of quarter"
- Good: "Achieve NPS ≥ 50 in the enterprise segment"

## OKR Cascade

Company OKRs define what the whole business is optimising for. BU OKRs translate company OKRs into what that unit is responsible for. Team OKRs show how each team contributes. Every OKR should be traceable upward to a company objective or a strategic goal.

**Cascade test:** "If every team achieves its OKRs, will the company OKR be achieved?" If no, the cascade is broken.

## Status and Health

- **On track** — progress is proportional to time elapsed (≥70% of expected pace)
- **At risk** — below expected pace; intervention needed within the quarter
- **Behind** — significantly below pace; unlikely to achieve without major changes

A healthy OKR portfolio has ≥80% on track. If all OKRs are green, they are not ambitious enough (Stretch OKR principle: 70% achievement = 100%).

## Common OKR Mistakes

1. **Too many OKRs** — 3–5 per level is the maximum. More = no focus.
2. **Output OKRs not outcome OKRs** — "Launch feature X" is a task, not a key result. "Increase daily active users by 20% through feature X" is a KR.
3. **Missing baseline** — Every KR needs a start value. "Grow from X to Y" is better than "achieve Y".
4. **No owner** — Each objective needs a named owner accountable for the outcome.
5. **OKRs disconnected from strategy** — If an OKR doesn't trace to a strategic goal or Playing to Win choice, it shouldn't exist.

## OKR Design Checklist

- [ ] Objective is qualitative and ambitious (stretch goal)
- [ ] 2–4 measurable key results per objective
- [ ] Each KR has a start value, target value, and deadline
- [ ] Each objective has a named owner
- [ ] Each objective links to a strategic goal or How to Win choice
- [ ] Cascade is logical: team OKRs support BU OKRs, BU OKRs support company OKRs
- [ ] No more than 5 objectives per level

## Quarterly Check-in Process

Weekly: teams update KR progress (current_value)
Monthly: review at-risk OKRs, agree on course corrections
End of quarter: score KRs (0.0–1.0), reflect on what was learned
Next quarter: reset with new OKRs informed by what you learned
```

- [ ] **Step 2: Create src/content/bos/kpi-design.md**

```markdown
# KPI Design — Framework Reference

## What is a KPI?

A Key Performance Indicator (KPI) is a metric that measures how effectively a company is achieving its key business objectives. Unlike OKRs (which are time-bound aspirational goals), KPIs are ongoing measurements of business health.

## Leading vs. Lagging Indicators

**Lagging indicators** measure outcomes after they happen:
- Net Revenue Retention (NRR), Churn Rate, Revenue, Profit Margin
- They confirm past performance but can't predict future results

**Leading indicators** measure activities that drive future outcomes:
- Pipeline coverage, Sales cycle length, Feature adoption rate, Support ticket resolution time
- They predict future performance but require interpretation

A healthy KPI dashboard balances both types. Rule of thumb: 40% leading, 60% lagging.

## KPI Design Principles

**1. Directionality** — Every KPI must have explicit directionality:
- `higher_better`: Revenue, NRR, NPS, Conversion Rate
- `lower_better`: Churn Rate, CAC, Time to Resolution, Bug Count

**2. Thresholds** — Every KPI needs two alert levels:
- **Amber (early warning)**: "We need to investigate, but not panic"
- **Red (action required)**: "Stop everything, this needs immediate attention"

Example: NRR at 115% target
- Amber: below 108% (slipping)
- Red: below 100% (net revenue is shrinking)

**3. Coverage** — KPIs should span four areas:
- **Revenue**: NRR, ARR growth, Win rate, ACV
- **Efficiency**: CAC, LTV:CAC ratio, Gross Margin, Burn Multiple
- **Customer**: NPS, Churn, Time-to-value, Support CSAT
- **People**: Headcount vs plan, Attrition rate, eNPS

## KPI Hierarchy

**Company-level KPIs**: 5–8 KPIs that the CEO and board track. These should directly reflect strategic goals.

**BU/functional KPIs**: 3–6 per function that cascade from company KPIs. Sales tracks pipeline and win rate; Customer Success tracks NRR and churn; Engineering tracks deploy frequency and cycle time.

**Never track more than 10 KPIs at any level.** More = noise, not insight.

## Threshold-Setting Method

Use the historical trend or industry benchmark as the baseline:

1. Identify the target value (from strategic planning)
2. Look at the last 12 months of performance
3. Amber threshold = 10–15% below target
4. Red threshold = 20–25% below target (or the point where strategic goals are at risk)

Example: Target NRR = 120%
- Amber: 110% (10% below target)
- Red: 100% (net churn begins, strategy at risk)

## Common KPI Mistakes

1. **KPIs without targets** — A metric without a target is just data, not a KPI
2. **KPIs without thresholds** — Flying blind; you don't know when to act
3. **Vanity KPIs** — Metrics that look good but don't connect to strategy (e.g., "total users" without engagement data)
4. **Too many KPIs** — More than 10 at any level creates analysis paralysis
5. **Inconsistent measurement** — KPI definition changes quarter-to-quarter makes trending impossible
```

- [ ] **Step 3: Create src/content/bos/capability-mapping.md**

```markdown
# Capability Mapping — Framework Reference

## What is a Business Capability?

A capability is something a business must be able to DO to execute its strategy. Capabilities are not processes, tools, or people — they are the combination of skills, systems, culture, and knowledge that enable a specific type of value creation.

Examples:
- "Customer segmentation and targeting"
- "Rapid product iteration (≤2-week cycle)"
- "Channel partner management"
- "Real-time financial analytics"

## Capabilities vs. Activities

Activities are what you do day-to-day. Capabilities are what you must be genuinely excellent at to win.

| Activity | Underlying Capability |
|----------|----------------------|
| Running sales calls | Consultative enterprise selling |
| Shipping software | Rapid product development |
| Sending invoices | Revenue operations excellence |

## The Playing to Win Connection

Capabilities flow directly from the How to Win choice. If the strategy is "win by being the easiest platform to implement in the mid-market," the critical capabilities must include:
- Fast, low-friction onboarding
- Integration ecosystem breadth
- Segment-specific customer success

**Test:** "If we had this capability at world-class level, would it materially advance our How to Win?" If yes, it's strategic. If no, it's table stakes.

## Critical vs. Supporting Capabilities

**Critical** (must be world-class): 2–4 capabilities that are the source of competitive advantage. These deserve disproportionate investment. Tied directly to How to Win.

**Supporting** (table stakes): Capabilities you must have to operate, but that don't differentiate. Finance, basic HR, compliance. These should be efficient, not excellent.

## Capability Assessment Framework

For each critical capability, assess two dimensions:
1. **Current state** (0–10): How good are we today?
2. **Required state** (0–10): How good do we need to be to win?

**Gap = Required − Current**

Gaps > 4 are strategic risks. Gaps > 6 are existential threats to the strategy.

## Linking Capabilities to OKRs

Every critical capability gap should have an OKR or KPI attached:
- OKR: "Build world-class onboarding capability — reduce time-to-first-value from 45 to 7 days"
- KPI: "Onboarding completion rate > 90% within 30 days of contract sign"

If a capability gap exists with no OKR or KPI, the business is not investing in its own strategy.

## Capability Mapping Process

1. Start from How to Win
2. Ask: "To win this way, what must we be genuinely excellent at?"
3. List 6–8 candidate capabilities
4. Vote on which are critical (must be world-class) vs. supporting (table stakes)
5. Assess current state for each critical capability
6. Define required state
7. Create OKRs for gaps > 4
8. Assign capability owners

## Common Mistakes

1. **Listing activities as capabilities** — "Running weekly team meetings" is not a capability
2. **Too many critical capabilities** — If everything is critical, nothing is. Max 4.
3. **Capabilities disconnected from strategy** — If it doesn't flow from How to Win, it's not strategic
4. **No gap assessment** — Mapping without measurement is decoration, not strategy
5. **No OKR for gaps** — A gap with no action plan will not close
```

- [ ] **Step 4: Seed framework content via /admin/ingest**

Replace `YOUR_WORKER_URL` and `YOUR_ADMIN_SECRET` with real values. Run each command and wait for a `{"ok":true}` response before the next.

```bash
# OKR Methodology
curl -X POST https://YOUR_WORKER_URL/admin/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "agentId": "bos",
    "knowledgeType": "framework",
    "topicSlug": "okr-methodology",
    "source": "url",
    "sourcePath": "https://raw.githubusercontent.com/YOUR_ORG/orchestr-a-agents/main/src/content/bos/okr-methodology.md",
    "title": "OKR Methodology Framework Reference"
  }'

# KPI Design
curl -X POST https://YOUR_WORKER_URL/admin/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "agentId": "bos",
    "knowledgeType": "framework",
    "topicSlug": "kpi-design",
    "source": "url",
    "sourcePath": "https://raw.githubusercontent.com/YOUR_ORG/orchestr-a-agents/main/src/content/bos/kpi-design.md",
    "title": "KPI Design Framework Reference"
  }'

# Capability Mapping
curl -X POST https://YOUR_WORKER_URL/admin/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{
    "agentId": "bos",
    "knowledgeType": "framework",
    "topicSlug": "capability-mapping",
    "source": "url",
    "sourcePath": "https://raw.githubusercontent.com/YOUR_ORG/orchestr-a-agents/main/src/content/bos/capability-mapping.md",
    "title": "Capability Mapping Framework Reference"
  }'
```

**Alternative (if content is not yet pushed to GitHub):** Use the `platform` source and POST directly:

```bash
# You can also POST content inline if the GitHub URL isn't available yet.
# Change source to "platform" and sourcePath to "local/bos/okr-methodology"
# then temporarily add a file: branch in ingestion.ts to read from a passed content field.
# OR: push content files to GitHub first, then run the curl commands above.
```

- [ ] **Step 5: Verify chunks were created**

In Supabase SQL Editor:
```sql
SELECT topic_slug, count(*) as chunks
FROM knowledge_chunks
WHERE agent_id = 'bos'
GROUP BY topic_slug;
```

Expected: 3 rows (okr-methodology, kpi-design, capability-mapping) each with 2–5 chunks.

- [ ] **Step 6: Commit content files**

```bash
git add src/content/
git commit -m "feat(knowledge): BOS baseline framework content — OKR, KPI, capability"
```

---

## Self-Review

**Spec coverage:**
- ✅ pgvector tables + HNSW + GIN index → Task 1
- ✅ R2 bucket + wrangler config → Task 2
- ✅ Azure OpenAI embeddings → Task 3
- ✅ Contextual chunking (Anthropic pattern) → Task 4
- ✅ Source adapters (GitHub, URL) → Task 5
- ✅ Ingestion pipeline → Task 6
- ✅ /admin/ingest endpoint → Task 7
- ✅ Hybrid RRF retrieval → Task 8
- ✅ Company memory capture → Task 8
- ✅ BaseAgent abstract class → Task 9
- ✅ Agent registry → Task 10
- ✅ BosAgent extends BaseAgent → Task 10
- ✅ Baseline framework content → Task 11
- ✅ ADMIN_SECRET auth → Task 7

**Not in scope for MVP (spec-confirmed):**
- businessModelAgent + strategyFoundationAgent refactor to BaseAgent (follow-up sprint)
- GCS/S3 adapters (stubs in Task 5, implemented later)
- Admin UI for knowledge management (post-MVP)
- Market intel scraping (post-MVP)

**Type consistency check:**
- `AgentKnowledgeConfig.phaseTopics` used in Task 2 types.ts, consumed in Task 8 retrieval.ts and Task 9 BaseAgent.ts — consistent
- `KnowledgeContext` produced by Task 8, consumed by Task 9 BaseAgent.buildSystemPrompt and Task 10 BosAgent.buildSystemPrompt — consistent
- `IngestRequest` defined in Task 2 types.ts, consumed by Task 6 ingestion.ts and Task 7 index.ts — consistent
- `embedText(text, env)` defined in Task 3, used in Task 4 chunking.ts, Task 6 ingestion.ts, Task 8 retrieval.ts — consistent signature
