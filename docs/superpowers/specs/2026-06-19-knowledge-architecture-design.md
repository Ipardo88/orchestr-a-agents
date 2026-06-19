# OrchestrA Agent Knowledge Architecture
**Date:** 2026-06-19
**Status:** Approved for implementation
**Scope:** orchestr-a-agents (Cloudflare Worker)

---

## Problem Statement

The current agents have strategy framework knowledge baked shallowly into system prompts. They produce generic guidance rather than professional-grade coaching grounded in methodology. They have no memory of company decisions over time, no access to company-uploaded documents, and no ability to reference benchmarks. As the agent team grows (currently 4 agents, more planned), there is no extensible pattern for adding new specialists with their own knowledge domains.

---

## Goals

1. Make agents professionally competent — equivalent to a senior strategy consultant who knows the frameworks deeply
2. Give agents three-layer knowledge: curated baseline + dynamic market intel + company memory
3. Build an extensible agent team pattern (gstack/superpowers-inspired) where adding a new agent requires touching one file
4. Keep infrastructure minimal for MVP — no new vendors, use what's already in the stack

---

## Knowledge Taxonomy

Five knowledge types, organized by source, scope, and how they change:

| Type | Name | Source | Scope | Changes |
|------|------|--------|-------|---------|
| 1 | `framework` | GitHub / GCS / S3 / URL | Global (all orgs) | Versioned, deliberate |
| 2 | `benchmark` | OrchestrA-managed + automated feeds | Global, filtered by industry/stage | Quarterly refresh |
| 3 | `market_intel` | Scheduled scrapers + API webhooks | Global, filtered by industry/region | Continuous (post-MVP) |
| 4 | `company_docs` | Company uploads via API or admin UI | Org-scoped | As company uploads |
| 5 | `company_memory` | Auto-generated from platform activity | Org-scoped | Continuous (automatic) |

### Three-Layer Hierarchy

```
LAYER 1 — OrchestrA Baseline (Types 1 + 2)
  Curated by OrchestrA team. Git-managed framework content.
  Industry benchmarks by sector + stage.
  Same for all clients. High quality, version-controlled.

LAYER 2 — Dynamic Intelligence (Type 3) [post-MVP]
  Automated market intelligence. Regulatory feeds.
  Industry news filtered by org's sector/geography.

LAYER 3 — Company Knowledge (Types 4 + 5)
  Company uploads: research, competitor analysis, board decks.
  Company memory: decisions captured from coaching sessions.
  Org-isolated — never crosses org boundary.
```

### Framework Content Sources (Type 1)

Documents live wherever OrchestrA stores them. The ingestion pipeline pulls from any source:
- **GitHub** — markdown files, version-controlled, free (primary for MVP)
- **Google Cloud Storage** — PDF/DOCX, GCS buckets
- **AWS S3** — PDF/DOCX, S3 buckets
- **Azure Blob Storage** — alternative cloud storage
- **Direct URL** — public research papers, regulatory documents

Each source gets one adapter. Source of truth stays where it is. R2 is a processing cache, not the source.

---

## Storage Architecture

### Store 1 — pgvector on Supabase

Primary vector store. Chosen because Supabase is already the company database — no new vendor. SQL WHERE clauses give powerful metadata filtering. Row Level Security (RLS) gives org isolation for free. Hybrid search (vector + full-text) in one query.

**Tables:** `knowledge_chunks` + `knowledge_registry` (see Database Schema section)

**Index:** HNSW (`vector_cosine_ops`) for ANN search + GIN for full-text

### Store 2 — Cloudflare R2 (`orchestr-a-knowledge-raw`)

Raw document storage before processing. Enables re-ingestion if the embedding model changes or chunking strategy is updated. Audit trail of what each agent has been given.

**Path pattern:** `/{agent_id}/{knowledge_type}/{source}/{filename}`

### Store 3 — Supabase (existing)

