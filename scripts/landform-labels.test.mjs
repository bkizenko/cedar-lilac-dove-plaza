import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {habitatKindAt} from '../src/game/ecology.ts';
import {provinceAt} from '../src/game/ecologicalProvinces.ts';
import {landformLabelsEnabled,landformLabels} from '../src/game/landformLabels.ts';
import {landformCoherence} from '../src/game/landformCoherence.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

const WORLDS=[[4,'pangaea'],[2,'archipelago'],[7,'continents'],[1,'pangaea']];
const make=(s,l,o={})=>{const g=new Game();g.reset(s,18,{size:1040,layout:l,...o});return g;};
const rel=(g,x,z,r)=>{const v=[[0,0],[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>g.height(x+a*r,z+b*r));return Math.max(...v)-Math.min(...v);};
function reliefByLabel(g){const by={plains:[[],[],[]],forest:[[],[],[]],hills:[[],[],[]]};
  for(let z=-500;z<=500;z+=16)for(let x=-500;x<=500;x+=16){if(g.height(x,z)<g.waterAt(x,z)+.85)continue;const k=by[habitatKindAt(g,x,z)];[4,12,24].forEach((r,i)=>k[i].push(rel(g,x,z,r)));}
  const med=a=>{a.sort((x,y)=>x-y);return a.length?a[a.length>>1]:NaN;};return Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.map(med)]));}

test('native worlds with the option: hills are rougher than plains at 8, 24 and 48 m, woodland is unchanged and speckle stays low',()=>{
  for(const [s,l] of WORLDS){const g=make(s,l,{landformLabelVersion:2});assert.equal(landformLabelsEnabled(g.world),true);
    const r=reliefByLabel(g);for(let i=0;i<3;i++)assert.ok(r.hills[i]>r.plains[i],`${l} ${s} scale ${i}: hills ${r.hills[i]} vs plains ${r.plains[i]}`);
    for(let z=-480;z<=480;z+=40)for(let x=-480;x<=480;x+=40)if(provinceAt(g.world.ecology,x,z).baseHabitat==='forest')assert.equal(habitatKindAt(g,x,z),'forest');
    const reg=landformCoherence(g.world).regions;assert.ok(reg.speckledFraction<.03,`speckle ${reg.speckledFraction}`);
    assert.ok(landformLabels(g.world).thresholdMetres>=3);}
});

test('without the option labels are the historic province labels; the option never changes terrain, water or where resources stand (forage species follow the labels)',()=>{
  for(const [s,l] of WORLDS.slice(0,2)){const a=make(s,l),b=make(s,l,{landformLabelVersion:2});
    assert.equal(landformLabelsEnabled(a.world),false);
    for(let z=-480;z<=480;z+=40)for(let x=-480;x<=480;x+=40)assert.equal(habitatKindAt(a,x,z),provinceAt(a.world.ecology,x,z).baseHabitat);
    assert.deepEqual(Array.from(a.world.heights),Array.from(b.world.heights));
    for(const k of ['trees','stones','copper','iron'])assert.deepEqual(a.state[k].map(n=>[n.x,n.z,n.amount]),b.state[k].map(n=>[n.x,n.z,n.amount]),k);
    assert.deepEqual(a.state.forage.map(n=>[n.x,n.z]),b.state.forage.map(n=>[n.x,n.z]),'forage stands in the same places');
    assert.deepEqual(a.world.camps,b.world.camps);assert.deepEqual(a.world.waterBodies,b.world.waterBodies);}
});

test('the option is saved with the world and the reloaded labels match',()=>{
  const g=make(2,'archipelago',{landformLabelVersion:2});g.enterIsland();const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(landformLabelsEnabled(back.world),true);for(let z=-480;z<=480;z+=60)for(let x=-480;x<=480;x+=60)assert.equal(habitatKindAt(back,x,z),habitatKindAt(g,x,z));
});
