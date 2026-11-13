#!/usr/bin/env node
// Multi-screen HUD renderer for the real Hearth HUD (src/ui/hearth). Mounts ONE Game (the slow part) and then, for every CSS direction, walks the screens.
//   node tools/concepts/hud-views.mjs --out=DIR --css=a.css,b.css (names = file basenames; 'base' = shipped CSS only) [--bg=img.png] [--w=1440] [--h=900] [--views=glance,build,...]
// Writes DIR/<dir>-<view>.png and DIR/<dir>-measure.json: DOM floors (text px, icon px, tap px) and contrast sampled from the rendered pixels.
import {createRequire} from 'node:module';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const flags=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>{const [k,...v]=a.slice(2).split('=');return[k,v.join('=')||true];}));
const W=+(flags.w||1440),H=+(flags.h||900),out=path.resolve(String(flags.out||'hud-out'));fs.mkdirSync(out,{recursive:true});
const cssList=String(flags.css||'').split(',').filter(Boolean);
const ALL=['glance','build','sel-building','council','contact','village','trade','ages','sel-unit','menu','testlab','alerts','map-closed'];
const views=flags.views?String(flags.views).split(','):ALL;
const esbuild=['/opt/npm-tools/node_modules/.bin/esbuild',path.join(root,'node_modules/.bin/esbuild')].find(p=>fs.existsSync(p));
const shim=path.join(root,'.hw-lucide-shim.mjs');
{const names=new Set(),walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(e.name))for(const m of fs.readFileSync(f,'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g))m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n=>names.add(n));}};walk(path.join(root,'src'));
 const alias={TriangleAlert:'LuTriangleAlert',Home:'LuHouse',Hourglass:'LuHourglass'};
 fs.writeFileSync(shim,"import * as L from 'react-icons/lu';import React from 'react';\n"+[...names].filter(n=>/^[A-Z]\w*$/.test(n)&&n!=='type').map(n=>`export const ${n}=(p)=>React.createElement(L.${alias[n]||'Lu'+n}||L.LuCircle,{...p,'data-icon':'${n}'});`).join('\n')+'\nexport default {};\n');}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hw-views-')),bundle=path.join(tmp,'ui.js');
execFileSync(esbuild,['tools/concepts/hud-views-entry.tsx','--bundle','--format=esm','--outfile='+bundle,'--alias:@=./src','--alias:three='+path.join(process.env.THREE_DIR||'node_modules/three','build/three.module.js'),'--loader:.css=empty','--jsx=automatic','--define:process.env.NODE_ENV="production"','--alias:three/addons/utils/BufferGeometryUtils.js=./tools/render-preview/shims/BufferGeometryUtils.js',...['EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','FilmPass','OutputPass'].map(n=>`--alias:three/addons/postprocessing/${n}.js=./tools/render-preview/shims/postprocessing.js`),'--alias:node:zlib=./tools/render-preview/shims/empty.js','--alias:three/examples/jsm/libs/fflate.module.js=./tools/render-preview/shims/fflate.js','--alias:lucide-react='+shim,'--log-level=error'],{cwd:root,stdio:'inherit'});
fs.rmSync(shim,{force:true});
const shipped=['hearth.css','glance.css','wildPanel.css'].map(f=>fs.readFileSync(path.join(root,'src/ui/hearth',f),'utf8')).join('\n'),code=fs.readFileSync(bundle,'utf8');
const need=n=>{for(const b of [root,'/home/claude/.npm-global/lib/node_modules','/opt/npm-tools/node_modules']){try{return createRequire(path.join(b,'x.js'))(n);}catch{}}throw new Error(n+' missing');};
const sharp=need('sharp'),pw=need('playwright');
const bg=await sharp(path.resolve(String(flags.bg||path.join(root,'docs/renders/map/3-wide.jpg')))).resize(W,H,{fit:'cover'}).jpeg({quality:92}).toBuffer();
const gcss=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const enc=[];{let depth=0,cur='';for(const ch of gcss){cur+=ch;if(ch==='{')depth++;if(ch==='}'){depth--;if(depth===0){if(/encounter|play-guide|contact-|leader-conv|portrait/.test(cur.split('{')[0])&&!cur.trim().startsWith('@'))enc.push(cur);cur='';}}}}
const html=`<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#6b7f4d url(/bg.jpg) center/cover;color:#f8efd9;font-family:system-ui,sans-serif}#root{position:fixed;inset:0}.world-minimap{position:relative;width:100%}.world-minimap canvas{width:100%;height:auto;display:block}.world-minimap-north{position:absolute}</style><style id=ship>${shipped}</style><style id=gl>${enc.join('\n')}</style><style id=dir></style><div id=root></div><script type=module src=/ui.js></script>`;
const server=http.createServer((q,r)=>{if(q.url==='/ui.js'){r.writeHead(200,{'content-type':'text/javascript'});r.end(code);}else if(q.url==='/bg.jpg'){r.writeHead(200,{'content-type':'image/jpeg'});r.end(bg);}else{r.writeHead(200,{'content-type':'text/html'});r.end(html);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await pw.chromium.launch({args:['--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
await page.addInitScript(()=>{try{localStorage.setItem('hearthwild.ui.hintGraphics','1');}catch{}});
page.on('pageerror',e=>console.error('[pageerror]',e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(()=>window.hwReady===true,null,{timeout:60000});
await page.evaluate(()=>window.hwMount({scenario:'glance',years:6}));
console.error('mounted');
const lin=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4;},L=([r,g,b])=>.2126*lin(r)+.7152*lin(g)+.0722*lin(b),cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const click=async n=>{const l=page.locator(`[aria-label="${n}"]`);if(await l.count())await l.first().click();else await page.getByText(n,{exact:true}).first().click();await page.waitForTimeout(350);};
const reset=async()=>{await page.keyboard.press('Escape');await page.waitForTimeout(120);
  if(await page.locator('.hw-tray').count())await click('Build');
  if(await page.locator('.hw-map.is-phone').count())await page.keyboard.press('Escape');
  if(await page.locator('.hw-map-reopen').count())await click('Show map (Shift+M)');
  await page.evaluate(()=>{window.hwEncounter(false);window.hwSel('none');});await page.waitForTimeout(250);};
const steps={
 glance:async()=>{},
 build:async()=>{await click('Build');},
 village:async()=>{await click('Village');},
 council:async()=>{await click('Council');},
 trade:async()=>{await click('Village');await page.getByRole('tab',{name:/Trade/}).first().click();await page.waitForTimeout(300);},
 ages:async()=>{await click('Ages');},
 contact:async()=>{await page.evaluate(()=>window.hwEncounter(true));await page.waitForTimeout(900);},
 'sel-building':async()=>{await page.evaluate(()=>window.hwSel('building'));await page.waitForTimeout(400);},
 'sel-unit':async()=>{await page.evaluate(()=>window.hwSel('worker'));await page.waitForTimeout(400);},
 menu:async()=>{await click('Menu');},
 testlab:async()=>{await click('Menu');await page.getByRole('tab',{name:/Tools/}).first().click();await page.waitForTimeout(250);await page.getByText('Test lab',{exact:true}).first().click();await page.waitForTimeout(900);},
 alerts:async()=>{},
 'map-closed':async()=>{await click('Hide map (Shift+M)');},
 'map-open':async()=>{},
};
const measure=async(file)=>{
 const rows=await page.evaluate(()=>{const res={text:[],icons:[],taps:[]};const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);if(!(r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity>0.05&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth))return false;
  for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const ps=getComputedStyle(p);if(ps.overflowY!=='visible'||ps.overflowX!=='visible'){const pr=p.getBoundingClientRect();if(r.bottom>pr.bottom+1||r.top<pr.top-1||r.right>pr.right+1||r.left<pr.left-1)return false;}} // clipped by a scroll/overflow ancestor: not on screen
  const t=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)));return !!t&&(e.contains(t)||t.contains(e));}; // skip anything covered by a modal/scrim
  const roots=[...document.querySelectorAll('.hw,dialog[open]')];if(!roots.length)return res;
  for(const hw of roots){const tw=document.createTreeWalker(hw,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;if(!e||!vis(e))continue;const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();if(b.width<3||b.height<3)continue;const s=getComputedStyle(e);res.text.push({t:t.slice(0,28),x:b.left,y:b.top,w:b.width,h:b.height,fs:parseFloat(s.fontSize),col:s.color,cls:(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className||'').toString().split(' ')[0]});}
  hw.querySelectorAll('svg').forEach(e=>{if(!vis(e))return;const r=e.getBoundingClientRect();res.icons.push({w:r.width,h:r.height,cls:(e.parentElement?.className||'').toString().split(' ')[0]});});
  hw.querySelectorAll('button,[role=tab],[role=button]').forEach(e=>{if(!vis(e))return;const r=e.getBoundingClientRect();res.taps.push({w:r.width,h:r.height,l:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,22),cls:(e.className||'').toString().split(' ')[0]});});}
  return res;});
 const img=sharp(file),meta=await img.metadata(),raw=await img.raw().toBuffer(),ch=meta.channels;
 const px=(x,y)=>{x=Math.max(0,Math.min(meta.width-1,Math.round(x)));y=Math.max(0,Math.min(meta.height-1,Math.round(y)));const i=(y*meta.width+x)*ch;return [raw[i],raw[i+1],raw[i+2]];};
 const crs=[];
 for(const t of rows.text){ // background = median of pixels in the text box; foreground = the box pixel farthest in contrast from it (the glyph core)
  const pts=[];const x0=Math.floor(t.x),x1=Math.ceil(t.x+t.w),y0=Math.floor(t.y),y1=Math.ceil(t.y+t.h);const sx=Math.max(1,Math.floor((x1-x0)/40)),sy=Math.max(1,Math.floor((y1-y0)/12));
  for(let y=y0;y<y1;y+=sy)for(let x=x0;x<x1;x+=sx)pts.push(px(x,y));
  if(pts.length<6)continue;const med=[0,1,2].map(k=>pts.map(p=>p[k]).sort((a,b)=>a-b)[pts.length>>1]);
  let best=1,fg=med;for(const p of pts){const c=cr(p,med);if(c>best){best=c;fg=p;}}
  crs.push({t:t.t,fs:t.fs,c:+best.toFixed(2),bg:med.join(','),fg:fg.join(','),cls:t.cls,at:[Math.round(t.x),Math.round(t.y),Math.round(t.w),Math.round(t.h)]});}
 const sorted=[...crs].sort((a,b)=>a.c-b.c);
 const big=rows.text.filter(t=>t.fs<16),sm=rows.icons.filter(i=>Math.min(i.w,i.h)<24),tp=rows.taps.filter(t=>Math.min(t.w,t.h)<52);
 return {textN:rows.text.length,minText:Math.min(...rows.text.map(t=>t.fs)),textBelow16:big.length,textBelow16Sample:[...new Set(big.map(t=>t.t+'@'+t.fs))].slice(0,6),
  iconN:rows.icons.length,minIcon:Math.min(...rows.icons.map(i=>Math.min(i.w,i.h))),iconsBelow24:sm.length,
  tapN:rows.taps.length,minTap:Math.min(...rows.taps.map(t=>Math.min(t.w,t.h))),tapsBelow52:tp.length,tapBelow52Sample:[...new Set(tp.map(t=>t.l+'@'+Math.round(t.w)+'x'+Math.round(t.h)))].slice(0,6),
  contrastMin:sorted[0]?.c,contrastP10:sorted[Math.floor(sorted.length*.1)]?.c,contrastMedian:sorted[sorted.length>>1]?.c,worst:sorted.slice(0,4)};};
const dirs=cssList.length?cssList:['base'];
for(const d of dirs){
 const name=path.basename(d,'.css');
 await page.evaluate(c=>{document.getElementById('dir').textContent=c;},d==='base'?'':fs.readFileSync(d,'utf8'));
 await page.waitForTimeout(500);
 const m={};
 for(const v of views){
  try{await reset();await steps[v]();await page.waitForTimeout(300);const f=path.join(out,`${name}-${v}.png`);await page.screenshot({path:f});m[v]=await measure(f);console.error(name,v,'ok');}
  catch(e){console.error(name,v,'FAILED',e.message.split('\n')[0]);m[v]={error:e.message.split('\n')[0]};}
 }
 fs.writeFileSync(path.join(out,`${name}-measure.json`),JSON.stringify(m,null,1));
}
await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});
