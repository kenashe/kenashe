// Search indexing policy for kenashe.ai, in one place.
//
// The autonomous Digest stays public and crawlable, but it is not what this site asks
// search engines to index. Everything under the prefixes below gets
// <meta name="robots" content="noindex, follow"> (BaseHead.astro) and is left out of the
// XML sitemap (astro.config.mjs). Both read this module, so they cannot drift apart.
//
// The rule is by route, on purpose: a Digest post published tomorrow lives under /blog/
// and inherits the policy with no per-post flag and no change to the pipeline or the
// content schema. Original work lives outside these prefixes (/writing/, /building/,
// /about/, /newsroom/, ...) and is never affected.
//
// Never list these paths in robots.txt: crawlers have to fetch a page to see its noindex.
// To reverse the policy, empty this array (or remove one prefix) and redeploy.
export const NOINDEX_PREFIXES: readonly string[] = [
  '/blog', // Digest landing page, every Digest post, /blog/tags/ and each tag page
  '/topics', // topic hubs: lists of Digest posts grouped by tag family
];

/** True when the page at `pathname` should be offered to search engines for indexing. */
export function isSearchIndexable(pathname: string): boolean {
  const path = '/' + pathname.replace(/^\/+|\/+$/g, '');
  return !NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}
