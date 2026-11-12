import test from 'node:test';import assert from 'node:assert/strict';
import {habitatForProvince,habitatForBaseKind} from '../src/scene/carvedHabitat.ts';
import {PROVINCE_KINDS} from '../src/game/ecologicalProvinces.ts';
import {materialFor,climateFor} from '../src/scene/buildingStyleMap.ts';
test('every province maps to a habitat; desert builds mudbrick, forest keeps timber',()=>{
 for(const k of PROVINCE_KINDS)assert.ok(habitatForProvince(k),k);
 assert.equal(materialFor(2,habitatForProvince('arid')),'mudbrick');
 assert.equal(materialFor(2,habitatForProvince('mixed-woodland')),'timber');
 assert.equal(materialFor(2,habitatForProvince('alpine')),'stone');
 assert.equal(climateFor(habitatForProvince('wetland')),'wet');
});
test('legacy worlds keep the plains default',()=>{assert.equal(habitatForBaseKind('plains'),undefined);assert.equal(habitatForBaseKind('hills'),'hills');assert.equal(habitatForProvince(undefined),undefined);});
