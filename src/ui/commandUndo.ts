import type {Game} from '../game/sim';
import {pendingSitePreparation,cancelSitePreparation} from '../game/sitePreparation';
/** Stock a fresh placement can draw from the village store. */
export const UNDO_STOCK=['food','wood','stone','copper','iron','seeds'] as const;
type StockKey=typeof UNDO_STOCK[number];
export type StockSnapshot=Record<StockKey,number>;
/** How long the undo chip stays after a placement, in real seconds. */
export const UNDO_WINDOW_SECONDS=5;
export type PlacementUndo={buildingId:number;spent:Partial<StockSnapshot>;placedAt:number};
export function stockSnapshot(g:Game,team=0):StockSnapshot{const t=g.tribe(team);const out={} as StockSnapshot;for(const k of UNDO_STOCK)out[k]=Number((t as unknown as Record<string,number>)?.[k])||0;return out;}
/** Exactly what one placement took from the store (never negative). */
export function stockSpent(before:StockSnapshot,after:StockSnapshot):Partial<StockSnapshot>{const out:Partial<StockSnapshot>={};for(const k of UNDO_STOCK){const d=before[k]-after[k];if(d>1e-9)out[k]=d;}return out;}
export function undoIssue(g:Game,u:PlacementUndo|null|undefined):string|null{
 if(!u)return 'Nothing to undo';
 const b=g.state.buildings.find(b=>b.id===u.buildingId&&b.team===0);
 if(!b||b.hp<=0)return 'That site is already gone';
 if((b.build||0)>0)return 'Building work has started — select it and reclaim instead';
 return null;
}
/** Cancel a just-placed site and refund exactly what was spent placing it; work already done is never refunded. */
export function undoPlacement(g:Game,u:PlacementUndo):{accepted:boolean;reason:string}{
 const issue=undoIssue(g,u);if(issue)return{accepted:false,reason:issue};
 const b=g.state.buildings.find(b=>b.id===u.buildingId)!;
 if(g.state.selBld===b)g.clearSelect();
 if(pendingSitePreparation(b)){cancelSitePreparation(g,b);return{accepted:true,reason:'Placement undone — reserved materials returned'};}
 const t=g.tribe(0) as unknown as Record<string,number>;
 const back:string[]=[];
 if(!b.plannedCost)for(const k of UNDO_STOCK){const n=u.spent[k]||0;if(n>0){t[k]=(t[k]||0)+n;back.push(`${Math.round(n*10)/10} ${k}`);}}
 b.hp=0;b.queue=[];g.state.walkDirty=true;g.workBoard.reset();
 return{accepted:true,reason:back.length?`Placement undone — ${back.join(', ')} returned`:'Placement undone — nothing had been spent'};
}
