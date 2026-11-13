import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('tree detail steps cost strictly more from 1 to 4 (measured submission counts), step 2 is cheaper than the old Low, steps 4 and 5 equal the old Medium and High',{timeout:170000},()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tt-')),'c.json');
 execFileSync(process.execPath,['--import','./scripts/game-loader.mjs','--experimental-transform-types','scripts/diagnostics/tree-tier-cost.mjs',out],{stdio:'ignore'});
 const d=JSON.parse(fs.readFileSync(out,'utf8')),f=s=>d.steps[s].forward,a=s=>d.steps[s].allAround;
 for(const view of [f,a]){for(let s=1;s<4;s++){assert.ok(view(s).triangles<view(s+1).triangles,`triangles step ${s} < ${s+1}`);assert.ok(view(s).instances<=view(s+1).instances*1.05+50);assert.ok(view(s).drawCalls<=view(s+1).drawCalls);}assert.ok(view(4).triangles<=view(5).triangles*1.02);}
 assert.ok(f(2).triangles<d.legacy.low.triangles,'Low is cheaper than before');
 assert.equal(f(4).triangles,d.legacy.med.triangles,'step 4 is the old Medium trees');assert.equal(f(5).triangles,d.legacy.high.triangles,'step 5 is the old High trees');
 assert.ok(f(3).triangles>f(2).triangles*1.5&&f(3).triangles<f(4).triangles*.8,'the default sits clearly between Low and Medium');
});
