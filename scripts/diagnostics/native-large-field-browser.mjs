// Isolated native-terrain correctness checks, never the user's browser/save.
// Searches genuinely clear known ground; no automatic clearing or flattening.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {chromium} from 'playwright';
import {SAVE_KEY} from '../../src/game/constants.ts';import {decodeGame} from '../../src/game/persistence.ts';
const base=process.env.BASE_URL||'http://127.0.0.1:8102',path=process.env.VILLAGE_EXPORT;
if(!path)throw new Error('Set VILLAGE_EXPORT to a local village export; private exports are not bundled.');
const original=readFileSync(path,'utf8'),raw=JSON.parse(original),save={...raw,state:{...raw.state,paused:true},savedAt:Date.now()};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});const watchdog=setTimeout(()=>browser.close().catch(()=>{}),120000);
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,save})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('hearthwild:graphics-quality','low');},{key:SAVE_KEY,save});
 await page.goto(base,{waitUntil:'commit',timeout:15000});await page.waitForFunction(()=>window.__engine?.game?.state?.units?.length&&window.__engine?.view?.unitMeshes?.get('worker')?.count>0,undefined,{timeout:75000});
 const result=await page.evaluate(async key=>{
  const e=window.__engine,g=e.game,v=e.view,must=(x,s)=>{if(!x)throw new Error(s);};g.state.paused=true;e.keys.clear();
  must(g.state.worldgenVersion===18,'Expected native V18 export');const terrain=g.world.heights.slice(),beforeTime=g.state.time,home=g.campOf(0),size={w:32.8,d:32.8};let site=null,probes=0;const blockers={};
  const anchors=g.state.buildings.filter(b=>b.team===0&&b.type==='farm').map(b=>({x:b.x,z:b.z})).slice(0,12);anchors.push(home);
  const seen=new Set();const start=performance.now();
  for(const anchor of anchors){for(let r=0;r<=4&&!site&&probes<320;r++)for(let z=-r;z<=r&&!site&&probes<320;z++)for(let x=-r;x<=r&&!site&&probes<320;x++){
   if(Math.max(Math.abs(x),Math.abs(z))!==r)continue;const p={x:Math.round((anchor.x+x*12)/2)*2,z:Math.round((anchor.z+z*12)/2)*2},k=`${p.x}/${p.z}`;if(seen.has(k))continue;seen.add(k);if(++probes>320)break;
   const issue=g.placementIssue('farm',p.x,p.z,0,size);if(issue){blockers[issue]=(blockers[issue]||0)+1;continue;}
   const grade=Math.hypot(g.height(p.x+1,p.z)-g.height(p.x-1,p.z),g.height(p.x,p.z+1)-g.height(p.x,p.z-1))/2;if(grade<.015){blockers['Clear but too flat for slope acceptance']=(blockers['Clear but too flat for slope acceptance']||0)+1;continue;}site={...p,grade};
  }if(site||probes>320)break;}
  const searchMilliseconds=performance.now()-start;
  if(!site)return {naturalSite:false,passed:0,total:4,seed:g.state.seed,version:g.state.worldgenVersion,probes,searchMilliseconds,blockers,reason:'No naturally clear, known, sloping4×4field within bounded search. No terrain/resources/buildings changed; not claiming native placement acceptance.'};
  // Explicit authored spring work fixture on this unchanged naturally clear
  // native slope. Existing residents and their orders remain untouched.
  g.state.time=Math.floor(g.state.time/1800)*1800+1;const t=g.tribe(0),seeds=t.seeds,food=t.food,items=JSON.stringify(t.items),wood=t.wood,stone=t.stone;
  must(seeds>=64,'Need64 real seeds in export; no free fixture stock granted');must(g.placeBuilding('farm',site.x,site.z,0,size),'Naturally valid field placement rejected');const field=g.state.buildings.at(-1);must(Math.abs(seeds-t.seeds-64)<1e-9,'Large field did not pay64 seeds exactly');must(field.w===size.w&&field.d===size.d,'Field dimensions changed');must(field.crop.planted===0,'New marking granted a free planted crop');
  v.look.set(site.x,g.height(site.x,site.z)+.5,site.z);v.dist=65;v.pitch=.9;v.cameraClearance.invalidate();v.updateCamera(1/60);v.syncBuildings(g);v.render();must(v.contourFields,'Native contour crop layer missing');
  const art=v.contourFields.orientation(g,field);must(art.sites.length>100&&art.sites.length<=512,'Field crop sample budget incorrect');for(const axis of ['x','z']){must(Math.min(...art.sites.map(p=>p[axis]-site[axis]))<-13.5,'Crop samples miss one far edge');must(Math.max(...art.sites.map(p=>p[axis]-site[axis]))>13.5,'Crop samples miss opposite far edge');}
  const crew=[];for(let i=0;i<16;i++){const p={x:site.x+(i%4-1.5)*2,z:site.z+(Math.floor(i/4)-1.5)*2};must(g.walkable(p.x,p.z),'No actual dry work-fixture starting point');const u=g.spawnUnit('worker',p.x,p.z,0);u.order='idle';crew.push(u);}g.clearSelect();for(const u of crew)g.selectEntity(u,true);g.issueGather(field);must(crew.every(u=>u.node===field&&u.order==='gather'),'Real selected gather command still truncates field crew at12');
  const initial=crew.map(u=>({id:u.id,x:u.x,z:u.z}));for(let i=0;i<100;i++){g.state.time+=.1;g.navBudget=40;for(const u of crew)g.workerAI(u,.1);}must(field.crop.planted>0,'Physical crew made no sowing progress');must(crew.filter((u,i)=>Math.hypot(u.x-initial[i].x,u.z-initial[i].z)>.5).length>=13,'Large crew did not physically move to real row locations');must(t.food===food&&JSON.stringify(t.items)===items&&t.wood===wood&&t.stone===stone,'Sowing granted or consumed unrelated food/material stock');
  const planted=field.crop.planted;field.crop.planted=1;v.syncBuildings(g);v.syncUnits(g);v.render();const mesh=v.contourFields.meshes.get('grain');let matching=0,loX=Infinity,hiX=-Infinity,loZ=Infinity,hiZ=-Infinity;for(let i=0;i<mesh.count;i++){const a=mesh.instanceMatrix.array,o=i*16,x=a[o+12],z=a[o+14];if(Math.abs(x-field.x)>field.w/2||Math.abs(z-field.z)>field.d/2)continue;matching++;loX=Math.min(loX,x);hiX=Math.max(hiX,x);loZ=Math.min(loZ,z);hiZ=Math.max(hiZ,z);must(Math.abs(a[o+13]-g.height(x,z))<.01,'Rendered crop root floats above native terrain');}must(matching>=art.sites.length,'Real renderer omitted large-field crop samples');must(hiX-loX>27&&hiZ-loZ>27,'Rendered crop roots do not cover whole field');field.crop.planted=planted;
  must(g.world.heights.every((h,i)=>h===terrain[i]),'Field work changed native terrain');const gl=v.renderer.getContext();must(!gl.isContextLost()&&gl.getError()===gl.NO_ERROR,'Native field draw generated WebGL error');e.saveNow();const saved=localStorage.getItem(key);must(saved,'Isolated test save failed');
  return{naturalSite:true,passed:4,total:4,seed:g.state.seed,version:g.state.worldgenVersion,site,size,probes,searchMilliseconds,paidSeeds:seeds-t.seeds,cropSamples:art.sites.length,renderedSampleMatches:matching,physicalCrew:crew.length,plantedFraction:planted,terrainUnchanged:true,unrelatedStockUnchanged:true,scope:'Natural known clear slope placement/rendering; explicit spring16-worker authored physical-work fixture. No campaign balance or FPS qualification.',originalTime:beforeTime,fixtureTime:g.state.time,saved,fieldId:field.id};
 },SAVE_KEY);
 const saved=result.saved;delete result.saved;assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
 if(saved){const loaded=decodeGame(JSON.parse(saved)),field=loaded.state.buildings.find(b=>b.id===result.fieldId);assert.ok(field);assert.equal(field.w,32.8);assert.equal(field.d,32.8);assert.equal(field.crop.planted,result.plantedFraction);assert.equal(readFileSync(path,'utf8'),original);console.log(JSON.stringify({scope:'Actual native saved field roundtrip and input export unchanged',passed:1,total:1}));}
 if(!result.naturalSite)process.exitCode=2;await context.close();
}finally{clearTimeout(watchdog);await browser.close();}
