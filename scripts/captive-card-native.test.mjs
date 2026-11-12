import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame,validateGameSave} from '../src/game/persistence.ts';
import {acceptPrisonerSurrender,provisionPrisoner} from '../src/game/captivity.ts';
import {applyEngineCommand} from '../src/game/engineDispatch.ts';
import {applyEngineReadQuery} from '../src/game/engineReadModels.ts';
import {contactYieldingTo} from '../src/game/encounters.ts';
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
let opening,ids;
function bodyPoint(g,u,x,z){for(const r of [2,3,4,6])for(let i=0;i<24;i++){const a=i*Math.PI/12,p={x:x+Math.cos(a)*r,z:z+Math.sin(a)*r};if(g.height(p.x,p.z)>g.waterAt(p.x,p.z)+.35&&g.canStep(u,p.x,p.z)&&g.workBoard.connected(g,u.x,u.z,p.x,p.z))return p;}assert.fail('No native body-sized dry approach');}
test.before(()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),u=g.state.units.find(p=>p.id===f.worker),home=g.campOf(0);
 // Finite authored encounter opening, not an earned battle/construction claim:
 // one nearby foreign adult, one armed guard, one legal foreign return store.
 // Native terrain and every pre-existing actor position remain unchanged.
 for(const p of g.state.units){p.order='hold';p.jobLock=true;p.target=null;p.node=null;}
 let point;for(let r=28;r<=76&&!point;r+=4)for(let i=0;i<24&&!point;i++){const x=home.x+Math.cos(i*Math.PI/12)*r,z=home.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue('warehouse',x,z,1)===null&&g.workBoard.connected(g,u.x,u.z,x,z))point={x,z};}assert.ok(point);
 const store=g.makeBld('warehouse',point.x,point.z,1);g.state.buildings.push(store);g.rebuildWalk();
 const tp=bodyPoint(g,u,u.x,u.z),target=g.spawnUnit('worker',tp.x,tp.z,1);target.homeHall=store.id;target.order='hold';target.jobLock=true;target.carry=3;target.carryType='stone';
 const gp=bodyPoint(g,u,target.x,target.z),guard=g.spawnUnit('spearman',gp.x,gp.z,0);guard.order='hold';guard.jobLock=true;guard.carry=12;guard.carryType='food';guard.carryFood='provisions';g.tribe(0).food-=12;g.tribe(0).foodLots.provisions-=12;
 for(const t of g.state.tribes){t.hostile=false;t.thinkT=10000;}g.tribe(1).stone=17;g.tribe(1).food=1000;g.tribe(1).foodLots={provisions:1000};
 ids={target:target.id,guard:guard.id,store:store.id};opening=encodeGame(g);validateGameSave(opening);
});
const fixture=()=>decodeGame(structuredClone(opening));
const held=g=>applyEngineReadQuery(g,{kind:'captives'}).captives;
function surrender(g){const target=g.state.units.find(u=>u.id===ids.target),guard=g.state.units.find(u=>u.id===ids.guard);const r=acceptPrisonerSurrender(g,target,0);assert.equal(r.accepted,true,r.reason);assert.equal(provisionPrisoner(g,target.id,guard.id),true);return{target,guard};}
test('actual surrender appears in owner card; guard presence and assignment are real, release walks same body and goods to a native return cache',()=>{
 let g=fixture();const before=terrain(g);let{target,guard}=surrender(g);let row=held(g).find(x=>x.id===target.id);assert.ok(row);assert.equal(row.custody,'escorting');assert.equal(row.guarded,true);assert.equal(row.food,12);assert.equal(target.enslavedFrom,undefined,'modern custody never becomes automatic forced labor');
 guard.emergency=true;assert.equal(held(g).find(x=>x.id===target.id).guarded,false);guard.emergency=false;target.prisoner.guardId=undefined;guard.escortId=undefined;guard.order='hold';
 const assigned=applyEngineCommand(g,{kind:'escort-captive',unitId:target.id});assert.equal(assigned.accepted,true,assigned.reason);assert.equal(target.prisoner.guardId,guard.id);
 g=decodeGame(encodeGame(g));target=g.state.units.find(u=>u.id===ids.target);guard=g.state.units.find(u=>u.id===ids.guard);assert.equal(held(g).find(x=>x.id===target.id).guarded,true);
 if(process.env.CAPTIVE_CARD_NATIVE_SAVE){assert.ok(isAbsolute(process.env.CAPTIVE_CARD_NATIVE_SAVE));g.state.paused=true;writeFileSync(process.env.CAPTIVE_CARD_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
 const position={x:target.x,z:target.z},hp=target.hp;const released=applyEngineCommand(g,{kind:'repatriate-captive',unitId:target.id});assert.equal(released.accepted,true,released.reason);assert.equal(target.team,1);assert.equal(target.prisoner.phase,'released');assert.equal(target.carry,3);assert.deepEqual({x:target.x,z:target.z},position,'command cannot teleport the person home');assert.equal(held(g).some(x=>x.id===target.id),false);assert.equal(guard.escortId,undefined);
 g=decodeGame(encodeGame(g));target=g.state.units.find(u=>u.id===ids.target);const end=g.state.time+120;while(target.prisoner&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}
 assert.equal(target.prisoner,undefined,JSON.stringify({hp:target.hp,time:g.state.time,order:target.order,reason:target.workReason,x:target.x,z:target.z,near:g.state.units.filter(u=>u.id!==target.id&&Math.hypot(u.x-target.x,u.z-target.z)<15).map(u=>({id:u.id,team:u.team,type:u.type,order:u.order,target:u.target?.id}))}));assert.equal(target.hp,hp);assert.equal(target.carry,0);assert.equal(g.tribe(1).stone,20);assert.ok(Math.hypot(target.x-position.x,target.z-position.z)>2);assert.equal(terrain(g),before);assert.doesNotThrow(()=>validateGameSave(encodeGame(g)));
});
test('owner commands reject foreign people and repeat release without mutating custody or goods',()=>{
 const g=fixture(),{target}=surrender(g);const foreign=g.state.units.find(u=>u.team===2&&u.hp>0);assert.ok(foreign);const before=JSON.stringify(g.state);for(const kind of ['escort-captive','repatriate-captive']){assert.equal(applyEngineCommand(g,{kind,unitId:foreign.id}).accepted,false);assert.equal(JSON.stringify(g.state),before);}
 assert.equal(applyEngineCommand(g,{kind:'repatriate-captive',unitId:target.id}).accepted,true);const after=JSON.stringify(g.state);assert.equal(applyEngineCommand(g,{kind:'repatriate-captive',unitId:target.id}).accepted,false);assert.equal(JSON.stringify(g.state),after);
});
test('free-society command releases modern custody to walk home while retaining legacy free-membership semantics',()=>{
 const g=fixture(),{target}=surrender(g),legacy=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(legacy);legacy.enslavedFrom=1;legacy.captivityUnrest=40;const x=target.x,z=target.z;
 assert.equal(held(g).filter(x=>x.fromTeam===1).length,2);const r=applyEngineCommand(g,{kind:'free-captives',team:1});assert.equal(r.accepted,true,r.reason);assert.equal(target.team,1);assert.equal(target.prisoner.phase,'released');assert.equal(target.x,x);assert.equal(target.z,z);assert.equal(target.carry,3);assert.equal(legacy.team,0);assert.equal(legacy.enslavedFrom,undefined);assert.equal(held(g).length,0);assert.doesNotThrow(()=>validateGameSave(encodeGame(g)));
});

test('release safe conduct prevents former-captor auto-targets but a deliberate fresh attack revokes it without teleporting or changing cargo',()=>{
 const g=fixture(),{target,guard}=surrender(g);assert.equal(applyEngineCommand(g,{kind:'repatriate-captive',unitId:target.id}).accepted,true);assert.equal(contactYieldingTo(g,target,0),true);assert.equal(contactYieldingTo(g,target,2),false,'no immunity from unrelated societies');const pos=[target.x,target.z],cargo=target.carry;g.clearSelect();guard.selected=true;g.issueAttack(target);assert.equal(contactYieldingTo(g,target,0),false);assert.deepEqual([target.x,target.z],pos);assert.equal(target.carry,cargo);assert.equal(target.prisoner.phase,'released');
});
