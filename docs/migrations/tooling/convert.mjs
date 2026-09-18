// Phase B trial/batch encoder. Usage: node convert.mjs <repoRoot> <listfile> <outdir>
// listfile: one repo-relative PNG path per line. Writes <outdir>/<same path with .webp>.
// Settings match Phase A (gpt-image-1 output_compression 80 -> sharp quality 80, same dimensions).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [repoRoot, listFile, outDir] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const rows = [];
for (const rel of files) {
  const src = path.join(repoRoot, rel);
  const relOut = rel.replace(/\.png$/, '.webp');
  const dst = path.join(outDir, relOut);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const meta = await sharp(src).metadata();
  const info = await sharp(src).webp({ quality: 80, effort: 4 }).toFile(dst);
  const before = fs.statSync(src).size;
  if (info.width !== meta.width || info.height !== meta.height) throw new Error(`dimension change: ${rel}`);
  rows.push({ rel, before, after: info.size, width: info.width, height: info.height, alpha: meta.hasAlpha });
  console.error(`${rel}  ${(before / 1e6).toFixed(2)} MB -> ${(info.size / 1e3).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(rows, null, 1));
const tb = rows.reduce((s, r) => s + r.before, 0), ta = rows.reduce((s, r) => s + r.after, 0);
console.log(JSON.stringify({ files: rows.length, beforeMB: +(tb / 1e6).toFixed(1), afterMB: +(ta / 1e6).toFixed(1), reduction: +((1 - ta / tb) * 100).toFixed(1), maxAfterKB: Math.round(Math.max(...rows.map((r) => r.after)) / 1e3) }));
