/** Culture naming (coordination gap G6).
 * Invented, ancient-sounding given names; one phonology per society in a world; no
 * surnames (small villages know each other by one name). Names are a pure function of
 * (world seed, team, person id): stable across saves, no RNG state is consumed.
 *
 * Each culture decodes an index into onset/nucleus syllables with a mixed radix, and a
 * per-(seed,team) affine permutation maps person id → index, so ids 1..M never repeat
 * inside one society and different worlds start at unrelated points of the name space. */
type Culture={id:string;onsets:string[];nuclei:string[];codas:string[];endings:string[]};
/** Sound inventories are invented and deliberately avoid modern English given names. */
export const NAMING_CULTURES:Culture[]=[
 {id:'river',onsets:['k','t','sh','m','n','r','l','b','z','ish'],nuclei:['a','u','i','e'],codas:['','','n','sh'],endings:['','n','sh','r','m','ul']},
 {id:'upland',onsets:['kr','gr','tr','dh','th','br','v','h','g','kh'],nuclei:['o','a','u','au'],codas:['','k','rn','th'],endings:['k','rn','th','og','ur','']},
 {id:'coast',onsets:['l','v','h','ny','s','w','il','al','y','m'],nuclei:['a','e','ei','ia'],codas:['','','l','s'],endings:['','h','ae','el','is','ua']},
 {id:'steppe',onsets:['q','kh','gh','t','ch','b','d','s','j','a'],nuclei:['a','ai','u','e'],codas:['','r','n','g'],endings:['n','r','gai','ud','ach','']},
 {id:'forest',onsets:['y','w','sy','f','p','d','ae','th','n','r'],nuclei:['e','y','i','a'],codas:['','w','l','r'],endings:['','wen','lis','ra','yn','el']},
 {id:'desert',onsets:['h','n','ks','sh','m','th','ar','ud','tz','p'],nuclei:['a','e','u','o'],codas:['','t','m','h'],endings:['t','m','at','ek','ur','esh']},
 {id:'island',onsets:['p','m','n','k','t','ah','oi','l','r','s'],nuclei:['o','a','i','ou'],codas:['','','m','k'],endings:['','a','ou','ik','am','ele']},
];
const MIDDLE=['','','','ra','ta','ni','ka','lu','hu','se'];
function mix(a:number,b:number){let n=(a^Math.imul(b+0x9e3779b9,0x85ebca6b))>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;n=Math.imul(n^(n>>>15),0x2c1b3c6d)>>>0;return (n^(n>>>16))>>>0;}
/** Distinct cultures for the teams of one world: a seed-dependent offset, teams spaced by a step coprime to the family count. */
export function cultureIndex(seed:number,team:number){
 const n=NAMING_CULTURES.length,start=mix(seed,0xc17)%n,step=[1,2,3,4,5,6].find(s=>s%n!==0&&gcd(s,n)===1)!;
 return (start+team*step)%n;
}
function gcd(a:number,b:number):number{return b?gcd(b,a%b):a;}
const space=(c:Culture)=>c.onsets.length*c.nuclei.length*c.onsets.length*c.nuclei.length*c.codas.length*MIDDLE.length*c.endings.length;
export function nameSpaceSize(culture:number){return space(NAMING_CULTURES[culture%NAMING_CULTURES.length]);}
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
function decode(c:Culture,index:number){
 let n=index;const take=(len:number)=>{const d=n%len;n=Math.floor(n/len);return d;};
 const o1=c.onsets[take(c.onsets.length)],n1=c.nuclei[take(c.nuclei.length)],o2=c.onsets[take(c.onsets.length)],n2=c.nuclei[take(c.nuclei.length)],
  coda=c.codas[take(c.codas.length)],mid=MIDDLE[take(MIDDLE.length)],end=c.endings[take(c.endings.length)];
 return cap(o1+n1+coda+mid+o2+n2+end);
}
function rawName(seed:number,id:number,team:number,bump:number){
 const culture=NAMING_CULTURES[cultureIndex(seed,team)],m=space(culture);
 // A stride near a seed-dependent fraction of the space makes consecutive ids differ in every digit, so one village's names do not share endings.
 let a=Math.floor(m*(0.38+(mix(seed,team+101)%1000)/1000*0.24))|1;while(gcd(a,m)!==1)a+=2;
 const b=mix(seed,team*31+7)%m;
 return decode(culture,((Math.max(0,id)*a)%m+b+bump)%m);
}
/** Per-(seed,team) table resolved strictly in id order, so the answer for an id never depends on
 * which ids were asked for first. Distinct indexes can still spell the same string; the table
 * steps to the next index until the spelling is unused, so a society never repeats a name. */
const TABLE_LIMIT=20000,tables=new Map<string,{names:string[];used:Set<string>}>();
/** One given name. Never contains a space, hyphen or surname. */
export function cultureGivenName(seed:number,id:number,team:number){
 if(!Number.isSafeInteger(id)||id<0||id>TABLE_LIMIT)return rawName(seed,id,team,0);
 const key=seed+':'+team;let t=tables.get(key);
 if(!t){if(tables.size>=32)tables.delete(tables.keys().next().value as string);t={names:[],used:new Set()};tables.set(key,t);}
 while(t.names.length<=id){const next=t.names.length;let bump=0,name=rawName(seed,next,team,0);while(t.used.has(name))name=rawName(seed,next,team,++bump);t.used.add(name);t.names.push(name);}
 return t.names[id];
}
export function cultureLabel(seed:number,team:number){return NAMING_CULTURES[cultureIndex(seed,team)].id;}

/** Measurement: share of generated names that already appeared in another world
 * (seed) and the most common name's share. Used by tests and the handoff report. */
export function nameRepetition(seeds:number[],teams:number[],perTeam:number){
 const world=new Map<string,Set<number>>();let total=0;
 for(const seed of seeds)for(const team of teams)for(let id=1;id<=perTeam;id++){const name=cultureGivenName(seed,id,team);total++;let s=world.get(name);if(!s){s=new Set();world.set(name,s);}s.add(seed);}
 let repeated=0,worst=0;for(const s of world.values()){if(s.size>1)repeated+=s.size;worst=Math.max(worst,s.size);}
 return {total,distinct:world.size,repeatedShare:repeated/total,worstWorlds:worst,worldCount:seeds.length};
}
