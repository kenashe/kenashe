import { test } from 'node:test';
import assert from 'node:assert/strict';
import { governLuckyDomainsLinks, normalizeLuckyDomainsUrl, qualifiesForLuckyDomainsLink, LD_ALLOWED_URLS } from '../src/partner-links.ts';

test('a qualifying post keeps exactly one allow-listed Lucky Domains link', () => {
  const body = 'Ashe runs [Lucky Domains](https://luckydomains.io/services.html#seo), which does SEO. Also see [this](https://luckydomains.io/contact.html).';
  const out = governLuckyDomainsLinks(body, ['seo', 'marketing-ops']);
  assert.equal(out, 'Ashe runs [Lucky Domains](https://luckydomains.io/services.html#seo), which does SEO. Also see this.');
});

test('a non-qualifying post has every Lucky Domains link unlinked but the prose kept', () => {
  const body = 'He mentions [Lucky Domains](https://luckydomains.io/services.html#domains) in passing.';
  assert.equal(governLuckyDomainsLinks(body, ['ai-agents', 'evals']), 'He mentions Lucky Domains in passing.');
});

test('off-list Lucky Domains URLs are remapped to the closest allowed page', () => {
  assert.equal(normalizeLuckyDomainsUrl('https://luckydomains.io/', ['domains']), 'https://luckydomains.io/services.html#domains');
  assert.equal(normalizeLuckyDomainsUrl('https://www.luckydomains.io/about.html', ['seo']), 'https://luckydomains.io/services.html#seo');
  assert.equal(normalizeLuckyDomainsUrl('https://luckydomains.io/contact.html', ['website-builds']), 'https://luckydomains.io/services.html#websites');
  assert.equal(normalizeLuckyDomainsUrl('https://luckydomains.io/how-we-buy-domains.html/', ['domains']), LD_ALLOWED_URLS[0]);
  const out = governLuckyDomainsLinks('See [Lucky Domains](https://luckydomains.io/founder/ken-ashe/).', ['domains']);
  assert.equal(out, 'See [Lucky Domains](https://luckydomains.io/services.html#domains).');
});

test('bare luckydomains.io URLs are removed', () => {
  const out = governLuckyDomainsLinks('Read more at https://luckydomains.io/services.html#seo today.', ['seo']);
  assert.ok(!out.includes('luckydomains.io'));
  assert.equal(out, 'Read more at today.');
});

test('other external links are untouched', () => {
  const body = 'Source: [arXiv](https://arxiv.org/abs/1234.5678) and [OpenAI](https://openai.com/).';
  assert.equal(governLuckyDomainsLinks(body, ['ai-agents']), body);
});

test('qualifying tags are the documented set', () => {
  assert.equal(qualifiesForLuckyDomainsLink(['domains']), true);
  assert.equal(qualifiesForLuckyDomainsLink(['website-builds']), true);
  assert.equal(qualifiesForLuckyDomainsLink(['coding-agents']), false);
});
