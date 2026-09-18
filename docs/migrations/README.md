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
