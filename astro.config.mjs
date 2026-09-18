// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL } from './src/consts';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [mdx(), sitemap()],
  // EXPERIMENT (not for merge as-is): Astro's global responsive-image mode, to measure Vercel
  // build cost and the srcset/sizes it generates for inline Markdown images in Digest posts.
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'directory',
  },
});
