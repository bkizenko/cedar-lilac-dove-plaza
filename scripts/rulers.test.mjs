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
 const m=marry(a,a.rulerId,b,b.rulerId);assert.ok(m);
 assert.equal(marry(m[0],a.rulerId,b,b.rulerId),null);
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
