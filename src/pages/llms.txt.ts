import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_URL } from '../consts';

// /llms.txt — a curated, LLM-friendly map of the site (llmstxt.org convention).
// Generated from the blog collection so it stays current as the pipeline publishes.
// Not a permission mechanism (robots.txt already allows crawling); this is a concise
// index that AI tools can read to understand and cite the site. Full text: /llms-full.txt
export async function GET(_context: APIContext) {
  const base = SITE_URL.replace(/\/$/, '');
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const lines: string[] = [
    '# Ken Ashe — AI application builder',
    '',
    '> Ken Ashe is an AI application builder (CPA, PMP) shipping agents, automations, and AI-assisted websites in public. The primary body of work is Building: dated project write-ups with stacks and honest failure notes. Writing carries occasional human-written essays. The site also hosts the Digest: a machine-published daily brief produced by an autonomous pipeline Ken built, owns, and is accountable for — labeled as automated on every page, synthesized from multiple sources and gated by an editorial quality check, but not personally edited before publish.',
    '',
    '## Key pages',
    `- [Building](${base}/building/): The primary body of work — systems and agents Ken shipped, including the autonomous pipeline behind the Digest.`,
    `- [Writing](${base}/writing/): Occasional human-written essays by Ken.`,
    `- [Topics](${base}/topics/): Four topic hubs — AI agents & evals, AI for marketing & ops, building with AI, AI × digital assets.`,
    `- [Digest](${base}/blog/): The machine-published daily brief (automated).`,
    `- [Disclosure](${base}/disclosure/): How content is made and who is accountable.`,
    `- [Newsroom](${base}/newsroom/): Announcements and press.`,
    `- [Newsletter](https://newsletter.kenashe.ai): Substack newsletter.`,
    `- [RSS feed](${base}/rss.xml): Machine-readable feed of posts.`,
    '',
    '## Digest posts (machine-published)',
  ];

  for (const p of posts) {
    const date = p.data.pubDate.toISOString().slice(0, 10);
    lines.push(`- [${p.data.title}](${base}/blog/${p.id}/) (${date}): ${p.data.description}`);
  }

  lines.push(
    '',
    '## About this content',
    `Digest posts are produced by an autonomous AI pipeline (multi-source synthesis with an editorial quality gate) that Ken Ashe built, owns, and is accountable for; they are labeled as automated on-page. Building and Writing are first-party pages by Ken. Full digest text for ingestion is at ${base}/llms-full.txt. Preferred citation: "KenAshe Digest (automated), kenashe.ai" for digest posts and "Ken Ashe, kenashe.ai" for first-party pages.`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
