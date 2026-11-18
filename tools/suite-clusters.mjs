#!/usr/bin/env node
// Groups failing tests in a node --test TAP log by root-cause signature
// (error kind + first src/ frame, or the assertion text), so one fix can sweep a cluster.
// Usage: node tools/suite-clusters.mjs suite.tap [min=2]
import {readFileSync} from 'node:fs';
const [file,minArg]=process.argv.slice(2);if(!file){console.error('usage: suite-clusters.mjs <tap> [min]');process.exit(2);}
const lines=readFileSync(file,'utf8').split('\n'),min=Number(minArg||2),clusters=new Map();
for(let i=0;i<lines.length;i++){
 const m=/^\s*not ok \d+ - (.*)$/.exec(lines[i]);if(!m||/^\s{4,}/.test(lines[i]))continue;
 let kind='',frame='',loc='',msg='';
 for(let j=i+1;j<Math.min(lines.length,i+80)&&!/^\s*(not )?ok \d+ - /.test(lines[j]);j++){
  const l=lines[j];
  if(!loc){const f=/location: '.*\/(scripts\/[^:']+)/.exec(l);if(f)loc=f[1];}
  if(!kind){const e=/(?:error|failureType):\s*'?([^']*)'?/.exec(l);if(/^\s*error:/.test(l)&&e){msg=e[1];if(/^[|>]-?$/.test(msg.trim())){const more=[];for(let k=j+1;k<j+12&&more.length<3;k++){const t=(lines[k]||'').trim();if(!t||/actual - expected|Skipped lines/.test(t))continue;if(/^\w+:/.test(t)&&!/^(Expected|The|Missing)/.test(t))break;more.push(t);}msg=more.join(' ');}msg=msg.slice(0,90);}const c=/code: '?(ERR_\w+)/.exec(l);if(c)kind=c[1];}
  if(!frame){const s=/\/(src\/[^:)]+:\d+)/.exec(l);if(s)frame=s[1];}
 }
 const key=frame&&kind!=='ERR_ASSERTION'?`${kind||'Error'} @ ${frame}`:`${kind||'Error'}: ${msg.replace(/\d+(\.\d+)?/g,'#')}`;
 const c=clusters.get(key)??{n:0,tests:[]};c.n++;c.tests.push(`${loc} | ${m[1].slice(0,70)}`);clusters.set(key,c);
}
const sorted=[...clusters].sort((a,b)=>b[1].n-a[1].n);
for(const [k,c] of sorted){if(c.n<min)continue;console.log(`${c.n}x ${k}`);for(const t of c.tests.slice(0,6))console.log('   '+t);}
console.log(`clusters>=${min}: ${sorted.filter(([,c])=>c.n>=min).length}; singletons: ${sorted.filter(([,c])=>c.n<min).length}; failing tests: ${sorted.reduce((n,[,c])=>n+c.n,0)}`);
