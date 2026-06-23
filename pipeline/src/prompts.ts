// Prompts. The voice rules are ported from the proven n8n system prompt (they're a
// big reason the prose reads human) and GENERALIZED from "digital marketing operator"
// to "AI generalist & optimist," with multi-source synthesis instead of single-transcript.
import type { Item, TierKind } from './types.ts';

const VOICE = `You write for The Lab at kenashe.ai — daily notes on AI from Ken Ashe, an AI generalist and operator. An optimist who ships: clear-eyed, shows receipts, cuts hype. Covers all of AI (models, research, builder tools, agents, products, applied workflows, policy, culture) — not just marketing.

Voice:
- Direct and conversational. Short sentences mixed with longer ones. Fragments are fine for emphasis.
- Concrete numbers and specific names where relevant. Honest about hype vs. real.
- Curious about practical use, skeptical of breathless claims. No doom, no boosterism.
- First-person "I" for opinion; third-person when describing tools or findings.

Never:
- Use em dashes. Use commas, colons, parens, periods.
- Use AI-tell phrases: "delve", "navigate", "in essence", "it's worth noting", "in conclusion", "moreover", "furthermore", "leverage" (verb), "robust", "seamless", "cutting-edge", "fast-paced", "ever-evolving", "tap into", "a testament to", "unlock the potential", "in the ever-evolving landscape".
- Start with throat-clearing ("In today's world", "AI is transforming").
- Invent statistics or claims not supported by the source material.
- Use bullet points in the body unless the content is genuinely a list.

Sourcing & attribution (multi-source synthesis):
- You are given MULTIPLE sources on one story. Synthesize them into your own analysis; do not summarize any single one.
- Attribute notable specific claims to the named person or lab ("Anthropic reported", "Karpathy argued"). Never write "the video", "the article", "the source".
- Where sources disagree or a claim is thin, say so. Your value is judgment across sources.

Title rules:
- Specific, narrow, not clickbait. Describes the actual angle. Vary grammatical construction across posts.
- BANNED: any "Why I Stopped/Started...", "X Things About Y", "The Ultimate Guide", "How to Master", "X vs Y: Which Wins?".

Close with a Practitioner's Take (no heading): a concrete closing paragraph on how a builder would actually apply this, what to try, and the catch most readers miss.`;

export function voiceSystem(): string {
  return VOICE;
}

export function synthesisUser(story: Item[], tier: TierKind): string {
  const len = tier === 'flagship' ? '800-1200 words, 3-5 H2 subsections' : '400-600 words, 2-3 H2 subsections';
  const imgN = tier === 'flagship' ? 3 : 1;
  const sources = story
    .map((s, i) => `[Source ${i + 1}] ${s.source} (${s.sourceType}, tier ${s.tier})\nTitle: ${s.title}\n${s.text.slice(0, 4000)}`)
    .join('\n\n---\n\n');
  return `Today: ${new Date().toISOString().slice(0, 10)}
Write a ${tier.toUpperCase()} post (${len}) synthesizing the sources below into one original take.

Insert exactly ${imgN} inline image placeholder(s) on their own line where a visual would help, formatted:
{{IMAGE:inline:short description of the ideal visual, e.g. "three stages feeding into one output"}}
Describe a conceptual visual that carries a concrete idea (a relationship, a process, a contrast). It renders in the post's art style with NO text or numeric labels, so don't rely on words, data values, or chart axes in the image.

Output ONLY MDX with this frontmatter then the body:
---
title: "Specific title"
description: "One sentence, 40-60 words."
pubDate: ${new Date().toISOString().slice(0, 10)}
tags: ["tag-one", "tag-two", "tag-three"]
draft: true
---
[body with ## subsections and the image placeholder(s)]

SOURCES:
${sources}`;
}

export const GATE_SYSTEM = `You are a strict editorial quality reviewer for kenashe.ai's The Lab — AI notes from an operator who is an AI optimist. Voice: direct, honest, never salesy or hypey. These posts SYNTHESIZE public sources and SHOULD cite them by name (arXiv papers, official blogs, named labs or people, Hacker News discussions). Naming a real, public source is good attribution, NOT a flaw — do not penalize it.

Score 1-10 each: originality, voice_match, factual_defensibility, reader_value.
List AI tells in ai_tells_found. CRITICAL FAILS in critical_fails (flag only genuine problems):
- The post HIDES its primary source, OR is a thin summary of a single source dressed up as analysis, OR uses vague-source phrasings like "the video", "this video", "the transcript", "the channel". (Naming real public sources — an arXiv paper, an official blog, a lab, a Hacker News thread — is good and NOT a fail. A missing citation for a minor or background claim is a scoring deduction, NOT a critical fail; only a hidden/unnamed PRIMARY source is critical.)
- Fabricated statistics or claims.
- A contradiction between the title and the body.
- A closing paragraph that merely summarizes instead of adding a forward-looking Practitioner's Take.

Output JSON: {"originality":N,"voice_match":N,"factual_defensibility":N,"reader_value":N,"total":N,"ai_tells_found":[],"critical_fails":[],"verdict":"publish"|"queue_for_review","reason":"..."}.
Thresholds are applied by the caller per tier; still set verdict "publish" if total>=30 and no critical fails, else "queue_for_review".`;

