// CLI: run the frozen visibility query set and write measurement/results/<month>.json
// plus a row in measurement/history.md.
//
//   EXA_API_KEY=... npm run visibility             # writes this month's report
//   EXA_API_KEY=... npm run visibility -- --dry    # calls the API, prints, writes nothing
//   EXA_API_KEY=... npm run visibility -- --force  # overwrite an existing month's report
//
// Rate-limit friendly: queries run sequentially with a small pause. A query that errors is
// recorded as rank null with a note rather than aborting the whole month.
import fs from 'node:fs';
import path from 'node:path';
import {
  loadQueries, exaSearch, scoreQuery, summarize, recurringDomains, writeReport, appendHistory,
  type MonthReport, type QueryResult,
} from './visibility.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error('EXA_API_KEY is required (https://dashboard.exa.ai — free tier is enough for 12 queries a month)');

  const { version, numResults, queries } = loadQueries(repoRoot);
  const results: QueryResult[] = [];
  const errors: string[] = [];
  for (const spec of queries) {
    try {
      const urls = await exaSearch(spec.query, numResults, apiKey);
      results.push(scoreQuery(spec, urls));
    } catch (e) {
      errors.push(`q${spec.id}: ${(e as Error).message}`);
      results.push({ id: spec.id, beachhead: spec.beachhead, rank: null, url: null, top3: [] });
    }
    await sleep(400);
  }

  const now = new Date();
  const { found, bestRank } = summarize(results);
  const report: MonthReport = {
    month: now.toISOString().slice(0, 7),
    measuredAt: now.toISOString().slice(0, 10),
    engine: 'exa',
    queriesVersion: version,
    numResults,
    found,
    queryCount: queries.length,
    bestRank,
    results,
    notes: errors.length ? `errors: ${errors.join('; ')}` : undefined,
  };

  console.log(`[visibility] ${report.month}: found ${found}/${queries.length}, best rank ${bestRank ?? '—'}`);
  console.log('[visibility] who owns these queries:', recurringDomains(results).map((d) => `${d.host}(${d.count})`).join(' '));
  for (const r of results.filter((x) => x.rank !== null)) {
    console.log(`[visibility]   hit q${r.id} (${r.beachhead}) rank ${r.rank} -> ${r.url}`);
  }
  if (errors.length) console.warn('[visibility] errors:', errors.join('; '));

  if (dry) { console.log('[visibility] --dry: nothing written'); return; }
  // Don't silently replace a month that already has a report — the 2026-08 baseline carries
  // hand-written analysis that a bare re-run would erase. Re-running a month is legitimate,
  // it just has to be deliberate.
  const existing = path.join(repoRoot, 'measurement/results', `${report.month}.json`);
  if (fs.existsSync(existing) && !process.argv.includes('--force')) {
    console.warn(`[visibility] ${report.month} already recorded (${existing}); not overwriting. Re-run with --force if that is what you want.`);
    return;
  }
  console.log('[visibility] wrote', writeReport(repoRoot, report));
  appendHistory(repoRoot, report);
  console.log('[visibility] updated measurement/history.md');
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
