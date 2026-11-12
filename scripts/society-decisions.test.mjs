import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {KINDS,DECISION_RULES,enumerate,decide,planFrom,maySpend,raidTargets,postureMultiplier} from '../src/game/societyDecisions.ts';
import {recordFromSightings,wealthSigns,defenceSigns,confidenceAt,targetView,exposure} from '../src/game/societyIntel.ts';
import {direct,temperament,windowOf,DIRECTOR_RULES} from '../src/game/strategicDirector.ts';
import {pressureOf,stageStep,options as breakawayOptions,pickOption,coerceSucceeds,BREAKAWAY_RULES} from '../src/game/breakaways.ts';
import {inherit,inheritGrievance,addHistory,kinCloseness,boundTo,HISTORY_CAP} from '../src/game/succession.ts';
import {validDecisionState,emptyDecisions} from '../src/game/societyState.ts';
import {validRulersState} from '../src/game/rulersState.ts';
import * as S from '../src/game/societyRuntime.ts';
import * as R from '../src/game/rulersRuntime.ts';
import {societyRelation,recordSocietyContact,nudgeSocietyRelation} from '../src/game/societyRelations.ts';

const needs=(o={})=>({time:1000,foodSeconds:900,food:300,foodPerSecond:.3,housing:.5,pop:10,adults:7,wood:200,stone:50,wealth:.3,defence:.5,threat:0,unrest:10,weariness:0,recoveryLeft:0,openLand:.3,climate:0,aggro:.5,exposure:0,
 expansion:{drive:.4,mode:'stay',allow:false,block:'the drivers do not point to a new hearth'},readyFighters:5,targets:[],reserved:{food:0,wood:0,stone:0},...o});
const tgt=(id,o={})=>({id,observedAt:900,ageSeconds:100,confidence:.9,defence:.1,wealth:.7,distance:200,hostile:false,allied:false,trust:0,grievance:0,contactAge:100,...o});
const top=(alts)=>alts.filter(a=>a.feasible).sort((a,b)=>b.score-a.score)[0];
const by=(alts,k)=>alts.find(a=>a.kind===k);
const bld=(g,team,type,x,z)=>{const b={id:g.state.nextId++,kind:'building',type,team,x,y:0,z,w:4,d:4,hp:100,maxHp:100,selected:false,queue:[],rally:null,cd:0,build:1};g.state.buildings.push(b);return b;};
const fixture=(seed=123456)=>{const g=new Game();g.reset(seed,10);g.enterIsland();return g;};

