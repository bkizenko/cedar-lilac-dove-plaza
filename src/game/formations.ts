import {mulberry32} from './rng';
/** Pure formation geometry. Slots are spacing only: unit collision radii are never touched here. */
export type FormationKind='line'|'wedge'|'shieldWall'|'loose';
export const FORMATION_KINDS:readonly FormationKind[]=['line','wedge','shieldWall','loose'];
export type FormationProfile={name:string;spacing:number;ranks:number;/** offense multiplier at full cohesion */offense:number;/** damage taken from each attacker class at full cohesion */takenMelee:number;takenRanged:number;takenMounted:number;/** travel pace at full cohesion */pace:number;/** cohesion a ragged group still keeps */floor:number};
/** Spacing is centre to centre in metres; the widest unit radius is 0.9 (cavalry), so 1.6 never overlaps two foot soldiers. */
export const FORMATION_PROFILES:Record<FormationKind,FormationProfile>={
 line:{name:'Line',spacing:2,ranks:2,offense:1,takenMelee:.95,takenRanged:1,takenMounted:.95,pace:1,floor:.25},
 wedge:{name:'Wedge',spacing:2.2,ranks:6,offense:1.1,takenMelee:1.05,takenRanged:1.05,takenMounted:1,pace:1,floor:.2},
 shieldWall:{name:'Shield wall',spacing:1.6,ranks:3,offense:.9,takenMelee:.85,takenRanged:.65,takenMounted:.8,pace:.8,floor:.3},
 loose:{name:'Loose skirmish',spacing:3.6,ranks:3,offense:1,takenMelee:1.1,takenRanged:.85,takenMounted:1.1,pace:1.08,floor:.45},
};
export const FORMATION_RULES={version:1,maximumGroups:24,maximumMembers:48,minimumMembers:4,tickSeconds:1,commanderRadiusMeters:14,commanderCohesion:.18,veteranXp:60,veteranCohesion:.08,startMorale:.8,casualtyMorale:.07,wavering:.25,minimumSpacingMeters:1.45} as const;
export type Slot={ox:number;oz:number};
/** Local frame: +oz is the way the group faces, +ox is to its right. Slots come out front-rank first. */
export function formationSlots(kind:FormationKind,count:number,seed=0):Slot[]{
 const n=Math.max(0,Math.min(FORMATION_RULES.maximumMembers,Math.floor(count))),p=FORMATION_PROFILES[kind],s=p.spacing,out:Slot[]=[];
 if(!n)return out;
 if(kind==='wedge'){
  for(let row=0;out.length<n;row++)for(let i=0;i<=row&&out.length<n;i++)out.push({ox:(i-row/2)*s,oz:-row*s*.9});
 }else if(kind==='loose'){
  const rand=mulberry32((seed>>>0)^0x9e3779b9),cols=Math.max(2,Math.ceil(Math.sqrt(n*1.6)));
  for(let i=0;i<n;i++){const c=i%cols,r=Math.floor(i/cols);out.push({ox:(c-(cols-1)/2)*s+(rand()-.5)*s*.28,oz:-r*s*.9+(rand()-.5)*s*.28});}
 }else{
  const ranks=Math.min(p.ranks,Math.max(1,Math.ceil(n/12))),cols=Math.ceil(n/ranks);
  for(let i=0;i<n;i++){const r=Math.floor(i/cols),c=i%cols,inRank=Math.min(cols,n-r*cols);out.push({ox:(c-(inRank-1)/2)*s,oz:-r*s*1.05});}
 }
 return out.sort((a,b)=>b.oz-a.oz||Math.abs(a.ox)-Math.abs(b.ox)||a.ox-b.ox);
}
/** Local slot to world offset for a group facing `facing` (radians, atan2(dx,dz) like Unit.facing). */
export function rotateSlot(slot:Slot,facing:number):Slot{
 const fx=Math.sin(facing),fz=Math.cos(facing);
 return {ox:fx*slot.oz+fz*slot.ox,oz:fz*slot.oz-fx*slot.ox};
}
export function minimumSlotGap(slots:readonly Slot[]){
 let best=Infinity;for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++)best=Math.min(best,Math.hypot(slots[i].ox-slots[j].ox,slots[i].oz-slots[j].oz));
 return best;
}
/** Per-kind effect, eased by cohesion so a broken group gets only part of the benefit or penalty. */
export const eased=(value:number,cohesion:number)=>1+(value-1)*Math.max(0,Math.min(1,cohesion));
export function validFormationKind(k:unknown):k is FormationKind{return typeof k==='string'&&(FORMATION_KINDS as readonly string[]).includes(k);}
