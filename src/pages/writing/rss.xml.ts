import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { essays, DEFAULT_AUTHORSHIP } from '../../data/writing';

// Feed of Ken's own essays under /writing/, kept separate from the automated Digest feed
// at /rss.xml. Blog directories (ooh.directory, Kagi Small Web, blogroll.org,
// indieblog.page and similar) only list personally written blogs, and the Digest feed is
// labelled machine-published, so this feed is the one to submit to them.
//
// It reads src/data/writing.ts, the same list the /writing/ index renders, so adding an
// essay there adds it here. Each item carries its authorship label as a category.
export async function GET(context: APIContext) {
  const items = [...essays]
    .sort((a, b) => b.published.localeCompare(a.published))
    .map((essay) => ({
      title: essay.title,
      pubDate: new Date(`${essay.published}T12:00:00Z`),
      description: essay.dek,
      link: `/writing/${essay.slug}/`,
      categories: [essay.authorship ?? DEFAULT_AUTHORSHIP],
    }));

  return rss({
    title: 'Ken Ashe: Writing',
    description:
      'Essays by Ken Ashe, an AI application builder, CPA and PMP: what he builds, what breaks, and what he learns. Separate from the automated KenAshe Digest.',
    site: context.site!,
    items,
  });
}
