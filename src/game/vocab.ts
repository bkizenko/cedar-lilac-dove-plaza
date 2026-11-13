/** ERA VOICE: one pure, deterministic vocabulary layer for everything one person says or is called when two peoples meet.
 *
 *  Keyed by society kind (band, early farming village, chiefdom, early state, kingdom/empire, taken from the society's age) and by
 *  culture style (one of the seven naming cultures: river, upland, coast, steppe, forest, desert, island). Each culture has its own
 *  way of saying "our people"; the words are plain English built from original compounds, never a real people's exact terms.
 *
 *  No state, no clock, no random draws. A line that has variants picks one from a hash of (seed, speaker id), so the same person
 *  always says the same thing. The switch `setEraVoice(false)` restores the earlier modern wording byte for byte (tests that pin
 *  strings run against either table). Tone: short, plain, hard. No profanity, no cute, no office words. */
export type SocietyKind='band'|'village'|'chiefdom'|'state'|'kingdom';
export const SOCIETY_KINDS:readonly SocietyKind[]=['band','village','chiefdom','state','kingdom'];
export type CultureStyle='river'|'upland'|'coast'|'steppe'|'forest'|'desert'|'island';
export const CULTURE_STYLES:readonly CultureStyle[]=['river','upland','coast','steppe','forest','desert','island'];
export type Rank='leader'|'envoy'|'elder'|'hand';
export type Mood='unknown'|'hostile'|'wary'|'neutral'|'friendly';
export type ForceVerb='attack'|'capture'|'rob'|'interrogate'|'ransom'|'release-prisoner';
export type PeaceTermId='whitePeace'|'tribute'|'forcedLabor'|'puppet'|'annexation';

let eraVoiceOn=true;
/** The switch. Default on. Persisted by callers (the UI reads `hearthwild.voice`), never by this module. */
export function setEraVoice(on:boolean){eraVoiceOn=!!on;}
export function eraVoiceEnabled(){return eraVoiceOn;}

/** Society kind for an age number (tribe.age, 0..5+). */
export function kindForAge(age:number|undefined):SocietyKind{
 const a=Number.isFinite(age as number)?Math.max(0,Math.floor(age as number)):0;
 return a<=0?'band':a===1?'village':a===2?'chiefdom':a===3?'state':'kingdom';
}
export function cultureStyle(label:string|undefined):CultureStyle{return (CULTURE_STYLES as readonly string[]).includes(label??'')?label as CultureStyle:'river';}
function hash(...v:(string|number)[]){let h=0x811c9dc5;for(const x of v){const s=String(x);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}}return h>>>0;}
const pick=<T,>(a:readonly T[],seed:number)=>a[seed%a.length];

type Row<T>=Record<SocietyKind,T>;
/** What a people calls itself, by kind: "your band", "your hearth". */
const FOLK:Row<string>={band:'band',village:'hearth',chiefdom:'clan',state:'city',kingdom:'realm'};
const FOLK_PLURAL:Row<string>={band:'bands',village:'hearths',chiefdom:'clans',state:'cities',kingdom:'realms'};
/** Culture flavour: the kin-word and a greeting oath, each an original compound. */
const FLAVOUR:Record<CultureStyle,{kin:string;stranger:string;oath:string;hail:readonly string[]}>={
 river:{kin:'river-kin',stranger:'upstream stranger',oath:'by the low water',hail:['Water to you, stranger.','Come down to the bank.']},
 upland:{kin:'hill-kin',stranger:'lowland stranger',oath:'by the cairn',hail:['Stand where I can see you.','You climbed far.']},
 coast:{kin:'shore-kin',stranger:'inland stranger',oath:'by the tide',hail:['Salt and fire to you.','You came by the dry road.']},
 steppe:{kin:'herd-kin',stranger:'foot stranger',oath:'by the horse-skull',hail:['Who rides with you, stranger?','Your dust was seen at dawn.']},
 forest:{kin:'wood-kin',stranger:'open-ground stranger',oath:'by the old oak',hail:['You walk loud, stranger.','We saw you before you saw us.']},
 desert:{kin:'well-kin',stranger:'dry-road stranger',oath:'by the well',hail:['Have you water, stranger?','Sit in the shade and speak.']},
 island:{kin:'sea-kin',stranger:'landsman',oath:'by the reef',hail:['You came by the land road, stranger.','Our boats saw you first.']},
};
const LEADER:Row<readonly string[]>={band:['Headman','Eldest'],village:['Headman','Elder of the hearth'],chiefdom:['Chief','War-chief'],state:['Priest-king','Lord of the city'],kingdom:['King','High king']};
const ENVOY:Row<string>={band:'Speaker',village:'Speaker',chiefdom:'Herald',state:'Herald',kingdom:'Herald'};
const ELDER:Row<string>={band:'Elder',village:'Elder',chiefdom:'Elder',state:'Elder',kingdom:'Elder'};
const HAND:Row<string>={band:'Hunter',village:'Kinsman',chiefdom:'Spearman',state:'Spearman',kingdom:'Man-at-arms'};

