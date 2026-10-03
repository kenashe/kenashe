// Publisher voice guard. The Digest is written in Ken Ashe's first-person voice ("I run",
// "my take"), so a sentence that refers to him in the third person ("Ashe runs Lucky
// Domains", "Ken's practitioner take") reads as a template artifact. Two layers:
//   - enforcePublisherVoice() rewrites the known third-person forms into the first person
//     and collapses the "I run Lucky Domains ... through [Lucky Domains](...)" doubling the
//     disclosure sentence sometimes produced;
//   - thirdPersonPublisherRefs() reports anything that still names the publisher, so run.ts
//     can draft the post instead of publishing it (a critical fail, like the gate's own).
// Added 2026-10-03 after 64 published posts were found mixing voices (DECISIONS.md D19).

const REWRITES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bKen Ashe runs\b/g, 'I run'],
  [/\bAshe runs\b/g, 'I run'],
  [/\bAshe builds\b/g, 'I build'],
  [/\bAshe ran\b/g, 'I ran'],
  [/\bAshe owns\b/g, 'I own'],
  [/\bAshe founded\b/g, 'I founded'],
  [/\bAshe publishes\b/g, 'I publish'],
  // \u0000 marks a pronoun this guard introduced, so only those get re-capitalized below.
  [/\bKen's (?:P|p)ractitioner(?:'s)? (?:T|t)ake\b/g, "\u0000my practitioner's take"],
  [/\bAshe's\b/g, '\u0000my'],
  [/\bKen's\b/g, '\u0000my'],
  [/\bthe work he signs\b/g, 'the work I sign'],
];

// "I run Lucky Domains, which works on X through [Lucky Domains](url)" -> "I run [Lucky Domains](url), which works on X"
const DOUBLED_LINKED = /\bI run Lucky Domains, (which [^.]*?) (?:through|at) \[Lucky Domains\]\((https?:[^)\s]+)\)/g;
// Same doubling when the second mention lost its link.
const DOUBLED_PLAIN = /\bI run Lucky Domains, (which [^.]*?) (?:through|at) Lucky Domains([,.])/g;

/** Rewrite third-person references to the publisher into the first person. Pure. */
export function enforcePublisherVoice(body: string): string {
  let out = body;
  for (const [re, to] of REWRITES) out = out.replace(re, to);
  out = out.replace(DOUBLED_LINKED, 'I run [Lucky Domains]($2), $1');
  out = out.replace(DOUBLED_PLAIN, 'I run Lucky Domains, $1$2');
  // A pronoun this guard introduced gets its capital back when it opens a sentence or a line;
  // the user's own "problem: my phone" is never touched.
  out = out.replace(/(^|[.!?]\s+|\n)\u0000my/g, '$1My').replace(/\u0000/g, '');
  return out;
}

const THIRD_PERSON = /\b(?:Ken )?Ashe(?:'s)?\b|\bKen's\b/g;

/** Sentences that still refer to the publisher in the third person (for the run log and the gate). */
export function thirdPersonPublisherRefs(body: string): string[] {
  const refs: string[] = [];
  for (const line of body.split('\n')) {
    if (!THIRD_PERSON.test(line)) { THIRD_PERSON.lastIndex = 0; continue; }
    THIRD_PERSON.lastIndex = 0;
    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      if (THIRD_PERSON.test(sentence)) refs.push(sentence.trim());
      THIRD_PERSON.lastIndex = 0;
    }
  }
  return refs;
}
