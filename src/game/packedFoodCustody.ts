import type {FoodKind} from './types';

/** Unwired custody kernel: quantities are physical food units, never nourishment. */
export const PACKED_FOOD_RULES={version:1,maximumUnits:100,maximumLots:64,tolerance:1e-7} as const;
export type PackedFoodOrigin={team:number;anchorKind:'camp'|'building';buildingId?:number;x:number;z:number;loadedAt:number};
export type PackedFoodLot<K extends string=FoodKind>={kind:K;units:number;origin:PackedFoodOrigin};
export type PackedFoodCustody<K extends string=FoodKind>={version:1;legacyUnits:number;lots:PackedFoodLot<K>[]};
/** Missing custody is explicitly unidentified legacy scalar food. */
export type PackedFoodView<K extends string=FoodKind>={food:number;foodUsed:number;foodCustody?:PackedFoodCustody<K>};
export type PackedFoodCatalogue<K extends string=FoodKind>={kinds:readonly K[];nourishment:Readonly<Partial<Record<K,number>>>;edible:(kind:K)=>boolean};
export type PackedFoodValidation={time:number;worldHalf:number;teamCount:number;nextId:number};
export type PackedFoodWithdrawal<K extends string=FoodKind>={units:number;nourishment:number;legacyUnits:number;lots:PackedFoodLot<K>[]};
const R=PACKED_FOOD_RULES;
const finite=(n:unknown,max=R.maximumUnits):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
const key=<K extends string>(lot:PackedFoodLot<K>)=>JSON.stringify([lot.kind,lot.origin.team,lot.origin.anchorKind,lot.origin.buildingId??null,lot.origin.x,lot.origin.z,lot.origin.loadedAt]);
const clone=<K extends string>(lot:PackedFoodLot<K>):PackedFoodLot<K>=>({...lot,origin:{...lot.origin}});
function factor<K extends string>(c:PackedFoodCatalogue<K>,kind:K){const n=c.nourishment[kind]??1;if(!Number.isFinite(n)||n<0)throw new RangeError('Invalid food nourishment');return n;}
function amount(n:number){if(!finite(n))throw new RangeError('Invalid physical food quantity');}
function assertView<K extends string>(p:PackedFoodView<K>,c:PackedFoodCatalogue<K>){
 amount(p.food);amount(p.foodUsed);if(p.food+p.foodUsed>R.maximumUnits+R.tolerance)throw new RangeError('Pack physical capacity exceeded');
 const v=p.foodCustody;if(!v)return;
 if(v.version!==1||!finite(v.legacyUnits)||!Array.isArray(v.lots)||v.lots.length>R.maximumLots)throw new RangeError('Invalid food custody');
 let sum=v.legacyUnits;const keys=new Set<string>();for(const lot of v.lots){if(!lot||!c.kinds.includes(lot.kind)||!finite(lot.units)||lot.units<=0||!lot.origin)throw new RangeError('Invalid food lot');factor(c,lot.kind);const k=key(lot);if(keys.has(k))throw new RangeError('Duplicate food lot');keys.add(k);sum+=lot.units;}
 if(Math.abs(sum-p.food)>R.tolerance)throw new RangeError('Physical food does not match custody');
}
export function packedFoodUnits<K extends string>(p:PackedFoodView<K>){return p.food;}
export function packedFoodNourishment<K extends string>(p:PackedFoodView<K>,c:PackedFoodCatalogue<K>){
 assertView(p,c);const v=p.foodCustody;if(!v)return p.food;
 return v.legacyUnits+v.lots.reduce((n,l)=>n+(c.edible(l.kind)?l.units*factor(c,l.kind):0),0);
}
/** Plan only. The runtime owner must prove actual cache reach and atomically debit these exact lots. */
export function planPackedFood<K extends string>(stock:Readonly<Partial<Record<K,number>>>,requiredNourishment:number,origin:PackedFoodOrigin,c:PackedFoodCatalogue<K>,maximumUnits:number=R.maximumUnits):PackedFoodCustody<K>|null{
 if(!Number.isFinite(requiredNourishment)||requiredNourishment<0||!finite(maximumUnits))return null;
 let available=0;for(const k of c.kinds){const n=stock[k]??0;if(!finite(n,1e12))return null;if(c.edible(k))available+=n*factor(c,k);}
 if(available+1e-10<requiredNourishment)return null;
 const share=requiredNourishment===0?0:requiredNourishment/available,lots:PackedFoodLot<K>[]=[];let units=0;
 for(const kind of c.kinds){if(!c.edible(kind))continue;const n=(stock[kind]??0)*share;if(n<=0)continue;units+=n;lots.push({kind,units:n,origin:{...origin}});}
 if(units>maximumUnits+R.tolerance||lots.length>R.maximumLots)return null;
 return{version:1,legacyUnits:0,lots};
}
function withdrawal<K extends string>(p:PackedFoodView<K>,units:number,c:PackedFoodCatalogue<K>):PackedFoodWithdrawal<K>{
 assertView(p,c);amount(units);if(units>p.food+R.tolerance)throw new RangeError('Food is not held');
 const take=Math.min(units,p.food),share=p.food>0?take/p.food:0,v=p.foodCustody;
 const lots=v?v.lots.map(l=>({...clone(l),units:l.units*share})).filter(l=>l.units>0):[],legacyUnits=(v?v.legacyUnits:p.food)*share;
 return{units:take,legacyUnits,lots,nourishment:legacyUnits+lots.reduce((n,l)=>n+(c.edible(l.kind)?l.units*factor(c,l.kind):0),0)};
}
/** Custody transfer, return or loss: no eaten counter changes and no kind is invented. */
export function withdrawPackedFood<K extends string>(p:PackedFoodView<K>,units:number,c:PackedFoodCatalogue<K>):PackedFoodWithdrawal<K>{
 const result=withdrawal(p,units,c),v=p.foodCustody,share=p.food>0?result.units/p.food:0;
 if(v){v.legacyUnits*=1-share;for(const lot of v.lots)lot.units*=1-share;v.lots=v.lots.filter(l=>l.units>0);}
 p.food-=result.units;return result;
}
/** Consume actual edible units for requested nourishment; unknown legacy food retains coefficient1. */
export function consumePackedFood<K extends string>(p:PackedFoodView<K>,requiredNourishment:number,c:PackedFoodCatalogue<K>):PackedFoodWithdrawal<K>{
 if(!Number.isFinite(requiredNourishment)||requiredNourishment<0)throw new RangeError('Invalid nourishment demand');
 const available=packedFoodNourishment(p,c),share=available>0?Math.min(1,requiredNourishment/available):0,v=p.foodCustody;
 if(!v){const units=p.food*share;p.food-=units;p.foodUsed+=units;return{units,nourishment:units,legacyUnits:units,lots:[]};}
 const legacyUnits=v.legacyUnits*share,lots:PackedFoodLot<K>[]=[];v.legacyUnits-=legacyUnits;let units=legacyUnits,nourishment=legacyUnits;
 for(const lot of v.lots){if(!c.edible(lot.kind))continue;const n=lot.units*share;if(n<=0)continue;lots.push({...clone(lot),units:n});lot.units-=n;units+=n;nourishment+=n*factor(c,lot.kind);}
 v.lots=v.lots.filter(l=>l.units>0);p.food-=units;p.foodUsed+=units;return{units,nourishment,legacyUnits,lots};
}
/** Immediate transfer only. Capacity/identity limits reject atomically, retaining source goods. */
export function transferPackedFood<K extends string>(from:PackedFoodView<K>,to:PackedFoodView<K>,units:number,c:PackedFoodCatalogue<K>,maximumUnits:number=R.maximumUnits):{accepted:boolean;units:number;nourishment:number}{
 assertView(from,c);assertView(to,c);
 const no={accepted:false,units:0,nourishment:0};if(from===to||!finite(units)||!finite(maximumUnits)||units>from.food+R.tolerance||to.food+to.foodUsed+units>maximumUnits+R.tolerance)return no;
 const move=withdrawal(from,units,c);if(move.units===0)return{accepted:true,units:0,nourishment:0};
 // Both legacy remains scalar. Mixed transfers promote only the container, preserving its unknown bucket.
 if(!from.foodCustody&&!to.foodCustody){from.food-=move.units;to.food+=move.units;return{accepted:true,units:move.units,nourishment:move.nourishment};}
 const merged:PackedFoodCustody<K>=to.foodCustody?{version:1,legacyUnits:to.foodCustody.legacyUnits,lots:to.foodCustody.lots.map(clone)}:{version:1,legacyUnits:to.food,lots:[]};
 merged.legacyUnits+=move.legacyUnits;
 for(const lot of move.lots){const existing=merged.lots.find(l=>key(l)===key(lot));if(existing)existing.units+=lot.units;else merged.lots.push(clone(lot));}
 if(merged.lots.length>R.maximumLots)return no;
 withdrawPackedFood(from,move.units,c);to.food+=move.units;to.foodCustody=merged;return{accepted:true,units:move.units,nourishment:move.nourishment};
}
export function resetPackedFoodUsage<K extends string>(p:PackedFoodView<K>){const used=p.foodUsed;amount(used);p.foodUsed=0;return used;}
/** Full saved-custody validation; legacy scalar validation remains owned by ScoutProvisions. */
export function validPackedFoodCustody<K extends string>(value:unknown,food:number,c:PackedFoodCatalogue<K>,bounds:PackedFoodValidation):value is PackedFoodCustody<K>{
 if(!value||typeof value!=='object'||Array.isArray(value)||!finite(food))return false;
 const v=value as PackedFoodCustody<K>;
 try{assertView({food,foodUsed:0,foodCustody:v},c);}catch{return false;}
 if(Object.keys(v).some(k=>!['version','legacyUnits','lots'].includes(k)))return false;
 for(const l of v.lots){const o=l.origin;
  if(Object.keys(l).some(k=>!['kind','units','origin'].includes(k))||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!['team','anchorKind','buildingId','x','z','loadedAt'].includes(k)))return false;
  if(!Number.isSafeInteger(o.team)||o.team<0||o.team>=bounds.teamCount||!['camp','building'].includes(o.anchorKind)||!Number.isFinite(o.x)||!Number.isFinite(o.z)||Math.abs(o.x)>bounds.worldHalf||Math.abs(o.z)>bounds.worldHalf||!finite(o.loadedAt,bounds.time))return false;
  if(o.anchorKind==='building'?(!Number.isSafeInteger(o.buildingId)||o.buildingId!<1||o.buildingId!>=bounds.nextId):o.buildingId!==undefined)return false;
 }
 return true;
}
