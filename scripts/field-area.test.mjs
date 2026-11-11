import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {testAction} from '../src/game/testing.ts';
import {planFieldArea,placeFieldArea} from '../src/game/fieldArea.ts';
import {fertilityPreview,fertilityGreenness} from '../src/game/fertilityPreview.ts';
import {fieldTerrain} from '../src/game/fieldTerrain.ts';
import {sampleSite} from '../src/game/siteSample.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

const lab=(seed=0,layout='continents',reveal=true)=>{const g=new Game();g.reset(seed,undefined,{size:1040,layout});g.state.conflict='quiet';g.enterIsland();g.testMode=true;testAction(g,'cultivation');testAction(g,'supplies');g.tribe(0).seeds=500;if(reveal){g.revealMap=true;}g.updateVision(0);return g;};
/** Residents explore for real (no reveal), then each check runs on a save-identical copy. */
const explored=(()=>{let base;return()=>{if(!base){const g=lab(1,'pangaea',false);for(let t=0;t<300;t+=.2)g.step(.2);base=encodeGame(g);}const c=decodeGame(base);c.testMode=true;c.state.paused=false;return c;};})();
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;
/** Find a rolling, dry 60×40 m area near home where the whole plan is admissible. */
function rollingArea(g){const home=g.campOf(0);let best=null;
 for(let r=30;r<220&&!best;r+=10)for(let k=0;k<24;k++){const a={x:home.x+Math.cos(k/24*6.283)*r,z:home.z+Math.sin(k/24*6.283)*r},b={x:a.x+60,z:a.z+40};
  const s=sampleSite(g,{x:a.x+30,z:a.z+20,w:60,d:40});if(s.wetFraction>0||s.heightRangeMetres<3)continue;
  const plan=planFieldArea(g,a,b);if(plan.valid===plan.tiles.length&&plan.tiles.length>1){best={a,b,plan,range:s.heightRangeMetres};break;}}
 return best;}

test('GW-02: a 60×40 m drag over rolling ground plants as adjacent fields covering the drawn area',()=>{
 const g=lab(),area=rollingArea(g);assert.ok(area,'a rolling dry area exists');
 const {plan}=area;assert.ok(plan.tiles.length>=4);
 for(let i=0;i<plan.tiles.length;i++)for(let j=i+1;j<plan.tiles.length;j++)assert.ok(!overlap(plan.tiles[i],plan.tiles[j]),'tiles are disjoint');
 const covered=plan.tiles.reduce((s,t)=>s+t.w*t.d,0);assert.ok(covered>=.85*60*40,`covers ${(covered/2400*100).toFixed(0)}% of the drawn area`);
 const heights=g.world.heights.slice();const placed=placeFieldArea(g,plan);
 assert.equal(placed.length,plan.tiles.length,'every previewed tile commits');
 assert.deepEqual(g.world.heights,heights,'no terrain was flattened');
 console.log(JSON.stringify({fields:placed.length,heightRangeMetres:area.range,coveredSquareMetres:covered}));
});

test('GW-02 audit: each tile preview verdict equals the commit outcome (one validation path), with and without fog',()=>{
 for(const reveal of [true,false]){
  const make=reveal?()=>lab(1,'pangaea',true):explored,probe=make(),home=probe.campOf(0);let accepted=0,refused=0;
  for(const [dx,dz,w,d] of [[-40,-30,70,50],[10,10,30,60],[-80,40,90,26],[25,-60,50,50],[-50,-50,100,100]]){
   const a={x:home.x+dx,z:home.z+dz},b={x:a.x+w,z:a.z+d};
   for(const [i,t] of planFieldArea(probe,a,b).tiles.entries()){
    const g=make();const fresh=planFieldArea(g,a,b).tiles[i];assert.deepEqual(fresh,t,'planning is pure');
    const ok=g.placeBuilding('farm',t.x,t.z,0,{w:t.w,d:t.d});assert.equal(ok,t.issue===null,`tile ${JSON.stringify(t)}`);if(ok)accepted++;else refused++;
   }
  }
  assert.ok(accepted>0&&refused>0,JSON.stringify({reveal,accepted,refused}));
 }
});

test('GW-02: one wet or unexplored tile is refused alone; the admissible rest still commits',()=>{
 const g=explored(),home=g.campOf(0);let plan=null;
 for(let r=10;r<120&&!plan;r+=6)for(let k=0;k<16;k++){const a={x:home.x+Math.cos(k/16*6.283)*r-30,z:home.z+Math.sin(k/16*6.283)*r-30},p=planFieldArea(g,a,{x:a.x+60,z:a.z+60});if(p.valid>0&&p.valid<p.tiles.length){plan=p;break;}}
 assert.ok(plan,'a partly admissible area exists near the camp');
 const placed=placeFieldArea(g,plan);assert.equal(placed.length,plan.valid);
 assert.ok(plan.tiles.filter(t=>t.issue).every(t=>/Explore|wet|steep|water|shore|Too close|Clear/.test(t.issue)));
});

test('GW-10: fertility preview uses the harvest terrain numbers and hides unexplored cells',()=>{
 const g=lab(0,'continents',false),home=g.campOf(0);
 const near=fertilityPreview(g,{x:home.x+2,z:home.z+2,w:8.2,d:8.2});
 const t=fieldTerrain(g,{type:'farm',x:home.x+2,z:home.z+2,w:8.2,d:8.2});
 assert.equal(near.state,'complete');assert.equal(near.summary.soil,t.soil);assert.equal(near.summary.grainYieldFactor,t.grain);
 assert.equal(near.columns*near.rows,near.cells.length);
 for(const c of near.cells){assert.ok(c);assert.ok(c.greenness>=0&&c.greenness<=1);assert.equal(c.greenness,fertilityGreenness(c.soil,c.crops));}
});

test('GW-10 review: an all-hidden plot reports unknown with no summary; mixed visibility summarises only explored cells',()=>{
 const g=lab(0,'continents',false),home=g.campOf(0);
 const far=fertilityPreview(g,{x:home.x+300,z:home.z+300,w:16,d:16});
 assert.equal(far.state,'unknown');assert.equal(far.summary,null);assert.equal(far.exploredFraction,0);assert.ok(far.cells.every(c=>c===null),'no terrain leak in fog');
 // A plot straddling the fog edge.
 let mixed=null;for(let r=10;r<60&&!mixed;r+=2){const p=fertilityPreview(g,{x:home.x+r,z:home.z,w:24.6,d:8.2});if(p.exploredFraction>0&&p.exploredFraction<1)mixed=p;}
 assert.ok(mixed,'a plot straddles explored and unexplored ground');assert.equal(mixed.state,'partial');
 const known=mixed.cells.filter(Boolean);assert.ok(known.length&&known.length<mixed.cells.length);
 const soil=known.reduce((a,c)=>a+c.soil,0)/known.length;assert.ok(Math.abs(mixed.summary.soil-soil)<1e-12,'summary = explored cells only');
});
