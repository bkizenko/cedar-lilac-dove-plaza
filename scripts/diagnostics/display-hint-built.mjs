import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const mechanicsOnly=process.env.DISPLAY_MECHANICS_ONLY==='1',finalCartOnly=process.env.CART_FINAL_ONLY==='1';
const profile=mkdtempSync(join(tmpdir(),'hearthwild-display-built-')),errors=[],report={passed:0,total:(mechanicsOnly?0:4)+(process.argv[2]?1:0)+(process.argv[3]?1:0),scope:'Real first-run hint/Menu/dismiss persistence and actual Three lighting under authored visual-only probes; optional genuinely earned cart and iron exports through owner controls and durable reload. No campaign, original-village mutation or performance claim.'};let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 await page.evaluate(()=>{const e=window.__engine;e.enterIsland();e.game.state.paused=true;e.pushHud();});
 if(!mechanicsOnly){
 stage='first-run hint opens actual Menu';const hint=page.getByRole('note',{name:'Display options hint'});await hint.waitFor();await hint.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('combobox',{name:'World visual style',exact:true}).waitFor();assert.equal(await hint.count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('hearthwild.ui.hintGraphics')),'1');report.passed++;
 stage='existing style and quality controls remain independent';await page.getByRole('combobox',{name:'World visual style',exact:true}).selectOption('optionH');await page.waitForFunction(()=>window.__engine.view.getStyle()==='optionH');assert.equal(await page.evaluate(()=>window.__engine.game.quality),'low');assert.equal(await page.evaluate(()=>localStorage.getItem('hearthwild:render-style-v2')),'optionH');report.passed++;
 stage='real Three intensities follow H on both map palettes, default and weather unchanged';const samples=await page.evaluate(()=>{
  const e=window.__engine,g=e.game,v=e.view,oldStyle=v.getStyle(),oldMap=v.getMapStyle(),rows=[];
  // This probe only supplies lighting inputs to the real Three adapter; it
  // never changes the game clock, units, terrain, goods or simulation rules.
  for(const map of ['classic','painterly'])for(const mode of ['clear','storm','night']){
   const probe=Object.create(g);probe.state={...g.state,weather:mode==='storm'?'storm':'clear'};probe.daylight=()=>({sunrise:6,sunset:18});probe.dayPhase=()=>mode==='night'?.05:6.5/24;probe.isNight=()=>mode==='night';probe.seasonMix=()=>({snow:0,winter:0,autumn:0,spring:1,summer:0});v.setMapStyle(map,false);const values={};
   for(const style of ['current','village','optionH']){v.setStyle(style);v.updateDay(probe,1);values[style]={sun:v.sun.intensity,hemi:v.hemi.intensity};}
   rows.push({map,mode,values});
  }
  v.setMapStyle(oldMap,false);v.setStyle(oldStyle);v.updateDay(g,1);return rows;
 });
 for(const row of samples){const {current,village,optionH}=row.values;assert.deepEqual(village,current,`${row.map}/${row.mode}: default intensity preserved`);for(const light of ['sun','hemi']){assert.ok(Number.isFinite(optionH[light])&&optionH[light]>=0);if(row.mode==='clear')assert.ok(optionH[light]<village[light]&&optionH[light]>village[light]*.7,`${row.map}: bounded H dawn blend actually reaches renderer`);else assert.equal(optionH[light],village[light],`${row.map}/${row.mode}: no extra weather/night dimming`);}}
 report.lighting=samples;report.passed++;
 stage='dismissal survives actual reload';await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});await page.evaluate(()=>{const e=window.__engine;e.enterIsland();e.game.state.paused=true;e.pushHud();});assert.equal(await page.getByRole('note',{name:'Display options hint'}).count(),0);assert.deepEqual(errors,[]);report.passed++;
 }
 const load=async save=>{const copy=structuredClone(save);copy.state.paused=true;assert.equal((await page.evaluate(async s=>window.__engine.importVillage(new File([JSON.stringify(s)],'earned-native.json',{type:'application/json'})),copy)).applied,true);};
 const select=async(id,building=false)=>page.evaluate(({id,building})=>{const e=window.__engine,g=e.game;g.clearSelect();if(building)g.state.selBld=g.state.buildings.find(b=>b.id===id);else g.state.units.find(u=>u.id===id).selected=true;e.pushHud();},{id,building});
 const saveReload=async()=>{assert.equal((await page.evaluate(()=>window.__engine.saveNow())).saved,true);await page.evaluate(()=>window.__engine.resumeSaved());};
 if(process.argv[2]){
  stage=finalCartOnly?'earned cart hauling readout':'genuine paid cart resumes through player controls';const input=JSON.parse(readFileSync(process.argv[2],'utf8')),owner=input.state.units.find(u=>finalCartOnly?u.draftCart:u.draftCartOrder?.paused&&u.draftCartOrder.paidAt!==undefined);assert.ok(owner);const id=owner.id,cartId=owner.draftCartOrder?.cartId??owner.draftCart.id,animalId=owner.packAnimal.id;
  await load(input);await select(id);await page.getByRole('button',{name:'More orders',exact:true}).click();await page.getByText('Equipment & gathering',{exact:true}).click();const controls=page.locator('[aria-label="Draft cart"]');await controls.getByRole('button',{name:finalCartOnly?'Unhitch cart':'Resume',exact:true}).waitFor();
  const cost=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__engine.game.state.draftCartLedger)));const paid=await cost();if(!finalCartOnly){await controls.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForFunction(id=>window.__engine.game.state.units.find(u=>u.id===id)?.draftCartOrder?.paused===false,id);assert.equal((await cost()).woodUsed,paid.woodUsed);assert.equal((await cost()).cordageUsed,paid.cordageUsed);}
  let result;for(let chunk=0;chunk<10;chunk++){
   result=await page.evaluate(({id,cartId})=>{const e=window.__engine,g=e.game;g.state.paused=false;for(let i=0;i<50&&g.state.units.find(u=>u.id===id)?.draftCart?.id!==cartId;i++)g.step(.2);g.state.paused=true;e.pushHud();const u=g.state.units.find(u=>u.id===id);return{cart:u.draftCart,animalId:u.packAnimal?.id,errors:g.simulationErrors};},{id,cartId});assert.deepEqual(result.errors,[]);if(result.cart?.id===cartId)break;
  }
  assert.equal(result.cart?.id,cartId);assert.equal(result.animalId,animalId);assert.equal((await cost()).woodUsed,paid.woodUsed);assert.equal((await cost()).cordageUsed,paid.cordageUsed);
  await page.waitForFunction(id=>{const layer=window.__engine.view.draftCarts;return !!layer&&[...layer.sources()].some(([mesh,owners])=>mesh.count>0&&owners.some(u=>u.id===id));},id);
  await page.getByText('Inventory & activity',{exact:true}).click();await page.getByText(`Animal-drawn cart #${cartId}`,{exact:false}).waitFor();await page.getByText('Draft horse · capacity ×6.00',{exact:false}).waitFor();if(process.env.DRAFT_QA_IMAGE)await page.screenshot({path:process.env.DRAFT_QA_IMAGE});await saveReload();assert.equal(await page.evaluate(id=>window.__engine.game.state.units.find(u=>u.id===id)?.draftCart?.id,id),cartId);report.cart={sameCart:cartId,sameAnimal:animalId,paidProgress:owner.draftCartOrder?.progress??null,noSecondPayment:true,realResumeButton:!finalCartOnly,actualCartMesh:true,actualTransportMultiplier:6};report.passed++;
 }
 if(process.argv[3]){
  stage='earned iron tools and actual learning evidence';const input=JSON.parse(readFileSync(process.argv[3],'utf8')),maker=input.state.units.find(u=>u.team===0&&u.farmTool==='ironTools'),forge=input.state.buildings.find(b=>b.team===0&&b.type==='forge'&&b.build>=1);assert.ok(maker&&forge);await load(input);
  await page.getByRole('button',{name:'Ages',exact:true}).click();await page.getByRole('searchbox',{name:'Find a skill',exact:true}).fill('Iron working');const topic=page.getByRole('article',{name:'Iron working',exact:true});await topic.getByText('Known',{exact:true}).waitFor();await topic.getByText('Demonstrated',{exact:true}).waitFor();await topic.getByRole('button',{name:'Details: Iron working',exact:true}).click();await topic.getByText('Usable forged iron was delivered',{exact:false}).waitFor();
  await page.getByRole('dialog').last().getByRole('button',{name:'Close',exact:true}).click();await select(forge.id,true);await page.getByRole('button',{name:'More orders',exact:true}).click();const recipes=page.locator('[aria-label="Workplace recipes"]');await recipes.getByRole('button',{name:/Reduce iron ore to a solid bloom/}).waitFor();await recipes.getByRole('button',{name:/Heat and consolidate iron bloom/}).waitFor();
  await saveReload();const actual=await page.evaluate(id=>{const g=window.__engine.game,u=g.state.units.find(u=>u.id===id),t=g.tribe(0);return{tool:u.farmTool,condition:u.farmToolCondition,iron:t.iron,profile:t.ironMetallurgyVersion};},maker.id);assert.deepEqual(actual,{tool:'ironTools',condition:maker.farmToolCondition,iron:input.state.tribes[0].iron,profile:1});report.iron={...actual,realForgeRecipes:true,actualDemonstratedReceipt:true};report.passed++;
 }
 assert.deepEqual(errors,[]);
}catch(e){report.failure={stage,message:e.message.slice(0,2200)};process.exitCode=1;}finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.errors=errors;console.log(JSON.stringify(report,null,2));}
