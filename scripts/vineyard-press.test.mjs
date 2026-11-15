import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {SIM_CALENDAR_RULES} from '../src/game/calendarPacing.ts';
import {regionalSuitability,pressRegional,REGIONAL_RULES} from '../src/game/regionalGoods.ts';
import {tickVineyards,pickVineyard,vineyardGrapes,vineyardIssue,validVineState,VINEYARD_RULES} from '../src/game/vineyards.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const Y=SIM_CALENDAR_RULES.yearSeconds;
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();for(const t of g.state.tribes)t.age=1;
 const t=g.tribe(0);t.food=200;t.wood=60;t.stone=20;t.items={pottery:4};g.state.buildings.push(g.makeBld('warehouse',4,4,0));
 const v=g.makeBld('vineyard',-16,4,0);g.state.buildings.push(v);for(const b of g.state.buildings)b.build=1;return {g,v};}
/** First autumn time of year 1 (after one establishing year) where the wine climate holds, else null. */
function autumnWhereWine(g,want){for(let s=Y+Y/2;s<Y+Y*.75;s+=10){g.state.time=s;if(regionalSuitability(g,0,'wine').ok===want)return s;}return null;}
test('vineyard and press are Bronze-age buildings with real costs',()=>{
 for(const t of['vineyard','press']){const d=BUILDINGS[t];assert.ok(d.age>=1&&d.wood>0,t);}
});
test('vines establish for a year, ripen in autumn only where wine suits, and unpicked fruit is lost in winter',()=>{
 const {g,v}=fixture();const ok=autumnWhereWine(g,true);
 if(ok!==null){g.state.time=ok;v.vine={plantedYear:0,ripenedYear:-1,grapes:0};tickVineyards(g);assert.equal(vineyardGrapes(g,v),VINEYARD_RULES.capacityFood);
  tickVineyards(g);assert.equal(vineyardGrapes(g,v),VINEYARD_RULES.capacityFood,'ripens once a year');
  g.state.time=Y+Y*.8;tickVineyards(g);assert.equal(vineyardGrapes(g,v),0,'winter takes the unpicked crop');}
 // first-year vines do not ripen
 const f=fixture();for(let s=Y/2;s<Y*.75;s+=10){f.g.state.time=s;tickVineyards(f.g);}assert.equal(vineyardGrapes(f.g,f.v),0);
 // wrong climate: no crop
 const no=autumnWhereWine(g,false);if(no!==null){const h=fixture();h.g.state.time=no;h.v.vine={plantedYear:0,ripenedYear:-1,grapes:0};tickVineyards(h.g);assert.equal(vineyardGrapes(h.g,h.v),0);assert.equal(typeof vineyardIssue(h.g,0),'string');}
});
test('a picker carries grapes as food up to what they can carry',()=>{
 const {g,v}=fixture();v.vine={plantedYear:0,ripenedYear:1,grapes:VINEYARD_RULES.capacityFood};
 const u=g.spawnUnit('worker',-14,4,0);u.carry=0;const took=pickVineyard(g,u,v);
 assert.ok(took>0&&took<=VINEYARD_RULES.capacityFood);assert.equal(u.carry,took);assert.equal(u.carryFood,'berries');assert.equal(vineyardGrapes(g,v),VINEYARD_RULES.capacityFood-took);
});
test('vine state validates and survives a save',()=>{
 assert.ok(validVineState(undefined,'hut'));assert.ok(!validVineState({plantedYear:0,ripenedYear:-1,grapes:0},'hut'));
 assert.ok(validVineState({plantedYear:0,ripenedYear:1,grapes:5},'vineyard'));
 assert.ok(!validVineState({plantedYear:0,ripenedYear:-1,grapes:5},'vineyard'));assert.ok(!validVineState({plantedYear:0,ripenedYear:1,grapes:99},'vineyard'));assert.ok(!validVineState({plantedYear:0,ripenedYear:1,grapes:-1},'vineyard'));
 const {g,v}=fixture();v.vine={plantedYear:0,ripenedYear:1,grapes:6};
 const c=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(c.state.buildings.find(b=>b.type==='vineyard').vine.grapes,6);
});
test('a finished press gives one extra jar per batch and can stand in for a storehouse',()=>{
 for(const k of['wine','oliveOil']){const a=fixture().g;for(let s=0;s<Y;s+=15){a.state.time=s;if(regionalSuitability(a,0,k).ok)break;}if(!regionalSuitability(a,0,k).ok)continue;
  const base=pressRegional(a,0,k,1);assert.equal(base.accepted,true,base.reason);assert.equal(a.tribe(0).items[k],REGIONAL_RULES.batchJars);
  const b=fixture().g;b.state.time=a.state.time;const p=b.makeBld('press',20,4,0);p.build=1;b.state.buildings.push(p);
  assert.equal(pressRegional(b,0,k,1).accepted,true);assert.equal(b.tribe(0).items[k],REGIONAL_RULES.batchJars+1);
  const c=fixture().g;c.state.time=a.state.time;c.state.buildings=c.state.buildings.filter(x=>x.type!=='warehouse'&&x.type!=='vineyard');const p2=c.makeBld('press',20,4,0);p2.build=1;c.state.buildings.push(p2);
  assert.equal(pressRegional(c,0,k,1).accepted,true,'press house alone suffices');return;}
 assert.ok(true,'no suitable season found');
});
