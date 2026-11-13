#!/usr/bin/env node
// Renders the first-person design mockups: docs/renders/firstperson/mockups/<name>.html -> docs/renders/firstperson/<name>.jpg (1440x900).
//   node tools/render-preview/firstperson-mockups.mjs [name ...]
// Pure HTML/CSS/SVG (no three.js). Needs playwright (repo node_modules or a global install); falls back to a system Chrome if no bundled browser exists.
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'docs/renders/firstperson/mockups'),outDir=path.join(root,'docs/renders/firstperson');
let req;for(const b of [root,'/home/claude/.npm-global/lib/node_modules','/opt/npm-tools/node_modules']){try{const r=createRequire(path.join(b,'x.js'));r.resolve('playwright');req=r;break;}catch{/* next */}}
if(!req)throw new Error('playwright is required');
const {chromium}=req('playwright');
const only=process.argv.slice(2);
const names=fs.readdirSync(dir).filter(f=>f.endsWith('.html')).map(f=>f.replace('.html','')).filter(n=>!only.length||only.includes(n));
let browser;try{browser=await chromium.launch();}catch{browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome'});}
for(const n of names){
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error('[pageerror]',n,e.message));
 await page.goto(pathToFileURL(path.join(dir,n+'.html')).href);await page.waitForTimeout(300);
 await page.screenshot({path:path.join(outDir,n+'.jpg'),type:'jpeg',quality:88});await page.close();console.log('built',n);
}
await browser.close();
