#!/usr/bin/env node
// Wonder sheets: the registry wonders from the real kit (generateWonderKit) in three civ styles, finished and mid-construction, plus a ruin decay strip.
//   node tools/render-preview/wonders-sheet.mjs <out.png> --mode=finished|building|ruins [--civ=aureline] [--stage=1] [--cols=7] [--cell=70]
// Same code path as the game (WonderLayer.specFor kit spec; ruinSpecFor for ruins).
// Contact sheets of the real carved-building generators (every BldType family) rendered with real three.js in headless Chromium.
//   node tools/render-preview/wonders-sheet.mjs <out.png> [--types=watermill,windmill|all] [--eras=0,2,3,5] [--habitat=plains|forest|hills|desert|tundra|wetland]
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

const kit=await import('../../src/scene/wonderKit.ts'),ruin=await import('../../src/scene/ruinLayer.ts'),defs=await import('../../src/game/wonderDefs.ts'),rh=await import('../../src/game/rulerCore.ts');
const mode=flags.mode||'finished',civ=flags.civ||'aureline',stage=+(flags.stage??-1),W=+(flags.w||1800),H=+(flags.h||1100),pitch=+(flags.pitch||38)*Math.PI/180,yaw=+(flags.yaw??-.5),lod=0,habitat='plains';
const cols=+(flags.cols||7),cell=+(flags.cell||72);
const ids=defs.WONDER_DEFS.map(d=>d.id).filter(id=>kit.WONDER_KINDS.includes(id));
const kitSpec=(id,c,st)=>{const plan=kit.generateWonderKit({v:1,seed:rh.hash32('sheet',id,c),civ:c,family:id,options:{era:3,wealth:.6,...(st>=0&&st<4?{stage:st}:{})}});return{...plan.spec,materials:plan.materials,variantKey:`sheet.${id}.${c}.${st}`};};
const cells=[];
if(mode==='ruins'){const rows=[['wonder','ziggurat','aureline'],['wonder','lighthouse','hanrei'],['ancient','stoneCircle','brythen'],['village','house','sandrill']];const steps=[0,.2,.4,.6,.8,1];
 rows.forEach(([k,was,sty],r)=>steps.forEach((d,c)=>cells.push({spec:ruin.ruinSpecFor({kind:k,was,style:sty,seed:4242+r,w:k==='village'?9:44,d:k==='village'?9:44,id:'r'+r,decay:d,climate:'temperate'}),label:`${k}:${was} · ${sty} · decay ${Math.round(d*100)}%`})));}
else if(mode==='building')for(const id of ids.slice(0,+(flags.n||14)))for(const st of [1,2])cells.push({spec:kitSpec(id,civ,st),label:`${id} · ${civ} · stage ${st+1}/4`});
else for(const id of ids)cells.push({spec:kitSpec(id,civ,-1),label:`${id} · ${civ}`});
const rows=Math.ceil(cells.length/(mode==='ruins'?6:cols)),C=mode==='ruins'?6:cols,soup=new Soup('wonders'),base=new Soup('plinths'),labels=[];
const totalW=C*cell,totalD=rows*cell;
base.add(slab(totalW+4,totalD+4,.6,'#6f7f48',.0),{x:0,z:0});
let tris=0;const stats=[];
cells.forEach((cl,i)=>{const c=i%C,rw=Math.floor(i/C),x=-totalW/2+cell*(c+.5),z=-totalD/2+cell*(rw+.5);if(!cl.spec)return;
 base.add(slab(cell-2,cell-2,.18,'#7a8b4d',.0),{x,z,y:.18});
 soup.add(specMesh(cl.spec,lod),{x,y:.18,z,yaw});const t=PT.specTriangles(cl.spec,lod);tris+=t;stats.push(cl.label+' '+t);
 labels.push({world:[x-cell*.46,.3,z+cell*.46],text:cl.label,align:'left',size:11});});

console.error(stats.join('\n'));
const half=Math.max(totalW,totalD*1.0)/2,dist=400,ortho=flags.ortho!==false;
const aspect=W/H,halfH=Math.max(totalD/2*1.02/Math.cos(0)*Math.sin(pitch)+3,totalW/2/aspect*1.0);
const rig=rigFor('golden');
const scene={width:W,height:H,background:'#c9d6dc',camera:{ortho:Math.max(halfH*1.04,(totalW/2+1)/aspect),eye:[0,Math.sin(pitch)*dist,Math.cos(pitch)*dist],target:[0,0,0],near:10,far:1200},
  rig:{...rig,fogNearMetres:1e4,fogFarMetres:2e4,hemiSky:'#f2f4f8',hemiGround:'#7b6a4c',hemiIntensity:1.0,sun:'#fff3dc',sunIntensity:2.6,exposure:1.0},shadow:{center:[0,0,0],radius:half*1.15},grain:grainTexture(),meshes:[base.encode(),soup.encode()],
  labels:[...labels,{x:14,y:20,text:flags.title||`Wonders · ${mode} · ${tris} tris`,align:'left',size:14,weight:700}]};
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png'};
const server=http.createServer((q,r)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname),f=path.join(root,u);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
let pw;for(const b of[root,'/home/claude/.npm-global/lib/node_modules']){try{pw=createRequire(path.join(b,'x.js'))('playwright');break;}catch{}}
let sharp=null;try{sharp=createRequire('/home/claude/.npm-global/lib/node_modules/x.js')('sharp');}catch{}
const browser=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
page.on('pageerror',e=>console.error('[pageerror]',e.message));
const lite=(!fs.existsSync(path.join(root,'node_modules/three/examples/jsm/postprocessing/EffectComposer.js'))||!!process.env.THREE_LITE);
await page.goto(`http://127.0.0.1:${server.address().port}/tools/render-preview/${lite?'three-lite.html':'three.html'}`);
await page.waitForFunction(()=>window.threeReady===true,null,{timeout:60000});
await page.evaluate(([s,o])=>window.renderSceneThree(s,o),[{...scene,pixelRatio:1},{tone:'neutral',ao:false}]);
const raw=await page.locator('#wrap').screenshot();let buf=raw;if(sharp)buf=await sharp(raw).png({compressionLevel:9,palette:flags.palette8?true:false}).toBuffer();
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,buf);console.error(`wrote ${out} (${(buf.length/1024).toFixed(0)} KB)`);
await browser.close();server.close();
