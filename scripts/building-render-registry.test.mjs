import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {BUILDINGS} from '../src/game/constants.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {BLD_TYPES}=await import('../src/scene/world.ts');const {buildingGeos}=await import('../src/scene/meshes.ts');
test('every registered buildable workplace has an instantiated scene type and real geometry',()=>{assert.equal(new Set(BLD_TYPES).size,BLD_TYPES.length);const geos=buildingGeos();for(const type of Object.keys(BUILDINGS)){assert.ok(BLD_TYPES.includes(type),`${type} must be included in scene instancing and picking`);assert.ok(geos[type],`${type} geometry exists`);assert.ok(Object.values(geos[type]).some(g=>g?.isBufferGeometry&&g.getAttribute('position')?.count>0),`${type} has physical geometry`);}});
