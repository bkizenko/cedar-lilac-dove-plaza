#!/usr/bin/env node
// Material/texture sheets with the real carved layer + real shader (esbuild bundle, headless Chromium/SwiftShader).
//   NODE_PATH=/opt/npm-tools/node_modules node tools/render-preview/materials.mjs <sheet> <out.png> [--mode=set|legacy] [--detail=standard|high|ultra] [--tier=0|1] [--wet=.] [--sun=.] [--moss=.]
// Sheets: huts (14 civs x 1 era-1 hut), houses, halls, markets, mills, row:<civ> (12-hut village row), all-civ:<type>
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import http from 'node:http';import path from 'node:path';import fs from 'node:fs';import os from 'node:os';import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return[k,v??true];}));
const [sheet='huts',out='sheet.png']=args.filter(a=>!a.startsWith('--'));
const CIVS=['sandrill','nilemark','tigrane','hanrei','vedara','aureline','sahelan','quillan','kaaltun','mekhari','brythen','rusvolt','steppan','skoldar'];
const esbuild=['/opt/npm-tools/node_modules/.bin/esbuild',path.join(root,'node_modules/.bin/esbuild')].find(p=>fs.existsSync(p));
const bundle=path.join(os.tmpdir(),'hw-materials-bundle.js'),sh=p=>'./tools/render-preview/shims/'+p;
execFileSync(esbuild,['tools/render-preview/materials-entry.ts','--bundle','--format=esm','--outfile='+bundle,'--alias:@=./src','--alias:three/addons/utils/BufferGeometryUtils.js='+sh('BufferGeometryUtils.js'),'--log-level=error'],{cwd:root,stdio:'inherit'});
const code=fs.readFileSync(bundle,'utf8'),html='<!doctype html><meta charset=utf-8><style>html,body{margin:0}canvas{display:block}</style><canvas id=c></canvas><script type=module src=/m.js></script>';
const server=http.createServer((q,r)=>{if(q.url==='/m.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(code);}else{r.writeHead(200,{'content-type':'text/html'});r.end(html);}});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
let pw;for(const b of[root,'/home/claude/.npm-global/lib/node_modules']){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
const tier=+(flags.tier??1),spacing=+(flags.spacing||(tier===0?12:13));
const cells=[];let cols=7,title=sheet;
if(sheet.startsWith('row:')){const civ=sheet.slice(4);cols=6;for(let k=0;k<12;k++)cells.push({type:'hut',civ,era:+(flags.era??1),id:11+k*5,x:0,z:0,prosperity:((k*37)%10)/10,label:undefined});title=`${civ} huts, one village, ${tier?'mid':'close'}`;}
else{const type={huts:'hut',houses:'house',halls:'townhall',markets:'market',mills:'watermill',temples:'temple',smithies:'forge',granaries:'warehouse'}[sheet]||sheet.replace('all-civ:',''),era=+(flags.era??(type==='hut'?1:3));for(const civ of (flags.civs?String(flags.civs).split(','):CIVS))cells.push({type,civ,era,id:11+CIVS.indexOf(civ)*3,x:0,z:0,label:civ});title=`${type} era ${era}, 14 civs, ${tier?'mid':'close'}`;}
if(flags.cols)cols=+flags.cols;
cells.forEach((c,i)=>{c.x=((i%cols)-(cols-1)/2)*spacing;c.z=(Math.floor(i/cols)-(Math.ceil(cells.length/cols)-1)/2)*spacing;});
const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const W=+(flags.w||1700),H=+(flags.h||1000),page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.error('[page]',m.text().slice(0,300));});page.on('pageerror',e=>console.error('[pageerror]',e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.hwReady===true,null,{timeout:60000});
const res=await page.evaluate(o=>window.hwMat(o),{width:W,height:H,mode:flags.mode||'set',detail:flags.detail||'standard',weather:{wet:flags.wet!==undefined?+flags.wet:0,sun:flags.sun!==undefined?+flags.sun:.4,moss:flags.moss!==undefined?+flags.moss:.5},tier,cells,cols,spacing,title:`${title} · ${flags.mode||'set'} · ${flags.detail||'standard'}`,dist:flags.dist?+flags.dist:undefined,pitch:flags.pitch?+flags.pitch:undefined,fov:flags.fov?+flags.fov:undefined,snow:flags.snow?+flags.snow:0,hutVariety:flags.hutvar!=='off'});
fs.writeFileSync(out,Buffer.from(res.url.split(',')[1],'base64'));console.error('[materials]',JSON.stringify({out,stats:res.stats,mem:res.mem}));await browser.close();server.close();
