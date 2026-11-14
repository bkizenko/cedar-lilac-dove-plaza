import type {Game} from '../game/sim';
import {tradeParties,tradePartyPosition} from '../game/tradeParties';
import type {TradeParty} from '../game/tradeParties';
import {stockpileByKind} from '../game/production';
import type {ItemKind} from '../game/production';
import {supplyDrops} from '../game/campAnchor';
/** Pure placement maths for trade parties and ground stockpiles (no three.js, so it runs headless).
 *  Nothing here is stored: every placement is derived from records the simulation already holds. */
export type PileShape='crate'|'log'|'sack';
export const PILE_RULES={maxPartyInstances:24,maxPileInstances:256,boxesPerKindMax:6,refreshSeconds:1,sideOffset:3.2,spacing:.75} as const;
const SACK=new Set<string>(['chaff','straw','grainSheaves','roughGrain','flour','plantFibre','rawWool','cleanWool','yarn','woolYarn','cloth','woolCloth','felt','greenMalt','tannin','rawHide','cleanHide','driedSkin','leather']);
const LOG=new Set<string>(['bone','charcoal','cordage','copperOre','ironOre']);
export const pileShapeOf=(kind:string):PileShape=>SACK.has(kind)?'sack':LOG.has(kind)?'log':'crate';
export type PartyPlacement={id:number;mode:'land'|'sea';x:number;z:number;yaw:number;walking:boolean};
/** Facing follows the travel direction: outbound toward the destination, returning toward the origin; trading parties keep their last heading. */
export function partyYaw(p:TradeParty){
 const sign=p.phase==='returning'?-1:1,dx=(p.x1-p.x0)*sign,dz=(p.z1-p.z0)*sign;
 return dx===0&&dz===0?0:Math.atan2(dx,dz);
}
/** Fills `out` (reused; its length is the live count) with one placement per running party. Allocation-free after warm-up. */
export function collectPartyPlacements(g:Game,out:PartyPlacement[]){
 let n=0;
 for(const p of tradeParties(g)){
  if(p.phase==='done'||n>=PILE_RULES.maxPartyInstances)continue;
  const pos=tradePartyPosition(p);let o=out[n];if(!o){o={id:0,mode:'land',x:0,z:0,yaw:0,walking:false};out[n]=o;}
  o.id=p.id;o.mode=p.mode;o.x=pos.x;o.z=pos.z;o.yaw=partyYaw(p);o.walking=p.phase==='outbound'||p.phase==='returning';n++;
 }
 out.length=n;return out;
}
export type PilePlacement={shape:PileShape;kind:string;x:number;z:number;yaw:number;scale:number;layer:number};
/** One small pile per overflow kind, ringed on the side of the main store. Count of boxes grows with sqrt of the amount, so a huge heap is a bigger pile, not a thousand draws. */
export function collectPilePlacements(g:Game,team:number,out:PilePlacement[]){
 const pile=stockpileByKind(g,team),kinds=Object.keys(pile) as ItemKind[];
 if(!kinds.length)return out;
 const drops=supplyDrops(g,team),drop=drops.find(d=>'type' in d&&d.type==='warehouse')??drops.find(d=>'type' in d&&d.type==='townhall')??drops[0];
 if(!drop)return out;
 kinds.sort();
 for(let k=0;k<kinds.length&&out.length<PILE_RULES.maxPileInstances;k++){
  const kind=kinds[k],amount=pile[kind]||0;if(!(amount>0))continue;
  const boxes=Math.min(PILE_RULES.boxesPerKindMax,Math.max(1,Math.ceil(Math.sqrt(amount)/2))),shape=pileShapeOf(kind);
  const a=.6+k*.9,cx=drop.x+Math.cos(a)*PILE_RULES.sideOffset,cz=drop.z+Math.sin(a)*PILE_RULES.sideOffset;
  for(let i=0;i<boxes&&out.length<PILE_RULES.maxPileInstances;i++){
   const layer=i>=3?1:0,slot=layer?i-3:i,ox=(slot-(layer?.5:1))*PILE_RULES.spacing;
   out.push({shape,kind,x:cx+Math.cos(a+Math.PI/2)*ox,z:cz+Math.sin(a+Math.PI/2)*ox,yaw:a+i*.37,scale:.85+((k*7+i*3)%5)*.06,layer});
  }
 }
 return out;
}
