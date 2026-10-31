import type {ResKind} from './types';
/** Existing relative barter values, centralized for adjustment. These remain
 * balance weights, not claims of measured labour or transport cost. */
export const TRADE_PRICING=Object.freeze({worth:Object.freeze({food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5} satisfies Record<ResKind,number>),scarcityMinimum:.65,scarcityMaximum:1.8,minimumStock:10,materialNeed:60,foodNeedMinimum:40,foodNeedPerResident:15,baseTerms:.86,economicTerms:.95,trustBonus:.18,tensionPenalty:.08,rivalTerms:.9});
/** Integer payment rounds up, so a partial fill never grants free goods or
 * beats the quoted packet's unit price. Full fills preserve existing terms. */
export function partialPayment(budget:number,quotedQuantity:number,filledQuantity:number){return filledQuantity<quotedQuantity?Math.max(1,Math.ceil(budget*filledQuantity/quotedQuantity)):budget;}
