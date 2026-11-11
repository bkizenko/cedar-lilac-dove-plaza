// Bounded correctness acceptance against a served release and one read-only
// exported village. A fresh browser profile isolates all save/selection changes.
// No screenshots, previews, simulation stepping or FPS qualification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {SAVE_KEY} from '../../src/game/constants.ts';
const base=process.env.BASE_URL||'http://127.0.0.1:8102';
const path=process.env.VILLAGE_EXPORT||'/Users/boriskizenko/Downloads/hearthwild-village--1815620580-11204.json';
const raw=JSON.parse(readFileSync(path,'utf8')),save={...raw,state:{...raw.state,paused:true},savedAt:Date.now()};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const watchdog=setTimeout(()=>{browser.close().catch(()=>{});},120000);
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({key,save})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('hearthwild:graphics-quality','low');},{key:SAVE_KEY,save});
 await page.goto(base,{waitUntil:'commit',timeout:15000});
 await page.waitForFunction(()=>window.__engine?.game?.state?.units?.length&&window.__engine?.view?.unitMeshes?.get('worker')?.count>0,undefined,{timeout:75000});
 const result=await page.evaluate(async()=>{
  const e=window.__engine,g=e.game,v=e.view;g.state.paused=true;e.keys.clear();v.pan.x=v.pan.z=0;
  const must=(condition,message)=>{if(!condition)throw new Error(message);};
  const physical=()=>JSON.stringify({time:g.state.time,tribes:g.state.tribes.map(t=>({id:t.id,food:t.food,items:t.items,wood:t.wood,stone:t.stone,seeds:t.seeds,survival:t.survival})),units:g.state.units.map(u=>[u.id,u.hp,u.x,u.y,u.z,u.carry,u.carryType,u.itemCargo]),terrain:g.world.heights});
  const before=physical(),workers=g.state.units.filter(u=>u.hp>0&&u.type==='worker');
  const seen=u=>!u.shelterId&&(u.team===0||g.visibleAt(u.x,u.z));
  const cap=v.unitMeshes.get('worker').instanceMatrix.count;
  const late=workers.slice(cap).find(u=>u.team===0&&seen(u));
  must(late,'The supplied native export must include a late player worker beyond the former global cap');
  const expected=workers.filter(seen);must(expected.length<=cap,'Native export exceeds bounded visible capacity; choose a separate saturation test');
  g.selectEntity(late);e.pushHud();v.syncUnits(g);v.syncCargo(g);
  const mesh=v.unitMeshes.get('worker'),owners=v.unitInstanceOwners.get('worker');
  must(mesh.count===expected.length,`Body admission ${mesh.count} != ${expected.length}`);
  must(owners.some(u=>u.id===late.id),'Late selected player worker omitted from rendered owners');
  must(owners.every(seen),'Unknown/sheltered actor consumed a body slot');
  must(v.rings.count>0,'Selected actor feedback missing');
  // Use the real geometry centre and actual camera/ray picking, trying a few
  // legitimate orbit directions in case another native building occludes it.
  let picked=null,pickPoint=null;
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   v.look.set(late.x,late.y+.55,late.z);v.dist=20;v.pitch=1.1;v.yaw=yaw;v.cameraClearance.invalidate();v.updateCamera(1/60);v.render();
   const index=owners.findIndex(u=>u.id===late.id),matrix=mesh.matrix.clone();mesh.getMatrixAt(index,matrix);mesh.geometry.computeBoundingBox();
   const centre=mesh.geometry.boundingBox.getCenter(v.look.clone()).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
   pickPoint=v.project(centre.x,centre.y,centre.z);picked=v.pickEntity(pickPoint.x,pickPoint.y,g);
   if(picked?.id===late.id)break;
  }
  must(picked?.id===late.id,'Actual rendered body ray resolves to the wrong actor or stays occluded in every tested orbit');
  const loaded=owners.find(u=>u.carry>0&&u.carryType&&!u.haulage&&!u.boat&&!u.plantingWork);
  must(loaded,'Native export needs an existing ordinary carried load for the cargo check');
  const cargo=v.cargoMeshes.get(loaded.carryType),expectedX=loaded.x-Math.sin(loaded.facing)*.5,expectedZ=loaded.z-Math.cos(loaded.facing)*.5;
  let matchingCargo=false;for(let i=0;i<cargo.count;i++){const a=cargo.instanceMatrix.array,o=i*16;if(Math.abs(a[o+12]-expectedX)<.01&&Math.abs(a[o+14]-expectedZ)<.01){matchingCargo=true;break;}}
  must(matchingCargo,'Rendered ordinary cargo is missing from its admitted native owner');
  let peak=-Infinity,index=-1;const n=Math.round(Math.sqrt(g.world.heights.length)),half=g.world.size/2;
  for(let i=0;i<g.world.heights.length;i++){const x=-half+(i%n)*g.world.size/(n-1),z=-half+Math.floor(i/n)*g.world.size/(n-1);if(Math.abs(x)>half-60||Math.abs(z)>half-60||!g.exploredAt(x,z))continue;if(g.world.heights[i]>peak){peak=g.world.heights[i];index=i;}}
  must(index>=0&&peak>20,'Native exported world has no sufficiently elevated known terrain for this camera case');
  const px=-half+(index%n)*g.world.size/(n-1),pz=-half+Math.floor(index/n)*g.world.size/(n-1);
  v.dist=100;v.pitch=.2;v.yaw=Math.PI/2;v.look.set(px-10,g.height(px-10,pz)+.55,pz);v.cameraClearance.invalidate();
  let previous=null,maxStep=0,minimum=Infinity,draws=0;
  for(let frame=0;frame<=40;frame++){
   v.look.x=px-10+frame*.5;v.updateCamera(1/60);v.camera.updateMatrixWorld();
   const eye=v.camera.position;
   if(previous)maxStep=Math.max(maxStep,eye.distanceTo(previous));previous=eye.clone();
   for(let i=0;i<120;i++){const t=i/120,x=eye.x+(v.look.x-eye.x)*t,z=eye.z+(v.look.z-eye.z)*t;if(Math.abs(x)>half||Math.abs(z)>half)continue;minimum=Math.min(minimum,eye.y+(v.look.y+1.2-eye.y)*t-Math.max(g.height(x,z),g.waterAt(x,z)));}
   must([eye.x,eye.y,eye.z].every(Number.isFinite),'Camera produced a non-finite pose');
   if(frame%10===0){v.syncUnits(g);v.render();draws++;}
  }
  must(minimum>.1,`Actual camera ray enters native terrain: ${minimum}m`);
  must(maxStep<12,`A half-metre native pan caused a ${maxStep}m camera jump`);
  must(!v.renderer.getContext().isContextLost(),'WebGL context lost');
  must(physical()===before,'Paused rendering changed village inventory, people positions or terrain');
  return {release:location.href,seed:g.state.seed,version:g.state.worldgenVersion,time:g.state.time,unitAdmission:{globalWorkers:workers.length,visibleWorkers:expected.length,bodyInstances:mesh.count,formerlyHiddenSlots:workers.slice(0,cap).filter(u=>!seen(u)).length,lateSelectedPlayer:late.id,picked:picked.id,feedbackInstances:v.rings.count,cargoOwner:loaded.id,cargoMatched:matchingCargo},camera:{knownPeakHeight:peak,poses:41,focusStepMetres:.5,maximumEyeStepMetres:maxStep,minimumActualRayClearanceMetres:minimum,explicitDraws:draws,...v.cameraClearance.diagnostics()},unchangedPhysicalState:true,graphics:{quality:v.quality,renderPixels:v.renderer.domElement.width*v.renderer.domElement.height},simulationErrors:g.simulationErrors};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.simulationErrors,[]);assert.equal(result.unchangedPhysicalState,true);
 console.log(JSON.stringify({scope:'Rendered native-world correctness; fresh profile, paused simulation, no FPS claim',passed:4,total:4,result}));
 if(process.env.KNOWLEDGE==='1'){
  const physical=()=>page.evaluate(()=>JSON.stringify({time:window.__engine.game.state.time,tribes:window.__engine.game.state.tribes.map(t=>({id:t.id,food:t.food,foodLots:t.foodLots,items:t.items,wood:t.wood,stone:t.stone,seeds:t.seeds,survival:t.survival})),units:window.__engine.game.state.units.map(u=>[u.id,u.hp,u.x,u.y,u.z,u.order,u.carry,u.itemCargo])}));
  const before=await physical();
  await page.getByRole('button',{name:'Knowledge',exact:true}).click();
  const panel=page.locator('section[aria-label="Knowledge through practice"]');await panel.waitFor({state:'visible'});
  const rows=panel.locator('article'),count=await rows.count();assert.ok(count>0);
  assert.equal(await rows.evaluateAll(nodes=>nodes.every(row=>!row.querySelector('dl')&&row.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')==='false'&&row.querySelectorAll('button').length<=2)),true,'Knowledge rows default to compact actions and collapsed evidence');
  assert.equal(await rows.evaluateAll(nodes=>nodes.some(row=>row.querySelectorAll('button').length===2)),true,'At least one actual topic exposes one primary action plus Details');
  const first=rows.first(),title=await first.locator('h4').innerText(),details=first.getByRole('button',{name:/^Details:/});
  await details.click();assert.equal(await details.getAttribute('aria-expanded'),'true');assert.equal(await first.locator('dl').count(),1);assert.ok((await first.locator('dl').innerText()).includes('Evidence'));
  await details.click();assert.equal(await first.locator('dl').count(),0);
  const search=panel.getByRole('searchbox',{name:'Find a skill',exact:true});await search.fill(title);
  await page.waitForFunction(title=>{const rows=[...document.querySelectorAll('section[aria-label="Knowledge through practice"] article')];return rows.length>0&&rows.every(row=>row.querySelector('h4')?.textContent?.toLowerCase().includes(title.toLowerCase()));},title);
  const matching=await rows.count();assert.ok(matching>=1&&matching<=count);await search.fill('');
  await page.waitForFunction(count=>document.querySelectorAll('section[aria-label="Knowledge through practice"] article').length===count,count);
  await panel.locator('..').getByRole('button',{name:'Close',exact:true}).click();await panel.waitFor({state:'detached'});
  assert.equal(await physical(),before,'Knowledge inspection changed physical stocks, time, orders or positions');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Separate actual compact Knowledge DOM interactions; no practical actions issued',passed:3,total:3,result:{topics:count,collapsedByDefault:true,evidenceExpandedAndCollapsed:true,searchedActualTopic:title,matchingTopics:matching,physicalStateUnchanged:true}}));
 }
 if(process.env.STRESS==='1'){
  const stress=await page.evaluate(()=>{
   const e=window.__engine,g=e.game,v=e.view;g.state.paused=true;e.keys.clear();
   const must=(condition,message)=>{if(!condition)throw new Error(message);};
   const beforeTime=g.state.time,beforeStock=JSON.stringify(g.state.tribes.map(t=>({id:t.id,food:t.food,foodLots:t.foodLots,items:t.items,wood:t.wood,stone:t.stone,seeds:t.seeds,survival:t.survival})));
   const initial=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'),home=g.campOf(0),old=v.unitMeshes.get('worker');
   const geometry=old.geometry,material=old.material;let retired=0;old.addEventListener('dispose',()=>retired++);
   let created=0,probes=0;
   // Declared render-only population fixture. Sample at most2401 actual known,
   // dry, walkable native sites; never modify terrain or run an AI update.
   for(let iz=-24;iz<=24&&initial.length+created<300;iz++)for(let ix=-24;ix<=24&&initial.length+created<300;ix++){
    probes++;const x=home.x+ix*1.8,z=home.z+iz*1.8;
    if(!g.exploredAt(x,z)||!g.walkable(x,z)||g.height(x,z)<g.waterAt(x,z)+.3)continue;
    if(g.state.units.some(u=>u.hp>0&&Math.hypot(u.x-x,u.z-z)<.85))continue;
    g.spawnUnit('worker',x,z,0);created++;
   }
   const crowd=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker');must(crowd.length===300,`Only ${crowd.length} valid native crowd sites within ${probes} bounded probes`);
   g.clearSelect();for(const u of crowd)g.selectEntity(u,true);v.unitRingsEnabled=true;
   v.syncUnits(g);v.syncCargo(g);
   const mesh=v.unitMeshes.get('worker'),owners=v.unitInstanceOwners.get('worker'),expected=g.state.units.filter(u=>u.hp>0&&u.type==='worker'&&!u.shelterId&&(u.team===0||g.visibleAt(u.x,u.z)));
   must(mesh!==old&&retired===1,'GPU body draw did not replace/dispose the initial instance pool exactly once');
   must(mesh.geometry===geometry&&mesh.material===material,'Growing bodies replaced shared model assets');
   must(mesh.count===expected.length&&owners.length===expected.length,'Some actual visible crowd bodies or picking owners were dropped');
   must(mesh.instanceMatrix.count>=mesh.count,'Actual visible crowd exceeded its instance buffer');must(v.rings.count===crowd.filter(u=>!u.shelterId).length,'Selected crowd feedback was truncated');
   const last=crowd.at(-1);let picked=null;
   for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    v.look.set(last.x,last.y+.55,last.z);v.dist=20;v.pitch=1.1;v.yaw=yaw;v.cameraClearance.invalidate();v.updateCamera(1/60);v.render();
    const matrix=mesh.matrix.clone();mesh.getMatrixAt(owners.findIndex(u=>u.id===last.id),matrix);mesh.geometry.computeBoundingBox();const centre=mesh.geometry.boundingBox.getCenter(v.look.clone()).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld),point=v.project(centre.x,centre.y,centre.z);picked=v.pickEntity(point.x,point.y,g);if(picked?.id===last.id)break;
   }
   must(picked?.id===last.id,'Actual grown crowd draw cannot pick its late native worker');
   const gl=v.renderer.getContext();must(!gl.isContextLost(),'WebGL context lost during crowd resize');must(gl.getError()===gl.NO_ERROR,'WebGL error after actual crowd draw');
   must(g.state.time===beforeTime,'Render fixture accidentally advanced simulation');
   must(JSON.stringify(g.state.tribes.map(t=>({id:t.id,food:t.food,foodLots:t.foodLots,items:t.items,wood:t.wood,stone:t.stone,seeds:t.seeds,survival:t.survival})))===beforeStock,'Authored render crowd changed physical village stock');
   return{fixture:'Authored paused300-worker render crowd on unchanged known native terrain; not a campaign/population or FPS qualification',initialWorkers:initial.length,created,siteProbes:probes,renderedWorkers:mesh.count,ownerCount:owners.length,bodyCapacity:mesh.instanceMatrix.count,selectedRings:v.rings.count,latePicked:last.id,sharedGeometryAndMaterial:true,replacedPoolDisposedOnce:true,simulationTimeUnchanged:true,stockUnchanged:true};
  });
  assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Separate authored native-render stress fixture',passed:4,total:4,result:stress}));
 }
 await context.close();
}finally{clearTimeout(watchdog);await browser.close();}
