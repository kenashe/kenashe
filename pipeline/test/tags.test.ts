import { test } from 'node:test';
import assert from 'node:assert/strict';
import { governTags, normalizeTag, isAcceptableNewTag, CANONICAL_TAGS, TAG_SYNONYMS, MAX_TAGS } from '../src/tags.ts';

test('normalizeTag collapses case, punctuation, plurals and synonyms onto canonical forms', () => {
  assert.equal(normalizeTag('AI Agent'), 'ai-agents');
  assert.equal(normalizeTag('AI Agents'), 'ai-agents');
  assert.equal(normalizeTag('agents'), 'ai-agents');
  assert.equal(normalizeTag('Evaluation'), 'evals');
  assert.equal(normalizeTag('LLM Evals'), 'evals');
  assert.equal(normalizeTag('benchmark'), 'benchmarks');
  assert.equal(normalizeTag('Open-Weights'), 'open-source-ai');
  assert.equal(normalizeTag('local LLMs'), 'local-ai');
  assert.equal(normalizeTag("Claude’s Code"), 'claudes-code'); // unknown stays a normalized slug
});

test('governTags keeps canonical tags, dedupes, and allows at most one new tag', () => {
  const out = governTags(['agents', 'AI Agents', 'evaluation', 'brand-new-concept', 'another-new-one'], 'Some title');
  assert.deepEqual(out, ['ai-agents', 'evals', 'brand-new-concept']);
});

test('governTags rejects empty tags and caps the total', () => {
  assert.deepEqual(governTags(['', '  ', 'ok-tag']), ['ok-tag']);
  const many = CANONICAL_TAGS.slice(0, 9).map((t) => t.toUpperCase());
  assert.equal(governTags(many).length, MAX_TAGS);
});

test('a headline never becomes a tag', () => {
  const title = 'Google spam update and the AI SEO content factory';
  assert.equal(isAcceptableNewTag('google-spam-update-and-the-ai-seo-content-factory', title), false);
  assert.equal(isAcceptableNewTag('ai-seo-content-factory', title), false); // long fragment of the title
  assert.equal(isAcceptableNewTag('seo', title), true);
  assert.deepEqual(governTags(['SEO', 'Google spam update and the AI SEO content factory'], title), ['seo']);
});

test('new tags must look like durable concepts', () => {
  assert.equal(isAcceptableNewTag('x'), false);
  assert.equal(isAcceptableNewTag('2026'), false);
  assert.equal(isAcceptableNewTag('one-two-three-four'), false);
  assert.equal(isAcceptableNewTag('agent-observability'), true);
});

test('vocabulary is consistent: canonical tags are slugs, synonyms point at canonical tags', () => {
  for (const t of CANONICAL_TAGS) assert.match(t, /^[a-z0-9]+(-[a-z0-9]+)*$/, t);
  assert.equal(new Set(CANONICAL_TAGS).size, CANONICAL_TAGS.length);
  const canon = new Set(CANONICAL_TAGS);
  for (const [k, v] of Object.entries(TAG_SYNONYMS)) {
    assert.ok(canon.has(v), `synonym ${k} -> ${v} is not canonical`);
    assert.ok(!canon.has(k), `synonym key ${k} is itself canonical`);
  }
});
