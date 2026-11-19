#!/usr/bin/env node
/** Static 390 px audit of the UI: lists panels whose fixed width cannot fit a 390x844 phone (366 px usable after 12 px gutters)
 * and buttons whose declared touch size is under 44 px. Run: node scripts/hearth-390-audit.mjs [--json]. Exit 0 always; it reports. */
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
const ROOT=new URL('..',import.meta.url).pathname,UI=join(ROOT,'src/ui'),USABLE=366,TOUCH=44;
const walk=d=>readdirSync(d).flatMap(f=>{const p=join(d,f);return statSync(p).isDirectory()?walk(p):[p];});
export function auditCss(name,text){
 const out=[];
 for(const m of text.matchAll(/([^{}]+)\{([^}]*)\}/g)){
  const sel=m[1].trim(),body=m[2];if(sel.startsWith('@'))continue;
  for(const d of body.matchAll(/(?:^|;)\s*(width|min-width)\s*:\s*(\d+(?:\.\d+)?)px/g)){const px=+d[2];if(px>USABLE)out.push({file:name,where:sel,kind:'too-wide',px});}
 }
 return out;
}
export function auditTsx(name,text){
 const out=[];
 for(const m of text.matchAll(/className=(?:"([^"]*)"|\{[^}]*?['"`]([^'"`]*)['"`])/g)){
  const cls=(m[1]??m[2]??'');
  for(const w of cls.matchAll(/(?:^|\s)(?:min-)?w-\[(\d+)px\]/g))if(+w[1]>USABLE)out.push({file:name,where:cls.slice(0,60),kind:'too-wide',px:+w[1]});
 }
 for(const b of text.matchAll(/<button\b([^>]{0,600}?)>/g)){
  const cls=b[1].match(/className=(?:"([^"]*)"|\{[^}]*?['"`]([^'"`]*)['"`])/);if(!cls)continue;const c=cls[1]??cls[2]??'';
  for(const h of c.matchAll(/(?:^|\s)min-h-(\d+)(?=\s|$)/g)){const px=+h[1]*4;if(px<TOUCH)out.push({file:name,where:c.slice(0,60),kind:'small-target',px,line:text.slice(0,b.index).split('\n').length});}
 }
 return out;
}
export function auditUi(dir=UI){
 const files=walk(dir).filter(f=>/\.(css|tsx)$/.test(f)&&!/\/\./.test(f));
 return files.flatMap(f=>{const t=readFileSync(f,'utf8'),n=relative(ROOT,f);return f.endsWith('.css')?auditCss(n,t):auditTsx(n,t);});
}
if(import.meta.url===`file://${process.argv[1]}`){
 const issues=auditUi();
 if(process.argv.includes('--json'))console.log(JSON.stringify(issues,null,1));
 else{for(const i of issues)console.log(`${i.kind.padEnd(12)} ${String(i.px).padStart(4)}px  ${i.file}${i.line?':'+i.line:''}  ${i.where}`);console.log(`${issues.length} issue(s) at 390x844`);}
}
