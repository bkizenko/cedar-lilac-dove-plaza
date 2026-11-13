#!/usr/bin/env node
// Tree detail ladder sheet. NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=<three> node tools/render-preview/tree-ladder.mjs <out.png> [--w=480] [--h=300]
import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';import os from 'node:os';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return[k,v];}));
const out=args.find(a=>!a.startsWith('--'))||'tree-ladder.png';
const req=createRequire('/opt/npm-tools/node_modules/x.js'),esbuild=req('esbuild'),{chromium}=req('playwright');
const three=process.env.THREE_DIR||path.join(root,'node_modules/three');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-ladder-')),bundle=path.join(tmp,'b.js');
const addons={name:'addons',setup(b){b.onResolve({filter:/^three\/addons\//},a=>{const f=path.join(three,'examples/jsm',a.path.slice(13));return fs.existsSync(f)?{path:f}:{path:path.join(root,'tools/render-preview/shims',a.path.includes('postprocessing')?'post.js':path.basename(a.path))};});}};
await esbuild.build({entryPoints:[path.join(root,'tools/render-preview/tree-ladder-entry.ts')],bundle:true,format:'iife',outfile:bundle,absWorkingDir:root,tsconfig:path.join(root,'tsconfig.json'),logLevel:'error',alias:{three:path.join(three,'build/three.module.js')},plugins:[addons],define:{'process.env.NODE_ENV':'"production"'}});
fs.writeFileSync(path.join(tmp,'p.html'),'<!doctype html><meta charset=utf-8><body style="margin:0;background:#222"><script src="file://'+bundle+'"></script>');
const sharp=req('sharp'),W=+(flags.w||480),H=+(flags.h||300),PAD=30,tiles=[],info=[];
for(const view of ['close','mid'])for(const step of [1,2,3,4,5]){
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});const p=await b.newPage({viewport:{width:W,height:H}});
 p.on('pageerror',e=>console.error('[pageerror]',e.message));
 let r=null;for(let t=0;t<8&&!r;t++){if(t)await new Promise(r=>setTimeout(r,15000));try{await p.goto('file://'+path.join(tmp,'p.html'));await p.waitForFunction(()=>window.ladderReady===true);r=await p.evaluate(o=>window.renderTile(o),{w:W,h:H,step,view});}catch(e){console.error('retry',view,step,String(e.message).slice(0,60));}}
 await b.close();if(!r)throw new Error('tile failed '+view+step);
 tiles.push({view,step,label:r.label,calls:r.calls,tris:r.triangles,buf:Buffer.from(r.png.split(',')[1],'base64')});info.push({view,step,label:r.label,calls:r.calls,triangles:r.triangles});console.error('tile',view,step,r.calls,r.triangles);
}
const comps=[],svg=[];tiles.forEach((t,i)=>{const col=i%5,row=Math.floor(i/5),x=col*W,y=row*(H+PAD)+PAD;comps.push({input:t.buf,left:x,top:y});svg.push(`<text x="${x+8}" y="${y-9}" font-family="sans-serif" font-size="17" font-weight="bold" fill="#f4ead0">${t.view}  step ${t.step} ${t.label}  ${t.calls} calls  ${Math.round(t.tris/1000)}k tris</text>`);});
comps.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${5*W}" height="${2*(H+PAD)}">${svg.join('')}</svg>`),left:0,top:0});
await sharp({create:{width:5*W,height:2*(H+PAD),channels:3,background:'#222'}}).composite(comps).png().toFile(out);console.log(JSON.stringify(info));
