import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {productionIssue} from '../src/game/production.ts';
import {LATE_AGE_RULES as R} from '../src/game/lateAgeRules.ts';
import {runKnowledgeAction} from '../src/game/knowledge.ts';
import {armFromStock,weaponStockReport,weaponStockTotal} from '../src/game/armingCall.ts';
import {weaponDamage} from '../src/game/weaponGrades.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {sitePreparationSurvey} from '../src/game/sitePreparation.ts';
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z)&&!sitePreparationSurvey(g,{x,z,w:BUILDINGS[type].w,d:BUILDINGS[type].d}).clearable.length)return{x,z};}}
function setup(){
  const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0),t=g.tribe(0);
  const p=legal(g,'forge',home);assert.ok(p);const b=g.makeBld('forge',p.x,p.z,0);g.state.buildings.push(b);g.rebuildWalk();
  t.ironMetallurgyVersion=1;t.food=20000;t.foodLots={provisions:20000};t.wood=300;
  return {g,t,worker:f.worker,forge:b.id};
}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}return done();}
test('steel-edged blades are taken first when arming, hit harder, and stock falls back to plain blades', () => {
  const {g,t}=setup();t.age=g.state.age=4;t.blades=1;t.spears=0;t.bows=0;t.items={...t.items,bronzeBlade:0,steelBlade:1};
  assert.equal(weaponStockTotal(g,0),2);assert.equal(weaponStockReport(g,0).steelBlades,1);
  const [a,b]=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&!u.maturesAt);
  assert.equal(armFromStock(g,a),true);assert.equal(t.items.steelBlade,0);assert.equal(t.blades,1,'plain blade untouched');
  const plain=weaponDamage('swordsman',4);assert.ok(Math.abs(a.dmg-plain*R.bladeDamage)<1e-9,`${a.dmg} vs ${plain}`);
  assert.equal(armFromStock(g,b),true);assert.equal(t.blades,0);assert.ok(Math.abs(b.dmg-plain)<1e-9,'fallback is the age grade');
  assert.ok(a.dmg>b.dmg);
});
test('steel blades are forged only from paid steel and charcoal, and only from the Medieval Age', () => {
  const {g,t,worker,forge}=setup();
  t.age=g.state.age=3;t.items={...t.items,steel:R.steelBladeSteel,charcoal:3};
  assert.match(productionIssue(g,'forgeSteelBlades',forge,worker),/advanced age/);
  t.age=g.state.age=4;t.items.steel=R.steelBladeSteel-1;
  assert.notEqual(productionIssue(g,'forgeSteelBlades',forge,worker),null,'one steel short');
  t.items.steel=R.steelBladeSteel;
  assert.equal(runKnowledgeAction(g,'late:blades').accepted,true);
  assert.equal(t.items.steel,0);assert.equal(t.items.charcoal,3-R.steelBladeCharcoal);assert.equal(t.items.steelBlade||0,0,'nothing before delivery');
  const p=g.state.production.projects.at(-1);assert.ok(drive(g,1200,()=>p.phase==='complete'),JSON.stringify({ph:p.phase,r:p.blockedReason}));
  assert.equal(t.items.steelBlade,R.steelBladeCount);assert.ok(R.steelBladeCount<R.steelBladeSteel);
  const raw=encodeGame(g);validateGameSave(raw);assert.equal(decodeGame(raw).tribe(0).items.steelBlade,R.steelBladeCount);
});
import {bookPracticeBonus} from '../src/game/lateAgeRules.ts';
test('books bound from paid paper speed practice, capped, doubled by a finished academy', () => {
  const {g,t,worker}=setup();t.age=g.state.age=5;
  assert.equal(bookPracticeBonus(g,0),0);
  t.items={...t.items,book:3};const base=bookPracticeBonus(g,0);assert.ok(base>0&&base<=R.bookCap);
  t.items.book=100;assert.equal(bookPracticeBonus(g,0),R.bookCap,'capped');
  const a=g.makeBld('university',g.campOf(0).x,g.campOf(0).z,0);g.state.buildings.push(a);
  if(g.finished(a)){assert.ok(bookPracticeBonus(g,0)>R.bookCap,'academy lifts the cap');}
  assert.ok(R.bookCap<=.15,'bounded');
});
import {UNITS,AGE_STAT} from '../src/game/constants.ts';
import {unitItemShortfall} from '../src/game/lateAgeRules.ts';
test('arquebusiers need powder from paid charcoal, straw and bone, and fit the unit ladder', () => {
  const u=UNITS.arquebusier,h=UNITS.hoplite,p=UNITS.pikeman,a=UNITS.archer;
  assert.equal(u.age,5);assert.equal(u.from,'barracks');
  assert.ok(u.range>a.range&&u.range>p.range,'reach beyond the bow');
  assert.ok(u.hp<h.hp&&u.hp>a.hp,'lighter than a hoplite, tougher than an archer');
  assert.ok(u.dmg/u.rof<h.dmg/h.rof*1.2+a.dmg/a.rof,'dps stays in the ladder');
  const {g,t}=setup();t.age=g.state.age=5;
  assert.match(unitItemShortfall(g,0,'arquebusier'),/gunpowder/);
  t.items={...t.items,charcoal:R.powderCharcoal,straw:R.powderStraw,bone:R.powderBone};
  assert.equal(runKnowledgeAction(g,'late:powder').accepted,false,'no kiln yet');
  const home=g.campOf(0),p2=legal(g,'kiln',home);assert.ok(p2);const k=g.makeBld('kiln',p2.x,p2.z,0);g.state.buildings.push(k);g.rebuildWalk();
  assert.equal(runKnowledgeAction(g,'late:powder').accepted,true,g.state.banner);
  assert.equal(t.items.charcoal||0,0);assert.equal(t.items.straw||0,0);assert.equal(t.items.bone||0,0);
  const pr=g.state.production.projects.at(-1);assert.ok(drive(g,1500,()=>pr.phase==='complete'),JSON.stringify({ph:pr.phase,r:pr.blockedReason}));
  assert.equal(t.items.gunpowder,R.powderPerBatch);
  // training spends powder with the other costs
  const bar=g.makeBld('barracks',home.x+8,home.z,0);bar.build=1;g.state.buildings.push(bar);
  Object.assign(t,{food:5000,wood:500,iron:50});t.foodLots={provisions:5000};
  const before=t.items.gunpowder;assert.equal(g.enqueueTrain(bar,'arquebusier'),true,g.state.banner);
  assert.equal(t.items.gunpowder,before-R.powderPerSoldier);
  t.items.gunpowder=0;assert.equal(g.enqueueTrain(bar,'arquebusier'),false,'no powder, no soldier');
  assert.ok(AGE_STAT.length>5);
});
import {tickRivalSteel} from '../src/game/lateAgeRules.ts';
test('rival smiths make steel and steel blades only from their own iron, with a forge, at the Medieval Age', () => {
  const {g}=setup();const rt=g.state.tribes.find(t=>t.id!==0&&t.alive);assert.ok(rt);
  const home=g.campOf(rt.id)||g.campOf(0);const p=legal(g,'forge',home)||{x:home.x+10,z:home.z};
  const f=g.makeBld('forge',p.x,p.z,rt.id);f.build=1;g.state.buildings.push(f);
  rt.items={};rt.iron=8;rt.food=5000;rt.foodLots={provisions:5000};
  rt.age=3;tickRivalSteel(g);assert.equal(rt.items.steel||0,0,'not before Medieval');
  rt.age=4;g.state.time+=400;const iron0=rt.iron;tickRivalSteel(g);
  assert.equal(rt.items.steel,R.steelPerBatch);assert.equal(rt.iron,iron0-R.rivalSteelIron);assert.ok(R.steelPerBatch<R.rivalSteelIron,'loss, nothing minted');
  rt.items.steel=R.steelBladeSteel;g.state.time+=400;tickRivalSteel(g);
  assert.equal(rt.items.steelBlade,R.steelBladeCount);assert.equal(rt.items.steel,0);
  rt.iron=0;rt.items.steel=0;g.state.time+=400;tickRivalSteel(g);assert.equal(rt.items.steel,0,'no iron, no steel');
});
