import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {voiceFor,eraText,setEraVoice,eraVoiceEnabled,kindForAge,CULTURE_STYLES,SOCIETY_KINDS,BANNED_EARLY} from '../src/game/vocab.ts';
const RANKS=['leader','envoy','elder','hand'],MOODS=['unknown','hostile','wary','neutral','friendly'],TAGS=['war','grievance','witness','loot','custody','ransom'],TERMS=['whitePeace','tribute','forcedLabor','puppet','annexation'];
/** Every string the voice can produce, with sample arguments. */
function strings(v,name='Aska',society='Mokani'){
 const out=[];const add=(x)=>{if(typeof x==='string')out.push(x);else if(x&&typeof x==='object')for(const k of Object.keys(x))add(x[k]);};
 add(v.prompts);add(v.speakVerbs);add(v.groups);add(v.farewell);add(v.issues);add(v.war);add(v.needs.hungry);add(v.needs.none);add(v.trade);add(v.relations.unknown);add(v.pact.noneLeader);add(v.pact.noneHand);add(v.pact.sworn);add(v.pact.failed);
 add(v.force.labels);add(v.force.lines);add(v.force.tags);add(v.term);add(v.encounter);add([v.folk,v.folkPlural,v.kin]);
 for(const r of RANKS){out.push(v.title(r),v.roleLine(name,r));}for(const m of MOODS)out.push(v.moodText(m));
 for(const l of [true,false])out.push(v.greeting(name,society,l));
 for(const stale of [true,false])for(const needs of [[],['timber','food']])out.push(v.needs.known(900,stale,needs));
 for(const st of ['hostile','ally','peace'])for(const c of [true,false])for(const s of [true,false])out.push(v.relations.known(s,st,c));
 for(const t of TERMS){out.push(v.pact.offer(v.term[t]),v.pact.accept(v.term[t]));}
 out.push(v.trader.offers(3,'wood'),v.trader.empty,v.trader.closer,v.trader.decline,v.trader.goHome,v.trader.demand,v.trader.leave,v.knowledge.carrying(2,'food'),v.knowledge.goods(['a','b']),v.knowledge.goods([]),v.knowledge.kin(0),v.knowledge.kin(2));
 return out;
}
test('vocabulary is deterministic: same context gives the same words, across calls and speakers',()=>{
 setEraVoice(true);
 for(const age of [0,1,2,3,4])for(const culture of CULTURE_STYLES){const a=strings(voiceFor({age,culture,seed:7,speaker:3})),b=strings(voiceFor({age,culture,seed:7,speaker:3}));assert.deepEqual(a,b);}
 assert.equal(voiceFor({age:0,culture:'river',seed:7,speaker:3}).greeting('A','B',true),voiceFor({age:0,culture:'river',seed:7,speaker:3}).greeting('A','B',true));
});
test('kinds follow age and every kind and culture has its own flavour',()=>{
 assert.deepEqual([0,1,2,3,4,9].map(kindForAge),['band','village','chiefdom','state','kingdom','kingdom']);assert.equal(kindForAge(undefined),'band');assert.equal(kindForAge(NaN),'band');
 const kins=new Set(CULTURE_STYLES.map(c=>voiceFor({age:0,culture:c}).kin));assert.equal(kins.size,CULTURE_STYLES.length);
 const leaders=new Set(SOCIETY_KINDS.map((_,i)=>voiceFor({age:i}).title('leader')));assert.ok(leaders.size>=4);
 assert.equal(voiceFor({age:0,culture:'nonsense'}).culture,'river');
});
test('required prompts: the four dialogue lines read in the era voice',()=>{
 setEraVoice(true);const band=voiceFor({age:0,culture:'river'}).prompts;
 assert.equal(band.needs,'What does your band lack?');assert.equal(band.trade,'Let us swap what we have.');assert.equal(band.relations,'Are we kin or strangers to you?');assert.equal(band.pact,'Swear peace.');
 assert.equal(voiceFor({age:2}).prompts.pact,'Make a pact.');
});
test('BANNED WORDS: no modern or bureaucratic word in any generated string for ages 0-2 (all cultures, many speakers)',()=>{
 setEraVoice(true);let n=0;
 for(const age of [0,1,2])for(const culture of CULTURE_STYLES)for(const speaker of [1,2,3,4,5,6,7,8])for(const s of strings(voiceFor({age,culture,seed:11,speaker}))){n++;for(const re of BANNED_EARLY)assert.doesNotMatch(s,re,`age ${age} ${culture}: "${s}"`);}
 assert.ok(n>1500);
});
test('titles are never modern, at any age',()=>{
 setEraVoice(true);for(const age of [0,1,2,3,4])for(const r of RANKS)assert.doesNotMatch(voiceFor({age}).title(r),/representative|manager|director|president|minister|ambassador|delegate|official|spokes/i);
});
test('verbs stay: Attack, Capture, Rob and the prisoner verbs keep their names',()=>{
 const l=voiceFor({age:0}).force.labels;assert.deepEqual([l.attack,l.capture,l.rob,l.interrogate,l.ransom,l['release-prisoner']],['Attack','Capture','Rob','Interrogate','Ransom','Release']);
});
test('eraText rewrites modern words for early ages, leaves later treaties alone, and is the identity when the switch is off',()=>{
 setEraVoice(true);
 assert.equal(eraText('The community representative proposed an agreement on resources.',0),'The speaker offered a pact on stores.');
 assert.match(eraText('Send a delegation to negotiate a treaty.',1),/party to parley a pact/);
 assert.match(eraText('A treaty binds both.',3),/treaty/);
 assert.doesNotMatch(eraText('community leader, population, citizens, policy, stakeholders, factions',2),/communit|population|citizen|policy|stakeholder|faction/i);
 setEraVoice(false);assert.equal(eraVoiceEnabled(),false);assert.equal(eraText('community representative',0),'community representative');setEraVoice(true);
});
test('the switch restores the earlier wording verbatim',()=>{
 setEraVoice(false);const v=voiceFor({age:0});
 assert.equal(v.prompts.needs,'What do your people need?');assert.equal(v.prompts.pact,'Discuss an agreement.');assert.equal(v.roleLine('A','hand'),'A · Community representative');assert.equal(v.term.puppet,'Puppet state');
 setEraVoice(true);assert.notEqual(voiceFor({age:0}).prompts.needs,'What do your people need?');
});
test('UI wiring and size floors: every verb is wired, text is 16px or more, icons 24, rows 52',()=>{
 const ui=fs.readFileSync('src/ui/hearth/FirstContact.tsx','utf8'),tv=fs.readFileSync('src/ui/TraderVerbs.tsx','utf8'),css=fs.readFileSync('src/ui/hearth/contact.css','utf8'),dlg=fs.readFileSync('src/ui/EncounterDialog.tsx','utf8');
 for(const a of ["'trade'","'demand'","'approach-trade'","'ask-visitor-leave'","'send-scout-home'","'decline-trade'","answerEncounter","'greet'","'observe'"])assert.ok(ui.includes(a),a);
 for(const a of ["'attack'","'capture'","'rob'","'interrogate'","'ransom'","'release-prisoner'"])assert.ok(tv.includes(a),a);
 assert.ok(dlg.includes('FirstContact')&&dlg.includes("'observe'"));
 for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))assert.ok(+m[1]>=16,'font '+m[0]);
 for(const m of css.matchAll(/font:\s*\d+\s+(\d+)px/g))assert.ok(+m[1]>=16,'font '+m[0]);
 assert.match(css,/\.fc-row\{[^}]*min-height:52px/);assert.ok(!/size=\{(?!24)\d+\}/.test(ui),'icons must be 24');
 for(const m of css.matchAll(/border-radius:\s*(\d+)px/g))assert.ok(+m[1]<=4,'radius '+m[0]);
});
