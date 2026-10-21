// The "Save My Contact" card, generated at build time from the `contact` block in
// src/data/connect.ts. vCard 3.0 (the version iOS Contacts and Android both import cleanly),
// CRLF line endings, long lines folded at 75 octets, a small embedded headshot.
// Public business details only: no phone number, no home address.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { connect } from '../../data/connect';

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

// RFC 2425 line folding: continuation lines start with a single space.
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, 'utf8') > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export const GET: APIRoute = () => {
  const c = connect.contact;
  const photo = readFileSync(resolve(process.cwd(), 'src/assets/connect/ken-ashe-vcard.jpg')).toString('base64');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(c.lastName)};${esc(c.firstName)};;;`,
    `FN:${esc(`${c.firstName} ${c.lastName}`)}`,
    `TITLE:${esc(c.title)}`,
    `ORG:${esc(c.organization)}`,
    `EMAIL;TYPE=INTERNET,WORK:${c.email}`,
    `item1.URL:${c.website}`,
    'item1.X-ABLabel:Website',
    ...c.profiles.flatMap((p, i) => [
      `item${i + 2}.URL:${p.url}`,
      `item${i + 2}.X-ABLabel:${esc(p.label)}`,
      `X-SOCIALPROFILE;TYPE=${p.label.toLowerCase()}:${p.url}`,
    ]),
    `NOTE:${esc(c.note)}`,
    `PHOTO;ENCODING=b;TYPE=JPEG:${photo}`,
    'END:VCARD',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    // Static output: Vercel serves the built file by its .vcf extension. Served inline (no
    // attachment header) so iPhone Safari opens the "Add to Contacts" sheet directly.
    headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
  });
};
