import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {SKILL_IDS,SKILL_SPECS,SKILL_RULES,masteryOf,skillAptitude,newRecord,skillGenome,trainEntry,forgetEntry,entryMastery,peakMastery,isRusty,ageLearn,ageFactor,teacherQuality,skillSpeed,injureRecord,healRecord,validSkillRecord,xpCap,topSkills} from '../src/game/skills.ts';
import {advanceSkillDay,recordPractice,unitSkillSpeed,migrateLegacySkills,skillsEnabled,dayIndex,personSkillCard,villageSkillCard,skillKnowledgeTopics,gatherSkillStep} from '../src/game/skillRuntime.ts';
import {simulationDaySeconds} from '../src/game/calendarPacing.ts';
const fixture=()=>{const g=new Game();g.reset(4242,10);g.enterIsland();return g;};
const rec=(id=5,seed=1)=>newRecord(skillGenome(seed,id));
const workers=g=>g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia);

test('saturation: diminishing returns, plateau below 1, aptitude sets the ceiling',()=>{
 for(const s of SKILL_IDS){const tau=SKILL_SPECS[s].tau;let prev=0,prevGain=Infinity;for(let k=1;k<=8;k++){const m=masteryOf(s,k*tau/2,1),gain=m-prev;assert.ok(gain>0&&gain<prevGain,`${s} concave at ${k}`);prev=m;prevGain=gain;}assert.ok(masteryOf(s,1e9,1.3)<=1&&masteryOf(s,1e9,1.3)>masteryOf(s,1e9,.7));}
 assert.ok(masteryOf('farming',0,1)===0);
});
test('aptitude: bounded, deterministic, differs between people and skills, family pulls toward parents',()=>{
 const a=rec(7),b=rec(8);for(const s of SKILL_IDS){const x=skillAptitude(a,s);assert.ok(x>=.7&&x<=1.3);assert.equal(x,skillAptitude(rec(7),s));}
 assert.ok(SKILL_IDS.some(s=>skillAptitude(a,s)!==skillAptitude(b,s)));assert.ok(new Set(SKILL_IDS.map(s=>skillAptitude(a,s).toFixed(4))).size>8);
 const star=skillGenome(1,99),child={g:skillGenome(1,100),p:[star,star]};const alone={g:child.g};
 const toward=SKILL_IDS.filter(s=>Math.abs(skillAptitude(child,s)-skillAptitude({g:star},s))<Math.abs(skillAptitude(alone,s)-skillAptitude({g:star},s))).length;
 assert.ok(toward>=SKILL_IDS.length*.7,'children lean toward their parents');
});
test('practice saturates: equal work yields less each time and caps at the xp ceiling',()=>{
 const r=rec();let last=Infinity;for(let d=1;d<=30;d++){const before=entryMastery(r,'pottery');trainEntry(r,'pottery',2000,30,d);const gain=entryMastery(r,'pottery')-before;assert.ok(gain<=last+1e-12);last=gain;}
 assert.ok(r.x.pottery[0]<=xpCap('pottery')+1e-9);assert.ok(entryMastery(r,'pottery')<1);
});
test('decay has a floor (fraction of peak), deeper skills forget slower, rusty relearning beats first learning',()=>{
 const make=s=>{const r=rec();trainEntry(r,s,SKILL_SPECS[s].tau*3,30,10);return r;};
 const shallow=make('foraging'),deep=make('smithing');
 for(const[r,s]of[[shallow,'foraging'],[deep,'smithing']])forgetEntry(r,s,200,300);
 const keep=(r,s)=>r.x[s][0]/r.x[s][2];assert.ok(keep(deep,'smithing')>keep(shallow,'foraging'),'deep skill retains more');
 for(const[r,s]of[[shallow,'foraging'],[deep,'smithing']]){forgetEntry(r,s,1e6,1e6);const floor=r.x[s][2]*(.35+.35*SKILL_SPECS[s].depth);assert.ok(r.x[s][0]>=floor-1e-6,`${s} not below floor`);assert.ok(r.x[s][0]>0);}
 const first=rec(),again=make('foraging');forgetEntry(again,'foraging',1e6,1e6);
 const xp0=again.x.foraging[0];trainEntry(again,'foraging',300,30,2e6);const relearned=again.x.foraging[0]-xp0;
 trainEntry(first,'foraging',300,30,1);assert.ok(relearned>first.x.foraging[0]*1.5,'relearning is faster than first learning');
 assert.ok(isRusty(deep,'smithing')||peakMastery(deep,'smithing')>0);
 const idle=make('foraging');forgetEntry(idle,'foraging',100,12);assert.equal(idle.x.foraging[0],idle.x.foraging[2],'no decay inside the grace period');
});
test('age: learn fast young, bodies decline in elders, cognitive skills hold, wisdom helps teaching',()=>{
 assert.ok(ageLearn(10)>ageLearn(30)&&ageLearn(30)>ageLearn(70));assert.ok(ageFactor(70,.9)<ageFactor(30,.9)&&ageFactor(70,.1)>ageFactor(70,.9)&&ageFactor(30,.9)===1);
 assert.ok(teacherQuality(.6,65)>teacherQuality(.6,25));
});
test('teaching: an apprentice beside a master learns faster and keeps more lore',()=>{
 const a=rec(1),b=rec(1);trainEntry(a,'weaving',600,30,5,0);trainEntry(b,'weaving',600,30,5,.8);
 assert.ok(b.x.weaving[0]>a.x.weaving[0]*1.5);assert.ok(b.x.weaving[3]>a.x.weaving[3]);
 forgetEntry(a,'weaving',1e6,1e6);forgetEntry(b,'weaving',1e6,1e6);assert.ok(b.x.weaving[0]/b.x.weaving[2]>a.x.weaving[0]/a.x.weaving[2],'taught skill keeps a higher floor');
});
test('injury lowers bodily performance, heals, leaves a bounded scar',()=>{
 const r=rec();trainEntry(r,'woodcutting',2500,30,1);const before=skillSpeed(r,'woodcutting',30);injureRecord(r,.9);assert.ok(skillSpeed(r,'woodcutting',30)<before);
 healRecord(r,100);assert.ok(r.inj[0]===0&&r.inj[1]<=SKILL_RULES.maxScar&&r.inj[1]>0);assert.ok(skillSpeed(r,'woodcutting',30)>=1);
});
test('speed is a bounded time multiplier: exactly 1 with no practice',()=>{
 assert.equal(skillSpeed(undefined,'farming',30),1);const r=rec();trainEntry(r,'farming',1e9,30,1);for(const s of SKILL_IDS){const r2=rec();trainEntry(r2,s,1e9,30,1);assert.ok(skillSpeed(r2,s,30)<=1+SKILL_SPECS[s].bonus+1e-9);}
});
test('record validator accepts good records and rejects corrupt ones',()=>{
 const r=rec();trainEntry(r,'hunting',500,30,3);assert.ok(validSkillRecord(JSON.parse(JSON.stringify(r)),10));
 for(const bad of [{...r,v:2},{...r,g:-1},{...r,x:{nonsense:[1,1,1,1,1]}},{...r,x:{hunting:[1,1,0,0,0]}},{...r,x:{hunting:[1,1,1,0]}},{...r,inj:[2,0]},{...r,p:[1,2,3]}])assert.equal(validSkillRecord(bad,10),false);
});

