import type {Game} from './sim';
import {releaseFarmToolOwnership} from './farmToolOwnership';
import {isDependent} from './settlement';
import type {GameState,Unit} from './types';
import {farmToolCondition,type FarmToolKind} from './farmTools';
import {supplyDrops,supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import {connectedForUnit} from './waterTravel';

export const FARM_TOOL_CARGO_RULES={version:1,maximumRecords:512,transferMetres:1.8} as const;
export type FarmToolHolder={kind:'carrier';unitId:number;x:number;z:number}|{kind:'cache';team:number;buildingId?:number;x:number;z:number}|{kind:'ground';x:number;z:number};
export type FarmToolCargo={id:number;kind:FarmToolKind;condition:number;team:number;originalOwnerTeam:number;holder:FarmToolHolder};
export type FarmToolCargoState={version:1;tools:FarmToolCargo[]};
const R=FARM_TOOL_CARGO_RULES;
const tools=(g:Game)=>g.state.farmToolCargo?.tools||[];
const live=(g:Game,id:number)=>g.state.units.find(u=>u.id===id&&u.hp>0&&!u.prisoner);
const held=(g:Game,u:Unit)=>tools(g).find(t=>t.holder.kind==='carrier'&&t.holder.unitId===u.id);
const close=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z)<=R.transferMetres;
export function clearCargoApproach(g:Game,u:Unit,p:{x:number;z:number}){
 if(!close(u,p)||!connectedForUnit(g,u,p.x,p.z))return false;
 const n=Math.max(1,Math.ceil(Math.hypot(u.x-p.x,u.z-p.z)/.4));let probe=u;
 for(let i=1;i<=n;i++){const x=u.x+(p.x-u.x)*i/n,z=u.z+(p.z-u.z)*i/n;if(!g.canStep(probe,x,z))return false;probe={...u,x,z,y:g.travelHeight(x,z)};}return true;
}
export const cargoCacheHolder=(d:SupplyDrop,team:number):FarmToolHolder=>({kind:'cache',team,x:d.x,z:d.z,...(d.kind==='camp'?{}:{buildingId:d.id})});
export const sameCargoCache=(h:Extract<FarmToolHolder,{kind:'cache'}>,d:SupplyDrop)=>Math.hypot(h.x-d.x,h.z-d.z)<.01&&(d.kind==='camp'?h.buildingId===undefined:h.buildingId===d.id);
export function reachedCargoCache(g:Game,u:Unit,team:number){return supplyDrops(g,team).find(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});}
function root(g:Game){return g.state.farmToolCargo??={version:1,tools:[]};}
function carried(t:FarmToolCargo,u:Unit){t.holder={kind:'carrier',unitId:u.id,x:u.x,z:u.z};t.team=u.team;u.farmToolCargoId=t.id;}
function remove(g:Game,t:FarmToolCargo){const s=g.state.farmToolCargo!;s.tools.splice(s.tools.indexOf(t),1);}
const no=(reason:string)=>({accepted:false as const,reason});

/** Caller supplies political consent/loot eligibility. This adapter enforces real
 * bodies, contact, unique custody and existing equipment, never crafting output. */