export type Ctx={age:number|undefined;culture?:string;seed?:number;speaker?:number};
export type Voice=ReturnType<typeof buildVoice>;
const MOODS_TEXT:Record<Mood,string>={unknown:'You know little of their mind yet.',hostile:'Their people remember recent harm.',wary:'They are guarded with you.',neutral:'They will hear you out.',friendly:'They greet you as a known friend.'};

function buildVoice(ctx:Ctx){
 const kind=kindForAge(ctx.age),cs=cultureStyle(ctx.culture),fl=FLAVOUR[cs],folk=FOLK[kind],n=hash(ctx.seed??0,ctx.speaker??0,cs);
 const title=(rank:Rank)=>rank==='leader'?pick(LEADER[kind],n):rank==='envoy'?ENVOY[kind]:rank==='elder'?ELDER[kind]:HAND[kind];
 const tribe=(society:string)=>society||'a strange '+folk;
 return {
  kind,culture:cs,folk,folkPlural:FOLK_PLURAL[kind],kin:fl.kin,
  title,
  /** "Shatseudour · Headman" */
  roleLine:(name:string,rank:Rank)=>`${name} · ${title(rank)}, ${fl.kin}`,
  moodText:(m:Mood)=>MOODS_TEXT[m],
  prompts:{
   needs:kind==='band'?'What does your band lack?':kind==='village'?'What does your hearth lack?':kind==='chiefdom'?'What does your clan lack?':'What do your stores lack?',
   trade:kind==='band'||kind==='village'?'Let us swap what we have.':'Let us trade goods.',
   relations:kind==='state'||kind==='kingdom'?'Are we friends or foes to you?':'Are we kin or strangers to you?',
   pact:kind==='band'||kind==='village'?'Swear peace.':kind==='chiefdom'?'Make a pact.':'Swear an oath of peace.',
  },
  /** short verb forms for the ledger list */
  speakVerbs:{needs:'Ask what they lack',relations:'Ask where you stand',pact:kind==='chiefdom'||kind==='band'||kind==='village'?'Swear peace':'Swear an oath'},
  groups:{speak:'Speak',deal:'Deal',force:'Force',leave:'Leave'},
  farewell:{part:kind==='band'||kind==='village'?'Part in peace':'Part in peace',leave:'Walk on',line:`Go well. ${fl.oath[0].toUpperCase()+fl.oath.slice(1)}.`},
  greeting:(name:string,society:string,leader:boolean)=>leader
   ?`${pick(fl.hail,n)} I am ${name}, ${title('leader')} of the ${tribe(society)}. Say what brings you.`
   :`${pick(fl.hail,n)} I am ${name} of the ${tribe(society)}. I speak for myself and what I carry.`,
  issues:{
   bringAdult:'Bring a grown man or woman of your own fire.',
   noOneHere:'There is no free speaker of theirs here.',
   ashore:'Come ashore to speak.',
   reach:'Get close enough to see them first.',
   closer:'Move closer to be heard.',
  },
  war:`We are at war. I carry no word for peace.`,
  needs:{
   hungry:'I have gone hungry on this road. Food would be welcome.',
   known:(seconds:number,stale:boolean,needs:string[])=>`The word you took home is ${seconds} seconds old${stale?' and may have gone cold':''}. ${needs.length?`It spoke of a need for ${needs.join(', ')}.`:'It named no lack in the goods we spoke of.'} I cannot swear our stores are the same.`,
   none:'I cannot tell you what our stores hold. We can speak of what I carry, or you can meet our traders at home.',
  },
  trade:{offer:'Here is what we can swap, and only what is here in our hands.',none:'I have nothing to swap here.',done:'Done. The goods have changed hands.',stale:'That offer is gone. Ask again.'},
  relations:{unknown:'We have shared no word between our peoples yet. Let what we do be our judge.',known:(stale:boolean,state:'hostile'|'ally'|'peace',compact:boolean)=>`The last word we had ${stale?'is old, and ':''}says ${state==='hostile'?'blood is owed between us':state==='ally'?'we stand together':'there is peace between us'}.${compact?' A pasture-sharing pact still holds.':''}`},
  pact:{
   offer:(term:string)=>`I bring an offer from my people: ${term}. These are the terms they sent.`,
   noneLeader:'No offer lies between us. Send men to our hearths to parley; words here bind no one.',
   noneHand:'I have no word to give on a pact. A greeting binds neither of us. Send men, or wait for a runner with terms.',
   sworn:'Sworn. Both peoples are bound by it.',failed:'We could not come to terms.',
   accept:(term:string)=>`Accept ${term.toLowerCase()}`,
  },
  force:{
   labels:{attack:'Attack',capture:'Capture',rob:'Rob',interrogate:'Interrogate',ransom:'Ransom','release-prisoner':'Release'} as Record<ForceVerb,string>,
   lines:{attack:'Fall on them.',capture:'Take them alive.',rob:'Strip what they carry.',interrogate:'Make them talk.',ransom:'Sell them back to their people.','release-prisoner':'Let them walk home.'} as Record<ForceVerb,string>,
   tags:{war:'Their people will take up arms against you',grievance:'Their people will nurse the grudge when word reaches home',witness:'Eyes will carry the news',loot:'You take the pack they carry',custody:'You must guard, feed and water them',ransom:'Ransom is carried by living men'} as Record<'war'|'grievance'|'witness'|'loot'|'custody'|'ransom',string>,
  },
  trader:{offers:(n:number,type:string)=>`They hold ${n} ${type} to swap.`,empty:'They carry nothing to swap.',closer:'Walk closer to swap',decline:'Turn down this offer',goHome:'Send them home',demand:'Demand what they carry',leave:'Ask them to leave'},
  term:{whitePeace:'Peace without price',tribute:'Tribute',forcedLabor:'Bound labour',puppet:'Vassalage',annexation:'Taking in'} as Record<PeaceTermId,string>,
  encounter:{first:'First meeting',hostile:'Hostile meeting',seen:'What you know',marks:'What follows'},
  knowledge:{carrying:(n:number,type:string)=>`Carrying ${n} ${type}.`,goods:(g:string[])=>g.length?`Seen with ${g.join(', ')}.`:'No goods seen on them yet.',kin:(n:number)=>n?`${n} of their kin are known to you.`:'You know none of their kin.'},
 };
}