Company data — OKRs, KPIs, strategic goals, business model, conversations — already implemented via `getCompanyContext()`. No changes needed to company data retrieval.

---

## Database Schema

Migration `050_knowledge_base.sql`:

```sql
-- Enable pgvector (one-click in Supabase dashboard → Extensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- Every processed chunk from every ingested document
CREATE TABLE knowledge_chunks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       TEXT NOT NULL,
  knowledge_type TEXT NOT NULL
                   CHECK (knowledge_type IN ('framework','benchmark','market_intel','company_docs','company_memory')),
  topic_slug     TEXT NOT NULL,
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source         TEXT NOT NULL
                   CHECK (source IN ('github','gcs','s3','azure_blob','url','platform','upload')),
  source_path    TEXT,
  chunk_index    INTEGER NOT NULL,
  content        TEXT NOT NULL,
  embedding      VECTOR(1536),
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- One row per ingested document — visibility into what each agent knows
CREATE TABLE knowledge_registry (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         TEXT NOT NULL,
  knowledge_type   TEXT NOT NULL,
  topic_slug       TEXT NOT NULL,
  org_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source           TEXT NOT NULL,
  source_path      TEXT NOT NULL,
  title            TEXT NOT NULL,
  chunk_count      INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','active','failed')),
  last_ingested_at TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index (HNSW — better than IVFFlat for < 1M vectors)
CREATE INDEX knowledge_chunks_embedding_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Metadata filtering index
CREATE INDEX knowledge_chunks_meta_idx
  ON knowledge_chunks (agent_id, knowledge_type, org_id, topic_slug);

-- Full-text search index for hybrid retrieval
CREATE INDEX knowledge_chunks_fts_idx
  ON knowledge_chunks USING GIN (to_tsvector('english', content));

-- RLS: global chunks (org_id IS NULL) visible to all; org-scoped only to that org
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_or_own_org" ON knowledge_chunks
  FOR SELECT USING (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM get_my_org_ids())
  );

ALTER TABLE knowledge_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_or_own_org" ON knowledge_registry
  FOR SELECT USING (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM get_my_org_ids())
  );
```

---

## Ingestion Pipeline

One pipeline handles all sources and knowledge types. The key differentiator is **contextual chunking** — each chunk gets LLM-generated context prepended before embedding. Reduces retrieval failures by ~49% (Anthropic research).

### Flow

```
Source document
  → FETCH        (source adapter: GitHub / GCS / S3 / URL / upload)
  → STORE RAW    (R2: /{agent_id}/{type}/{source}/{slug})
  → PARSE        (extract clean text, title, headings)
  → SEMANTIC CHUNK (split at natural boundaries, 400–600 tokens, overlap)
  → CONTEXTUALIZE (LLM generates 2–3 sentence context per chunk)
  → EMBED        (Azure OpenAI text-embedding-3-small → 1536 dims)
  → STORE        (Supabase knowledge_chunks)
  → REGISTER     (Supabase knowledge_registry: status=active, chunk_count)
```

### Ingestion Endpoint

```
POST /admin/ingest
Authorization: Bearer {ADMIN_SECRET}

{
  "source":         "github" | "gcs" | "s3" | "url" | "upload",
  "source_path":    "https://raw.githubusercontent.com/.../okr-methodology.md",
  "agent_id":       "bos",
  "knowledge_type": "framework",
  "topic_slug":     "okr-methodology",
  "org_id":         null,
  "replace":        true
}

Response:
{
  "success": true,
  "title": "OKR Methodology Guide",
  "chunk_count": 18,
  "tokens_used": 24500,
  "duration_ms": 8200
}
```

### Source Adapters

One file per source, all implement `SourceAdapter`:

```typescript
interface SourceAdapter {
  fetch(path: string, env: Env): Promise<{ content: string; filename: string }>;
}

// src/knowledge/adapters/
//   github.ts   — GitHub raw URL or API token
//   gcs.ts      — GCS signed URL or service account
//   s3.ts       — S3 presigned URL or access keys
//   url.ts      — plain HTTP (public docs)
//   upload.ts   — multipart form data
```

