import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame} from '../src/game/persistence.ts';
import {applyEngineReadQuery} from '../src/game/engineReadModels.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
import {PRODUCTION_STATIONS} from '../src/game/productionCatalog.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {sitePreparationSurvey} from '../src/game/sitePreparation.ts';
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z)&&!sitePreparationSurvey(g,{x,z,w:BUILDINGS[type].w,d:BUILDINGS[type].d}).clearable.length)return{x,z};}}
test('the production panel read model lists the new Bronze and Iron recipes at their workplaces',()=>{
 const g=decodeGame(nativeDairyVillage().save),home=g.campOf(0);g.tribe(0).age=2;g.state.age=2;
 const want={forge:['castBronze','castBronzeBlades'],kiln:['smeltTin','burnLime'],quarry:['dressStone']};
 for(const [type,recipes] of Object.entries(want)){
  const p=legal(g,type,home);assert.ok(p,type);const b=g.makeBld(type,p.x,p.z,0);g.state.buildings.push(b);g.rebuildWalk();
  const m=applyEngineReadQuery(g,{kind:'recipe-issues',workplaceId:b.id});
  for(const r of recipes){assert.ok(m.issues.some(i=>i.recipe===r),`${r} listed at ${type}`);assert.equal(PRODUCTION_RECIPES[r].workplace,type);}
 }
});
test('catalogue statuses reflect the shipped chains',()=>{
 for(const id of ['station-53','station-64','station-65'])assert.equal(PRODUCTION_STATIONS.find(s=>s.id===id).status,'partial',id);
});
test('the building panel offers facing and production wiring exists in the UI source',()=>{
 const hud=readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8');
 assert.match(hud,/face-building/);
 const pc=readFileSync(new URL('../src/ui/ProductionControls.tsx',import.meta.url),'utf8');
 assert.match(pc,/PRODUCTION_RECIPES/);assert.match(pc,/r\.workplace===b\.type/);
});
