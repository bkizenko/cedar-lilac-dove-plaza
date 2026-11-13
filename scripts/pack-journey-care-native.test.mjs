import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{decodeGame,encodeGame}from'../src/game/persistence.ts';
import{tickPackAnimals}from'../src/game/packAnimals.ts';
import{tickStolenCargo}from'../src/game/stolenCargo.ts';
import{foodInventory}from'../src/game/pantry.ts';
import{returnPackJourneyCare,validPackJourneySupplies}from'../src/game/packJourneyCare.ts';
import{expeditionAtOwnCache}from'../src/game/expeditionProvisions.ts';
const ready=!!process.env.PACK_EXPEDITION_PAID_SAVE&&!!process.env.PACK_EXPEDITION_MID_SAVE;
const check=(name,fn)=>test(name,{skip:ready?false:'Requires actual earned-horse expedition checkpoints'},fn);
const fixture=key=>{const g=decodeGame(JSON.parse(readFileSync(process.env[key],'utf8'))),u=g.state.units.find(u=>u.expedition&&u.packAnimal&&u.packJourneySupplies);assert.ok(u);return{g,u};};
const sum=p=>Object.values(p.feed).reduce((n,v)=>n+(v||0),0),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} versus ${b}`);
check('same actual travelling animal consumes only its paid feed and water packet, never remote village stores',()=>{
 const{g,u}=fixture('PACK_EXPEDITION_MID_SAVE');assert.equal(expeditionAtOwnCache(g,u),null);
 const t=g.tribe(u.team),p=u.packJourneySupplies,a=u.packAnimal,food=t.food,water=t.survival.waterLiters,held=sum(p),liters=p.waterLiters,fed=a.foodConsumed||0,drunk=a.waterConsumedLiters||0,id=a.id;
 // Focused executor check on a genuinely earned, physically travelling packet.
 tickPackAnimals(g,3);assert.equal(t.food,food);assert.equal(t.survival.waterLiters,water);assert.equal(u.packAnimal.id,id);assert.ok(sum(p)<held);assert.ok(p.waterLiters<liters);near(held-sum(p),(a.foodConsumed||0)-fed);near(liters-p.waterLiters,(a.waterConsumedLiters||0)-drunk);near(sum(p)+p.feedUsed+(p.feedDropped||0),p.feedLoaded);near(p.waterLiters+p.waterUsed+(p.waterLost||0),p.waterLoaded);assert.ok(validPackJourneySupplies(g.state));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
check('unused actual animal supplies return only at a physical cache with their kinds intact and no fabricated food income',()=>{
 let{g,u}=fixture('PACK_EXPEDITION_MID_SAVE');const before=JSON.stringify(encodeGame(g));assert.equal(returnPackJourneyCare(g,u),false);assert.equal(JSON.stringify(encodeGame(g)),before);
 ({g,u}=fixture('PACK_EXPEDITION_PAID_SAVE'));assert.ok(expeditionAtOwnCache(g,u));const t=g.tribe(u.team),lots=foodInventory(t),packet=structuredClone(u.packJourneySupplies),food=t.food,water=t.survival.waterLiters,events=JSON.stringify(g.state.simulationEvents);
 assert.equal(returnPackJourneyCare(g,u),true);assert.equal(u.packJourneySupplies,undefined);near(t.food,food+sum(packet));near(t.survival.waterLiters,water+packet.waterLiters);for(const k of Object.keys(lots))near(foodInventory(t)[k],lots[k]+(packet.feed[k]||0));assert.equal(JSON.stringify(g.state.simulationEvents),events,'Returning owned supplies is not harvest, production or new trade income');const returned=JSON.stringify(encodeGame(g));assert.equal(returnPackJourneyCare(g,u),true);assert.equal(JSON.stringify(encodeGame(g)),returned);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
check('actual packet death drops finite typed food once, accounts for lost water, and strict saves refuse forged packet balances',()=>{
 const{g,u}=fixture('PACK_EXPEDITION_PAID_SAVE'),packet=structuredClone(u.packJourneySupplies),food=sum(packet)+u.expedition.food,water=g.tribe(u.team).survival.waterLostLiters||0,oldParcels=(g.state.droppedCargo?.parcels||[]).reduce((n,p)=>n+(p.kind==='food'?p.amount:0),0);
 u.hp=0; // Explicit controlled casualty; no claim of a natural battle.
 tickPackAnimals(g,.2);tickStolenCargo(g,.2);assert.equal(u.packJourneySupplies,undefined);assert.equal(u.expedition,undefined);near((g.state.droppedCargo?.parcels||[]).reduce((n,p)=>n+(p.kind==='food'?p.amount:0),0)-oldParcels,food);near(g.tribe(u.team).survival.waterLostLiters-water,packet.waterLiters);const after=JSON.stringify(encodeGame(g));tickPackAnimals(g,.2);tickStolenCargo(g,.2);assert.equal(JSON.stringify(encodeGame(g)),after);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 const original=JSON.parse(readFileSync(process.env.PACK_EXPEDITION_PAID_SAVE,'utf8'));
 for(const forge of[p=>p.feedLoaded++,p=>p.waterLoaded++,p=>p.feed.meat=1,p=>p.origin.loadedAt=1e12,p=>p.origin.team=999]){const s=structuredClone(original),p=s.state.units.find(u=>u.packJourneySupplies).packJourneySupplies;forge(p);assert.equal(validPackJourneySupplies(s.state),false);assert.throws(()=>decodeGame(s));}
});
