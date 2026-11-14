import type {CouncilModel} from '../../game/rulersView';
type Regency=NonNullable<NonNullable<CouncilModel['handover']>['regency']>;
/** Plain words for a sitting regency: who stands in, how long, and the real limits on their hand. Same wording in Field and Hearth. */
export function regencyText(regent:string|undefined,r:Regency){
 const yrs=r.yearsLeft<=1?'about a year':`about ${r.yearsLeft} years`;
 return {headline:`${regent??'A regent'} holds the seat for a ruler too young to rule.`,left:`Majority in ${yrs}.`,limits:r.limits.map(l=>l.charAt(0).toUpperCase()+l.slice(1)+'.')};
}
