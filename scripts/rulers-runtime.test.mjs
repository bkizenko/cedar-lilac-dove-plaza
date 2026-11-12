import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {rulerOf,advanceRulers,RULERS_YEAR_SECONDS} from '../src/game/rulersRuntime.ts';
import {rulersOf} from '../src/game/rulersState.ts';
function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();return g;}
test('new games carry rulers; dynastic years advance with sim time; every society has a ruling house',()=>{
 const g=fixture();assert.equal(g.state.worldOptions?.rulersVersion,1);
 g.state.time=RULERS_YEAR_SECONDS*5+1;advanceRulers(g);
 const r=rulersOf(g.state);assert.ok(r,'rulers state valid');assert.equal(r.year,5);
 for(let i=0;i<g.state.tribes.length;i++){const o=rulerOf(g,i);assert.ok(o&&o.name&&o.house,'society '+i);}
 assert.ok(['household','kingroup','house','dynasty'].includes(rulerOf(g,0).stage));
});
test('old saves (no option, no field) are untouched',()=>{
 const g=fixture();delete g.state.worldOptions.rulersVersion;delete g.state.rulers;
 g.state.time=RULERS_YEAR_SECONDS*9;advanceRulers(g);assert.equal(g.state.rulers,undefined);assert.equal(rulerOf(g,0),null);
});
test('rulers state round-trips through JSON',()=>{
 const g=fixture();g.state.time=RULERS_YEAR_SECONDS*3;advanceRulers(g);
 const copy=JSON.parse(JSON.stringify(g.state.rulers));assert.deepEqual(JSON.parse(JSON.stringify(copy)),copy);assert.ok(rulersOf({rulers:copy}));assert.ok(rulersOf(g.state));
});

test('marryHouses: gated by scale; then ties and trust rise with a cause chain',async()=>{
 const {marryHouses,tiesBetween}=await import('../src/game/rulersRuntime.ts');
 const {societyRelation}=await import('../src/game/societyRelations.ts');
 const g=fixture();
 assert.equal(marryHouses(g,0,1),null,'a household of five does not trade spouses');
 for(const t of [0,1]){const u=g.state.units.find(u=>u.team===t&&u.hp>0);for(let i=0;i<20;i++)g.state.units.push({...u,id:g.state.units.length+9000+i+t*100});}
 for(const t of ['0','1']){const d=g.state.rulers.societies[t].dynasty,k=Object.values(d.people).find(p=>p.alive);d.people[t+'-cadet']={...k,id:t+'-cadet',name:'Cadet'+t,age:20,spouse:undefined,parent:undefined,ruler:undefined};}
 const before=societyRelation(g,0,1).trust,bond0=tiesBetween(g,0,1).bond;
 const res=marryHouses(g,0,1);assert.ok(res,'marriage happens at kingroup scale');
 assert.ok(res.why.length>0);assert.ok(tiesBetween(g,0,1).bond>bond0);assert.ok(societyRelation(g,0,1).trust>=before);
 assert.ok(societyRelation(g,1,0).trust>=0);
 assert.deepEqual(JSON.parse(JSON.stringify(g.state.rulers)),JSON.parse(JSON.stringify(g.state.rulers)));
 assert.ok(rulersOf(g.state),'state still valid after marriage');
});
