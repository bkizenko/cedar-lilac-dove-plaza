// Frozen disposable candidate only. argv[2] remains untouched. Default: native
// earned capture/leading/stable-trained fixture. HORSE_TRACTION_BUILT=1: declared
// trained native horse opening, actual paid ard crafting and ordinary field work;
// this branch does not claim earned capture/training, pen or stable acceptance.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {SIM_CALENDAR_RULES} from '../../src/game/calendarPacing.ts';
const tractionRequired=process.env.HORSE_TRACTION_BUILT==='1';
const file=process.argv[2];assert.ok(file,'Usage: horse-built.mjs NATIVE_TRAINED_HORSE.json');
const bytes=readFileSync(file),hash=x=>createHash('sha256').update(x).digest('hex'),original=hash(bytes),data=JSON.parse(bytes),s=data.state;
const handler=s.units.find(u=>u.team===0&&u.hp>0&&u.haulage==='pack'&&u.packAnimal?.species==='horse'&&u.packAnimal.hp>0);
const pen=s.buildings.find(b=>b.team===0&&b.hp>0&&b.type==='pen'&&b.build>=1),stable=s.buildings.find(b=>b.team===0&&b.hp>0&&b.type==='stables'&&b.build>=1);
const workshop=s.buildings.find(b=>b.team===0&&b.hp>0&&b.type==='workshop'&&b.build>=1);
assert.ok(handler,'Fixture must already own a living trained native horse');
if(tractionRequired)assert.ok(workshop&&handler.farmTool==='woodenArd','Traction fixture must already own a paid crafted ard and completed workshop');
else assert.ok(pen&&stable,'Horse capture fixture must have a completed pen and stable');
const horseId=handler.packAnimal.id;
assert.ok(!s.wildlife.some(a=>a.id===horseId)&&!(s.livestock||[]).some(a=>a.id===horseId),'Horse must have exactly one actual custody location');
const profile=mkdtempSync(join(tmpdir(),'hearthwild-horse-built-')),errors=[];
const report={scope:tractionRequired?'Two built traction checks on declared trained native horse opening: owned ard render and actual planting/practice/tool wear; real workshop recipe UI and strict horse/tool/practice reload. Actual paid ard crafting earned in source fixture; no earned capture/training, pen/stable, campaign, performance, screenshots or animal fabrication claim.':'Two built checks on earned capture/leading/stable-trained fixture: visible horse inventory and actual scene custody/meshes; pen controls, solid stable and strict save/reload. No fixture animal creation, relocation, stat alteration, screenshots, campaign or performance claim.',target:'http://127.0.0.1:8103/',passed:0,total:2,horseId,handlerId:handler.id,originalHash:original,tractionRequired};
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
 stage='actual wooden ard batch';
 report.ard=await page.evaluate(({handlerId,yearSeconds})=>{
  const e=window.__engine,g=e.game,v=e.view,mesh=v.woodenArds,u=g.state.units.find(a=>a.id===handlerId),spring=Math.floor((g.state.time%yearSeconds)/(yearSeconds/4))===0;
  const eligible=g.state.units.filter(a=>a.hp>0&&!a.shelterId&&(a.team===0||g.visibleAt(a.x,a.z))&&spring&&a.type==='worker'&&!a.militia&&a.haulage==='pack'&&a.packAnimal?.species==='horse'&&a.packAnimal.hp>0&&!a.boat&&!a.prisoner&&!a.emergency&&!a.resting&&a.farmTool==='woodenArd'&&(a.farmToolCondition??1)>0&&a.farmToolWork?.mode!=='repair'&&(a.packAnimal.hunger??0)<100&&(a.packAnimal.thirstSeconds??0)<780&&a.order==='gather'&&a.node?.type==='farm');
  if(!mesh)throw Error('Missing shared wooden ard batch');mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
  const i=v.woodenArdOwners.findIndex(a=>a.id===handlerId),h=v.packHorseOwners.findIndex(a=>a.id===handlerId);let sameHorseTransform=false;
  if(i>=0&&h>=0){const ard=mesh.matrix.clone(),horse=mesh.matrix.clone();mesh.getMatrixAt(i,ard);v.packHorses.getMatrixAt(h,horse);sameHorseTransform=ard.elements.every((n,j)=>Math.abs(n-horse.elements[j])<.00001);}
  return{count:mesh.count,expected:eligible.length,owners:v.woodenArdOwners.map(a=>a.id),handlerOwns:i>=0,sameHorseTransform,vertices:mesh.geometry.getAttribute('position').count,bounds:{min:b.min.toArray(),max:b.max.toArray()},before:{practice:u.draftPracticeSeconds??0,condition:u.farmToolCondition??1,planted:u.node?.type==='farm'?u.node.crop?.planted??0:null,fieldId:u.node?.type==='farm'?u.node.id:null},spring};
 },{handlerId:handler.id,yearSeconds:SIM_CALENDAR_RULES.yearSeconds});
 assert.equal(report.ard.count,report.ard.expected);assert.equal(report.ard.owners.length,report.ard.count);assert.ok(report.ard.vertices<1000);assert.ok(report.ard.bounds.min[2]<-1.8&&report.ard.bounds.min[2]>-2.7&&report.ard.bounds.max[2]<.4);assert.ok(report.ard.bounds.min[1]>=0&&report.ard.bounds.max[1]<1.3);
 if(tractionRequired){
  assert.ok(report.ard.count>0&&report.ard.handlerOwns&&report.ard.spring,'Traction acceptance requires an actual ard-owning handler already doing spring fieldwork');assert.equal(report.ard.sameHorseTransform,true);
  report.traction=await page.evaluate(({id,fieldId})=>{const e=window.__engine,g=e.game,u=g.state.units.find(a=>a.id===id),field=g.state.buildings.find(b=>b.id===fieldId),before={practice:u.draftPracticeSeconds??0,condition:u.farmToolCondition??1,planted:field.crop?.planted??0,time:g.state.time};try{g.state.paused=false;for(let i=0;i<50&&((u.draftPracticeSeconds??0)<=before.practice||(field.crop?.planted??0)<=before.planted);i++){if(g.state.encounter||g.state.ended)throw Error('Native encounter/end interrupts bounded traction check');g.step(.2);if(g.simulationErrors.length)throw Error(JSON.stringify(g.simulationErrors));}}finally{g.state.paused=true;e.pushHud();}return{before,after:{practice:u.draftPracticeSeconds??0,condition:u.farmToolCondition??1,planted:field.crop?.planted??0,time:g.state.time},sameHorse:u.packAnimal?.id};},{id:handler.id,fieldId:report.ard.before.fieldId});
  const t=report.traction;assert.ok(t.after.practice>t.before.practice&&t.after.condition<t.before.condition&&t.after.planted>t.before.planted);assert.equal(t.sameHorse,horseId);
 }
 if(!tractionRequired){
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
 }else{
  stage='click actual crafting shelter';await page.getByRole('button',{name:'Inventory & activity',exact:true}).click();
  await page.evaluate(id=>{const e=window.__engine,b=e.game.state.buildings.find(b=>b.id===id);e.game.clearSelect();e.view.look.set(b.x,b.y,b.z);e.view.dist=24;e.pushHud();},workshop.id);
  let point;for(let attempt=0;attempt<20&&!point;attempt++){
   point=await page.evaluate(id=>{const e=window.__engine,v=e.view,kit=v.bldMeshes.get('workshop');for(const mesh of [kit?.roof,kit?.timber,kit?.extra]){if(!mesh)continue;mesh.geometry.computeBoundingBox();const owners=v.buildingInstances.get(mesh)||[];for(let i=0;i<owners.length;i++){if(owners[i]?.id!==id)continue;const m=mesh.matrix.clone();mesh.getMatrixAt(i,m);const c=v.look.clone();mesh.geometry.boundingBox.getCenter(c);c.applyMatrix4(m);const p=v.project(c.x,c.y,c.z);if(!p.behind&&p.x>340&&p.x<1100&&p.y>150&&p.y<760&&v.pickEntity(p.x,p.y,e.game)?.id===id){const r=v.renderer.domElement.getBoundingClientRect();return{x:p.x+r.left,y:p.y+r.top};}}}return null;},workshop.id);
   if(!point)await page.waitForTimeout(100);
  }
  assert.ok(point,'Actual crafting shelter must remain pickable');await page.mouse.click(point.x,point.y);await page.waitForFunction(id=>window.__engine.game.state.selBld?.id===id,workshop.id);
  await page.getByText('Farm tools',{exact:true}).click();await page.getByRole('button',{name:/^Wooden ard/}).waitFor({state:'visible'});assert.match(await page.locator('body').innerText(),/Horse \+ practice → faster spring preparation/);
  report.workshop={id:workshop.id,clickedActualGeometry:true,visibleArdRecipe:true};
 }
 stage='strict save/reload';const saved=await page.evaluate(async id=>{const e=window.__engine,resident=e.game.state.units.find(u=>u.id===id),metadata=u=>({horse:u.packAnimal,farmTool:u.farmTool,condition:u.farmToolCondition,practice:u.draftPracticeSeconds}),before=JSON.stringify(metadata(resident)),save=await e.saveNow();if(!save.saved)throw Error(save.message);await e.resumeSaved();const g=e.game,u=g.state.units.find(u=>u.id===id);return{identical:before===JSON.stringify(metadata(u)),farmTool:u.farmTool,condition:u.farmToolCondition,practice:u.draftPracticeSeconds,id:u.packAnimal?.id,species:u.packAnimal?.species,haulage:u.haulage,duplicates:[...g.state.wildlife,...(g.state.livestock||[])].filter(a=>a.id===u.packAnimal?.id).length,errors:[...g.simulationErrors]};},handler.id);
 assert.equal(saved.identical,true);assert.equal(saved.id,horseId);assert.equal(saved.species,'horse');assert.equal(saved.haulage,'pack');assert.equal(saved.duplicates,0);assert.deepEqual(saved.errors,[]);if(tractionRequired){assert.equal(saved.farmTool,'woodenArd');assert.equal(saved.condition,report.traction.after.condition);assert.equal(saved.practice,report.traction.after.practice);}report.saved=saved;assert.deepEqual(errors,[]);report.passed++;
}catch(error){report.failure={stage,message:error.message};process.exitCode=1;}finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.originalUnchanged=hash(readFileSync(file))===original;assert.equal(report.originalUnchanged,true);report.errors=errors;console.log(JSON.stringify(report,null,2));}
