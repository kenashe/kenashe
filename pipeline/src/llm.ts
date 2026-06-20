// Thin multi-provider LLM client over fetch (no SDKs). Runs on the pipeline host
// (GitHub Actions), where fetch reaches the providers directly.
import type { Vec } from './types.ts';

interface ModelRef { provider: string; model: string; }
interface ChatOpts { json?: boolean; maxTokens?: number; }

const key = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

export async function chat(ref: ModelRef, system: string, user: string, opts: ChatOpts = {}): Promise<string> {
  if (ref.provider === 'anthropic') return anthropic(ref.model, system, user, opts);
  if (ref.provider === 'openai' || ref.provider === 'deepseek') return openaiCompat(ref.provider, ref.model, system, user, opts);
  if (ref.provider === 'google') return gemini(ref.model, system, user, opts);
  throw new Error(`Unknown LLM provider: ${ref.provider}`);
}

async function anthropic(model: string, system: string, user: string, o: ChatOpts): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: o.maxTokens ?? 4000, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as any;
  return j.content?.[0]?.text ?? '';
}

async function openaiCompat(provider: string, model: string, system: string, user: string, o: ChatOpts): Promise<string> {
  const base = provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com';
  const envKey = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY';
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key(envKey)}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(o.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as any;
  return j.choices?.[0]?.message?.content ?? '';
}

async function gemini(model: string, system: string, user: string, o: ChatOpts): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key('GOOGLE_API_KEY')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: o.json ? { responseMimeType: 'application/json' } : {},
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as any;
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// OpenAI embeddings -> dense Vec. Used by the production dedup path.
export async function embed(text: string, model = 'text-embedding-3-small'): Promise<Vec> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { authorization: `Bearer ${key('OPENAI_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as any;
  return j.data[0].embedding as number[];
}

// Batched embeddings (chunked) for ingest + dedup. One call per up-to-96 inputs.
export async function embedMany(texts: string[], model = 'text-embedding-3-small'): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 96) {
    const chunk = texts.slice(i, i + 96).map((t) => t.slice(0, 8000) || ' ');
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { authorization: `Bearer ${key('OPENAI_API_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, input: chunk }),
    });
    if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as any;
    for (const d of j.data) out.push(d.embedding as number[]);
  }
  return out;
}
