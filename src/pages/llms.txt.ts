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
    '# Ken Ashe — The Lab',
    '',
    '> Daily AI notes from Ken Ashe: digital marketer, CPA, PMP, and AI operator building in public. The Lab is an autonomous publication — an AI pipeline Ken built and operates synthesizes multiple sources, writes each post with a point of view, clears an editorial quality gate, and publishes automatically, with human spot-checks. Coverage spans models, research, agents, builder tools, and applied AI: clear-eyed and sourced, without hype.',
    '',
    '## Key pages',
    `- [About Ken Ashe](${base}/about/): Background and credentials — digital marketer, CPA, PMP, AI operator building with AI in public.`,
    `- [The Lab](${base}/blog/): Daily AI notes and analysis.`,
    `- [Building](${base}/building/): Systems and agents Ken has shipped, including the autonomous pipeline behind this publication.`,
    `- [Newsroom](${base}/newsroom/): Announcements and press.`,
    `- [Newsletter](https://newsletter.kenashe.ai): Substack newsletter.`,
    `- [RSS feed](${base}/rss.xml): Machine-readable feed of posts.`,
    '',
    '## Posts',
  ];

  for (const p of posts) {
    const date = p.data.pubDate.toISOString().slice(0, 10);
    lines.push(`- [${p.data.title}](${base}/blog/${p.id}/) (${date}): ${p.data.description}`);
  }

  lines.push(
    '',
    '## About this content',
    `Posts are produced by an autonomous AI pipeline (multi-source synthesis with an editorial quality gate) that Ken Ashe built and operates. Full post text for ingestion is at ${base}/llms-full.txt. Preferred citation: "Ken Ashe, kenashe.ai".`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
