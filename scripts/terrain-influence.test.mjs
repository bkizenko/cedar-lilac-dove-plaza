import test from 'node:test';
import assert from 'node:assert/strict';
import {computeTerrainInfluence,emptyLayers,sampleStrength,detectPasses,layersIssue,falloff,TERRAIN_INFLUENCE_RULES as R} from '../src/game/terrainInfluence.ts';
import {influenceGradientModel,gradientAt} from '../src/game/terrainInfluenceView.ts';

const SIZE=400,W=100,CELL=SIZE/W;
const flat=()=>emptyLayers(SIZE,W);
const at=(x,z)=>Math.floor((z+SIZE/2)/CELL)*W+Math.floor((x+SIZE/2)/CELL);
const source=(over={})=>({id:1,team:1,x:-100,z:0,radius:30,strength:1,...over});
const run=(layers,sources=[source()],seed=7)=>computeTerrainInfluence(layers,sources,{seed});
/** Strength sampled at metres east of the source along z=0. */
const east=(f,metres)=>sampleStrength(f,-100+metres,0);

test('flat ground: full core, gradient begins where the old ring ends, no hard edge',()=>{
 const f=run(flat());
 assert.ok(east(f,0)>.999&&east(f,25)>.98,'core is full strength inside the old ring');
 assert.ok(east(f,34)<1&&east(f,34)>0,'gradient starts just past the old ring');
 let previous=1,biggestDrop=0,last=0;
 for(let m=0;m<=140;m+=2){const v=east(f,m);assert.ok(v<=previous+.02,`monotone at ${m}`);biggestDrop=Math.max(biggestDrop,previous-v);previous=v;if(v>R.minimumStrength)last=m;}
 assert.ok(biggestDrop<.1,`no step edge, biggest drop ${biggestDrop}`);
 assert.ok(last>30+R.fadeMeters*.55,'reaches well beyond the old ring (legacy faded over 36 m)');
 assert.ok(east(f,30+R.fadeMeters*1.6)<R.minimumStrength*2,'and still ends');
});

test('deterministic, finite, seed shapes the edge but never the core; JSON round trips',()=>{
 const a=run(flat()),b=run(flat()),c=run(flat(),[source()],99);
 assert.deepEqual(Array.from(a.strength),Array.from(b.strength));
 assert.deepEqual(Array.from(a.cost.map(v=>Number.isFinite(v)?v:-1)),Array.from(b.cost.map(v=>Number.isFinite(v)?v:-1)));
 assert.notDeepEqual(Array.from(a.strength),Array.from(c.strength),'different seed, different edge');
 assert.equal(a.strength[at(-100,0)],c.strength[at(-100,0)]);
 for(const v of a.strength)assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
 const model=influenceGradientModel([{team:1,field:a}]);
 assert.deepEqual(JSON.parse(JSON.stringify(model)),model);
 assert.ok(model.alpha.every(Number.isInteger));
});

test('layer validation reports a malformed grid instead of producing NaN',()=>{
 const bad=flat();bad.forest=new Float32Array(3);
 assert.match(layersIssue(bad),/forest/);
 assert.throws(()=>run(bad));
 assert.equal(falloff(-5,10,.8),.8);
});

test('mountain ridge blocks the wave; a pass lets it through',()=>{
 const wall=flat();
 for(let z=0;z<W;z++)for(let x=0;x<W;x++){const wx=-SIZE/2+(x+.5)*CELL;wall.height[z*W+x]=Math.max(0,60-Math.abs(wx-(-60))*6);}
 const blocked=run(wall);
 assert.ok(sampleStrength(blocked,-30,0)<R.minimumStrength,'behind the ridge there is no influence');
 const throughPass=flat();throughPass.height.set(wall.height);throughPass.pass=new Uint8Array(W*W);
 for(let z=0;z<W;z++)for(let x=0;x<W;x++){
  const i=z*W+x,wz=-SIZE/2+(z+.5)*CELL;
  if(Math.abs(wz)<12){throughPass.height[i]=Math.min(throughPass.height[i],3.5*Math.abs((-SIZE/2+(x+.5)*CELL)+60)/CELL);throughPass.pass[i]=1;}
 }
 const open=run(throughPass);
 assert.ok(sampleStrength(open,-30,0)>R.minimumStrength,'the pass carries influence over the ridge');
 assert.ok(sampleStrength(open,-30,0)<sampleStrength(run(flat()),-30,0),'but slower than open ground');
});

test('canyon: a sheer drop stops influence, a gentle slope only slows it',()=>{
 const canyon=flat();for(let z=0;z<W;z++)for(let x=0;x<W;x++)canyon.height[z*W+x]=(-SIZE/2+(x+.5)*CELL)>-60?-30:0;
 assert.ok(sampleStrength(run(canyon),-40,0)<R.minimumStrength);
 const ramp=flat();for(let z=0;z<W;z++)for(let x=0;x<W;x++)ramp.height[z*W+x]=Math.max(0,(-SIZE/2+(x+.5)*CELL+100)*.12);
 const gentle=east(run(ramp),55),level=east(run(flat()),55);
 assert.ok(gentle>R.minimumStrength&&gentle<level,'slope slows but does not stop');
});

