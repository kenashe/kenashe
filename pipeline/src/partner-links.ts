// Lucky Domains links inside Digest bodies. Ken Ashe owns Lucky Domains (luckydomains.io), so
// the synthesis prompt may let the model add ONE disclosed sentence linking to the most
// specific Lucky Domains page when a story is centrally about domains, website builds, or
// SEO. This module is the deterministic guardrail on whatever the model wrote:
//   - only the allow-listed deep links survive (anything else on luckydomains.io is remapped
//     to the closest allowed page for the post's tags);
//   - at most one Lucky Domains link per post (later ones keep their text, lose the link);
//   - if the post carries none of the qualifying tags, every Lucky Domains link is unlinked;
//   - bare luckydomains.io URLs (not markdown links) are removed.
// See ARCHITECTURE.md "Lucky Domains links".

export const LD_ALLOWED_URLS = [
  'https://luckydomains.io/how-we-buy-domains.html',
  'https://luckydomains.io/services.html#domains',
  'https://luckydomains.io/services.html#selling',
  'https://luckydomains.io/services.html#websites',
  'https://luckydomains.io/services.html#seo',
] as const;

/** Tags that make a Lucky Domains mention legitimate. */
export const LD_QUALIFYING_TAGS = ['domains', 'seo', 'ai-search', 'content-strategy', 'website-builds', 'digital-assets'] as const;

const LD_HOST = /^https?:\/\/(www\.)?luckydomains\.io/i;
const MD_LINK = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?luckydomains\.io[^)\s]*)\)/gi;
const BARE_URL = /(?<![(\w])https?:\/\/(?:www\.)?luckydomains\.io[^\s)\]]*/gi;

/** Pick the allowed page closest to a requested Lucky Domains URL, falling back on the tags. */
export function normalizeLuckyDomainsUrl(url: string, tags: readonly string[]): string {
  const u = url.trim().replace(/\/$/, '');
  const hit = LD_ALLOWED_URLS.find((a) => a.toLowerCase() === u.toLowerCase());
  if (hit) return hit;
  const lower = u.toLowerCase();
  if (lower.includes('how-we-buy')) return LD_ALLOWED_URLS[0];
  if (lower.includes('#selling')) return LD_ALLOWED_URLS[2];
  if (lower.includes('#websites')) return LD_ALLOWED_URLS[3];
  if (lower.includes('#seo')) return LD_ALLOWED_URLS[4];
  if (lower.includes('#domains')) return LD_ALLOWED_URLS[1];
  if (tags.includes('domains')) return LD_ALLOWED_URLS[1];
  if (tags.includes('website-builds')) return LD_ALLOWED_URLS[3];
  if (tags.includes('seo') || tags.includes('ai-search') || tags.includes('content-strategy')) return LD_ALLOWED_URLS[4];
  return LD_ALLOWED_URLS[1];
}

export const qualifiesForLuckyDomainsLink = (tags: readonly string[]): boolean =>
  tags.some((t) => (LD_QUALIFYING_TAGS as readonly string[]).includes(t));

/** Apply the guardrails to a markdown/MDX body. Pure; returns the governed body. */
export function governLuckyDomainsLinks(body: string, tags: readonly string[]): string {
  const allowed = qualifiesForLuckyDomainsLink(tags);
  let kept = 0;
  let out = body.replace(MD_LINK, (_m, text: string, url: string) => {
    if (!allowed) return text;
    if (kept >= 1) return text;
    kept += 1;
    return `[${text}](${normalizeLuckyDomainsUrl(url, tags)})`;
  });
  out = out.replace(BARE_URL, (m) => (LD_HOST.test(m) ? '' : m)).replace(/ {2,}/g, ' ').replace(/ \./g, '.');
  return out;
}