Adding a new source = one new adapter file. No changes to the pipeline.

### Contextual Chunking (the quality differentiator)

```
For each document:
  1. Generate document summary once (one LLM call)

For each chunk:
  2. LLM generates context:
     "This passage is from [title]. The document covers [summary].
      This section specifically discusses [what this chunk is about]."
  3. Prepend context to chunk text
  4. Embed the combined string (context + chunk)

Result: every vector carries its own context.
        Retrieval precision dramatically improved.
        Chunks no longer "lose meaning" when retrieved in isolation.
```

### Embedding Model

**Azure OpenAI `text-embedding-3-small`** — 1536 dimensions.
- Already have the API key (same Azure account as the LLM)
- ~2× better quality than Workers AI bge-base-en-v1.5
- Cost: ~$0.02 per 1M tokens (negligible)

---

## Retrieval System

Two tracks fire on every agent call. Both complete before the prompt is assembled.

### Track 1 — Phase-Triggered (always runs, ~15ms)

```
Detect sub-phase from last 8 messages of conversation history
  → Look up topics for that phase in Agent Registry
  → SELECT content FROM knowledge_chunks
    WHERE agent_id = ? AND topic_slug IN (?)
    ORDER BY chunk_index ASC
  → Returns ordered framework content
  → No vector math, no embedding, pure indexed lookup
```

### Track 2 — Dynamic Hybrid Search (~80ms, runs when dynamicSearch=true)

Combines pgvector cosine similarity with PostgreSQL full-text search, merged using Reciprocal Rank Fusion (RRF):

```sql
WITH vector_results AS (
  SELECT id, content,
    ROW_NUMBER() OVER (ORDER BY embedding <=> $query_vec::vector) AS v_rank
  FROM knowledge_chunks
  WHERE agent_id = $agent_id
    AND knowledge_type = ANY($types)
    AND (org_id IS NULL OR org_id = $org_id)
  LIMIT 20
),
text_results AS (
  SELECT id, content,
    ROW_NUMBER() OVER (ORDER BY
      ts_rank(to_tsvector('english', content),
              plainto_tsquery('english', $query_text)) DESC) AS t_rank
  FROM knowledge_chunks
  WHERE agent_id = $agent_id
    AND knowledge_type = ANY($types)
    AND (org_id IS NULL OR org_id = $org_id)
    AND to_tsvector('english', content) @@ plainto_tsquery('english', $query_text)
  LIMIT 20
),
fused AS (
  SELECT COALESCE(v.id, t.id) AS id,
         COALESCE(v.content, t.content) AS content,
         COALESCE(1.0/(60 + v.v_rank), 0) +
         COALESCE(1.0/(60 + t.t_rank), 0) AS rrf_score
  FROM vector_results v
  FULL OUTER JOIN text_results t ON v.id = t.id
)
SELECT content FROM fused ORDER BY rrf_score DESC LIMIT 5;
```

**Why RRF:** No tuning needed. Works across different score scales. Consistently outperforms weighted averaging. One less parameter to maintain.

### Prompt Assembly

Knowledge is injected between company context and agent role. Order matters — LLMs read top-to-bottom:

```
<company_context>        ~800 tokens   always present
<framework_knowledge>   ~2,000 tokens  phase-triggered chunks
<relevant_context>      ~1,500 tokens  dynamic search results (if found)
<role>                    ~500 tokens
<methodology>             ~800 tokens
<rules>                   ~300 tokens
[conversation history]  ~3,000 tokens  last 15 messages
[user message]            ~200 tokens
─────────────────────────────────────
Total:                  ~9,100 tokens  out of 128k available
```

### Company Memory — Auto-Capture

After every meaningful exchange, a background task captures the decision as a `company_memory` chunk. No user action required. Triggered when exchange contains: "decided", "agreed", "confirmed", "we will", "going with", "our X is", "defined", "locked", "chosen".

