// Tag governance for Digest posts. Topics (src/data/topics.ts) are the four fixed hubs;
// tags are the reusable, more granular vocabulary underneath them. Before 2026-09-09 the
// model minted tags freely (685 posts produced 685 distinct tags, 419 used once), so tags
// now come ONLY from the canonical vocabulary: synonyms collapse onto it and anything else is
// dropped. A tag the model invents would live on that one post and never be offered to later
// runs (the vocabulary is this static list), so allowing it just recreates one-off tags. To
// add a concept, add it to CANONICAL_TAGS in a reviewed commit. Historical tags are never
// rewritten by this module: it governs future output only. See ARCHITECTURE.md "Topics vs tags".

export const MAX_TAGS = 5;
export const MAX_NEW_TAGS_PER_POST = 0; // vocabulary-only: new concepts are added to CANONICAL_TAGS deliberately, never minted at publish time
export const MAX_TAG_WORDS = 3; // anything longer reads like a headline, not a concept

// Reusable concepts, chosen from the tags that had already accumulated 5+ posts by
// 2026-09 once surface variants were collapsed. Keep this list boring and durable:
// add a tag here only when several published posts would share it.
export const CANONICAL_TAGS: readonly string[] = [
  // hub-level (also the Topic canonical tags used by withCanonicalTags)
  'ai-agents', 'evals', 'building-with-ai', 'marketing-ops', 'digital-assets',
  // agents and evaluation
  'coding-agents', 'agent-evaluation', 'agent-memory', 'benchmarks', 'model-reliability',
  'reasoning-models', 'reinforcement-learning', 'simulation', 'world-models',
  // models and training
  'model-training', 'post-training', 'fine-tuning', 'distillation', 'inference',
  'small-models', 'open-source-ai', 'multimodal-ai', 'diffusion-models', 'language-models',
  'long-context', 'synthetic-data', 'interpretability', 'alignment', 'ai-safety',
  // infrastructure and tooling
  'ai-infrastructure', 'local-ai', 'developer-tools', 'ai-workflows', 'rag', 'ai-search',
  'prompt-engineering', 'hardware', 'compute', 'data-centers',
  // security, policy, society
  'ai-security', 'prompt-injection', 'privacy', 'ai-policy', 'ai-research', 'ai-education',
  'medical-ai', 'robotics', 'computer-vision', 'voice-ai', 'time-series', 'science-ai',
  // business and marketing
  'ai-products', 'enterprise-ai', 'ai-marketing', 'seo', 'content-strategy', 'ai-strategy',
  'applied-ai', 'autonomous-publishing', 'website-builds',
  // digital assets
  'crypto', 'domains', 'bitcoin', 'payments',
  // vendors and models that recur
  'openai', 'anthropic', 'claude', 'gemini', 'google-deepmind', 'mistral', 'qwen', 'hugging-face',
  'codex', 'llama-cpp',
  // editorial
  'deep-dive',
];

