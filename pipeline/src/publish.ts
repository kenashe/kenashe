// Publish: correct slug generation (the old bug, fixed), tag governance, MDX
// assembly, and commit/deploy. Runs on a host with git + a push token (GH Actions).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { env } from './config.ts';
import type { DraftPost } from './types.ts';

// FIX vs. the old pipeline: apostrophes are REMOVED (not halted on), and truncation
// happens at a WORD boundary (old code used a regex that stopped at the first quote
// and a blind substring(0,60) that cut mid-word).
export function cleanSlug(title: string, date: string): string {
  let s = title
    .toLowerCase()
    .replace(/['’]/g, '')        // don't -> dont (not "don")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (s.length > 80) s = s.slice(0, 80).replace(/-[^-]*$/, ''); // drop the partial last word
  return `${date}-${s}`;
}

// Controlled tag vocabulary (same merges applied in Bucket B) so the long tail stops growing.
const TAG_CANON: Record<string, string> = {
  'marketing-operations': 'marketing-ops', 'ai-marketing-ops': 'marketing-ops',
  'llm-evals': 'evals', 'ai-evals': 'evals',
  'agent-architecture': 'ai-agents', 'agent-workflows': 'ai-agents', 'agentic-systems': 'ai-agents',
  'llm-workflows': 'ai-workflows', 'workflow': 'ai-workflows',
  'programmatic-seo': 'seo', 'programmatic': 'seo',
  'gtm-tools': 'marketing-tools', 'automation': 'marketing-automation', 'claude-opus': 'claude',
};
export function governTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const slug = raw.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) continue;
    const canon = TAG_CANON[slug] ?? slug;
    if (!out.includes(canon)) out.push(canon);
  }
  return out.slice(0, 5);
}

// Parse the model's MDX output. Title/description capture the FULL line (no apostrophe halt).
export function parseGenerated(mdx: string): { title: string; description: string; tags: string[]; body: string } {
  const m = mdx.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const fm = m ? m[1] : '';
  const body = (m ? m[2] : mdx).trim();
  const line = (n: string) => fm.match(new RegExp(`^${n}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
  const tagsRaw = fm.match(/^tags:\s*\[(.*)\]\s*$/m)?.[1] ?? '';
  const tags = [...tagsRaw.matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] ?? x[2]);
  return { title: line('title'), description: line('description'), tags, body };
}

const q = (s: string) => `"${s.replace(/"/g, "'")}"`;

export function assembleMdx(draft: DraftPost): string {
  const hero = draft.images.find((i) => i.role === 'hero');
  const heroBlock = hero
    ? `image:\n  src: ${path.relative(`src/content/blog`, hero.path)}\n  alt: ${q(hero.alt)}\n`
    : '';
  return `---\ntitle: ${q(draft.title)}\ndescription: ${q(draft.description)}\npubDate: ${draft.pubDate}\ntags: [${draft.tags.map(q).join(', ')}]\ndraft: ${draft.draft}\n${heroBlock}---\n\n${draft.body}\n`;
}

export function writePost(repoRoot: string, draft: DraftPost): string {
  const file = path.join(repoRoot, 'src/content/blog', `${draft.slug}.mdx`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, assembleMdx(draft));
  return file;
}

export function commitAndPush(repoRoot: string, message: string): void {
  execSync('git add -A', { cwd: repoRoot, stdio: 'inherit' });
  execSync(`git -c user.name="kenashe pipeline" -c user.email="pipeline@users.noreply.github.com" commit -m ${JSON.stringify(message)}`, { cwd: repoRoot, stdio: 'inherit' });
  execSync(`git push origin ${env.gitBranch}`, { cwd: repoRoot, stdio: 'inherit' });
}

// Shadow preview: commit drafted files to a throwaway branch (force-pushed each run)
// so they can be read on GitHub without publishing to master.
export function commitToBranch(repoRoot: string, branch: string, message: string): void {
  execSync(`git checkout -B ${branch}`, { cwd: repoRoot, stdio: 'inherit' });
  execSync('git add -A', { cwd: repoRoot, stdio: 'inherit' });
  execSync(`git -c user.name="kenashe pipeline" -c user.email="pipeline@users.noreply.github.com" commit -m ${JSON.stringify(message)}`, { cwd: repoRoot, stdio: 'inherit' });
  execSync(`git push -f origin ${branch}`, { cwd: repoRoot, stdio: 'inherit' });
}

export async function triggerDeploy(): Promise<void> {
  if (!env.vercelHook) return;
  await fetch(env.vercelHook, { method: 'POST' });
}
