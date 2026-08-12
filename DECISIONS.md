# Decisions & incident log

Why things are the way they are — including the failures that shaped them. If you are about
to "clean up" something that looks odd, check here first: most of the oddities are scar
tissue from a real outage.

Newest sections last. Anchors (`#d1`…) are referenced from other docs.

---

## <a id="d1"></a>D1 — Rebuild the pipeline in TypeScript, retire n8n

**Context.** The original pipeline was an n8n workflow: one YouTube video → one post. It
kept a topic history it never actually read, so it repeated itself.

**Decision.** Rebuild as a plain TypeScript job in this repo: ingest many sources → cluster
into stories → **check each story against a real embedding memory** → synthesize tiered
posts. n8n was deactivated once the new pipeline passed shadow runs.

**Why it matters.** Dedup is the core value, not a nicety. `covered` + pgvector is the
mechanism; don't remove it for a "simpler" title-matching approach.

## <a id="d2"></a>D2 — Autonomous publishing with a model gate, not a human queue

**Decision.** A *different* model than the drafter scores every post 0–40 and lists critical
fails. Pass → publish. Fail → the post is written to disk as `draft: true` and never
deleted. A Telegram digest reports each run for spot-checking.

**Thresholds** (`config.ts` → `GATE`): note 27, flagship 30, deep-dive 31.

**Why 31 and not 34.** The grader scores conservatively — the *best* daily notes top out
around 32–33. An early 34 bar meant good pillars queued forever. The real protection is the
**critical-fail list** (fabrication, hidden primary source, thin-summary-dressed-as-analysis,
financial advice), not the numeric score. Tune the fails, not the number.

## <a id="d3"></a>D3 — Automated commits must be authored as Ken Ashe

**Incident.** Nine posts were committed and pushed, and the site never changed.

**Cause.** Vercel **Hobby** does not deploy commits whose author is not a project
collaborator. The pipeline was committing as its own identity, so every build was silently
skipped.

**Rule.** Every automated commit — from the pipeline (`publish.ts`) *and* from any agent
using the API — must set author **and** committer to `Ken Ashe <kenashe@gmail.com>`.

**Symptom to recognise:** "the run succeeded and committed, but the site is stale."

## <a id="d4"></a>D4 — Verify model *account access*, not just that an ID exists

**Incident.** The notes writer was switched to `gpt-5.6-sol`. The ID was real and documented,
but the account lacked access. The next live run returned `model_not_found` for every post:
**0 published**.

**Cause.** Two mistakes: assuming a documented model ID implies entitlement, and skipping
the shadow run for a "trivial" one-line change.

**Rules.** (1) Confirm the account can actually call a model before switching. (2) **Never
skip shadow validation for a model swap** — it is exactly the change that fails silently.

## <a id="d5"></a>D5 — Treat all feed text as hostile to YAML and MDX

**Incident.** A production Vercel build failed and stayed broken. Cause: an arXiv paper
titled `...for Every Dimension $n\geq 4$`.

Two separate bugs, both triggered by that one title:
1. **Frontmatter.** The title went into a double-quoted YAML scalar; `\g` is an invalid YAML
   escape → the content collection failed to parse. The quoting helper escaped `"` but not
   backslashes.
2. **Body.** `$ρ_{\min}=10^{-6}$` — MDX parses `{` as a JavaScript expression → compile
   error.

**Fixes (both in `publish.ts`, both permanent).**
- `q()` escapes backslashes *first*, then quotes.
- `sanitizeMdxBody()` escapes `{`, `}` and `<Word` **outside** fenced/inline code.

**Rule.** Ingested titles and model output are untrusted input for YAML and MDX. Never
interpolate them raw. The sandbox cannot run `astro build` (npm is firewalled), so this
class of bug only appears at deploy — hence the unit tests in `pipeline/test/`.

## <a id="d6"></a>D6 — Feed access differs from a datacenter IP

Several feeds work from a laptop and fail from the GitHub Actions runner. Verifying a feed
locally proves nothing; **only a live run does**.

| Feed | Symptom | Resolution |
|---|---|---|
| Reddit `.json` | 403 from cloud IPs, every user-agent | switched to `.rss` |
| r/MachineLearning | 429 when fetched right after r/LocalLLaMA | moved **last** in `sources.yaml` — keep it there |
| YouTube feeds | intermittent 404/500 in bursts | jitter + retry-with-backoff in `ingest.ts` |
| Search Engine Land | 403 from the runner only | dropped; Martech promoted to `primary` in its place |
| Martech | intermittent 429 from the runner (fine 08-07 and 08-10, 429 on 08-08/09) | `rss()` now uses `getTextRetry` (3 tries, 1s/2s backoff), same helper `youtube()` uses |

`getTextRetry` deliberately retries **every** error rather than only 5xx/429: YouTube's
transient failure *is* a 404, so status-based filtering would break that case. The cost is
that a permanently dead feed burns ~3s before being logged and skipped — acceptable, since
dead feeds get removed rather than left in the registry.
| Anthropic, Meta, DNJournal, namepros | dead / 403 | removed |

## <a id="d7"></a>D7 — Only primary sources may anchor a deep-dive

**Incident.** The first two pillar attempts both scored ~20/40 with a *fabrication* critical
fail. The pillar had chosen a breaking security rumour covered almost entirely by YouTube
commentators, and asserted unverifiable model names and incident details as fact.

**What did NOT work.** Tightening the prose prompt. Two rounds of sourcing-discipline
instructions moved the score 20 → 19. The cluster, not the writing, was the problem.

