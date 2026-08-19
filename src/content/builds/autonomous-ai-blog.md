---
title: "Autonomous AI Blog"
status: "LIVE"
date: "June 2026"
stack:
  - "GitHub Actions"
  - "TypeScript"
  - "Claude Opus 4.8"
  - "GPT-5.5"
  - "gpt-image-1"
  - "Postgres"
  - "pgvector"
  - "Vercel"
  - "Telegram"
summary: "A daily autonomous publishing pipeline that reads AI sources, selects what is worth writing about, writes and reviews its own posts, then publishes only the drafts that pass."
---

## The Goal

I wanted a blog that could publish daily analysis of AI news under my real name, without me writing every post and without the output reading like AI slop.

The hard part was never generating text. The hard part was everything around the text: finding the right stories, avoiding rumors, not repeating the same topic on day 30, citing real sources, and knowing when a draft was not good enough to publish.

The test I set was simple: could the site run for months, with no human approval loop, and still remain something I would put my name on?

## What I Built

Version 1 was an n8n workflow: one curated YouTube transcript in, one blog post out. Gemini and GPT-5.5 handled the writing, and a 40-point QA rubric checked the finished draft.

It worked, but it exposed the real problem. The system could only see one source at a time, and it kept a history of covered topics that it never actually consulted. By week three, it was repeating itself.

Version 2 was a ground-up rebuild in TypeScript.

The new pipeline runs every day on GitHub Actions at 13:00 UTC. It ingests roughly 36 sources, including official lab blogs, arXiv, GitHub releases, Hacker News, Reddit, YouTube transcripts, and trade press for the niches I care about.

Every item is embedded, clustered into distinct stories, and checked against a vector memory of everything already published. Only genuinely new stories move forward.

The strongest stories become long-form pieces written by Claude Opus 4.8. The rest become shorter notes written by GPT-5.5. A separate reviewer model grades every draft against an editorial rubric, and only passing drafts publish. Failed pieces are saved as drafts instead of being deleted or shipped.

Each published post also receives generated artwork in one of five rotating art directions, structured data for search engines and AI assistants, and semantically related-post links computed from the same embeddings. A Telegram digest tells me what happened each day. Most days, that digest is the only part I read.

## How It Works

The daily loop is:

**ingest → embed → cluster → dedup against memory → rank → select → synthesize → gate → images → publish → digest**

A few pieces do most of the work.

The dedup memory is Postgres with pgvector. Every published post lives there as an embedding, and a new story only survives if it is far enough from what came before.

Selection is not purely merit-based. A few beats I care about get one reserved slot per day, because a tier-two trade story will never outrank an arXiv paper on raw signal. A reserved slot is still not a guaranteed publish. The editorial gate can reject it.

Once a week, the pipeline attempts a deep dive: a 2,000-plus-word pillar piece that is only allowed to anchor on primary sources, links out to its most related existing posts, and has to clear a higher bar than daily notes. If the week’s material is too thin, it skips rather than shipping filler.

The entire system is controlled by one repo variable, so I can pause publishing with a settings change instead of a code revert.

## What Broke & What I Learned

Plenty broke. The recurring theme was that the model was almost never the problem. The plumbing was.

**Feed text is hostile input.** Titles from academic feeds carry LaTeX and characters that can break the formats they are written into. One post took the production site down at build time. Everything the pipeline ingests is now sanitized as untrusted input, and there are regression tests for the exact failures.

**Silent failure is the dangerous kind.** At one point the pipeline was committing posts successfully and the site simply never updated, because the hosting platform quietly skipped deploys from commit authors it did not recognize. Another time, a selection path skipped every week without explaining why. The fix both times was the same: log the inputs to every silent decision, and make the daily digest say what did not happen, not just what did.

**Verify access, not existence.** I once swapped in a newly released model whose ID was real and documented. My account did not have access yet. The next run published zero posts. Every risky change now goes through shadow mode, which runs the full pipeline and publishes nothing.

**Quality is a selection problem before it is a writing problem.** Early deep dives kept failing the editorial gate for building confidently on rumors. No amount of prompt engineering fixed it, because the problem was upstream: the pipeline was choosing commentary-heavy stories to go deep on. Requiring a primary source before a pillar can even be attempted fixed in one change what three prompt revisions could not.

**The gate has to be independent.** The reviewer is a different model than the writer, and it reads only the draft. When posts kept failing for vague sourcing, the durable fix was to tell the writer the standard it would be judged against. The pass rate nearly doubled, and every post now names its primary source.

## Outcome

The Autonomous AI Blog has been live since June 2026.

It publishes roughly ten posts per day, each one sourced, illustrated, deduplicated, and self-reviewed before going live. Total human involvement is a glance at a Telegram digest. Failed pieces queue politely as drafts instead of publishing.

The system has survived model outages, feed rate limits, a GitHub Actions outage, and its own bugs while keeping the daily cadence intact.

The repo now carries the full architecture and decision log, so any competent engineer, or agent, could take it over tomorrow.
