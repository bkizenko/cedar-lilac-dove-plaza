import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {knownSettlementSite} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {proposeTradeOffer,answerTradeOffer,reviewTradeNeeds,tickTradeNeeds,tradeStock,tradeSpread,tradeReviewSeconds,marketCount,tradeNeedsDiagnostics,TRADE_NEEDS_RULES,TRADE_GOODS} from '../src/game/tradeNeeds.ts';

function ground(g){const size=g.world.size;for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++)g.world.heights[z*(SEGS+1)+x]=4;g.world.rivers=[];g.world.features=[];g.rebuildWalk();for(const u of g.state.units)u.y=g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);void size;const clock=g.clockState.bind(g);g.clockState=()=>({...clock(),period:'Day'});}
/** Flat dry world; halls 70 m apart; each rival has 10 adults and mutually observed halls. */
function fixture({stock1={},stock2={},markets=0,dist=70}={}){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.conflict='quiet';g.seaT=1e9;g.calamityT=1e9;for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];g.state.livestock=[];
 for(const t of g.state.tribes)Object.assign(t,{food:2000,foodLots:undefined,wood:0,stone:0,copper:0,iron:0,spears:0,bows:0,blades:0,aggro:0,hostile:false,ally:false,trust:.8,tension:0,thinkT:10000,age:2,items:{}});
 Object.assign(g.tribe(1),stock1);Object.assign(g.tribe(2),stock2);
 g.state.buildings.push(g.makeBld('townhall',0,0,1),g.makeBld('townhall',dist,0,2),g.makeBld('townhall',-300,-200,0));
 for(let i=0;i<10;i++){g.spawnUnit('worker',8+i*1.5,6,1).order='hold';g.spawnUnit('worker',dist+8+i*1.5,6,2).order='hold';}
 g.spawnUnit('worker',-300,-190,0).order='hold';
 for(let i=0;i<markets;i++){const m=g.makeBld('market',-20-i*12,-20,1);g.state.buildings.push(m);}
 ground(g);
 for(const [a,b] of [[1,2],[2,1]]){const hall=g.state.buildings.find(x=>x.team===b&&x.type==='townhall'),w=g.state.units.find(u=>u.team===a);const old={x:w.x,z:w.z};Object.assign(w,{x:hall.x+5,z:hall.z+5});g.state.time+=3;knownSettlementSite(g,b,a);Object.assign(w,old);}
 g.state.coastalTradeReviewAt=1e8;g.state.scoutTimer=1000;
 return g;}
function finish(g){for(const b of g.state.buildings){b.build=1;}}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
function reload(g){const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));ground(copy);copy.seaT=1e9;copy.calamityT=1e9;return copy;}
const KINDS=Object.keys(TRADE_GOODS);
/** Everything of one kind anywhere: stocks, escrow, carried lines, dropped parcels, recorded loss of non-parcelled goods. */
function total(g,k){let n=0;for(const t of g.state.tribes.map(t=>t.id))n+=tradeStock(g,t,k);for(const o of g.state.tradeNeeds?.offers||[]){if(o.reserved)for(const s of [o.give,o.get])if(s.kind===k)n+=s.amount;for(const l of o.lines)if(l.kind===k)n+=l.amount;n+=o.lostAmount&&o.give.kind===k||o.get.kind===k?o.lostAmount-o.lostToParcel:0;}
 for(const p of g.state.droppedCargo?.parcels||[])if(p.kind===k)n+=p.amount;
 // Recovery runners carrying a recovered parcel home hold goods that are in neither stock nor parcel yet.
 for(const u of g.state.units)if(u.tradeNeedsId===undefined&&u.carry>0&&u.carryType===k)n+=u.carry;return n;}
function snapshot(g){return Object.fromEntries(KINDS.filter(k=>k!=='food').map(k=>[k,total(g,k)]));}
const offer=g=>g.state.tradeNeeds.offers[0];
function setup(g,a={},b={}){Object.assign(g.tribe(1),a);Object.assign(g.tribe(2),b);}

