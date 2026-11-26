#!/usr/bin/env node
// Post-build check of the search indexing policy (src/utils/indexing.ts).
// Usage: npm run build && npm run check:indexing        (reads ./dist, changes nothing)
//
// Fails (exit 1) if any built page disagrees with the policy:
//   - a thin tag listing without noindex, or an eligible page with it
//   - a noindex page listed in the sitemap, or an indexable page missing from it
//   - a page whose canonical is not its own URL
//   - robots.txt that disallows anything or omits the sitemap
//   - an internal link that resolves to neither a built file nor a vercel.json redirect
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'https://kenashe.ai';
const DIST = process.argv[2] ?? 'dist';
const errors = [];
const fail = (m) => errors.push(m);
// Independently verify tag eligibility from actual linked articles in the rendered list.
const indexable = (path, html) => {
  if (!/^\/blog\/tags\/[^/]+\/$/.test(path)) return true;
  const list = html.match(/<ul class="tag-posts"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
  if (list === undefined) { fail(`missing tag article list: ${path}`); return false; }
  const urls = new Set(Array.from(list.matchAll(/href="(\/blog\/[^/"?#]+\/)"/g), m => m[1]));
  return urls.size >= 3;
};
const category = (p) =>
  p === '/blog/' ? 'Digest landing page'
  : p === '/blog/tags/' ? 'Digest tag directory'
  : p.startsWith('/blog/tags/') ? 'Digest tag pages'
  : p.startsWith('/blog/') ? 'Digest posts'
  : p.startsWith('/topics/') ? 'Digest topic hubs'
  : p === '/writing/' || p === '/building/' ? 'Section indexes'
  : p.startsWith('/writing/') ? 'Essays and tutorials'
  : p.startsWith('/building/') ? 'Build pages'
  : p === '/' ? 'Homepage'
  : 'Profile, newsroom and other pages';

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
})(DIST);
const fileSet = new Set(files.map((f) => '/' + relative(DIST, f).split(sep).join('/')));

const pages = new Map(); // url path -> html
for (const f of files) {
  if (!f.endsWith('.html')) continue;
  const rel = '/' + relative(DIST, f).split(sep).join('/');
  if (rel === '/404.html') continue;
  pages.set(rel.replace(/index\.html$/, ''), readFileSync(f, 'utf8'));
}

const sitemapLocs = new Set();
const sitemapIndex = readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8');
for (const [, loc] of sitemapIndex.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const file = join(DIST, new URL(loc).pathname);
  if (!existsSync(file)) { fail(`sitemap index points at a missing file: ${loc}`); continue; }
  for (const [, u] of readFileSync(file, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)) {
    if (!u.startsWith(SITE + '/')) fail(`sitemap URL on the wrong host: ${u}`);
    sitemapLocs.add(new URL(u).pathname);
  }
}

const redirects = new Set(JSON.parse(readFileSync('vercel.json', 'utf8')).redirects.map((r) => r.source));
const resolves = (path) => {
  const clean = decodeURI(path);
  return fileSet.has(clean) || fileSet.has(clean.replace(/\/?$/, '/') + 'index.html') || fileSet.has(clean + '.html') ||
    redirects.has(clean) || clean.startsWith('/_vercel/');
};

const counts = {};
const bump = (cat, key) => { (counts[cat] ??= { pages: 0, noindex: 0, inSitemap: 0 })[key]++; };
const broken = new Map();
for (const [path, html] of pages) {
  const cat = category(path);
  bump(cat, 'pages');
  const robots = (html.match(/<meta name="robots" content="([^"]*)"/) ?? [])[1] ?? '';
  const noindex = /noindex/.test(robots);
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) ?? [])[1];
  const want = indexable(path, html);
  if (noindex) bump(cat, 'noindex');
  if (sitemapLocs.has(path)) bump(cat, 'inSitemap');
  if (want && noindex) fail(`eligible page is noindex: ${path}`);
  if (!want && !noindex) fail(`thin tag listing is missing noindex: ${path}`);
  if (!want && robots !== 'noindex, follow') fail(`unexpected robots value "${robots}": ${path}`);
  if (want && !sitemapLocs.has(path)) fail(`indexable page missing from sitemap: ${path}`);
  if (!want && sitemapLocs.has(path)) fail(`noindex page listed in sitemap: ${path}`);
  if (canonical !== SITE + path) fail(`canonical mismatch on ${path}: ${canonical}`);
  for (const [, href] of html.matchAll(/<a\s[^>]*?href="([^"#?]+)[^"]*"/g)) {
    let target;
    if (href.startsWith('/')) target = href;
    else if (href.startsWith(SITE + '/') || href === SITE) target = new URL(href).pathname;
    else continue;
    if (!resolves(target)) broken.set(target, (broken.get(target) ?? 0) + 1);
  }
}
for (const p of sitemapLocs) if (!pages.has(p)) fail(`sitemap lists a URL that was not built: ${p}`);
for (const [t, n] of broken) fail(`broken internal link (${n} page(s)): ${t}`);

const robotsTxt = readFileSync(join(DIST, 'robots.txt'), 'utf8');
if (/^\s*Disallow:\s*\S/im.test(robotsTxt)) fail('robots.txt disallows a path; noindex pages must stay crawlable');
if (!robotsTxt.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) fail('robots.txt does not point at the sitemap index');

console.log('category'.padEnd(38), 'pages'.padStart(6), 'noindex'.padStart(8), 'sitemap'.padStart(8));
let tp = 0, tn = 0, ts = 0;
for (const [cat, c] of Object.entries(counts).sort()) {
  console.log(cat.padEnd(38), String(c.pages).padStart(6), String(c.noindex).padStart(8), String(c.inSitemap).padStart(8));
  tp += c.pages; tn += c.noindex; ts += c.inSitemap;
}
console.log('TOTAL'.padEnd(38), String(tp).padStart(6), String(tn).padStart(8), String(ts).padStart(8));
console.log(`sitemap URLs: ${sitemapLocs.size}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors.slice(0, 60)) console.error(' - ' + e);
  process.exit(1);
}
console.log('\nOK: indexing policy, sitemap, canonicals, robots.txt and internal links all agree.');
