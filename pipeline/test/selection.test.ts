// Selection, ranking and deep-dive rotation. These rules are load-bearing and were each
// added in response to a real failure — see DECISIONS.md D7, D8, D11, D12.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  hasPrimary, inSources, withCanonicalTags, storyBeachhead, groupByBeachhead,
  chooseBeachhead, lastPillarByBeachhead, isoWeek, rankScore, pickReserved,
  DA_DOMAINS, MK_SOURCES,
} from '../src/selection.ts';
import type { Item, Story } from '../src/types.ts';

const item = (over: Partial<Item> = {}): Item => ({
  id: Math.random().toString(36), source: 'arXiv cs.AI', sourceType: 'arxiv', tier: 1,
  weight: 0.7, url: 'u', title: '', text: '', publishedAt: '2026-08-09T00:00:00Z', ...over,
});
const story = (key: string, items: Partial<Item>[], score = 1): Story =>
  ({ key, items: items.map((i) => item(i)), vec: [], score, tier: 'note' });

// --- D7: only primary sources may anchor a pillar ---
test('hasPrimary accepts tier-1 and flagged trade newsrooms', () => {
  assert.equal(hasPrimary(story('a', [{ tier: 1 }])), true);
  assert.equal(hasPrimary(story('b', [{ tier: 2, primary: true, source: 'Domain Name Wire' }])), true);
});

test('hasPrimary rejects commentary no matter how many corroborate', () => {
  // The rumour pillar this rule blocks was covered by four YouTube channels.
  const commentary = story('c', Array.from({ length: 4 }, () => ({ tier: 2 as const, primary: false, sourceType: 'youtube' as const })));
  assert.equal(hasPrimary(commentary), false);
  assert.equal(hasPrimary(story('d', [{ tier: 2, primary: false, source: 'Decrypt' }])), false);
});

test('inSources matches by exact source name', () => {
  assert.equal(inSources(story('a', [{ source: 'Domain Name Wire' }]), DA_DOMAINS), true);
  assert.equal(inSources(story('b', [{ source: 'domain name wire' }]), DA_DOMAINS), false);
});

test('withCanonicalTags adds hub tags without dropping the originals', () => {
  assert.deepEqual(withCanonicalTags(['agentic']), ['agentic', 'ai-agents']);
  assert.deepEqual(withCanonicalTags(['evaluation']), ['evaluation', 'evals']);
  assert.deepEqual(withCanonicalTags(['rag']), ['rag']);
  assert.deepEqual(withCanonicalTags(['ai-agents']), ['ai-agents'], 'already canonical -> unchanged');
});

test('storyBeachhead prefers source match for digital assets, else keywords', () => {
  assert.equal(storyBeachhead(story('a', [{ source: 'CoinDesk', title: 'AI tokens' }])), 'digital-assets');
  assert.equal(storyBeachhead(story('b', [{ title: 'A new agent benchmark for tool use' }])), 'ai-agents');
  assert.equal(storyBeachhead(story('c', [{ title: 'PPC and attribution in martech' }])), 'marketing-ops');
  assert.equal(storyBeachhead(story('d', [{ title: 'A poem about the sea' }])), null);
});

// --- D8 / D11 / D12: eligibility, LRU fallback, and skipping ---
test('chooseBeachhead takes the rotation slot when it is eligible', () => {
  const byBh = groupByBeachhead([
    story('a', [{ title: 'agent benchmark', tier: 1 }]),
    story('b', [{ title: 'agentic tool use', tier: 1 }]),
  ]);
  assert.equal(chooseBeachhead(byBh, { rotate: 'ai-agents', minStories: 2, lastPillar: new Map() }), 'ai-agents');
});

test('chooseBeachhead rejects a beachhead with stories but no primary', () => {
  const byBh = new Map([['digital-assets', [
    story('a', [{ tier: 2, primary: false }]), story('b', [{ tier: 2, primary: false }]),
  ]]]);
  assert.equal(chooseBeachhead(byBh, { rotate: 'digital-assets', minStories: 2, lastPillar: new Map() }), '');
});

test('chooseBeachhead falls back to least-recently-covered, not biggest', () => {
  const big = Array.from({ length: 30 }, (_, i) => story('x' + i, [{ tier: 1 }]));
  const small = [story('y1', [{ tier: 1 }]), story('y2', [{ tier: 1 }])];
  const byBh = new Map([['ai-agents', big], ['digital-assets', small]]);
  const lastPillar = new Map([['ai-agents', '2026-08-04'], ['digital-assets', '2026-06-01']]);
  assert.equal(
    chooseBeachhead(byBh, { rotate: 'marketing-ops', minStories: 2, lastPillar }),
    'digital-assets',
  );
});

test('chooseBeachhead prefers a never-covered beachhead over any covered one', () => {
  const byBh = new Map([
    ['ai-agents', [story('a', [{ tier: 1 }]), story('b', [{ tier: 1 }])]],
    ['marketing-ops', [story('c', [{ tier: 1 }]), story('d', [{ tier: 1 }])]],
  ]);
  const lastPillar = new Map([['ai-agents', '2026-08-04']]);
  assert.equal(chooseBeachhead(byBh, { rotate: 'building-with-ai', minStories: 2, lastPillar }), 'marketing-ops');
});

