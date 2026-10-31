import {readdirSync,readFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Nitro's SSR stylesheet URL may have a different emitted hash from the
 * client's bundled stylesheet. Preserve the exact referenced emitted asset. */
export function completeStaticStyles(output,emitted){
 const names=new Set();
 function scan(folder){if(!existsSync(folder))return;for(const item of readdirSync(folder,{withFileTypes:true})){
  const path=join(folder,item.name);if(item.isDirectory())scan(path);
  else if(/\.(?:mjs|js)$/.test(item.name))for(const match of readFileSync(path,'utf8').matchAll(/\/assets\/([A-Za-z0-9_.-]+\.css)(?:[?"'`]|$)/g))names.add(match[1]);
 }}
 scan(resolve(output,'functions'));const copied=[];
 for(const name of [...names].sort()){
  const destination=resolve(output,'static/assets',name);if(existsSync(destination))continue;
  const source=resolve(emitted,name);if(!existsSync(source))throw new Error(`Build references a missing stylesheet: ${name}`);
  mkdirSync(dirname(destination),{recursive:true});copyFileSync(source,destination);copied.push(name);
 }
 return{referenced:[...names].sort(),copied};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const result=completeStaticStyles(resolve(root,'.vercel/output'),resolve(root,'node_modules/.nitro/vite/services/ssr/assets'));
 console.log(`Stylesheets verified: ${result.referenced.length}; restored exact emitted assets: ${result.copied.length}`);
}
