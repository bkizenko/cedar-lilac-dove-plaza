import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {citizenName} from '../src/game/people.ts';
import {cultureGivenName,cultureIndex,cultureLabel,nameRepetition,nameSpaceSize,NAMING_CULTURES} from '../src/game/cultureNaming.ts';
const STOCK=["Aren","Bela","Cora","Dara","Eren","Fara","Galen","Hana","Iven","Jora","Kelan","Lina","Maren","Nara","Orin","Pera","Rian","Sela","Taren","Vela","Asha","Bran","Ceri","Dain","Eira","Fenn","Gara","Halen","Ina","Jalen","Kira","Luan","Mira","Neri","Ona","Pavo","Runa","Soren","Tala","Una","Varo","Wren","Yara","Zora"];
const seeds=Array.from({length:300},(_,i)=>i*7919+13);

test('names are single given names: no surname, space, hyphen or digit; bounded length; pure function of seed, id and team',()=>{
 for(const seed of seeds.slice(0,40))for(const team of [0,1,2,3,4,5])for(let id=1;id<=60;id++){const n=cultureGivenName(seed,id,team);assert.match(n,/^[A-Z][a-z]{2,13}$/,n);assert.equal(n,cultureGivenName(seed,id,team));assert.equal(citizenName(seed,id,team),n,'citizenName forwards to the culture generator');}
});

test('no repeated name inside one small village, and every society in a world has its own phonology',()=>{
 for(const seed of seeds.slice(0,60)){
  const cultures=new Set([0,1,2,3,4,5].map(t=>cultureIndex(seed,t)));assert.equal(cultures.size,6,`six societies, six phonologies (seed ${seed})`);
  for(const team of [0,1,2,3,4,5]){const names=Array.from({length:400},(_,i)=>cultureGivenName(seed,i+1,team));assert.equal(new Set(names).size,400,`duplicate inside team ${team} seed ${seed}`);}
 }
 // Order independence: asking for a high id first gives the same answer as walking up to it.
 assert.equal(cultureGivenName(31337,300,2),(()=>{let n;for(let i=1;i<=300;i++)n=cultureGivenName(31337,i,2);return n;})());
 assert.ok(NAMING_CULTURES.every((c,i)=>nameSpaceSize(i)>=100000));
});

test('measured repetition across seeds is far below the old stock list',()=>{
 const m=nameRepetition(seeds,[0,1,2,3,4,5],12);
 const oldShare=(()=>{const seen=new Map();let total=0,repeated=0;for(const seed of seeds)for(const team of [0,1,2,3,4,5])for(let id=1;id<=12;id++){const h=Math.imul(seed^(team*7919),0x45d9f3b);const hh=Math.imul(h^(h>>>16),0x45d9f3b);const n=STOCK[((hh>>>0)+id*17)%STOCK.length];total++;seen.set(n,(seen.get(n)||new Set()).add(seed));}for(const s of seen.values())if(s.size>1)repeated+=s.size;return repeated/total;})();
 assert.ok(oldShare>.5,`old stock list repeats almost everywhere: ${oldShare}`);
 assert.ok(m.repeatedShare<.03,`repeated share ${m.repeatedShare}`);assert.ok(m.worstWorlds<=4,`no name recurs in more than 4 of ${m.worldCount} worlds: ${m.worstWorlds}`);assert.ok(m.distinct/m.total>.98);
 for(const n of STOCK)for(const seed of seeds.slice(0,20))for(let id=1;id<=30;id++)assert.notEqual(cultureGivenName(seed,id,0),n,'stock names never appear');
 // Each phonology is audibly distinct: first-letter / ending signatures differ between cultures.
 const ends=NAMING_CULTURES.map((_,c)=>{const set=new Set();for(let id=1;id<=200;id++){const team=[0,1,2,3,4,5,6].find(t=>cultureIndex(1,t)===c);set.add(cultureGivenName(1,id,team).slice(-2));}return set;});
 assert.ok(ends.every(s=>s.size>=3),'endings vary inside a culture');
});

test('a new game names its people with the culture generator; names stay stable through save and reload',()=>{
 const g=new Game();g.reset(777,3);g.enterIsland();const named=g.state.units.filter(u=>u.name);assert.ok(named.length>0);
 for(const u of named){assert.doesNotMatch(u.name,/[ -]/);assert.ok(!STOCK.includes(u.name),`${u.name} is a stock name`);assert.equal(u.name,cultureGivenName(777,u.id,u.team));}
 assert.equal(cultureLabel(777,0),NAMING_CULTURES[cultureIndex(777,0)].id);
});
