# Rebuilding the Image Pipeline Behind KenAshe.ai

**Status**: LIVE  
**Date**: September 2026  
**Stack**: Astro, WebP, sharp, GPT Image 2, Vercel, GitHub Actions

Migrated 2,083 legacy PNGs to WebP, preserved published image URLs, added responsive inline delivery, and changed future AI-generated artwork to 1200×800 WebP.

KenAshe.ai publishes a lot of images.

That eventually became a problem.

The autonomous publishing system had accumulated 2,083 PNGs across 837 blog post records, including published articles and drafts. The files worked, but they made the repository and deployment pipeline heavier. Fixing the source files turned out to expose a second problem: readers were still downloading oversized inline images.

What started as an image-format cleanup became a rebuild of the image pipeline from generation to delivery.

## The problem

The original blog artwork was generated at 1536×1024 and stored as PNG.

Across the historical blog library, those images occupied:

- 5,479,873,161 bytes as PNG
- across 2,083 files
- in 837 post records: 723 published articles and 114 drafts

The site was already using Astro to serve optimized image derivatives to readers, so converting the source files was not primarily a page-speed project.

It was a repository and deployment problem.

There was also a separate reader-facing problem hiding underneath it.

Inline article images were displayed at roughly 342 pixels wide on a narrow phone and about 585–592 pixels wide on desktop, but the browser was still receiving a single 1536-pixel-wide image.

Those were two different problems, and they needed two different fixes.

## Phase 1: Stop creating new PNGs

The first change was simple: stop adding more large PNGs.

New article images began being stored as WebP instead.

That proved the format worked with the existing Astro pipeline before touching the historical library.

The newer posts that were born WebP remained outside the later migration.

## Phase 2: Migrate the historical image library

I did not try to convert the entire library in one shot.

Earlier image-heavy builds had already shown that reprocessing too many assets at once could push Vercel builds toward its limits. A giant migration would also have made rollback harder.

So the conversion happened in nine batches.

Each batch:

- selected the next group of posts
- recorded published and draft status before making changes
- converted the source images to WebP
- preserved dimensions
- updated only the image extensions in the article files
- created redirects for verified, publicly served original-image URLs
- deployed separately
- verified the live articles, images, schema, redirects, and representative narrow-width and desktop rendering before continuing

By the end:

- 837 post records had been migrated
- 2,083 PNGs had been converted
- 0 PNGs remained under the blog asset directory
- 1,043 old original-image URLs had working redirects

The source files went from:

**5,479,873,161 bytes of PNG**

to:

**274,953,648 bytes of WebP**

A net reduction of:

**5,204,919,513 bytes — about 95% of the migrated source-image bytes.**

Git history still contains the original PNG blobs. I deliberately did not rewrite history.

The measured reduction is in the current source tree, not a claim that five gigabytes disappeared from every historical clone. Its effect on deployment fetching depends on which older commits and assets the build retrieves.

The redirects preserve the mapped original-image URLs. They do not cover every historical resized derivative or raw GitHub image link; those limitations are documented in the migration records.

## The migration did not solve the reader problem

Once the source migration was complete, I looked at what browsers were actually downloading.

That exposed another issue.

Inline Markdown images were being optimized by Astro, but they were not responsive.

A typical inline image rendered like this, with the hashed URL and alternative text shortened here:

```html
<img
  src="/_astro/inline-image.webp"
  alt="…"
  width="1536"
  height="1024"
  loading="lazy"
  decoding="async"
>
```

There was no `srcset`.

There was no `sizes`.

The browser had one choice: 1536 pixels wide.

That was true whether the image was displayed at 342 pixels on a phone or about 585 pixels in the desktop article column.

The article hero images did not have this problem. They already had multiple responsive candidates.

## The obvious fix was not good enough

I tested Astro's global responsive-image configuration first.

It worked technically.

Inline images received multiple `srcset` candidates.

But the generated `sizes` value was based on the source image rather than the actual article column:

```text
(min-width: 1536px) 1536px, 100vw
```

The real layout was closer to:

```text
(min-width: 690px) 592px, calc(100vw - 48px)
```

That difference mattered.

The global approach improved the tested phone-sized viewports, but on a 2× desktop display the browser still selected the full 1536-pixel image. Here, 2× means two device pixels per CSS pixel.

It also affected far more of the site:

- roughly 5,454 additional image transforms
- about 185 MB of additional generated image output
- a roughly 17-minute Vercel deployment
- new responsive-image attributes and styling applied across the site

The HTML looked responsive.

