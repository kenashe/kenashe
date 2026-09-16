// Output format and size budget for Digest images.
//
// Why this file exists (DECISIONS.md D16): until 2026-09-16 the pipeline asked gpt-image-1
// for its default output, a lossless 1536x1024 PNG of 2-5 MB, and committed ~25 of them a
// day. The repo tree reached 5.5 GB, 99.7% of it those PNGs, and Vercel's `--depth=10`
// clone of that tree took 42 minutes and blew the 45-minute Hobby build limit. Visitors
// never receive the source file (Astro serves 20-450 KB WebP derivatives), so the source
// is requested as compressed WebP instead. Pure helpers live here so they can be unit
// tested without loading the LLM/yaml stack.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export const IMAGE_MODEL = 'gpt-image-1';
export const IMAGE_SIZE = '1536x1024';
/** File extension and gpt-image-1 `output_format`. */
export const IMAGE_FORMAT = 'webp' as const;
/** gpt-image-1 `output_compression` (0-100, jpeg/webp only). 80 keeps illustration detail at ~150-350 KB. */
export const IMAGE_COMPRESSION = 80;

/** Request body for the Images API. Kept as a function so a test can pin the format fields. */
export function imageRequestBody(prompt: string, size: string = IMAGE_SIZE) {
  return {
    model: IMAGE_MODEL,
    prompt,
    size,
    n: 1,
    output_format: IMAGE_FORMAT,
    output_compression: IMAGE_COMPRESSION,
  };
}

/** `hero.webp` or `inline-N.webp`; the extension follows IMAGE_FORMAT everywhere. */
export function imageFileName(role: 'hero' | 'inline', index?: number): string {
  if (role === 'hero') return `hero.${IMAGE_FORMAT}`;
  if (!index || index < 1) throw new Error('inline images are numbered from 1');
  return `inline-${index}.${IMAGE_FORMAT}`;
}

// --- Size budget --------------------------------------------------------------------
// A day's run adds ~25 images. At ~250 KB each that is ~6 MB; the old PNG runs were 52-73
// MB. The budget is deliberately generous (2x a bad WebP day) so it only fires on a real
// regression, such as the format silently reverting to PNG.
export const MAX_NEW_IMAGE_BYTES = 15 * 1024 * 1024;
/** One image above this is almost certainly not the compressed format we asked for. */
export const MAX_SINGLE_IMAGE_BYTES = 1.5 * 1024 * 1024;

export interface NewImage {
  path: string;
  bytes: number;
}

export interface BudgetResult {
  ok: boolean;
  total: number;
  offenders: NewImage[];
  message: string;
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Pure check: total under MAX_NEW_IMAGE_BYTES and every file under MAX_SINGLE_IMAGE_BYTES. */
export function checkImageBudget(
  files: NewImage[],
  maxTotal: number = MAX_NEW_IMAGE_BYTES,
  maxSingle: number = MAX_SINGLE_IMAGE_BYTES,
): BudgetResult {
  const total = files.reduce((s, f) => s + f.bytes, 0);
  const offenders = files.filter((f) => f.bytes > maxSingle);
  const problems: string[] = [];
  if (total > maxTotal) problems.push(`total ${mb(total)} exceeds ${mb(maxTotal)}`);
  if (offenders.length) {
    problems.push(
      `${offenders.length} file(s) exceed ${mb(maxSingle)}: ${offenders
        .slice(0, 5)
        .map((f) => `${f.path} (${mb(f.bytes)})`)
        .join(', ')}${offenders.length > 5 ? ', ...' : ''}`,
    );
  }
  const ok = problems.length === 0;
  const message = ok
    ? `[images] ${files.length} new image(s), ${mb(total)} total, within budget`
    : `[images] budget exceeded: ${problems.join('; ')}. Expected compressed ${IMAGE_FORMAT} at ~250 KB each; ` +
      `check the gpt-image-1 request in images.ts (output_format/output_compression).`;
  return { ok, total, offenders, message };
}

/** New (untracked) image files under src/assets/blog in the working tree, with sizes. */
export function newImageFiles(repoRoot: string): NewImage[] {
  const out = execSync('git ls-files --others --exclude-standard -- src/assets/blog', {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((p) => ({ path: p, bytes: fs.statSync(path.join(repoRoot, p)).size }));
}

/**
 * Guard for the publish step: logs the day's image bytes and throws before anything is
 * committed if they exceed the budget. Failing loudly is the point; a silent regression to
 * PNG is what grew the repo to 5.5 GB in the first place.
 */
export function assertImageBudget(repoRoot: string): BudgetResult {
  const result = checkImageBudget(newImageFiles(repoRoot));
  console.log(result.message);
  if (!result.ok) throw new Error(result.message);
  return result;
}
