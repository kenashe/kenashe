import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  imageRequestBody,
  imageFileName,
  checkImageBudget,
  checkImageAssets,
  validateGeneratedImage,
  probeImage,
  IMAGE_MODEL,
  IMAGE_FORMAT,
  IMAGE_COMPRESSION,
  IMAGE_QUALITY,
  IMAGE_SIZE,
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
  MAX_NEW_IMAGE_BYTES,
  MAX_SINGLE_IMAGE_BYTES,
} from '../src/image-output.ts';

test('the Images API request asks gpt-image-2 for 1200x800 compressed WebP, never the default lossless PNG', () => {
  const body = imageRequestBody('a hero illustration');
  assert.equal(body.model, 'gpt-image-2');
  assert.equal(IMAGE_MODEL, 'gpt-image-2');
  assert.equal(body.size, '1200x800');
  assert.equal(body.size, IMAGE_SIZE);
  assert.equal(body.n, 1);
  assert.equal(body.quality, 'low', 'pinned explicitly (D18); the omitted default resolved to low in the pilot');
  assert.equal(body.quality, IMAGE_QUALITY);
  assert.equal(body.output_format, 'webp');
  assert.equal(IMAGE_FORMAT, 'webp');
  assert.ok(body.output_compression >= 60 && body.output_compression <= 90, 'compression in a sane range');
  assert.equal(body.output_compression, IMAGE_COMPRESSION);
  assert.equal(body.prompt, 'a hero illustration');
});

test('file names follow the output format', () => {
  assert.equal(imageFileName('hero'), 'hero.webp');
  assert.equal(imageFileName('inline', 1), 'inline-1.webp');
  assert.equal(imageFileName('inline', 3), 'inline-3.webp');
  assert.throws(() => imageFileName('inline'));
  assert.doesNotMatch(imageFileName('hero'), /\.png$/);
});

// --- D18: stored standard is 1200x800 WebP, requested directly ------------------------

