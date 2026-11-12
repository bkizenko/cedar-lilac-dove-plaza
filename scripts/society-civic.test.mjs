import test from 'node:test';import assert from 'node:assert/strict';
import * as C from '../src/game/societyCivic.ts';
const pop=30,origin={kinship:.9,craft:.1,faith:.1,hospitality:.1,martial:.9};
test('M2-11 identity: a few newcomers barely move it, a flood is bounded, refugees weigh less, nothing resets',()=>{
 const id=C.seedIdentity(7,1,pop);assert.equal(id.continuity,1);
 const few=C.applyIdentity(id,{kind:'arrival',count:2,pop,origin});
 const flood=C.applyIdentity(id,{kind:'arrival',count:60,pop,origin});
 const refs=C.applyIdentity(id,{kind:'refugees',count:60,pop,origin});
 const move=(a)=>C.TRAITS.reduce((s,k)=>s+Math.abs(a.traits[k]-id.traits[k]),0);
 assert.ok(move(few)<move(flood));assert.ok(move(refs)<=move(flood)+.06);
 for(const k of C.TRAITS)assert.ok(Math.abs(flood.traits[k]-id.traits[k])<=C.IDENTITY_RULES.maxShift+.011,'bounded per event');
 assert.ok(flood.continuity<1&&flood.continuity>0);assert.equal(flood.adopted,60);assert.ok(refs.traits.hospitality>=id.traits.hospitality);
 assert.deepEqual(C.applyIdentity(id,{kind:'arrival',count:0,pop,origin}),id);
 let x=flood;for(let i=0;i<20;i++)x=C.applyIdentity(x,{kind:'aging',years:1,births:3,deaths:2,pop:90});
 assert.ok(x.adopted<flood.adopted,'incomers are assimilated over generations');assert.ok(x.continuity>flood.continuity,'inertia pulls the core back');assert.deepEqual(x.core,id.core);
});
test('M2-11 identity: departures, families and leadership are bounded and recorded',()=>{
 let id=C.seedIdentity(3,2,40);
 const gone=C.applyIdentity(id,{kind:'departure',count:6,pop:40,breakaway:true});assert.ok(gone.pride<id.pride);assert.ok(gone.grudges>0);assert.equal(gone.native+gone.adopted,id.native+id.adopted-6);
 const fam=C.applyIdentity(id,{kind:'family',outsideMarriages:2,pop:40,origin});assert.ok(C.TRAITS.some(k=>fam.traits[k]!==id.traits[k]));
 const leader={kinship:.2,craft:.9,faith:.5,hospitality:.5,martial:.5};
 const calm=C.applyIdentity(id,{kind:'leadership',legitimacy:80,contested:false,kin:.9,leader});
 const bad=C.applyIdentity(id,{kind:'leadership',legitimacy:80,contested:true,kin:.1,leader});const trained=C.applyIdentity(id,{kind:'leadership',legitimacy:80,contested:true,kin:.1,leader,trained:true});
 assert.ok(bad.pride<calm.pride);assert.ok(trained.pride>bad.pride,'learning softens a contested succession');
 const adj=C.adjustContinuity(id,-.5);assert.equal(adj.adj,-.2);assert.ok(adj.continuity<id.continuity);assert.ok(C.validIdentity(adj));
 assert.ok(C.validIdentity(id));assert.equal(C.validIdentity({...id,pride:2}),false);
});
test('M2-14 prehistory is bounded, seeded, discloses asymmetry and never touches sizes',()=>{
 const soc=[{team:0,size:12,name:'You'},{team:1,size:40,name:'Redcliff'},{team:2,size:18,name:'Ashfen'},{team:4,size:25,name:'Uruhan'}];
 const a=C.runPrehistory(5,soc),b=C.runPrehistory(5,soc),c=C.runPrehistory(6,soc);
 assert.deepEqual(a,b);assert.notDeepEqual(a.ties,c.ties);assert.equal(a.steps,C.PREHISTORY_RULES.steps);
 assert.deepEqual(a.societies.map(s=>s.size),[12,40,18,25]);assert.ok(a.societies.every(s=>s.events.length<=C.PREHISTORY_RULES.maxEventsPerSociety+1&&s.events[0].kind==='founding'));
 assert.equal(a.ties.length,6);assert.ok(a.disclosure.length>=3&&a.disclosure.length<=5);assert.match(a.disclosure[0],/Redcliff.*40.*You.*12/);assert.match(a.disclosure.at(-1),/no society is handed goods/);
 assert.ok(C.validPrehistory(a));assert.ok(a.societies.some(s=>s.pride!==a.societies[0].pride));
});
test('CAT-117 regional logistics: floors, distance, loyalty and need decide, goods are in transit',()=>{
 const o={hall:9,distance:500,residents:8,food:900,wood:50,stone:0,foodPerPerson:.05,loyalty:.9,localNeed:.1};
 const loyal=C.answerRequest(o,{food:300,wood:0,stone:0,centralNeed:.8},1,1);
 assert.ok(loyal.obeyed);assert.ok(loyal.grant.food>0&&loyal.grant.food<=o.food-C.localFloor(o));assert.equal(loyal.transitSeconds,Math.round(500/C.AUTONOMY_RULES.walkMetersPerSecond));
 const cold=C.answerRequest({...o,loyalty:.1,localNeed:.7},{food:300,wood:0,stone:0,centralNeed:.3},1,1);assert.equal(cold.obeyed,false);assert.deepEqual(cold.grant,{food:0,wood:0,stone:0});assert.ok(cold.grievance>0);
 const poor=C.answerRequest({...o,food:C.localFloor(o)},{food:300,wood:0,stone:0,centralNeed:.8},1,1);assert.equal(poor.grant.food,0,'never below the local floor');
 const near=C.answerRequest({...o,distance:60,loyalty:.5},{food:50,wood:0,stone:0,centralNeed:.5},2,1),far=C.answerRequest({...o,distance:600,loyalty:.5},{food:50,wood:0,stone:0,centralNeed:.5},2,1);assert.ok(near.willingness>far.willingness);
 const adm=C.answerRequest({...o,distance:600,loyalty:.5},{food:50,wood:0,stone:0,centralNeed:.5},2,1,true);assert.ok(adm.willingness>far.willingness,'administration reaches far hearths');
 assert.ok(C.localDecisionShare(600)>C.localDecisionShare(100));assert.ok(C.localDecisionShare(600,true)<C.localDecisionShare(600));
});
test('M4-07 complexity grows with size, diversity, distance and power; negotiation stages are warned one at a time',()=>{
 const base={pop:6,diversity:0,distance:20,power:.1,unrest:5,legitimacy:80};
 const small=C.complexityScore(base),big=C.complexityScore({pop:150,diversity:.6,distance:500,power:.8,unrest:5,legitimacy:80});
 assert.ok(big.score>small.score);assert.ok(C.COMPLEXITY.indexOf(big.level)>C.COMPLEXITY.indexOf(small.level));
 for(const k of ['pop','diversity','distance','power']){const lo=C.complexityScore({...base,[k]:k==='pop'?6:0}).score,hi=C.complexityScore({...base,[k]:k==='pop'?100:k==='distance'?500:.9}).score;assert.ok(hi>lo,k);}
 let p;const seen=[],hot={pop:150,diversity:.7,distance:550,power:.8,unrest:80,legitimacy:20};
 for(let i=0;i<10;i++){p=C.politicsStep(p,hot,i*120);seen.push(p.stage);}
 const order=seen.map(s=>C.NEGOTIATION.indexOf(s));for(let i=1;i<order.length;i++)assert.ok(order[i]-order[i-1]<=1,'never skips a stage');assert.ok(order.at(-1)>=3);
 const cool=C.politicsStep(p,{...hot,unrest:0,legitimacy:90},2000,.1);assert.ok(C.NEGOTIATION.indexOf(p.stage)-C.NEGOTIATION.indexOf(cool.stage)<=1);
 assert.ok(C.validPolitics(p));assert.ok(C.NEGOTIATION_WARNING[p.stage].length>5);
});
test('M4-09 institutions need real houses and numbers, cost upkeep, lapse unpaid and have bounded effects',()=>{
 const cx={pop:30,complexityLevel:3,buildings:{townhall:1,temple:1,warehouse:1,workshop:1}};
 for(const k of C.INSTITUTIONS)assert.ok(C.mayEstablish(k,cx).ok,k);
 assert.equal(C.mayEstablish('ritual',{...cx,buildings:{townhall:1}}).ok,false);assert.equal(C.mayEstablish('council',{...cx,pop:3}).ok,false);assert.equal(C.mayEstablish('administration',{...cx,complexityLevel:0}).ok,false);
 const all=C.INSTITUTIONS.map(kind=>({kind,since:0,paidUntil:1,level:3,lapsed:false}));
 const fx=C.effectsOf(all);assert.ok(fx.consent<=.24&&fx.identityShield<=.45&&fx.successionSoftening<=.6&&fx.decisionDelay<=1.3&&fx.adminReach);
 assert.deepEqual(C.effectsOf(all.map(i=>({...i,lapsed:true}))),C.NO_EFFECTS);assert.ok(C.effectsOf([{...all[0],level:1}]).decisionDelay>1,'a council slows decisions');
 const cost=C.upkeepOf(all[1]);assert.equal(cost.food,18);assert.ok(C.canPay({food:20,wood:0,stone:0},cost)&&!C.canPay({food:5,wood:9,stone:9},cost));
});
test('M4-08 proposals: one at a time, consented by legitimacy and council, with legitimacy and continuity consequences',()=>{
 const l={rulerId:'r1',legitimacy:70,ambition:1,caution:0,warm:.8};
 const ctx={foodSeconds:300,housing:.5,threat:0,time:100,nextId:1,stage:'quiet',outpostsRestive:0};
 let p=null,n=1;for(;n<40&&!p;n++)p=C.propose(l,{...ctx,nextId:n},[],4);assert.ok(p,'an ambitious ruler proposes');assert.equal(p.kind,'commitment');assert.equal(p.status,'open');
 assert.equal(C.propose(l,ctx,[p],4),null,'only one open');
 const hi=C.consentFor(p,l,{consent:.2,stage:'quiet'},1,1),lo=C.consentFor(p,{...l,legitimacy:10},{consent:0,stage:'rupture'},1,1);assert.ok(hi.odds>lo.odds);
 const acc={...p,status:'accepted',until:500};
 const kept=C.settleProposal(acc,true,200);assert.equal(kept.status,'kept');assert.ok(kept.legitimacyDelta>0&&kept.continuityDelta>0);
 const broke=C.settleProposal(acc,false,600);assert.equal(broke.status,'broken');assert.ok(broke.legitimacyDelta<0&&broke.continuityDelta<0);
 assert.equal(C.settleProposal(acc,false,300).status,'accepted');assert.equal(C.settleProposal({...p,until:150},false,200).status,'declined');
 assert.equal(C.boundLegitimacy(99),C.PROPOSAL_RULES.legitimacyBound);assert.ok(C.validProposal(kept));
});
test('M2-16 chapter chain names the first broken link',()=>{
 const ok={foodSeconds:1200,halls:2,knownSocieties:2,routes:1,exposure:.3,independentPlans:3,societies:4,distinctPlanKinds:2};
 assert.ok(C.chapterChain(ok).complete);
 assert.equal(C.chapterChain({...ok,foodSeconds:100}).broken,'surplus');assert.equal(C.chapterChain({...ok,halls:1,knownSocieties:0,routes:0,exposure:0}).broken,'access');
 assert.equal(C.chapterChain({...ok,exposure:0}).broken,'exposure');assert.equal(C.chapterChain({...ok,distinctPlanKinds:1}).broken,'decisions');
});
test('civic state validates, is bounded, and rejects junk',()=>{
 const s=C.emptyCivic();assert.ok(C.validCivic(s));s.identity['1']=C.seedIdentity(1,1);s.legitimacy['1']=3;assert.ok(C.validCivic(s));
 assert.equal(C.validCivic({...s,version:2}),false);assert.equal(C.validCivic({...s,legitimacy:{'1':99}}),false);assert.equal(C.validCivic({...s,identity:{'1':{}}}),false);
});