test('need vs surplus: a society proposes only goods it actually holds beyond reserve, for goods it actually lacks; nothing moves on proposal',()=>{
 const g=fixture({stock1:{wood:0,stone:220,food:900},stock2:{wood:320,stone:0}});setup(g,{},{});
 const before=snapshot(g);const r=proposeTradeOffer(g,1,2,'stone','wood');assert.equal(r.ok,true,JSON.stringify(r));
 const o=r.offer;assert.ok(o.give.amount<=g.tribe(1).stone,'offers no more than held');assert.equal(o.phase,'proposed');assert.deepEqual(snapshot(g),before,'proposal reserves and moves nothing');
 assert.equal(proposeTradeOffer(g,1,2,'iron','wood').ok,false,'no iron held: cannot offer it');
 g.tribe(1).stone=0;assert.equal(proposeTradeOffer(g,2,1,'wood','stone').ok,true);// society 2 has surplus wood and lacks stone
});

test('acceptance reserves both sides; carriers physically load, walk, are paid, carry home; receipts for load/pay/deliver; exact conservation with save/reload at every phase',()=>{
 let g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});const before=snapshot(g);
 const o0=proposeTradeOffer(g,1,2,'stone','wood').offer;const id=o0.id;g.state.time=o0.answerAt+1;tickTradeNeeds(g,.1);
 let o=g.state.tradeNeeds.offers.find(o=>o.id===id);assert.equal(o.phase,'loading',o.reason);assert.equal(o.reserved,true);
 assert.deepEqual(snapshot(g),before,'reservation conserves');assert.ok(o.give.amount>0&&o.get.amount>0);assert.ok(g.tribe(1).stone<220&&g.tribe(2).wood<320,'goods left the stocks into escrow');
 const giveAmt=o.give.amount,getAmt=o.get.amount;const seen=[o.phase];const end=g.state.time+700;
 while(g.state.time<end&&!['complete','failed'].includes(o.phase)){g.state.paused=false;g.step(.1);assert.deepEqual(g.simulationErrors,[]);o=g.state.tradeNeeds.offers.find(x=>x.id===id);if(o.phase!==seen.at(-1)){seen.push(o.phase);g=reload(g);o=g.state.tradeNeeds.offers.find(x=>x.id===id);assert.equal(o.phase,seen.at(-1),'phase survives strict reload');assert.deepEqual(snapshot(g),before,'conserved at '+o.phase);}
  if(o.phase==='outbound'&&o.lines.length)assert.ok(g.state.units.filter(u=>o.carriers.includes(u.id)).every(u=>u.carry>0),'carriers physically hold the goods');}
 assert.equal(o.phase,'complete',JSON.stringify({o,seen}));for(const p of ['loading','outbound','returning','complete'])assert.ok(seen.includes(p),seen.join());
 assert.deepEqual(snapshot(g),before);assert.equal(g.tribe(2).stone,giveAmt,'partner received exactly the offered stone');assert.equal(g.tribe(1).wood,getAmt,'proposer received exactly the payment');
 const stages=g.state.tradeNeeds.receipts.filter(r=>r.offerId===id).map(r=>r.stage);for(const s of ['loaded','paid','delivered'])assert.ok(stages.includes(s),stages.join());
 assert.ok(g.state.units.every(u=>u.tradeNeedsId===undefined&&u.carry===0),'everyone released and empty-handed');assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('declined offers cool down, are not re-proposed meanwhile, and change afterwards; partner that cannot pay refuses',()=>{
 const g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:220}});// society 2 has no need for stone
 const o=proposeTradeOffer(g,1,2,'stone','wood').offer;const first=o.give.amount;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);assert.equal(o.phase,'declined');assert.equal(o.reason,'no-need');
 assert.equal(proposeTradeOffer(g,1,2,'stone','wood').ok,false,'cooling down');assert.equal(g.state.tradeNeeds.teams.find(t=>t.team===1).reasons.cooldown,1);
 const c=g.state.tradeNeeds.cooldowns[0];g.state.time=c.until+1;g.tribe(2).stone=0;const again=proposeTradeOffer(g,1,2,'stone','wood');assert.equal(again.ok,true);assert.ok(again.offer.get.amount<o.get.amount||again.offer.give.amount<first,'amount shrinks after a decline');
 // A second kind of refusal: partner short of the requested good.
 const g2=fixture({stock1:{stone:220,wood:0},stock2:{wood:3,stone:0}});const o2=proposeTradeOffer(g2,1,2,'stone','wood').offer;g2.state.time=o2.answerAt+1;tickTradeNeeds(g2,.1);assert.equal(o2.reason,'no-surplus');assert.deepEqual(snapshot(g2),snapshot(g2));
 // After a cooldown the chooser prefers a different pair.
 const g3=fixture({stock1:{stone:220,copper:90,wood:0},stock2:{wood:320,stone:0,copper:0}});
});

