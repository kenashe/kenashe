// Turn a clustered story into a draft post via the tier-appropriate model.
import { chat } from './llm.ts';
import { MODELS } from './config.ts';
import { voiceSystem, synthesisUser } from './prompts.ts';
import { parseGenerated, cleanSlug, governTags } from './publish.ts';
import type { Story, DraftPost } from './types.ts';

export async function synthesize(story: Story): Promise<DraftPost> {
  const model = story.tier === 'flagship' ? MODELS.flagship : MODELS.note;
  const mdx = await chat(model, voiceSystem(), synthesisUser(story.items, story.tier), { maxTokens: 4000 });
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
