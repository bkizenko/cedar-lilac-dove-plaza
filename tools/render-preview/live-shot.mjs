#!/usr/bin/env node
// REAL in-game renderer shots: bundles the actual WorldView + Game (esbuild, no Vite) and renders them in headless
// Chromium (SwiftShader). Unlike the generator-only sheets this shows terrain, water, lighting and the live render path.
//   node tools/render-preview/live-shot.mjs <shot> <out.png> [--style=village|optionH|current] [--seed=4] [--age=3] [--dist=34] [--yaw=.9] [--pitch=.5]
// Shots: watermill | windmill | village  (see SHOTS below). three must resolve from ./node_modules (build/ only is enough: post-processing is stubbed).
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return[k,v??true];}));
const [shot='watermill',out='live.png']=args.filter(a=>!a.startsWith('--'));
const esbuild=['/opt/npm-tools/node_modules/.bin/esbuild',path.join(root,'node_modules/.bin/esbuild')].find(p=>fs.existsSync(p));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-live-'));
const bundle=path.join(tmp,'live.js'),sh=p=>'./tools/render-preview/shims/'+p;
if(!flags.reuse||!fs.existsSync(path.join(os.tmpdir(),'hw-live-bundle.js'))){
  execFileSync(esbuild,['tools/render-preview/live-entry.ts','--bundle','--format=esm','--outfile='+bundle,'--alias:@=./src','--alias:three/addons/utils/BufferGeometryUtils.js='+sh('BufferGeometryUtils.js'),
    ...['EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','FilmPass','OutputPass'].map(n=>`--alias:three/addons/postprocessing/${n}.js=${sh('postprocessing.js')}`),'--log-level=error'],{cwd:root,stdio:'inherit'});
  fs.copyFileSync(bundle,path.join(os.tmpdir(),'hw-live-bundle.js'));
}
const code=fs.readFileSync(path.join(os.tmpdir(),'hw-live-bundle.js'),'utf8');
const html='<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#000}canvas{display:block;width:100vw;height:100vh}</style><canvas id=c></canvas><script type=module src=/live.js></script>';
const server=http.createServer((q,r)=>{if(q.url==='/live.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(code);}else{r.writeHead(200,{'content-type':'text/html'});r.end(html);}});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
const req=createRequire(import.meta.url);let pw;
for(const b of [root,'/home/claude/.npm-global/lib/node_modules']){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
const {chromium}=pw;let sharp=null;try{sharp=createRequire('/home/claude/.npm-global/lib/node_modules/x.js')('sharp');}catch{}
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const W=+(flags.w||1280),H=+(flags.h||800);
const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.error('[page]',m.text().slice(0,300));});
page.on('pageerror',e=>console.error('[pageerror]',e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(()=>window.hwLive===true,null,{timeout:120000});
const opts={shot,style:flags.style||'village',seed:+(flags.seed||4),age:+(flags.age||3),dist:flags.dist?+flags.dist:null,yaw:flags.yaw?+flags.yaw:null,pitch:flags.pitch?+flags.pitch:null,frames:+(flags.frames||3),time:flags.time?+flags.time:null,x:flags.x?+flags.x:null,z:flags.z?+flags.z:null};
const info=await page.evaluate(o=>window.hwShot(o),opts);
console.error('[live]',JSON.stringify(info));
const raw=await page.locator('#c').screenshot();
let buf=raw;if(sharp)buf=await sharp(raw).png({compressionLevel:9}).toBuffer();
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,buf);
console.error(`[live] wrote ${out} (${(buf.length/1024).toFixed(0)} KB)`);
await browser.close();server.close();
