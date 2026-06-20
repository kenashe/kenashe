-- Postgres + pgvector schema for the production store (Supabase/Neon).
-- Dev uses JSONFileStore instead; this is for STORE_BACKEND=postgres.
create extension if not exists vector;

-- Exact-dup guard: every ingested source item id we've seen.
create table if not exists items (
  id          text primary key,
  source      text,
  source_type text,
  tier        int,
  url         text,
  title       text,
  published_at timestamptz,
  seen_at     timestamptz default now()
);

-- Covered memory: embeddings of published posts. Dedup = nearest-neighbour search.
-- 1536 = text-embedding-3-small dimensions.
create table if not exists covered (
  slug         text primary key,
  title        text,
  published_at date,
  embedding    vector(1536),
  created_at   timestamptz default now()
);
create index if not exists covered_embedding_idx
  on covered using ivfflat (embedding vector_cosine_ops) with (lists = 100);
-- dedup query: SELECT 1 - (embedding <=> $1) AS sim FROM covered ORDER BY embedding <=> $1 LIMIT 1;

-- Run logs for observability / the daily digest.
create table if not exists runs (
  id         bigserial primary key,
  started_at timestamptz,
  report     jsonb
);
