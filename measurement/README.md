# Measuring whether the discoverability work is working

The site does a lot of unusual things to be found and cited by search engines and AI
assistants: topic hubs, a self-contained entity graph on every page, source citations in
structured data, semantic related-post links, `llms.txt`, an AI-welcoming `robots.txt`, and
IndexNow pings. **This directory exists so none of that has to be taken on faith.**

The question it answers: *does kenashe.ai surface for unbranded topical queries — the kind a
practitioner or an answer engine would actually run?* Ranking for "Ken Ashe" proves nothing.

---

## How it works

```sh
cd pipeline
EXA_API_KEY=... npm run visibility             # writes results + history row
EXA_API_KEY=... npm run visibility -- --dry    # calls the API, prints, writes nothing
EXA_API_KEY=... npm run visibility -- --force  # re-run a month already on record
```

A month that already has a report is **not** overwritten without `--force`, so a stray run
can't erase the annotated baseline.

- **`queries.json`** — 12 frozen unbranded queries, 3 per beachhead. Runs against Exa
  (a retrieval engine over a web index) asking for the top 25 results, and records the rank
  of the first kenashe.ai URL, or `null`.
- **`results/<month>.json`** — one report per month, committed. This is the raw record.
- **`history.md`** — the human-readable trend, one row per month.
- Logic and tests live in `pipeline/src/visibility.ts` and `pipeline/test/visibility.test.ts`.

Get a key at [dashboard.exa.ai](https://dashboard.exa.ai) — the free tier covers 12 queries a
month with room to spare. Monthly automation: copy `pipeline/ci/llm-visibility.yml` to
`.github/workflows/` and add `EXA_API_KEY` as a repo secret.

## Rules that keep the trend honest

1. **Never reword a query.** The entire value is comparing like with like. To add coverage,
   append a new query with a new id and record any retirement below — do not edit in place.
   A unit test pins the set (12 queries, stable ids, four beachheads, nothing branded).
2. **Never hand-edit a results file.** Re-run the month instead; the same month re-run
   replaces its history row rather than duplicating it.
3. **Read the trend, not a single month.** Retrieval results move on their own. One month
   going 1 → 2 is noise; three months of 1 → 3 → 5 is signal.

## What this does and does not measure

**Does:** whether the site is retrievable and competitive for the topics it claims, and who
currently owns those queries (the `top3` field is deliberately recorded — it shows what you
are up against).

**Does not:**

| Not measured | Why | Where to look instead |
|---|---|---|
| AI-assistant **referral traffic** | can't be automated: bots don't run client-side JS, and Vercel Analytics is client-side | Vercel → Analytics → Referrers, watch for `chatgpt.com`, `perplexity.ai`, `claude.ai` |
| Google / Bing organic rank | different systems with their own tooling | Search Console, Bing Webmaster Tools |
| Whether a specific model *cites* you | no vendor exposes this | the referrers panel above is the closest real signal |
| Presence in training corpora | crawl-time, not query-time | Common Crawl index (`index.commoncrawl.org`) |

Exa is a proxy, not ground truth. It is the closest automatable stand-in for "would an
answer engine retrieve this page", which is why it is the metric here rather than something
more precise but unmeasurable.

## Baseline — 2026-08

Taken the day the discoverability work finished shipping.

**1 of 12 queries surfaced the site.** The one hit was strong: rank **2** for *"can marketers
build AI tools without engineers"*, with a second kenashe.ai URL at rank 7. The other eleven
did not place in the top 25.

Two things worth carrying forward:

- **The winning query maps almost word-for-word to one post** ("The marketer's stack for
  building internal tools without a dev team"). Tight question-to-post match is what won —
  which is the argument for the question-shaped headings and the pillar strategy.
- **The competition is trade press and primary sources** (emarketer, semrush, ahrefs, hubspot,
  arxiv, anthropic, openai). Beating them on broad queries is a years-long project; beating
  them on narrow, specific questions is achievable now. Expect gains on specific
  question-shaped queries first.

A site three months old ranking once in twelve is neither good nor bad on its own — it is
simply the number to beat. That is the whole point of writing it down.

## Retired / changed queries

None yet. Log any change here with the month it took effect, so a jump in the trend can never
be mistaken for progress when it was really a query swap.
