# /connect — conference networking page

**URL:** https://kenashe.ai/connect (permanent; never changes)
**Edit only:** `src/data/connect.ts`

`/connect` is a one-page digital business card for people Ken meets at events. Everything on it, and everything in the downloadable contact card, comes from one config file. The page component (`src/pages/connect/index.astro`) and the vCard generator (`src/pages/connect/ken-ashe.vcf.ts`) never need editing to change content.

## Common changes (all in `src/data/connect.ts`)

| To... | Change |
|---|---|
| Add an event greeting ("Great meeting you at NFT.NYC") | `greeting: '...'` (set back to `''` to hide it) |
| Change the subtitle or intro | `subtitle`, `intro` |
| Reorder buttons | Move entries up or down in `buttons` (top of the list = top of the page) |
| Hide or show a button | `show: false` / `show: true` |
| Rename a button or change where it goes | `label`, `href` (a full URL, a site path like `/building/`, `mailto:...`, or `CONTACT_CARD`) |
| Change a button's icon | `icon:` one of `x`, `linkedin`, `github`, `youtube`, `tiktok`, `building`, `contact`, `globe`, `mail`, `calendar`, `link` |
| Highlight a different button | `emphasized: '<button id>'` (must be a visible button; the build fails otherwise) |
| Add a new button | Copy an entry, give it a new unique `id` |
| Change the small links under the buttons | `links` (same fields as buttons) |
| Change what's in "Save My Contact" | `contact` (public business details only: name, title, organization, email, website, region, social profiles) |

Spare buttons for YouTube, TikTok and email are already in the list with `show: false`.

Example, before an event:

```ts
greeting: 'Great meeting you at Bitcoin 2027',
emphasized: 'linkedin',
// ...and in buttons, move the linkedin entry to the top
```

You can also just tell HyperAgent, for example: "On /connect, add the greeting 'Great meeting you at NFT.NYC', emphasize LinkedIn, and show the YouTube button." It edits only this file, then opens a PR or merges as you choose.

## Contact card

`/connect/ken-ashe.vcf` is generated at build time from `contact`: vCard 3.0 with CRLF line endings, which imports on iPhone and Android, plus a small embedded headshot. It is served inline, so iPhone Safari opens the "Add to Contacts" sheet directly. No phone number or home address is included.

## Analytics

The page uses the site's existing Vercel Web Analytics. Page views, referrers and device types for `/connect` appear in the Vercel dashboard automatically. Button clicks are sent as `connect_click` custom events with the button `id`. Vercel only shows custom events on Pro and Enterprise plans; on Hobby those calls do nothing. No other tracking service is used.
