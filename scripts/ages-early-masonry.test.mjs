import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginProduction,productionIssue} from '../src/game/production.ts';
import {MASONRY_RULES,faceBuilding,facingIssue} from '../src/game/masonry.ts';
import {applyEngineCommand} from '../src/game/engineDispatch.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {sitePreparationSurvey} from '../src/game/sitePreparation.ts';
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z)&&!sitePreparationSurvey(g,{x,z,w:BUILDINGS[type].w,d:BUILDINGS[type].d}).clearable.length)return{x,z};}}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}assert.ok(done(),JSON.stringify({t:g.state.time,items:g.tribe(0).items,projects:g.state.production?.projects}));}
let setup,workerId,kilnId,quarryId,wallId;
test.before(()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0);workerId=f.worker;
 const t=g.tribe(0);t.age=2;g.state.age=2;
 for(const type of ['kiln','quarry','stonewall']){const p=legal(g,type,home);assert.ok(p,type);const b=g.makeBld(type,p.x,p.z,0);g.state.buildings.push(b);if(type==='kiln')kilnId=b.id;else if(type==='quarry')quarryId=b.id;else wallId=b.id;g.rebuildWalk();}
 Object.assign(t,{food:20000,foodLots:{provisions:20000},wood:300,stone:60,copper:0,iron:0});t.survival.waterLiters=1500;
 setup=encodeGame(g);validateGameSave(setup);
});
test('lime and dressed stone are paid from real stone and timber, gated to the Iron Age, and conserved',()=>{
 const g=decodeGame(setup),t=g.tribe(0);t.age=1;assert.match(productionIssue(g,'burnLime',kilnId,workerId),/Iron Age/);t.age=2;
 const stone=t.stone,wood=t.wood;
 assert.equal(beginProduction(g,'burnLime',kilnId,workerId),true,g.state.banner);
 assert.equal(t.stone,stone-MASONRY_RULES.limeStone,'stone paid at the start');assert.ok(t.wood<=wood-MASONRY_RULES.limeWood+1e-6||t.wood<wood,'timber fuel paid');
 drive(g,600,()=>(t.items.lime||0)===MASONRY_RULES.limeOut);
 assert.equal(beginProduction(g,'dressStone',quarryId,workerId),true,g.state.banner);
 assert.equal(t.stone,stone-MASONRY_RULES.limeStone-MASONRY_RULES.dressStone);
 drive(g,700,()=>(t.items.dressedStone||0)===MASONRY_RULES.dressOut);
 assert.equal(t.stone,stone-MASONRY_RULES.limeStone-MASONRY_RULES.dressStone,'no stone is created');
 t.stone=3;assert.match(productionIssue(g,'dressStone',quarryId,workerId),/stone/);
});
test('facing hardens a stone building once, spends dressed stone and lime, and survives save and load',()=>{
 const g=decodeGame(setup),t=g.tribe(0),wall=g.state.buildings.find(b=>b.id===wallId);
 assert.match(facingIssue(g,0,wallId),/dressed stone/);
 t.items={...t.items,dressedStone:7,lime:3};const max=wall.maxHp;
 const out=applyEngineCommand(g,{kind:'face-building',buildingId:wallId});assert.equal(out.accepted,true,out.reason);
 assert.equal(wall.maxHp,Math.round(max*1.25));assert.equal(t.items.dressedStone,1);assert.equal(t.items.lime,1);
 assert.equal(faceBuilding(g,0,wallId).accepted,false,'only once');
 const raw=encodeGame(g);validateGameSave(raw);const g2=decodeGame(raw);const w2=g2.state.buildings.find(b=>b.id===wallId);
 assert.equal(w2.faced,true);assert.equal(w2.maxHp,wall.maxHp);
 const home=g.state.buildings.find(b=>b.type==='kiln');assert.match(facingIssue(g,0,home.id),/stonework/);
});