LLM summarises the exchange into a 3–5 sentence memory chunk → embed → store with `org_id` scoping. Over time agents accumulate institutional memory: "What did we decide about our pricing model?" returns the exact session where that was discussed.

---

## Agent Team Pattern

### Base Agent Class

All agents extend `BaseAgent`. The base class handles retrieval, memory capture, and LLM calling. Each specialist only defines what makes it unique:

```typescript
abstract class BaseAgent {
  abstract readonly agentId: string;
  abstract readonly description: string;
  abstract readonly knowledgeConfig: AgentKnowledgeConfig;
  abstract readonly routingSignals: RegExp[];
  abstract readonly phaseSignals: Record<string, RegExp>;

  abstract buildSystemPrompt(
    ctx: CompanyContext,
    knowledge: KnowledgeContext,
    history: ChatMessage[],
  ): string;

  async run(ctx, history, userMessage, env): Promise<string> {
    const phase     = this.detectPhase(history);
    const knowledge = await retrieveKnowledge({ agentId, phase, userMessage, orgId, env });
    const prompt    = this.buildSystemPrompt(ctx, knowledge, history);
    const content   = await callOpenAIText(...);
    captureMemory(...).catch(() => {}); // fire and forget
    return content;
  }
}
```

### Agent Registry

```typescript
// src/agents/registry.ts — the only file that changes when adding an agent

export const AGENTS: Record<string, BaseAgent> = {
  'supervisor':            new SupervisorAgent(),
  'strategy-foundation':   new StrategyFoundationAgent(),
  'business-model':        new BusinessModelAgent(),
  'bos':                   new BosAgent(),
  // Future:
  // 'corporate-strategy':    new CorporateStrategyAgent(),
  // 'financial-intelligence': new FinancialAgent(),
  // 'people-org':            new PeopleOrgAgent(),
  // 'market-intelligence':   new MarketIntelAgent(),
};
```

### Data-Driven Routing

`coach.ts` routing becomes data-driven — no hardcoded switch statements:

```typescript
function detectRoute(message, history, domains): string {
  // 1. Each agent's declared signals checked automatically
  for (const [id, agent] of Object.entries(AGENTS)) {
    if (id === 'supervisor') continue;
    if (agent.routingSignals.some(sig => sig.test(message))) return id;
  }
  // 2. Sticky routing from history
  // 3. Domain-completeness fallback
  return 'supervisor';
}

// Dispatch — no switch statement
const agent = AGENTS[detectRoute(...)] ?? AGENTS['supervisor'];
assistantContent = await agent.run(ctx, history, userMessage, env);
```

### Adding a New Agent — Developer Experience

```
1. Create:  src/agents/CorporateStrategyAgent.ts   (new file, extends BaseAgent)
2. Register: registry.ts → 'corporate-strategy': new CorporateStrategyAgent()
3. Load knowledge:
     POST /admin/ingest { agent_id: 'corporate-strategy', topic_slug: 'bcg-matrix', ... }
     POST /admin/ingest { agent_id: 'corporate-strategy', topic_slug: 'portfolio-analysis', ... }

No changes to:
  - coach.ts routing logic
  - index.ts HTTP handler
  - database schema
  - ingestion pipeline
  - retrieval system
  - any other agent
```

---

## New Files Required

