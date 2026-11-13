import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {firstNeeds,firstNeedsVisible} from '../src/ui/hearth/firstNeeds.ts';
// First-five-minutes strip: read-only, each need explains itself, met needs retire for the session.
const fp=g=>JSON.stringify([g.state.time,g.state.units.length,g.tribe(0).food,g.tribe(0).wood,g.state.buildings.length]);
function fresh(){const g=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();g.state.paused=true;return g;}

test('a fresh village lists all four needs with a reason and a place; reading changes nothing',()=>{
 const g=fresh(),before=fp(g),n=firstNeeds(g);
 assert.deepEqual(n.map(x=>x.kind),['water','fire','shelter','food']);
 for(const x of n){assert.ok(x.label&&x.hint.length>8);assert.ok(x.met||x.at,'unmet need says where to look');}
 assert.equal(n.find(x=>x.kind==='fire').met,false,'no hearth yet');
 assert.equal(fp(g),before);
});
test('a finished hearth and house meet their needs; the strip retires them and stays retired',()=>{
 const g=fresh(),c=g.campOf(0);g.tribe(0).wood+=300;
 for(const [t,dx,dz] of [['townhall',0,0],['hearth',9,8],['house',-12,6]])g.placeBuilding(t,c.x+dx,c.z+dz,0);
 let r=firstNeedsVisible(firstNeeds(g),new Set());assert.ok(r.show.some(x=>x.kind==='fire'));
 for(const b of g.state.buildings.filter(b=>b.team===0)){b.build=1;b.hp=b.maxHp;}
 const n=firstNeeds(g);assert.equal(n.find(x=>x.kind==='fire').met,true);assert.equal(n.find(x=>x.kind==='shelter').met,true);
 r=firstNeedsVisible(n,r.retired);assert.ok(!r.show.some(x=>x.kind==='fire'||x.kind==='shelter'));
 // losing the hearth later does not bring a retired need back
 for(const b of g.state.buildings.filter(b=>b.type==='hearth'))b.hp=0;
 const r2=firstNeedsVisible(firstNeeds(g),r.retired);assert.ok(!r2.show.some(x=>x.kind==='fire'));
});
test('all met means nothing to show',()=>{
 const fake=['water','fire','shelter','food'].map(kind=>({kind,label:kind,hint:'ok ok ok ok',at:null,met:true}));
 assert.equal(firstNeedsVisible(fake,new Set()).show.length,0);
});