test('no offering what cannot be delivered: proposer that lost its goods before acceptance cancels with nothing created or destroyed; carrier shortage and overweight are refused',()=>{
 const g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});const before=snapshot(g);const o=proposeTradeOffer(g,1,2,'stone','wood').offer;g.tribe(1).stone=0;before.stone-=220;
 g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);assert.equal(o.phase,'declined');assert.equal(o.reason,'proposer-short');assert.deepEqual(snapshot(g),before);
 const h=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});for(const u of h.state.units.filter(u=>u.team===1))u.jobLock=true;const p=proposeTradeOffer(h,1,2,'stone','wood').offer;h.state.time=p.answerAt+1;tickTradeNeeds(h,.1);assert.equal(p.reason,'no-carriers');
});

test('diverse goods: tools, weapons, armor, artifacts and animals are offered only from real holdings, and the offer mix is measured per society',()=>{
 const g=fixture({stock1:{spears:9,blades:9,wood:0,cloth:0,items:{paddedArmor:6,pottery:24,cordage:0,basket:0,cloth:0}},stock2:{wood:400,stone:300,copper:80,items:{cordage:30,basket:12,paddedArmor:0,pottery:0,cloth:12}}});
 for(const t of [1,2])for(const [i,k] of [[0,'wood']])void i;
 const kinds=new Set();
 for(const [give,get] of [['spears','wood'],['paddedArmor','cordage'],['pottery','basket'],['blades','stone'],['pottery','copper']]){const r=proposeTradeOffer(g,1,2,give,get);assert.equal(r.ok,true,give+'->'+get+' '+JSON.stringify(r));kinds.add(TRADE_GOODS[give].cat);kinds.add(TRADE_GOODS[get].cat);g.state.tradeNeeds.offers.pop();g.state.tradeNeeds.offers.length=0;}
 for(const c of ['weapon','armor','artifact','tool','resource'])assert.ok(kinds.has(c),c);
 assert.equal(proposeTradeOffer(g,1,2,'iron','wood').ok,false,'iron not held');assert.equal(proposeTradeOffer(g,1,2,'goat','wood').ok,false,'no goats held');
 const mix=g.state.tradeNeeds.teams.find(t=>t.team===1);assert.ok(Object.keys(mix.categories).length>=5,JSON.stringify(mix.categories));assert.ok(Object.keys(mix.mix).length>=8,JSON.stringify(mix.mix));
 // Automatic review picks varied goods over time (kind-mix penalty) for the same society.
 const h=fixture({stock1:{wood:0,stone:0,spears:6,blades:3,items:{pottery:12,paddedArmor:5,cloth:10,cordage:0,basket:0}},stock2:{wood:400,stone:300,copper:90,items:{cordage:30,basket:12}}});
 const seen=new Set();for(let i=0;i<14;i++){h.state.tradeNeeds&&(h.state.tradeNeeds.offers.length=0);h.state.tradeNeeds&&(h.state.tradeNeeds.cooldowns.length=0);h.state.time+=TRADE_NEEDS_RULES.reviewSeconds+1;reviewTradeNeeds(h);const o=h.state.tradeNeeds.offers.at(-1);if(o&&o.from===1)seen.add(o.give.kind);}
 assert.ok(seen.size>=3,'society 1 offered '+[...seen]);
});