export function takeFarmTool(g:Game,sourceId:number,carrierId:number){
 const source=g.state.units.find(u=>u.id===sourceId),carrier=live(g,carrierId);
 if(!source?.farmTool||!carrier)return no('Need an existing tool and living carrier');
 if(source.farmToolWork)return no('Finish or retain the existing paid tool project');
 if(carrier.farmToolWork)return no('This carrier retains a paid tool project');
 if(carrier.farmToolCargoId!==undefined||held(g,carrier))return no('This carrier already holds a tool');
 if(tools(g).length>=R.maximumRecords)return no('Tool record capacity full; original equipment retained');
 if(!clearCargoApproach(g,carrier,source))return no('Walk the carrier to the actual tool holder');
 const t:FarmToolCargo={id:g.id(),kind:source.farmTool,condition:farmToolCondition(source),team:carrier.team,originalOwnerTeam:source.team,holder:{kind:'carrier',unitId:carrier.id,x:carrier.x,z:carrier.z}};
 root(g).tools.push(t);delete source.farmTool;delete source.farmToolCondition;carried(t,carrier);
 return{accepted:true as const,toolId:t.id,reason:'Existing farming tool moved into the carrier’s custody'};
}
export function pickupFarmTool(g:Game,carrierId:number,toolId:number){
 const u=live(g,carrierId),t=tools(g).find(t=>t.id===toolId);
 if(!u||!t||u.farmToolWork||u.farmToolCargoId!==undefined||held(g,u)||t.holder.kind==='carrier')return no('Need a free carrier and an actual stored or dropped tool');
 if(t.holder.kind==='cache'){const h=t.holder;if(h.team!==u.team||!supplyDrops(g,h.team).some(d=>sameCargoCache(h,d)&&(()=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);})()))return no('Reach the tool’s actual owned cache');}
 else if(!clearCargoApproach(g,u,t.holder))return no('Walk to the dropped tool');
 carried(t,u);return{accepted:true as const,toolId:t.id,reason:'Existing tool picked up with its original condition'};
}
/** Taking a tool by force: the victim's equipped or carried tool moves into the robber's hands with its condition. Nothing is created or repaired. */
export function robFarmTool(g:Game,victim:Unit,robber:Unit){
 if(robber.hp<=0||robber.farmToolWork||robber.farmToolCargoId!==undefined||held(g,robber))return no('The taker already holds a tool');
 const carriedTool=held(g,victim);
 if(carriedTool){carried(carriedTool,robber);delete victim.farmToolCargoId;return{accepted:true as const,toolId:carriedTool.id,reason:'Their carried tool taken'};}
 if(!victim.farmTool||victim.farmToolWork)return no('No tool to take');
 if(tools(g).length>=R.maximumRecords)return no('Tool record capacity full; the tool stays with its holder');
 const t:FarmToolCargo={id:g.id(),kind:victim.farmTool,condition:farmToolCondition(victim),team:robber.team,originalOwnerTeam:victim.team,holder:{kind:'carrier',unitId:robber.id,x:robber.x,z:robber.z}};
 root(g).tools.push(t);delete victim.farmTool;delete victim.farmToolCondition;carried(t,robber);
 return{accepted:true as const,toolId:t.id,reason:'Their tool taken'};
}
export function depositFarmTool(g:Game,carrierId:number,targetTeam?:number){
 const u=live(g,carrierId),t=u&&held(g,u);if(!u||!t||u.farmToolCargoId!==t.id)return no('No actual carried tool');
 const team=targetTeam??u.team;if(!Number.isSafeInteger(team)||team<0||!g.state.tribes[team]?.alive)return no('Choose an existing receiving village');
 const drop=reachedCargoCache(g,u,team);if(!drop)return no('Physically reach the receiving village’s actual cache');
 t.holder=cargoCacheHolder(drop,team);t.team=team;delete u.farmToolCargoId;
 return{accepted:true as const,toolId:t.id,reason:'The same tool deposited at the receiving cache'};
}
export function equipCarriedFarmTool(g:Game,carrierId:number,receiverId:number){
 const u=live(g,carrierId),receiver=live(g,receiverId),t=u&&held(g,u);
 if(!u||!receiver||!t||u.farmToolCargoId!==t.id)return no('Need an actual carried tool and living receiver');
 if(receiver.type!=='worker'||receiver.militia||isDependent(g,receiver)||receiver.farmTool||receiver.farmToolWork||receiver.copperStudy)return no('Receiver must be a farmer with no tool or paid tool project');
 if(!clearCargoApproach(g,u,receiver))return no('Walk the actual tool to the receiver');
 receiver.farmTool=t.kind;receiver.farmToolCondition=t.condition;delete u.farmToolCargoId;remove(g,t);
 return{accepted:true as const,reason:'Existing tool equipped without repairing or crafting it'};
}
/** Full cap leaves exact equipment on the dead body; cleanup MUST retain that
 * body while farmToolBodyMustRemain is true, then retry after record space opens. */
