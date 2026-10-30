import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {setFieldCrop,setFieldRest} from '../src/game/cultivation.ts';
import {crop,farmAvailable} from '../src/game/settlement.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.state.time=0;g.tribe(0).cultivated=['grain','pulses','tubers'];const b=g.makeBld('farm',0,30,0);g.state.buildings.push(b);crop(g,b);return {g,b};}
test('next crop survives saving without converting this years standing harvest',()=>{
 const {g,b}=fixture();b.crop.planted=.7;b.crop.tended=.4;b.crop.remaining=22;
 assert.equal(setFieldCrop(g,b.id,'pulses'),true);assert.equal(b.crop.kind,'grain');assert.equal(b.crop.planted,.7);assert.equal(b.crop.remaining,22);
 const copy=decodeGame(encodeGame(g)),field=copy.state.buildings.find(p=>p.id===b.id);
 assert.equal(field.cropType,'pulses');assert.equal(field.crop.kind,'grain');
 copy.state.time=1800;crop(copy,field);assert.equal(field.crop.kind,'pulses');assert.equal(field.crop.planted,0);
});
test('rest releases farmers, recovers fertility next year and cannot erase planted work',()=>{
 const {g,b}=fixture();b.fertility=.5;const u=g.state.units.find(p=>p.team===0);u.node=b;u.order='gather';u.carry=3;
 assert.equal(setFieldRest(g,b.id,true),true);assert.equal(farmAvailable(g,b),false);assert.equal(u.order,'return');assert.equal(u.carry,3);
 g.state.time=1800;crop(g,b);assert.equal(b.fertility,.74);assert.equal(farmAvailable(g,b),true);
 b.crop.planted=.1;assert.equal(setFieldRest(g,b.id,true),false);assert.equal(b.crop.planted,.1);
});
test('unknown crops and foreign fields cannot be replanned',()=>{
 const {g,b}=fixture();g.tribe(0).cultivated=['grain'];assert.equal(setFieldCrop(g,b.id,'pulses'),false);
 b.team=1;assert.equal(setFieldRest(g,b.id,true),false);assert.equal(setFieldCrop(g,b.id,'grain'),false);
});
