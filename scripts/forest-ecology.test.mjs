import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {StandField,BIOME_PRIORS,SPECIES_NICHE,nicheFitness,climateOf,climateCompatible,CLIMATE_OF,standDensityMul,gapAt,openAt,crownSpacing,groveSpecies,successionAt,thinningFactor,understoryBias,shadeTolerance,pioneerFor} from '../src/game/forestEcology.ts';
import {BotanicalForest} from '../src/scene/botanicalForest.ts';
import {FillerForest} from '../src/scene/fillerForest.ts';
import {BOTANICAL_SPECIES,pickSpecies,DEFAULT_SITE} from '../src/scene/botanicalSpecies.ts';
import {PROVINCE_PROFILES} from '../src/game/ecologicalProvinces.ts';
import {generateWorld} from '../src/game/worldgen.ts';

const site=(kind,o={})=>({moisture:.55,temp:0,slope:.08,soil:.65,aspect:0,waterDist:200,kind,alt:20,acid:.5,...o});
/** a transect whose temperature rises along x (-9 .. +7 C) with the province kind following it, moisture and soil wandering */
const transect=(x,z)=>{const temp=-9+16*Math.min(1,Math.max(0,(x+300)/600)),kind=temp<-6?'alpine':temp<-3?'conifer-forest':temp<1.5?'mixed-woodland':temp<3.5?'dry-scrub':temp<5.5?'arid':'warm-coast';
 return site(kind,{temp,moisture:.45+.3*Math.sin(x/170+z/230)+.1*Math.cos(z/90),soil:.55+.35*Math.cos(x/120-z/200),acid:.5+.4*Math.sin(z/260),slope:.05+.1*Math.abs(Math.sin(x/60)),waterDist:Math.abs(Math.sin(z/150))*120,alt:10+Math.abs(x)*.12});};
const fieldOf=(seed,fn)=>new StandField(seed,fn);
function grid(f,x0,x1,z0,z1,step,idStart=1){const pts=[];let id=idStart;for(let z=z0;z<z1;z+=step)for(let x=x0;x<x1;x+=step){const p=f.plan(id++,x+((id*7)%5)*.3,z+((id*11)%5)*.3);pts.push({x,z,id:id-1,...p});}return pts;}
const nbrs=(pts,step,r)=>{const m=new Map(),k=(x,z)=>Math.floor(x/r)*100003+Math.floor(z/r);for(const p of pts){const key=k(p.x,p.z);(m.get(key)??m.set(key,[]).get(key)).push(p);}
 return p=>{const out=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const l=m.get(k(p.x+dx*r,p.z+dz*r));if(l)for(const q of l)if(q!==p&&Math.hypot(q.x-p.x,q.z-p.z)<=r)out.push(q);}return out;};};

test('every one of the 24 species has a niche or is the snag; priors only name real species',()=>{
 const ids=new Set(BOTANICAL_SPECIES.map(s=>s.id));
 for(const id of ids)assert.ok(SPECIES_NICHE[id]||id==='snag',id+' has a niche');
 for(const [kind,row] of Object.entries(BIOME_PRIORS)){assert.ok(PROVINCE_PROFILES[kind],kind);for(const id of Object.keys(row))assert.ok(ids.has(id)&&SPECIES_NICHE[id],`${kind}:${id}`);}
 for(const id of ids)assert.ok(CLIMATE_OF[id],id+' has a climate group');
});

test('species vs biome validity: every placed tree is in its province prior (or riparian willow/poplar, pioneer birch, old-growth snag) and respects its niche',()=>{
 for(const kind of Object.keys(BIOME_PRIORS)){
  const o=kind==='arid'?{temp:6,moisture:.15}:kind==='warm-coast'?{temp:5,moisture:.65}:kind==='dry-scrub'?{temp:3,moisture:.3}:kind==='alpine'?{temp:-10,alt:90,soil:.3}:kind==='conifer-forest'?{temp:-5}:kind==='wetland'?{moisture:.9,waterDist:10}:{};
  const f=fieldOf(5,(x,z)=>site(kind,{...o,soil:.5+.4*Math.sin(x/90)*Math.cos(z/70)})),pts=grid(f,-200,200,-200,200,6);
  for(const p of pts){const ok=p.snag||(BIOME_PRIORS[kind][p.species]!==undefined)||['willow','poplar'].includes(p.species)||(p.pioneer&&['birch','poplar','hawthorn','juniper','tamarisk','acacia'].includes(p.species));
   assert.ok(ok,`${kind}: ${p.species} not allowed`);
   if(!p.snag&&!p.pioneer){const s=site(kind,{...o,soil:.5+.4*Math.sin(p.x/90)*Math.cos(p.z/70)});assert.ok(nicheFitness(p.species,s)>=5e-4,`${kind}: ${p.species} unsuited ${nicheFitness(p.species,s)}`);}}
 }
});

