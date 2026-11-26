// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL } from './src/consts';
import { readFileSync } from 'node:fs';

// The sitemap runs after static HTML generation. Use the actual tag pages' robots
// directives, not a second frontmatter parser or a manually maintained slug list.
const excluded = new Set();
/** @type {import('astro').AstroIntegration} */
const tagIndexing = {
  name: 'digest-tag-indexing',
  hooks: {
    'astro:build:done': ({ dir, pages }) => {
      excluded.clear();
      for (const { pathname } of pages) {
        const path = '/' + pathname.replace(/^\/+|\/+$/g, '') + '/';
        if (!/^\/blog\/tags\/[^/]+\/$/.test(path)) continue;
        const html = readFileSync(new URL(`.${path}index.html`, dir), 'utf8');
        if (html.includes('<meta name="robots" content="noindex, follow"')) excluded.add(path);
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [
    mdx(),
    tagIndexing,
    sitemap({ filter: (page) => !excluded.has(new URL(page).pathname) }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
  },
});
