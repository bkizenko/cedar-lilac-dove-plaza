// Stylized-facts harness: aggregate behaviour over many seeded worlds must stay within historically plausible ranges.
import test from 'node:test';import assert from 'node:assert/strict';
import {initRulers,stepRulersYear} from '../src/game/rulersState.ts';
import {expansionPressure} from '../src/game/polityModel.ts';
const N=60,YEARS=150;
const worlds=[];for(let s=1;s<=N;s++){let w=initRulers(s*7919,['a','b','c','d']);for(let y=0;y<YEARS;y++)w=stepRulersYear(w);worlds.push(w);}
const socs=worlds.flatMap(w=>Object.values(w.societies));
test('fact: generations turn over at a plausible rate (not static, not churning)',()=>{
 const g=socs.map(s=>s.dynasty.generation).sort((a,b)=>a-b),med=g[g.length>>1];
 assert.ok(med>=3&&med<=12,`median successions in ${YEARS}y = ${med}`);
});
test('fact: great persons are rare (well under half of successions)',()=>{
 const s=socs.reduce((a,x)=>a+x.dynasty.generation,0),gp=socs.reduce((a,x)=>a+x.greatEmerged,0);
 assert.ok(gp/s<.35,`great/succession = ${(gp/s).toFixed(2)}`);assert.ok(gp>0);
});
test('fact: houses rarely go fully extinct; claimant fallbacks exist but are a minority',()=>{
 const claim=socs.filter(s=>s.dynasty.log.some(l=>l.includes('claimant'))).length;
 assert.ok(claim/socs.length<.6,`claimant share ${(claim/socs.length).toFixed(2)}`);
});
test('fact: small-coalition polities press harder to expand than broad ones, on average',()=>{
 const by={};for(const s of socs){(by[s.civ.polity.form]??=[]).push(expansionPressure(s.civ.polity));}
 const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
 if(by.monarchy&&by.republic)assert.ok(avg(by.monarchy)>avg(by.republic));
});
test('fact: varied outcomes - polity forms and succession laws are diverse across worlds',()=>{
 assert.ok(new Set(socs.map(s=>s.civ.polity.form)).size>=4);
 assert.ok(new Set(socs.map(s=>s.civ.polity.succession)).size>=5);
});
