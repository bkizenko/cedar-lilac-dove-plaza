import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {landValueField,claimSummary,LAND_VALUE_RULES} from '../src/game/landValue.ts';
import {geographicInfluenceReady,geographicInfluenceAt,advanceGeographicInfluence} from '../src/game/influenceField.ts';

function fixture(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.rebuildWalk();return g;}

test('standing finite resources add value and depleting them removes it; water is worthless',()=>{
  const g=fixture(),{n,cellMetres,value}=landValueField(g);
  const node=g.state.iron.find(r=>r.amount>0)??g.state.copper.find(r=>r.amount>0);assert.ok(node);
  const i=Math.floor((node.z+g.world.size/2)/cellMetres)*n+Math.floor((node.x+g.world.size/2)/cellMetres),before=value[i];
  const old=node.amount;node.amount=0;const after=landValueField(g).value[i];node.amount=old;
  assert.ok(before-after>.5,`${before} -> ${after}`);
  let wet=0;for(let k=0;k<n*n;k+=97){const x=-g.world.size/2+((k%n)+.5)*cellMetres,z=-g.world.size/2+(Math.floor(k/n)+.5)*cellMetres;if(g.height(x,z)<g.waterAt(x,z)-1){wet++;assert.equal(value[k],0);}}
  assert.ok(wet>0);
});

test('claims sum owned value and attribute contested cells to every team with influence there',()=>{
  const g=fixture(),camp=g.campOf(0),built=g.makeBld('townhall',camp.x,camp.z,0);g.state.buildings.push(built);g.rebuildWalk();g.state.time=1;
  for(let i=0;i<4000&&!geographicInfluenceReady(g,0);i++)advanceGeographicInfluence(g,performance.now()+i*50);assert.ok(geographicInfluenceReady(g,0));
  const n=Math.round(Math.sqrt(g.territory.length)),cell=g.world.size/n,{value}=landValueField(g);
  const hall=built;assert.ok(g.finished(hall),'a finished source');
  const team=hall.team,ci=Math.floor((hall.z+g.world.size/2)/cell)*n+Math.floor((hall.x+g.world.size/2)/cell);
  assert.ok(geographicInfluenceAt(g,hall.x,hall.z,team)>0);
  const centre=(k)=>({x:-g.world.size/2+((k%n)+.5)*cell,z:-g.world.size/2+(Math.floor(k/n)+.5)*cell});
  const contested=[4,5,6,7,8].map(d=>ci+d*n).find(k=>{const p=centre(k);return geographicInfluenceAt(g,p.x,p.z,team)>0;});assert.ok(contested!==undefined);
  g.territory.fill(LAND_VALUE_RULES.unclaimed);g.territory[ci+1]=team;g.territory[ci+2]=team;g.territory[contested]=LAND_VALUE_RULES.contested;
  const s=claimSummary(g).find(c=>c.team===team);assert.ok(s);
  assert.equal(s.cells,2);assert.ok(Math.abs(s.value-(value[ci+1]+value[ci+2]))<.02);assert.equal(s.contestedCells,1);
  assert.ok(Math.abs(s.areaSquareMetres-2*cell*cell)<1e-6);
});