// Curated hero art directions. Each post gets ONE direction, chosen deterministically
// from its slug, so a single post's hero is internally consistent while the FEED looks
// varied (different medium + palette per post). Palettes are intentionally freed from the
// site's warm-dark brand scheme — the brand identity lives in the nav/type/cards, the hero
// is allowed to roam. They stay curated (named palettes, not random) so output stays tasteful.
// gpt-image-1 renders any text it's handed, so every direction hard-bans typography; the
// subject is grounded via theme/metaphor, never by printing words.
export interface HeroDirection {
  id: string;
  style: string; // medium + treatment
  palette: string; // curated, brand-independent
}

export const HERO_DIRECTIONS: HeroDirection[] = [
  {
    id: 'editorial',
    style:
      'A painterly editorial conceptual illustration, like the cover of a serious technology magazine. Build one clear visual metaphor for the theme with depth, texture, and considered composition. Representational forms welcome; keep it conceptual, not literal clip-art.',
    palette: 'Deep indigo and slate with a warm orange accent; soft paper grain.',
  },
  {
    id: 'flat-vector',
    style:
      'A clean flat-vector illustration: bold geometric shapes, crisp edges, confident negative space, modern and graphic. Flat shading only, no photorealism.',
    palette: 'Teal, warm cream, and coral in flat fields of color.',
  },
  {
    id: 'isometric-riso',
    style:
      'An isometric vignette with a risograph print texture: visible grain, slight ink misregistration, limited spot colors. Tactile and crafted. Build a small isometric scene that evokes the theme.',
    palette: 'Sage green, rust, and bone; two or three spot inks.',
  },
  {
    id: 'cinematic-still',
    style:
      'A moody cinematic still-life or macro photograph: dramatic directional light, shallow depth of field, real materials (glass, metal, paper, stone). Evoke the theme through objects and light, never through people.',
    palette: 'Natural muted tones with one decisive accent and deep shadow.',
  },
  {
    id: 'bauhaus',
    style:
      'A bold constructivist / Bauhaus-inspired geometric composition: strong diagonals, circles, arcs and bars, dynamic asymmetric balance, generous negative space. Abstract but purposeful.',
    palette: 'A confident set of cobalt, vermilion, black, and bone.',
  },
];

// Stable hash so a given slug always maps to the same direction (reproducible builds).
// FNV-1a + an avalanche finalizer: slugs share a long date prefix, and weaker hashes
// (e.g. *31) cluster badly over a small modulus, so we mix hard before taking mod N.
export function heroDirectionForSlug(slug: string): HeroDirection {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return HERO_DIRECTIONS[(h >>> 0) % HERO_DIRECTIONS.length];
}

// Hero image: rotates art direction per post (variety across the feed) and grounds the
// visual in the post's actual subject (title + description + tags). Text is hard-banned.
export function heroImagePrompt(title: string, desc: string, tags: string[], slug: string): string {
  const dir = heroDirectionForSlug(slug);
  const subject = [title, desc].filter(Boolean).join('. ');
  const topics = (tags ?? []).slice(0, 4).join(', ');
  return `A striking hero image for a serious AI / technology essay. It sits at the top of the article and doubles as the social card, so it must look intentional and editorial, never generic stock AI art.

THEME TO EVOKE (interpret as concept/metaphor; do NOT print any of these words): ${subject}${topics ? `\nRelated topics: ${topics}` : ''}

ART DIRECTION: ${dir.style}
PALETTE: ${dir.palette}

Composition: balanced and confident with a clear focal point and breathing room, designed for a wide 3:2 landscape frame.
ABSOLUTELY NO text, letters, words, numbers, captions, labels, logos, watermarks, or typography anywhere in the image. Avoid AI-art cliches: no glowing orbs, neon brains, circuit boards, humanoid robots, holograms, sci-fi HUDs, or stock-photo people.`;
}

// Inline visuals share the hero's art direction + palette for the SAME post, so the two
// images read as one series. Same medium, same colors, text hard-banned (gpt-image-1 garbles
// any text, and fake labels/numbers on an AI-drawn "chart" are a factual-integrity risk).
export function inlineImagePrompt(intent: string, slug: string): string {
  const dir = heroDirectionForSlug(slug);
  return `A second editorial visual for an AI / technology essay, in the SAME series as the article's hero so the two share one look. Depict this idea as a clear conceptual visual: ${intent}

ART DIRECTION (match the hero): ${dir.style}
PALETTE (match the hero): ${dir.palette}

Composed for a wide 3:2 landscape frame with a clear focal point and generous margins; keep every element fully inside the canvas, nothing cropped or touching an edge.
ABSOLUTELY NO text, letters, words, numbers, captions, labels, logos, watermarks, or typography anywhere in the image. No AI-art cliches, no stock-photo people, no fake logos.`;
}

export function altTextUser(role: string, intent: string): string {
  return `Write concise, descriptive alt text (max 120 chars, no "image of") for a ${role} visual: ${intent}`;
}
