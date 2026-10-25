import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

// Cache only explicitly shipped public app assets. Consent/review documents and
// their scripts stay network-only; no directory crawl or runtime cache is used.
export async function buildPWA(source,destination) {
  const excluded=new Set(['sw.js','connect.js','review.js']);
  const files=(await readdir(source)).filter(name=>
    !excluded.has(name) && (/\.(js|css|png)$/.test(name) || name==='index.html' || name==='manifest.webmanifest')).sort();
  const template=await readFile(path.join(source,'sw.js'),'utf8');
  const hash=createHash('sha256').update(template);
  for(const name of files) hash.update(name).update(await readFile(path.join(destination,name)));
  const version=hash.digest('hex').slice(0,20);
  const worker=template.replace('const BUILD = "development";',`const BUILD = ${JSON.stringify(version)};`)
    .replace('const FILES = [];',`const FILES = ${JSON.stringify(files.map(name=>name==='index.html'?'./':'./'+name))};`);
  await writeFile(path.join(destination,'sw.js'),worker);
  console.log(`PWA shell ${version}: ${files.length} public files, scoped to the installation path.`);
}
