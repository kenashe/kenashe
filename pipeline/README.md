# kenashe content pipeline

Rebuild of the AI-blog pipeline: from "1 YouTube video → 1 post" to **cluster everything in AI each day → synthesize the best stories into tiered posts**, with a real de-dup memory. Replaces the n8n workflow. Design doc lives in the project thread.

> Status: **scaffold / WIP**. The de-dup core is proven; live LLM/image/DB/connector calls are wired but need keys. Not yet run end-to-end in production. Keep n8n running until shadow mode passes.

## Pipeline shape (`src/run.ts`)
`ingest → embed → cluster → dedup(vs memory) → rank → select tiers → synthesize → gate → images → publish → digest`

- **Tiered:** 2-3 flagships (deep, multi-source) + up to 7 notes/day; only what clears the gate publishes.
- **Autonomous:** pass → `draft:false`; fail → `draft:true` (auto-drafted, never deleted). Daily Telegram digest for spot-checks.
- **De-dup (the core fix):** `src/core.ts` clusters items into stories and checks each against covered memory before drafting — the old pipeline wrote a topic history it never read.

## Dev quickstart (no keys, no DB)
```sh
cd pipeline && npm install
npm run core:demo      # proves the dedup/cluster core on the live corpus (no deps/keys)
npm run run:shadow     # dry run: STORE_BACKEND=file, lexical embedder, no images, nothing published
```
Shadow mode degrades gracefully without provider keys (connectors that need keys just return nothing).

## Going live
1. **Provision** (see `.env.example`): Postgres+pgvector (`DATABASE_URL`), and keys for Anthropic / OpenAI / Google / DeepSeek / Supadata; Vercel deploy hook + Telegram for the digest.
2. `psql "$DATABASE_URL" -f db/schema.sql`
3. Seed covered memory with the current published posts (so day 1 knows what exists) — see TODO below.
4. Copy the CI template `pipeline/ci/pipeline.yml` to `.github/workflows/pipeline.yml` and commit it yourself (automation tokens can't push workflow files). Add the keys as **GitHub Actions secrets**, set repo variable `PIPELINE_ENABLED=true`, and run it via *Run workflow → shadow* for ~5 days.
5. When the shadow output looks right, run with mode **live** and let the daily cron take over. Retire n8n.

## Config
- `config/sources.yaml` — the source registry (edit freely; tiers + weights).
- `src/config.ts` — model assignments (`MODELS`), tier counts, gate thresholds (`GATE`), image counts (`IMAGES`), thresholds via env.

## Production wiring (implemented)
- `store.ts` `PostgresStore` — pgvector-backed covered memory, seen-items, run logs.
- `run.ts` — semantic embeddings (`embedMany`) when `OPENAI_API_KEY` is set; lexical fallback otherwise.
- `ingest.ts` — all connectors live (rss, youtube, arxiv, hackernews, github_releases, reddit).
- `npm run backfill` — one-time: embeds existing published posts into `covered` so dedup works from run 1.

## Remaining to go live
- `psql "$DATABASE_URL" -f db/schema.sql` (create tables), then `npm run backfill`.
- Copy `pipeline/ci/pipeline.yml` to `.github/workflows/pipeline.yml` and commit it (PATs can't push workflow files).
- Set GitHub secrets + repo variable `PIPELINE_ENABLED=true`; run in **shadow** ~5 days, then **live**.

## Why this fixes the old bugs
- **Slugs:** `publish.ts` `cleanSlug()` removes apostrophes (no more `vibe-checks-don`) and truncates on a word boundary (no more `…own-wo`).
- **Duplicates:** semantic dedup against covered memory + story clustering, instead of a never-read history + a prompt nudge.
- **Tags:** `governTags()` maps a controlled vocabulary.
- **Reliability:** durable store, structured run logs, Telegram digest + error path.