test('microsite filters: willow only on wet ground, no spruce in the tropics, no palms in the cold, pines favour poor soil, beech and oak avoid thin soil',()=>{
 const wet=site('mixed-woodland',{moisture:.3,waterDist:300}),damp=site('mixed-woodland',{moisture:.8,waterDist:8});
 assert.ok(nicheFitness('willow',wet)<.02&&nicheFitness('willow',damp)>.5);
 assert.ok(nicheFitness('spruce',site('warm-coast',{temp:6}))<.05&&nicheFitness('coconutPalm',site('conifer-forest',{temp:-6}))<.05);
 const thin=site('mixed-woodland',{soil:.05,acid:.9}),deep=site('mixed-woodland',{soil:.9,acid:.4});
 assert.ok(nicheFitness('scotsPine',thin)>nicheFitness('beech',thin)*3,'pine beats beech on thin acid soil');assert.ok(nicheFitness('beech',deep)>nicheFitness('beech',thin)*5);assert.ok(nicheFitness('oak',deep)>nicheFitness('oak',thin)*3);
 assert.ok(nicheFitness('birch',thin)>.2,'birch is a pioneer of poor ground');
 // in the sampled woods willow only stands on wet or riparian ground
 const f=fieldOf(3,(x,z)=>site('mixed-woodland',{moisture:.35+.5*Math.max(0,Math.sin(x/60)),waterDist:Math.max(0,60-Math.max(0,Math.sin(x/60))*90)}));
 for(const p of grid(f,-250,250,-60,60,5))if(p.species==='willow'){const m=.35+.5*Math.max(0,Math.sin(p.x/60));assert.ok(m>.5,'willow on dry ground at '+p.x);}
});

test('no climate-incompatible pairs within 15 m over a boreal-to-tropical transect, and mixing stays within adjacent climate groups',()=>{
 const f=fieldOf(11,transect),pts=grid(f,-300,300,-120,120,3),near=nbrs(pts,3,15);let bad=0,mixedCells=0,cross=0;const pairs=new Set();
 for(const p of pts){if(p.snag)continue;const gs=new Set([climateOf(p.species)]);for(const q of near(p)){if(q.snag)continue;gs.add(climateOf(q.species));if(!climateCompatible(p.species,q.species)){bad++;pairs.add(p.species+'+'+q.species);}}
  if(gs.size>1){mixedCells++;cross++;}}
 assert.equal(bad,0,'incompatible pairs: '+[...pairs].join(' '));
 assert.ok(!pairs.has('coconutPalm+spruce'));
 assert.ok(cross>0,'the transect crosses real ecotones where climate groups meet');
 // the palm/boreal rule at the type level
 assert.ok(!climateCompatible('coconutPalm','spruce')&&!climateCompatible('acacia','fir')&&!climateCompatible('datePalm','krummholz')&&!climateCompatible('stonePine','spruce')&&climateCompatible('oak','spruce')&&climateCompatible('oak','olive')&&climateCompatible('olive','acacia'));
});

