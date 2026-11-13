#!/usr/bin/env node
// Hearth UI screenshot: bundles the real screens (esbuild) and renders them in headless Chromium.
//   node tools/render-preview/ui-council-shot.mjs <council|menu> <out.png> [--tab=society] [--w=1440] [--h=900] [--years=8]
// Needs react, react-dom, lucide-react (or the react-icons stub) in ./node_modules.
import {createRequire} from 'node:module';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return[k,v??true];}));
const [screen='council',out='ui.png']=args.filter(a=>!a.startsWith('--'));
const esbuild=['/opt/npm-tools/node_modules/.bin/esbuild',path.join(root,'node_modules/.bin/esbuild')].find(p=>fs.existsSync(p));
// lucide-react may be a partial stub in sandboxes: build a shim exporting every icon the UI imports (react-icons/lu match, else a circle).
const shim=path.join(root,'.hw-lucide-shim.mjs');
{const names=new Set(),walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(e.name))for(const m of fs.readFileSync(f,'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g))m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n=>names.add(n));}};walk(path.join(root,'src'));
 const alias={TriangleAlert:'LuTriangleAlert',Home:'LuHouse',Hourglass:'LuHourglass'};
 fs.writeFileSync(shim,"import * as L from 'react-icons/lu';import React from 'react';\n"+[...names].filter(n=>/^[A-Z]\w*$/.test(n)&&n!=='type').map(n=>`export const ${n}=(p)=>React.createElement(L.${alias[n]||'Lu'+n}||L.LuCircle,{...p,'data-icon':'${n}'});`).join('\n')+'\nexport default {};\n');}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-ui-')),bundle=path.join(tmp,'ui.js');
execFileSync(esbuild,['tools/render-preview/ui-council-entry.tsx','--bundle','--format=esm','--outfile='+bundle,'--alias:@=./src','--loader:.css=empty','--jsx=automatic','--define:process.env.NODE_ENV="production"','--alias:three/addons/utils/BufferGeometryUtils.js=./tools/render-preview/shims/BufferGeometryUtils.js',...['EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','FilmPass','OutputPass'].map(n=>`--alias:three/addons/postprocessing/${n}.js=./tools/render-preview/shims/postprocessing.js`),'--alias:node:zlib=./tools/render-preview/shims/empty.js','--alias:three/examples/jsm/libs/fflate.module.js=./tools/render-preview/shims/fflate.js','--alias:lucide-react='+shim,'--log-level=error'],{cwd:root,stdio:'inherit'});
fs.rmSync(shim,{force:true});
const css=fs.readFileSync(path.join(root,'src/ui/hearth/hearth.css'),'utf8'),code=fs.readFileSync(bundle,'utf8');
const html=`<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#1b140d;color:#f8efd9;font-family:system-ui,sans-serif}${css}</style><div id=root></div><script type=module src=/ui.js></script>`;
const server=http.createServer((q,r)=>{if(q.url==='/ui.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(code);}else{r.writeHead(200,{'content-type':'text/html'});r.end(html);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let pw;for(const b of ['/home/claude/.npm-global/lib/node_modules',root]){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
const browser=await pw.chromium.launch();
const page=await browser.newPage({viewport:{width:+(flags.w||1440),height:+(flags.h||900)}});
page.on('pageerror',e=>console.error('[pageerror]',e.message));
page.on('console',m=>{if(m.type()==='error')console.error('[page]',m.text().slice(0,300));});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(()=>window.hwReady===true,null,{timeout:60000});
await page.evaluate(o=>window.hwMount(o),{screen,tab:flags.tab,years:+(flags.years||8)});
await page.screenshot({path:out});
await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});
