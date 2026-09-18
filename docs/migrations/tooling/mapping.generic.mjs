// Env-driven mapping + redirect generator (replaces the per-batch sed-copied mappingN.mjs).
// Required env: PNGS (list of repo-relative .png paths), OLDSTATUS (tsv: path, old_url, http),
// WEBPDIR (root containing the converted src/assets/blog/**/*.webp), MAPOUT, REDOUT, BATCH.
// Must be executed with cwd = the tools dir so `rollup` resolves; prepare_batch.sh does that.
import { rollup } from 'rollup';
import fs from 'node:fs';

const need = (k) => { const v = process.env[k]; if (!v) { console.error(`mapping.generic: missing env ${k}`); process.exit(2); } return v; };
const PNGS = need('PNGS'), OLDSTATUS = need('OLDSTATUS'), WEBPDIR = need('WEBPDIR'), MAPOUT = need('MAPOUT'), REDOUT = need('REDOUT'), BATCH = need('BATCH');
for (const f of [PNGS, OLDSTATUS]) if (!fs.existsSync(f)) { console.error(`mapping.generic: input missing ${f}`); process.exit(2); }

const list = fs.readFileSync(PNGS, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const status = Object.fromEntries(fs.readFileSync(OLDSTATUS, 'utf8').split('\n').filter(Boolean).map((l) => { const [p, u, s] = l.split('\t'); return [p, [u, s]]; }));
for (const p of list) if (!status[p]) { console.error(`mapping.generic: no old-URL status for ${p}`); process.exit(2); }

const b = await rollup({
  input: 'virtual',
  plugins: [{ name: 'v', resolveId: (id) => (id === 'virtual' ? id : null), load: (id) => (id === 'virtual' ? 'export default 1' : null),
    buildStart() { for (const p of list) { const w = `${WEBPDIR}/${p.replace(/\.png$/, '.webp')}`; if (!fs.existsSync(w)) { console.error(`mapping.generic: webp missing ${w}`); process.exit(2); } this.emitFile({ type: 'asset', name: 'WEBP|' + p, source: fs.readFileSync(w) }); } } }],
});
const { output } = await b.generate({ format: 'es', assetFileNames: '[name].[hash][extname]' });
const nh = {};
for (const o of output) if (o.type === 'asset') { const m = o.fileName.match(/\.([A-Za-z0-9_-]{8})\.\w+$/); if (!m) { console.error(`mapping.generic: no hash in ${o.fileName}`); process.exit(2); } nh[o.name.slice(5)] = m[1]; }

const rows = [
  `# Site-hosted image URL mapping, Phase B batch ${BATCH}. Hashes computed with Rollup (the algorithm Astro uses for /_astro/ asset names).`,
  '# served_today: production HTTP status of old_url before the batch. 404 = original never emitted (only sized derivatives), no redirect needed.',
  '# old_url\tnew_url\tserved_today\trole\tpost_slug',
];
const redirects = [];
for (const p of list) {
  const parts = p.split('/'); const slug = parts[3]; const base = parts[4].replace(/\.png$/, '');
  const [old, st] = status[p]; const nu = `https://kenashe.ai/_astro/${base}.${nh[p]}.webp`;
  const role = base === 'hero' ? 'hero (og:image + Article.image)' : 'inline (in-page only)';
  rows.push(`${old}\t${nu}\t${st}\t${role}\t${slug}`);
  if (st === '200') redirects.push({ source: old.replace('https://kenashe.ai', ''), destination: nu.replace('https://kenashe.ai', ''), permanent: true });
}
fs.writeFileSync(MAPOUT, rows.join('\n') + '\n');
fs.writeFileSync(REDOUT, JSON.stringify(redirects, null, 2));
console.log(`mapping rows ${list.length} | redirects ${redirects.length}`);
