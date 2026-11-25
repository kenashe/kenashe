// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL } from './src/consts';
import { isSearchIndexable } from './src/utils/indexing';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [
    mdx(),
    // The sitemap lists only pages meant for search indexing. Same rule as the robots
    // meta tag in BaseHead.astro, so a noindex page is never advertised here.
    sitemap({ filter: (page) => isSearchIndexable(new URL(page).pathname) }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
  },
});
