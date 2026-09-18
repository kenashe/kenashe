# Migration records

Records for content migrations that change public URLs. Keep one set per batch.

## Phase B: Digest images PNG to WebP (DECISIONS.md D16)

- `phase-b-batch-01-site-image-urls.tsv`: old and new `/_astro/` image URLs for the 100 oldest
  posts, with the production HTTP status of each old URL on the day of the batch. Old URLs
  that were served (200) are redirected permanently (308) in `vercel.json` to the new WebP.
  Old URLs marked 404 were never emitted by the build (only sized derivatives existed) and
  need no redirect. Sized-derivative URLs (`/_astro/<name>.<hash>_<transform>.webp`) are not
  mapped or redirected; they are referenced only inside the pages that generate them.
- `phase-b-batch-01-raw-github-urls.tsv`: `raw.githubusercontent.com` paths of the removed
  PNGs. These 404 at `master` after the batch and stay reachable at the pre-batch commit
  listed in the file. Nothing on the site links them.

### Batch 2 (posts 101 to 200 in migration order, 2026-07-03 to 2026-07-14)

- `phase-b-batch-02-site-image-urls.tsv`, `phase-b-batch-02-raw-github-urls.tsv`: same format as batch 1.
- `phase-b-batch-02-post-status.tsv`: published/draft flag, production HTTP status, sitemap presence, and
  og:image for each post before the batch. Drafts (404, not in the sitemap) are expected to stay 404
  after the batch; that is not a regression. Their assets are converted like everyone else's.

### Batch 3 (posts 201 to 300 in migration order, 2026-07-14 to 2026-07-24)

- Same three files as batch 2 (`phase-b-batch-03-*.tsv`). 70 published, 30 drafts. One published
  post (`2026-07-16-the-one-shot-trap-in-agent-optimization`) has no hero image at all and uses
  the default social card; that is pre-existing and unchanged.

### Batch 4 (posts 301 to 400 in migration order, 2026-07-24 to 2026-08-03)

- Same three files as batches 2 and 3 (`phase-b-batch-04-*.tsv`). 91 published, 9 drafts. Every
  published post has a hero; no default-social-image exceptions in this batch.

### Batch 5 (posts 401 to 500 in migration order)

- Same three files as earlier batches (`phase-b-batch-05-*.tsv`).
