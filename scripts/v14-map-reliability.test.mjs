import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';import {openingCampSurvey,openingWaterSurvey} from '../src/game/openingWater.ts';import {waterCollectionIssue} from '../src/game/survivalNeeds.ts';import {provinceAt,ecologicalConditionsAt,PROVINCE_KINDS} from '../src/game/ecologicalProvinces.ts';import {climateAt,soilQuality,droughtWaterPotential,habitatAt} from '../src/game/ecology.ts';import {MULTILAND_GEOMETRY_GATES} from '../src/game/multipleLandmasses.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const hash=w=>createHash('sha256').update(JSON.stringify(w,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)).digest('hex');
function ecologyAudit(g){
 const w=g.world,e=w.ecology,counts=Object.fromEntries(PROVINCE_KINDS.map(kind=>[kind,{tree:0,forage:0,stone:0,copper:0,iron:0}]));
 const minimum=Math.max(6000,e.metrics.landAreaSquareMeters*.03),seen=new Uint8Array(e.kinds.length),largest=new Int32Array(8);
 for(let id=0;id<e.kinds.length;id++){if(e.kinds[id]>=8||seen[id])continue;const kind=e.kinds[id],q=[id];seen[id]=1;for(let j=0;j<q.length;j++){const at=q[j],x=at%e.width,z=Math.floor(at/e.width);for(const n of [x?at-1:-1,x<e.width-1?at+1:-1,z?at-e.width:-1,z<e.width-1?at+e.width:-1])if(n>=0&&!seen[n]&&e.kinds[n]===kind){seen[n]=1;q.push(n);}}largest[kind]=Math.max(largest[kind],q.length);}
 for(let i=0;i<8;i++){assert.ok(largest[i]*e.cellMeters**2>=minimum-1e-5);assert.ok(Math.abs(largest[i]*e.cellMeters**2-e.metrics.regions[i].largestConnectedAreaSquareMeters)<1e-5);}
 for(const [kind,list]of [['tree',g.state.trees],['forage',g.state.forage],['stone',g.state.stones],['copper',g.state.copper],['iron',g.state.iron]])for(const n of list){counts[provinceAt(e,n.x,n.z).kind][kind]++;assert.ok(Number.isFinite(n.amount)&&n.amount>=0&&n.maxAmt>0);assert.equal(n.y,g.height(n.x,n.z));}
 const generatedCounts=Object.fromEntries(PROVINCE_KINDS.map(kind=>[kind,{tree:0,forage:0,stone:0,copper:0,iron:0}]));
 for(const [kind,list]of [['tree',w.trees],['forage',w.forage],['stone',w.stones],['copper',w.copper],['iron',w.iron]])for(const n of list)generatedCounts[provinceAt(e,n.x,n.z).kind][kind]++;
 for(const r of w.ecologyResourceMetrics)for(const kind of ['tree','forage','stone','copper','iron'])assert.equal(generatedCounts[r.kind][kind],r[kind],'generation metrics must count generated nodes; Game adds real finite camp supplies afterward');
 for(const row of Object.values(counts)){assert.ok(row.tree>=5);assert.ok(row.forage>=5);assert.ok(row.stone>=3);assert.ok(row.copper>=1);assert.ok(row.iron>=1);}
 let boundaries=0,maxSoilJump=0,maxMoistureJump=0,maxTemperatureJump=0;const means=Object.fromEntries(PROVINCE_KINDS.map(k=>[k,{n:0,soil:0,humidity:0,temperature:0,drought:0}]));
 for(let id=0;id<e.kinds.length;id++){
  if(e.kinds[id]>=8)continue;const ix=id%e.width,iz=Math.floor(id/e.width),x=(ix+.5)*e.cellMeters-w.size/2,z=(iz+.5)*e.cellMeters-w.size/2,p=ecologicalConditionsAt(e,x,z),kind=PROVINCE_KINDS[e.kinds[id]],m=means[kind],c=climateAt(g,x,z,0,'clear');assert.equal(habitatAt(g,x,z).kind,kind);assert.ok(p.soil>=0&&p.soil<=1&&p.moisture>=0&&p.moisture<=1);m.n++;m.soil+=soilQuality(g,x,z);m.humidity+=c.humidity;m.temperature+=c.temperature;m.drought+=droughtWaterPotential(g,x,z);
  for(const [nx,nz]of [[ix+1,iz],[ix,iz+1]]){if(nx>=e.width||nz>=e.width)continue;const other=nz*e.width+nx;if(e.kinds[other]>=8||e.kinds[other]===e.kinds[id])continue;const bx=x+(nx-ix)*e.cellMeters/2,bz=z+(nz-iz)*e.cellMeters/2,dx=(nx-ix)*.001,dz=(nz-iz)*.001,a=ecologicalConditionsAt(e,bx-dx,bz-dz),b=ecologicalConditionsAt(e,bx+dx,bz+dz);boundaries++;maxSoilJump=Math.max(maxSoilJump,Math.abs(a.soil-b.soil));maxMoistureJump=Math.max(maxMoistureJump,Math.abs(a.moisture-b.moisture));maxTemperatureJump=Math.max(maxTemperatureJump,Math.abs(a.temperatureOffsetCelsius-b.temperatureOffsetCelsius));}
 }
 assert.ok(boundaries>0);assert.ok(maxSoilJump<.001);assert.ok(maxMoistureJump<.001);assert.ok(maxTemperatureJump<.01);
 for(const m of Object.values(means))for(const k of ['soil','humidity','temperature','drought'])m[k]/=m.n;
 assert.ok(means.wetland.humidity>means.arid.humidity+.4);assert.ok(means.wetland.soil>means.arid.soil+.3);assert.ok(means.wetland.drought>means.arid.drought+.25);assert.ok(means['warm-coast'].temperature>means.alpine.temperature+8);
 const density=Object.fromEntries(e.metrics.regions.map(r=>[r.kind,counts[r.kind].tree/r.areaSquareMeters*10000]));
 return{minimumConnectedArea:minimum,counts,generatedCounts,actualTreesPerHectare:density,boundaries,maxSoilJump,maxMoistureJump,maxTemperatureJump,means};
}
const cases=[[42,1040,'random'],[42,1560,'random'],[1,1040,'random'],[42,1040,'continents'],[42,1040,'pangaea'],[42,1040,'archipelago'],[123456,1560,'continents'],[9876,2080,'archipelago']];
for(const [seed,size,layout]of cases)test(`actual V14 reliability and ecological functions ${seed}/${size}/${layout}`,()=>{
 const start=performance.now(),g=new Game();g.reset(seed,14,{size,layout});const w=g.world,home=g.campOf(0),terrain={height:(x,z)=>g.height(x,z),water:(x,z)=>g.waterAt(x,z)};
 assert.equal(openingCampSurvey(terrain,home).valid,true);assert.equal(g.dryFoundation('townhall',home.x,home.z,1),true);assert.equal(w.scenery.playerAboveAverage,true);assert.equal(waterCollectionIssue(g),null);assert.ok(w.camps.length>=3);
 for(const c of w.camps)assert.ok(g.dryFoundation('townhall',c.x,c.z,1));for(const p of g.state.units.filter(u=>u.team===0))assert.ok(g.walkable(p.x,p.z)&&g.workBoard.connected(g,p.x,p.z,home.x,home.z));
 for(const [key,min]of Object.entries(MULTILAND_GEOMETRY_GATES))assert.ok(w.landscape.regionalGeometry.some(r=>r.geometry[key]>=min),key);
 if(seed===42&&size===1040&&layout==='random'){assert.ok(w.settlementFallback.originalBroadSiteCount<3);assert.ok(w.settlementFallback.compactSiteCount>=3);assert.equal(hash(decodeGame(encodeGame(g)).world),hash(w));assert.ok(g.placementValid('townhall',home.x,home.z),'recovered opening must allow the real first hall at its anchor');}
 if(seed===42&&size===1560)assert.equal(hash(w),'d3f10b14a820d86fda0a782a6f51eacde3bb2c43e408c2c1f0f8fd1de150a05f');
 if(seed===1&&layout==='random')assert.equal(hash(w),'fd4da1f601c7565dbc16e30a0920ac48c2cefcdcf5bff1108c44a3339f5fe8ba');
 const ecology=ecologyAudit(g);console.log(JSON.stringify({seed,size,layout,mode:w.variety.mode,fallback:w.settlementFallback??null,milliseconds:performance.now()-start,home,ecology}));
});

test('connected approach survey rejects water gaps even when route endpoints are dry',()=>{const common={size:1040,water:()=>0,rivers:[],waterBodies:[]};assert.deepEqual(openingWaterSurvey({...common,height:()=>10}).approachesAt({x:0,z:0}),{near:24,outer:24});const annulus=(x,z)=>{const r=Math.hypot(x,z);return r>10&&r<16?-1:10;};assert.deepEqual(openingWaterSurvey({...common,height:annulus}).approachesAt({x:0,z:0}),{near:0,outer:0});});