/** The earlier, modern wording kept verbatim behind the switch. */
function buildLegacy(ctx:Ctx):Voice{
 const v=buildVoice(ctx),leader=(name:string,society:string,l:boolean)=>l?`You are speaking with ${name} of ${society}. Tell me what brings your people here.`:`I am ${name}, from ${society}. I can speak for my own journey and the goods I brought.`;
 return {...v,
  roleLine:(name:string,rank:Rank)=>`${name} · ${rank==='leader'?'Community leader':'Community representative'}`,
  moodText:(m:Mood)=>MOODS_TEXT[m],
  prompts:{needs:'What do your people need?',trade:'Let us exchange goods.',relations:'Where do we stand?',pact:'Discuss an agreement.'},
  greeting:leader,
  issues:{bringAdult:'Bring an adult from your community.',noOneHere:'There is no independent representative here.',ashore:'Meet ashore to speak.',reach:'Reach and see the representative first.',closer:'Move within speaking distance.'},
  war:'We are at war. I have brought no authority to agree terms here.',
  needs:{hungry:'I have missed meals on this journey. Food would be welcome.',known:(s:number,stale:boolean,needs:string[])=>`Your returned trading account is ${s} seconds old${stale?' and may be out of date':''}. ${needs.length?`It lists a need for ${needs.join(', ')}.`:'It lists no shortages among the goods discussed.'} I cannot promise our stores are unchanged.`,none:'I have no current account of our storehouses to give you. We can discuss what I actually brought, or meet our traders at home.'},
  trade:{offer:'Here is what we can exchange here, with the goods actually present.',none:'I have no exchange to offer here.',done:'Agreed. Those goods have changed hands.',stale:'That offer is no longer available. Ask again.'},
  relations:{unknown:'We have no shared diplomatic account yet. Let our actions give us something to judge.',known:(stale:boolean,state:'hostile'|'ally'|'peace',compact:boolean)=>`Our ${stale?'older':'last delivered'} diplomatic account records ${state==='hostile'?'hostility':state==='ally'?'an alliance':'peace'}.${compact?' A grazing compact is still in force.':''}`},
  pact:{offer:(t:string)=>`I carry a proposal for ${t.toLowerCase()}. These are the terms my community sent.`,noneLeader:'No formal proposal is before us. Send a delegation to our known settlement to negotiate; speaking here does not sign an agreement.',noneHand:'I have no treaty mandate. A greeting cannot bind either community. Send a delegation or speak with a messenger carrying agreed terms.',sworn:'The agreement is signed. Both communities are bound by those terms.',failed:'We could not conclude those terms.',accept:(t:string)=>`Accept ${t.toLowerCase()}`},
  term:{whitePeace:'White peace',tribute:'Tribute',forcedLabor:'Slavery',puppet:'Puppet state',annexation:'Annexation'},
 };
}
/** The voice for a meeting. Pure; cheap enough to call per render. */
export function voiceFor(ctx:Ctx):Voice{return eraVoiceOn?buildVoice(ctx):buildLegacy(ctx);}

