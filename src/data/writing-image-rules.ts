// Rules for choosing a Writing essay's cover image (the /writing/ thumbnail and the social
// preview). Pure string functions so they can be unit-tested with plain `node --test`;
// the Astro-side glue that reads files and resolves assets lives in writing-images.ts.
//
// Order of preference, per the publishing rule in AGENTS.md:
//   1. the essay's declared image (writing.ts `image`), provided the page displays it;
//   2. otherwise the first content image inside an `essay-figure` on the page;
//   3. otherwise nothing: the essay is listed text-only and the build prints a warning.

export interface InlineImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

/** Interface imagery that must never become a thumbnail, matched on the image path. */
const DECORATIVE = /(avatar|headshot|logo|badge|icon|favicon|sprite)/i;

/**
 * True when the page source displays the declared image: either through the shared
 * <EssayFigure> component (which always renders the declared image) or by referencing the
 * file directly.
 */
export function pageDisplaysImage(source: string, file: string): boolean {
  return source.includes('<EssayFigure') || source.includes(file);
}

const attr = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

const num = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * First content image displayed inside an `essay-figure` in the page source. Only figures
 * count: avatars, logos, badges, icons, and other chrome never sit in an essay figure, and
 * the DECORATIVE guard catches a stray one that does.
 */
export function firstInlineImage(source: string): InlineImage | null {
  const figures =
    source.match(/<figure\b[^>]*\bclass="[^"]*\bessay-figure\b[^"]*"[^>]*>[\s\S]*?<\/figure>/g) ?? [];
  for (const figure of figures) {
    const img = figure.match(/<img\b[^>]*>/)?.[0];
    if (!img) continue;
    const src = attr(img, 'src');
    if (!src || DECORATIVE.test(src)) continue;
    return { src, alt: attr(img, 'alt') ?? '', width: num(attr(img, 'width')), height: num(attr(img, 'height')) };
  }
  return null;
}
