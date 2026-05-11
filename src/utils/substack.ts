import { XMLParser } from 'fast-xml-parser';

export interface SubstackPost {
  title: string;
  link: string;
  pubDate: Date;
  description: string;
}

const FETCH_TIMEOUT_MS = 5000;

// Only accept hrefs we are willing to put behind a user-clickable <a> on the
// homepage: HTTPS, and pointing at Substack itself or our own newsletter
// domains. Anything else is rejected (the post is dropped with a warning).
function isAllowedLink(link: string): boolean {
  try {
    const u = new URL(link);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return (
      host === 'kenashe.ai' ||
      host === 'newsletter.kenashe.ai' ||
      host.endsWith('.substack.com')
    );
  } catch {
    return false;
  }
}

// Strip HTML tags from a string. The result MUST only be rendered as plain
// text (e.g. `{value}` interpolation in Astro), never via `set:html`. We
// intentionally do NOT decode HTML entities here — decoding `&lt;script&gt;`
// after tag-stripping would reintroduce literal markup. Leaving entities
// encoded keeps the output safe under Astro's default HTML escaping; the
// cost is that legitimate entities (`&amp;`, etc.) display verbatim.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchLatestSubstackPosts(
  url: string,
  limit = 3,
): Promise<SubstackPost[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'kenashe.ai build/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: false,
      trimValues: true,
    });
    const data = parser.parse(xml) as {
      rss?: { channel?: { item?: unknown } };
    };

    const raw = data?.rss?.channel?.item;
    if (!raw) return [];
    const items = (Array.isArray(raw) ? raw : [raw]) as Array<{
      title?: string;
      link?: string;
      pubDate?: string;
      description?: string;
    }>;

    return items
      .map((item) => {
        const title = stripHtml(String(item.title ?? ''));
        const link = String(item.link ?? '').trim();
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date(NaN);
        const description = stripHtml(String(item.description ?? ''));
        return { title, link, pubDate, description };
      })
      .filter((p) => {
        if (!p.title || Number.isNaN(p.pubDate.valueOf())) return false;
        if (!isAllowedLink(p.link)) {
          console.warn('[substack] rejecting post with invalid link:', p.link);
          return false;
        }
        return true;
      })
      .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf())
      .slice(0, limit);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[substack] Failed to fetch RSS from ${url}: ${reason}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
