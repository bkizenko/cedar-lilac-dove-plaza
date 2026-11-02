import{writeFileSync}from'node:fs';import{productionKnowledgeTopics}from'../src/game/practiceKnowledge.ts';
import test from'node:test';import assert from'node:assert/strict';
import {Game}from'../src/game/sim.ts';import {encodeGame,decodeGame}from'../src/game/persistence.ts';import{campAnchor}from'../src/game/campAnchor.ts';
import{surveyFibre,beginFibreGather,fibreGatherIssue}from'../src/game/fibre.ts';
import{beginProduction,productionIssue,pauseProductionProject,resumeProduction,equipClothing,swapClothing,tickProduction,clothingWarmth,PRODUCTION_RECIPES}from'../src/game/production.ts';
import{garmentHeatBurden,tickGarmentHeat,TEXTILE_RULES}from'../src/game/textiles.ts';
import{carriedLoadUnits,vesselLoad}from'../src/game/carriedLoad.ts';import{loadedHaulSpeed}from'../src/game/haulage.ts';import{tickSurvival}from'../src/game/survivalNeeds.ts';import{tryCivilianSurrender}from'../src/game/captivity.ts';
function fixture(){const g=new Game();g.reset(1,14,{size:1040,layout:'pangaea'});g.enterIsland();g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;Object.assign(g.tribe(0),{wood:120,stone:70,food:1000,foodLots:{provisions:1000},items:{}});g.tribe(0).survival.waterLiters=1000;for(const u of g.state.units.filter(u=>u.team===0)){u.order='hold';u.jobLock=true;}return{g,u:g.state.units.find(u=>u.team===0)};}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){const before=g.state.time;g.state.paused=false;g.step(.2);assert.ok(g.state.time>before,JSON.stringify({reason:'Scenario stopped advancing',time:g.state.time,ended:g.state.ended,encounter:g.state.encounter,banner:g.state.banner}));}assert.deepEqual(g.simulationErrors,[]);}
function site(g,type){const home=campAnchor(g,0);for(let radius=10;radius<=40;radius+=5)for(let i=0;i<24;i++){const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;if(g.placementIssue(type,x,z))continue;assert.equal(g.placeBuilding(type,x,z),true,g.state.banner);const b=g.state.buildings.at(-1),u=g.state.units.find(u=>u.team===0&&!u.fibreWork&&!u.productionProjectId);g.clearSelect();g.selectEntity(u);g.orderConstruction(b);drive(g,150,()=>g.finished(b));assert.ok(g.finished(b));g.clearSelect();return b;}throw Error('No natural legal site for '+type);}
function harvest(g,u,p){assert.equal(beginFibreGather(g,u.id,p.id),true,fibreGatherIssue(g,u.id,p.id));drive(g,180,()=>!u.fibreWork);assert.equal(u.fibreWork,undefined,u.workReason);}
function batch(g,key,b){assert.equal(beginProduction(g,key,b.id),true,productionIssue(g,key,b.id));const p=g.state.production.projects.at(-1);drive(g,220,()=>p.phase==='complete'||p.phase==='lost');assert.equal(p.phase,'complete',JSON.stringify(p));return p;}

