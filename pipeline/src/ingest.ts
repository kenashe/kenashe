// Source connectors. Each returns normalized Item[]; ingest() de-dups by source id
// against the store (exact-dup guard) so nothing is processed twice.
import { XMLParser } from 'fast-xml-parser';
import type { Item, SourceConfig } from './types.ts';
import type { Store } from './store.ts';

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const iso = (d?: string) => { const t = d ? Date.parse(d) : NaN; return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString(); };
const strip = (s: unknown) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const arr = <T>(x: T | T[] | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

async function getText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'user-agent': 'kenashe-pipeline/1.0' } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}
async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const r = await fetch(url, { headers: { 'user-agent': 'kenashe-pipeline/1.0', ...headers } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

function base(src: SourceConfig, extra: Partial<Item>): Item {
  return { source: src.name, sourceType: src.type, tier: src.tier, weight: src.weight, id: '', url: '', title: '', text: '', publishedAt: new Date().toISOString(), ...extra };
}

async function rss(src: SourceConfig): Promise<Item[]> {
  const feed = xml.parse(await getText(String(src.url)));
  const items = arr<any>(feed?.rss?.channel?.item ?? feed?.feed?.entry);
  return items.slice(0, 15).map((it) => {
    const link = typeof it.link === 'string' ? it.link : it.link?.['@_href'] ?? '';
    return base(src, { id: strip(it.guid?.['#text'] ?? it.guid ?? it.id ?? link), url: link, title: strip(it.title?.['#text'] ?? it.title), text: strip(it['content:encoded'] ?? it.description ?? it.summary ?? it.content), publishedAt: iso(it.pubDate ?? it.published ?? it.updated) });
  });
}

async function youtube(src: SourceConfig): Promise<Item[]> {
  const feed = xml.parse(await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${src.channelId}`));
  const entries = arr<any>(feed?.feed?.entry).slice(0, 3);
  const out: Item[] = [];
  for (const e of entries) {
    const vid = e['yt:videoId'];
    let transcript = strip(e['media:group']?.['media:description']);
    try {
      if (process.env.SUPADATA_API_KEY) {
        const t = await getJson(`https://api.supadata.ai/v1/youtube/transcript?videoId=${vid}&text=true`, { 'x-api-key': process.env.SUPADATA_API_KEY });
        transcript = strip(t.content ?? t.text ?? transcript);
      }
    } catch { /* fall back to description */ }
    out.push(base(src, { id: `yt:${vid}`, url: `https://www.youtube.com/watch?v=${vid}`, title: strip(e.title), text: transcript, publishedAt: iso(e.published) }));
  }
  return out;
}

async function arxiv(src: SourceConfig): Promise<Item[]> {
  const feed = xml.parse(await getText(`http://export.arxiv.org/api/query?search_query=${encodeURIComponent(String(src.query))}&sortBy=submittedDate&sortOrder=descending&max_results=15`));
  return arr<any>(feed?.feed?.entry).map((e) => base(src, { id: strip(e.id), url: strip(e.id), title: strip(e.title), text: strip(e.summary), publishedAt: iso(e.published) }));
}

async function hackernews(src: SourceConfig): Promise<Item[]> {
  const j = await getJson(`https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points>${src.minPoints ?? 150}&hitsPerPage=40`);
  const kws = (src.keywords as string[] | undefined)?.map((k) => k.toLowerCase()) ?? [];
  return (j.hits as any[])
    .filter((h) => h.title && (kws.length === 0 || kws.some((k) => h.title.toLowerCase().includes(k))))
    .slice(0, 15)
    .map((h) => base(src, { id: `hn:${h.objectID}`, url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`, title: strip(h.title), text: strip(h.story_text ?? h.title), publishedAt: iso(h.created_at) }));
}

// TODO(prod): implement. github via GET /repos/{r}/releases; reddit via /r/{sub}/top.json
async function githubReleases(_src: SourceConfig): Promise<Item[]> { return []; }
async function reddit(_src: SourceConfig): Promise<Item[]> { return []; }

const CONNECTORS: Record<string, (s: SourceConfig) => Promise<Item[]>> = {
  rss, youtube, arxiv, hackernews, github_releases: githubReleases, reddit,
};

export async function ingest(sources: SourceConfig[], store: Store): Promise<Item[]> {
  const all: Item[] = [];
  for (const src of sources) {
    try {
      const items = await CONNECTORS[src.type]?.(src) ?? [];
      all.push(...items.filter((i) => i.id && i.title));
    } catch (e) { console.warn(`[ingest] ${src.name}: ${(e as Error).message}`); }
  }
  const unseen = new Set(await store.filterUnseen(all.map((i) => i.id)));
  const fresh = all.filter((i) => unseen.has(i.id));
  await store.markSeen(fresh.map((i) => i.id));
  return fresh;
}