**What worked.** Requiring the pillar to anchor on a story containing a **primary** source.
Score jumped to 33, no critical fails.

**Rejected alternative:** "allow a tier-2 anchor if N sources corroborate." The rumour
cluster had **four** corroborating YouTube channels — that rule would have reinstated the
exact failure. Corroboration among commentators is not a primary source.

**Implementation.** `primary: true` in `sources.yaml` marks trade newsrooms that do original
reporting, even at tier 2. Deliberately a *separate flag* rather than promoting them to
tier 1, because `tier` also feeds `rankScore` (+0.5) and would have pushed domain/crypto
stories into flagship slots. **`primary` affects pillar eligibility only.**

## <a id="d8"></a>D8 — Beachheads need reserved slots, not better keywords

**Observation.** Two of the four beachheads produced nothing. The `[deepdive]` log showed
why: `digital-assets:10(0p)` — stories but zero primaries — and `marketing-ops:0(0p)`.

**Two different root causes.**
- *digital-assets*: every feed was tier 2, so no pillar could ever anchor → fixed by D7's
  `primary` flag.
- *marketing-ops*: **there were no marketing sources at all.** Classification was never the
  bottleneck; you cannot classify what was never ingested. Widening keywords against an
  AI-research corpus would only mislabel AI papers.

**Also.** Even once ingested, marketing stories never win a daily slot: tier 2 + single
source ≈ 0.6–0.75 rank vs. ~1.1+ for an arXiv paper. Hence **reserved slots** (1 domains,
1 crypto, 1 marketing) taken from the notes budget.

**Lesson.** Before tuning a classifier, check the corpus actually contains the thing.

## <a id="d9"></a>D9 — Emit the full entity graph on every page

**Trigger.** A reviewer claimed the site had no Person schema. That was wrong — the homepage
had a complete one — but checking it surfaced a real gap.

**Gap.** `personKenAshe` was imported by two pages. Every blog post and hub referenced
`#ken-ashe` as a bare `@id` with **no `sameAs`**. Google resolves cross-page `@id`s once it
has the homepage; single-page parsers — most LLM scrapers — do not. So ~99% of pages, and
the ones most likely to be an entry point, carried no identity disambiguation.

**Fix.** Every content page emits a self-contained `@graph`: page node + breadcrumbs +
`WebSite` + `Person`. Homepage output verified byte-identical afterwards. ~1 KB per page.

**Constraint.** `personKenAshe` is mirrored on luckydomains.io and must stay byte-identical
across both sites. Adding a `sameAs` profile means updating **both**.

## <a id="d10"></a>D10 — Name the primary source in every post

**Observation.** The daily gate pass rate sat at 4–5 of 10. Four of five failures on one run
were the *same* critical fail: the post leaned on an arXiv paper but called it "a new study"
instead of naming it, which the gate reads as a thin summary dressed up as analysis.

**Fix.** The shared synthesis prompt now requires naming the primary source by title and
author/lab (plus arXiv ID when the source material provides one, copied verbatim, **never
invented**) and bans vague references.

**Result.** Pass rate went to 7–8 of 10, and every post now carries a real citation — which
also feeds the `citation`/`isBasedOn` structured data.

## <a id="d11"></a>D11 — Schedule the pillar mid-week

The pillar originally ran Sundays and skipped every time. Weekends are the thinnest day for
*new* material (only ~32 unseen items vs ~103 mid-week), so the eligibility bar was never
met. Moved to **Tuesday**. The rotation logic is weekday-independent; only the attempt day
changed.

## <a id="d12"></a>D12 — Log the decision, not just the outcome

Both D8 and D11 were invisible until a one-line log was added showing *why* the pillar
skipped, with per-beachhead counts. The `[deepdive]` and `[select]` lines exist because
silent, plausible-looking behaviour hid two structural bugs for weeks.

**Rule.** When a code path silently chooses or skips, log the inputs to that choice.

## <a id="d14"></a>D14 — First-party claims need a first-party source

**Incident.** The first pillar the fixed rotation produced (marketing-ops, 2026-08-11) scored
23/40 and queued. It described ChatGPT Ads — `ads.openai.com`, a $25/day floor, CPC ranges,
targeting rules — as confirmed fact, sourced mainly to a Martech guide.

**Why this is different from [D7](DECISIONS.md#d7).** D7 was commentary and rumour, fixed by
requiring a primary anchor. Here the anchor was legitimate original trade reporting; the
problem was a *claim class*. A vendor's own pricing, availability and platform mechanics
belong to the vendor — asserting them on third-party authority is unsafe even when the
third party is a real newsroom.

**Fix.** A rule in the shared synthesis prompt (all tiers, not just pillars — notes cover
product launches constantly): cite the company's own announcement for first-party claims;
where specifics are only second-hand, name who reported it and mark them reported rather
than confirmed; never invent a plausible number.

**Why the shared prompt and not the gate.** The gate already treats this as a critical fail —
it is what caught the pillar. The writer simply was not told the standard it would be judged
against. Same shape as [D10](DECISIONS.md#d10), where aligning the prompt with the gate took
the daily pass rate from 4–5/10 to 7–8/10.

## <a id="d13"></a>D13 — Skipped: FAQPage schema

Considered for LLM answer-extraction, rejected. Google restricted FAQ rich results to
government/health sites in 2023, so there is no search upside, and mismatched markup risks
a structured-data manual action. The question-shaped `##` headings already give LLMs clean
Q&A structure in the HTML. Do not add it without a new reason.
