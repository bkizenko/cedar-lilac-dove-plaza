import {createHash} from 'node:crypto';import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {BUILD_ORDER,BUILDINGS} from '../src/game/constants.ts';
import {PRODUCTION_ROLES,productionCatalogue,catalogueBuildingId} from '../src/game/productionCatalog.ts';
import {productionWorkplaceGeos} from '../src/scene/productionWorkplaces.ts';
test('catalogue covers every actual structure and all proposed production dependencies without mutating the world',()=>{
 const g=new Game();g.reset(42,13,{size:1040,layout:'continents'});g.state.buildings=[];const b=g.makeBld('hut',0,0,0);g.state.buildings.push(b);const before=JSON.stringify(g.state),r=productionCatalogue(g);
 assert.deepEqual(r.buildings.map(x=>x.id),BUILD_ORDER);assert.ok(PRODUCTION_ROLES.length>=22);assert.equal(new Set(PRODUCTION_ROLES.map(x=>x.id)).size,PRODUCTION_ROLES.length);assert.ok(PRODUCTION_ROLES.every(x=>x.inputs.length&&x.outputs.length&&x.work&&x.capacity&&x.needs.length&&x.gap));
 assert.equal(r.buildings.find(x=>x.id==='hut').complete,1);assert.equal(JSON.stringify(g.state),before);assert.equal(catalogueBuildingId('notARealBuilding'),null);
 const pottery=r.roles.find(x=>x.id==='pottery');assert.equal(pottery.status,'partial');assert.equal(pottery.registered,true);assert.equal(pottery.activeRecipes.length,6);
});
test('availability responds to actual age, stock and incomplete sites rather than labels',()=>{
 const g=new Game();g.reset(42,13,{size:1040,layout:'continents'});const t=g.tribe(0);t.age=0;t.wood=0;t.stone=0;
 let r=productionCatalogue(g);assert.ok(r.buildings.find(x=>x.id==='hut').blockers.some(x=>x.includes('logs')));assert.ok(r.buildings.find(x=>x.id==='university').blockers.some(x=>x.includes('Requires')));
 const b=g.makeBld('hut',0,0,0);b.build=.4;g.state.buildings.push(b);t.wood=100;r=productionCatalogue(g);assert.equal(r.buildings.find(x=>x.id==='hut').blockers.length,0);assert.equal(r.buildings.find(x=>x.id==='hut').unfinished,1);assert.ok(r.buildings.find(x=>x.id==='hut').siteStates.some(x=>x.includes('40%')));
});
test('eleven workplaces have distinct nonempty bounded geometry without fake ingredient meshes or permanent fire',()=>{
 const gs=productionWorkplaceGeos();assert.deepEqual(Object.keys(gs).sort(),['hearth','butcher','dryrack','tanner','tailor','grindingStone','oven','smokehouse','potter','kiln','fibreWorkshop'].sort());const shapes=[];
 for(const [id,g]of Object.entries(gs)){assert.ok(g.timber.attributes.position.count>0);for(const part of [g.timber,g.roof,g.extra].filter(Boolean)){part.computeBoundingBox();const size=part.boundingBox.getSize({set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},subVectors(a,b){return this.set(a.x-b.x,a.y-b.y,a.z-b.z);}});assert.ok(size.x<6&&size.y<4&&size.z<6,id);}shapes.push(createHash('sha256').update(Buffer.from(g.timber.attributes.position.array.buffer)).digest('hex'));Object.values(g).filter(v=>v?.dispose).forEach(v=>v.dispose());}assert.equal(new Set(shapes).size,11);
});

test('catalogue uses authoritative recipe costs and actual workplace/input blockers without paying a batch',()=>{
 const g=new Game();g.reset(42,13,{size:1040,layout:'continents'});g.state.buildings=[];g.state.buildings.push(g.makeBld('hearth',0,0,0));g.tribe(0).items={};const before=JSON.stringify(g.state),r=productionCatalogue(g),cook=r.recipes.find(x=>x.id==='cookMeat');
 assert.equal(r.recipes.length,31);assert.equal(cook.workSeconds,20);assert.match(cook.inputsText,/4 raw meat/);assert.match(cook.inputsText,/1 logs/);assert.equal(cook.sites.length,1);assert.match(cook.sites[0].issue,/Need 4 raw (?:meat|Meat)/);assert.equal(r.roles.find(x=>x.id==='foodDryer').activeRecipes.length,2);assert.equal(r.roles.find(x=>x.id==='skinDryer').activeRecipes[0].id,'drySkin');assert.equal(JSON.stringify(g.state),before);
});

test('shipped survival workplaces and new milling/baking roles are partial/working rather than fake planned buildings',()=>{const g=new Game();g.reset(42,10);const r=productionCatalogue(g);for(const id of['hearth','butcher','skinDryer','tanner','tailor','mortar','oven','foodDryer','smokehouse']){const role=r.roles.find(x=>x.id===id);assert.notEqual(role.status,'planned',id);assert.ok(role.activeRecipes.length,id);}assert.equal(r.roles.find(x=>x.id==='foodDryer').status,'partial');assert.equal(r.recipes.find(x=>x.id==='grindGrain').inputsText,'4 grain');assert.match(r.recipes.find(x=>x.id==='bakeBreadOven').outputsText,/4 bread/);assert.equal(r.recipes.find(x=>x.id==='bakeBreadOven').slots,2);for(const id of['grindingStone','oven'])assert.equal(r.buildings.find(x=>x.id===id).age,'Stone');});
