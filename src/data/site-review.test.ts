import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { essays } from './writing.ts';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('every writing thumbnail has reviewed alt, including alternate compositions', () => {
  assert.equal(essays.length, 8);
  for (const essay of essays) {
    assert.ok(essay.image?.alt.trim(), essay.slug);
    if (essay.image?.thumbnail) assert.ok(essay.image.thumbnailAlt?.trim(), essay.slug);
  }
  const index = read('src/pages/writing/index.astro');
  assert.equal((index.match(/alt=\{cover.alt\}/g) ?? []).length, 2);
  assert.ok(read('src/data/writing-images.ts').includes('essay.image.thumbnailAlt ?? essay.image.alt'));
});

test('all existing build write-ups use the shared Article layout', () => {
  const pages = readdirSync(new URL('../pages/building/', import.meta.url)).filter(p => p.endsWith('.astro'));
  assert.equal(pages.length, 9);
  for (const page of pages) {
    const source = read(`src/pages/building/${page}`);
    assert.ok(source.includes("from '../../layouts/BuildLayout.astro'"), page);
    assert.ok(source.includes('<BuildLayout'), page);
    assert.ok(source.includes('description='), page);
  }
  const layout = read('src/layouts/BuildLayout.astro');
  assert.ok(layout.includes("'@type': 'Article'"));
  assert.ok(layout.includes('websiteKenAshe,\n    personKenAshe,'));
  assert.ok(!layout.includes('datePublished:'));
});

test('sitemap alias has exactly one permanent destination', () => {
  const rules = JSON.parse(read('vercel.json')).redirects.filter((r: { source: string }) => r.source === '/sitemap.xml');
  assert.deepEqual(rules, [{ source: '/sitemap.xml', destination: '/sitemap-index.xml', permanent: true }]);
});

test('page title suffix is short while homepage title is preserved', () => {
  assert.ok(read('src/components/BaseHead.astro').includes('title ? `${title} – ${AUTHOR}` : SITE_TITLE'));
});

test('stale Substack link is removed and social prompt is present', () => {
  assert.ok(!read('src/pages/llms.txt.ts').includes('newsletter.kenashe.ai'));
  const prompt = read('src/components/FollowNote.astro');
  assert.ok(prompt.includes('https://x.com/kenashe'));
  assert.ok(prompt.includes('https://www.youtube.com/@KenAshe'));
  assert.ok(read('src/layouts/BaseLayout.astro').includes('{showFollow && <FollowNote />}'));
});


test('portrait stays below the unchanged homepage hero', () => {
  const home = read('src/pages/index.astro');
  const hero = home.slice(home.indexOf('<header class="hero">'), home.indexOf('</header>'));
  assert.ok(!hero.includes('bring-portrait'));
  assert.ok(home.indexOf('class="bring-intro"') > home.indexOf('id="bring-heading"'));
  assert.ok(home.includes('width={160}'));
  assert.ok(home.includes('loading="lazy"'));
});

test('only the Digest hero loads eagerly; layout order stays unchanged', () => {
  const post = read('src/layouts/BlogPost.astro');
  assert.ok(post.includes('loading="eager"'));
  assert.ok(post.includes('fetchpriority="high"'));
  assert.ok(post.indexOf('<aside class="auto-note"') < post.indexOf('<figure class="hero-image"'));
  assert.ok(post.indexOf('<figure class="hero-image"') < post.indexOf('<header class="post-header"'));
});

test('sponsored offer is linked and makes no promise of a positive review', () => {
  assert.ok(read('src/pages/index.astro').includes('href="/work/"'));
  const work = read('src/pages/work.astro');
  assert.ok(work.includes('Payment covers the agreed work, not a positive review.'));
  assert.ok(work.replace(/\s+/g, ' ').includes('not a placement in the automated Digest'));
  assert.ok(work.includes('budget'));
  assert.ok(work.includes('mailto:hello@kenashe.ai'));
});