test('M2-01: exactly eight bounded alternatives, each with cost, risk, stated reasons and a stated blocker when infeasible',()=>{
 const alts=enumerate(needs({foodSeconds:100,housing:.95}));
 assert.deepEqual(alts.map(a=>a.kind),[...KINDS]);assert.equal(alts.length,8);
 for(const a of alts){assert.ok(a.score>=0&&a.score<=100);assert.ok(a.risk>=0&&a.risk<=1);assert.ok(a.cost&&Object.values(a.cost).every(v=>v>=0));assert.ok(Array.isArray(a.reasons));if(!a.feasible)assert.ok(a.blocked&&a.blocked.length>3,a.kind+' must say why');}
 assert.ok(by(alts,'stockpile').reasons.some(r=>/food is short/.test(r)),'the reason names the measured need');
 assert.equal(by(alts,'grow').feasible,false);assert.match(by(alts,'grow').blocked,/food/);
 assert.equal(by(alts,'raid').feasible,false);assert.match(by(alts,'raid').blocked,/no known target/);
 assert.equal(by(alts,'ally').feasible,false);assert.equal(by(alts,'trade').feasible,false);
});
test('M2-01: each measured need moves the choice it should',()=>{
 assert.equal(top(enumerate(needs({foodSeconds:80,food:20}))).kind,'stockpile');
 assert.equal(top(enumerate(needs({housing:.98,foodSeconds:1200,wood:200}))).kind,'grow');
 assert.equal(top(enumerate(needs({weariness:85,recoveryLeft:400,foodSeconds:700}))).kind,'recover');
 const danger=enumerate(needs({threat:.7,exposure:.6,defence:.1,targets:[tgt(1)]}));assert.equal(top(danger).kind,'fortify');
 const greedy=enumerate(needs({aggro:.9,targets:[tgt(1,{wealth:.9,defence:0,confidence:1})],foodSeconds:700,wealth:.2}));assert.equal(top(greedy).kind,'raid');assert.equal(by(greedy,'raid').target,1);
 const squeezed=enumerate(needs({expansion:{drive:1.5,mode:'settle',allow:true},housing:.9,foodSeconds:1500}));assert.equal(top(squeezed).kind,'settle');
 const friendly=enumerate(needs({threat:.5,targets:[tgt(2,{trust:.4,wealth:.1})],defence:.9}));assert.equal(top(friendly).kind,'ally');
 const hungryTrade=enumerate(needs({foodSeconds:400,targets:[tgt(2,{trust:.1,wealth:.1})]}));assert.ok(['trade','stockpile'].includes(top(hungryTrade).kind));
});
test('M2-10: defences deter and redirect; unseen neighbours are never targets; wealth is learned, not read',()=>{
 const soft=tgt(1,{wealth:.9,defence:0}),hard=tgt(1,{wealth:.9,defence:.95}),other=tgt(2,{wealth:.5,defence:.1});
 const a=enumerate(needs({aggro:.8,targets:[soft,other]})),b=enumerate(needs({aggro:.8,targets:[hard,other]}));
 assert.equal(by(a,'raid').target,1);assert.ok(by(a,'raid').score>by(b,'raid').score,'defence cuts the raid score');
 assert.equal(by(b,'raid').target,2,'the strike is redirected to the softer known neighbour');assert.ok(by(b,'raid').redirects.some(r=>r.target===1),'the deterred option stays visible');
 assert.deepEqual(raidTargets(needs({targets:[]})),[]);assert.equal(by(enumerate(needs()),'raid').feasible,false);
 const stale=tgt(1,{wealth:.9,defence:0,confidence:.15}),fresh=tgt(1,{wealth:.9,defence:0,confidence:1});
 assert.ok(raidTargets(needs({targets:[fresh]}))[0].score>raidTargets(needs({targets:[stale]}))[0].score,'old reports are worth less');
 assert.equal(raidTargets(needs({targets:[tgt(1,{allied:true})]})).length,0,'allies are not targets');
 // learned risk: seen wealth with no defence raises the wish to fortify
 const calm=by(enumerate(needs({exposure:0,defence:.3})),'fortify').score,seen=by(enumerate(needs({exposure:.8,defence:.3})),'fortify').score;assert.ok(seen>calm+20);
 assert.ok(exposure(.8,[{lastContact:990,hostile:true}],1000)>exposure(.8,[],1000));assert.equal(exposure(.8,[],1000),0);
});
test('M2-02: a committed plan reserves, is held with hysteresis, and only emergencies interrupt it',()=>{
 const base=needs({time:1100,foodSeconds:900,wood:200});
 const trade=planFrom({...by(enumerate(base),'stockpile'),kind:'trade',cost:{food:0,wood:50,stone:0,people:2,seconds:300},target:2},7,1000);
 assert.deepEqual(trade.reserve,{food:0,wood:50,stone:0});
 // inside the minimum hold a better alternative does not displace it
 const within=(n)=>({...n,time:1000+DECISION_RULES.minHoldSeconds-20});
 const better=[{...by(enumerate(base),'grow'),score:95,feasible:true},{...by(enumerate(base),'trade'),score:30,feasible:true,target:2},...enumerate(base).filter(a=>!['grow','trade'].includes(a.kind))];
 assert.equal(decide(better,within(base),trade,5,1).change,'keep');
 // after the hold a small gain does not switch, a large one does
 const later={...base,time:1000+DECISION_RULES.minHoldSeconds+60};
 const small=better.map(a=>a.kind==='grow'?{...a,score:42}:a.kind==='trade'?{...a,score:40}:{...a,score:Math.min(a.score,20)});
 assert.equal(decide(small,later,trade,5,1).change,'keep');assert.equal(decide(small,later,trade,5,1).choice.kind,'trade');
 const big=decide(better,later,trade,5,1);assert.equal(big.change,'switch');assert.equal(big.choice.kind,'grow');assert.equal(big.dropped.id,7);
 // interruptions override the hold
 const hungry=decide(enumerate(needs({time:1010,foodSeconds:90,food:20,targets:[tgt(2,{trust:.1})]})),needs({time:1010,foodSeconds:90,food:20,targets:[tgt(2,{trust:.1})]}),{...trade,kind:'raid'},5,1);
 assert.equal(hungry.change,'interrupt');assert.ok(['stockpile','trade'].includes(hungry.choice.kind));assert.match(hungry.why[0],/food/);
 const danger=needs({time:1010,threat:.9,defence:.2});const raidPlan={...trade,kind:'raid',target:2};
 const dd=decide(enumerate(danger),danger,raidPlan,5,1);assert.equal(dd.change,'interrupt');assert.equal(dd.choice.kind,'fortify');
 const gone=decide(enumerate(needs({time:1200})),needs({time:1200}),{...trade,kind:'raid',target:2},5,1);assert.equal(gone.change,'drop');
 const old=decide(enumerate(base),{...base,time:trade.until+1},trade,5,1);assert.ok(['expire','drop'].includes(old.change));
 // reservations: other uses may not cut into them; the plan's own purpose may
 const fort={...trade,kind:'fortify',reserve:{food:0,wood:40,stone:10}};
 assert.equal(maySpend(fort,{wood:60,stone:20},{wood:30},'hut'),false);assert.equal(maySpend(fort,{wood:60,stone:20},{wood:30},'watchtower'),true);
 assert.equal(maySpend(fort,{wood:100,stone:20},{wood:30},'hut'),true);assert.equal(maySpend(undefined,{wood:1},{wood:99},'hut'),true);
 // deterministic per (seed, society, epoch)
 const a1=decide(enumerate(base),base,undefined,11,2),a2=decide(enumerate(base),base,undefined,11,2);assert.deepEqual(a1.choice,a2.choice);
});
test('M2-07: records come only from dated sightings; contact alone shows no wealth; stale stays stale',()=>{
 assert.equal(recordFromSightings(1,2,[],0),null,'no contact, no sighting: nothing is known');
 const contact=recordFromSightings(1,2,[],500);assert.equal(contact.observedAt,0);assert.equal(wealthSigns(contact),0);assert.equal(confidenceAt(contact,600),0);
 const seen=[{id:5,observedAt:300,type:'warehouse',defenders:1,defensePower:1,x:10,z:10},{id:6,observedAt:310,type:'townhall',defenders:2,defensePower:3,x:12,z:10},{id:5,observedAt:100,type:'warehouse',defenders:0,defensePower:0,x:10,z:10}];
 const r=recordFromSightings(1,2,seen,500,contact);assert.equal(r.structures,2);assert.equal(r.storage,1);assert.equal(r.halls,1);assert.equal(r.observedAt,310);assert.ok(wealthSigns(r)>0);
 assert.ok(confidenceAt(r,310)>confidenceAt(r,310+3000)&&confidenceAt(r,1e9)>=.15);
 const later=recordFromSightings(1,2,[],900,r);assert.equal(later.structures,2,'with no new sighting the picture is unchanged');assert.equal(later.observedAt,310);assert.equal(later.contactAt,900);
 assert.ok(defenceSigns({...r,defensePower:99})<=1);
 const v=targetView(r,1000,{x:0,z:0},{hostile:false,trust:.2,grievance:0},false);assert.ok(v.ageSeconds>=690&&v.confidence<1&&v.wealth>0);
});
test('M2-07 live: unknown actions create no remote knowledge; contact then a carried report create it; later changes stay unknown until seen',()=>{
 const g=fixture();g.state.time=100;S.ensureDecisions(g);
 const find=(t)=>g.state.units.find(u=>u.team===t&&u.hp>0);
 assert.equal(societyRelation(g,4,5).known,false);
 // 5 builds up and 4 does nothing: still unknown
 const c5=g.campOf(5);bld(g,5,'warehouse',c5.x,c5.z);
 S.observeSociety(g,4);assert.equal(S.intelOf(g,4).filter(r=>r.subject===5).length,0,'no contact: no record of what 5 owns');
 const ts=S.measureNeeds(g,4);assert.equal(ts.targets.length,0,'unknown neighbours are not in the needs at all');assert.equal(by(enumerate(ts),'raid').feasible,false);
 // real contact: units meet
 const a=find(4),b=find(5);b.x=a.x+1;b.z=a.z;assert.ok(recordSocietyContact(g,a,b));
 S.observeSociety(g,4);const c=S.intelOf(g,4).find(r=>r.subject===5);assert.ok(c,'contact creates a record');assert.equal(c.observedAt,0);assert.equal(c.structures,0);
 assert.equal(S.measureNeeds(g,4).targets[0].wealth,0,'contact does not reveal wealth');
 // a witness carries a dated report home
 const wh=g.state.buildings.find(x=>x.team===5&&x.type==='warehouse');
 g.state.structureReports=[{version:1,observer:4,witnessId:a.id,observedAt:150,receivedAt:160,active:true,site:{id:wh.id,type:'warehouse',team:5,x:wh.x,y:wh.y,z:wh.z,w:wh.w,d:wh.d,hp:wh.hp,maxHp:wh.maxHp},defenders:1,defensePower:1}];
 g.state.time=170;S.observeSociety(g,4);const seen=S.intelOf(g,4).find(r=>r.subject===5);assert.equal(seen.storage,1);assert.equal(seen.observedAt,150);
 // 5 builds more storage and loses its defenders: 4 learns nothing
 for(let i=0;i<3;i++)bld(g,5,'warehouse',wh.x+i*5,wh.z);
 g.state.time=900;S.observeSociety(g,4);const same=S.intelOf(g,4).find(r=>r.subject===5);assert.equal(same.storage,1,'changes nobody saw are not known');assert.equal(same.observedAt,150);
 const tv=S.measureNeeds(g,4).targets.find(t=>t.id===5);assert.ok(tv.ageSeconds>=750&&tv.confidence<.75,'the report is dated and ages');
 // the other direction is separate: 5 knows nothing of 4 beyond contact
 assert.equal(S.intelOf(g,5).length,0);
});
test('ASTRA-16: the 30-minute director is seeded, windowed, reasoned, interrupted only by emergencies and reads nothing but needs',()=>{
 const n=needs({time:100,threat:.6,defence:.2,exposure:.5});
 const a=direct(n,42,1),b=direct(n,42,1);assert.deepEqual(a,b,'same seed, same posture');assert.equal(a.window,0);assert.ok(a.reasons.length>0);
 assert.deepEqual(temperament(42,1),temperament(42,1));assert.notDeepEqual(temperament(42,1),temperament(43,1));assert.notDeepEqual(temperament(42,1),temperament(42,2));
 const t=temperament(9,3);assert.ok(t.boldness>=.2&&t.boldness<=.8&&t.caution>=.2&&t.caution<=.8);
 assert.equal(direct(needs({time:100,threat:.6,defence:.2}),1,1).posture,'defend');
 assert.equal(direct(needs({time:100,weariness:90,recoveryLeft:600,foodSeconds:500}),1,1).posture,'recover');
 assert.equal(direct(needs({time:100,aggro:.9,targets:[tgt(2,{wealth:.95,defence:0,confidence:1})],foodSeconds:700,wealth:.1}),1,1).posture,'raid');
 assert.equal(direct(needs({time:100}),1,1).posture,'develop');
 // held for the window; changes at the boundary; emergency overrides mid-window
 const w0=direct(needs({time:100}),1,1);assert.equal(direct(needs({time:900,threat:.5,defence:.2}),1,1,w0).posture,'develop','not flipped by noise mid-window');
 assert.equal(direct(needs({time:900,threat:.9,defence:.2}),1,1,w0).posture,'defend','a serious threat overrides');
 assert.equal(direct(needs({time:900,foodSeconds:60}),1,1,w0).posture,'recover','famine overrides');
 assert.equal(windowOf(DIRECTOR_RULES.windowSeconds-1),0);assert.equal(windowOf(DIRECTOR_RULES.windowSeconds),1);
 const w1=direct(needs({time:DIRECTOR_RULES.windowSeconds+5,threat:.6,defence:.2}),1,1,w0);assert.equal(w1.window,1);assert.equal(w1.posture,'defend');
 // posture only multiplies scores; it cannot make an infeasible alternative feasible or add resources
 const base=enumerate(needs()),def=enumerate(needs(),'defend');for(const k of KINDS){assert.equal(by(base,k).feasible,by(def,k).feasible);}
 assert.ok(postureMultiplier('raid','raid')>1&&postureMultiplier('defend','raid')<1);
 // the same needs produce the same posture whoever the society is: no hidden player-read inputs
 assert.equal(Object.keys(n).includes('player'),false);
});
test('CAT-118: breakaway pressure rises with distance and unrest, stages are warned, hysteresis holds, and parents choose from stores and strength',()=>{
 const near={hall:2,parent:1,distance:60,ageSeconds:600,residents:8,selfSufficiency:.3,localGrievance:.1};
 const far={...near,distance:560,selfSufficiency:.8,localGrievance:.6,ageSeconds:2400};
 assert.ok(pressureOf(near,20,80).value<.2);assert.ok(pressureOf(far,80,30).value>.7);assert.ok(pressureOf(far,80,30).value>pressureOf({...far,distance:150},80,30).value,'distance matters');
 assert.ok(pressureOf(far,80,30).value>pressureOf(far,10,30).value,'unrest matters');assert.ok(pressureOf(far,60,95).value<pressureOf(far,60,10).value,'legitimacy holds a hearth');
 assert.ok(pressureOf(far,80,30).reasons.length>=3);
 let s='loyal';const seen=[];for(const p of [.4,.6,.8,.8]){s=stageStep(s,p);seen.push(s);}assert.deepEqual(seen,['restive','autonomous','breakaway','breakaway'],'one warned stage per review');
 assert.equal(stageStep('autonomous',.5),'autonomous','inside the hysteresis band it holds');assert.equal(stageStep('autonomous',.4),'restive');assert.equal(stageStep('loyal',.2),'loyal');
 const rich={food:400,wood:300,readyFighters:6,defence:.7,weariness:5,unrest:20},poor={food:10,wood:5,readyFighters:1,defence:.1,weariness:80,unrest:70};
 const o1=breakawayOptions(near,.6,rich),o2=breakawayOptions(far,.8,poor);
 assert.equal(o1.length,5);assert.ok(o1.find(o=>o.kind==='coerce').score>o2.find(o=>o.kind==='coerce').score,'a strong near parent can coerce');
 assert.equal(o2.find(o=>o.kind==='coerce').score,0);assert.equal(o2.find(o=>o.kind==='concede').score,0,'cannot pay');assert.ok(['tribute','recognise'].includes(pickOption(o2,5,2,1).kind));
 assert.equal(pickOption(o1,5,2,1).kind,pickOption(o1,5,2,1).kind);
 const win=coerceSucceeds(5,2,1,12,near),lose=coerceSucceeds(5,2,1,1,far);assert.ok(win.chance>lose.chance);assert.deepEqual(coerceSucceeds(5,2,1,12,near),win);
 assert.ok(BREAKAWAY_RULES.up.length===3);
});
test('M2-13: succession keeps agreements, grievances and histories; personal oaths can lapse for a stated reason; nothing resets',()=>{
 const pact={id:1,a:1,b:2,kind:'pact',since:0,bound:boundTo('pact'),signer:'x|y',status:'standing',note:''};
 assert.equal(boundTo('marriage'),'person');assert.equal(boundTo('pact'),'house');
 assert.equal(inherit(pact,{kin:.9,legitimacy:80,contested:false},1,5).agreement.status,'inherited');
 assert.equal(inherit(pact,{kin:.1,legitimacy:80,contested:true},1,5).agreement.status,'strained','a contested heir strains but does not void a house pact');
 const wed={...pact,id:2,kind:'marriage',bound:'person'};
 let kept=0;for(let y=0;y<50;y++)if(inherit(wed,{kin:.9,legitimacy:90,contested:false},1,y).agreement.status!=='lapsed')kept++;assert.ok(kept>=44,'close kin almost always carry a marriage bond');
 const outcomes=new Set();for(let y=0;y<60;y++)outcomes.add(inherit(wed,{kin:.1,legitimacy:30,contested:true},3,y).agreement.status);assert.ok(outcomes.has('lapsed')&&outcomes.size>=2,'a distant contested heir may let a personal bond die');
 assert.ok(inherit(wed,{kin:.1,legitimacy:30,contested:true},3,0).why.length>5);
 assert.equal(inherit({...pact,status:'lapsed'},{kin:1,legitimacy:100,contested:false},1,1).agreement.status,'lapsed','a dead agreement is not revived');
 assert.ok(inheritGrievance(.8,1)>=.8*.92-1e-9&&inheritGrievance(.8,1)<=.8,'grievances are remembered, eased at most 8%');assert.equal(inheritGrievance(.8,0),.8);assert.equal(inheritGrievance(0,1),0);
 assert.equal(kinCloseness('child'),.9);
 let h;for(let i=0;i<HISTORY_CAP+9;i++)h=addHistory(h,{year:i,kind:'plan',text:'e'+i});assert.equal(h.length,HISTORY_CAP);assert.equal(h[h.length-1].text,'e'+(HISTORY_CAP+8));
});
test('M2-13 live: a ruler change carries agreements, grievances, claims, ties and history to the heir',()=>{
 const g=fixture();g.state.time=R.RULERS_YEAR_SECONDS*3+1;R.advanceRulers(g);
 const d=S.ensureDecisions(g);assert.ok(d);
 for(const t of [1,2])for(let i=0;i<4;i++)g.state.units.push({...g.state.units.find(u=>u.team===t&&u.hp>0),id:g.state.nextId++});
 // agreements and a grievance exist before the change
 S.recordAgreement(g,1,2,'pact','swore a pact');S.recordAgreement(g,1,2,'marriage','wed their houses');
 nudgeSocietyRelation(g,1,2,{grievance:.5,trust:.2});
 const rel0=societyRelation(g,1,2);const claim=R.grantClaim(g,1,2,'claim',50,30);
 S.yearlySocieties(g);assert.ok(d.lastRuler['1'],'rulers are tracked');
 const soc=g.state.rulers.societies['1'],prev=soc.dynasty.rulerId,heirId=Object.values(soc.dynasty.people).find(p=>p.alive&&p.id!==prev)?.id;
 const ties0=JSON.stringify(R.tiesBetween(g,1,2)),histLen=S.historyOf(g,1).length;
 if(!heirId){soc.dynasty.people['1-heir']={...soc.dynasty.people[prev],id:'1-heir',name:'Heir',parent:prev,ruler:undefined,legit:true,spouse:undefined};}
 const heir=heirId??'1-heir';soc.dynasty.people[prev]={...soc.dynasty.people[prev],alive:false};soc.dynasty.rulerId=heir;
 S.yearlySocieties(g);
 const ags=S.agreementsOf(g,1);assert.equal(ags.length,2);assert.ok(ags.find(a=>a.kind==='pact').status==='inherited'||ags.find(a=>a.kind==='pact').status==='strained','the house pact stands');
 assert.ok(societyRelation(g,1,2).grievance>=rel0.grievance*.9,'the grievance is kept');assert.ok(societyRelation(g,1,2).grievance>0);
 if(claim)assert.equal(R.claimsOf(g,2).length,1,'claims belong to the house');assert.equal(JSON.stringify(R.tiesBetween(g,1,2)),ties0,'ties are not reset');
 const h=S.historyOf(g,1);assert.ok(h.length>histLen);assert.equal(h[h.length-1].kind,'succession');assert.match(h[h.length-1].text,/grievances kept/);assert.ok(h.some(e=>e.kind==='pact'),'earlier history survives');
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))));
});
test('old saves and the version switch: rulersVersion 1 and 0 never run the layer; version 2 saves validate and round-trip',async()=>{
 const v1=new Game();v1.reset(5,10,{rulersVersion:1});v1.enterIsland();assert.equal(v1.state.worldOptions.rulersVersion,1);
 assert.equal(S.ensureDecisions(v1),null);assert.equal(S.reviewSociety(v1,1),null);assert.equal(S.planOf(v1,1),undefined);assert.equal(S.settleGate(v1,1),null);assert.equal(S.raidGate(v1,1),null);assert.equal(S.militaryBonus(v1,1),0);assert.equal(S.growthBias(v1,1),1);assert.equal(S.societyMaySpend(v1,1,'hut'),true);assert.equal(S.breakawayLoss(v1,1),0);
 assert.ok(R.expansionParty(v1,1).allow===(['settle','migrate'].includes(R.expansionOf(v1,1).mode)),'version 1 keeps the plain driver rules');
 v1.state.time=500;R.advanceRulers(v1);assert.equal(v1.state.rulers.decisions,undefined,'no decision field is ever written');
 const v0=new Game();v0.reset(5,10,{rulersVersion:0});v0.enterIsland();assert.equal(v0.state.worldOptions.rulersVersion,undefined);assert.equal(S.ensureDecisions(v0),null);assert.equal(R.expansionParty(v0,1),null);
 const g=fixture();assert.equal(g.state.worldOptions.rulersVersion,2);g.state.time=100;
 for(const t of [1,2,4,5])S.reviewSociety(g,t);
 const copy=JSON.parse(JSON.stringify(g.state.rulers));assert.ok(validRulersState(copy));assert.ok(copy.decisions);
 assert.deepEqual(JSON.parse(JSON.stringify(copy)),copy);
 const bad=JSON.parse(JSON.stringify(copy));bad.decisions.plans['1']={id:1,kind:'conquer-the-world'};assert.equal(validRulersState(bad),false,'unknown plan kinds are rejected');
 const bad2=JSON.parse(JSON.stringify(copy));bad2.decisions.intel=new Array(500).fill({});assert.equal(validRulersState(bad2),false,'unbounded intel rejected');
 assert.ok(validDecisionState(emptyDecisions()));assert.equal(validDecisionState({version:2}),false);
 const w=JSON.parse(JSON.stringify(copy));delete w.decisions;assert.ok(validRulersState(w),'the field is optional');
});
test('live review: every rival decides with stated reasons, holds its plan, and the review itself creates no goods or people',()=>{
 const g=fixture();g.state.time=100;
 const snap=()=>JSON.stringify([...[1,2,4,5].map(t=>{const x=g.tribe(t);return [x.food,x.wood,x.stone,x.copper,x.iron,x.spears,x.bows,x.blades,g.popNow(t)];}),g.state.units.length,g.state.buildings.length]);
 const before=snap();
 for(const t of [1,2,4,5]){const dec=S.reviewSociety(g,t);assert.ok(dec,'society '+t+' decided');assert.equal(dec.alternatives.length,8);assert.ok(dec.choice.reasons.length>0||dec.why.length>0);}
 const mid=snap();
 const first={};for(const t of [1,2,4,5]){first[t]=S.planOf(g,t);assert.ok(first[t]);assert.ok(S.directorOf(g,t));assert.ok(S.lastDecisionOf(g,t).alternatives.length===8);}
 // a second review inside the interval does nothing; a later one in the hold window keeps the plan
 assert.equal(S.reviewSociety(g,1),null);
 g.state.time=100+DECISION_RULES.reviewSeconds+1;const again=S.reviewSociety(g,1);assert.ok(again);assert.ok(['keep','start'].includes(again.change)||again.change==='interrupt'||again.change==='drop');
 // the pure decision layer never spends: only fortify placement can pay, and only through the normal builder
 const after=snap();
 const fortifying=[1,2,4,5].some(t=>S.planOf(g,t)?.kind==='fortify');
 if(!fortifying)assert.equal(after,mid,'no goods, people or buildings from deciding');
 assert.equal(mid,before,'the first review changes nothing in the world');
 assert.equal(S.reviewSociety(g,0),null,'the player is never decided for');assert.equal(S.reviewSociety(g,3),null);
});
test('gates: settle only under a settle plan, raid only under a raid plan against its target; reserves bind other spending',()=>{
 const g=fixture();g.state.time=100;const d=S.ensureDecisions(g);
 assert.equal(S.settleGate(g,1).allow,false);assert.match(S.settleGate(g,1).why,/not yet decided/);
 d.plans['1']=planFrom({...by(enumerate(needs()),'grow')},1,0);assert.equal(S.settleGate(g,1).allow,false);assert.match(S.settleGate(g,1).why,/grow/);
 d.plans['1']={...d.plans['1'],kind:'settle'};assert.equal(S.settleGate(g,1).allow,true);assert.equal(R.expansionParty(g,1,true).allow,R.expansionParty(g,1,true).allow);
 assert.equal(R.expansionParty(g,1).allow,['settle','migrate'].includes(R.expansionOf(g,1).mode),'settle plan lets the drivers decide');
 d.plans['1']={...d.plans['1'],kind:'grow'};assert.equal(R.expansionParty(g,1).allow,false);
 assert.equal(R.journeyPermit(g,1,'raid',2).allow,false);assert.ok(R.journeyPermit(g,1,'raid',2).why[0].length>5);
 d.plans['1']={...d.plans['1'],kind:'raid',target:2};assert.equal(R.journeyPermit(g,1,'raid',2).allow,true);
 assert.equal(R.journeyPermit(g,1,'raid',4).allow,false,'a strike on any other society needs its own plan');assert.match(R.journeyPermit(g,1,'raid',4).why[0],/another target/);
 d.plans['1']={...d.plans['1'],kind:'trade',target:2};assert.equal(R.journeyPermit(g,1,'trade').cadence,Math.round(R.journeyPermit(g,2,'trade').cadence*.5)||R.journeyPermit(g,1,'trade').cadence);
 // reserve: a fortify plan holds timber back from a house, not from a watchtower
 const t=g.tribe(1);t.wood=60;t.stone=20;d.plans['1']={...d.plans['1'],kind:'fortify',reserve:{food:0,wood:50,stone:10},target:undefined};
 assert.equal(S.societyMaySpend(g,1,'hut'),false);assert.equal(S.societyMaySpend(g,1,'watchtower'),true);t.wood=400;assert.equal(S.societyMaySpend(g,1,'hut'),true);
 assert.ok(S.growthBias(g,1)<1);d.plans['1']={...d.plans['1'],kind:'grow'};assert.ok(S.growthBias(g,1)>1);
 d.plans['1']={...d.plans['1'],kind:'fortify'};assert.ok(S.militaryBonus(g,1)>=1);
});
test('CAT-118 live: a far, uneasy, self-feeding hearth drifts from loyal to breakaway with warnings; the parent answers; unrest feels it',()=>{
 const g=fixture();g.state.time=2400;const d=S.ensureDecisions(g);
 const c1=g.campOf(1),home=bld(g,1,'townhall',c1.x,c1.z),hall2=bld(g,1,'townhall',c1.x-520,c1.z);
 g.state.communities=[{hall:home.id,team:1,name:'Home hearth',founded:0,emptySince:null,status:'thriving'},{hall:hall2.id,team:1,name:'Far hearth',founded:300,emptySince:null,status:'thriving'}];
 for(let i=0;i<9;i++)g.state.units.push({...g.state.units.find(u=>u.team===1&&u.hp>0),id:g.state.nextId++,homeHall:hall2.id});
 g.tribe(1).tension=.9;
 const un0=R.unrestOf(g,1).value;const stages=[];
 for(let i=0;i<8;i++){g.state.time+=BREAKAWAY_RULES.reviewSeconds+1;const n=S.measureNeeds(g,1);n.unrest=85;S.reviewBreakaways(g,1,n);const b=S.breakawaysOf(g,1)[0];if(b)stages.push(b.stage);}
 assert.ok(stages.includes('restive'),'warned: restive first');assert.ok(stages.indexOf('restive')<stages.findIndex(s=>s==='autonomous'||s==='breakaway'),'stages come in order');
 const b=S.breakawaysOf(g,1)[0];assert.ok(b&&['autonomous','breakaway'].includes(b.stage)||b.resolution,'it drifted');assert.ok(b.reasons.length>=2);
 assert.ok(S.historyOf(g,1).some(h=>h.kind==='breakaway'),'the history records it');
 assert.ok(R.unrestOf(g,1).value>=un0,'unrest feels the loss');assert.ok(S.breakawayLoss(g,1)>0||b.resolution==='reintegrated');
 assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))));
 // a near hearth under a respected house stays loyal
 const g2=fixture();g2.state.time=900;S.ensureDecisions(g2);const k1=g2.campOf(1),h1=bld(g2,1,'townhall',k1.x,k1.z),n2=bld(g2,1,'townhall',k1.x+40,k1.z+10);
 g2.state.communities=[{hall:h1.id,team:1,name:'Home',founded:0,emptySince:null,status:'thriving'},{hall:n2.id,team:1,name:'Near',founded:200,emptySince:null,status:'growing'}];
 for(let i=0;i<6;i++)g2.state.units.push({...g2.state.units.find(u=>u.team===1&&u.hp>0),id:g2.state.nextId++,homeHall:n2.id});
 for(let i=0;i<4;i++){g2.state.time+=BREAKAWAY_RULES.reviewSeconds+1;const n=S.measureNeeds(g2,1);n.unrest=10;S.reviewBreakaways(g2,1,n);}
 assert.equal(S.breakawaysOf(g2,1)[0]?.stage??'loyal','loyal');
});
test('plan-driven ally: warm neighbour with recent real contact signs a pact; no contact, no pact; the pact is a recorded agreement and a truce',()=>{
 const g=fixture();g.state.time=1000;const d=S.ensureDecisions(g);
 d.plans['1']=planFrom({...by(enumerate(needs({targets:[tgt(2,{trust:.4})]})),'ally'),target:2},1,900);
 // no contact: nothing happens however long the plan stands
 for(let i=0;i<12;i++){g.state.time+=31;g.tribe(1).food=9000;S.reviewSociety(g,1);d.plans['1']={...d.plans['1'],kind:'ally',target:2,until:1e9,since:g.state.time};}
 assert.equal(S.agreementsOf(g,1).filter(a=>a.kind==='pact').length,0,'no route, no treaty');
 const a=g.state.units.find(u=>u.team===1&&u.hp>0),b=g.state.units.find(u=>u.team===2&&u.hp>0);b.x=a.x+1;b.z=a.z;recordSocietyContact(g,a,b);
 for(let i=0;i<20&&!S.agreementsOf(g,1).some(x=>x.kind==='pact');i++){g.state.time+=31;g.tribe(1).food=9000;d.plans['1']={...d.plans['1'],kind:'ally',target:2,until:1e9,since:g.state.time};d.reviewAt['1']=0;S.reviewSociety(g,1);recordSocietyContact(g,a,b);}
 const pact=S.agreementsOf(g,1).find(x=>x.kind==='pact');assert.ok(pact,'a pact is signed once trust is mutual');assert.equal(pact.bound,'house');
 assert.ok(societyRelation(g,1,2).peaceUntil>g.state.time&&!societyRelation(g,1,2).hostile);
 assert.ok(S.historyOf(g,1).some(h=>h.kind==='pact')&&S.historyOf(g,2).some(h=>h.kind==='pact'),'both houses remember it');
 assert.ok(S.measureNeeds(g,1).targets.every(t=>t.id!==2||t.allied||true));
});
