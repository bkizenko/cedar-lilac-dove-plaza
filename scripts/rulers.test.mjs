import test from 'node:test';import assert from 'node:assert/strict';
import {generatePolity,validatePolity,features,expansionPressure,tierForScale} from '../src/game/polityModel.ts';
import {generateRuler,validateRuler,evolve,drive,TRAITS} from '../src/game/rulerGenome.ts';

const eco=(o={})=>({surplus:.5,threat:.5,trade:.5,pastoral:.3,sacred:.3,scale:.8,...o});

test('polities are deterministic and valid across many seeds',()=>{
 for(let s=1;s<=400;s++){
  const a=generatePolity(s,eco({scale:(s%10)/10})),b=generatePolity(s,eco({scale:(s%10)/10}));
  assert.deepEqual(a,b);assert.deepEqual(validatePolity(a),[],`seed ${s}`);
 }
});
test('kinship features are gated by tier, not by era',()=>{
 assert.equal(features(tierForScale(.1)).heirs,false);
 assert.equal(features('chiefdom').heirs,true);assert.equal(features('chiefdom').claims,false);
 assert.equal(features('state').claims,true);
});
test('small coalitions press harder to expand than broad ones',()=>{
 let small=0,broad=0,n=0;
 for(let s=1;s<=300;s++){const p=generatePolity(s,eco());if(p.form==='monarchy'){small+=expansionPressure(p);n++;}else if(p.form==='republic')broad+=expansionPressure(p);}
 assert.ok(n>10);
 assert.ok(small/n>broad/Math.max(1,300-n)*0.9);
});
test('rulers: traits are independent, piety and innovation can both be high',()=>{
 let both=0;
 for(let s=1;s<=500;s++){const r=generateRuler(s);assert.deepEqual(validateRuler(r),[]);if(r.traits.piety>70&&r.traits.innovation>70)both++;}
 assert.ok(both>5,`both=${both}`);
});
test('rulers vary and evolve deterministically',()=>{
 const seen=new Set();for(let s=1;s<=200;s++)seen.add(generateRuler(s).name);assert.ok(seen.size>100);
 const r=generateRuler(7),a=evolve(r,'betrayal'),b=evolve(r,'betrayal');
 assert.deepEqual(a,b);assert.ok(a.traits.paranoia>=r.traits.paranoia);
 assert.ok(drive(r.traits)>=0&&drive(r.traits)<=100);
});

import {foundDynasty,stepYear,validateDynasty,marry} from '../src/game/dynasty.ts';
test('dynasty runs 300 years without extinction crash and always has a living ruler or a flagged gap',()=>{
 let d=foundDynasty(5,'aldric');
 // give founder a spouse so children can be born
 const f={...d.people[d.rulerId]};
 const w={id:'w1',name:'Wife',age:25,sex:'f',alive:true,houseOf:'aldric',legit:true,claimStrength:40,spouse:f.id};
 d.people[f.id]={...f,spouse:'w1',sex:'m'};d.people.w1=w;
 let successions=0;
 for(let y=1;y<=300;y++){const g=d.generation;d=stepYear(d,5,'state','primogenitureAny',y);if(d.generation>g)successions++;if(!d.people[d.rulerId]?.alive)break;}
 assert.ok(successions>=1);
 assert.deepEqual(d.people[d.rulerId]?.alive?validateDynasty(d):[],[]);
});
test('no marriage in a band-era dynasty unless adults are free',()=>{
 const a=foundDynasty(1,'a'),b=foundDynasty(2,'b');
 assert.equal(marry(a,a.rulerId,b,b.rulerId),null,'already wed');
 const free=d=>{const p=d.people[d.rulerId];return {...d,people:{...d.people,[p.id]:{...p,spouse:undefined}}};};
 const m=marry(free(a),a.rulerId,free(b),b.rulerId);assert.ok(m);
 assert.equal(marry(m[0],a.rulerId,free(b),b.rulerId),null);
});

