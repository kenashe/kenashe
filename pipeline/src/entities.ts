// Entity map for JSON-LD `about` grounding: distinctive names -> Wikidata sameAs.
// QIDs verified against the Wikidata API (wbsearchentities, 2026-07). Matching is
// word-boundary and mostly case-sensitive on distinctive forms to avoid false positives
// (e.g. "Meta AI", never bare "Meta"); models with ambiguous common-word names
// (Gemini, Llama) are intentionally omitted until they can be disambiguated safely.
interface Entity {
  name: string;
  sameAs: string;
  patterns: RegExp[];
}

const W = (qid: string): string => `https://www.wikidata.org/wiki/${qid}`;

const ENTITIES: Entity[] = [
  { name: 'OpenAI', sameAs: W('Q21708200'), patterns: [/\bOpenAI\b/] },
  { name: 'Anthropic', sameAs: W('Q116758847'), patterns: [/\bAnthropic\b/] },
  { name: 'Google DeepMind', sameAs: W('Q15733006'), patterns: [/\bDeepMind\b/] },
  { name: 'Meta AI', sameAs: W('Q112114913'), patterns: [/\bMeta AI\b/] },
  { name: 'Mistral AI', sameAs: W('Q119718658'), patterns: [/\bMistral\b/] },
  { name: 'Hugging Face', sameAs: W('Q108943604'), patterns: [/\bHugging Face\b/] },
  { name: 'Nvidia', sameAs: W('Q182477'), patterns: [/\bNvidia\b/i] },
  { name: 'Microsoft', sameAs: W('Q2283'), patterns: [/\bMicrosoft\b/] },
  { name: 'Google', sameAs: W('Q95'), patterns: [/\bGoogle\b/] },
  { name: 'xAI', sameAs: W('Q120599684'), patterns: [/\bxAI\b/] },
  { name: 'arXiv', sameAs: W('Q118398'), patterns: [/\barXiv\b/i] },
  { name: 'GitHub', sameAs: W('Q364'), patterns: [/\bGitHub\b/] },
  { name: 'ChatGPT', sameAs: W('Q115564437'), patterns: [/\bChatGPT\b/] },
  { name: 'Claude', sameAs: W('Q118876059'), patterns: [/\bClaude\b/] },
  { name: 'Grok', sameAs: W('Q123361035'), patterns: [/\bGrok\b/] },
];

// Return the entities genuinely named in the text, as {name, sameAs}, capped. Faithful
// detection only (a real mention) so the schema.org `about` never misrepresents content.
export function detectEntities(text: string, max = 15): { name: string; sameAs: string }[] {
  const out: { name: string; sameAs: string }[] = [];
  for (const e of ENTITIES) {
    if (e.patterns.some((re) => re.test(text))) out.push({ name: e.name, sameAs: e.sameAs });
    if (out.length >= max) break;
  }
  return out;
}