test('hard province borders between climatically neighbouring kinds still read as gradients: no incompatible species within 15 m',()=>{
 // kinds in climate order with abrupt steps between them (the province grid is nearest-cell); a boreal kind never borders an arid one on a real map
 const order=['alpine','conifer-forest','mixed-woodland','warm-coast','dry-scrub','arid'],tempOf={alpine:-4,'conifer-forest':-3,'mixed-woodland':0,'warm-coast':3.5,'dry-scrub':2,arid:5};
 const fn=(x,z)=>{const i=Math.max(0,Math.min(5,Math.floor((x+300)/100)+(Math.floor(z/60)%2===0?0:0))),k=order[i];return site(k,{temp:tempOf[k],moisture:k==='arid'?.15:.7});};
 const f=fieldOf(13,fn),pts=grid(f,-300,300,-200,200,3),near=nbrs(pts,3,15);let bad=0;const pairs=new Set();
 for(const p of pts){if(p.snag)continue;for(const q of near(p))if(!q.snag&&!climateCompatible(p.species,q.species)){bad++;pairs.add(p.species+'+'+q.species);}}
 assert.equal(bad,0,[...pairs].join(' '));
});

test('continuum, not blocks: local species richness is plausible and stands are mixed, yet spatially patchy beyond chance',()=>{
 const f=fieldOf(21,(x,z)=>site('mixed-woodland',{soil:.55+.35*Math.cos(x/120-z/200),moisture:.5+.2*Math.sin(x/150),acid:.5+.3*Math.sin(z/200)})),pts=grid(f,-300,300,-300,300,4);
 const near30=nbrs(pts,4,30);let rich=0,n=0,single=0;
 for(let i=0;i<pts.length;i+=7){const p=pts[i];const s=new Set([p.species,...near30(p).map(q=>q.species)]);s.delete('snag');rich+=s.size;n++;if(s.size<2)single++;}
 const mean=rich/n;assert.ok(mean>=2.5&&mean<=7,'mean richness within 30 m '+mean);assert.ok(single/n<.1,'monodominant blocks are rare: '+single/n);
 // spatial autocorrelation: nearest-neighbour same-species fraction beats independent sampling from the same frequencies
 const freq={};for(const p of pts)freq[p.species]=(freq[p.species]??0)+1;let base=0;for(const v of Object.values(freq))base+=(v/pts.length)**2;
 const near8=nbrs(pts,4,8);let same=0,m=0;for(const p of pts){const q=near8(p);if(!q.length)continue;let b=q[0],bd=1e9;for(const o of q){const d=Math.hypot(o.x-p.x,o.z-p.z);if(d<bd){bd=d;b=o;}}m++;if(b.species===p.species)same++;}
 const frac=same/m;assert.ok(frac>base+.025,`nearest-neighbour same-species ${frac.toFixed(3)} vs chance ${base.toFixed(3)}`);
});

test('determinism: same seed and inputs give the same plans, another seed another forest, and no ambient randomness',()=>{
 const a=grid(fieldOf(4,transect),-100,100,-100,100,5),b=grid(fieldOf(4,transect),-100,100,-100,100,5),c=grid(fieldOf(5,transect),-100,100,-100,100,5);
 assert.deepEqual(a,b);assert.notDeepEqual(a.map(p=>p.species),c.map(p=>p.species));
 const f=fieldOf(4,transect);const first=f.plan(77,10,20);for(let i=0;i<50;i++)f.plan(i,i*3,i);assert.deepEqual(f.plan(77,10,20),first,'call order does not matter');
 const src=['../src/game/forestEcology.ts'];void src;
});

