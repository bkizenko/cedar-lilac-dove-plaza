#!/usr/bin/env node
// Triangle budget breakdown of one building type: node tools/render-preview/breakdown.mjs <type> [era] [grammar]
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
await import(pathToFileURL(path.join(root,'scripts/game-loader.mjs')).href);
const style=await import('../../src/scene/buildingStyleMap.ts'),P=await import('../../src/scene/buildingParts.ts'),C=await import('../../src/game/constants.ts'),F=await import('../../src/scene/buildingFamilies.ts');
const [type,eraArg,grammar]=process.argv.slice(2),era=+(eraArg||3);
if(grammar)F.setBuildingGrammar(grammar);
const fp=C.BUILDINGS[type];
const spec=style.carvedBuildingSpec({worldSeed:1207,type,id:11,era,habitat:'plains',footprint:{w:fp.w,d:fp.d},prosperity:.5,settlementSeed:3});
console.log(spec.family,'tris near/mid/far',[0,1,2].map(t=>P.specTriangles(spec,t)).join('/'),'parts',spec.parts.length);
for(const lod of[0,1,2]){const by={};for(const p of spec.parts){if(p.lod!==lod)continue;const k=p.shape+'/'+p.mat+(p.anim?'*':'');by[k]=(by[k]||0)+P.partTriangles(p);}
  console.log(`parts that stop at lod ${lod}:`,Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,14).map(e=>e.join(':')).join('  '));}