test('animals: a goat is reserved, led by a carrier and delivered into a partner pen; none created, none destroyed',()=>{
 let g=fixture({stock1:{wood:0,stone:0},stock2:{wood:340,stone:0}});
 const pen1=g.makeBld('pen',20,-14,1),pen2=g.makeBld('pen',dist2(),-14,2);g.state.buildings.push(pen1,pen2);finish(g);ground(g);
 for(let i=0;i<5;i++)g.state.livestock.push({id:g.id(),species:'goat',x:20,y:4,z:-14,facing:0,vx:0,vz:0,wanderT:0,hp:20,maxHp:20,fly:0,scale:1,team:1,pen:pen1.id,sex:i%2?'female':'male',born:0,tamedAt:0,hunger:0,milk:0,pregnancy:0});
 const before=snapshot(g);assert.equal(before.goat,5);
 const o0=proposeTradeOffer(g,1,2,'goat','wood');assert.equal(o0.ok,true,JSON.stringify(o0));const id=o0.offer.id;g.state.time=o0.offer.answerAt+1;g.tribe(2).wood=g.tribe(2).wood;tickTradeNeeds(g,.1);
 let o=g.state.tradeNeeds.offers.find(o=>o.id===id);assert.equal(o.phase,'loading',o.reason);assert.equal(snapshot(g).goat,5,'reserved goat still counted');assert.ok(g.state.livestock.length<5,'goat left the herd into escrow');
 const end=g.state.time+700;while(g.state.time<end&&!['complete','failed'].includes(o.phase)){g.state.paused=false;g.step(.1);o=g.state.tradeNeeds.offers.find(x=>x.id===id);}
 assert.equal(o.phase,'complete',JSON.stringify(o));assert.equal(snapshot(g).goat,5);assert.equal(g.state.livestock.filter(a=>a.team===2).length,o.giveDelivered);assert.ok(g.state.livestock.filter(a=>a.team===2).every(a=>a.pen===pen2.id));
});
function dist2(){return 70+20;}

test('armed caravans: escort count and arming scale with observed risk and trust; unarmable escorts are not counted',()=>{
 const run=(setupFn)=>{const g=fixture({stock1:{stone:220,wood:0,spears:6,bows:2},stock2:{wood:320,stone:0}});setupFn(g);const o=proposeTradeOffer(g,1,2,'stone','wood').offer;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);return{g,o};};
 const calm=run(()=>{});const o1=calm.o;assert.ok(o1.risk<.4,String(o1.risk));assert.equal(o1.escortsWanted,0);assert.equal(o1.escorts.length,0);
 const raided=run(g=>{for(let i=0;i<3;i++){const r=g.spawnUnit('spearman',20+i,10,3);r.team=3;}for(let i=0;i<4;i++){g.state.tradeNeeds??={version:1,teams:[],offers:[],cooldowns:[],receipts:[]};}});
 const o2=raided.o;assert.ok(o2.risk>o1.risk,`${o2.risk} > ${o1.risk}`);assert.ok(o2.escortsWanted>=1);
 // Escorts walk to the cache and arm from real stock; the offer starts only once every escort is ready.
 let g=raided.g,o=o2;const spears=g.tribe(1).spears+g.tribe(1).bows;const end=g.state.time+300;while(g.state.time<end&&o.phase==='loading'){g.state.paused=false;g.step(.1);}
 assert.equal(o.phase,'outbound',o.reason);assert.ok(o.escortsArmed>=1&&o.escortsArmed<=o.escortsWanted);assert.ok(g.tribe(1).spears+g.tribe(1).bows<spears,'weapons loaned from real stock');
 // More trust lowers the escort wish: a completed history raises trust.
 const trusted=run(g=>{g.state.tradeNeeds={version:1,teams:[],offers:[],cooldowns:[],receipts:[]};for(let i=0;i<4;i++)g.state.tradeNeeds.offers.push({id:9000+i,from:1,to:2,give:{kind:'wood',amount:0},get:{kind:'stone',amount:0},fairGet:0,spread:.2,phase:'complete',createdAt:0,answerAt:0,hall:{x:0,z:0},reserved:true,carriers:[],escorts:[],ready:[],lines:[],risk:0,trust:.5,escortsWanted:0,escortsArmed:0,escortsLost:0,carriersLost:0,paid:true,reason:'',lostAmount:0,lostToParcel:0,needAmount:1,volume:1});});
 assert.ok(trusted.o.trust>o1.trust,'history raises trust');assert.ok(trusted.o.risk<o1.risk);
});

