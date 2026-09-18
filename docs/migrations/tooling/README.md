# Phase B migration tooling (Digest images, PNG to WebP)

Non-runtime tooling that assembles one migration batch. Nothing here is imported by the site or
the pipeline; it lives under `docs/` on purpose. See DECISIONS.md D16 and `../README.md` for the
records each batch produces.

## Files

| File | Role |
|---|---|
| `prepare_batch.sh` | Orchestrator. Checks dependencies, selects posts, records pre-change status, converts, hashes, rewrites references, generates mapping + redirects, validates, writes records, then commits locally. **Never pushes.** |
| `convert.mjs` | sharp WebP encode at quality 80, dimensions asserted unchanged; writes `report.json` with exact before/after bytes. |
| `oldurls.mjs` | Computes the current `/_astro/<name>.<hash>.png` URL of each PNG with Rollup's asset hash (what Astro uses), for served-today probing. |
| `mapping.generic.mjs` | Env-driven old to new URL mapping and the exact 308 redirect list for URLs production served before the batch. |
| `rewrite_refs.py` | Moves MDX frontmatter and inline image references from `.png` to `.webp`, extension only, and verifies every reference resolves. |
| `livecheck3.py` | Post-merge production checks: published pages, expected draft 404s, every image variant, og/schema images (allows the intentional `og-default.png` fallback), new redirects, and every prior batch's redirects. |

## Requirements

Node 22+, Python 3, and in the tooling directory: `npm install sharp@0.33 rollup`. A full (non-sparse)
clone of the repository with a clean working tree. Network access to kenashe.ai for status probes.
No credentials are read or stored by any script here.

## Usage

```
# assemble batch N covering lines START..END of `ls src/assets/blog | sort`
REPO=/path/to/clone TOOLS=/path/to/this/dir bash prepare_batch.sh N START END [--dry-run]
```

The script aborts with `ABORT [stage]: reason` and a non-zero exit at the first failed check. A commit
is created only after mapping, redirect, and content validation all pass; a post-commit check then
confirms the commit contains the validated `vercel.json` and the mapping record. `--dry-run` stops
after validation and records, leaving the branch uncommitted.

Pushing the branch and opening the PR are deliberate separate steps performed with credentials
outside this tooling. After the PR merges and Vercel deploys, run:

```
python3 livecheck3.py <pre-status tsv> <this batch mapping tsv> <prior mapping tsv>... <out json>
```

## Failure handling, and why it is strict

Batches 2 and 4 were first assembled with an ad hoc `&&` chain; a mapping step invoked from a
directory without `rollup` failed, `set -e` does not fire inside `&&` lists, and the chain fell
through to `git commit` without redirects or mapping. Both were caught by a count check before push.
This tool replaces that pattern: explicit absolute directories per step, dependency checks before
any change, explicit exit checks after every step, and validation as a hard gate before commit.
Tested on 2026-09-18: invalid repo directory, missing sharp/rollup, and a mapping script forced to
fail after dependency checks all abort with exit 1, unchanged HEAD, no commit, no push.
