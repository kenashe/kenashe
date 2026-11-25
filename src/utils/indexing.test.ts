// Run: node --experimental-strip-types --test src/utils/indexing.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSearchIndexable, NOINDEX_PREFIXES } from './indexing.ts';

const pagesDir = fileURLToPath(new URL('../pages/', import.meta.url));
const read = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');

test('original work stays indexable', () => {
  for (const path of [
    '/',
    '/about/',
    '/building/',
    '/building/autonomous-ai-blog/',
    '/building/zerohuman/',
    '/writing/',
    '/writing/bambu-lab-burr-puzzle-solution/',
    '/newsroom/',
    '/news/site-launch/',
    '/work/',
    '/connect/',
    '/disclosure/',
  ]) {
    assert.equal(isSearchIndexable(path), true, path);
  }
});

test('the Digest, its tags and its topic hubs are not indexable', () => {
  for (const path of [
    '/blog/',
    '/blog',
    '/blog/2026-10-02-karpathys-aircraft-manual-prompt-is-really-a-spec-for-better-ai-output/',
    '/blog/2026-11-12-the-cmp-170hx-a100-unlock-is-real-useful-and-not-a-shopping-list/',
    '/blog/2099-01-01-a-post-the-pipeline-has-not-written-yet/',
    '/blog/tags/',
    '/blog/tags/ai-agents/',
    '/topics/',
    '/topics/agents-and-evals/',
  ]) {
    assert.equal(isSearchIndexable(path), false, path);
  }
});

test('a prefix only matches whole path segments', () => {
  assert.equal(isSearchIndexable('/blogging-notes/'), true);
  assert.equal(isSearchIndexable('/topics-i-like/'), true);
  assert.equal(isSearchIndexable('/writing/blog/'), true);
});

// Guard against the policy catching original work through a shared template: every
// route file under src/pages must fall on the expected side of the line.
test('only Digest routes sit under a noindex prefix', () => {
  const routes: string[] = [];
  const walk = (dir: string, base: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, `${base}/${name}`);
      else if (name.endsWith('.astro')) {
        const stem = name.replace(/\.astro$/, '');
        routes.push(stem === 'index' ? `${base}/` : `${base}/${stem}/`);
      }
    }
  };
  walk(pagesDir, '');
  const excluded = routes.filter((r) => !isSearchIndexable(r)).sort();
  assert.deepEqual(excluded, [
    '/blog/',
    '/blog/[...slug]/',
    '/blog/tags/',
    '/blog/tags/[tag]/',
    '/topics/',
    '/topics/[slug]/',
  ]);
  assert.ok(routes.filter((r) => r.startsWith('/writing/')).every(isSearchIndexable));
  assert.ok(routes.filter((r) => r.startsWith('/building')).every(isSearchIndexable));
});

test('the head, the sitemap and robots.txt all follow the one policy', () => {
  assert.ok(read('src/components/BaseHead.astro').includes('isSearchIndexable(Astro.url.pathname)'));
  assert.ok(read('astro.config.mjs').includes('isSearchIndexable(new URL(page).pathname)'));
  const robots = read('src/pages/robots.txt.ts');
  assert.ok(!/Disallow/i.test(robots), 'noindex pages must stay crawlable');
  assert.deepEqual([...NOINDEX_PREFIXES], ['/blog', '/topics']);
});
