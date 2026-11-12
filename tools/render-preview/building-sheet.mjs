#!/usr/bin/env node
// Contact sheets of the real carved-building generators (every BldType family) rendered with real three.js in headless Chromium.
//   node tools/render-preview/building-sheet.mjs <out.png> [--types=watermill,windmill|all] [--eras=0,2,3,5] [--habitat=plains|forest|hills|desert|tundra|wetland]
//        [--grammar=village|legacy] [--palette=village|honey] [--lod=0|1|2] [--cols=4] [--cell=13] [--pitch=40] [--yaw=-.55] [--w=1600] [--h=1000] [--title=...] [--ortho=1]
// One cell per (type, era); labels show type, family, era and triangle count at the chosen LOD. Same code path as the game (carvedBuildingSpec -> buildCarvedMesh).
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
await import(pathToFileURL(path.join(root,'scripts/game-loader.mjs')).href);
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return[k,v??true];}));
const out=path.resolve(args.find(a=>!a.startsWith('--'))||'sheet.png');
const {Soup,specMesh,slab,grainTexture,palette,parts:PT}=await import('./scene-lib.mjs');
const {rigFor}=await import('./rigs.mjs');
const fam=await import('../../src/scene/buildingFamilies.ts'),style=await import('../../src/scene/buildingStyleMap.ts'),pal=await import('../../src/scene/carvedPalette.ts'),mesh=await import('../../src/scene/carvedMesh.ts');
const {BUILDINGS}=await import('../../src/game/constants.ts');
fam.setBuildingGrammar(flags.grammar||'village');pal.setCarvedPalette(flags.palette||'village');
const hexf=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const types=!flags.types||flags.types==='all'?style.CARVED_TYPES:flags.types.split(',');
const eras=(flags.eras||'2').split(',').map(Number),lod=+(flags.lod??0),cols=+(flags.cols||4),cell=+(flags.cell||13),habitat=flags.habitat||'plains';
const W=+(flags.w||1600),H=+(flags.h||1000),pitch=+(flags.pitch||40)*Math.PI/180,yaw=+(flags.yaw??-.55);
const cells=[];for(const t of types)for(const e of eras)cells.push([t,e]);
const rows=Math.ceil(cells.length/cols),soup=new Soup('buildings'),base=new Soup('plinths'),labels=[];
const totalW=cols*cell,totalD=rows*cell;
// Terrain: simple natural slab so contrast against grass/ground reads like the game.
base.add(slab(totalW+4,totalD+4,.6,'#6f7f48',.0),{x:0,z:0});
let tris=0;const stats=[];
cells.forEach(([type,era],i)=>{
  const c=i%cols,rw=Math.floor(i/cols),x=-totalW/2+cell*(c+.5),z=-totalD/2+cell*(rw+.5);
  const fp=BUILDINGS[type],input={worldSeed:1207,type,id:11+(flags.id?+flags.id:0),era,habitat,footprint:{w:fp.w,d:fp.d},prosperity:flags.prosperity?+flags.prosperity:.5,settlementSeed:3,...(type==='dock'||type==='aqueduct'?{waterSide:'-z'}:{}),...(['palisade','stonewall','trench','moat'].includes(type)?{wallAxis:'x'}:{})};
  let spec=style.carvedBuildingSpec(input);if(!spec)return;
  if(flags.only==='anim')spec={...spec,parts:spec.parts.filter(p=>p.anim)};
  const m=specMesh(spec,lod),tri=PT.specTriangles(spec,lod);
  // recolour each part from the ACTIVE palette (specMesh already used buildCarvedMesh, which does this)
  base.add(slab(cell-.8,cell-.8,.18,'#7a8b4d',.0),{x,z,y:.18});
  soup.add(m,{x,y:.18,z,yaw});
  const near=PT.specTriangles(spec,0),mid=PT.specTriangles(spec,1),farT=PT.specTriangles(spec,2);stats.push(`${type} e${era} ${spec.family}: ${near}/${mid}/${farT} tris`);
  labels.push({world:[x-cell*.46,.3,z+cell*.46],text:`${type} · ${spec.family} · e${era}${flags.legend===false?'':'  '+near+'/'+mid+'/'+farT}`,align:'left',size:11});
  tris+=tri;
});
console.error(stats.join('\n'));
const half=Math.max(totalW,totalD*1.0)/2,dist=400,ortho=flags.ortho!==false;
const aspect=W/H,halfH=Math.max(totalD/2*1.02/Math.cos(0)*Math.sin(pitch)+3,totalW/2/aspect*1.0);
const rig=rigFor('golden');
const scene={width:W,height:H,background:'#c9d6dc',camera:{ortho:Math.max(halfH*1.04,(totalW/2+1)/aspect),eye:[0,Math.sin(pitch)*dist,Math.cos(pitch)*dist],target:[0,0,0],near:10,far:1200},
  rig:{...rig,fogNearMetres:1e4,fogFarMetres:2e4,hemiSky:'#f2f4f8',hemiGround:'#7b6a4c',hemiIntensity:1.0,sun:'#fff3dc',sunIntensity:2.6,exposure:1.0},shadow:{center:[0,0,0],radius:half*1.15},grain:grainTexture(),meshes:[base.encode(),soup.encode()],
  labels:[...labels,{x:14,y:20,text:flags.title||`Buildings · grammar ${flags.grammar||'village'} · palette ${flags.palette||'village'} · LOD ${lod} · ${habitat}`,align:'left',size:14,weight:700}]};
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png'};
const server=http.createServer((q,r)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname),f=path.join(root,u);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
let pw;for(const b of[root,'/home/claude/.npm-global/lib/node_modules']){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
let sharp=null;try{sharp=createRequire('/home/claude/.npm-global/lib/node_modules/x.js')('sharp');}catch{}
const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
page.on('pageerror',e=>console.error('[pageerror]',e.message));
const lite=!fs.existsSync(path.join(root,'node_modules/three/examples/jsm/postprocessing/EffectComposer.js'));
await page.goto(`http://127.0.0.1:${server.address().port}/tools/render-preview/${lite?'three-lite.html':'three.html'}`);
await page.waitForFunction(()=>window.threeReady===true,null,{timeout:60000});
await page.evaluate(([s,o])=>window.renderSceneThree(s,o),[{...scene,pixelRatio:1},{tone:'neutral',ao:false}]);
const raw=await page.locator('#wrap').screenshot();let buf=raw;if(sharp)buf=await sharp(raw).png({compressionLevel:9,palette:flags.palette8?true:false}).toBuffer();
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,buf);console.error(`wrote ${out} (${(buf.length/1024).toFixed(0)} KB)`);
await browser.close();server.close();
