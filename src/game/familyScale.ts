/** Ruling-family importance scales with population: every society has a ruling house, but a 10-person band does not need
 * succession law, marriage diplomacy or claims. Pure. Combine with polityModel.features(tier): the AND of both gates applies.
 * Thresholds are population (living people in the society), chosen so mechanics appear when they start to matter:
 *  household  <  14  : a leader and their kin as flavour only (names, portrait, no heirs/claims, no UI weight)
 *  kingroup   14-39  : heirs and fosterage visible; marriage into neighbours is a minor tie
 *  house      40-119 : marriage alliances matter, succession law applies, house personality shows in the dossier
 *  dynasty    >=120  : claims, regency, factions, great-person emergence, full succession crises
 */
import {clamp01} from './rulerCore';
import {features,type KinshipFeatures,type Tier} from './polityModel';

export type FamilyStage='household'|'kingroup'|'house'|'dynasty';
export const FAMILY_THRESHOLDS={kingroup:14,house:40,dynasty:120} as const;
export function familyStage(pop:number):FamilyStage{
 return pop>=FAMILY_THRESHOLDS.dynasty?'dynasty':pop>=FAMILY_THRESHOLDS.house?'house':pop>=FAMILY_THRESHOLDS.kingroup?'kingroup':'household';
}
/** 0..1 weight for UI prominence and for how strongly kinship effects move diplomacy. Smooth so nothing pops on a threshold. */
export function familyWeight(pop:number):number{return clamp01((Math.log2(Math.max(1,pop))-2)/(Math.log2(FAMILY_THRESHOLDS.dynasty*2)-2));}
export type FamilyFeatures=KinshipFeatures&{stage:FamilyStage;weight:number;showDossier:boolean;showSuccessionUI:boolean;greatPersons:boolean;factions:boolean};
export function familyFeatures(tier:Tier,pop:number):FamilyFeatures{
 const f=features(tier),stage=familyStage(pop),weight=familyWeight(pop);
 const rank={household:0,kingroup:1,house:2,dynasty:3}[stage];
 return {
  heirs:f.heirs&&rank>=1,fosterage:f.fosterage&&rank>=1,marriageExchange:f.marriageExchange&&rank>=1,
  claims:f.claims&&rank>=3,regency:f.regency&&rank>=3,envoyHeirs:f.envoyHeirs&&rank>=2,court:f.court&&rank>=2,
  stage,weight,showDossier:true,showSuccessionUI:rank>=2,greatPersons:rank>=3,factions:rank>=2,
 };
}
/** Effect multiplier for kinship ties (marriage bonds etc.): small societies feel them lightly. */
export const kinshipEffectScale=(pop:number)=>.35+.65*familyWeight(pop);
