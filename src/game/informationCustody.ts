import type{GameState}from'./types';import{validHandoverProvenance}from'./communityHandoverValidation';
export type InformationCustody={holderTeam?:number;handoverId?:number};
export const informationOwner=(p:InformationCustody,original:number)=>p.holderTeam??original;
/** Original observer/seller/date never change. This only proves which actual
 * transferred carrier/community now holds that dated account. */
export function validInformationCustody(s:GameState,p:InformationCustody,original:number,carrierId:number|undefined){if(p.holderTeam===undefined&&p.handoverId===undefined)return true;return Number.isSafeInteger(carrierId)&&Number.isSafeInteger(p.holderTeam)&&validHandoverProvenance(s,{id:carrierId!,team:p.holderTeam!,originTeam:original,handoverId:p.handoverId},'residentIds');}
