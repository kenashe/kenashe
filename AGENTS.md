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

## Things that look like bugs but aren't

- `MODELS.image` (`gemini-3-pro-image`) and `config.IMAGES` are **unused**; images.ts calls
  OpenAI `gpt-image-1` and counts placeholders. Dead config, documented in ARCHITECTURE.
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
