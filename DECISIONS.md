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
- **(added 2026-08-28)** `sanitizeMdxBody()` *normalizes* braces rather than blindly
  prefixing: models sometimes emit LaTeX-escaped `\{` already, and adding another
  backslash produced `\\{` — an escaped backslash plus a RAW brace, which MDX parses as
  an expression. That broke the 2026-08-27 deploy (acorn: "Expecting Unicode escape
  sequence"). Every backslash run before a brace is now collapsed and re-escaped once,
  making the transform idempotent; regression tests pin it.

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

**2026-09-10 addendum.** Lucky Domains now carries three identical copies of the node
(`index.html`, `news/website-relaunch.html`, `founder/ken-ashe/index.html`) and `sameAs`
gained `https://luckydomains.io/founder/ken-ashe/`, a `ProfilePage` whose `mainEntity` is
this node. Both repos were updated in the same pass.

**Constraint.** `personKenAshe` is mirrored on luckydomains.io and must stay byte-identical
across both sites. Adding a `sameAs` profile means updating **both**.

**How the mirror is done (2026-09-08).** The node lives once as TypeScript in
`src/data/schema.ts`. On Lucky Domains it is embedded as pretty-printed JSON inside the
`@graph` of two files in the `kenashe/luckydomains` repo: `index.html` and
`news/website-relaunch.html` (`about.html` carries only a short founder blurb that shares the
`@id`). The check that matters is semantic, not textual: serialize `personKenAshe` and compare
it, key for key, with the Person object parsed from each Lucky Domains page. Procedure: edit
`schema.ts`, push, then replace the Person object in both Lucky Domains files with the
serialized node (JSON-LD only, no visible copy) in the same pass. Lucky Domains deploys from
`main` via GitHub Pages in under a minute; kenashe.ai takes 10 to 20 minutes on Vercel, so
the two sites can briefly disagree after a change. That window is expected.

**Revision log.** The node changed four times on 2026-09-04 through 2026-09-08 as the
"AI application builder" identity settled: jobTitle, description, `mainEntityOfPage`
(/about/), email, NJ/US address, credentials (now CPA, CGMA, PMP, PMI-ACP), `alternateName`
"Kenneth Ashe", and `sameAs` (GitHub, LinkedIn, X, PMI, Investing.com contributor profile,
Sessionize). `@id` stayed `https://kenashe.ai/#ken-ashe`. `sameAs` is for profiles Ken
controls; published works and press coverage never go in it. `founder` is expressed on the
Lucky Domains Organization node, not on the Person (schema.org has no Person.founder).

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

## <a id="d15"></a>D15 — Never touch `content.config.ts` (the 45-minute build trap)

**Incident.** Adding a `builds` content collection for three small detail pages made the
Vercel build run to exactly 45 minutes — Hobby's hard build timeout — and fail. Twice: the
second attempt removed the collection but left an explanatory *comment* in
`src/content.config.ts`, and still timed out.

**Cause.** Astro keys its content-layer cache on that config file. Any byte change — even a
comment — invalidates it, forcing a full re-render including re-optimization of every image
(~1,500 at 570+ posts), which no longer fits inside the 45-minute Hobby timeout. Normal daily
builds only pass because they run on a warm cache.

**Rules.**
- Treat `src/content.config.ts` as frozen. Do not add collections, comments, or formatting
  changes to it without accepting a cold build that currently CANNOT complete on Hobby.
- New page types go in as static routes under `src/pages/` (see `src/pages/building/*.astro`,
  whose canonical copy lives in `docs/builds/*.md`).
- A failed build does not save cache, so retrying a cold build just times out again;
  recovery is making the config byte-identical to the last successful build.
- The durable fix is cutting image work out of the build (the 3.3 GB repo problem) or a
  paid Vercel plan; until then this constraint is structural.

## <a id="d16"></a>D16 — Digest images are compressed WebP, never lossless PNG

**Incident (2026-09-16).** The production deploy of that day's pipeline run failed: Vercel
spent 42m19s cloning the repository and about 2 minutes building, and hit the 45-minute
Hobby limit. Deploys of near-identical trees the same day took 11, 33, and 44 minutes.

**Cause.** The tree at `master` was 5.5 GB, 99.7% of it 2,083 `gpt-image-1` PNGs under
`src/assets/blog/` (1536×1024, average 2.63 MB, ~25 added per run, ~2 GB per month). Vercel
clones with `--depth=10`, so history is irrelevant; the current tree is the whole payload,
and PNG bytes neither compress nor delta in a pack. Whether a clone finishes inside the
window depended only on GitHub-to-Vercel throughput that hour. Visitors never receive the
PNG: Astro serves 20-450 KB WebP derivatives from it.

**Decision.**
- `images.ts` requests `output_format: 'webp'`, `output_compression: 80` (constants in
  `image-output.ts`) and writes `hero.webp` / `inline-N.webp`. The content schema's `image()`
  accepts WebP, and the MDX path is derived from the file name, so `src/content.config.ts`
  stays untouched (D15).
- `assertImageBudget` runs before the pipeline commits: over 15 MB of new images in a day,
  or any single image over 1.5 MB, fails the run with a message pointing at the request
  body. A failed run is visible; a silent regression to PNG is how the repo got here.
- Existing PNGs are re-encoded to WebP in batches of ~100 posts per commit, one batch per
  successful deploy, so Astro re-optimizes ~250 images at a time instead of all 2,083 (the
  D15 trap). History keeps the PNG blobs; no rewrite. The full audit is in the operator's
  thread notes (2026-09-16).
- Not chosen: moving images to Blob/R2/LFS. It requires a schema change (D15 cold build) and
  LFS objects still download during the Vercel build.

**Completion record (2026-09-18).** Phase B finished across batches 1 to 9 (PRs #68 to #76),
each assembled with `docs/migrations/tooling/prepare_batch.sh` and verified on production
before the next began.
- 837 migration posts; 2,083 PNGs converted to WebP (quality 80, dimensions unchanged).
- Original PNG bytes 5,479,873,161; replacement WebP bytes 274,953,648; net current-source-tree
  reduction 5,204,919,513 bytes (95.0%).
- 0 PNG files remain under `src/assets/blog/`.
- 1,043 migration redirects created (308, exact paths) and verified live; `vercel.json` holds
  1,091 rules of the 2,048 limit.
- Git history was intentionally not rewritten; the PNG blobs remain in history.
- Reader-facing delivery already used WebP derivatives, so the principal benefit is source-tree
  and deployment-payload reduction (Vercel's depth-10 clone), not page weight.
- The 20 Phase A posts born as WebP were not modified.
- Inline MDX image `sizes` remains a separate future optimization (now D17).

## <a id="d17"></a>D17 — Inline Digest images get srcset/sizes through the renderer, not global config

**Finding (2026-09-18).** Every inline Markdown image in a Digest post shipped as one 1536px
WebP with no `srcset` and no `sizes`, for a slot that renders at ~327px on a 390px viewport
and ~582-592px on anything wider. Heroes, `/blog/` cards, Writing thumbnails, and
`EssayFigure` were already responsive because they call `<Image>` with explicit `widths` and
`sizes`. The cause was not a missing `sizes` attribute: `@astrojs/mdx` renders Markdown
images through Astro's `<Image>` with no `widths`, which emits a single candidate.

**Rejected: global `image.layout: 'constrained'` + `responsiveStyles`** (experiment branch
`experiment/global-responsive-images`, PR #77, closed unmerged). Measured on the same commit:
- Vercel deploy 17m13s wall (under the 45-minute limit, over our comfort line for a config
  change that re-optimizes every image).
- Transforms 4,362 to 9,816; `dist/_astro` image bytes 456 MB to 641 MB (+41%); each inline
  image gained six variants (640/750/828/1080/1280/1536).
- Astro derived `sizes="(min-width: 1536px) 1536px, 100vw"` from the intrinsic width, so
  Chromium at DPR 2 on any viewport of 768px or wider still selected the 1536px file (zero
  saving for most laptops); DPR 1 desktops got 1280w for a 592px slot.
- Blast radius: every existing `<Image>` gained `data-astro-image` attributes, `object-fit:
  cover`, and a rehashed URL for every transform variant (749 of 1,490 pages changed).

**Decision.** `src/pages/blog/[...slug].astro` passes `components={{ img: InlineFigure }}` to
`<Content />`. `src/components/InlineFigure.astro` renders `<Image widths={[480, 768, 1200,
1536]} sizes="(min-width: 690px) 592px, calc(100vw - 48px)">` with lazy loading, async
decoding, and no `layout`/`fit`, so the element stays a plain `<img>` sized by `.prose img`.
Article files, image assets, global image config, and every other `<Image>` call are
untouched. Inline transform-variant URLs change (they are referenced only inside their
article HTML and are not redirected, consistent with the Phase B policy for variants).

**Completion record (2026-09-19).** Shipped in PR #78, merge commit b96165b; Vercel production
deploy 4m54s (the rejected global config took 17m13s on the same day).
- Contrary to the sentence above, no existing inline URL changed: the fallback `src` and the
  1536px transform kept their hashes (0 of 1,067 current inline URLs), so only the 480/768/1200
  variants were new (+3,295 transforms, +96 MB of build output vs +185 MB for the global config).
- Verified on production in Chromium: 390px selects 480w at DPR 1 and 768w at DPR 2; the
  592px column selects 768w at DPR 1 and 1200w at DPR 2. Ten sample inline images went from
  1,485 KB to 113 / 316 / 316 / 663 KB respectively. Heroes, `/blog/` cards, Writing
  thumbnails, `EssayFigure`, og:image, schema images, and all 1,043 Phase B redirects unchanged.

## <a id="d13"></a>D13 — Skipped: FAQPage schema

Considered for LLM answer-extraction, rejected. Google restricted FAQ rich results to
government/health sites in 2023, so there is no search upside, and mismatched markup risks
a structured-data manual action. The question-shaped `##` headings already give LLMs clean
Q&A structure in the HTML. Do not add it without a new reason.