test('the stored standard is 1200x800 (3:2), the request size derives from it, and nothing may be wider', () => {
  assert.equal(IMAGE_WIDTH, 1200);
  assert.equal(IMAGE_HEIGHT, 800);
  assert.equal(IMAGE_WIDTH / IMAGE_HEIGHT, 3 / 2);
  assert.equal(IMAGE_SIZE, `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
  assert.equal(MAX_IMAGE_WIDTH, IMAGE_WIDTH);
});

/** Synthetic stand-ins for API responses. */
async function synth(width: number, height: number, format: 'webp' | 'png' | 'jpeg' = 'webp'): Promise<Buffer> {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 90 } } });
  if (format === 'png') return img.png().toBuffer();
  if (format === 'jpeg') return img.jpeg().toBuffer();
  return img.webp({ quality: 80 }).toBuffer();
}

test('validateGeneratedImage passes a 1200x800 WebP through untouched (same bytes, no re-encode)', async () => {
  const src = await synth(1200, 800);
  const out = await validateGeneratedImage(src, 'test');
  assert.ok(out.equals(src), 'buffer must be returned byte-for-byte');
  assert.deepEqual(await probeImage(out), { format: 'webp', width: 1200, height: 800 });
});

test('validateGeneratedImage fails closed on the old 1536x1024 size instead of resizing it', async () => {
  await assert.rejects(validateGeneratedImage(await synth(1536, 1024), 'hero'), /hero: API returned webp 1536x1024, expected webp 1200x800/);
});

test('validateGeneratedImage fails closed on PNG or JPEG bytes even at the right size', async () => {
  await assert.rejects(validateGeneratedImage(await synth(1200, 800, 'png')), /returned png 1200x800/);
  await assert.rejects(validateGeneratedImage(await synth(1200, 800, 'jpeg')), /returned jpeg 1200x800/);
});

test('validateGeneratedImage fails closed on bytes that are not an image at all', async () => {
  await assert.rejects(validateGeneratedImage(Buffer.from('not an image')), /returned unreadable \?x\?/);
});

test('checkImageAssets accepts a normal day of 1200x800 WebP files', () => {
  const files = Array.from({ length: 25 }, (_, i) => ({
    path: `src/assets/blog/p${i}/${i % 2 ? 'hero' : 'inline-1'}.webp`, bytes: 120_000, format: 'webp', width: 1200, height: 800,
  }));
  const r = checkImageAssets(files, {});
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
  assert.match(r.message, /25 new image\(s\) are 1200x800 webp/);
});

test('checkImageAssets flags PNG and JPEG blog assets by extension and by content', () => {
  const r = checkImageAssets(
    [
      { path: 'src/assets/blog/a/hero.png', bytes: 2_600_000, format: 'png', width: 1536, height: 1024 },
      { path: 'src/assets/blog/a/inline-1.jpg', bytes: 300_000, format: 'jpeg', width: 1200, height: 800 },
      { path: 'src/assets/blog/a/inline-2.webp', bytes: 300_000, format: 'png', width: 1200, height: 800 }, // renamed PNG
      { path: 'src/assets/blog/a/inline-3.webp', bytes: 100_000, format: 'webp', width: 1200, height: 800 },
    ],
    {},
  );
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 3);
  assert.match(r.problems[0], /hero\.png: not webp/);
  assert.match(r.problems[1], /inline-1\.jpg: not webp/);
  assert.match(r.problems[2], /inline-2\.webp: not webp .*content png/);
  assert.match(r.message, /IMAGE_ASSET_EXEMPTIONS/);
});

test('checkImageAssets flags the old 1536 standard, anything wider than 1200, and off-standard sizes', () => {
  const r = checkImageAssets(
    [
      { path: 'src/assets/blog/b/hero.webp', bytes: 200_000, format: 'webp', width: 1536, height: 1024 },
      { path: 'src/assets/blog/b/inline-1.webp', bytes: 200_000, format: 'webp', width: 1200, height: 900 },
      { path: 'src/assets/blog/b/inline-2.webp', bytes: 200_000, format: 'webp', width: 1200, height: 800 },
      { path: 'src/assets/blog/b/inline-3.webp', bytes: 200_000, format: 'webp' },
    ],
    {},
  );
  assert.equal(r.ok, false);
  assert.deepEqual(
    r.problems.map((p) => p.split(': ')[1]),
    ['1536x1024 is wider than 1200px', '1200x900 is not the 1200x800 standard', 'dimensions unreadable'],
  );
});

test('an exemption waives only the exact 1200x800 rule, for that path only', () => {
  const tall = { path: 'src/assets/blog/c/inline-1.webp', bytes: 200_000, format: 'webp', width: 800, height: 1400 };
  const twin = { ...tall, path: 'src/assets/blog/c/inline-2.webp' };
  const exemptions = { [tall.path]: 'portrait flowchart; 3:2 would cut the legend' };
  const r = checkImageAssets([tall, twin], exemptions);
  assert.equal(r.ok, false, 'the un-exempted twin still fails');
  assert.deepEqual(r.problems.map((p) => p.split(':')[0]), [twin.path]);
  assert.equal(r.exempted.length, 1);
  assert.match(r.exempted[0], /800x1400 \(portrait flowchart/);
  const alone = checkImageAssets([tall], exemptions);
  assert.equal(alone.ok, true);
  assert.match(alone.message, /1 exempted from the exact size/);
});

test('an exemption never waives the WebP format or the 1200px maximum width', () => {
  const png = { path: 'src/assets/blog/d/inline-1.png', bytes: 900_000, format: 'png', width: 800, height: 1400 };
  const renamed = { path: 'src/assets/blog/d/inline-2.webp', bytes: 300_000, format: 'jpeg', width: 1200, height: 800 };
  const wide = { path: 'src/assets/blog/d/inline-3.webp', bytes: 300_000, format: 'webp', width: 1536, height: 1024 };
  const exemptions = Object.fromEntries([png, renamed, wide].map((f) => [f.path, 'trying to sneak past']));
  const r = checkImageAssets([png, renamed, wide], exemptions);
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 3);
  assert.equal(r.exempted.length, 0);
  assert.match(r.problems[0], /not webp/);
  assert.match(r.problems[1], /not webp .*content jpeg/);
  assert.match(r.problems[2], /wider than 1200px/);
  assert.match(r.message, /never the webp format or the 1200px maximum width/);
});

test('the byte budget is enforced independently of exemptions', () => {
  const exempt = { path: 'src/assets/blog/e/inline-1.webp', bytes: MAX_SINGLE_IMAGE_BYTES + 1, format: 'webp', width: 800, height: 1400 };
  assert.equal(checkImageAssets([exempt], { [exempt.path]: 'tall' }).ok, true, 'size rule waived');
  assert.equal(checkImageBudget([exempt]).ok, false, 'budget still fails');
});

test('checkImageAssets passes trivially on an image-less day', () => {
  assert.equal(checkImageAssets([], {}).ok, true);
});

// --- D16: byte budget (unchanged) -----------------------------------------------------

test('a normal WebP day passes the budget', () => {
  const files = Array.from({ length: 25 }, (_, i) => ({ path: `src/assets/blog/p${i}/hero.webp`, bytes: 300 * 1024 }));
  const r = checkImageBudget(files);
  assert.equal(r.ok, true);
  assert.equal(r.offenders.length, 0);
  assert.match(r.message, /within budget/);
});

test('a PNG-sized day fails the budget on total and on single files', () => {
  const files = Array.from({ length: 25 }, (_, i) => ({ path: `src/assets/blog/p${i}/hero.png`, bytes: 2_600_000 }));
  const r = checkImageBudget(files);
  assert.equal(r.ok, false);
  assert.ok(r.total > MAX_NEW_IMAGE_BYTES);
  assert.equal(r.offenders.length, 25);
  assert.match(r.message, /budget exceeded/);
  assert.match(r.message, /output_format/);
});

test('one oversized file fails even when the total is fine', () => {
  const files = [
    { path: 'src/assets/blog/a/hero.webp', bytes: 200 * 1024 },
    { path: 'src/assets/blog/a/inline-1.webp', bytes: MAX_SINGLE_IMAGE_BYTES + 1 },
  ];
  const r = checkImageBudget(files);
  assert.equal(r.ok, false);
  assert.deepEqual(r.offenders.map((f) => f.path), ['src/assets/blog/a/inline-1.webp']);
});

test('an image-less day passes trivially', () => {
  assert.equal(checkImageBudget([]).ok, true);
});
