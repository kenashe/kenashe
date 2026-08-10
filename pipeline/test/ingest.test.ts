// Fetch retry behaviour. Datacenter IPs see transient failures a browser never does
// (YouTube 404s, Martech 429s) — see DECISIONS.md D6.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getTextRetry } from '../src/ingest.ts';

const realFetch = globalThis.fetch;
/** Stub fetch with a scripted sequence of statuses; 200 resolves with `body`. */
function stubFetch(statuses: number[], body = 'ok') {
  let calls = 0;
  globalThis.fetch = (async () => {
    const status = statuses[Math.min(calls, statuses.length - 1)];
    calls += 1;
    return { ok: status === 200, status, text: async () => body } as unknown as Response;
  }) as typeof fetch;
  return () => calls;
}
test.afterEach(() => { globalThis.fetch = realFetch; });

test('returns immediately on success without retrying', async () => {
  const calls = stubFetch([200], 'feed-xml');
  assert.equal(await getTextRetry('https://example.com/feed', 3, 1), 'feed-xml');
  assert.equal(calls(), 1);
});

test('recovers from a transient 429 (the Martech case)', async () => {
  const calls = stubFetch([429, 200], 'feed-xml');
  assert.equal(await getTextRetry('https://martech.org/feed/', 3, 1), 'feed-xml');
  assert.equal(calls(), 2);
});

test('recovers from a transient 404 (the YouTube case)', async () => {
  const calls = stubFetch([404, 404, 200], 'feed-xml');
  assert.equal(await getTextRetry('https://youtube.com/feeds', 3, 1), 'feed-xml');
  assert.equal(calls(), 3);
});

test('gives up after `tries` attempts and throws the last error', async () => {
  const calls = stubFetch([500]);
  await assert.rejects(() => getTextRetry('https://example.com/feed', 3, 1), /-> 500/);
  assert.equal(calls(), 3, 'must not retry forever');
});

test('honours a custom try count', async () => {
  const calls = stubFetch([503]);
  await assert.rejects(() => getTextRetry('https://example.com/feed', 1, 1));
  assert.equal(calls(), 1);
});

test('propagates network errors after retrying', async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; throw new Error('ECONNRESET'); }) as typeof fetch;
  await assert.rejects(() => getTextRetry('https://example.com/feed', 2, 1), /ECONNRESET/);
  assert.equal(calls, 2);
});
