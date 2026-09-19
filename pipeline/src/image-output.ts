// Output format, dimensions, and size budget for Digest images.
//
// Why this file exists (DECISIONS.md D16): until 2026-09-16 the pipeline asked gpt-image-1
// for its default output, a lossless 1536x1024 PNG of 2-5 MB, and committed ~25 of them a
// day. The repo tree reached 5.5 GB, 99.7% of it those PNGs, and Vercel's `--depth=10`
// clone of that tree took 42 minutes and blew the 45-minute Hobby build limit. Visitors
// never receive the source file (Astro serves 20-450 KB WebP derivatives), so the source
// is requested as compressed WebP instead.
//
// Since 2026-09-19 (D18) the stored source is also smaller: gpt-image-1 only offers
// 1024x1024, 1536x1024, and 1024x1536, so the API is still asked for 1536x1024, and the
// result is resized in memory to the 1200x800 standard before it is written. The largest
// derivative any template asks for is 1200px (hero widths top out at 1600 but Astro never
// upscales, and InlineFigure's 1536 candidate is dropped for a 1200px source), so pixels
// above 1200 were never served. Pure helpers live here so they can be unit tested without
// loading the LLM/yaml stack.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

export const IMAGE_MODEL = 'gpt-image-1';
/** Size requested from the Images API. The only landscape size gpt-image-1 offers; see IMAGE_WIDTH. */
export const IMAGE_SIZE = '1536x1024';
/** File extension and gpt-image-1 `output_format`. */
export const IMAGE_FORMAT = 'webp' as const;
/** WebP quality: gpt-image-1 `output_compression` for the API response and `sharp` quality for the stored file. */
export const IMAGE_COMPRESSION = 80;
/** Standard stored dimensions for hero and inline artwork (3:2, same ratio as IMAGE_SIZE). */
export const IMAGE_WIDTH = 1200;
export const IMAGE_HEIGHT = 800;
/** No standard blog asset may be wider than this; the templates never request a larger derivative. */
export const MAX_IMAGE_WIDTH = 1200;

/**
 * Escape hatch for an asset that genuinely needs other dimensions or another format (for
 * example a tall diagram that must not be cropped to 3:2). Key: repo-relative path exactly as
 * `git ls-files` prints it. Value: one-line reason. An exempted file skips the dimension and
 * format checks but still counts toward the byte budget. Adding an entry is a reviewed code
 * change on purpose; there is no environment-variable bypass.
 */
export const IMAGE_ASSET_EXEMPTIONS: Record<string, string> = {
  // 'src/assets/blog/<slug>/inline-2.webp': 'portrait flowchart; cropping to 3:2 would cut the legend',
};

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

/**
 * Resize a generated image to the stored standard (IMAGE_WIDTH x IMAGE_HEIGHT WebP at
 * IMAGE_COMPRESSION). Works entirely in memory: no PNG or other intermediate touches disk.
 * The API output is 3:2 already, so `cover` only ever scales; it would crop, not letterbox,
 * if the ratio ever differed.
 */
export async function normalizeImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'cover', position: 'centre' })
    .webp({ quality: IMAGE_COMPRESSION })
    .toBuffer();
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

/** A new image with what `sharp` read from its bytes (undefined when unreadable). */
export interface NewImageInfo extends NewImage {
  format?: string;
  width?: number;
  height?: number;
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

// --- Format and dimension guard (D18) ------------------------------------------------

export interface AssetCheckResult {
  ok: boolean;
  problems: string[];
  exempted: string[];
  message: string;
}

/**
 * Pure check of new blog assets: every file must be WebP (by extension and by content) and
 * standard artwork must be exactly IMAGE_WIDTH x IMAGE_HEIGHT; anything wider than
 * MAX_IMAGE_WIDTH is flagged. Paths listed in `exemptions` skip these rules.
 */
export function checkImageAssets(
  files: NewImageInfo[],
  exemptions: Record<string, string> = IMAGE_ASSET_EXEMPTIONS,
): AssetCheckResult {
  const problems: string[] = [];
  const exempted: string[] = [];
  for (const f of files) {
    if (f.path in exemptions) {
      exempted.push(`${f.path} (${exemptions[f.path]})`);
      continue;
    }
    const ext = path.extname(f.path).toLowerCase();
    if (ext !== `.${IMAGE_FORMAT}` || (f.format && f.format !== IMAGE_FORMAT)) {
      problems.push(`${f.path}: not ${IMAGE_FORMAT} (extension ${ext || 'none'}, content ${f.format ?? 'unreadable'})`);
      continue;
    }
    if (f.width === undefined || f.height === undefined) {
      problems.push(`${f.path}: dimensions unreadable`);
      continue;
    }
    if (f.width > MAX_IMAGE_WIDTH) {
      problems.push(`${f.path}: ${f.width}x${f.height} is wider than ${MAX_IMAGE_WIDTH}px`);
      continue;
    }
    if (f.width !== IMAGE_WIDTH || f.height !== IMAGE_HEIGHT) {
      problems.push(`${f.path}: ${f.width}x${f.height} is not the ${IMAGE_WIDTH}x${IMAGE_HEIGHT} standard`);
    }
  }
  const ok = problems.length === 0;
  const message = ok
    ? `[images] ${files.length - exempted.length} new image(s) are ${IMAGE_WIDTH}x${IMAGE_HEIGHT} ${IMAGE_FORMAT}` +
      (exempted.length ? `; ${exempted.length} exempted: ${exempted.join(', ')}` : '')
    : `[images] asset check failed: ${problems.join('; ')}. New artwork must be ${IMAGE_WIDTH}x${IMAGE_HEIGHT} ` +
      `${IMAGE_FORMAT} (normalizeImage in image-output.ts); a file that genuinely needs other dimensions ` +
      `must be listed in IMAGE_ASSET_EXEMPTIONS with a reason.`;
  return { ok, problems, exempted, message };
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

/** newImageFiles plus format and pixel dimensions read from the bytes. */
export async function inspectNewImages(repoRoot: string): Promise<NewImageInfo[]> {
  const out: NewImageInfo[] = [];
  for (const f of newImageFiles(repoRoot)) {
    try {
      const m = await sharp(path.join(repoRoot, f.path)).metadata();
      out.push({ ...f, format: m.format, width: m.width, height: m.height });
    } catch {
      out.push(f);
    }
  }
  return out;
}

/**
 * Guard for the publish step: logs the day's image bytes and dimensions and throws before
 * anything is committed if they exceed the budget or break the format/dimension standard.
 * Failing loudly is the point; a silent regression to PNG is what grew the repo to 5.5 GB
 * in the first place.
 */
export async function assertImageBudget(repoRoot: string): Promise<BudgetResult> {
  const files = await inspectNewImages(repoRoot);
  const budget = checkImageBudget(files);
  const assets = checkImageAssets(files);
  console.log(budget.message);
  console.log(assets.message);
  const failures = [budget, assets].filter((r) => !r.ok).map((r) => r.message);
  if (failures.length) throw new Error(failures.join('\n'));
  return budget;
}