test('a carrier killed on the road: its cargo drops as a recoverable parcel, the partner payment is refunded, the offer fails, and the sums still balance',()=>{
 let g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});const before=snapshot(g);const o0=proposeTradeOffer(g,1,2,'stone','wood').offer;const id=o0.id;g.state.time=o0.answerAt+1;tickTradeNeeds(g,.1);let o=offer(g);
 const end=g.state.time+300;while(g.state.time<end&&o.phase!=='outbound'){g.state.paused=false;g.step(.1);}assert.equal(o.phase,'outbound');drive(g,.2);
 const victim=g.state.units.find(u=>u.id===o.carriers[0]);const cargo=o.lines.find(l=>l.unitId===victim.id).amount;victim.hp=0;drive(g,.5);
 o=g.state.tradeNeeds.offers.find(x=>x.id===id);assert.ok(o.carriersLost>=1);g.step(.1);
 assert.ok(['failed','aborting'].includes(o.phase),o.phase);assert.equal(o.lostToParcel,cargo);
 drive(g,400,()=>['failed','complete'].includes(o.phase));assert.equal(o.phase,'failed',JSON.stringify(o));
 assert.deepEqual(snapshot(g),before,'stocks + parcels + refunds account for every unit');assert.ok(g.state.tradeNeeds.receipts.some(r=>r.stage==='lost'&&r.offerId===id));assert.doesNotThrow(()=>decodeGame(JSON.parse(JSON.stringify(encodeGame(g)))));
});

test('NPC to player: the proposal waits for the player; accepting reserves the player’s goods; refusing cools down; expiry counts as refusal',()=>{
 const g=fixture({stock1:{stone:220,wood:0},stock2:{}});Object.assign(g.tribe(0),{wood:340,stone:0,food:500});
 const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall');const w=g.state.units.find(u=>u.team===1);Object.assign(w,{x:hall.x+5,z:hall.z+5});g.state.time+=3;knownSettlementSite(g,0,1);Object.assign(w,{x:8,z:6});
 const r=proposeTradeOffer(g,1,0,'stone','wood');assert.equal(r.ok,true,JSON.stringify(r));const o=r.offer;g.state.time=o.answerAt+5;tickTradeNeeds(g,.1);assert.equal(o.phase,'proposed','NPC does not answer for the player');
 const wood=g.tribe(0).wood;assert.equal(answerTradeOffer(g,o.id,true),true);assert.equal(o.phase,'loading',o.reason);assert.equal(g.tribe(0).wood,wood-o.get.amount,'player goods reserved on acceptance');
 const h=fixture({stock1:{stone:220,wood:0},stock2:{}});Object.assign(h.tribe(0),{wood:300});{const hl=h.state.buildings.find(b=>b.team===0&&b.type==='townhall');const w2=h.state.units.find(u=>u.team===1);Object.assign(w2,{x:hl.x+5,z:hl.z+5});h.state.time+=3;knownSettlementSite(h,0,1);Object.assign(w2,{x:8,z:6});}
 const p=proposeTradeOffer(h,1,0,'stone','wood').offer;assert.equal(answerTradeOffer(h,p.id,false),true);assert.equal(p.phase,'declined');assert.equal(proposeTradeOffer(h,1,0,'stone','wood').ok,false);
 const k=fixture({stock1:{stone:220,wood:0},stock2:{}});{const hl=k.state.buildings.find(b=>b.team===0&&b.type==='townhall');const w2=k.state.units.find(u=>u.team===1);Object.assign(w2,{x:hl.x+5,z:hl.z+5});k.state.time+=3;knownSettlementSite(k,0,1);Object.assign(w2,{x:8,z:6});}
 const q=proposeTradeOffer(k,1,0,'stone','wood').offer;k.state.time=q.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds+1;tickTradeNeeds(k,.1);assert.equal(q.reason,'expired');
});

