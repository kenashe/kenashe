import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  imageRequestBody,
  imageFileName,
  checkImageBudget,
  IMAGE_FORMAT,
  IMAGE_COMPRESSION,
  IMAGE_SIZE,
  MAX_NEW_IMAGE_BYTES,
  MAX_SINGLE_IMAGE_BYTES,
} from '../src/image-output.ts';

test('the Images API request asks for compressed WebP, never the default lossless PNG', () => {
  const body = imageRequestBody('a hero illustration');
  assert.equal(body.model, 'gpt-image-1');
  assert.equal(body.size, IMAGE_SIZE);
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