test('new games enable the model; the switch off keeps the old behaviour (multiplier exactly 1, no records)',()=>{
 const g=fixture();assert.ok(skillsEnabled(g));const off=new Game();off.reset(4242,10,{skillsVersion:0});off.enterIsland();assert.equal(skillsEnabled(off),false);
 const u=workers(off)[0];recordPractice(off,u,'farming',50);assert.equal(u.skills,undefined);assert.equal(unitSkillSpeed(off,u,'farming'),1);assert.equal(gatherSkillStep(off,u,'wood',{kind:'tree'},1),1);advanceSkillDay(off);assert.equal(off.state.skillModel,undefined);
});
test('daily batch converts practice into mastery, deterministically, and never touches goods',()=>{
 const run=()=>{const g=fixture();const people=workers(g).slice(0,4);for(const u of people){u.ageT=30*1800;u.maturesAt=undefined;u.parents=undefined;} // the opening roster rolls ages with the sim's own Math.random; pin them
  const t0=JSON.stringify(g.state.tribes.map(t=>[t.food,t.wood,t.stone,t.copper,t.iron,t.items]));const carry0=g.state.units.map(u=>[u.carry,u.itemCargo]);
  for(let d=1;d<=40;d++){g.state.time=d*simulationDaySeconds+1;for(const u of people)recordPractice(g,u,'woodcutting',50);advanceSkillDay(g);}
  assert.equal(JSON.stringify(g.state.tribes.map(t=>[t.food,t.wood,t.stone,t.copper,t.iron,t.items])),t0,'tribe stock untouched');assert.deepEqual(g.state.units.map(u=>[u.carry,u.itemCargo]),carry0,'cargo untouched');
  return {g,people};};
 const a=run(),b=run();const out=x=>JSON.stringify(x.people.map(u=>u.skills));assert.equal(out(a),out(b),'same seed, same skills');
 const u=a.people[0];assert.ok(entryMastery(u.skills,'woodcutting')>.2);assert.ok(unitSkillSpeed(a.g,u,'woodcutting')>1);assert.equal(unitSkillSpeed(a.g,u,'pottery'),1);
 const card=personSkillCard(a.g,u);assert.equal(card.top[0].id,'woodcutting');assert.ok(card.suggest);assert.ok(['novice','practised','skilled','expert','master'].includes(card.top[0].word));
 assert.ok(a.g.state.skillModel.day===dayIndex(a.g));
});
test('disuse: skills fade after the grace period and the person is flagged rusty',()=>{
 const g=fixture(),u=workers(g)[0];for(let d=1;d<=60;d++){g.state.time=d*simulationDaySeconds+1;recordPractice(g,u,'fishing',50);advanceSkillDay(g);}
 const peak=entryMastery(u.skills,'fishing');assert.ok(peak>.2);
 for(let d=61;d<=1500;d+=30){g.state.time=d*simulationDaySeconds+1;advanceSkillDay(g);}
 const after=entryMastery(u.skills,'fishing');assert.ok(after<peak&&after>0,'faded but not erased');assert.ok(isRusty(u.skills,'fishing'));
 const card=personSkillCard(g,u);assert.ok(card.top.some(s=>s.id==='fishing'&&s.rusty));
});
test('an apprentice working beside a master outpaces one working alone',()=>{
 const g=fixture(),[master,near,far]=workers(g);for(const u of [master,near,far]){u.ageT=30*1800;u.maturesAt=undefined;u.parents=undefined;}near.x=master.x+3;near.z=master.z;far.x=master.x+400;far.z=master.z;
 master.skills=newRecord(skillGenome(4242,master.id));trainEntry(master.skills,'pottery',SKILL_SPECS.pottery.tau*2.5,35,0);
 for(const u of [near,far])u.skills=newRecord(skillGenome(4242,u.id));
 for(let d=1;d<=20;d++){g.state.time=d*simulationDaySeconds+1;for(const u of [master,near,far])recordPractice(g,u,'pottery',50);advanceSkillDay(g);}
 const ratio=entryMastery(near.skills,'pottery')/Math.max(1e-9,entryMastery(far.skills,'pottery')),apt=skillAptitude(near.skills,'pottery')/skillAptitude(far.skills,'pottery');
 assert.ok(ratio/apt>1.3,'teacher effect visible after removing aptitude differences');
});
test('village tradition builds from workforce concentration, forms a guild at scale, and lapses when the last master dies',()=>{
 const g=fixture();const base=workers(g)[0];const crowd=[];for(let i=0;i<30;i++){crowd.push({...base,id:900000+i,skills:undefined,x:base.x+i%5,z:base.z+(i/5|0)});}g.state.units.push(...crowd);
 for(const u of crowd){u.skills=newRecord(skillGenome(4242,u.id));trainEntry(u.skills,'pottery',SKILL_SPECS.pottery.tau*2.5,35,0);}
 g.state.nextId=Math.max(g.state.nextId,900100);
 for(let d=1;d<=120;d++){g.state.time=d*simulationDaySeconds+1;for(const u of crowd)recordPractice(g,u,'pottery',50);advanceSkillDay(g);}
 const t=g.state.skillModel.towns[0];assert.ok(t.trad.pottery>.4,'tradition '+t.trad.pottery);assert.ok(t.guilds.includes('pottery'));
 const card=villageSkillCard(g,0);assert.ok(card.rows[0].id==='pottery'&&card.rows[0].guild);assert.ok(card.quarters.some(q=>q.startsWith('Pottery quarter')));
 const sp=unitSkillSpeed(g,crowd[0],'pottery');assert.ok(sp>1.15);
 for(const u of crowd)u.hp=0;g.state.time+=simulationDaySeconds;advanceSkillDay(g);
 assert.ok(g.state.skillModel.towns[0].lapsed.includes('pottery'),'no master left');assert.ok(skillKnowledgeTopics(g).some(k=>k.id==='skill:pottery'));
 for(let d=0;d<20;d++){g.state.time+=simulationDaySeconds*20;advanceSkillDay(g);}assert.ok((g.state.skillModel.towns[0].trad.pottery||0)<t.peak.pottery/4,'tradition fades without teachers');
});
test('migration seeds person skills from older tribe/person practice',()=>{
 const g=new Game();g.reset(4242,10,{skillsVersion:0});g.enterIsland();const[u,v]=workers(g);u.combatXP=150;u.craftingXP=12000;u.productionSkills={formClay:{successfulBatches:6,taughtBatches:0,observedSeconds:0}};
 g.state.skillModel={version:1,day:0,towns:{}};migrateLegacySkills(g);
 assert.ok(entryMastery(u.skills,'fighting')>.2&&entryMastery(u.skills,'toolmaking')>.1&&entryMastery(u.skills,'pottery')>0);assert.equal(v.skills,undefined);
});
test('save round trip keeps skills and village tradition; old saves without the field still load',()=>{
 const g=fixture(),u=workers(g)[0];for(let d=1;d<=25;d++){g.state.time=d*simulationDaySeconds+1;recordPractice(g,u,'hunting',50);advanceSkillDay(g);}
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));const h=decodeGame(raw);
 assert.deepEqual(h.state.units.find(x=>x.id===u.id).skills,u.skills);assert.deepEqual(h.state.skillModel,g.state.skillModel);
 const old=JSON.parse(JSON.stringify(raw));delete old.state.skillModel;for(const x of old.state.units)delete x.skills;
 const h2=decodeGame(old);assert.equal(skillsEnabled(h2),false);
 const bad=JSON.parse(JSON.stringify(raw));bad.state.units.find(x=>x.skills).skills.x.hunting=[-1,0,0,0,0];assert.throws(()=>decodeGame(bad));
});
test('live game: a gatherer practises while the sim runs, and the model never changes how many goods a gather yields',()=>{
 const g=fixture();g.state.paused=false;const before=workers(g).length;for(let i=0;i<1200;i++)g.step(.25);
 assert.ok(before>0);const skilled=g.state.units.filter(u=>u.skills&&Object.keys(u.skills.x).length);assert.ok(skilled.length>0,'practice recorded');
 for(const u of skilled)for(const[k,e]of Object.entries(u.skills.x)){assert.ok(SKILL_IDS.includes(k));assert.ok(e.every(Number.isFinite));}
 for(const t of g.state.tribes)for(const k of ['food','wood','stone','copper','iron'])assert.ok(Number.isFinite(t[k])&&t[k]>=0,k);
});
