#!/usr/bin/env node
// Builds the UI/UX proposal mockups: real HTML/CSS (docs/renders/uiux/mockups/*.html) rendered to JPEG (docs/renders/uiux/*.jpg) in headless Chromium.
//   node tools/render-preview/uiux-mockups.mjs [name ...]
// Sources are docs/renders/uiux/mockups/src/<name>.src.html with {{IconName}} / {{IconName:px}} placeholders (lucide shapes via react-icons/lu);
// an optional first-line comment <!-- size WxH --> sets the viewport. Needs react, react-dom, react-icons and playwright (global or ./node_modules).
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'docs/renders/uiux/mockups'),src=path.join(dir,'src'),outDir=path.join(root,'docs/renders/uiux');
let req;for(const b of [root,'/home/claude/.npm-global/lib/node_modules','/opt/npm-tools/node_modules']){try{const r=createRequire(path.join(b,'x.js'));r.resolve('react-icons/lu');r.resolve('playwright');req=r;break;}catch{}}
if(!req)throw new Error('react-icons and playwright are required');
const React=req('react'),{renderToStaticMarkup}=req('react-dom/server'),LU=req('react-icons/lu'),{chromium}=req('playwright');
const only=process.argv.slice(2);
const icon=(name,px)=>{const C=LU['Lu'+name];if(!C){console.error('missing icon',name);return icon('Circle',px);}return renderToStaticMarkup(React.createElement(C,{size:px||34,strokeWidth:2}));};
const names=fs.readdirSync(src).filter(f=>f.endsWith('.src.html')).map(f=>f.replace('.src.html','')).filter(n=>!only.length||only.includes(n));
const browser=await chromium.launch();
for(const n of names){
 let html=fs.readFileSync(path.join(src,n+'.src.html'),'utf8');
 const m=html.match(/<!--\s*size\s+(\d+)x(\d+)\s*-->/),W=m?+m[1]:1440,H=m?+m[2]:900;
 html=html.replace(/\{\{(\w+)(?::(\d+))?\}\}/g,(_,a,b)=>icon(a,b?+b:undefined));
 const file=path.join(dir,n+'.html');fs.writeFileSync(file,html);
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error('[pageerror]',n,e.message));
 await page.goto(pathToFileURL(file).href);await page.waitForTimeout(250);
 await page.screenshot({path:path.join(outDir,n+'.jpg'),fullPage:false});await page.close();console.log('built',n,W+'x'+H);
}
await browser.close();