test('markets measurably change trade frequency and price spread (read from market buildings only)',()=>{
 const none=fixture({markets:0}),two=fixture({markets:2});finish(two);
 assert.equal(marketCount(none,1),0);assert.equal(marketCount(two,1),2);
 assert.ok(tradeReviewSeconds(two,1)<tradeReviewSeconds(none,1),'markets shorten the review interval');assert.ok(tradeSpread(two,1,2)<tradeSpread(none,1,2),'markets narrow the spread');
 const count=(g)=>{Object.assign(g.tribe(1),{wood:0,stone:0,spears:0,items:{}});Object.assign(g.tribe(2),{wood:5000,stone:5000,copper:500,items:{cordage:200}});let n=0;for(let t=0;t<3600;t+=30){g.state.time+=30;const before=g.state.tradeNeeds?.teams.find(x=>x.team===1)?.proposed||0;reviewTradeNeeds(g);const after=g.state.tradeNeeds?.teams.find(x=>x.team===1)?.proposed||0;n+=after-before;if(g.state.tradeNeeds)for(const o of g.state.tradeNeeds.offers)if(o.phase==='proposed')o.phase='declined';}return n;};
 // society 1 has real surplus of food but needs materials, so it proposes whenever reviewed.
 const a=count(none),b=count(two);assert.ok(b>a,`markets increase proposals/hour: ${a} -> ${b}`);
 const spreadOf=g=>{g.tribe(1).stone=0;const r=proposeTradeOffer(g,1,2,'food','wood');assert.equal(r.ok,true,JSON.stringify(r));return 1-r.offer.get.amount/r.offer.fairGet;};
 const s0=spreadOf(fixture({markets:0})),s2=(()=>{const g=fixture({markets:2});finish(g);return spreadOf(g);})();assert.ok(s2<s0,`realized spread ${s0} -> ${s2}`);
});

test('old saves without trade needs load; dangling or malformed state is rejected; diagnostics report per-society mix',()=>{
 const g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(raw.state.tradeNeeds,undefined);assert.doesNotThrow(()=>decodeGame(raw));
 const bad=JSON.parse(JSON.stringify(raw));bad.state.units.find(u=>u.team===1).tradeNeedsId=777;assert.throws(()=>decodeGame(bad));
 proposeTradeOffer(g,1,2,'stone','wood');const ok=JSON.parse(JSON.stringify(encodeGame(g)));assert.doesNotThrow(()=>decodeGame(ok));ok.state.tradeNeeds.offers[0].phase='teleporting';assert.throws(()=>decodeGame(ok));
 const d=tradeNeedsDiagnostics(g);assert.equal(d.open,1);assert.ok(d.teams.find(t=>t.team===1).categories.resource>=2);
});

test('end to end through Game.step: two societies with complementary needs trade on their own review cycle, NPC to NPC, with conservation and receipts',()=>{
 const g=fixture({stock1:{stone:240,wood:0,items:{cordage:0,basket:0}},stock2:{wood:340,stone:0,items:{cordage:0,basket:0}}});const before=snapshot(g);
 const end=g.state.time+3000;let done=0;while(g.state.time<end&&done<1){g.state.paused=false;g.step(.2);done=g.state.tradeNeeds?.offers.filter(o=>o.phase==='complete').length||0;}
 assert.deepEqual(g.simulationErrors,[]);assert.ok(done>=1,JSON.stringify(g.state.tradeNeeds?.teams));
 const d=tradeNeedsDiagnostics(g);assert.ok(d.teams.some(t=>t.completed>=1));assert.deepEqual(snapshot(g),before);assert.ok(g.state.tradeNeeds.receipts.some(r=>r.stage==='delivered'));
});
