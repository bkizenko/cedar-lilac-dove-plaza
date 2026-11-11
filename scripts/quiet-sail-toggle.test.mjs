import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleSail} from '../src/game/boatSailing.ts';

// Existing paid rig/aboard crew boundary fixture: no Game construction,
// terrain mutation, free rig fitting, simulation ticks or renderer involved.
function fixture(team=0){
 const rig={version:1,raised:false,condition:.73,fittedAt:25};
 const captain={id:5,team,hp:90,boat:{id:13,phase:'aboard'},order:'idle',carry:7,carryType:'wood'};
 const boat={id:13,team,captain:captain.id,hp:150,capacity:3,x:11,z:12,facing:1,sailRig:rig};
 const messages=[],g={state:{time:100,boats:[boat],units:[captain],haulageProjects:[]},banner:(text,seconds)=>messages.push({text,seconds})};
 return {g,boat,captain,rig,messages};
}
function conserved(f){const {raised,...rig}=f.rig;return JSON.stringify({boat:{...f.boat,sailRig:rig},units:f.g.state.units,projects:f.g.state.haulageProjects});}

test('default player sail toggle retains messages and actual hull, rig, condition and crew',()=>{
 const f=fixture(),before=conserved(f);
 assert.equal(toggleSail(f.g,f.boat.id,true),true);assert.equal(f.rig.raised,true);
 assert.equal(toggleSail(f.g,f.boat.id,false),true);assert.equal(f.rig.raised,false);
 assert.deepEqual(f.messages,[{text:'Sail raised — favorable wind helps; row or lower it against the wind',seconds:3},{text:'Sail lowered — rowing',seconds:3}]);
 assert.equal(conserved(f),before);assert.equal(f.g.state.boats[0],f.boat);assert.equal(f.boat.sailRig,f.rig);assert.equal(f.g.state.units[0],f.captain);
});
test('NPC teams raise and lower the same conditioned rig without player banners',()=>{
 for(const team of [1,2]){const f=fixture(team),before=conserved(f);
  assert.equal(toggleSail(f.g,13,true,team),true);assert.equal(f.rig.raised,true);
  assert.equal(toggleSail(f.g,13,false,team),true);assert.equal(f.rig.raised,false);
  assert.deepEqual(f.messages,[]);assert.equal(conserved(f),before);assert.equal(f.boat.sailRig,f.rig);
 }
});
test('player and NPC physical guards reject invalid toggles without mutation or banners',()=>{
 const cases=[
  f=>f.boat.hp=0,
  f=>f.boat.team=9,
  f=>f.boat.captain=99,
  f=>f.captain.team=9,
  f=>f.captain.hp=0,
  f=>f.captain.maturesAt=200,
  f=>f.captain.prisoner={phase:'custody'},
  f=>f.captain.boat.phase='boarding',
  f=>f.captain.boat.id=99,
  f=>delete f.boat.sailRig,
  f=>f.rig.condition=0,
  f=>f.g.state.haulageProjects.push({team:f.boat.team,work:{sailRigOrder:{boatId:13}}}),
 ];
 for(const team of [0,1])for(const change of cases){const f=fixture(team);change(f);const before=JSON.stringify(f.g.state);assert.equal(toggleSail(f.g,13,true,team),false);assert.equal(JSON.stringify(f.g.state),before);assert.deepEqual(f.messages,[]);}
 // Preserve existing safety behavior: a worn-out raised sail can still be lowered.
 for(const team of [0,1]){const f=fixture(team);f.rig.condition=0;f.rig.raised=true;assert.equal(toggleSail(f.g,13,false,team),true);assert.equal(f.rig.raised,false);assert.equal(f.rig.condition,0);assert.equal(f.messages.length,team===0?1:0);}
});
