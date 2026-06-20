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