export function farmToolBodyMustRemain(u:Unit){return u.hp<=0&&!!u.farmTool;}
export function reconcileFarmToolCargo(g:Game){
 for(const t of tools(g)){
  if(t.holder.kind==='carrier'){const h=t.holder,u=g.state.units.find(u=>u.id===h.unitId);
   if(u&&u.hp>0){h.x=u.x;h.z=u.z;t.team=u.team;continue;}
   t.holder={kind:'ground',x:u?.x??h.x,z:u?.z??h.z};if(u?.farmToolCargoId===t.id)delete u.farmToolCargoId;
  }else if(t.holder.kind==='cache'){const h=t.holder;if(!supplyDrops(g,h.team).some(d=>sameCargoCache(h,d)))t.holder={kind:'ground',x:h.x,z:h.z};}
 }
 for(const u of g.state.units){
  if(u.hp>0||!u.farmTool||tools(g).length>=R.maximumRecords)continue;
  // Death ends the paid project without refund or completion; only the
  // original worn equipment reaches the ground, never the promised new output.
  root(g).tools.push({id:g.id(),kind:u.farmTool,condition:farmToolCondition(u),team:u.team,originalOwnerTeam:u.team,holder:{kind:'ground',x:u.x,z:u.z}});if(u.farmToolWork){releaseFarmToolOwnership(g,u);delete u.farmToolWork;}delete u.farmTool;delete u.farmToolCondition;
 }
}
/** Optional absent state is legacy-compatible. Reject duplicate/phantom carrier
 * refs, malformed conditions/IDs/locations and unbounded records on load. */
export function validFarmToolCargo(s:GameState){
 const c=s.farmToolCargo,units=s.units;if(c===undefined)return units.every(u=>u.farmToolCargoId===undefined);
 if(!c||c.version!==1||!Array.isArray(c.tools)||c.tools.length>R.maximumRecords)return false;
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v),id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<s.nextId,team=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<s.tribes.length;
 const ids=new Set<number>(),carriers=new Set<number>(),half=(s.worldOptions?.size??1040)/2;
 for(const t of c.tools){if(!t||!id(t.id)||ids.has(t.id)||s.units.some(u=>u.id===t.id)||s.buildings.some(b=>b.id===t.id)||!['woodenArd','stoneHoe','copperTools','ironTools'].includes(t.kind)||!finite(t.condition)||t.condition<0||t.condition>1||!team(t.team)||!team(t.originalOwnerTeam))return false;ids.add(t.id);
  const h=t.holder;if(!h||!finite(h.x)||!finite(h.z)||Math.abs(h.x)>half||Math.abs(h.z)>half)return false;
  if(h.kind==='carrier'){const u=units.find(u=>u.id===h.unitId);if(!id(h.unitId)||carriers.has(h.unitId)||!u||u.farmToolCargoId!==t.id)return false;carriers.add(h.unitId);}
  else if(h.kind==='cache'){if(!team(h.team)||h.team!==t.team||h.buildingId!==undefined&&(!id(h.buildingId)||!s.buildings.some(b=>b.id===h.buildingId&&b.team===h.team&&b.hp>0&&b.build>=1&&(['townhall','warehouse','cornerstone'].includes(b.type)||b.team===3&&b.raiderCamp)&&Math.hypot(b.x-h.x,b.z-h.z)<.01)))return false;}
  else if(h.kind!=='ground')return false;
 }
 return units.every(u=>u.farmToolCargoId===undefined||id(u.farmToolCargoId)&&c.tools.some(t=>t.id===u.farmToolCargoId&&t.holder.kind==='carrier'&&t.holder.unitId===u.id));
}