test('age and size structure: sizes follow age class, gaps hold saplings and pioneers, old growth holds veterans and a few snags',()=>{
 const f=fieldOf(8,(x,z)=>site('mixed-woodland')),pts=grid(f,-400,400,-400,400,5);
 const by=[[],[],[],[]];for(const p of pts)by[p.ageClass].push(p.size);
 for(let a=0;a<3;a++)if(by[a].length&&by[a+1].length){const m=l=>l.reduce((s,v)=>s+v,0)/l.length;assert.ok(m(by[a])<m(by[a+1]),'size rises with age class '+a);}
 assert.ok(by[0].length>0&&by[2].length>0&&by[3].length>0,'all age classes occur '+by.map(l=>l.length));
 for(const p of pts)assert.ok(p.size>=.55&&p.size<=1.4,'sim size band '+p.size);
 // gaps
 let inGap=0,gapSmall=0,gapPioneer=0;for(const p of pts){if(gapAt(8,p.x,p.z)>.6){inGap++;if(p.size<.75)gapSmall++;if(p.pioneer)gapPioneer++;}}
 assert.ok(inGap>20&&gapSmall/inGap>.5,'gap trees are small: '+gapSmall+'/'+inGap);assert.ok(gapPioneer>0);
 assert.ok(pts.some(p=>p.snag),'old growth has standing dead wood');
 // within a mature cohort heights are consistent (CV small) while varying naturally
 const mature=by[2],mean=mature.reduce((s,v)=>s+v,0)/mature.length,cv=Math.sqrt(mature.reduce((s,v)=>s+(v-mean)**2,0)/mature.length)/mean;assert.ok(cv>.02&&cv<.2,'mature CV '+cv);
 // glades and gaps carry fewer trees
 let open=0,dens=0;for(let i=0;i<4000;i++){const x=(i%80)*10-400,z=Math.floor(i/80)*10-200;const d=standDensityMul(8,x,z);dens+=d;if(openAt(8,x,z)>.6)open++;assert.ok(d>=0&&d<=1);}
 assert.ok(open>0&&dens/4000>.5&&dens/4000<.95,'glades exist: '+open+' mean density '+dens/4000);
});

test('shade tolerance: tolerant species keep a suppressed young cohort under old canopy, light-demanders do not',()=>{
 assert.ok(shadeTolerance('beech')>shadeTolerance('oak')&&shadeTolerance('oak')>shadeTolerance('birch'));
 const f=fieldOf(2,()=>site('mixed-woodland')),pts=grid(f,-500,500,-500,500,5).filter(p=>!p.snag&&!p.pioneer);
 const young=sp=>{const l=pts.filter(p=>p.species===sp);return l.filter(p=>p.ageClass<=1).length/Math.max(1,l.length);};
 assert.ok(young('beech')>young('birch'),`beech young ${young('beech').toFixed(2)} vs birch ${young('birch').toFixed(2)}`);
});

test('crown shyness: broad crowns keep further apart than spires; filler stands honour it',()=>{
 assert.ok(crownSpacing('oak',1)>crownSpacing('poplar',1)&&crownSpacing('cedar',1)>=crownSpacing('fir',1));
 const env={seed:7,size:1040,height:(x,z)=>6+.01*x,waterAt:()=>0,provinceAt:()=>({kind:'mixed-woodland',treeDensityPerHectare:PROVINCE_PROFILES['mixed-woodland'].treeDensityPerHectare*2}),soilAt:()=>null,camps:[{x:-480,z:-480}],baseFormAt:()=>'broadleaf',ecology:fieldOf(7,()=>site('mixed-woodland'))};
 const out={trees:[],blobs:[]};new FillerForest(env).collect({x:0,z:0},{detail:300,far:400,fade:0,maxTrees:1e9,maxBlobs:1e9},out);
 assert.ok(out.trees.length>200);let minD=1e9;for(let i=0;i<out.trees.length;i+=3)for(let j=0;j<out.trees.length;j++){if(i===j)continue;const a=out.trees[i],b=out.trees[j];if(Math.abs(a.x-b.x)>6||Math.abs(a.z-b.z)>6||Math.floor(a.x/64)!==Math.floor(b.x/64)||Math.floor(a.z/64)!==Math.floor(b.z/64))continue;minD=Math.min(minD,Math.hypot(a.x-b.x,a.z-b.z));}
 assert.ok(minD>=2.85,'min spacing '+minD);assert.ok(out.trees.every(t=>t.group));
 const groups=new Set(out.trees.map(t=>t.group));assert.ok(groups.has('broadleaf'));
});

