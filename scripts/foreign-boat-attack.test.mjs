import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {ensureNaval,navalState} from '../src/game/navalPorts.ts';
import {attackBoat,attackBoatIssue,tickNaval} from '../src/game/navalFleet.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {traderIncidentCounts} from '../src/game/traderInteraction.ts';

function sea(){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.boats=[];g.state.trails=[];g.state.trees=[];
 g.world.waterY=0;g.world.baseWaterY=0;g.world.waterfalls=[];g.height=x=>Math.abs(x)<10?-2:1.5;g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();ensureNaval(g);return g;
}
function hull(g,team,x,z,captain=true){
 const boat={id:g.id(),team,dock:0,x,z,y:.16,hp:300,facing:0,capacity:5};g.state.boats.push(boat);
 if(captain){const u=g.spawnUnit('spearman',x,z,team);u.militia=true;u.boat={id:boat.id,phase:'aboard'};boat.captain=u.id;}
 return boat;
}
const crew=(g,boat,n,type='swordsman')=>{const out=[];for(let i=0;i<n;i++){const u=g.spawnUnit(type,boat.x,boat.z,boat.team);u.militia=true;u.boat={id:boat.id,phase:'aboard'};out.push(u);}return out;};

test('a visible foreign hull can be selected, shows what is seen, and never takes orders',()=>{
 const g=sea(),mine=hull(g,0,0,0),theirs=hull(g,1,0,30);
 assert.equal(g.selectForeignBoat(theirs.id),true);assert.equal(g.selectedForeignBoat,theirs.id);assert.equal(g.selectedBoat,null);
 const sel=g.snapshot().selection;assert.equal(sel.kind,'boat');assert.equal(sel.team,1);assert.match(sel.name,new RegExp(g.tribe(1).name));assert.match(sel.info,/attack/);
 g.issueMove(0,60);assert.equal(theirs.z,30,'issuing a move never steers a foreign hull');
 assert.equal(g.selectForeignBoat(theirs.id),true);assert.equal(g.selectedForeignBoat,null,'second click toggles it off');
 g.selectForeignBoat(theirs.id);assert.equal(g.selectBoat(mine.id),true);assert.equal(g.selectedForeignBoat,null,'selecting your own hull replaces it');assert.equal(g.selectedBoat,mine.id);
 assert.equal(g.selectForeignBoat(mine.id),false,'your own hull is not a foreign selection');
 g.selectForeignBoat(theirs.id);g.clearSelect();assert.equal(g.selectedForeignBoat,null);
 // fog: a hull you cannot see cannot be selected; a sunk hull drops out
 g.vision.fill(0);assert.equal(g.selectForeignBoat(theirs.id),false);
 g.vision.fill(2);g.selectForeignBoat(theirs.id);theirs.hp=0;assert.equal(g.snapshot().selection?.kind==='boat'&&g.snapshot().selection.team===1,false);assert.equal(g.selectedForeignBoat,null);
});
test('naval-order attack is a validated command naming your hull and the target hull',()=>{
 assert.ok(isEngineDispatchCommand({kind:'naval-order',action:'attack',boatId:1,targetBoatId:2}));
 assert.equal(isEngineDispatchCommand({kind:'naval-order',action:'attack',boatId:1,targetBoatId:'2'}),false);
 const g=sea();assert.equal(applyEngineCommand(g,{kind:'naval-order',action:'attack',boatId:9,targetBoatId:10}).accepted,false);
 assert.match(applyEngineCommand(g,{kind:'naval-order',action:'attack',boatId:9}).reason,/Choose/);
});
test('against an enemy in grapnel range the attack begins the ordinary boarding; out of range it closes in',()=>{
 const g=sea(),mine=hull(g,0,0,0),foe=hull(g,1,0,5);crew(g,mine,4);crew(g,foe,1);g.tribe(1).hostile=true;
 const r=applyEngineCommand(g,{kind:'naval-order',action:'attack',boatId:mine.id,targetBoatId:foe.id});assert.equal(r.accepted,true,r.reason);assert.equal(r.reason,'Boarding begun');assert.equal(navalState(g).boardings.length,1);
 assert.match(applyEngineCommand(g,{kind:'naval-order',action:'attack',boatId:mine.id,targetBoatId:foe.id}).reason,/already/);
 const g2=sea(),m2=hull(g2,0,0,0),f2=hull(g2,1,0,40);crew(g2,m2,4);g2.tribe(1).hostile=true;
 const c=attackBoat(g2,m2.id,f2.id,0);assert.equal(c.accepted,true,c.reason);assert.match(c.reason,/Closing/);assert.equal(navalState(g2).boardings.length,0);
});
test('attacking a peaceful trading hull is itself the hostile act and leaves an incident; refusals cost nothing',()=>{
 const g=sea(),mine=hull(g,0,0,0),trader=hull(g,1,0,5);crew(g,mine,4);const t=crew(g,trader,2,'worker')[0];t.militia=false;t.coastalVoyageId=77;
 g.tribe(1).hostile=false;g.tribe(1).ally=false;
 // refusals first: no boarders, cannot see, ally, own, nobody
 const lone=hull(g,0,60,0,false);assert.match(attackBoat(g,lone.id,trader.id,0).reason,/helm|fighters/);
 g.vision.fill(0);assert.match(attackBoatIssue(g,mine.id,trader.id,0),/cannot see/);g.vision.fill(2);
 g.tribe(1).ally=true;assert.match(attackBoatIssue(g,mine.id,trader.id,0),/ally/);g.tribe(1).ally=false;
 assert.match(attackBoatIssue(g,mine.id,mine.id,0),/foreign/);assert.match(attackBoatIssue(g,mine.id,99999,0),/foreign/);
 assert.equal(g.tribe(1).hostile,false,'refused attacks never provoke anyone');assert.equal(traderIncidentCounts(g).pending,0);
 const r=attackBoat(g,mine.id,trader.id,0);assert.equal(r.accepted,true,r.reason);
 assert.equal(g.tribe(1).hostile,true,'the attack made them hostile');assert.equal(traderIncidentCounts(g).pending,1,'their traders will carry the news');
 assert.equal(navalState(g).boardings.length,1);
});
test('raiders are always fair targets; an attack never edits the target hull',()=>{
 const g=sea(),mine=hull(g,0,0,0),raider=hull(g,3,0,5);crew(g,mine,4);crew(g,raider,2);
 const hp=raider.hp,team=raider.team;assert.equal(attackBoat(g,mine.id,raider.id,0).accepted,true);
 assert.equal(raider.hp,hp);assert.equal(raider.team,team);
 for(let i=0;i<5;i++){g.state.time+=1;tickNaval(g,1);}
 assert.deepEqual(g.simulationErrors??[],[]);
});