/** Word-level rewriter for free text that is still written in the modern register (banner and notification chokepoints).
 *  Only touches words that are wrong for the age; identity when the switch is off. Case of the first letter is kept. */
const KEEP_CASE=(from:string,to:string)=>from[0]===from[0].toUpperCase()&&from[0]!==from[0].toLowerCase()?to[0].toUpperCase()+to.slice(1):to;
export function eraText(text:string,age:number|undefined):string{
 if(!eraVoiceOn||!text)return text;
 const kind=kindForAge(age),folk=FOLK[kind],folks=FOLK_PLURAL[kind],early=SOCIETY_KINDS.indexOf(kind)<=2;
 const rules:[RegExp,string][]=[
  [/\bcommunity leaders?\b/gi,kind==='chiefdom'?'chief':'headman'],[/\bcommunity representatives?\b/gi,'speaker'],
  [/\bcommunities\b/gi,folks],[/\bcommunity\b/gi,folk],
  [/\brepresentatives\b/gi,'speakers'],[/\brepresentative\b/gi,'speaker'],
  [/\bdiplomatic\s+/gi,''],[/\bdiplomats\b/gi,'envoys'],[/\bdiplomat\b/gi,'envoy'],
  [/\bnegotiat(?:e|ion|ions|ing)\b/gi,'parley'],[/\bnegotiated\b/gi,'parleyed'],
  [/\bdelegations\b/gi,'parties'],[/\bdelegation\b/gi,'party'],
  [/\bstakeholders?\b/gi,'kin'],[/\bpolicies\b/gi,'customs'],[/\bpolicy\b/gi,'custom'],
  [/\bcitizens\b/gi,'folk'],[/\bcitizen\b/gi,'kinsman'],
  [/\bpopulation\b/gi,'people'],[/\bresources\b/gi,'stores'],[/\bresource\b/gi,'store'],
  [/\bfactions\b/gi,'rival bands'],[/\bfaction\b/gi,'rival band'],
  [/\bmandate\b/gi,'word'],[/\bauthority\b/gi,'standing'],[/\bformal proposal\b/gi,'offer'],[/\bproposed\b/gi,'offered'],[/\bproposals?\b/gi,'offer'],
 ];
 if(early){rules.unshift([/\ban (agreement|treaty)\b/gi,'a pact']);rules.push([/\bagreements\b/gi,'pacts'],[/\bagreement\b/gi,'pact'],[/\btreaties\b/gi,'pacts'],[/\btreaty\b/gi,'pact']);}
 let out=text;for(const [re,to] of rules)out=out.replace(re,m=>KEEP_CASE(m,to));return out;
}

/** Words that must never appear in generated text for ages 0-2. Used by the banned-word test and the audit. */
export const BANNED_EARLY:readonly RegExp[]=[
 /\bcommunit(y|ies)\b/i,/\brepresentatives?\b/i,/\bagreements?\b/i,/\bstakeholders?\b/i,/\bpolic(y|ies)\b/i,/\bresources?\b/i,/\bpopulation\b/i,/\bcitizens?\b/i,/\bdiplomat\w*/i,
 /\bnegotiat\w*/i,/\btreat(y|ies)\b/i,/\bfactions?\b/i,/\bdelegat\w+/i,/\bauthority\b/i,/\bmandate\b/i,/\bproposals?\b/i,/\bofficials?\b/i,/\bgovernment\b/i,/\borgani[sz]ation\b/i,/\bpuppet\b/i,/\bslavery\b/i,/\bannex\w*/i,/\bwhite peace\b/i,/\bcompact\b/i,
];
