#!/usr/bin/env node
// Settings-UI screenshot: the real GraphicsSettingsPanel on the real controller, every <option> listed (select size = option count) so all choices are visible and selectable.
//   NODE_PATH=/opt/npm-tools/node_modules node tools/render-preview/gfx-settings-shot.mjs <out.png> [--ease] [--pick=graphics:high,draw:ultra,trees:5]
import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';import os from 'node:os';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,...v]=a.slice(2).split('=');return[k,v.length?v.join('='):true];}));
const out=args.find(a=>!a.startsWith('--'))||'gfx-settings.png';
const req=createRequire('/opt/npm-tools/node_modules/x.js');
const esbuild='/opt/npm-tools/node_modules/.bin/esbuild',tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-gfx-')),bundle=path.join(tmp,'ui.js');
execFileSync(esbuild,['tools/render-preview/gfx-settings-entry.tsx','--bundle','--format=iife','--outfile='+bundle,'--alias:@=./src','--jsx=automatic','--define:process.env.NODE_ENV="production"','--log-level=error','--external:@/game/engine'],{cwd:root,stdio:'inherit',env:{...process.env,NODE_PATH:'/opt/npm-tools/node_modules'}});
const css=fs.readFileSync(path.join(root,'src/ui/hearth/hearth.css'),'utf8');
const html=`<!doctype html><meta charset=utf-8><style>${css}</style><style>body{margin:0;padding:24px;background:#3d4a2c;color:#f8efd9;font-family:system-ui,sans-serif;width:560px}.hw-form select[size]{display:block;margin:4px 0 8px}</style><div id=root></div><script>${fs.readFileSync(bundle,'utf8').replace(/<\/script/g,'<\\/script')}</script>`;
const htmlFile=path.join(tmp,'p.html');fs.writeFileSync(htmlFile,html);
const {chromium}=req('playwright');const b=await chromium.launch();const p=await b.newPage({viewport:{width:620,height:900}});
p.on('pageerror',e=>console.error('[pageerror]',e.message));
await p.goto('file://'+htmlFile);await p.waitForFunction(()=>window.gfxReady===true);
const pick={};if(flags.pick)for(const kv of String(flags.pick).split(',')){const [k,v]=kv.split(':');pick[k]=k==='trees'&&v!=='auto'?+v:v;}
await p.evaluate(o=>window.gfxMount(o),{easeFirst:!!flags.ease,pick});
await p.evaluate(()=>{document.querySelectorAll('select').forEach(s=>{s.size=s.options.length;});});
const info=await p.evaluate(()=>[...document.querySelectorAll('select')].map(s=>({label:s.getAttribute('aria-label'),value:s.value,options:[...s.options].map(o=>({v:o.value,t:o.textContent,disabled:o.disabled}))})));
await p.locator('section').screenshot({path:out});console.log(JSON.stringify(info));await b.close();
