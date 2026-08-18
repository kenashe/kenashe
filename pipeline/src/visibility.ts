// Answer-engine visibility check: do UNBRANDED topical queries surface kenashe.ai?
//
// This is the falsification loop for the whole discoverability effort (hubs, entity graph,
// citations, related links, llms.txt, IndexNow). Without it there is no way to tell whether
// any of that compounded. Results are committed to measurement/results/<month>.json so the
// trend lives in git, not in a chat log or a SaaS dashboard.
//
// What it does NOT measure: AI-assistant referral traffic (that is the Vercel Analytics
// referrers panel - bots do not run client-side JS, so it cannot be automated here), and
// not Google/Bing rank. Exa is a retrieval engine over a web index, which is the closest
// automatable proxy for "would an answer engine pick this page".
import fs from 'node:fs';
import path from 'node:path';

export interface QuerySpec { id: number; beachhead: string; query: string }
export interface QueryFile { version: number; numResults: number; queries: QuerySpec[] }
export interface QueryResult {
  id: number;
  beachhead: string;
  rank: number | null;
  url: string | null;
  top3: string[];
}
export interface MonthReport {
  month: string;
  measuredAt: string;
  engine: 'exa';
  queriesVersion: number;
  numResults: number;
  found: number;
  queryCount: number;
  bestRank: number | null;
  results: QueryResult[];
  notes?: string;
}

const SITE_HOST = 'kenashe.ai';

/** Hostname without a leading www., or '' when the URL is unparseable. */
export function host(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
}

/** 1-based rank of the first result on the target host, or null if absent. */
export function rankOf(urls: string[], targetHost = SITE_HOST): number | null {
  const i = urls.findIndex((u) => host(u) === targetHost);
  return i === -1 ? null : i + 1;
}

export function scoreQuery(spec: QuerySpec, urls: string[], targetHost = SITE_HOST): QueryResult {
  const rank = rankOf(urls, targetHost);
  return {
    id: spec.id,
    beachhead: spec.beachhead,
    rank,
    url: rank === null ? null : urls[rank - 1],
    top3: urls.slice(0, 3).map(host),
  };
}

export function summarize(results: QueryResult[]): { found: number; bestRank: number | null } {
  const ranks = results.map((r) => r.rank).filter((r): r is number => r !== null);
  return { found: ranks.length, bestRank: ranks.length ? Math.min(...ranks) : null };
}

/** Hostnames seen most often across the top-3 lists - i.e. who currently owns these queries. */
export function recurringDomains(results: QueryResult[], top = 5): { host: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of results) for (const h of r.top3) if (h) counts.set(h, (counts.get(h) ?? 0) + 1);
  return [...counts.entries()]
    .map(([h, count]) => ({ host: h, count }))
    .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host))
    .slice(0, top);
}

/** One markdown row for measurement/history.md. */
export function historyRow(r: MonthReport): string {
  const pct = Math.round((r.found / r.queryCount) * 100);
  return `| ${r.month} | ${r.found}/${r.queryCount} (${pct}%) | ${r.bestRank ?? '—'} | ${r.engine} | ${(r.notes ?? '').replace(/\|/g, '/').slice(0, 120)} |`;
}

// --- Exa search (plain fetch; no SDK so this stays dependency-free) ---
export async function exaSearch(query: string, numResults: number, apiKey: string): Promise<string[]> {
  const r = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query, numResults, type: 'auto' }),
  });
  if (!r.ok) throw new Error(`exa ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { results?: { url?: string }[] };
  return (j.results ?? []).map((x) => x.url ?? '').filter(Boolean);
}

export function loadQueries(root: string): QueryFile {
  return JSON.parse(fs.readFileSync(path.join(root, 'measurement/queries.json'), 'utf8')) as QueryFile;
}

export function writeReport(root: string, report: MonthReport): string {
  const dir = path.join(root, 'measurement/results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${report.month}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return file;
}

/** Append a row to history.md, replacing an existing row for the same month. */
export function appendHistory(root: string, report: MonthReport): void {
  const file = path.join(root, 'measurement/history.md');
  const row = historyRow(report);
  let body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const existing = new RegExp(`^\\| ${report.month} \\|.*$`, 'm');
  body = existing.test(body) ? body.replace(existing, row) : `${body.replace(/\s*$/, '')}\n${row}\n`;
  fs.writeFileSync(file, body);
}
