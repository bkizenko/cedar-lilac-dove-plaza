/**
 * Per-person skill model (pure, seeded, deterministic: no Math.random, no Date.now, no Game import).
 * Experience `xp` is in work-seconds of sim time. Mastery saturates: m = ceiling(aptitude) * (1 - exp(-xp / tau)).
 * Effects reach the sim only as time multipliers (`skillSpeed`), never as extra goods, so stock stays conserved.
 * Storage per person is one compact record; see SkillRecord. Absent record = no practice yet = multiplier exactly 1.
 */
export const SKILL_IDS=['farming','herding','hunting','fishing','foraging','woodcutting','mining','building','hauling','pottery','weaving','smithing','tanning','toolmaking','cooking','healing','sailing','trading','leading','fighting'] as const;
export type SkillId=typeof SKILL_IDS[number];
export type SkillSpec={label:string;/** work-seconds to reach 63% of the ceiling */tau:number;/** 0 shallow .. 1 deep: deep skills are forgotten more slowly and keep a higher floor */depth:number;/** largest speed gain at full performance */bonus:number;/** 0 cognitive .. 1 bodily: how much age and injury bite */physical:number;job?:string};
export const SKILL_SPECS:Record<SkillId,SkillSpec>={
 farming:{label:'Farming',tau:2400,depth:.6,bonus:.4,physical:.7,job:'food'},
 herding:{label:'Herding',tau:2000,depth:.6,bonus:.3,physical:.5},
 hunting:{label:'Hunting',tau:2000,depth:.6,bonus:.3,physical:.8,job:'hunt'},
 fishing:{label:'Fishing',tau:1500,depth:.5,bonus:.35,physical:.6,job:'food'},
 foraging:{label:'Foraging',tau:600,depth:.3,bonus:.25,physical:.5,job:'food'},
 woodcutting:{label:'Woodcutting',tau:900,depth:.4,bonus:.35,physical:.9,job:'wood'},
 mining:{label:'Quarrying and mining',tau:1500,depth:.5,bonus:.3,physical:.9,job:'stone'},
 building:{label:'Building',tau:2400,depth:.7,bonus:.35,physical:.7},
 hauling:{label:'Hauling',tau:700,depth:.3,bonus:.25,physical:.9},
 pottery:{label:'Pottery',tau:2000,depth:.7,bonus:.3,physical:.3},
 weaving:{label:'Weaving',tau:2000,depth:.7,bonus:.3,physical:.3},
 smithing:{label:'Smithing',tau:3600,depth:.9,bonus:.4,physical:.7},
 tanning:{label:'Tanning',tau:1800,depth:.6,bonus:.3,physical:.5},
 toolmaking:{label:'Toolmaking',tau:2400,depth:.7,bonus:.3,physical:.4},
 cooking:{label:'Cooking and curing',tau:1200,depth:.5,bonus:.25,physical:.2},
 healing:{label:'Healing',tau:3000,depth:.8,bonus:.3,physical:.1},
 sailing:{label:'Sailing',tau:3200,depth:.8,bonus:.3,physical:.6},
 trading:{label:'Trading',tau:2000,depth:.7,bonus:.2,physical:.1},
 leading:{label:'Leading',tau:3600,depth:.8,bonus:.15,physical:.1},
 fighting:{label:'Fighting',tau:2400,depth:.6,bonus:.3,physical:.9},
};
export const SKILL_RULES={version:1,xpCapTaus:3.2,graceDays:4,staleDays:3,dayWindow:64,heritability:.35,teachBoost:1,teachRadius:30,teacherGap:.12,teacherMastery:.35,masterMastery:.5,rustyRatio:.85,rustyBoost:2,maxTeachers:8,injuryHealDays:12,maxScar:.3} as const;
/** One practised skill: xp, last practised sim day, peak xp, lore (0..100: share learned from a teacher), pending work-seconds not yet banked. */
export type SkillEntry=[xp:number,lastDay:number,peak:number,lore:number,pending:number];
export type SkillRecord={v:1;/** genome hash */g:number;/** parents' genome hashes (family influence) */p?:number[];x:Partial<Record<SkillId,SkillEntry>>;/** injury [severity 0..1, permanent scar 0..maxScar] */inj?:[number,number]};
const clamp=(v:number,lo:number,hi:number)=>v<lo?lo:v>hi?hi:v;
export function hash32(a:number,b:number,c=0){let h=(a^Math.imul(b+1,0x9e3779b1)^Math.imul(c+31,0x85ebca6b))>>>0;h=Math.imul(h^(h>>>15),0x2c1b3c6d)>>>0;h=Math.imul(h^(h>>>12),0x297a2d39)>>>0;return(h^(h>>>15))>>>0;}
const unit01=(h:number)=>h/4294967296;
export const skillGenome=(seed:number,id:number)=>hash32(seed|0,id|0,7);
/** Innate aptitude 0.7..1.3: a general factor shared across skills plus a skill-specific draw (bell of two samples). */
export function innateAptitude(genome:number,skill:SkillId){const i=SKILL_IDS.indexOf(skill),general=unit01(hash32(genome,999)),specific=(unit01(hash32(genome,i,1))+unit01(hash32(genome,i,2)))/2;return .7+.6*(.3*general+.7*specific);}
export function skillAptitude(rec:Pick<SkillRecord,'g'|'p'>,skill:SkillId){const own=innateAptitude(rec.g,skill);if(!rec.p?.length)return own;const fam=rec.p.reduce((s,p)=>s+innateAptitude(p,skill),0)/rec.p.length,h=SKILL_RULES.heritability;return(1-h)*own+h*fam;}
const ceilingFor=(apt:number)=>clamp(.85+.5*(apt-1),.7,1);
export const xpCap=(skill:SkillId)=>SKILL_SPECS[skill].tau*SKILL_RULES.xpCapTaus;
/** The saturating curve: fast early, slow later, plateau below 1 set by aptitude. */
export function masteryOf(skill:SkillId,xp:number,apt:number){return ceilingFor(apt)*(1-Math.exp(-Math.max(0,xp)/SKILL_SPECS[skill].tau));}
const lerpTable=(t:[number,number][],x:number)=>{if(x<=t[0][0])return t[0][1];for(let i=1;i<t.length;i++)if(x<=t[i][0]){const[a,b]=[t[i-1],t[i]];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return t[t.length-1][1];};
/** Learning speed by age: quick when young, steady in the prime, slower in elders. */
export const ageLearn=(years:number)=>lerpTable([[4,.8],[8,1.5],[14,1.4],[20,1.2],[30,1],[45,.9],[60,.7],[75,.5]],years);
/** Bodily performance by age; cognitive skills (physical near 0) are barely touched. */
export function ageFactor(years:number,physical:number){const body=lerpTable([[8,.5],[18,1],[45,1],[75,.65]],years);return 1-physical*(1-body);}
/** 0..1: how much age adds to teaching (crystallised experience). */
export const wisdom=(years:number)=>clamp((years-35)/35,0,1);
export const teacherQuality=(mastery:number,years:number)=>clamp(mastery*(.7+.6*wisdom(years)),0,1.2);
/** Age in years for skills. Births in-game start ageT at 0 and mature after 0.2 y, so they carry a 14 y offset. */
export const skillAgeYears=(u:{ageT:number;parents?:unknown[]})=>u.ageT/1800+(u.parents?14:0);
export function newRecord(genome:number,parents?:number[]):SkillRecord{const r:SkillRecord={v:1,g:genome,x:{}};if(parents?.length)r.p=parents.slice(0,2);return r;}
export function entryMastery(rec:SkillRecord,skill:SkillId,e?:SkillEntry){e??=rec.x[skill];return e?masteryOf(skill,e[0],skillAptitude(rec,skill)):0;}
export const peakMastery=(rec:SkillRecord,skill:SkillId)=>{const e=rec.x[skill];return e?masteryOf(skill,e[2],skillAptitude(rec,skill)):0;};
export const isRusty=(rec:SkillRecord,skill:SkillId)=>{const e=rec.x[skill];if(!e)return false;const pk=peakMastery(rec,skill);return pk>=.1&&entryMastery(rec,skill,e)<SKILL_RULES.rustyRatio*pk;};
export function injuryFactor(rec:SkillRecord,physical:number){if(!rec.inj)return 1;return 1-.8*physical*clamp(rec.inj[0]+rec.inj[1],0,1);}
/** Performance 0..1 = mastery * age * injury. */
export function skillPerformance(rec:SkillRecord|undefined,skill:SkillId,years:number){if(!rec)return 0;const sp=SKILL_SPECS[skill];return entryMastery(rec,skill)*ageFactor(years,sp.physical)*injuryFactor(rec,sp.physical);}
/** Time multiplier (>= 1): divide a task period by it. Exactly 1 with no record or no practice. */
export const skillSpeed=(rec:SkillRecord|undefined,skill:SkillId,years:number)=>1+SKILL_SPECS[skill].bonus*skillPerformance(rec,skill,years);
/** Bank pending work into xp: aptitude and age scale the gain, rusty skills relearn up to (1+rustyBoost)x faster, a teacher adds up to teachBoost x quality. */
export function trainEntry(rec:SkillRecord,skill:SkillId,seconds:number,years:number,day:number,teacher=0){
 const e=rec.x[skill]??(rec.x[skill]=[0,day,0,0,0]),apt=skillAptitude(rec,skill),cap=xpCap(skill);
 const gap=e[2]>1?clamp(1-e[0]/e[2],0,1):0,rustyMult=1+SKILL_RULES.rustyBoost*gap;
 const gain=Math.max(0,seconds)*apt*ageLearn(years)*rustyMult*(1+SKILL_RULES.teachBoost*teacher);
 const before=e[0];e[0]=Math.min(cap,e[0]+gain);e[2]=Math.max(e[2],e[0]);e[1]=day;e[4]=0;
 const learned=e[0]-before;if(learned>0){const share=teacher>0?(1+SKILL_RULES.teachBoost*teacher-1)/(1+SKILL_RULES.teachBoost*teacher):0;e[3]=clamp(e[3]+(share*100-e[3])*clamp(learned/(SKILL_SPECS[skill].tau*.5),0,1),0,100);}
 return e;
}
/** Forgetting: xp relaxes toward a floor (a fraction of peak) with a time constant that grows with depth and mastery. Starts after a grace period. */
export function forgetEntry(rec:SkillRecord,skill:SkillId,days:number,day:number,guild=false){
 const e=rec.x[skill];if(!e||days<=0||day-e[1]<=SKILL_RULES.graceDays)return;
 const sp=SKILL_SPECS[skill],pkM=peakMastery(rec,skill),stability=60*(1+3*sp.depth)*(1+pkM)*(guild?1.5:1);
 const floor=e[2]*clamp(.35+.35*sp.depth+.2*(e[3]/100)+(guild?.05:0),0,.9);
 if(e[0]>floor)e[0]=floor+(e[0]-floor)*Math.exp(-days/stability);
}
/** Hit points low enough to injure: severity heals, a small permanent scar stays. */
export function injureRecord(rec:SkillRecord,severity:number){const[s,sc]=rec.inj??[0,0];rec.inj=[Math.max(s,clamp(severity,0,1)),Math.min(SKILL_RULES.maxScar,sc+.03*clamp(severity,0,1))];}
export function healRecord(rec:SkillRecord,days:number){if(!rec.inj)return;const s=Math.max(0,rec.inj[0]-days/SKILL_RULES.injuryHealDays);rec.inj=s<=0&&rec.inj[1]<=0?undefined:[s,rec.inj[1]];}
/** Best skills first, with words for the card. */
export const levelWord=(m:number)=>m>=.75?'master':m>=.55?'expert':m>=.35?'skilled':m>=.15?'practised':'novice';
export function topSkills(rec:SkillRecord|undefined,n=3){
 if(!rec)return[] as {id:SkillId;label:string;mastery:number;word:string;rusty:boolean}[];
 return(Object.keys(rec.x) as SkillId[]).map(id=>({id,label:SKILL_SPECS[id].label,mastery:entryMastery(rec,id),word:'',rusty:isRusty(rec,id)})).filter(s=>s.mastery>=.03).sort((a,b)=>b.mastery-a.mastery||SKILL_IDS.indexOf(a.id)-SKILL_IDS.indexOf(b.id)).slice(0,n).map(s=>({...s,word:levelWord(s.mastery)}));
}
/** Suggested job: the best aptitude-and-practice fit among skills that map to an assignable job. */
export function suggestedJob(rec:SkillRecord|undefined){
 let best:{job:string;skill:SkillId;score:number}|null=null;
 for(const id of SKILL_IDS){const sp=SKILL_SPECS[id];if(!sp.job)continue;const apt=rec?skillAptitude(rec,id):1,m=rec?entryMastery(rec,id):0,score=m+.25*(apt-.7);if(!best||score>best.score)best={job:sp.job,skill:id,score};}
 return best;
}
export function validSkillRecord(r:unknown,maxDay=1e9):r is SkillRecord{
 const o=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v),num=(v:unknown,hi=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=hi;
 if(!o(r)||r.v!==1||!num(r.g,4294967295)||!o(r.x))return false;
 if(r.p!==undefined&&(!Array.isArray(r.p)||r.p.length>2||!r.p.every(p=>num(p,4294967295))))return false;
 if(r.inj!==undefined&&(!Array.isArray(r.inj)||r.inj.length!==2||!num(r.inj[0],1)||!num(r.inj[1],SKILL_RULES.maxScar)))return false;
 for(const[k,e]of Object.entries(r.x)){if(!(SKILL_IDS as readonly string[]).includes(k)||!Array.isArray(e)||e.length!==5)return false;const cap=xpCap(k as SkillId);if(!num(e[0],cap+1e-6)||!num(e[1],maxDay)||!num(e[2],cap+1e-6)||e[2]+1e-6<e[0]||!num(e[3],100)||!num(e[4],1e6))return false;}
 return true;
}