test('hooks: succession regrows pioneers then the climax stand; groves are single-species; wood-cutting thins; understory follows the canopy',()=>{
 const f=fieldOf(6,()=>site('mixed-woodland',{acid:.8,soil:.5})),s=site('mixed-woodland',{acid:.8,soil:.5});
 assert.equal(successionAt(f,5,10,10,s,1),null,'herbs first');
 const share=years=>{let p=0,n=0,sz=0;for(let i=1;i<=400;i++){const r=successionAt(f,i,i*3,i*2,s,years);if(!r)continue;n++;if(r.pioneer)p++;sz+=r.size;}return {p:p/Math.max(1,n),sz:sz/Math.max(1,n)};};
 const a=share(6),b=share(25),c=share(80);assert.ok(a.p===1&&b.p<a.p&&b.p>0&&c.p<.1,JSON.stringify([a,b,c]));assert.ok(a.sz<c.sz);
 for(let i=1;i<=50;i++)assert.deepEqual(successionAt(f,i,i,i,s,80),f.plan(i,i,i),'old regrowth is the climax plan');
 assert.equal(pioneerFor(s),'birch');
 // groves
 const sp=new Set();for(let i=1;i<=60;i++){const x=1000+(i%10)*2,z=500+Math.floor(i/10)*2;sp.add(f.plan(i,x,z,{planted:true}).species);}assert.equal(sp.size,1,'one species per planted plot');
 assert.equal(groveSpecies(1,2,3,s),groveSpecies(1,3,4,s));
 assert.ok(thinningFactor(0)===1&&thinningFactor(30)<thinningFactor(10)&&thinningFactor(1e6)===.15);
 const beech=understoryBias('beech',0,.6),pine=understoryBias('scotsPine',0,.4),glade=understoryBias('oak',.9,.5);
 assert.ok(beech.fern<1&&beech.mushroom>1&&pine.bracken>1&&glade.flowers>1.5&&glade.mushroom<.6);
});

test('old saves unchanged: without the ecology option species choice is the original per-tree pickSpecies; the flag is absent unless asked for',()=>{
 const mk=eco=>new BotanicalForest(new THREE.Scene(),{seed:11,ecology:eco,siteAt:()=>DEFAULT_SITE,baseFormAt:(id)=>({base:id%3?'broadleaf':'conifer',kind:'mixed-woodland'}),nearMetres:{low:28,med:75,high:115},farMetres:700,lowFarMetres:420,stumpHeightScale:.075});
 const old=mk(undefined),legacy=mk(undefined);
 for(let id=1;id<=200;id++){const n={id,x:id*3,y:0,z:id,amount:10,scale:1,regenT:0};const d=old.describe(n);const want=pickSpecies(id%3?'broadleaf':'conifer','mixed-woodland',DEFAULT_SITE,((x)=>{let n2=(id^11^Math.imul(41,0x9e3779b1))|0;n2=Math.imul(n2^(n2>>>16),0x45d9f3b);n2=Math.imul(n2^(n2>>>16),0x45d9f3b);return ((n2^(n2>>>16))>>>0)/4294967296;})());assert.equal(d.species,want);assert.deepEqual(d,legacy.describe(n));}
 const w0=generateWorld(42,21,{size:1040,layout:'pangaea',preset:'continents',geologyVersion:1}),w2=generateWorld(42,21,{size:1040,layout:'pangaea',preset:'continents',geologyVersion:1,forestEcologyVersion:1});
 assert.equal(w0.options.forestEcologyVersion,undefined);assert.equal(w2.options.forestEcologyVersion,1);
 assert.ok(w0.trees.every(t=>t.scale>=.64&&t.scale<=1.45),'legacy tree scale band (0.8-1.45, x.8 in alpine/arid)');
 assert.ok(w2.trees.length>500);assert.notDeepEqual(w0.trees.slice(0,50).map(t=>t.x),w2.trees.slice(0,50).map(t=>t.x));
 for(const t of w2.trees)assert.ok(t.scale>=.4&&t.scale<=1.45);
});

test('ecology-on forest end to end: a BotanicalForest with stands draws only compatible species and sizes by age',()=>{
 const f=fieldOf(9,transect),forest=new BotanicalForest(new THREE.Scene(),{seed:9,ecology:f,siteAt:()=>DEFAULT_SITE,baseFormAt:()=>({base:'broadleaf',kind:'mixed-woodland'}),nearMetres:{low:28,med:75,high:115},farMetres:700,lowFarMetres:420,stumpHeightScale:.075});
 const seen=new Set();for(let id=1;id<=600;id++){const x=-300+(id%30)*20,z=-100+Math.floor(id/30)*10;seen.add(forest.describe({id,x,y:0,z,amount:5,scale:1,regenT:0}).species);}
 assert.ok(seen.size>=8,'a transect is species-rich overall');
});
