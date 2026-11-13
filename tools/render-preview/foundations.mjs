#!/usr/bin/env node
// Foundation ladder through the REAL game path (WorldView + Game, graded slope model): hut, house, granary, workshop on flat / 3 / 6 / 12 / 15 / 20 degrees.
//   NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=<dir with three/build> node tools/render-preview/foundations.mjs <outDir> [--slopes=0,6,15] [--types=hut,house,granary,workshop] [--dist=58] [--yaw=1.12] [--pitch=.38] [--tag=after] [--seed=4]
// Default camera is the game's own (WorldView yaw 1.12, pitch .38, dist 58). Pass --dist=24 for a close look.
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import http from 'node:http';import path from 'node:path';import fs from 'node:fs';import os from 'node:os';import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return[k,v??true];}));
const [outDir='docs/renders/foundations']=args.filter(a=>!a.startsWith('--'));
const slopes=String(flags.slopes||'0,6,15').split(',').map(Number),types=String(flags.types||'hut,house,granary,workshop').split(','),tag=flags.tag||'after';
const esbuild=['/opt/npm-tools/node_modules/.bin/esbuild',path.join(root,'node_modules/.bin/esbuild')].find(p=>fs.existsSync(p));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-found-')),bundle=path.join(tmp,'found.js'),sh=p=>'./tools/render-preview/shims/'+p;
execFileSync(esbuild,['tools/render-preview/found-entry.ts','--bundle','--format=esm','--outfile='+bundle,'--alias:@=./src','--alias:three/addons/utils/BufferGeometryUtils.js='+sh('BufferGeometryUtils.js'),
  ...['EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','FilmPass','OutputPass'].map(n=>`--alias:three/addons/postprocessing/${n}.js=${sh('postprocessing.js')}`),'--log-level=error'],{cwd:root,stdio:'inherit'});
const code=fs.readFileSync(bundle,'utf8');
const html='<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}canvas{display:block;width:100vw;height:100vh}</style><canvas id=c></canvas><script type=module src=/found.js></script>';
const server=http.createServer((q,r)=>{if(q.url==='/found.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(code);}else{r.writeHead(200,{'content-type':'text/html'});r.end(html);}});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
let pw;for(const b of [root,'/home/claude/.npm-global/lib/node_modules']){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:+(flags.w||1280),height:+(flags.h||800)},deviceScaleFactor:1});
page.on('console',m=>{if(m.type()==='error')console.error('[page]',m.text().slice(0,300));});page.on('pageerror',e=>console.error('[pageerror]',e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.hwLive===true,null,{timeout:120000});
const info=await page.evaluate(o=>window.hwFound(o),{seed:+(flags.seed||4),slopes,types,dist:+(flags.dist||58),yaw:+(flags.yaw||1.12),pitch:+(flags.pitch||.38)});
console.error('[found]',JSON.stringify(info.site));
fs.mkdirSync(outDir,{recursive:true});const log={};
for(const s of info.steps){const meta=await page.evaluate(id=>window.hwStep(id),s);log[s]=meta.placed;const f=path.join(outDir,`${types.join('-')}-${String(s).padStart(2,'0')}deg-${tag}${flags.dist?'-d'+flags.dist:''}.png`);fs.writeFileSync(f,await page.locator('#c').screenshot());console.error('[found] wrote',f,JSON.stringify(meta.placed.map(p=>[p.type,p.site?.foundation||'none',p.issue||''])));}
fs.writeFileSync(path.join(outDir,`log-${tag}.json`),JSON.stringify(log,null,1));
await browser.close();server.close();