// Surface variants that must collapse onto a canonical tag. Keys are normalized slugs.
export const TAG_SYNONYMS: Record<string, string> = {
  // agents
  agents: 'ai-agents', agentic: 'ai-agents', 'agentic-ai': 'ai-agents', 'agentic-systems': 'ai-agents',
  'llm-agents': 'ai-agents', 'agent-architecture': 'ai-agents', 'agent-workflows': 'ai-agents',
  'ai-agent': 'ai-agents', 'tool-use': 'ai-agents', langchain: 'ai-agents',
  'agent-eval': 'agent-evaluation', 'agent-evals': 'agent-evaluation', 'agent-benchmarks': 'agent-evaluation',
  'ai-coding': 'coding-agents', 'coding-models': 'coding-agents', 'code-generation': 'coding-agents',
  memory: 'agent-memory', 'llm-memory': 'agent-memory',
  // evaluation
  evaluation: 'evals', 'ai-evaluation': 'evals', 'model-evaluation': 'evals', 'llm-evaluation': 'evals',
  'model-evals': 'evals', 'llm-evals': 'evals', 'ai-evals': 'evals', 'llm-benchmarks': 'benchmarks',
  benchmark: 'benchmarks',
  // reliability and reasoning
  reliability: 'model-reliability', 'ai-reliability': 'model-reliability', 'llm-reliability': 'model-reliability',
  'model-behavior': 'model-reliability', uncertainty: 'model-reliability', hallucination: 'model-reliability',
  hallucinations: 'model-reliability', reasoning: 'reasoning-models', 'llm-reasoning': 'reasoning-models',
  'ai-reasoning': 'reasoning-models',
  // training
  'llm-training': 'model-training', pretraining: 'model-training', rlhf: 'post-training',
  'reward-models': 'post-training', lora: 'fine-tuning', 'model-compression': 'inference',
  quantization: 'inference', optimization: 'inference', 'small-language-models': 'small-models',
  // open source and models
  'open-source': 'open-source-ai', 'open-models': 'open-source-ai', 'open-weights': 'open-source-ai',
  multimodal: 'multimodal-ai', 'vision-language-models': 'multimodal-ai', vlm: 'multimodal-ai',
  'vla-models': 'multimodal-ai', llms: 'language-models', llm: 'language-models', models: 'language-models',
  'ai-models': 'language-models', 'foundation-models': 'language-models', 'frontier-models': 'language-models',
  transformers: 'model-training', 'model-architecture': 'model-training',
  'mechanistic-interpretability': 'interpretability', explainability: 'interpretability',
  safety: 'ai-safety', 'model-safety': 'ai-safety',
  // infrastructure and tools
  infrastructure: 'ai-infrastructure', 'llm-systems': 'ai-infrastructure', mlops: 'ai-infrastructure',
  'llm-ops': 'ai-infrastructure', llmops: 'ai-infrastructure', 'model-ops': 'ai-infrastructure',
  'ai-ops': 'ai-infrastructure', datacenters: 'data-centers', 'ai-hardware': 'hardware',
  'local-llms': 'local-ai', 'local-llm': 'local-ai', 'local-models': 'local-ai', 'on-device-ai': 'local-ai',
  'edge-ai': 'local-ai', 'builder-tools': 'developer-tools', 'ai-tools': 'developer-tools',
  'ai-builders': 'developer-tools', builders: 'developer-tools', workflows: 'ai-workflows',
  workflow: 'ai-workflows', 'llm-workflows': 'ai-workflows', 'workflow-automation': 'ai-workflows',
  automation: 'ai-workflows', retrieval: 'rag', search: 'ai-search', prompting: 'prompt-engineering',
  // security, policy
  security: 'ai-security', cybersecurity: 'ai-security', policy: 'ai-policy', governance: 'ai-policy',
  'ai-governance': 'ai-policy', 'public-sector-ai': 'ai-policy', 'ai-privacy': 'privacy',
  research: 'ai-research', 'llm-research': 'ai-research', education: 'ai-education',
  'clinical-ai': 'medical-ai', 'health-ai': 'medical-ai', 'scientific-ai': 'science-ai',
  // business and marketing
  product: 'ai-products', 'product-design': 'ai-products', 'marketing-automation': 'ai-marketing',
  'marketing-ai': 'ai-marketing', 'marketing-tools': 'ai-marketing', 'gtm-tools': 'ai-marketing',
  branding: 'content-strategy', 'ai-branding': 'content-strategy', 'ai-writing': 'autonomous-publishing',
  'ai-content': 'autonomous-publishing', 'content-automation': 'autonomous-publishing',
  'programmatic-seo': 'seo', programmatic: 'seo', websites: 'website-builds', 'web-development': 'website-builds',
  'website-build': 'website-builds', 'landing-pages': 'website-builds', 'static-sites': 'website-builds', astro: 'website-builds',
  // digital assets
  cryptocurrency: 'crypto', 'bitcoin-mining': 'bitcoin', btc: 'bitcoin', 'domain-names': 'domains',
  'ai-domains': 'domains',
  // vendors
  'claude-opus': 'claude', 'claude-code': 'coding-agents', deepmind: 'google-deepmind', huggingface: 'hugging-face',
};

const CANON = new Set(CANONICAL_TAGS);

/** Lowercase, strip quotes, collapse punctuation/whitespace to single hyphens. */
export function slugifyTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['\u2019"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Map a raw tag onto its canonical form, or return the normalized slug if it is new. */
export function normalizeTag(raw: string): string {
  let slug = slugifyTag(raw);
  if (!slug) return '';
  if (TAG_SYNONYMS[slug]) slug = TAG_SYNONYMS[slug];
  if (CANON.has(slug)) return slug;
  // trivial plural/singular variants of a canonical tag
  const singular = slug.replace(/s$/, '');
  const plural = `${slug}s`;
  if (CANON.has(plural)) return plural;
  if (CANON.has(singular)) return singular;
  if (TAG_SYNONYMS[singular]) return TAG_SYNONYMS[singular];
  if (TAG_SYNONYMS[plural]) return TAG_SYNONYMS[plural];
  return slug;
}

export const isCanonicalTag = (slug: string): boolean => CANON.has(slug);

/** A new tag is acceptable only if it looks like a durable concept, not a headline. */
export function isAcceptableNewTag(slug: string, title = ''): boolean {
  if (!slug || slug.length < 3 || slug.length > 32) return false;
  if (slug.split('-').length > MAX_TAG_WORDS) return false;
  if (/^\d+$/.test(slug)) return false;
  const titleSlug = slugifyTag(title);
  if (titleSlug && (slug === titleSlug || titleSlug.includes(slug) && slug.split('-').length >= 3)) return false;
  return true;
}

/**
 * Govern a post's tags: normalize, collapse synonyms, keep canonical tags, drop everything
 * else (MAX_NEW_TAGS_PER_POST is 0; raise it only with a reason), de-duplicate, cap at MAX_TAGS.
 */
export function governTags(tags: string[], title = ''): string[] {
  const canonical: string[] = [];
  const fresh: string[] = [];
  for (const raw of tags ?? []) {
    const t = normalizeTag(raw);
    if (!t) continue;
    if (CANON.has(t)) {
      if (!canonical.includes(t)) canonical.push(t);
    } else if (fresh.length < MAX_NEW_TAGS_PER_POST && !fresh.includes(t) && isAcceptableNewTag(t, title)) {
      fresh.push(t);
    }
  }
  return [...canonical, ...fresh].slice(0, MAX_TAGS);
}

/** Vocabulary line for the synthesis prompt. */
export const tagVocabularyForPrompt = (): string => CANONICAL_TAGS.filter((t) => t !== 'deep-dive').join(', ');
