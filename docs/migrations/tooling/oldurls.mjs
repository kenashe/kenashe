import { rollup } from 'rollup'; import fs from 'node:fs';
const list=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
const b=await rollup({input:'virtual', plugins:[{name:'v', resolveId:id=>id==='virtual'?id:null, load:id=>id==='virtual'?'export default 1':null,
  buildStart(){ for (const p of list) this.emitFile({type:'asset', name:'PNG|'+p, source:fs.readFileSync('/tmp/kfull/'+p)}); }}]});
const {output}=await b.generate({format:'es', assetFileNames:'[name].[hash][extname]'});
for (const o of output) if (o.type==='asset'){ const p=o.name.slice(4); const m=o.fileName.match(/\.([A-Za-z0-9_-]{8})\.png$/); const base=p.split('/').pop().replace(/\.png$/,''); console.log(`${p}\thttps://kenashe.ai/_astro/${base}.${m[1]}.png`); }
