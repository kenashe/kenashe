import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  imageRequestBody,
  imageFileName,
  checkImageBudget,
  checkImageAssets,
  normalizeImage,
  IMAGE_FORMAT,
  IMAGE_COMPRESSION,
  IMAGE_SIZE,
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
  MAX_NEW_IMAGE_BYTES,
  MAX_SINGLE_IMAGE_BYTES,
} from '../src/image-output.ts';

test('the Images API request asks for compressed WebP, never the default lossless PNG', () => {
  const body = imageRequestBody('a hero illustration');
  assert.equal(body.model, 'gpt-image-1');
  assert.equal(body.size, IMAGE_SIZE);
  assert.equal(body.size, '1536x1024', 'the only landscape size gpt-image-1 offers; the file is resized afterwards');
  assert.equal(body.n, 1);
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

// --- D18: stored standard is 1200x800 WebP -------------------------------------------

test('the stored standard is 1200x800, 3:2 like the API size, and never wider than the widest derivative', () => {
  assert.equal(IMAGE_WIDTH, 1200);
  assert.equal(IMAGE_HEIGHT, 800);
  assert.equal(IMAGE_WIDTH / IMAGE_HEIGHT, 1536 / 1024);
  assert.equal(MAX_IMAGE_WIDTH, 1200);
});

/** A synthetic stand-in for the API response: a 1536x1024 image with a flat background and a hard-edged band. */
async function fakeApiImage(format: 'webp' | 'png' = 'webp'): Promise<Buffer> {
  const img = sharp({
    create: { width: 1536, height: 1024, channels: 3, background: { r: 30, g: 120, b: 90 } },
  }).composite([
    { input: { create: { width: 400, height: 1024, channels: 3, background: { r: 230, g: 90, b: 40 } } }, left: 568, top: 0 },
  ]);
  return format === 'webp' ? img.webp({ quality: 80 }).toBuffer() : img.png().toBuffer();
}

test('normalizeImage turns the 1536x1024 API response into 1200x800 WebP without touching disk', async () => {
  const src = await fakeApiImage();
  const out = await normalizeImage(src);
  const m = await sharp(out).metadata();
  assert.equal(m.format, 'webp');
  assert.equal(m.width, 1200);
  assert.equal(m.height, 800);
  assert.ok(out.length < src.length, `resized file (${out.length} B) should be smaller than the source (${src.length} B)`);
  // Content survives: the orange band still sits in the middle after scaling (no crop, no letterbox).
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  const red = (x: number, y: number) => data[(y * info.width + x) * info.channels];
  assert.ok(red(600, 400) > 180, 'centre pixel is the orange band');
  assert.ok(red(100, 400) < 100, 'left pixel is the green background');
  assert.ok(red(1100, 400) < 100, 'right pixel is the green background');
});

test('normalizeImage also converts a PNG response, so a format regression upstream cannot reach disk', async () => {
  const m = await sharp(await normalizeImage(await fakeApiImage('png'))).metadata();
  assert.equal(m.format, 'webp');
  assert.equal(m.width, 1200);
  assert.equal(m.height, 800);
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

test('an explicit exemption with a reason skips the format/dimension rules for that path only', () => {
  const files = [
    { path: 'src/assets/blog/c/inline-1.webp', bytes: 200_000, format: 'webp', width: 800, height: 1400 },
    { path: 'src/assets/blog/c/inline-2.webp', bytes: 200_000, format: 'webp', width: 800, height: 1400 },
  ];
  const exemptions = { 'src/assets/blog/c/inline-1.webp': 'portrait flowchart; cropping to 3:2 would cut the legend' };
  const r = checkImageAssets(files, exemptions);
  assert.equal(r.ok, false, 'the un-exempted twin still fails');
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /inline-2\.webp/);
  assert.equal(r.exempted.length, 1);
  assert.match(r.exempted[0], /portrait flowchart/);
  assert.equal(checkImageAssets([files[0]], exemptions).ok, true);
  assert.match(checkImageAssets([files[0]], exemptions).message, /1 exempted/);
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
