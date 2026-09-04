# Open items

Non-published backlog. Editorial notes must never live in rendered page copy (two "Flag:"
notes leaked to /newsroom/ until 2026-08-18); park them here instead.

## Newsroom
- **Press card image.** The media kit offers `og-default.png` (the site-wide social card) as
  the press "card image". If a dedicated brand/press card is ever made, swap it in at
  `src/pages/newsroom/index.astro` (Media Kit assets).
- **Media contact form.** A general / media / speaking contact form was planned for a
  Contact page. Email is the press contact until then. `/contact` still 301s to the
  homepage via `vercel.json`; remove that redirect before building the page.

## Identity
- **Person schema alignment** (see the 2026-09-04 consistency pass): `personKenAshe` in
  `src/data/schema.ts` still carries the pre-repositioning `jobTitle`/`description` and is
  byte-identical with a copy on luckydomains.io (DECISIONS.md D9). Updating it to the
  "AI application builder" identity and pointing `mainEntityOfPage` at `/about/` requires
  changing both sites together. Awaiting Ken's decision.

## OG cards (assets needed from Ken)
- **Dedicated social cards for `/about/` and the AI Werewolf essay.** The per-page mechanism
  already exists: pass `image="/og/<file>.png"` plus `ogImageWidth={1200}` and
  `ogImageHeight={630}` to `BaseLayout` (see `src/pages/news/site-launch.astro`). Both pages
  stay on `og-default.png` until these files exist in `public/og/` (PNG, 1200 x 630):
  - `public/og/kenashe-ai-about.png` -> wire in `src/pages/about.astro`
  - `public/og/kenashe-ai-agents-reasoning.png` -> wire in
    `src/pages/writing/ai-agents-reasoning-from-events-that-never-happened/index.astro`
