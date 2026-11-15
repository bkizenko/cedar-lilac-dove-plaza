import type {Game} from './sim';
import {coinPurse} from './tradeNeeds';
import {rivalTradeReserve} from './rivalTrade';
/** Coins are a stored item, struck from real copper at a finished market or town hall and melted back at the same rate.
 * Nothing is created: COINS_PER_COPPER coins always correspond to one copper. Coins then trade, travel and drop as any bulk item. */
export const COINAGE_RULES={version:1,coinsPerCopper:6,minimumAge:1,maximumBatchCopper:24} as const;
export type CoinageResult={accepted:boolean;reason:string};
export function coinageIssue(g:Game,team:number):string|null{
 const t=g.tribe(team);if(!t)return 'No such society';
 if(t.age<COINAGE_RULES.minimumAge)return 'Coin striking needs metalworking (Bronze Age)';
 if(!g.state.buildings.some(b=>b.team===team&&(b.type==='market'||b.type==='townhall')&&b.hp>0&&g.finished(b)))return 'Finish a market or town hall to strike coins';
 return null;
}
export function mintCoins(g:Game,team:number,copper:number):CoinageResult{
 const issue=coinageIssue(g,team);if(issue)return{accepted:false,reason:issue};
 if(!Number.isSafeInteger(copper)||copper<1||copper>COINAGE_RULES.maximumBatchCopper)return{accepted:false,reason:'Choose a whole amount of copper to strike'};
 const t=g.tribe(team);if(Math.floor(t.copper||0)<copper)return{accepted:false,reason:`Need ${copper} copper in stores`};
 t.copper-=copper;const items=t.items??={};items.coins=(items.coins||0)+copper*COINAGE_RULES.coinsPerCopper;
 return{accepted:true,reason:`${copper} copper struck into ${copper*COINAGE_RULES.coinsPerCopper} coins`};
}
export function meltCoins(g:Game,team:number,coins:number):CoinageResult{
 const issue=coinageIssue(g,team);if(issue)return{accepted:false,reason:issue};
 const k=COINAGE_RULES.coinsPerCopper;
 if(!Number.isSafeInteger(coins)||coins<k||coins%k!==0||coins>k*COINAGE_RULES.maximumBatchCopper)return{accepted:false,reason:`Melt coins in multiples of ${k}`};
 const t=g.tribe(team),held=t.items?.coins||0;if(held<coins)return{accepted:false,reason:`Only ${held} coins in stores`};
 t.items!.coins=held-coins;t.copper+=coins/k;
 return{accepted:true,reason:`${coins} coins melted into ${coins/k} copper`};
}

const struck=new WeakMap<object,number>();
/** Rivals with a market strike coins from copper above their working reserve until the purse is full (same copper-to-coin rate). */
export function tickRivalCoinage(g:Game){
 const at=Math.floor(g.state.time/300);if(struck.get(g)===at)return;struck.set(g,at);
 for(const t of g.state.tribes){if(t.id===0||t.id===3||!t.alive)continue;const purse=coinPurse(g,t.id);if(!purse)continue;
  const have=t.items?.coins||0,spare=Math.floor((t.copper||0)-rivalTradeReserve(g,t.id,'copper'));if(have>=purse||spare<1)continue;
  mintCoins(g,t.id,Math.min(spare,Math.ceil((purse-have)/COINAGE_RULES.coinsPerCopper),COINAGE_RULES.maximumBatchCopper));}
}
