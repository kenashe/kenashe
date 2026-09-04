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
