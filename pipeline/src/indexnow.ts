// IndexNow: push changed URLs to Bing (and Yandex, Naver, Seznam) instead of waiting for a
// crawl. Matters here because the site publishes ~10 posts a day, and Bing's index is what
// Copilot retrieves from.
//
// The key is PUBLIC by design: search engines verify ownership by fetching
// https://kenashe.ai/<key>.txt and checking it contains the key. It is not a secret.
// It MUST stay in sync with the file public/<key>.txt in the site (filename AND contents).
// Rotating the key means changing both, in one commit.
export const INDEXNOW_KEY = '5b1830e9bdd555a19ea4e49cd174dcad';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000; // per IndexNow spec

export function keyLocation(siteUrl: string): string {
  return new URL(`/${INDEXNOW_KEY}.txt`, siteUrl).toString();
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

// De-duplicates, drops anything off-host (IndexNow rejects a mixed-host payload) and caps
// at the spec limit.
export function buildPayload(siteUrl: string, urls: string[]): IndexNowPayload {
  const host = new URL(siteUrl).host;
  const sameHost = urls.filter((u) => {
    try { return new URL(u).host === host; } catch { return false; }
  });
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: keyLocation(siteUrl),
    urlList: [...new Set(sameHost)].slice(0, MAX_URLS),
  };
}

// The URLs a run changed: each new post, plus the two pages that list them.
export function changedUrls(siteUrl: string, slugs: string[]): string[] {
  return [
    ...slugs.map((s) => new URL(`/blog/${s}/`, siteUrl).toString()),
    new URL('/blog/', siteUrl).toString(),
    new URL('/', siteUrl).toString(),
  ];
}

// Don't tell crawlers to fetch a page that isn't deployed yet: a Vercel build takes ~8-15
// minutes at this post count, so submitting straight after the commit would point them at
// a 404. Poll one representative URL (they all ship in the same build) until it serves 200.
export async function waitUntilLive(
  url: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 12 * 60_000;
  const intervalMs = opts.intervalMs ?? 20_000;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const r = await fetch(url, { method: 'HEAD', headers: { 'user-agent': 'kenashe-pipeline/1.0' } });
      if (r.ok) return true;
    } catch { /* network blip: keep waiting */ }
    if (Date.now() + intervalMs >= deadline) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export async function submit(
  siteUrl: string,
  urls: string[],
): Promise<{ ok: boolean; status: number; count: number }> {
  const payload = buildPayload(siteUrl, urls);
  if (payload.urlList.length === 0) return { ok: true, status: 0, count: 0 };
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return { ok: r.ok, status: r.status, count: payload.urlList.length };
}

// Wait for the deploy, then submit. Submits even if the wait times out: deploys always land
// eventually and IndexNow crawls are "minutes to hours", so a slightly-late page is fine,
// whereas skipping means those posts wait for an organic crawl. Never throws - a failed
// ping must not fail a run that already published successfully.
export async function announce(siteUrl: string, slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const urls = changedUrls(siteUrl, slugs);
  try {
    const live = await waitUntilLive(urls[0]);
    const res = await submit(siteUrl, urls);
    console.log(`[indexnow] deploy-live=${live} submitted=${res.count} status=${res.status} ok=${res.ok}`);
  } catch (e) {
    console.warn(`[indexnow] skipped: ${(e as Error).message}`);
  }
}
