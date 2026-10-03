import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enforcePublisherVoice, thirdPersonPublisherRefs } from '../src/voice.ts';

test('third-person publisher sentences become first person', () => {
  assert.equal(
    enforcePublisherVoice('Ashe runs Lucky Domains, which works on SEO, and this is where I see the real shift.'),
    'I run Lucky Domains, which works on SEO, and this is where I see the real shift.',
  );
  assert.equal(enforcePublisherVoice('Ken Ashe runs [Lucky Domains](https://luckydomains.io/services.html#seo), so this is not abstract for me.'),
    'I run [Lucky Domains](https://luckydomains.io/services.html#seo), so this is not abstract for me.');
  assert.equal(enforcePublisherVoice('Related: Ashe builds client sites that can rank.'), 'Related: I build client sites that can rank.');
  assert.equal(enforcePublisherVoice('Related on this site: Ashe ran into this failure mode first-hand.'), 'Related on this site: I ran into this failure mode first-hand.');
  assert.equal(enforcePublisherVoice('Domain acquisition is Ashe\'s day job at Lucky Domains.'), 'Domain acquisition is my day job at Lucky Domains.');
  assert.equal(enforcePublisherVoice('kept apart from the work he signs.'), 'kept apart from the work I sign.');
});

test('possessives that open a sentence are re-capitalized', () => {
  assert.equal(enforcePublisherVoice("Ashe's own bias here: I'd rather have a smaller model."), "My own bias here: I'd rather have a smaller model.");
  assert.equal(enforcePublisherVoice("Ken's practitioner take: prototype against it."), "My practitioner's take: prototype against it.");
  assert.equal(enforcePublisherVoice("Fine.\nKen's Practitioner's Take: try it."), "Fine.\nMy practitioner's take: try it.");
});

test('the doubled Lucky Domains disclosure collapses to one mention', () => {
  assert.equal(
    enforcePublisherVoice('Ashe runs Lucky Domains, which works on SEO for websites at [Lucky Domains](https://luckydomains.io/services.html#seo).'),
    'I run [Lucky Domains](https://luckydomains.io/services.html#seo), which works on SEO for websites.',
  );
  assert.equal(
    enforcePublisherVoice('Ashe runs Lucky Domains, which works on SEO through Lucky Domains, so this is plumbing first.'),
    'I run Lucky Domains, which works on SEO, so this is plumbing first.',
  );
});

test('detection reports what is left and is quiet after the rewrite', () => {
  const body = 'TL;DR: fine.\n\nAshe runs Lucky Domains, which does SEO. Nothing else here. Ken\'s view differs.';
  assert.deepEqual(thirdPersonPublisherRefs(body), ['Ashe runs Lucky Domains, which does SEO.', "Ken's view differs."]);
  assert.deepEqual(thirdPersonPublisherRefs(enforcePublisherVoice(body)), []);
  assert.deepEqual(thirdPersonPublisherRefs('Ashe wrote a book.'), ['Ashe wrote a book.']);
});

test('legitimate mentions of the name are untouched', () => {
  const body = 'This closes the gap between "AI draft" and "draft that reads like Ken wrote it."';
  assert.equal(enforcePublisherVoice(body), body);
  assert.deepEqual(thirdPersonPublisherRefs(body), []);
  const colon = 'The user had a fuzzy problem: my phone is somewhere in the office.';
  assert.equal(enforcePublisherVoice(colon), colon);
  const other = 'Researcher Jane Ashevski argued otherwise.';
  assert.equal(enforcePublisherVoice(other), other);
});
