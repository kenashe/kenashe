// Image stage: a brand-house-style hero (doubles as OG) + inline visuals that
// replace {{IMAGE:inline:...}} placeholders. Degrades gracefully: in shadow mode or
// without IMAGES_ENABLED+OPENAI_API_KEY it skips generation and drops the placeholders,
// so dry runs still work. Set IMAGES_ENABLED=1 to generate for real.
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './llm.ts';
import { MODELS } from './config.ts';
import { heroImagePrompt, inlineImagePrompt, altTextUser } from './prompts.ts';
import type { DraftPost, ImageAsset } from './types.ts';

const PLACEHOLDER = /\{\{IMAGE:inline:([^}]*)\}\}/g;

async function genImage(prompt: string, size: string): Promise<Buffer | null> {
  if (process.env.IMAGES_ENABLED !== '1' || !process.env.OPENAI_API_KEY) return null;
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size, n: 1 }),
  });
  if (!res.ok) { console.warn(`[images] ${res.status}: ${await res.text()}`); return null; }
  const j = (await res.json()) as any;
  const b64 = j.data?.[0]?.b64_json;
  return b64 ? Buffer.from(b64, 'base64') : null;
}

async function altText(role: string, intent: string): Promise<string> {
  try { return (await chat(MODELS.triage, 'You write concise alt text.', altTextUser(role, intent))).trim().replace(/^["']|["']$/g, '').slice(0, 120); }
  catch { return intent.slice(0, 120); }
}

export async function addImages(draft: DraftPost, repoRoot: string, _shadow: boolean): Promise<void> {
  const dir = path.join(repoRoot, 'src/assets/blog', draft.slug);
  const relFromMdx = (file: string) => path.relative('src/content/blog', `src/assets/blog/${draft.slug}/${file}`);
  const write = (file: string, buf: Buffer) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, file), buf); };
  const images: ImageAsset[] = [];

  const heroBuf = await genImage(heroImagePrompt(draft.title, draft.description, draft.tags, draft.slug), '1536x1024');
  if (heroBuf) { write('hero.png', heroBuf); images.push({ role: 'hero', path: `src/assets/blog/${draft.slug}/hero.png`, alt: await altText('hero', draft.title) }); }

  let i = 0;
  const parts: string[] = [];
  let last = 0;
  for (const m of draft.body.matchAll(PLACEHOLDER)) {
    parts.push(draft.body.slice(last, m.index ?? 0));
    last = (m.index ?? 0) + m[0].length;
    const buf = await genImage(inlineImagePrompt(m[1].trim()), '1536x1024');
    if (buf) {
      i += 1;
      const file = `inline-${i}.png`;
      write(file, buf);
      const a = await altText('inline', m[1].trim());
      images.push({ role: /diagram|chart/i.test(m[1]) ? 'diagram' : 'inline', path: `src/assets/blog/${draft.slug}/${file}`, alt: a });
      parts.push(`\n\n![${a}](${relFromMdx(file)})\n\n`);
    }
  }
  parts.push(draft.body.slice(last));
  draft.body = parts.join('').replace(/\n{3,}/g, '\n\n');
  draft.images = images;
}
