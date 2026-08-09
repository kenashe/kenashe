// Dedup/clustering core, related-post linking, and Wikidata entity detection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LexicalEmbedder, cluster, isCovered, tokenize, cosine as coreCosine } from '../src/core.ts';
import { cosine, computeRelated } from '../src/related.ts';
import { detectEntities } from '../src/entities.ts';

const unit = (v: number[]) => v;

// --- related.ts ---
test('cosine handles dense vectors', () => {
  assert.equal(cosine(unit([1, 0]), unit([1, 0])), 1);
  assert.equal(cosine(unit([1, 0]), unit([0, 1])), 0);
  assert.ok(Math.abs(cosine(unit([1, 1]), unit([1, 0])) - Math.SQRT1_2) < 1e-9);
});

test('cosine handles sparse maps and mismatched forms', () => {
  const a = new Map([['x', 1]]);
  assert.equal(cosine(a, new Map([['x', 1]])), 1);
  assert.equal(cosine(a, new Map([['y', 1]])), 0);
  assert.equal(cosine(a, unit([1, 0])), 0, 'mismatched forms score 0, never throw');
  assert.equal(cosine(unit([0, 0]), unit([1, 0])), 0, 'zero vector must not divide by zero');
});

test('computeRelated excludes self, honours the floor, and caps at k', () => {
  const e = [
    { slug: 'a', title: 'A', vec: unit([1, 0, 0]) },
    { slug: 'b', title: 'B', vec: unit([0.99, 0.1, 0]) },
    { slug: 'c', title: 'C', vec: unit([0.9, 0.4, 0]) },
    { slug: 'd', title: 'D', vec: unit([0, 0, 1]) },
  ];
  const map = computeRelated(e, 5, 0.4);
  assert.ok(!map.a.some((r) => r.slug === 'a'), 'never relates to itself');
  assert.deepEqual(map.a.map((r) => r.slug), ['b', 'c'], 'ordered by similarity, d below floor');
  assert.deepEqual(map.d, [], 'no weak links is valid');
  assert.equal(computeRelated(e, 1, 0.4).a.length, 1, 'respects k');
});

test('computeRelated raising the floor drops weak links', () => {
  const e = [
    { slug: 'a', title: 'A', vec: unit([1, 0]) },
    { slug: 'b', title: 'B', vec: unit([0.6, 0.8]) }, // cos = 0.6
  ];
  assert.equal(computeRelated(e, 5, 0.4).a.length, 1);
  assert.equal(computeRelated(e, 5, 0.7).a.length, 0);
});

// --- core.ts: the dedup engine ---
test('tokenize lowercases and drops punctuation', () => {
  const t = tokenize('Agents, Evals & GPT-5!');
  assert.ok(t.includes('agents') && t.includes('evals'));
  assert.ok(!t.join(' ').includes(','));
});

test('cluster groups similar items and separates dissimilar ones', () => {
  const items = [
    { vec: unit([1, 0]) }, { vec: unit([0.99, 0.14]) }, { vec: unit([0, 1]) },
  ];
  const groups = cluster(items, 0.9);
  assert.equal(groups.length, 2);
  assert.equal(groups.find((g) => g.length === 2)?.length, 2);
});

test('cluster with an impossible threshold keeps every item separate', () => {
  const items = [{ vec: unit([1, 0]) }, { vec: unit([1, 0]) }];
  assert.equal(cluster(items, 1.1).length, 2);
});

test('isCovered flags a near-duplicate and passes a novel story', () => {
  const memory = [{ vec: unit([1, 0]) }];
  const dup = isCovered(unit([0.99, 0.05]), memory, 0.82);
  assert.equal(dup.covered, true);
  assert.ok(dup.sim > 0.82);
  assert.equal(isCovered(unit([0, 1]), memory, 0.82).covered, false);
});

test('isCovered against empty memory is never covered', () => {
  assert.equal(isCovered(unit([1, 0]), [], 0.82).covered, false);
});

test('LexicalEmbedder produces comparable vectors without any API key', () => {
  const emb = new LexicalEmbedder();
  emb.fit(['ai agents and evals', 'a recipe for bread']);
  const a = emb.embed('ai agents and evals', 'agents');
  const b = emb.embed('ai agents and evals', 'agents');
  const c = emb.embed('a recipe for bread', 'bread');
  assert.ok(coreCosine(a, b) > coreCosine(a, c), 'same text must be closer than unrelated text');
});

// --- entities.ts: schema.org `mentions` grounding ---
test('detectEntities finds named orgs and products with Wikidata links', () => {
  const found = detectEntities('OpenAI and Anthropic shipped; Claude and ChatGPT compete. See arXiv.');
  const names = found.map((e) => e.name);
  assert.ok(['OpenAI', 'Anthropic', 'Claude', 'ChatGPT', 'arXiv'].every((n) => names.includes(n)));
  assert.ok(found.every((e) => /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(e.sameAs)));
});

test('detectEntities does not false-positive on Meta-like words', () => {
  // "Meta AI" is an entity; bare "meta" words must never match.
  assert.deepEqual(detectEntities('A post about metadata, meta-analysis and the metaverse.'), []);
  assert.deepEqual(detectEntities('Meta AI published a paper.').map((e) => e.name), ['Meta AI']);
});

test('detectEntities is capped and returns no duplicates', () => {
  const found = detectEntities('OpenAI OpenAI OpenAI', 15);
  assert.equal(found.length, 1);
  assert.equal(detectEntities('OpenAI and Anthropic and Google', 1).length, 1);
});
