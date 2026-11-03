import{validCommunityKnowledgeSnapshot}from'./inheritedKnowledge';
import type{GameState}from'./types';
import type{CommunityHandover,HandoverProvenance}from'./communityHandoverTypes';
import{ITEM_KINDS,PRODUCTION_RECIPES}from'./production';import{FOOD_KINDS}from'./foodKinds';
export const HANDOVER_ASSETS=['hallIds','residentIds','siteIds','boatIds','productionIds','haulageProjectIds','livestockIds','coastalVoyageIds','societyMissionIds','coastalCommissionIds']as const;
export type HandoverAsset=typeof HANDOVER_ASSETS[number];
/** Walk actual prior asset custody, retaining the first maker/culture. */
export function validHandoverProvenance(s:GameState,p:HandoverProvenance&{id:number;team:number},asset:HandoverAsset){
 if(p.originTeam===undefined&&p.handoverId===undefined)return true;
 if(!Number.isSafeInteger(p.originTeam)||!s.tribes[p.originTeam!]||!Number.isSafeInteger(p.handoverId))return false;
 const rows=s.communityHandovers||[];if(!Array.isArray(rows))return false;let row=rows.find(r=>r&&r.id===p.handoverId),team=p.team,before=Infinity;
 for(let n=0;row&&n<=rows.length;n++){if(row.toTeam!==team||row.timeSeconds>before||!Array.isArray(row[asset])||!row[asset].includes(p.id))return false;if(row.fromTeam===p.originTeam)return true;team=row.fromTeam;before=row.timeSeconds;const index=rows.indexOf(row);row=rows.slice(0,index).reverse().find(r=>r&&r.toTeam===team&&Array.isArray(r[asset])&&r[asset].includes(p.id));}
 return false;
}
export function handedOver(s:GameState,p:HandoverProvenance&{id:number;team:number},asset:HandoverAsset){return p.handoverId!==undefined&&validHandoverProvenance(s,p,asset);}
export function validCommunityHandovers(s:GameState){
 if(s.communityHandovers===undefined)return s.tribes.every(t=>!t.inheritedCropTrials?.length);if(!Array.isArray(s.communityHandovers)||s.communityHandovers.length>20000)return false;
 const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12,id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<s.nextId,team=(v:unknown)=>Number.isSafeInteger(v)&&!!s.tribes[Number(v)];const seen=new Set<number>();let time=-Infinity;
 for(const r of s.communityHandovers){if(!r||Object.keys(r).some(k=>!['version','id','fromTeam','toTeam','timeSeconds','scope','stocks','knowledge','cacheAnchor','recipientCacheAnchor',...HANDOVER_ASSETS].includes(k))||r.version!==1||!id(r.id)||seen.has(r.id)||!team(r.fromTeam)||!team(r.toTeam)||r.fromTeam===r.toTeam||r.fromTeam===3||r.toTeam===3||!num(r.timeSeconds)||r.timeSeconds>s.time||r.timeSeconds<time||!['society','community'].includes(r.scope))return false;time=r.timeSeconds;seen.add(r.id);
  for(const key of HANDOVER_ASSETS)if(!Array.isArray(r[key])||r[key].length>20000||new Set(r[key]).size!==r[key].length||r[key].some(x=>!id(x)))return false;
  if(!validCommunityKnowledgeSnapshot(s,r,key=>Object.hasOwn(PRODUCTION_RECIPES,key)))return false;
  if(r.hallIds.some(x=>!r.siteIds.includes(x)))return false;
  if(r.cacheAnchor!==undefined&&!validHandoverAnchor(s,r.cacheAnchor)||r.recipientCacheAnchor!==undefined&&!validHandoverAnchor(s,r.recipientCacheAnchor))return false;
  if(r.stocks!==undefined){if(r.scope!=='society')return false;const x=r.stocks;if(!x||Object.keys(x).some(k=>!['food','foodLots','wood','stone','copper','iron','spears','bows','blades','seeds','waterLiters','items'].includes(k))||!['food','wood','stone','copper','iron','spears','bows','blades','seeds','waterLiters'].every(k=>num(x[k as keyof typeof x]))||!x.items||!x.foodLots||Object.entries(x.items).some(([k,n])=>!ITEM_KINDS.includes(k as any)||!num(n))||Object.entries(x.foodLots).some(([k,n])=>!FOOD_KINDS.includes(k as any)||!num(n))||Math.abs(Object.values(x.foodLots).reduce((a,b)=>a+(b||0),0)-x.food)>1e-6*Math.max(1,x.food))return false;}
 }
 return validInheritedTrials(s);
}

