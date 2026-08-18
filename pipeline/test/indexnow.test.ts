// IndexNow submission. The risk here is telling crawlers to fetch a page that has not
// deployed yet, or sending a malformed/mixed-host payload that the API rejects wholesale.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { INDEXNOW_KEY, keyLocation, buildPayload, changedUrls, waitUntilLive, submit } from '../src/indexnow.ts';

const SITE = 'https://kenashe.ai';
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

test('key is a valid IndexNow key and the key file lives at the site root', () => {
  assert.match(INDEXNOW_KEY, /^[a-zA-Z0-9-]{8,128}$/, 'spec: 8-128 chars, alphanumeric + dashes');
  assert.equal(keyLocation(SITE), `https://kenashe.ai/${INDEXNOW_KEY}.txt`);
});

// The key exists in two places by necessity: this constant, and the public key file the
// site serves for ownership verification. If they drift, every submission is rejected —
// so fail the build rather than discover it in Bing's dashboard weeks later.
test('the public key file matches the constant (filename and contents)', () => {
  const publicDir = path.resolve(import.meta.dirname, '../../public');
  const expected = path.join(publicDir, `${INDEXNOW_KEY}.txt`);
  assert.ok(fs.existsSync(expected), `missing key file: public/${INDEXNOW_KEY}.txt`);
  assert.equal(fs.readFileSync(expected, 'utf8').trim(), INDEXNOW_KEY, 'key file contents must be the key');
  const strays = fs.readdirSync(publicDir).filter((f) => /^[a-f0-9]{16,}\.txt$/i.test(f) && f !== `${INDEXNOW_KEY}.txt`);
  assert.deepEqual(strays, [], 'stale key files left behind after a rotation');
});

test('changedUrls covers each post plus the pages that list them', () => {
  const urls = changedUrls(SITE, ['2026-08-18-a', '2026-08-18-b']);
  assert.deepEqual(urls, [
    'https://kenashe.ai/blog/2026-08-18-a/',
    'https://kenashe.ai/blog/2026-08-18-b/',
    'https://kenashe.ai/blog/',
    'https://kenashe.ai/',
  ]);
});

test('buildPayload emits the four required fields with a bare host', () => {
  const p = buildPayload(SITE, ['https://kenashe.ai/blog/x/']);
  assert.deepEqual(Object.keys(p).sort(), ['host', 'key', 'keyLocation', 'urlList']);
  assert.equal(p.host, 'kenashe.ai', 'host must be bare, no scheme or slash');
  assert.equal(p.key, INDEXNOW_KEY);
  assert.deepEqual(p.urlList, ['https://kenashe.ai/blog/x/']);
});

test('buildPayload de-duplicates and drops off-host or malformed URLs', () => {
  const p = buildPayload(SITE, [
    'https://kenashe.ai/a/', 'https://kenashe.ai/a/',   // dupe
    'https://example.com/b/',                            // off-host: would void the batch
    'not-a-url',
  ]);
  assert.deepEqual(p.urlList, ['https://kenashe.ai/a/']);
});

test('waitUntilLive returns true as soon as the page serves 200', async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; return { ok: true, status: 200 } as Response; }) as typeof fetch;
  assert.equal(await waitUntilLive('https://kenashe.ai/blog/x/', { timeoutMs: 1000, intervalMs: 1 }), true);
  assert.equal(calls, 1);
});

test('waitUntilLive polls past a 404 until the deploy lands', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return { ok: calls >= 3, status: calls >= 3 ? 200 : 404 } as Response;
  }) as typeof fetch;
  assert.equal(await waitUntilLive('https://kenashe.ai/blog/x/', { timeoutMs: 5000, intervalMs: 1 }), true);
  assert.equal(calls, 3);
});

test('waitUntilLive gives up at the deadline instead of hanging the run', async () => {
  globalThis.fetch = (async () => ({ ok: false, status: 404 }) as Response) as typeof fetch;
  const t0 = Date.now();
  assert.equal(await waitUntilLive('https://kenashe.ai/blog/x/', { timeoutMs: 60, intervalMs: 10 }), false);
  assert.ok(Date.now() - t0 < 5000, 'must respect the timeout');
});

test('waitUntilLive survives network errors while polling', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls < 2) throw new Error('ECONNRESET');
    return { ok: true, status: 200 } as Response;
  }) as typeof fetch;
  assert.equal(await waitUntilLive('https://kenashe.ai/x/', { timeoutMs: 5000, intervalMs: 1 }), true);
});

test('submit POSTs JSON to the IndexNow endpoint', async () => {
  let seen: { url?: string; init?: RequestInit } = {};
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return { ok: true, status: 200 } as Response;
  }) as unknown as typeof fetch;
  const res = await submit(SITE, ['https://kenashe.ai/blog/x/', 'https://kenashe.ai/blog/']);
  assert.equal(res.ok, true);
  assert.equal(res.count, 2);
  assert.equal(seen.url, 'https://api.indexnow.org/indexnow');
  assert.equal(seen.init?.method, 'POST');
  const body = JSON.parse(String(seen.init?.body));
  assert.equal(body.host, 'kenashe.ai');
  assert.equal(body.keyLocation, keyLocation(SITE));
  assert.equal(body.urlList.length, 2);
});

test('submit makes no request when there is nothing to announce', async () => {
  let called = false;
  globalThis.fetch = (async () => { called = true; return { ok: true, status: 200 } as Response; }) as typeof fetch;
  const res = await submit(SITE, []);
  assert.deepEqual(res, { ok: true, status: 0, count: 0 });
  assert.equal(called, false);
});
