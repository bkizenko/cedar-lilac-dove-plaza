import test from 'node:test';
import assert from 'node:assert/strict';
import {MIN_RAID_PARTY,raidPartyViable} from '../src/game/raidParty.ts';
import {seaRaidStrength} from '../src/game/raiders.ts';
import {Game} from '../src/game/sim.ts';
import {massRaid} from '../src/game/massRaid.ts';

test('MIN_RAID_PARTY is 3',()=>{assert.equal(MIN_RAID_PARTY,3);assert.equal(raidPartyViable(2),false);assert.equal(raidPartyViable(3),true);});

test('generated raids are never smaller than the minimum party across populations and seeds',()=>{
 let seed=1;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 let launched=0;
 for(let i=0;i<5000;i++){
  const pop=3+Math.floor(rnd()*120),age=Math.floor(rnd()*6),threat=rnd()*2,wave=2+Math.floor(rnd()*12),dangerous=rnd()<.5;
  const capacity=1+Math.floor(rnd()*36),loss=rnd()*.9,band=.1+rnd()*2;
  const r=seaRaidStrength(pop,age,threat,wave,rnd(),dangerous,capacity,loss,band);
  if(r.count===0){assert.ok(Math.min(36,Math.ceil(pop*(dangerous?.6:.45)),Math.floor(capacity))<MIN_RAID_PARTY);continue;}
  launched++;assert.ok(r.count>=MIN_RAID_PARTY,`raid of ${r.count} (pop ${pop})`);
 }
 assert.ok(launched>1000);
});
test('insufficient forces launch no raid',()=>{
 assert.equal(seaRaidStrength(40,3,1,5,.5,false,2).count,0);
 assert.equal(seaRaidStrength(4,2,1,5,.5,false,36).count,0);
});
test('small and large targets scale up from the minimum',()=>{
 const small=seaRaidStrength(16,0,0,2,.5).count,big=seaRaidStrength(100,3,1,8,.5).count;
 assert.ok(small>=3&&small<=5,String(small));assert.ok(big>small);
});

function fixture(armedCount){
 const g=new Game();g.reset(123456,3);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',100,38,1)];
 g.state.conflict='quiet';g.state.paused=false;g.vision.fill(2);g.rebuildWalk();
 for(let i=0;i<armedCount;i++){const u=g.spawnUnit('worker',i*3,50,0);u.selected=true;}
 Object.assign(g.tribe(0),{spears:10,bows:0,blades:0});g.callToArms();g.state.units.forEach(u=>u.selected=false);
 return {g,hall:g.state.buildings[1]};
}
test('mass raid refuses fewer than 3 armed adults and sends nobody',()=>{
 for(const n of [1,2]){const {g,hall}=fixture(n);assert.equal(massRaid(g,hall.id),0);assert.ok(g.state.units.every(u=>u.massRaidTarget===undefined&&u.pillage!==1));}
 const {g,hall}=fixture(3);assert.equal(massRaid(g,hall.id),3);
});
