// Regression tests for the MDX/YAML assembly. Both escaping bugs covered here took the
// production site down (see DECISIONS.md D5) — feed titles and model output are untrusted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSlug, governTags, parseGenerated, sanitizeMdxBody, assembleMdx } from '../src/publish.ts';
import type { DraftPost } from '../src/types.ts';

const draft = (over: Partial<DraftPost> = {}): DraftPost => ({
  slug: 's', title: 'T', description: 'D', pubDate: '2026-08-09', tags: ['a'],
  draft: false, body: 'body', images: [], storyKey: 'k', tierKind: 'note', ...over,
});
const frontmatter = (mdx: string) => /^---\n([\s\S]*?)\n---/.exec(mdx)![1];

test('cleanSlug drops apostrophes rather than truncating at them', () => {
  assert.equal(cleanSlug("Vibe checks don't work", '2026-08-09'), '2026-08-09-vibe-checks-dont-work');
});

test('cleanSlug truncates on a word boundary', () => {
  const s = cleanSlug('a'.repeat(50) + ' ' + 'b'.repeat(50), '2026-08-09');
  assert.ok(s.length <= 91, `too long: ${s.length}`);
  assert.ok(!s.endsWith('-'), 'must not end with a separator');
  assert.ok(!s.includes('bbb'), 'partial last word should be dropped');
});

test('cleanSlug expands & and collapses separators', () => {
  assert.equal(cleanSlug('Agents & Evals', '2026-01-01'), '2026-01-01-agents-and-evals');
});

test('governTags canonicalises aliases, de-dupes, and caps at 5', () => {
  assert.deepEqual(governTags(['LLM Evals', 'ai-evals', 'Agent Architecture']), ['evals', 'ai-agents']);
  assert.equal(governTags(['a', 'b', 'c', 'd', 'e', 'f', 'g']).length, 5);
  assert.deepEqual(governTags(['', '  ', 'ok']), ['ok']);
});

// --- D5, bug 1: invalid YAML escape from an arXiv LaTeX title ---
test('assembleMdx escapes backslashes so LaTeX titles stay valid YAML', () => {
  const mdx = assembleMdx(draft({ title: String.raw`Fails for Every Dimension $n\geq 4$` }));
  const fm = frontmatter(mdx);
  assert.ok(fm.includes(String.raw`$n\\geq 4$`), 'backslash must be doubled');
  assert.ok(!/[^\\]\\geq/.test(fm), 'no unescaped \\g may remain');
});

test('assembleMdx escapes embedded double quotes', () => {
  const fm = frontmatter(assembleMdx(draft({ title: 'A "quoted" title' })));
  assert.ok(fm.includes('\\"quoted\\"'));
});

test('assembleMdx emits sources and entities blocks only when present', () => {
  const withMeta = assembleMdx(draft({
    sources: [{ title: 'Paper', url: 'https://arxiv.org/abs/1' }],
    entities: [{ name: 'OpenAI', sameAs: 'https://www.wikidata.org/wiki/Q21708200' }],
  }));
  assert.match(withMeta, /sources:\n {2}- title: "Paper"\n {4}url: "https:\/\/arxiv\.org\/abs\/1"/);
  assert.match(withMeta, /entities:\n {2}- name: "OpenAI"/);
  const without = assembleMdx(draft());
  assert.ok(!without.includes('sources:') && !without.includes('entities:'));
});

// --- D5, bug 2: MDX parses { } as JS and <Word as JSX ---
test('sanitizeMdxBody escapes braces in prose', () => {
  assert.equal(sanitizeMdxBody(String.raw`constants $r_{\min}=10^{-6}$`), String.raw`constants $r_\{\min\}=10^\{-6\}$`);
});

test('sanitizeMdxBody escapes <Word but leaves comparisons alone', () => {
  assert.equal(sanitizeMdxBody('a <Component b'), 'a &lt;Component b');
  assert.equal(sanitizeMdxBody('for n < 4 and 3<5'), 'for n < 4 and 3<5');
});

test('sanitizeMdxBody preserves braces inside code', () => {
  assert.equal(sanitizeMdxBody('use `{a: 1}`'), 'use `{a: 1}`');
  assert.equal(sanitizeMdxBody('```\nx = {b: 2}\n```'), '```\nx = {b: 2}\n```');
});

test('sanitizeMdxBody escapes prose around a code fence', () => {
  const out = sanitizeMdxBody('before {x}\n```\n{keep}\n```\nafter {y}');
  assert.ok(out.includes(String.raw`before \{x\}`));
  assert.ok(out.includes('{keep}'), 'fenced content untouched');
  assert.ok(out.includes(String.raw`after \{y\}`));
});

test('assembleMdx sanitizes the body it writes', () => {
  assert.ok(assembleMdx(draft({ body: 'math {x}' })).includes(String.raw`math \{x\}`));
});

test('parseGenerated reads full title/description lines and tags', () => {
  const p = parseGenerated('---\ntitle: "It\'s: a title"\ndescription: "One sentence."\ntags: ["a", "b"]\ndraft: true\n---\n\nBody here.');
  assert.equal(p.title, "It's: a title");
  assert.equal(p.description, 'One sentence.');
  assert.deepEqual(p.tags, ['a', 'b']);
  assert.equal(p.body, 'Body here.');
});