test('open water stops influence without ships; a port with ships carries it across and it is marked shipBorne',()=>{
 const sea=flat();sea.water.fill(0);
 for(let z=0;z<W;z++)for(let x=0;x<W;x++){const wx=-SIZE/2+(x+.5)*CELL;if(wx>-70&&wx<-40)sea.water[z*W+x]=1;}
 const dry=run(sea);
 assert.ok(sampleStrength(dry,-30,0)<R.minimumStrength,'far shore unreached on foot');
 const ships=run(sea,[source({ships:2,shipReachMeters:120})]);
 assert.ok(sampleStrength(ships,-30,0)>R.minimumStrength,'ship crossing extends influence to the far shore');
 assert.equal(ships.byShip[at(-30,0)],1);
 const short=run(sea,[source({ships:2,shipReachMeters:20})]);
 assert.ok(sampleStrength(short,-30,0)<R.minimumStrength,'ships carry influence only as far as their reach');
 const noHull=run(sea,[source({ships:0,shipReachMeters:120})]);
 assert.ok(sampleStrength(noHull,-30,0)<R.minimumStrength,'a port with no ship does not cross');
});

test('big river blocks; ford, bridge and ship each cross it; a stream only slows',()=>{
 const river=(width)=>{const l=flat();l.riverWidth=new Float32Array(W*W);l.water.fill(0);for(let z=0;z<W;z++)for(let x=0;x<W;x++){const wx=-SIZE/2+(x+.5)*CELL;if(Math.abs(wx+60)<=CELL){l.riverWidth[z*W+x]=width;l.water[z*W+x]=1;}}return l;};
 const big=river(14);
 assert.ok(sampleStrength(run(big),-30,0)<R.minimumStrength,'wide river stops it');
 const ford=river(14);ford.ford=new Uint8Array(W*W);for(let z=0;z<W;z++)if(Math.abs(-SIZE/2+(z+.5)*CELL)<10)for(let x=0;x<W;x++)if(ford.riverWidth[z*W+x])ford.ford[z*W+x]=1;
 assert.ok(sampleStrength(run(ford),-30,2)>R.minimumStrength,'ford lets it through at the ford');
 assert.ok(sampleStrength(run(ford),-30,60)<R.minimumStrength,'and nowhere else along the river');
 const bridged=river(14);bridged.bridge=new Uint8Array(W*W);for(let z=0;z<W;z++)if(Math.abs(-SIZE/2+(z+.5)*CELL)<6)for(let x=0;x<W;x++)if(bridged.riverWidth[z*W+x])bridged.bridge[z*W+x]=1;
 assert.ok(sampleStrength(run(bridged),-30,0)>R.minimumStrength,'bridge crosses');
 assert.ok(sampleStrength(run(big,[source({ships:1})]),-30,0)>R.minimumStrength,'a ship crosses a wide river');
 const stream=run(river(3)),open=run(flat());
 assert.ok(sampleStrength(stream,-30,0)>R.minimumStrength&&sampleStrength(stream,-30,0)<sampleStrength(open,-30,0),'a stream slows');
});

test('forest and wetland slow influence; a road through them restores most of the reach',()=>{
 const dense=flat();dense.forest=new Float32Array(W*W).fill(1);
 const marsh=flat();marsh.wetland=new Float32Array(W*W).fill(1);
 const open=east(run(flat()),60),forest=east(run(dense),60),wet=east(run(marsh),60);
 assert.ok(forest<open*.6&&wet<open*.6,`forest ${forest} wet ${wet} open ${open}`);
 const roaded=flat();roaded.forest=dense.forest;roaded.road=new Float32Array(W*W);
 for(let z=0;z<W;z++)if(Math.abs(-SIZE/2+(z+.5)*CELL)<6)for(let x=0;x<W;x++)roaded.road[z*W+x]=1;
 assert.ok(east(run(roaded),60)>forest+.2,'road cuts through the wood');
 assert.ok(sampleStrength(run(roaded),-100+60,0)>=0);
});

test('growth stretches the gradient; rival spheres meet with a soft contested border',()=>{
 const young=run(flat(),[source({growth:0})]),mature=run(flat(),[source({growth:1})]);
 assert.ok(east(mature,120)>east(young,120)+.05);
 const both=computeTerrainInfluence(flat(),[source({id:1,team:1,x:-60}),source({id:2,team:2,x:60})],{seed:3});
 const one=computeTerrainInfluence(flat(),[source({id:1,team:1,x:-60})],{seed:3}),two=computeTerrainInfluence(flat(),[source({id:2,team:2,x:60})],{seed:3});
 const m=influenceGradientModel([{team:1,field:one},{team:2,field:two}]);
 assert.deepEqual(m.teams,[1,2]);
 assert.equal(gradientAt(m,-60,0).team,1);assert.equal(gradientAt(m,60,0).team,2);
 const mid=gradientAt(m,0,0);assert.ok(mid.contest>200,'the border is contested and soft');
 assert.ok(both.strength[at(0,0)]>0);
 assert.equal(influenceGradientModel([]).bounds,null);
});

test('pass detection finds a saddle between two ridges and ignores flat ground',()=>{
 const l=flat();
 for(let z=0;z<W;z++)for(let x=0;x<W;x++){const wx=-SIZE/2+(x+.5)*CELL,wz=-SIZE/2+(z+.5)*CELL;l.height[z*W+x]=20+Math.max(0,30-Math.abs(wz)*.3)+(Math.abs(wx)>40?20:0)*(Math.abs(wz)>40?1:0)+(Math.abs(wx)>8?18:0);}
 const p=detectPasses(l,{lookCells:3,minimumRiseMetres:6,waterLevel:0});
 assert.ok(p.some(v=>v),'at least one saddle');
 assert.ok(!detectPasses(flat()).some(v=>v));
});
