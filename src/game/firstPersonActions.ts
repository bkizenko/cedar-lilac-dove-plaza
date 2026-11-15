/** First-person acting and possession, pure rules (no three.js, no Game import, no saved state).
 * The avatar walks; the controlled villager follows it through the ordinary move order. A right-click order (gather, build, work, attack) hands the
 * villager its task and the eye rides with the villager until the player moves again: player orders win, and nothing is invented here.
 * On exit the villager is released: a follow-move is stopped in place, a real task is left to finish, and the village AI resumes. */
export type Pt={x:number;z:number};
export type PossessionUnit={id:number;team:number;hp:number;x:number;z:number;type:string;order?:string;militia?:boolean;prisoner?:unknown;carry?:number;carryType?:string|null;farmTool?:string};
export type Possession={unitId:number|null;/** the villager is on a task the player gave; the eye rides with it */working:boolean;lastSendAt:number;lastTo:Pt|null;following:boolean};
export const POSSESSION_RULES={followGap:1.6,resendMeters:1.2,resendSeconds:.45,meleeReach:3.2,meleeArcCos:.5,workEyeRate:6};

export const newPossession=():Possession=>({unitId:null,working:false,lastSendAt:-1e9,lastTo:null,following:false});
export function canPossess(u:PossessionUnit|undefined|null):u is PossessionUnit{return !!u&&u.team===0&&u.hp>0&&!u.prisoner;}
/** Villager to control: the first selected living one, else the nearest living one to `near`. Null when nobody can be controlled (the avatar then walks as a witness). */
export function chooseVillager(units:readonly PossessionUnit[],selectedIds:readonly number[],near:Pt):PossessionUnit|null{
 const pick=units.find(u=>selectedIds.includes(u.id)&&canPossess(u));if(pick)return pick;
 let best:PossessionUnit|null=null,bd=Infinity;
 for(const u of units){if(!canPossess(u))continue;const d=Math.hypot(u.x-near.x,u.z-near.z);if(d<bd){bd=d;best=u;}}
 return best;
}
/** The possessed unit if it is still controllable, else null. Callers drop possession when this is null (death, capture, removal). */
export function liveUnit(p:Possession,units:readonly PossessionUnit[]):PossessionUnit|null{
 if(p.unitId===null)return null;const u=units.find(x=>x.id===p.unitId);return canPossess(u)?u:null;
}
/** Per frame while the player is steering: does the villager need a fresh move order to keep up with the avatar? */
export function followOrder(p:Possession,unit:Pt,body:Pt,now:number):Pt|null{
 const R=POSSESSION_RULES;if(p.working)return null;
 if(Math.hypot(unit.x-body.x,unit.z-body.z)<=R.followGap)return null;
 if(now-p.lastSendAt<R.resendSeconds)return null;
 if(p.lastTo&&Math.hypot(p.lastTo.x-body.x,p.lastTo.z-body.z)<R.resendMeters)return null;
 return{x:body.x,z:body.z};
}
export function followSent(p:Possession,to:Pt,now:number):Possession{return{...p,lastSendAt:now,lastTo:to,following:true};}
/** The player gave a task order: the eye now rides with the villager. */
export function taskGiven(p:Possession):Possession{return p.unitId===null?p:{...p,working:true,following:false,lastTo:null};}
/** Movement input takes the body back from a working villager. */
export function takeOver(p:Possession,moving:boolean):Possession{return p.working&&moving?{...p,working:false,lastTo:null}:p;}
/** Eye position while the villager works: eases toward the villager so the view travels with them. */
export function eyeTowardUnit(body:Pt,unit:Pt,dt:number):Pt{
 const k=1-Math.exp(-POSSESSION_RULES.workEyeRate*Math.max(0,Math.min(.1,dt)));
 return{x:body.x+(unit.x-body.x)*k,z:body.z+(unit.z-body.z)*k};
}
/** What to do with the villager when the player leaves: stop a pure follow-move; leave a real task alone. */
export function handBack(p:Possession,unit:PossessionUnit|null):'none'|'stop'{
 if(!unit||p.working||!p.following)return'none';
 return unit.order==='move'?'stop':'none';
}
/** Armed adults swing; workers and the leader do not (same rule the contact verbs use). */
export function isArmed(u:PossessionUnit):boolean{return !!u.militia||!['worker','leader'].includes(u.type);}
/** Nearest hostile in front of the eye within reach: the target of a swing. */
export function meleeTarget<T extends Pt&{id:number;hp:number}>(body:Pt&{yaw:number},foes:readonly T[],reach:number=POSSESSION_RULES.meleeReach,arcCos:number=POSSESSION_RULES.meleeArcCos):T|null{
 const fx=-Math.sin(body.yaw),fz=-Math.cos(body.yaw);let best:T|null=null,bd=Infinity;
 for(const f of foes){
  if(f.hp<=0)continue;const dx=f.x-body.x,dz=f.z-body.z,d=Math.hypot(dx,dz);
  if(d>reach||d<1e-6)continue;if((dx*fx+dz*fz)/d<arcCos)continue;
  if(d<bd){bd=d;best=f;}
 }
 return best;
}
/** One short line for what the villager holds or carries (shown low in the view). */
export function heldLabel(u:PossessionUnit|null|undefined):string{
 if(!u)return'';
 if(u.carry&&u.carry>0&&u.carryType)return`Carrying ${Math.round(u.carry)} ${u.carryType}`;
 if(u.farmTool)return`Holding ${u.farmTool.replace(/([A-Z])/g,' $1').toLowerCase()}`;
 if(isArmed(u))return u.militia?'Armed (militia)':'Armed';
 return'Hands empty';
}
export type CrosshairTarget={kind:'none'|'ground'|'unit'|'building'|'resource'|'animal';hostile?:boolean;stranger?:boolean;site?:boolean;workplace?:boolean};
/** The verb a right-click would do, so the label tells the truth before the player commits. */
export function crosshairVerb(t:CrosshairTarget,armed:boolean):string{
 switch(t.kind){
  case'unit':return t.hostile?(armed?'Attack':'Hostile'):t.stranger?'Meet (walk up to talk)':'';
  case'building':return t.site?'Build':t.workplace?'Work here':'';
  case'resource':return'Gather';
  case'animal':return'Hunt';
  case'ground':return'Go there';
  default:return'';
 }
}
