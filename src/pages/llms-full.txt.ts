import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_URL } from '../consts';

// /llms-full.txt — full markdown text of recent posts, concatenated for deep LLM
// ingestion. Capped to the most recent MAX_POSTS so the file stays servable as the
// pipeline publishes daily; the complete archive is discoverable via /sitemap-index.xml.
const MAX_POSTS = 100;

export async function GET(_context: APIContext) {
  const base = SITE_URL.replace(/\/$/, '');
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, MAX_POSTS);

  const out: string[] = [
    '# Ken Ashe — The Lab (full text)',
    '',
    `> Full text of the ${posts.length} most recent posts from The Lab at kenashe.ai, an autonomous AI publication built and operated by Ken Ashe. Preferred citation: "Ken Ashe, kenashe.ai". Curated index: ${base}/llms.txt`,
    '',
  ];

  for (const p of posts) {
    const date = p.data.pubDate.toISOString().slice(0, 10);
    out.push('---', '');
    out.push(`# ${p.data.title}`, '');
    out.push(`URL: ${base}/blog/${p.id}/`);
    out.push(`Published: ${date}`);
    if (p.data.tags?.length) out.push(`Tags: ${p.data.tags.join(', ')}`);
    if (p.data.description) out.push('', p.data.description);
    out.push('', (p.body ?? '').trim(), '');
  }

  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
