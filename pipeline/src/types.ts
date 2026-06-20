export type SourceType = 'rss' | 'youtube' | 'arxiv' | 'github_releases' | 'hackernews' | 'reddit';
export type TierKind = 'flagship' | 'note';
export type SparseVec = Map<string, number>;
export type Vec = SparseVec | number[];

export interface SourceConfig {
  name: string;
  type: SourceType;
  tier: 1 | 2;
  weight: number;
  [k: string]: unknown;
}

export interface Item {
  id: string; // stable source id (url/guid) — exact-dup key
  source: string;
  sourceType: SourceType;
  tier: 1 | 2;
  weight: number;
  url: string;
  title: string;
  text: string; // article body / transcript / abstract
  publishedAt: string; // ISO
}

export interface Story {
  key: string; // hash of member ids
  items: Item[];
  vec: Vec;
  score: number;
  tier: TierKind;
}

export interface ImageAsset {
  role: 'hero' | 'inline' | 'diagram';
  path: string; // repo-relative, e.g. src/assets/blog/<slug>/hero.png
  alt: string;
  prompt?: string;
}

export interface DraftPost {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  tags: string[];
  draft: boolean;
  body: string;
  images: ImageAsset[];
  storyKey: string;
  tierKind: TierKind;
}

export interface GateResult {
  originality: number;
  voice_match: number;
  factual_defensibility: number;
  reader_value: number;
  total: number;
  ai_tells_found: string[];
  critical_fails: string[];
  verdict: 'publish' | 'queue_for_review';
  reason: string;
}

export interface RunReport {
  startedAt: string;
  shadow: boolean;
  ingested: number;
  stories: number;
  deduped: number;
  selected: number;
  published: { slug: string; tier: TierKind }[];
  drafted: { slug: string; reason: string }[];
  skipped: { title: string; reason: string }[];
  errors: string[];
}
