import { SITE_URL } from '../consts';

export type Crumb = { name: string; path: string };

// Build a schema.org BreadcrumbList from an ordered list of crumbs.
// Paths are resolved to absolute URLs against SITE_URL (trailing-slash convention).
export function breadcrumbList(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}