```
orchestr-a-agents/src/
  knowledge/
    retrieval.ts          — retrieveKnowledge(), hybridSearch(), captureMemory()
    ingestion.ts          — ingestDocument(), semanticChunk(), contextualize()
    embeddings.ts         — embedText() using Azure OpenAI text-embedding-3-small
    agentRegistry.ts      — AGENT_REGISTRY with AgentKnowledgeConfig per agent
    adapters/
      github.ts
      gcs.ts
      s3.ts
      url.ts
      upload.ts
  agents/
    base/
      BaseAgent.ts        — abstract base class
    registry.ts           — AGENTS map (replaces hardcoded switch in coach.ts)
    BosAgent.ts           — refactored from bosAgent.ts
    BusinessModelAgent.ts — refactored from businessModelAgent.ts
    StrategyFoundationAgent.ts
    SupervisorAgent.ts    — refactored from coach.ts supervisor logic
  content/                — baseline framework markdown files (source of truth for Type 1
    |                         knowledge; ingested into pgvector via POST /admin/ingest;
    |                         Git is the source of truth, pgvector is the search index)
    bos/
      okr-methodology.md
      kpi-design.md
      capability-mapping.md
    business-model/
      bmc-guide.md
      playing-to-win.md
      pestel-guide.md
    strategy-foundation/
      purpose-vision-mission.md
      strategic-goal-setting.md
    global/
      benchmarks-saas.md
      benchmarks-professional-services.md

supabase/migrations/
  050_knowledge_base.sql  — knowledge_chunks + knowledge_registry tables
```

---

## Wrangler Config Changes

```jsonc
// Add to existing wrangler.jsonc — AGENT_MEMORY KV stays unchanged:
{
  "r2_buckets": [
    { "binding": "KNOWLEDGE_BUCKET", "bucket_name": "orchestr-a-knowledge-raw" }
  ],
  "kv_namespaces": [
    { "binding": "AGENT_MEMORY", "id": "cf62243cfa4b4f049e78c166e7f98e84" }
    // No separate AGENT_KNOWLEDGE KV namespace needed —
    // pgvector on Supabase handles all knowledge storage.
    // AGENT_MEMORY KV remains for deduplication + agent run state (unchanged).
  ]
}
```

---

## New Env Variables

```
# Already have:
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT
AZURE_OPENAI_API_VERSION
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# Add (via `wrangler secret put <NAME>`):
AZURE_OPENAI_EMBEDDING_DEPLOYMENT  — deployment name for text-embedding-3-small
                                     set in Azure OpenAI Studio (separate from chat deployment)
ADMIN_SECRET                       — a strong random string; all /admin/* requests must
                                     send `Authorization: Bearer {ADMIN_SECRET}`.
                                     Generate with: openssl rand -hex 32
GCS_SERVICE_ACCOUNT_KEY            — optional; JSON key for GCS source adapter
AWS_ACCESS_KEY_ID                  — optional; for S3 source adapter
AWS_SECRET_ACCESS_KEY              — optional; for S3 source adapter
```

---

## What Gets Deferred (Post-MVP / Post-Funding)

| Feature | Reason deferred |
|---------|----------------|
| `market_intel` automated feeds | Requires scraper infrastructure, legal/ToS considerations |
| Admin UI for content management | CLI + API covers MVP needs |
| Cohere Rerank | Adds latency + cost; RRF is sufficient for MVP |
| Multi-language embeddings | English-first for MVP |
| Vectorize | pgvector on Supabase covers MVP scale; Vectorize adds complexity |
| Company doc uploads (UI) | API endpoint covers MVP; UI is post-funding |

---

## Implementation Order

1. **Migration 050** — enable pgvector, create `knowledge_chunks` + `knowledge_registry`
2. **Embeddings module** — `embedText()` via Azure OpenAI
3. **Ingestion pipeline** — `ingestDocument()`, semantic chunking, contextualizing, storing
4. **Source adapters** — GitHub (MVP), GCS + S3 (quick follow)
5. **Retrieval module** — phase-triggered lookup + hybrid search + RRF
6. **BaseAgent class** — abstract base with run(), detectPhase()
7. **Agent registry** — refactor existing 4 agents to extend BaseAgent
8. **Data-driven routing** — replace switch in coach.ts with registry loop
9. **Company memory capture** — post-response background task
10. **Seed baseline content** — write and ingest framework markdown files
11. **/admin/ingest endpoint** — wire into index.ts with ADMIN_SECRET gate
