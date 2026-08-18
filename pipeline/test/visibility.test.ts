// Visibility scoring. The trend is only meaningful if scoring is stable, so the rank
// extraction and the frozen query set are both pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  host, rankOf, scoreQuery, summarize, recurringDomains, historyRow, appendHistory, loadQueries,
  type QueryResult, type MonthReport,
} from '../src/visibility.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../');
const spec = { id: 6, beachhead: 'marketing_ops', query: 'q' };

test('host strips www and tolerates junk', () => {
  assert.equal(host('https://www.kenashe.ai/blog/x/'), 'kenashe.ai');
  assert.equal(host('https://kenashe.ai/blog/x/'), 'kenashe.ai');
  assert.equal(host('not-a-url'), '');
});

test('rankOf is 1-based and null when absent', () => {
  assert.equal(rankOf(['https://a.com/', 'https://kenashe.ai/x/']), 2);
  assert.equal(rankOf(['https://kenashe.ai/x/']), 1);
  assert.equal(rankOf(['https://a.com/', 'https://b.com/']), null);
  assert.equal(rankOf([]), null);
});

test('rankOf does not match a lookalike host', () => {
  assert.equal(rankOf(['https://kenashe.ai.evil.com/', 'https://notkenashe.ai/']), null);
});

test('scoreQuery records the matching url and the top three hosts', () => {
  const r = scoreQuery(spec, ['https://a.com/1', 'https://kenashe.ai/blog/x/', 'https://c.com/3', 'https://d.com/4']);
  assert.equal(r.rank, 2);
  assert.equal(r.url, 'https://kenashe.ai/blog/x/');
  assert.deepEqual(r.top3, ['a.com', 'kenashe.ai', 'c.com']);
});

test('summarize counts hits and the best rank', () => {
  const rs = [{ rank: null }, { rank: 7 }, { rank: 2 }] as QueryResult[];
  assert.deepEqual(summarize(rs), { found: 2, bestRank: 2 });
  assert.deepEqual(summarize([{ rank: null }] as QueryResult[]), { found: 0, bestRank: null });
});

test('recurringDomains ranks by frequency then name', () => {
  const rs = [
    { top3: ['a.com', 'b.com', 'c.com'] },
    { top3: ['b.com', 'c.com', 'd.com'] },
    { top3: ['b.com', '', 'c.com'] },
  ] as QueryResult[];
  const top = recurringDomains(rs, 3);
  assert.deepEqual(top[0], { host: 'b.com', count: 3 });
  assert.deepEqual(top[1], { host: 'c.com', count: 3 });
  assert.ok(!top.some((t) => t.host === ''), 'blank hosts excluded');
});

const report = (over: Partial<MonthReport> = {}): MonthReport => ({
  month: '2026-09', measuredAt: '2026-09-01', engine: 'exa', queriesVersion: 1, numResults: 25,
  found: 3, queryCount: 12, bestRank: 2, results: [], ...over,
});

test('historyRow renders a percentage and escapes pipes in notes', () => {
  const row = historyRow(report({ notes: 'a | b' }));
  assert.match(row, /^\| 2026-09 \| 3\/12 \(25%\) \| 2 \| exa \|/);
  assert.ok(!row.slice(row.indexOf('exa')).includes(' | b'), 'pipes in notes must not break the table');
});

test('historyRow shows an em dash when nothing ranked', () => {
  assert.match(historyRow(report({ found: 0, bestRank: null })), /\| 0\/12 \(0%\) \| — \|/);
});

test('appendHistory adds a row, then replaces it on a re-run of the same month', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vis-'));
  fs.mkdirSync(path.join(root, 'measurement'), { recursive: true });
  const file = path.join(root, 'measurement/history.md');
  fs.writeFileSync(file, '| Month | Found | Best | Engine | Notes |\n|---|---|---|---|---|\n');

  appendHistory(root, report({ found: 3 }));
  assert.equal((fs.readFileSync(file, 'utf8').match(/^\| 2026-09 \|/gm) ?? []).length, 1);

  appendHistory(root, report({ found: 5 }));           // same month again
  const body = fs.readFileSync(file, 'utf8');
  assert.equal((body.match(/^\| 2026-09 \|/gm) ?? []).length, 1, 'must replace, not duplicate');
  assert.ok(body.includes('5/12'), 'row updated to the newer numbers');
  fs.rmSync(root, { recursive: true, force: true });
});

// The trend is worthless if the query set drifts, so pin it.
test('the frozen query set is intact: 12 unbranded queries across four beachheads', () => {
  const q = loadQueries(repoRoot);
  assert.equal(q.queries.length, 12);
  assert.equal(q.numResults, 25);
  const beach = new Set(q.queries.map((x) => x.beachhead));
  assert.deepEqual([...beach].sort(), ['agents_evals', 'building_with_ai', 'digital_assets', 'marketing_ops']);
  assert.deepEqual(q.queries.map((x) => x.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'ids must be stable');
  for (const x of q.queries) {
    assert.ok(!/ken\s*ashe|kenashe/i.test(x.query), `query ${x.id} must stay unbranded: ${x.query}`);
  }
});

test('the baseline report parses and matches its own summary', () => {
  const p = path.join(repoRoot, 'measurement/results/2026-08.json');
  const r = JSON.parse(fs.readFileSync(p, 'utf8')) as MonthReport;
  assert.equal(r.results.length, r.queryCount);
  const { found, bestRank } = summarize(r.results);
  assert.equal(found, r.found, 'stored `found` must match the results array');
  assert.equal(bestRank, r.bestRank, 'stored `bestRank` must match the results array');
});
