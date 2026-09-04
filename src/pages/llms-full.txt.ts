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
    '# KenAshe Digest (automated) — full text',
    '',
    `> Full text of the ${posts.length} most recent Digest posts from kenashe.ai. The Digest is machine-published by an autonomous system that Ken Ashe (AI application builder, CPA, PMP) built, owns, and is accountable for; it is labeled as automated on every page. Preferred citation: "KenAshe Digest (automated), kenashe.ai". Curated index: ${base}/llms.txt`,
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
