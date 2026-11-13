import test from 'node:test';import assert from 'node:assert/strict';
import {botanicalTree,clearBotanicalCache} from '../src/scene/treeBotany.ts';
import {SPECIES_IDS,VARIANTS_PER_SPECIES} from '../src/scene/botanicalSpecies.ts';
import {HERO_EXTRA_TRIS} from '../src/scene/treeHero.ts';
import {DETAIL_RULES} from '../src/game/detailLevel.ts';
const finite=g=>Object.values(g.attributes).every(a=>Array.from(a.array).every(Number.isFinite));
const bytes=g=>Object.values(g.attributes).map(a=>Array.from(a.array)).flat();
test('hero tier is richer than full, within its cap, finite and rooted for every species and age',()=>{
 for(const id of SPECIES_IDS)for(let v=0;v<VARIANTS_PER_SPECIES;v++){
  const full=botanicalTree(id,v,0),hero=botanicalTree(id,v,2);
  assert.ok(finite(hero.geometry),`${id}/${v} NaN`);
  assert.ok(hero.triangles>full.triangles*1.15,`${id}/${v} hero ${hero.triangles} vs full ${full.triangles}`);
  assert.ok(hero.triangles<=9600,`${id}/${v} hero ${hero.triangles} over the M1 cap`);
  const extra=hero.triangles-full.triangles;assert.ok(extra<=Math.max(...Object.values(HERO_EXTRA_TRIS))+900,`${id}/${v} extra ${extra}`);
  hero.geometry.computeBoundingBox();assert.ok(hero.geometry.boundingBox.min.y>-.35);
  assert.ok(hero.height>=full.height*.98&&hero.height<full.height*1.2+1.4,`${id}/${v} hero height differs`);
 }
});
test('hero geometry is deterministic and leaves the lod 0 tree byte-identical',()=>{
 const a=botanicalTree('oak',1,0),h=botanicalTree('oak',1,2),b0=bytes(a.geometry),bh=bytes(h.geometry);
 clearBotanicalCache();assert.deepEqual(bytes(botanicalTree('oak',1,0).geometry),b0);assert.deepEqual(bytes(botanicalTree('oak',1,2).geometry),bh);clearBotanicalCache();
});
test('hero leaf cards carry fall thresholds, fruit never floats at the origin, and several leaf outlines are used',()=>{
 const g=botanicalTree('oak',0,2).geometry,shed=g.getAttribute('aShed'),uv=g.getAttribute('uv');let never=0,sheds=0;for(const v of shed.array)v<0?never++:sheds++;assert.ok(never>0&&sheds>0);
 const rows=new Set();for(let i=0;i<uv.count;i++)rows.add(Math.floor(uv.getY(i)*3));assert.ok(rows.size>=3,'cards sample the 3 atlas rows (single leaf and lobed tiles)');
 clearBotanicalCache();
});
test('hero budget in detail rules is bounded by level',()=>{
 for(const l of ['standard','high','ultra']){assert.ok(DETAIL_RULES.maxHeroTrees[l]*9600<=1.1e6,`${l} hero triangle ceiling`);}
 assert.ok(DETAIL_RULES.maxHeroTrees.standard<DETAIL_RULES.maxHeroTrees.high&&DETAIL_RULES.maxHeroTrees.high<DETAIL_RULES.maxHeroTrees.ultra);
});