test('chooseBeachhead returns empty when nothing qualifies', () => {
  assert.equal(chooseBeachhead(new Map(), { rotate: 'ai-agents', minStories: 2, lastPillar: new Map() }), '');
});

test('lastPillarByBeachhead reads dates from pillar frontmatter only', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pillars-'));
  const dir = path.join(root, 'src/content/blog');
  fs.mkdirSync(dir, { recursive: true });
  const post = (name: string, tags: string) => fs.writeFileSync(path.join(dir, name), `---\ntitle: "x"\ntags: [${tags}]\ndraft: false\n---\n\nbody\n`);
  post('2026-07-28-a.mdx', '"ai-agents", "deep-dive"');
  post('2026-08-04-b.mdx', '"ai-agents", "deep-dive"');   // newer wins
  post('2026-06-01-c.mdx', '"digital-assets", "deep-dive"');
  post('2026-08-05-d.mdx', '"marketing-ops"');            // not a pillar
  fs.writeFileSync(path.join(dir, '2026-08-06-e.mdx'), '---\ntitle: "x"\ntags: ["marketing-ops"]\n---\n\nmentions deep-dive in the body\n');

  const last = lastPillarByBeachhead(root);
  assert.equal(last.get('ai-agents'), '2026-08-04');
  assert.equal(last.get('digital-assets'), '2026-06-01');
  assert.equal(last.has('marketing-ops'), false, 'body mentions must not count');
  fs.rmSync(root, { recursive: true, force: true });
});

test('lastPillarByBeachhead tolerates a missing directory', () => {
  assert.equal(lastPillarByBeachhead('/nonexistent-path-xyz').size, 0);
});

test('isoWeek is deterministic and 1-53', () => {
  assert.equal(isoWeek(new Date('2026-01-05T00:00:00Z')), 2);
  const w = isoWeek(new Date('2026-08-04T00:00:00Z'));
  assert.ok(w >= 1 && w <= 53);
  assert.equal(w, isoWeek(new Date('2026-08-04T23:59:00Z')), 'time of day must not matter');
});

test('rankScore rewards tier-1 and corroboration, capped at 5 items', () => {
  assert.equal(rankScore([item({ weight: 1, tier: 1 })]), 1 + 0.5 + 0.15);
  assert.equal(rankScore([item({ weight: 1, tier: 2 })]), 1 + 0.15);
  const six = Array.from({ length: 6 }, () => item({ weight: 0, tier: 2 }));
  assert.equal(rankScore(six), 5 * 0.15, 'corroboration caps at 5');
});

// --- D8: reserved slots ---
test('pickReserved reserves top domains, crypto and marketing stories', () => {
  const pool = [
    story('ai1', [{ source: 'arXiv cs.AI' }]),
    story('dnw', [{ source: 'Domain Name Wire' }]),
    story('dec', [{ source: 'Decrypt' }]),
    story('mk1', [{ source: 'Marketing AI Institute' }]),
    story('mk2', [{ source: 'Martech' }]),
  ];
  const r = pickReserved(pool);
  assert.equal(r.domainPick?.key, 'dnw');
  assert.equal(r.cryptoPick?.key, 'dec');
  assert.equal(r.mkPick?.key, 'mk1', 'first (highest-ranked) marketing story');
  assert.equal(r.reserved.length, 3);
  assert.equal(r.reservedKeys.size, 3);
});

test('pickReserved never double-books one story across slots', () => {
  // A source in both a DA set and MK_SOURCES would otherwise be picked twice.
  const pool = [story('dual', [{ source: 'Domain Name Wire' }, { source: 'Martech' }])];
  const r = pickReserved(pool);
  assert.equal(r.reserved.length, 1);
  assert.equal(r.mkPick, undefined);
});

test('pickReserved returns nothing when no beachhead story exists', () => {
  const r = pickReserved([story('a', [{ source: 'arXiv cs.AI' }])]);
  assert.deepEqual(r.reserved, []);
  assert.equal(r.reservedKeys.size, 0);
});

test('daily budget stays flat: reserved slots come out of the notes budget', () => {
  const flagships = 3, notesMax = 7;
  const pool = [
    ...Array.from({ length: 20 }, (_, i) => story('ai' + i, [{ source: 'arXiv cs.AI' }])),
    story('dnw', [{ source: 'Domain Name Wire' }]),
    story('dec', [{ source: 'Decrypt' }]),
    story('mk', [{ source: 'Martech' }]),
  ];
  const { reserved, reservedKeys } = pickReserved(pool);
  const rest = pool.filter((s) => !reservedKeys.has(s.key));
  const notesRoom = Math.max(0, notesMax - reserved.length);
  const selected = [...rest.slice(0, flagships), ...rest.slice(flagships, flagships + notesRoom), ...reserved];
  assert.equal(selected.length, flagships + notesMax);
  assert.equal(new Set(selected.map((s) => s.key)).size, selected.length, 'no duplicates');
});

test('with no marketing story the notes budget reclaims the slot', () => {
  const pool = Array.from({ length: 20 }, (_, i) => story('ai' + i, [{ source: 'arXiv cs.AI' }]));
  const { reserved } = pickReserved(pool);
  assert.equal(Math.max(0, 7 - reserved.length), 7);
});
