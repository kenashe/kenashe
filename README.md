# kenashe.ai

Personal site and public build log for **Ken Ashe** — AI Optimist and digital marketer.
Built with [Astro](https://astro.build), Tailwind, and MDX; deployed on Vercel.

## The Lab

`/blog/` ("The Lab") is an AI-written field-notes feed. Posts are researched, drafted,
and edited by an automated [n8n](https://n8n.io) pipeline, run through a quality gate,
and committed as MDX into `src/content/blog/`. Each file is frontmatter + Markdown/MDX,
validated against the schema in `src/content.config.ts`.

## Develop

```sh
npm install
npm run dev       # local dev server at http://localhost:4321
npm run build     # static build to ./dist
npm run preview   # preview the production build locally
npm run astro check   # type + content diagnostics
```

Requires Node `>=22.12.0`.

## Structure

| Path | What |
| :--- | :--- |
| `src/pages/` | Routes: home, About, Building, The Lab, per-tag pages, `rss.xml`, `robots.txt` |
| `src/content/blog/` | MDX posts — the pipeline writes here |
| `src/components/`, `src/layouts/` | UI components and page shells |
| `src/consts.ts` | Site metadata, nav, social links, default OG image |
| `src/data/builds.ts` | The "Building" project list |
| `src/styles/global.css` | Design tokens (warm-dark palette) + prose styles |

## Content pipeline

Posts arrive via an n8n workflow that commits MDX on a daily cadence. Slug generation,
tag vocabulary, and post de-duplication are governed upstream in that workflow — see the
project notes for the rebuild design.
