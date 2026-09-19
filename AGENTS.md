# Instructions for coding agents

Read this before changing anything. It encodes the constraints that are not obvious from the
code and that have already caused production incidents.

**Orientation:** [PROJECT.md](PROJECT.md) (what/setup) → [ARCHITECTURE.md](ARCHITECTURE.md)
(how) → [DECISIONS.md](DECISIONS.md) (why) → [PRODUCT.md](PRODUCT.md) (editorial rules) →
[DATA_SOURCES.md](DATA_SOURCES.md) (feeds).

---

## Non-negotiables

1. **Commit as `Ken Ashe <kenashe@gmail.com>`.** Author *and* committer. Vercel Hobby
   silently skips deploys for non-collaborator commits. This applies to the pipeline and to
   you. → [D3](DECISIONS.md#d3)
2. **Never commit secrets.** Keys live in GitHub Actions secrets and `.env` (gitignored).
   `pipeline/.env.example` documents names only.
3. **Shadow-test risky changes.** Model swaps, prompt changes, selection logic. → [D4](DECISIONS.md#d4)
4. **Don't reorder `sources.yaml` blindly.** r/MachineLearning must stay last. → [D6](DECISIONS.md#d6)
5. **`personKenAshe` in `src/data/schema.ts` is byte-identical with a copy on
   luckydomains.io.** Import it; never inline a second copy; update both sites together.
   → [D9](DECISIONS.md#d9)
6. **Treat feed text as untrusted for YAML and MDX.** Use the existing `q()` and
   `sanitizeMdxBody()` helpers. → [D5](DECISIONS.md#d5)

## Before you push

```sh
cd pipeline && npm run typecheck && npm test    # pipeline changes
npm run build                                    # site changes (.astro/.mdx) — REQUIRED
```

`npm run build` is the only thing that catches content-collection and MDX errors. A broken
post fails the Vercel build and the site keeps serving the previous deploy while `master`
sits broken.

If your environment cannot install dependencies (some sandboxes firewall npm), you can still
syntax-check TypeScript with `node --experimental-strip-types --check <file>` — but say so
plainly, and treat the next deploy as the real verification.

## How to make common changes

| Goal | Where | Notes |
|---|---|---|
| Add/remove a feed | `pipeline/config/sources.yaml` | see [DATA_SOURCES.md](DATA_SOURCES.md#adding-a-source); update the source-name sets in `run.ts` if it belongs to a reserved-slot beachhead |
| Change posts/day | env `DAILY_FLAGSHIPS`, `DAILY_NOTES_MAX` | no code change |
| Change gate strictness | `config.ts` → `GATE` | prefer editing critical fails in `GATE_SYSTEM` over the numbers → [D2](DECISIONS.md#d2) |
| Change voice/format | `pipeline/src/prompts.ts` | mirror the rules in [PRODUCT.md](PRODUCT.md) |
| Change pillar cadence/tuning | `pipeline/config/deepdive.json` | `force` is shadow-only by design |
| Swap a model | `config.ts` → `MODELS` | verify account access first → [D4](DECISIONS.md#d4) |
| Pause everything | repo variable `PIPELINE_ENABLED=false` | no code change, no revert |
| Add a topic hub | `src/data/topics.ts` (+ `BEACHHEADS`/`CANON` in `run.ts`) | rotation assumes 4 beachheads (`isoWeek % 4`) |

## Working style that fits this codebase

- **Diagnose before patching.** Every bug in [DECISIONS.md](DECISIONS.md) looked like
  something else at first: the "no Person schema" report was wrong but revealed a real gap;
  the "pillar writes rumours" bug was a *selection* problem, not a prompt problem; the
  "marketing classifier is broken" theory was really "there are no marketing feeds."
- **Log the inputs to silent decisions.** Two structural bugs hid for weeks because a code
  path skipped quietly. → [D12](DECISIONS.md#d12)
- **Improve the output before lowering a bar.**
- **Prefer additive, reversible changes.** Reserved slots are reclaimed when empty; the
  pillar skips rather than shipping thin; failed drafts are written, never deleted.
- **Keep these docs current.** They are the durable memory. If you change behaviour, update
  the relevant file in the same commit — a future agent will have this repo and nothing else.

## The human/machine content split (2026-08 repositioning)

- `/blog/` is the **Digest**: everything in the `blog` content collection is machine-published.
  The nav label is "Digest", the index and every post carry an "automated" banner and the
  byline `KenAshe Digest (automated)`. Do not rename it back to "Blog" or soften the labels.
- Human-written pages live at `/writing/` as **static pages**, deliberately outside the
  content collection. There is NO `origin` frontmatter field, on purpose: adding one would
  change `src/content.config.ts`, which is frozen ([D15](DECISIONS.md#d15)). Collection
  membership IS the origin signal.
- Post JSON-LD: `author` is the Organization "KenAshe Digest (automated)"; `publisher` stays
  the canonical Person. Keep it that way.

### Publishing a Writing essay (image rule)

Every essay ships with one image, and that image is declared once:

1. Put the file in `src/assets/writing/<slug>.jpg` (landscape, ideally 16:9; 2816×1536 or
   1200×630 both work). Never `public/` — astro:assets needs the import to emit sized
   derivatives.
2. Add `image: { file, alt, caption? }` to the essay's entry in `src/data/writing.ts`.
3. Render `<EssayFigure essay={essay} />` once in the page. Directly under the byline with
   `priority` for a hero, or inline where the text needs it. Do not hand-write `<img>`.
4. In the page frontmatter use `const og = await ogImageOf(essay)` for `image`,
   `ogImageWidth`, `ogImageHeight`, and the Article `image`. Copy an existing essay page.

`/writing/` derives each thumbnail from that entry (`src/data/writing-images.ts`), so there
is no index edit and no list of thumbnails to maintain. The build **fails** if the declared
file is missing or the page never renders it, and **warns** `[writing] WARNING` when an essay
has no image at all (that essay is listed text-only, with no empty box). Treat the warning as
a publishing defect to fix, not a state to leave. Rules are unit-tested:
`node --experimental-strip-types --test src/data/writing-image-rules.test.ts`.

## Image assets: current vs archive

- `public/images/ken-ashe.jpeg` is the **current** headshot and the only press photo. The
  Newsroom media kit offers it, the SVG logo, and `og-default.png`; nothing else.
- `public/images/archive/` holds older images kept for career-history use only (currently
  `ken-ashe-headshot-corporate-archive.png`, a corporate headshot more than ten years old).
  Never surface archive images in the media kit, on the About page, or as a current photo,
  and never label one as a press asset. They are unlinked on purpose.
- Do not generate, edit, or upscale Ken's likeness with AI.

## Digest tags: reuse, don't mint

Tags come only from `CANONICAL_TAGS` in `pipeline/src/tags.ts`; synonyms collapse via
`TAG_SYNONYMS`; anything else is dropped at publish time. Add to the vocabulary (in a reviewed
commit) only when several posts would share the tag. Never rewrite historical tags or tag pages to "clean up"
the taxonomy; that is a Search-Console-evidence decision. Details: ARCHITECTURE.md
"Topics vs tags".

## Lucky Domains links

Digest posts may link to Lucky Domains only on domains / website-build / SEO stories, only to
the five deep links in `pipeline/src/partner-links.ts`, at most once, phrased as a disclosed
fact about the publisher. `governLuckyDomainsLinks()` enforces this; do not bypass it, and do
not add homepage/contact/about links from kenashe.ai copy. Details: ARCHITECTURE.md
"Lucky Domains links".

## Things that look like bugs but aren't

- `MODELS.image` (`gemini-3-pro-image`) and `config.IMAGES` are **unused**; images.ts calls
  OpenAI `gpt-image-2` (`IMAGE_MODEL`, D18) and counts placeholders. Dead config, documented in ARCHITECTURE.
- Digest images are **WebP** (`hero.webp`, `inline-N.webp`) since 2026-09-16; the 2,000+
  `.png` files from June to September are the old format and will be re-encoded in batches
  ([D16](DECISIONS.md#d16)). Never switch the request back to PNG: `assertImageBudget` fails
  the run if a day's new images exceed 15 MB or any single file exceeds 1.5 MB.
- `pipeline/ci/pipeline.yml` is a template copy of the live workflow. Agents usually lack
  `workflows` PAT scope, so edit the template and ask a human to copy it to
  `.github/workflows/pipeline.yml`. If they differ, `.github/workflows` is what runs.
- A feed logging `0 items` is normal for `aiFilter` feeds on a quiet day.
- `[deepdive] skipped: ...` on a Tuesday is a designed outcome, not a failure.
- The `items` table has columns `markSeen` never populates.

## Environment limits you may hit

- The **PAT used by agents** typically has Contents + PR scope only — **no Actions scope**,
  so an agent cannot trigger or re-run workflows. Ask the human to dispatch runs.
- Vercel build ≈ 8–10 minutes at current post count; don't conclude a deploy failed early.
- Some sandboxes firewall npm, so `astro build` may be impossible locally. Plan around it
  (see "Before you push") rather than guessing.
