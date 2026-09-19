// TEMPORARY (PR #80 pilot; removed before merge). Non-production pilot of the D18 image
// request: three real Digest prompts through the pipeline's own imageRequestBody and prompt
// builders. Writes only to $PILOT_OUT (default /tmp/pilot-d18) for upload as a workflow
// artifact. Never touches src/assets, never commits, never prints the API key.
import fs from 'node:fs';
import path from 'node:path';
import { imageRequestBody, probeImage, validateGeneratedImage, IMAGE_MODEL, IMAGE_SIZE, IMAGE_FORMAT, IMAGE_COMPRESSION } from '../src/image-output.ts';
import { heroImagePrompt, inlineImagePrompt } from '../src/prompts.ts';

const OUT = process.env.PILOT_OUT || '/tmp/pilot-d18';
fs.mkdirSync(OUT, { recursive: true });
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('OPENAI_API_KEY is not set'); process.exit(2); }

// Prompts for a real published post, built exactly as images.ts builds them.
const slug = '2026-09-10-convmem-turns-long-context-reasoning-into-a-tree-instead-of-a-chain';
const cases: [string, string][] = [
  ['1-hero', heroImagePrompt(
    'ConvMem Turns Long-Context Reasoning Into a Tree Instead of a Chain',
    'ConvMem replaces a single long chain of reasoning with a tree of parallel branches that merge, trading a little latency for far better use of long contexts.',
    ['ai-research', 'llm', 'agents'], slug)],
  ['2-inline-diagram', inlineImagePrompt('diagram: a long single-file chain of linked nodes on the left contrasted with a branching tree of merging nodes on the right, both drawn as a clean schematic', slug)],
  ['3-inline-concept', inlineImagePrompt('a stopwatch shrinking on one side of a balance while a stack of identical documents grows on the other', slug)],
];

const results: Record<string, unknown>[] = [];
let failed = 0;
for (const [name, prompt] of cases) {
  const body = imageRequestBody(prompt);
  const t0 = Date.now();
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const latency_ms = Date.now() - t0;
  const text = await res.text();
  const requested = { model: body.model, size: body.size, output_format: body.output_format, output_compression: body.output_compression };
  if (!res.ok) {
    failed += 1;
    results.push({ name, requested, http: res.status, latency_ms, error: text.slice(0, 800) });
    continue;
  }
  const j = JSON.parse(text);
  const first = j.data?.[0] ?? {};
  const buf = Buffer.from(first.b64_json ?? '', 'base64');
  const returned = await probeImage(buf);
  let validate = 'PASS';
  try { await validateGeneratedImage(buf, name); } catch (e) { validate = 'FAIL: ' + (e as Error).message; failed += 1; }
  const file = path.join(OUT, `${name}.${returned.format ?? 'bin'}`);
  fs.writeFileSync(file, buf);
  const { data: _data, ...apiMeta } = j; // everything the API reports except the image bytes
  results.push({
    name, requested, http: res.status, latency_ms,
    returned: { ...returned, bytes: buf.length }, validate,
    api_meta: apiMeta, // includes `usage` when the API returns it; absent means unreported, not zero
    data_fields: Object.keys(first).filter((k) => k !== 'b64_json'),
    file: path.basename(file),
  });
}
const summary = { expected: { model: IMAGE_MODEL, size: IMAGE_SIZE, format: IMAGE_FORMAT, compression: IMAGE_COMPRESSION }, results };
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map((r: any) => `| ${r.name} | ${r.http} | ${r.returned ? `${r.returned.format} ${r.returned.width}x${r.returned.height}` : '-'} | ${r.returned?.bytes ?? '-'} | ${r.latency_ms} ms | ${r.validate ?? r.error?.slice(0, 80)} |`);
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## D18 image pilot (${IMAGE_MODEL} ${IMAGE_SIZE})\n\n| image | HTTP | returned | bytes | latency | validate |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
}
process.exit(failed ? 1 : 0);
