// Build-time resolution of each Writing essay's cover image. This is the single place the
// /writing/ index, the essay pages (via <EssayFigure>), and the social/schema image all read
// from, so publishing an essay with an `image` field, or changing that field, updates its
// thumbnail and previews with no separate index edit.
//
// Image files live in src/assets/writing/ so astro:assets can emit sized, optimized
// derivatives with explicit dimensions. The rules themselves are in writing-image-rules.ts.
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Essay } from './writing';
import { firstInlineImage, pageDisplaysImage } from './writing-image-rules';

const assets = import.meta.glob<ImageMetadata>('../assets/writing/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

export type EssayCover =
  | { kind: 'asset'; image: ImageMetadata; alt: string; caption?: string }
  | { kind: 'inline'; src: string; alt: string; width?: number; height?: number };

/** The declared image file as an astro:assets import. Fails the build if the file is missing. */
export function assetFor(essay: Essay): ImageMetadata {
  if (!essay.image) {
    throw new Error(`[writing] "${essay.slug}" has no image field in src/data/writing.ts`);
  }
  const image = assets[`../assets/writing/${essay.image.file}`];
  if (!image) {
    throw new Error(
      `[writing] "${essay.slug}" declares image "${essay.image.file}" but src/assets/writing/${essay.image.file} does not exist`,
    );
  }
  return image;
}

function pageSource(essay: Essay): string {
  const path = resolve(process.cwd(), 'src/pages/writing', essay.slug, 'index.astro');
  if (!existsSync(path)) {
    throw new Error(`[writing] "${essay.slug}" is listed in src/data/writing.ts but ${path} does not exist`);
  }
  return readFileSync(path, 'utf8');
}

/**
 * The image /writing/ shows for an essay, or null for a text-only listing. A declared image
 * the page does not actually display is a publishing error and fails the build; an essay
 * with no image at all is allowed but flagged in the build log.
 */
export function coverOf(essay: Essay): EssayCover | null {
  const source = pageSource(essay);
  if (essay.image) {
    if (!pageDisplaysImage(source, essay.image.file)) {
      throw new Error(
        `[writing] "${essay.slug}" declares image "${essay.image.file}" but its page never displays it. ` +
          `Render <EssayFigure essay={essay} /> in the page, or remove the image field.`,
      );
    }
    return { kind: 'asset', image: assetFor(essay), alt: essay.image.alt, caption: essay.image.caption };
  }
  const inline = firstInlineImage(source);
  if (inline) return { kind: 'inline', ...inline };
  console.warn(
    `[writing] WARNING: "${essay.slug}" has no suitable image. /writing/ lists it text-only. ` +
      `Add an image to src/assets/writing/ and an image field in src/data/writing.ts.`,
  );
  return null;
}

export interface OgImage {
  src: string; // site-relative
  width: number;
  height: number;
}

/** A 1200px-wide derivative of the cover for og:image, twitter:image, and Article.image. */
export async function ogImageOf(essay: Essay): Promise<OgImage | null> {
  const cover = coverOf(essay);
  if (!cover) return null;
  if (cover.kind === 'inline') {
    return cover.width && cover.height
      ? { src: cover.src, width: cover.width, height: cover.height }
      : null;
  }
  const width = Math.min(1200, cover.image.width);
  const height = Math.round((width * cover.image.height) / cover.image.width);
  const out = await getImage({ src: cover.image, width, height, format: 'jpg' });
  return { src: out.src, width, height };
}
