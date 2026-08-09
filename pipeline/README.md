# kenashe content pipeline

The autonomous job that writes [kenashe.ai](https://kenashe.ai). Runs daily on GitHub
Actions: reads ~36 AI feeds, clusters them into stories, de-duplicates against everything
already published, writes and self-reviews posts with LLMs, generates images, commits the
MDX and triggers a deploy.

**Status: in production.** Publishing autonomously since June 2026; ~544 posts. The n8n
workflow it replaced is retired.

> Full documentation lives at the repo root: [ARCHITECTURE.md](../ARCHITECTURE.md) ·
> [DECISIONS.md](../DECISIONS.md) · [DATA_SOURCES.md](../DATA_SOURCES.md) ·
> [PRODUCT.md](../PRODUCT.md) · [AGENTS.md](../AGENTS.md)

## Shape (`src/run.ts`)

```
ingest → embed → cluster → dedup(vs memory) → rank → select → synthesize → gate
       → images → publish(+related.json) → digest
```

- **Tiered:** ~3 flagships + ~7 notes/day, plus one deep-dive pillar on Tuesdays.
- **Reserved slots:** 1 domains, 1 crypto, 1 marketing story per run — those beachheads are
  tier-2 and would never outrank an arXiv paper on merit. A slot is not a publish; each is
  still gated.
- **De-dup is the core:** `core.ts` clusters items into stories and checks each against the
  `covered` embedding memory before drafting. The old pipeline kept a topic history it never
  read.
- **Autonomous:** gate pass → `draft:false`; fail → `draft:true` (written, never deleted).
  Telegram digest each run; hard failures send an error ping.

## Dev quickstart (no keys, no DB)

```sh
cd pipeline && npm install
npm test               # unit tests — no network, no keys
npm run typecheck
npm run core:demo      # dedup/cluster core against the live corpus
npm run run:shadow     # full dry run: file store, lexical embedder, no images, no publish
```

Shadow mode degrades gracefully: connectors needing keys return nothing, and nothing is
committed.

## Running in production

Runs happen in GitHub Actions (`.github/workflows/pipeline.yml`), not locally.

1. Set secrets in **Settings → Secrets and variables → Actions** (names in
   [`.env.example`](.env.example)).
2. Set repo **variable** `PIPELINE_ENABLED=true` — the kill switch.
3. Apply the DB schema once: `psql "$DATABASE_URL" -f db/schema.sql`, then `npm run backfill`
   to embed existing posts into `covered` so dedup works from run 1.
4. Cron `0 13 * * *` publishes **live**; manual dispatch defaults to **shadow** (drafts to
   the `pipeline-shadow` branch).

⚠️ Commits must be authored `Ken Ashe <kenashe@gmail.com>` or Vercel Hobby silently skips
the deploy — see [DECISIONS.md](../DECISIONS.md#d3).

## Configuration

| What | Where |
|---|---|
| Feeds | `config/sources.yaml` |
| Weekly pillar cadence/tuning | `config/deepdive.json` |
| Models, gate thresholds | `src/config.ts` |
| Voice, prompts, image art direction | `src/prompts.ts` |
| Run shape (posts/day, similarity floors) | env vars — see `.env.example` |
| DB schema | `db/schema.sql` |

## Layout

```
src/run.ts         orchestrator (selection, deep-dive, reserved slots)
src/ingest.ts      six source connectors + AI keyword gate
src/core.ts        embedding, clustering, dedup
src/synthesize.ts  draft generation
src/gate.ts        independent quality review
src/images.ts      hero + inline image generation
src/publish.ts     MDX assembly, YAML/MDX sanitizing, commit/push/deploy
src/related.ts     related-post map from stored embeddings
src/store.ts       Postgres+pgvector store / JSON file store
src/entities.ts    Wikidata entity detection for schema.org `mentions`
src/backfill.ts    one-time: embed existing posts into covered memory
test/              unit tests (node:test)
```
