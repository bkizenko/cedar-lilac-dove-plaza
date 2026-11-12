import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickRaiderSettlement,validRaiderSettlementState,RAIDER_SETTLEMENT_RULES} from '../src/game/raiderSettlement.ts';
import {validConflictIntentState} from '../src/game/conflictIntent.ts';

function fixture({food=true,slot=true}={}){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 const hall=g.makeBld('townhall',-150,0,0),camp=g.makeBld('hut',100,60,3);camp.raiderCamp=true;camp.build=1;g.state.buildings=[hall,camp,g.makeBld('townhall',0,-150,1),g.makeBld('townhall',0,150,2),g.makeBld('townhall',150,-150,4)];
 g.state.finiteRaiderCampVersion=1;g.vision.fill(2);g.rebuildWalk();
 const tr=g.state.trees.slice(0,2),fo=g.state.forage.slice(0,1);tr.forEach((n,i)=>Object.assign(n,{x:110-i*10,z:60+i*15,amount:50}));fo.forEach(n=>Object.assign(n,{x:95,z:70,amount:20}));g.state.trees=tr;g.state.forage=food?fo:[];g.state.fish=[];g.state.wildlife=[];
 const band=[0,1,2].map(i=>{const u=g.spawnUnit('spearman',104+i,62,3);u.homeCamp=camp.id;u.order='hold';return u;});
 const t5=g.tribe(5);if(slot){t5.alive=false;}else t5.alive=true;g.tribe(3).food=90;g.tribe(3).wood=30;
 return{g,camp,band};}
function quiet(g,seconds){for(let t=0;t<seconds;t+=10){g.state.time+=10;tickRaiderSettlement(g);}}

test('a quiet, provisioned camp settles into a new society with the same people, hut and its share of real stores',()=>{
 const {g,camp,band}=fixture();const food=g.tribe(3).food,wood=g.tribe(3).wood,people=g.state.units.length;
 quiet(g,RAIDER_SETTLEMENT_RULES.quietSeconds-60);assert.equal(camp.team,3,'not before the quiet period');
 quiet(g,80);assert.equal(camp.team,5);assert.equal(camp.raiderCamp,undefined);for(const u of band){assert.equal(u.team,5);assert.equal(u.homeCamp,undefined);}
 assert.equal(g.tribe(5).alive,true);assert.equal(g.state.units.length,people,'no one created');
 assert.equal(g.tribe(3).food+g.tribe(5).food,food,'food conserved');assert.equal(g.tribe(3).wood+g.tribe(5).wood,wood,'wood conserved');
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validRaiderSettlementState(raw.state),true);assert.equal(validConflictIntentState(raw.state),true);
 const copy=decodeGame(raw);assert.equal(copy.state.buildings.find(b=>b.id===camp.id).team,5);
});
test('raiding resets the clock; no wild food or no free society identity means no settlement',()=>{
 const a=fixture();quiet(a.g,600);a.camp.campEconomy={version:1,knownSites:[],lastDispatchAt:0,departures:1,returns:0,lost:0,foodPaid:0,waterPaid:0,foodUsed:0,waterUsed:0};quiet(a.g,RAIDER_SETTLEMENT_RULES.quietSeconds-60);assert.equal(a.camp.team,3,'a departure restarted the quiet clock');
 const b=fixture({food:false});quiet(b.g,RAIDER_SETTLEMENT_RULES.quietSeconds+60);assert.equal(b.camp.team,3,'site cannot feed people');
 const c=fixture({slot:false});quiet(c.g,RAIDER_SETTLEMENT_RULES.quietSeconds+60);assert.equal(c.camp.team,3,'no free society identity');
});
test('a beaten camp settles after a shorter quiet period; corrupt state rejected; old saves load',()=>{
 const {g,camp,band}=fixture();quiet(g,20);camp.campEconomy={version:1,knownSites:[],lastDispatchAt:0,departures:0,returns:0,lost:2,foodPaid:0,waterPaid:0,foodUsed:0,waterUsed:0};
 quiet(g,RAIDER_SETTLEMENT_RULES.lossQuietSeconds+30);assert.equal(camp.team,5,'raiding stopped paying');void band;
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));const bad=structuredClone(raw.state);bad.raiderSettlement.transitions[0].team=3;assert.equal(validRaiderSettlementState(bad),false);
 const old=structuredClone(raw.state);delete old.raiderSettlement;assert.equal(validRaiderSettlementState(old),true);
});