export function validHandoverAssets(s:GameState){for(const [list,key]of [[s.production?.projects,'productionIds'],[s.haulageProjects,'haulageProjectIds'],[s.coastalVoyages,'coastalVoyageIds'],[s.rivalMissions,'societyMissionIds'],[s.coastalCommissions,'coastalCommissionIds']]as const)for(const p of list||[])if(!p||!validHandoverProvenance(s,p,key))return false;for(const u of s.units){if(u.handoverId!==undefined||u.originTeam!==undefined){const h=s.communityHandovers?.find(r=>r.id===u.handoverId);if(!h||!validHandoverProvenance(s,{...u,team:h.toTeam},'residentIds'))return false;}}for(const u of s.units)if(u.waterCargoEvidence&&!validHandoverProvenance(s,{...u.waterCargoEvidence,id:u.id},'residentIds'))return false;return true;}
export function handoverReturn(s:GameState,p:HandoverProvenance&{id:number;team:number;phase:string;resumePhase?:string},asset:HandoverAsset){return handedOver(s,p,asset)&&['returning','sailingHome','boardingHome','landingHome','unloading','complete','completed','lost'].includes(p.phase==='paused'?p.resumePhase||'':p.phase);}

export function validHandoverAnchor(s:GameState,p:any){return!!p&&Object.keys(p).every(k=>['kind','id','x','y','z'].includes(k))&&['camp','building'].includes(p.kind)&&[p.x,p.y,p.z].every(n=>typeof n==='number'&&Number.isFinite(n))&&Math.abs(p.x)<=(s.worldOptions?.size||1040)/2+32&&Math.abs(p.z)<=(s.worldOptions?.size||1040)/2+32&&(p.kind==='building'?Number.isSafeInteger(p.id)&&p.id>0&&p.id<s.nextId:p.id===undefined);}
export function currentCommunityOwner(s:GameState,origin:number,afterTime=-Infinity){let owner=origin;for(const r of s.communityHandovers||[])if(r.scope==='society'&&r.fromTeam===owner&&r.timeSeconds>=afterTime)owner=r.toTeam;return owner;}
function validInheritedTrials(s:GameState){const actors=new Set<number>();for(const t of s.tribes){if(t.inheritedCropTrials===undefined)continue;if(!Array.isArray(t.inheritedCropTrials)||t.inheritedCropTrials.length>20000)return false;const ids=new Set<string>();for(const q of t.inheritedCropTrials){if(!q)return false;const h=s.communityHandovers?.find(r=>r.id===q.handoverId),k=`${q.handoverId}:${q.sourceTeam}`;if(!q||!h||h.fromTeam!==q.sourceTeam||currentCommunityOwner(s,h.toTeam,h.timeSeconds)!==t.id||ids.has(k)||!q.trial||!['grain','pulses','tubers'].includes(q.trial.kind)||!Number.isFinite(q.trial.progress)||q.trial.progress<0||!Number.isFinite(q.trial.duration)||q.trial.duration<30||q.trial.duration>360||q.trial.progress>q.trial.duration||!validHandoverAnchor(s,q.anchor)||q.anchor.kind==='building'&&!h.siteIds.includes(q.anchor.id!)||!Array.isArray(q.actorIds)||q.actorIds.length>3||new Set(q.actorIds).size!==q.actorIds.length)return false;ids.add(k);for(const id of q.actorIds){if(!Number.isSafeInteger(id)||id<=0||id>=s.nextId||actors.has(id))return false;actors.add(id);const u=s.units.find(u=>u.id===id);if(u&&u.hp>0&&u.studyCrop!==undefined&&(u.team!==t.id||u.studyCrop!==q.trial.kind))return false;}}}return true;}
