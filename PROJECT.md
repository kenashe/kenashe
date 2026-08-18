# kenashe.ai — project guide

The site at **[kenashe.ai](https://kenashe.ai)** ("The Lab") plus the autonomous content
pipeline that writes it. This repo is the source of truth for both.

> This repository doubles as the GitHub **profile** repo for `kenashe`, so the root
> `README.md` is the profile page. **This file is the project entry point.**

**Companion docs:** [ARCHITECTURE.md](ARCHITECTURE.md) · [PRODUCT.md](PRODUCT.md) ·
[DECISIONS.md](DECISIONS.md) · [DATA_SOURCES.md](DATA_SOURCES.md) · [AGENTS.md](AGENTS.md)

---

## What this is

Two things in one repo:

| | |
|---|---|
| **The site** (`src/`) | Astro 6 + Tailwind 4 + MDX, statically built, deployed on Vercel. ~544 posts. |
| **The pipeline** (`pipeline/`) | A TypeScript job that runs daily on GitHub Actions: reads ~36 AI feeds, clusters them into stories, de-duplicates against everything already published, writes and self-reviews posts with LLMs, generates images, commits the MDX, and triggers a deploy. |

Nothing is hand-written day to day. The pipeline publishes autonomously; a human spot-checks
via a Telegram digest.

## Prerequisites

- **Node >= 22.12** (both packages; the pipeline relies on native TS type-stripping)
- **Postgres with pgvector** for production runs (Supabase/Neon). Not needed for dev.
- API keys — see [`pipeline/.env.example`](pipeline/.env.example). None needed for the
  degraded dev paths below.

## Local development

### The site

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # production build — run this before pushing site changes
```

`npm run build` is the only real check on `.astro` files. **Always run it before pushing**;
a broken content file fails the Vercel build and takes the site's newest deploy with it.

### The pipeline

```sh
cd pipeline && npm install
npm run typecheck      # tsc --noEmit
npm test               # unit tests (node:test, no keys or network needed)
npm run core:demo      # dedup/cluster core against the live corpus, no keys
npm run run:shadow     # full dry run: file store, no publishing
```

`run:shadow` degrades gracefully without keys — connectors that need them return nothing,
images are skipped, and nothing is committed.

## Running it for real

Production runs happen on GitHub Actions, not locally. See
**[ARCHITECTURE.md § Deployment & operations](ARCHITECTURE.md#deployment--operations)** for
the runbook. Short version:

1. Secrets live in **Settings → Secrets and variables → Actions**.
2. The whole workflow is gated by repo **variable** `PIPELINE_ENABLED=true`. Set it to
   anything else to pause all runs without editing code.
3. Cron `0 13 * * *` (13:00 UTC) publishes **live**. Manual dispatch defaults to **shadow**,
   which writes drafts to the `pipeline-shadow` branch and publishes nothing.

## Deployment

The site auto-deploys from `master` via Vercel's GitHub integration — no deploy step to run.

> **Critical:** this is a Vercel **Hobby** project, so a commit whose author is not a
> collaborator is **not deployed**. Every automated commit must be authored as
> `Ken Ashe <kenashe@gmail.com>`. See [DECISIONS.md](DECISIONS.md#d3). Getting this wrong
> looks like "the pipeline ran and committed but the site never changed."

## Repo layout

```
src/                     Astro site
  pages/                 routes (blog, topics hubs, building, llms.txt, robots.txt)
  layouts/BlogPost.astro post layout + Article/Person/WebSite JSON-LD
  data/                  topics (hubs), schema.ts (canonical entities), related.json
  content/blog/          544 published posts (.mdx, pipeline-generated)
pipeline/
  src/                   the job (see ARCHITECTURE.md for the stage map)
  config/sources.yaml    the feed registry
  config/deepdive.json   weekly pillar schedule/tuning
  db/schema.sql          Postgres + pgvector schema
  test/                  unit tests
measurement/             monthly answer-engine visibility check (frozen queries + results)
.github/workflows/       the daily job
```

## Where knowledge lives

| Question | File |
|---|---|
| How does it work? | [ARCHITECTURE.md](ARCHITECTURE.md) |
| What is it for, and what's the editorial line? | [PRODUCT.md](PRODUCT.md) |
| Why is it built this way? What broke before? | [DECISIONS.md](DECISIONS.md) |
| What feeds it, and what are their quirks? | [DATA_SOURCES.md](DATA_SOURCES.md) |
| I'm an AI agent picking this up | [AGENTS.md](AGENTS.md) |