The browser measurements showed that the default configuration did not match the article layout well enough.

I rejected it.

## Measure `currentSrc`, not just `srcset`

The narrower solution was to change only the way inline Markdown images render.

The shared renderer now gives the browser four candidates for the existing 1536-pixel source images:

```text
480w
768w
1200w
1536w
```

and describes the article geometry:

```text
(min-width: 690px) 592px, calc(100vw - 48px)
```

The important test was not whether `srcset` appeared in the HTML.

It was which file the browser actually selected. The image element's `currentSrc` property identifies that file.

In a production sample of 10 inline images across four articles, measured in Chromium:

| Display | Before | After | Sample byte reduction |
| --- | --- | --- | ---: |
| 390px viewport, 1× | 1536w | 480w | 92% |
| 390px viewport, 2× | 1536w | 768w | 79% |
| Desktop article column, 1× | 1536w | 768w | 79% |
| Desktop article column, 2× | 1536w | 1200w | 55% |

These are reductions in the combined bytes of the selected files in that sample, not site-wide page-weight or Core Web Vitals measurements.

One dense image in the sample went from about 438 KB to:

- 21 KB at 480w
- 85 KB at 768w
- 201 KB at 1200w

The browser made those choices itself.

The 1536-pixel version remains available for existing images when a display actually needs it.

## The narrower fix was also cheaper to build

The rejected global experiment took about 17 minutes from Vercel deployment creation to completion.

The targeted inline-image implementation deployed in about five minutes. The production validation recorded 4 minutes and 54 seconds.

Those are observed deployment times, not a controlled benchmark: cache state and other build conditions can affect the comparison. The targeted implementation also added less generated image output—about 96 MB rather than 185 MB in the measured builds.

It left existing image URLs unchanged and did not alter:

- article heroes
- blog-card thumbnails
- Writing thumbnails
- social images
- Article schema images
- existing redirects

That was the result I wanted: fix the inefficient path without changing the paths that were already working.

## Fix the upstream process too

Cleaning up the historical library was only part of the work. I also wanted future images to enter the system at a size appropriate for the site.

The image-generation pipeline originally used the landscape size offered by the older image model:

**1536×1024**

For the display sizes and pixel densities I tested, a smaller standard source was sufficient.

The article column tops out around 592 CSS pixels. A 1200-pixel-wide source provides approximately 2× resolution for that layout. Higher-density displays can benefit from more pixels, so this is a deliberate default rather than a claim that larger sources are never useful.

The new generation pipeline targets:

```text
GPT Image 2
1200×800
WebP
compression 80
quality low
```

The API produces the final 1200×800 WebP directly.

There is no normal resize or second re-encode step.

The returned image is validated before it is written, and newly created blog assets are checked again before the publishing commit. New standard blog artwork must be:

- WebP
- exactly 1200×800 unless explicitly exempted from that dimension requirement
- no wider than 1200 pixels
- within the existing byte budget

Unexpected generated output fails validation rather than silently entering the repository.

A three-image pilot using the site's real prompts produced valid 1200×800 WebPs between roughly 160 and 174 KB and passed visual review before the configuration was merged. The API reported low quality for those generations; I then pinned that setting explicitly rather than leave it to the default.

The new generation configuration is now merged into production. The first scheduled pipeline run that creates new images will serve as the final live acceptance test for the generation path. The historical migration and responsive-delivery work described above have already been validated in production.

## What I learned

### Optimization has layers

Changing PNG to WebP fixed the source-tree problem.

It did not automatically fix what readers downloaded.

Repository optimization and browser-delivery optimization were separate problems.

### Responsive markup is not proof of efficient delivery

The global Astro experiment generated a `srcset`.

That looked like success.

But `currentSrc` showed that a 2× desktop was still downloading the original 1536-pixel image.

The browser's actual selection mattered more than the presence of the markup.

### Defaults need to match the real layout

The generated `sizes` value did not account for the narrow article column.

Giving the browser an inaccurate estimate of the display width meant giving it the wrong information to make its choice.

### Cleanup needs prevention

The largest migration involved 2,083 historical files.

The long-term change was making sure future images enter the system at the intended size and format in the first place.

## Outcome

The historical image library has been migrated, with about 5.2 GB removed from the current source tree.

The 1,043 mapped original-image URLs remain preserved through redirects.

Inline images now offer responsive candidates matched to the article layout, with measured sample download reductions of 55–92%.

The future-generation pipeline has been updated and pilot-tested, with its first scheduled live acceptance run still pending.

The system now includes validation designed to keep off-standard generated images from quietly returning.
