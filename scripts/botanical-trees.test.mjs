import test from 'node:test';import assert from 'node:assert/strict';
import {botanicalTree,botanicalStump,clearBotanicalCache} from '../src/scene/treeBotany.ts';
import {BOTANICAL_SPECIES,SPECIES_IDS,VARIANTS_PER_SPECIES,pickSpecies,pickVariant,speciesWeights,DEFAULT_SITE} from '../src/scene/botanicalSpecies.ts';
import {UNDERSTORY_KINDS,understoryGeometry,instanceGeometry,clearUnderstoryCache} from '../src/scene/botanicalUnderstory.ts';
import {parseTreeSet,resolveTreeSet,DEFAULT_TREE_SET} from '../src/scene/treeSet.ts';

const finite=g=>{for(const a of Object.values(g.attributes))if(!Array.from(a.array).every(Number.isFinite))return false;return true;};
const bytes=g=>Object.values(g.attributes).map(a=>Array.from(a.array)).flat();

test('every species builds finite, rooted geometry inside its triangle budget at both detail tiers',()=>{
 assert.ok(SPECIES_IDS.length>=24);
 for(const id of SPECIES_IDS)for(let v=0;v<VARIANTS_PER_SPECIES;v++){
  const full=botanicalTree(id,v,0),mid=botanicalTree(id,v,1);
  for(const [t,max] of [[full,6500],[mid,1200]]){
   assert.ok(finite(t.geometry),`${id}/${v} has NaN`);assert.ok(t.triangles>50&&t.triangles<=max,`${id}/${v} ${t.triangles} tris`);
   t.geometry.computeBoundingBox();assert.ok(t.geometry.boundingBox.min.y>-0.35,`${id}/${v} sunk ${t.geometry.boundingBox.min.y}`);
   assert.ok(t.height>.5&&t.height<40,`${id} height ${t.height}`);assert.ok(t.trunkRadius>0);
  }
  assert.ok(mid.triangles<full.triangles,`${id}/${v} mid tier must be cheaper`);
 }
});

test('tree geometry is deterministic and shared by cache key',()=>{
 const a=botanicalTree('oak',1,0);assert.equal(botanicalTree('oak',1,0),a);
 const first=bytes(a.geometry);clearBotanicalCache();const b=botanicalTree('oak',1,0);
 assert.notEqual(a,b);assert.deepEqual(bytes(b.geometry),first);
 clearBotanicalCache();
});

test('species differ in silhouette: heights, widths and triangle counts are not all alike',()=>{
 const sig=new Set();
 for(const id of SPECIES_IDS){const t=botanicalTree(id,0,0);sig.add(`${t.triangles}|${t.height.toFixed(1)}|${t.crownHalf.map(v=>v.toFixed(1)).join(',')}`);}
 assert.ok(sig.size>=SPECIES_IDS.length-1);
 const cypress=botanicalTree('cypress',0,0),oak=botanicalTree('oak',0,0);
 assert.ok(cypress.crownHalf[0]/cypress.height<oak.crownHalf[0]/oak.height,'cypress must be narrower than oak');
});

test('leaf cards carry shed thresholds so winter can drop them, wood never sheds',()=>{
 const t=botanicalTree('oak',0,0).geometry;const shed=t.getAttribute('aShed');assert.ok(shed,'aShed');
 let never=0,sheds=0;for(const v of shed.array)v<0?never++:sheds++;assert.ok(never>0&&sheds>0);
 for(const v of shed.array)assert.ok(v<=1.0001);
});

test('site driven species choice is stable, weighted by site and never empty',()=>{
 const wet={...DEFAULT_SITE,moisture:.9,waterDist:3},dry={...DEFAULT_SITE,moisture:.1,temp:6,soil:.2,waterDist:400};
 for(const base of ['broadleaf','conifer','willow','acacia','palm','stunted','scrub']){
  for(const site of [DEFAULT_SITE,wet,dry]){
   const w=speciesWeights(base,'mixed-woodland',site);assert.ok(w.length>0&&w.every(([id,x])=>SPECIES_IDS.includes(id)&&x>=0));
   for(let i=0;i<20;i++){const u=i/20;assert.equal(pickSpecies(base,'mixed-woodland',site,u),pickSpecies(base,'mixed-woodland',site,u));}
  }
 }
 const count=(site)=>{const c={};for(let i=0;i<400;i++){const s=pickSpecies('broadleaf','mixed-woodland',site,(i+.5)/400);c[s]=(c[s]??0)+1;}return c;};
 assert.ok(Object.keys(count(DEFAULT_SITE)).length>=3,'a stand mixes at least three species');
 assert.notDeepEqual(count(wet),count(dry),'site must change the mix');
 for(const s of [.4,1,1.8])assert.ok([0,1,2].includes(pickVariant(s,DEFAULT_SITE,.5)));
});

test('understory kinds are finite, rooted, deterministic and cheap',()=>{
 for(const k of UNDERSTORY_KINDS){
  const g=understoryGeometry(k);assert.ok(finite(g),k);assert.equal(understoryGeometry(k),g);
  const tris=(g.index?g.index.count:g.getAttribute('position').count)/3;assert.ok(tris>0&&tris<=400,`${k} ${tris}`);
  g.computeBoundingBox();assert.ok(g.boundingBox.min.y>-.2,k);assert.ok(g.boundingBox.max.y<3.5,k);
 }
 const first=bytes(understoryGeometry('fern'));clearUnderstoryCache();assert.deepEqual(bytes(understoryGeometry('fern')),first);
 const inst=instanceGeometry(understoryGeometry('fern'),16);assert.equal(inst.getAttribute('iState').count,16);assert.ok(inst.getAttribute('position')===understoryGeometry('fern').getAttribute('position'));
 clearUnderstoryCache();
});

test('stump is finite and low',()=>{const s=botanicalStump();assert.ok(finite(s.geometry??s));});

test('tree set switch defaults to botanical and keeps the old lobed look reachable',()=>{
 assert.equal(DEFAULT_TREE_SET,'botanical');assert.equal(parseTreeSet('lobed'),'lobed');assert.equal(parseTreeSet('nonsense'),null);
 assert.equal(resolveTreeSet('',null),'botanical');assert.equal(resolveTreeSet('?trees=lobed',null),'lobed');
 assert.equal(resolveTreeSet('',"lobed"),'lobed');assert.equal(resolveTreeSet('?trees=botanical','lobed'),'botanical');assert.equal(resolveTreeSet('?trees=zzz','junk'),'botanical');
});
