// Run: node --experimental-strip-types --test src/data/writing-image-rules.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageDisplaysImage, firstInlineImage } from './writing-image-rules.ts';

test('a page that renders <EssayFigure> displays the declared image', () => {
  assert.equal(pageDisplaysImage('<header/>\n<EssayFigure essay={essay} priority />', 'x.jpg'), true);
});

test('a page that references the file directly also counts', () => {
  assert.equal(pageDisplaysImage('<img src="/images/writing/x.jpg" />', 'x.jpg'), true);
});

test('a page that shows neither does not display the declared image', () => {
  assert.equal(pageDisplaysImage('<p>text only</p>', 'x.jpg'), false);
});

test('first inline image comes from an essay-figure, with its dimensions', () => {
  const source = `
    <img src="/images/ken-ashe.jpeg" alt="headshot" />
    <figure class="essay-figure">
      <img
        src="/images/writing/a.jpg"
        alt="First figure"
        width="1024"
        height="559"
      />
    </figure>
    <figure class="essay-figure"><img src="/images/writing/b.jpg" alt="Second" /></figure>`;
  assert.deepEqual(firstInlineImage(source), {
    src: '/images/writing/a.jpg',
    alt: 'First figure',
    width: 1024,
    height: 559,
  });
});

test('decorative images inside a figure are skipped', () => {
  const source = `
    <figure class="essay-figure"><img src="/images/logo.svg" alt="" /></figure>
    <figure class="essay-figure"><img src="/images/writing/real.jpg" alt="Real" /></figure>`;
  assert.equal(firstInlineImage(source)?.src, '/images/writing/real.jpg');
});

test('no figure means no inline image', () => {
  assert.equal(firstInlineImage('<p>words</p><img src="/images/writing/loose.jpg" alt="" />'), null);
});
