#!/usr/bin/env node
// Full-HUD screenshot: bundles the real HudHearth (or the archived Hud with --ui=classic) over a terrain still and renders it in headless Chromium.
//   node tools/render-preview/ui-hud-shot.mjs <none|worker|crowd|building|army|placing|alerts|raid|glance> <out.png> [--w=1440] [--h=900] [--dpr=1] [--clip=x,y,w,h] [--ui=hearth|classic] [--click='aria-label text'] [--theme=field]
// Same dependency notes as ui-council-shot.mjs (lucide-react is shimmed from react-icons).
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
const [screen='none',out='hud.png']=args.filter(a=>!a.startsWith('--'));
const esbuild=['/opt/npm-tools/node_modules/.bin/esbuild',path.join(root,'node_modules/.bin/esbuild')].find(p=>fs.existsSync(p));
// lucide-react may be a partial stub in sandboxes: build a shim exporting every icon the UI imports (react-icons/lu match, else a circle).
const shim=path.join(root,'.hw-lucide-shim.mjs');
{const names=new Set(),walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(e.name))for(const m of fs.readFileSync(f,'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g))m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n=>names.add(n));}};walk(path.join(root,'src'));
 const alias={TriangleAlert:'LuTriangleAlert',Home:'LuHouse',Hourglass:'LuHourglass'};
 fs.writeFileSync(shim,"import * as L from 'react-icons/lu';import React from 'react';\n"+[...names].filter(n=>/^[A-Z]\w*$/.test(n)&&n!=='type').map(n=>`export const ${n}=(p)=>React.createElement(L.${alias[n]||'Lu'+n}||L.LuCircle,{...p,'data-icon':'${n}'});`).join('\n')+'\nexport default {};\n');}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-ui-')),bundle=path.join(tmp,'ui.js');
execFileSync(esbuild,['tools/render-preview/ui-hud-entry.tsx','--bundle','--format=esm','--outfile='+bundle,'--alias:@=./src','--loader:.css=empty','--jsx=automatic','--define:process.env.NODE_ENV="production"','--alias:three/addons/utils/BufferGeometryUtils.js=./tools/render-preview/shims/BufferGeometryUtils.js',...['EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','FilmPass','OutputPass'].map(n=>`--alias:three/addons/postprocessing/${n}.js=./tools/render-preview/shims/postprocessing.js`),'--alias:node:zlib=./tools/render-preview/shims/empty.js','--alias:three/examples/jsm/libs/fflate.module.js=./tools/render-preview/shims/fflate.js','--alias:lucide-react='+shim,'--log-level=error'],{cwd:root,stdio:'inherit'});
fs.rmSync(shim,{force:true});
const css=['hearth.css','glance.css','wildPanel.css','contact.css'].map(f=>fs.readFileSync(path.join(root,'src/ui/hearth',f),'utf8')).join('\n'),code=fs.readFileSync(bundle,'utf8');
const bgFile=path.join(root,'docs/renders/map/3-wide.jpg');let bg=null;
// The map renders are before|after composites: keep the right-hand (painterly default) half as the terrain backdrop.
try{const sharp=createRequire('/home/claude/.npm-global/lib/node_modules/x.js')('sharp');bg=await sharp(bgFile).extract({left:800,top:36,width:800,height:414}).jpeg({quality:90}).toBuffer();}catch{}
const html=`<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#6b7f4d url(/bg.jpg) center/cover;color:#f8efd9;font-family:system-ui,sans-serif}#root{position:fixed;inset:0}.world-minimap{position:relative;width:100%}.world-minimap canvas{width:100%;height:auto;display:block}.world-minimap-north{position:absolute}${css}</style><div id=root></div><script type=module src=/ui.js></script>`;
const server=http.createServer((q,r)=>{if(q.url==='/ui.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(code);}else if(q.url==='/bg.jpg'&&bg){r.writeHead(200,{'content-type':'image/jpeg'});r.end(bg);}else{r.writeHead(200,{'content-type':'text/html'});r.end(html);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let pw;for(const b of [root,'/home/claude/.npm-global/lib/node_modules']){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
const browser=await pw.chromium.launch();
const page=await browser.newPage({viewport:{width:+(flags.w||1440),height:+(flags.h||900)},deviceScaleFactor:+(flags.dpr||1)});
if(!flags.hint)await page.addInitScript(()=>{try{localStorage.setItem('hearthwild.ui.hintGraphics','1');}catch{}});
page.on('pageerror',e=>console.error('[pageerror]',e.message));
page.on('console',m=>{if(m.type()==='error')console.error('[page]',m.text().slice(0,300));});
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(()=>window.hwReady===true,null,{timeout:60000});
if(flags.theme)await page.evaluate(t=>{document.documentElement.dataset.hwUi=t;},flags.theme);
else if(flags.ui==='classic')await page.evaluate(()=>{document.documentElement.dataset.hwUi='field';});
const info=await page.evaluate(o=>window.hwMount(o),{scenario:screen,ui:flags.ui,years:+(flags.years||6),seed:flags.seed?+flags.seed:undefined,age:flags.age?+flags.age:0,leader:!!flags.leader,legacy:!!flags.legacy,hostile:!!flags.hostile});
if(flags.click)for(const c of String(flags.click).split('|')){{const l=page.locator('[aria-label="'+c+'"]');await (await l.count()?l.first():page.getByText(c,{exact:true}).first()).click();}await page.waitForTimeout(400);}
{const clip=flags.clip?Object.fromEntries(String(flags.clip).split(',').map((v,i)=>[['x','y','width','height'][i],+v])):undefined;await page.screenshot({path:out,clip});}
if(flags.measure){const rows=await page.evaluate(()=>{const out=[];document.querySelectorAll('.hw button,.hw [role=button],.hw-chip,.hw-stat,.hw svg').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.height)out.push([e.tagName.toLowerCase()+'.'+((e.className&&e.className.baseVal)??e.className??'').toString().split(' ')[0],Math.round(r.width),Math.round(r.height),e.tagName!=='svg'?parseFloat(getComputedStyle(e).fontSize):0]);});return out;});fs.writeFileSync(String(flags.measure),JSON.stringify(rows));}
console.log(JSON.stringify(info));
await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});
