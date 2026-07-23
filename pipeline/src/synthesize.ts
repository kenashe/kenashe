// Turn a clustered story into a draft post via the tier-appropriate model.
import { chat } from './llm.ts';
import { MODELS } from './config.ts';
import { voiceSystem, synthesisUser } from './prompts.ts';
import { parseGenerated, cleanSlug, governTags } from './publish.ts';
import type { Story, DraftPost } from './types.ts';

export async function synthesize(story: Story, spokes: { slug: string; title: string }[] = []): Promise<DraftPost> {
  // deep-dive uses the flagship model (Opus); only 'note' uses the cheaper writer.
  const model = story.tier === 'note' ? MODELS.note : MODELS.flagship;
  const maxTokens = story.tier === 'deepdive' ? 8000 : 4000;
  const mdx = await chat(model, voiceSystem(), synthesisUser(story.items, story.tier, spokes), { maxTokens });
  const p = parseGenerated(mdx);
  if (!p.title) throw new Error(`synthesize: no title produced for story ${story.key}`);
  const pubDate = new Date().toISOString().slice(0, 10);
  return {
    slug: cleanSlug(p.title, pubDate),
    title: p.title,
    description: p.description,
    pubDate,
    tags: governTags(p.tags),
    draft: true, // gate flips this to false on pass
    body: p.body,
    images: [],
    storyKey: story.key,
    tierKind: story.tier,
  };
}
