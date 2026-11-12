// Frozen disposable candidate only. argv[2] is an untouched native horse fixture
// earned by horse-native.test.mjs capture/leading/stable training, never fabricated here.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const file=process.argv[2];assert.ok(file,'Usage: horse-built.mjs NATIVE_TRAINED_HORSE.json');
const bytes=readFileSync(file),hash=x=>createHash('sha256').update(x).digest('hex'),original=hash(bytes),data=JSON.parse(bytes),s=data.state;
const handler=s.units.find(u=>u.team===0&&u.hp>0&&u.haulage==='pack'&&u.packAnimal?.species==='horse'&&u.packAnimal.hp>0);
const pen=s.buildings.find(b=>b.team===0&&b.hp>0&&b.type==='pen'&&b.build>=1),stable=s.buildings.find(b=>b.team===0&&b.hp>0&&b.type==='stables'&&b.build>=1);
assert.ok(handler&&pen&&stable,'Fixture must already own a trained native horse, completed pen and stable');
const horseId=handler.packAnimal.id;
assert.ok(!s.wildlife.some(a=>a.id===horseId)&&!(s.livestock||[]).some(a=>a.id===horseId),'Horse must have exactly one actual custody location');
const profile=mkdtempSync(join(tmpdir(),'hearthwild-horse-built-')),errors=[];
const report={scope:'Two built checks: visible native-horse inventory and actual scene custody/meshes; pen controls, solid stable and strict save/reload. No fixture animal creation, relocation, stat alteration, screenshots, campaign or performance claim.',target:'http://127.0.0.1:8103/',passed:0,total:2,horseId,handlerId:handler.id,originalHash:original};
let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});
 const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));
 stage='boot';await page.goto(report.target,{waitUntil:'commit',timeout:20000});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:45000});
 stage='strict native import';const imported=await page.evaluate(async source=>window.__engine.importVillage(new File([source],'native-trained-horse.json',{type:'application/json'})),bytes.toString('utf8'));assert.equal(imported.applied,true,imported.message);
 // Pause only the disposable imported world; no actor, custody or terrain edits.
 await page.evaluate(id=>{const e=window.__engine,g=e.game;if(e.isWorkerSession)throw Error('Native owner mode required');g.state.paused=true;const u=g.state.units.find(u=>u.id===id);g.selectEntity(u);e.view.look.set(u.x,u.y,u.z);e.view.dist=24;e.pushHud();},handler.id);
 stage='visible owner inventory';await page.getByRole('button',{name:'Inventory & activity',exact:true}).click();
 await page.getByText(/Horse · Health/).waitFor({state:'visible'});assert.match(await page.locator('body').innerText(),/Pack horse · capacity ×3\.50/);
 await page.waitForFunction(()=>window.__engine.view.packHorses?.count>0);
 stage='actual scene custody and bounded meshes';
 report.scene=await page.evaluate(({handlerId,horseId})=>{
  const e=window.__engine,g=e.game,v=e.view,u=g.state.units.find(u=>u.id===handlerId),mesh=v.packHorses,index=v.packHorseOwners.findIndex(a=>a.id===handlerId);
  if(index<0)throw Error('Horse draw lacks actual handler owner');const matrix=mesh.matrix.clone();mesh.getMatrixAt(index,matrix);mesh.geometry.computeBoundingBox();
  const b=mesh.geometry.boundingBox,position=Array.from(matrix.elements).slice(12,15),expected=[u.x-Math.sin(u.facing)*2.1,u.z-Math.cos(u.facing)*2.1];
  const eligible=g.state.units.filter(a=>a.hp>0&&!a.shelterId&&!a.boat&&(a.team===0||g.visibleAt(a.x,a.z))&&a.haulage==='pack'&&a.packAnimal?.species==='horse'&&a.packAnimal.hp>0&&(a.type==='worker'&&!a.militia||a.caravanArmed));
  const wildOwners=v.wildlifeOwners.get(v.wildHorses)||[],domestic=(g.state.livestock||[]).filter(a=>a.hp>0&&a.species==='horse'&&(a.team===0||g.visibleAt(a.x,a.z)));
  return{pack:mesh.count,expectedPack:eligible.length,position,expected,vertices:mesh.geometry.getAttribute('position').count,bounds:{min:b.min.toArray(),max:b.max.toArray()},wild:v.wildHorses.count,wildOwned:wildOwners.length,validWild:wildOwners.every(a=>a.species==='horse'&&g.state.wildlife.some(w=>w.id===a.id)),domestic:v.domesticHorses.count,expectedDomestic:domestic.length,uniqueCustody:!g.state.wildlife.some(a=>a.id===horseId)&&!(g.state.livestock||[]).some(a=>a.id===horseId),drawCalls:v.renderer.info.render.calls,errors:[...g.simulationErrors]};
 },{handlerId:handler.id,horseId});
 const draw=report.scene;assert.equal(draw.pack,draw.expectedPack);assert.equal(draw.wild,draw.wildOwned);assert.equal(draw.validWild,true);assert.equal(draw.domestic,draw.expectedDomestic);assert.equal(draw.uniqueCustody,true);assert.ok(draw.drawCalls>0);assert.deepEqual(draw.errors,[]);
 assert.ok(Math.abs(draw.position[0]-draw.expected[0])<.001&&Math.abs(draw.position[2]-draw.expected[1])<.001);assert.ok(draw.position.every(Number.isFinite));assert.ok(draw.vertices<5000&&draw.bounds.min[1]>=-.001&&draw.bounds.max[1]<2.2&&2.1-draw.bounds.max[2]>.65);report.passed++;
 stage='click actual pen';await page.getByRole('button',{name:'Inventory & activity',exact:true}).click();
 await page.evaluate(id=>{const e=window.__engine,b=e.game.state.buildings.find(b=>b.id===id);e.game.clearSelect();e.view.look.set(b.x,b.y,b.z);e.view.dist=24;e.pushHud();},pen.id);
 // Find a rendered fence owner point that the real world picker resolves to this pen.
 let point;for(let attempt=0;attempt<20&&!point;attempt++){
  point=await page.evaluate(id=>{const e=window.__engine,v=e.view;for(const [mesh,owners]of v.penFences?.pickingSources()||[]){mesh.geometry.computeBoundingBox();for(let i=0;i<owners.length;i++){if(owners[i]?.id!==id)continue;const m=mesh.matrix.clone();mesh.getMatrixAt(i,m);const c=v.look.clone();mesh.geometry.boundingBox.getCenter(c);c.applyMatrix4(m);const p=v.project(c.x,c.y,c.z);if(!p.behind&&p.x>340&&p.x<1100&&p.y>150&&p.y<760&&v.pickEntity(p.x,p.y,e.game)?.id===id){const r=v.renderer.domElement.getBoundingClientRect();return{x:p.x+r.left,y:p.y+r.top};}}}return null;},pen.id);
  if(!point)await page.waitForTimeout(100);
 }
 assert.ok(point,'Actual visible pen fence must remain pickable');await page.mouse.click(point.x,point.y);await page.waitForFunction(id=>window.__engine.game.state.selBld?.id===id,pen.id);
 await page.getByRole('button',{name:/^Capture horse/}).waitFor({state:'visible'});await page.getByRole('button',{name:/^Train pack horse/}).waitFor({state:'visible'});
 stage='solid stable draw';report.stable=await page.evaluate(id=>{const v=window.__engine.view,kit=v.bldMeshes.get('stables');return ['timber','roof'].map(role=>{const mesh=kit?.[role];if(!mesh)throw Error('Missing stable '+role);mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,owners=v.buildingInstances.get(mesh)||[];return{role,count:mesh.count,owner:owners.some(b=>b.id===id),vertices:mesh.geometry.getAttribute('position').count,span:b.max.clone().sub(b.min).toArray(),inScene:!!mesh.parent};});},stable.id);
 for(const part of report.stable){assert.ok(part.count>0&&part.owner&&part.vertices>0&&part.inScene);assert.ok(part.span.every(n=>Number.isFinite(n)&&n>0));}
 stage='strict save/reload';const saved=await page.evaluate(async id=>{const e=window.__engine,before=JSON.stringify(e.game.state.units.find(u=>u.id===id).packAnimal),save=await e.saveNow();if(!save.saved)throw Error(save.message);await e.resumeSaved();const g=e.game,u=g.state.units.find(u=>u.id===id);return{identical:before===JSON.stringify(u.packAnimal),id:u.packAnimal?.id,species:u.packAnimal?.species,haulage:u.haulage,duplicates:[...g.state.wildlife,...(g.state.livestock||[])].filter(a=>a.id===u.packAnimal?.id).length,errors:[...g.simulationErrors]};},handler.id);
 assert.equal(saved.identical,true);assert.equal(saved.id,horseId);assert.equal(saved.species,'horse');assert.equal(saved.haulage,'pack');assert.equal(saved.duplicates,0);assert.deepEqual(saved.errors,[]);report.saved=saved;assert.deepEqual(errors,[]);report.passed++;
}catch(error){report.failure={stage,message:error.message};process.exitCode=1;}finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.originalUnchanged=hash(readFileSync(file))===original;assert.equal(report.originalUnchanged,true);report.errors=errors;console.log(JSON.stringify(report,null,2));}