test('native finite harvested bast becomes paid spun yarn, woven cloth and delivered light clothing, saving actual interrupted work',()=>{
 let {g,u}=fixture();const originalTreeAmounts=new Map(g.state.trees.map(t=>[t.id,t.amount]));
 assert.equal(surveyFibre(g,u.id),true);const source=g.state.fibre.patches.find(p=>p.remaining>=8);assert.ok(source);harvest(g,u,source);harvest(g,u,source);
 assert.equal(g.tribe(0).items.plantFibre,8);assert.equal(g.state.fibre.metrics.standingWoodConsumed,2);assert.equal(g.state.trees.find(t=>t.id===source.treeId).amount,originalTreeAmounts.get(source.treeId)-2);
 const hearth=site(g,'hearth'),shelter=site(g,'fibreWorkshop'),tailor=site(g,'tailor');
 batch(g,'twistCordage',shelter);assert.equal(g.tribe(0).items.cordage,4);
 assert.match(productionIssue(g,'weaveCloth',shelter.id),/Deliver.*yarn/);
 assert.equal(beginProduction(g,'spinYarn',shelter.id),true,productionIssue(g,'spinYarn',shelter.id));let p=g.state.production.projects.at(-1);
 assert.equal(g.tribe(0).items.plantFibre,0);assert.equal(g.tribe(0).items.yarn||0,0);assert.equal(g.tribe(0).productionPractice.spinYarn,undefined);
 drive(g,100,()=>p.phase==='working'&&p.progress>2);assert.equal(p.phase,'working');assert.equal(pauseProductionProject(g,p.id),true);
 const id=p.id,paid=g.state.production.metrics.consumed.plantFibre,progress=p.progress;g=decodeGame(encodeGame(g));p=g.state.production.projects.find(p=>p.id===id);assert.equal(p.progress,progress);assert.equal(resumeProduction(g,id),true);
 drive(g,220,()=>p.phase==='complete');assert.equal(p.phase,'complete');assert.equal(g.state.production.metrics.consumed.plantFibre,paid);assert.equal(g.tribe(0).items.yarn,4);assert.equal(g.tribe(0).productionPractice.spinYarn.batches,1);
 const w=g.state.buildings.find(b=>b.id===shelter.id),t=g.state.buildings.find(b=>b.id===tailor.id);
 batch(g,'weaveCloth',w);assert.equal(g.tribe(0).items.yarn,0);assert.equal(g.tribe(0).items.cloth,2);assert.equal(g.tribe(0).productionPractice.weaveCloth.batches,1);
 batch(g,'sewLightClothes',t);assert.equal(g.tribe(0).items.cloth,0);assert.equal(g.tribe(0).items.cordage,3);assert.equal(g.tribe(0).items.lightClothes,1);
 const maker=p.practiceWorkers[0].id;u=g.state.units.find(a=>a.id===maker);goCache(g,u);assert.equal(equipClothing(g,u.id,'lightClothes'),true,g.state.banner);assert.equal(g.tribe(0).items.lightClothes,0);assert.equal(clothingWarmth(u),TEXTILE_RULES.lightWarmthCelsius);
 assert.equal(g.state.production.metrics.consumed.plantFibre,8);assert.equal(g.state.production.metrics.produced.yarn,4);assert.equal(g.state.production.metrics.consumed.yarn,4);assert.equal(g.state.production.metrics.produced.cloth,2);assert.equal(g.state.production.metrics.consumed.cloth,2);assert.equal(g.state.production.metrics.produced.lightClothes,1);
 const beforeReport=JSON.stringify(g.state),topics=productionKnowledgeTopics(g);assert.equal(topics.find(t=>t.id==='production:textiles').stage,'proven');assert.equal(topics.find(t=>t.id==='production:garments').stage,'adoption');assert.equal(JSON.stringify(g.state),beforeReport);
 if(process.env.TEXTILE_QA_FIXTURE){writeFileSync(process.env.TEXTILE_QA_FIXTURE,JSON.stringify(encodeGame(g)));writeFileSync(process.env.TEXTILE_QA_FIXTURE.replace('.json','-view.json'),JSON.stringify({purpose:'Controlled paid native bast-textile chain, not campaign or all-biome qualification',seed:1,worldgenVersion:14,layout:'pangaea',initialEndowment:{wood:120,stone:70,food:1000,waterLiters:1000},fibreGranted:false,terrainModified:false,home:campAnchor(g,0),wearer:{id:u.id,x:u.x,y:u.y,z:u.z,garment:u.garment},workplaces:g.state.buildings.filter(b=>[hearth.id,shelter.id,tailor.id].includes(b.id)).map(b=>({id:b.id,type:b.type,x:b.x,y:b.y,z:b.z})),production:g.state.production.metrics,practice:g.tribe(0).productionPractice},null,2));}
 const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.state.units.find(a=>a.id===u.id).garment,u.garment);assert.equal(copy.tribe(0).productionPractice.sewLightClothes.batches,1);
});
function goCache(g,u){const h=campAnchor(g,0);g.clearSelect();g.selectEntity(u);g.issueMove(h.x,h.z);drive(g,70,()=>u.order!=='move');}
function wardrobe(){const {g,u}=fixture();g.tribe(0).items={skinClothes:1,lightClothes:1,leatherClothes:1};goCache(g,u);return{g,u};}
test('cache-only seasonal swaps conserve the exact two conditions, one paid spare and its real walking/boat burden through save and capture',()=>{
 let{g,u}=wardrobe();assert.equal(equipClothing(g,u.id,'skinClothes'),true);u.garment.condition=.43;u.garment.heatExposureSeconds=12;
 const unladen=loadedHaulSpeed(u);assert.equal(equipClothing(g,u.id,'lightClothes'),true);u.garment.condition=.81;
 assert.ok(loadedHaulSpeed(u)<unladen);assert.equal(carriedLoadUnits(u),TEXTILE_RULES.spareLoadUnits.skinClothes);assert.ok(vesselLoad({capacity:2},[u]).pace<vesselLoad({capacity:2},[{...u,spareGarment:undefined}]).pace);
 const before=JSON.stringify(g.tribe(0).items);assert.equal(equipClothing(g,u.id,'leatherClothes'),false);
 for(let i=0;i<20;i++)assert.equal(swapClothing(g,u.id),true);assert.equal(u.garment.condition,.81);assert.equal(u.spareGarment.condition,.43);assert.equal(u.spareGarment.heatExposureSeconds,12);assert.equal(JSON.stringify(g.tribe(0).items),before);
 const id=u.id;g=decodeGame(encodeGame(g));u=g.state.units.find(a=>a.id===id);assert.equal(u.spareGarment.condition,.43);assert.equal(u.garment.condition,.81);
 const home=campAnchor(g,0);let away;search:for(const r of[20,30,40])for(let i=0;i<24;i++){const x=home.x+Math.cos(i*Math.PI/12)*r,z=home.z+Math.sin(i*Math.PI/12)*r;if(g.walkable(x,z)&&g.workBoard.connected(g,u.x,u.z,x,z)){away={x,z};break search;}}assert.ok(away);g.clearSelect();g.selectEntity(u);g.issueMove(away.x,away.z);drive(g,100,()=>u.order!=='move');assert.ok(Math.hypot(u.x-home.x,u.z-home.z)>10,JSON.stringify({x:u.x,z:u.z,away,work:u.workReason,banner:g.state.banner}));const stored=structuredClone([u.garment,u.spareGarment]);assert.ok(stored[0].condition<.81);assert.equal(stored[1].condition,.43);assert.equal(swapClothing(g,id),false);assert.deepEqual([u.garment,u.spareGarment],stored);
 // Controlled capture admission: one real rival body with the same carried goods,
 // a completed own hall and a nearby superior armed force. No inventory transfer.
 const hall=site(g,'townhall');g.rebuildWalk();const capturedClothes=structuredClone([u.garment,u.spareGarment]);u.team=1;u.hp=1;
 const guard=g.spawnUnit('spearman',u.x+1,u.z,0);assert.ok(guard);assert.equal(tryCivilianSurrender(g,u,0,2),true,JSON.stringify({type:u.type,militia:u.militia,maturesAt:u.maturesAt,time:g.state.time,pop:g.popNow(0),cap:g.popCap(0),hall:g.finished(hall),approach:g.interactionSpot(u,hall),defenders:g.state.units.filter(a=>a.team===1&&a.hp>0&&Math.hypot(a.x-u.x,a.z-u.z)<12).map(a=>({type:a.type,hp:a.hp}))}));assert.equal(u.enslavedFrom,1);assert.deepEqual([u.garment,u.spareGarment],capturedClothes);assert.equal(JSON.stringify(g.tribe(0).items),before);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('real displayed hot/cold conditions distinguish light workwear and insulation; spare garments do not provide double warmth',()=>{
 const{g,u}=wardrobe(),heavy=g.state.units.find(a=>a.team===0&&a.id!==u.id);u.garment={item:'lightClothes',condition:1};heavy.garment={item:'leatherClothes',condition:1};u.spareGarment={item:'skinClothes',condition:.6};
 for(const person of[u,heavy]){person.order='gather';person.fatigue=0;person.resting=undefined;person.coldSeconds=0;}
 const clock=g.clockState.bind(g);g.clockState=()=>({...clock(),weather:'Hot · 30°C'});g.tribe(0).wood=0;tickSurvival(g,10);
 assert.ok(heavy.garment.heatExposureSeconds>u.garment.heatExposureSeconds);assert.ok(heavy.fatigue>u.fatigue);assert.equal(u.spareGarment.heatExposureSeconds,undefined);assert.equal(clothingWarmth(u),.75);
 g.clockState=()=>({...clock(),weather:'Cold · 0°C'});tickSurvival(g,10);assert.ok(u.coldSeconds>heavy.coldSeconds);assert.equal(garmentHeatBurden(u,0),0);
 const old=u.fatigue;u.order='hold';tickGarmentHeat(u,30,10);assert.equal(u.fatigue,old);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('legacy garments remain valid; invalid textile and spare payloads are rejected, and dead bodies lose both actual garments once',()=>{
 const{g,u}=wardrobe();assert.equal(equipClothing(g,u.id,'skinClothes'),true);assert.equal(equipClothing(g,u.id,'lightClothes'),true);const raw=encodeGame(g);
 for(const change of[a=>a.spareGarment.condition=2,a=>a.garment.heatExposureSeconds=-1,a=>a.spareGarment.item='freeWool',a=>delete a.garment]){const bad=structuredClone(raw);change(bad.state.units.find(a=>a.id===u.id));assert.throws(()=>decodeGame(bad));}
 const legacy=structuredClone(raw),a=legacy.state.units.find(a=>a.id===u.id);delete a.spareGarment;a.garment={item:'skinClothes',condition:.4};assert.doesNotThrow(()=>decodeGame(legacy));
 u.hp=0;tickProduction(g,1);assert.equal(u.garment,undefined);assert.equal(u.spareGarment,undefined);assert.equal(g.state.production.metrics.lost.skinClothes,1);assert.equal(g.state.production.metrics.lost.lightClothes,1);tickProduction(g,1);assert.equal(g.state.production.metrics.lost.skinClothes,1);assert.equal(g.tribe(0).items.skinClothes,0);assert.equal(g.tribe(0).items.lightClothes,0);
});
test('actual shelter instances own separate paid spinning slots and hand spinning remains a slower physical fallback',()=>{
 const{g}=fixture();g.tribe(0).items={plantFibre:16};const a=site(g,'fibreWorkshop'),b=site(g,'fibreWorkshop');
 for(const u of g.state.units.filter(u=>u.team===0).slice(0,4))goCache(g,u);
 assert.equal(beginProduction(g,'spinYarn',a.id),true,productionIssue(g,'spinYarn',a.id));assert.equal(beginProduction(g,'spinYarn',a.id),true,productionIssue(g,'spinYarn',a.id));
 const paid=g.state.production.metrics.consumed.plantFibre;assert.match(productionIssue(g,'spinYarn',a.id),/slots/);assert.equal(beginProduction(g,'spinYarn',a.id),false);assert.equal(g.state.production.metrics.consumed.plantFibre,paid);
 assert.equal(beginProduction(g,'spinYarn',b.id),true,productionIssue(g,'spinYarn',b.id));
 const projects=g.state.production.projects;assert.equal(new Set(projects.map(p=>p.actorId)).size,3);assert.equal(projects.filter(p=>p.workplace===a.id).length,2);assert.equal(projects.filter(p=>p.workplace===b.id).length,1);assert.equal(g.tribe(0).items.plantFibre,4);assert.equal(g.tribe(0).items.yarn||0,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 assert.ok(PRODUCTION_RECIPES.spinYarnHand.workSeconds>PRODUCTION_RECIPES.spinYarn.workSeconds);drive(g,250,()=>projects.every(p=>p.phase==='complete'));assert.ok(projects.every(p=>p.phase==='complete'));assert.equal(productionIssue(g,'weaveCloth',a.id),null,'Plant cloth needs no unrelated food-processing hearth');const h=site(g,'hearth');batch(g,'spinYarnHand',h);assert.equal(g.tribe(0).items.yarn,16);assert.equal(g.state.production.metrics.consumed.plantFibre,16);assert.equal(g.state.production.metrics.produced.yarn,16);
});

test('a worn-out spare can be replaced at the cache without healing, refunding or duplicating the surviving garment',()=>{const{g,u}=wardrobe();assert.equal(equipClothing(g,u.id,'skinClothes'),true);assert.equal(equipClothing(g,u.id,'lightClothes'),true);u.spareGarment.condition=0;u.garment.condition=.64;assert.equal(equipClothing(g,u.id,'leatherClothes'),true);assert.equal(u.garment.item,'leatherClothes');assert.equal(u.spareGarment.item,'lightClothes');assert.equal(u.spareGarment.condition,.64);assert.equal(g.state.production.metrics.lost.skinClothes,1);assert.equal(g.tribe(0).items.leatherClothes,0);const stock=JSON.stringify(g.tribe(0).items);assert.equal(swapClothing(g,u.id),true);assert.equal(u.garment.condition,.64);assert.equal(swapClothing(g,u.id),true);assert.equal(u.spareGarment.condition,.64);assert.equal(JSON.stringify(g.tribe(0).items),stock);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