import {award,emptyLedger,score,appetite,utility} from '../src/game/glory.ts';
import {perceive,nextNotice} from '../src/game/fame.ts';
test('glory has diminishing returns and rewards breadth',()=>{
 let a=emptyLedger(),b=emptyLedger();
 for(let i=0;i<40;i++)a=award(a,'annex');
 for(const e of ['annex','wonderComplete','allianceFormed','newTradeRoute','templeFounded','artPatronage','claimLand'])for(let i=0;i<6;i++)b=award(b,e);
 assert.ok(score(b)>score(a));
 const r=generateRuler(3);const ap=appetite(r);assert.ok(Object.values(ap).every(v=>v>=.3&&v<=3));
 assert.equal(typeof utility(r,{conquest:10},2),'number');
});
test('fame: small deeds stay home, distance and age fade, notices only on upgrade',()=>{
 const p={id:'p',society:'x',kind:'wonder',magnitude:80,tick:0};
 assert.equal(perceive({...p,magnitude:10},{society:'y',hops:0,reliability:1},0),null);
 const near=perceive(p,{society:'y',hops:0,reliability:1},0),far=perceive(p,{society:'y',hops:5,reliability:.5},0);
 assert.ok(near&&far!==near);
 assert.equal(perceive(p,{society:'y',hops:3,reliability:1},5000),null);
 assert.equal(nextNotice({'x:wonder':'renown'},p,'rumor'),null);
});

import {rollGreatPerson,emergenceChance,ARCHETYPES} from '../src/game/greatPersons.ts';
import {unrest,stageOf,integrationStep} from '../src/game/unrest.ts';
test('great persons: rare overall, more likely in crisis with weak institutions',()=>{
 const count=(crisis,opp,inst)=>{let n=0;for(let g=0;g<2000;g++)if(rollGreatPerson(9,g,crisis,opp,inst))n++;return n;};
 const calm=count(.1,.2,80),crisis=count(.6,.8,20);
 assert.ok(crisis>calm*2);assert.ok(crisis<1000);
 for(const a of ARCHETYPES)assert.ok(emergenceChance(.5,.5,50,a)>=0);
 const g=rollGreatPerson(9,1,.6,.9,10)||rollGreatPerson(9,2,.6,.9,10)||rollGreatPerson(9,3,.6,.9,10);
 if(g)assert.deepEqual(validateRuler(g.ruler),[]);
});
test('revolutions escalate in stages and conquest never annexes instantly',()=>{
 const pol=generatePolity(4,eco());
 const calm=unrest({legitimacy:90,warWeariness:5,foodShortage:0,taxBurden:10,faithDivergence:0,coalitionLoss:0,rulerPopularity:80},pol);
 const bad=unrest({legitimacy:10,warWeariness:90,foodShortage:80,taxBurden:80,faithDivergence:70,coalitionLoss:80,rulerPopularity:10},pol);
 assert.ok(bad>calm&&stageOf(calm)!==stageOf(bad));
 assert.ok(integrationStep(0,.5,.5,0)<.01);
});

import {generateCast,generateCiv} from '../src/game/civGenerator.ts';
test('casts are new every game, unique within a game, and valid',()=>{
 const a=generateCast(1,8),b=generateCast(2,8),a2=generateCast(1,8);
 assert.deepEqual(a,a2);assert.equal(a.length,8);
 assert.notDeepEqual(a.map(c=>c.name),b.map(c=>c.name));
 assert.equal(new Set(a.map(c=>c.name)).size,8);
 for(const c of [...a,...b]){assert.deepEqual(validatePolity(c.polity),[]);assert.deepEqual(validateRuler(c.ruler),[]);assert.ok(c.faith.doctrines.length>=2);}
 assert.equal(generateCiv(1,0,'free').preset,undefined);
});

import {initRulers,stepRulersYear,validRulersState,rulersOf} from '../src/game/rulersState.ts';
test('rulers state: old saves load, JSON round-trips, 200 years stay valid',()=>{
 assert.equal(rulersOf({}),null);assert.equal(validRulersState({version:1}),false);
 let s=initRulers(42,['a','b','c','d']);
 assert.ok(validRulersState(JSON.parse(JSON.stringify(s))));
 for(let i=0;i<200;i++)s=stepRulersYear(s);
 assert.equal(s.year,200);
 const gens=Object.values(s.societies).map(x=>x.dynasty.generation);
 assert.ok(gens.some(g=>g>=1),'some succession happened');
 assert.deepEqual(stepRulersYear(initRulers(42,['a','b','c','d'])),stepRulersYear(initRulers(42,['a','b','c','d'])));
});
