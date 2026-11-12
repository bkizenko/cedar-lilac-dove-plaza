/** Explicit gameplay quantities and clocks, not historical yield or time claims.
 * The covered clamp restricts air during carbonisation and stays closed while
 * cooling. It is a finite activity at the hearth, not an open warming fire. */
export const CHARCOAL_RULES={version:1,woodLogs:8,outputUnits:2,preparationSeconds:40,carbonizeSeconds:120,coolingSeconds:30} as const;
export type CharcoalBatch={version:1;woodLogs:8;carbonizeSeconds:number;coolingSeconds:number;elapsedSeconds:number};
export const newCharcoalBatch=():CharcoalBatch=>({version:1,woodLogs:CHARCOAL_RULES.woodLogs,carbonizeSeconds:0,coolingSeconds:0,elapsedSeconds:0});
export const charcoalBatchReady=(batch:CharcoalBatch)=>batch.carbonizeSeconds>=CHARCOAL_RULES.carbonizeSeconds&&batch.coolingSeconds>=CHARCOAL_RULES.coolingSeconds;
/** Passive time starts only after the caller has completed paid preparation.
 * Pausing pickup does not stop an already loaded covered clamp from cooling. */
export function advanceCharcoalBatch(batch:CharcoalBatch,dt:number){
 if(dt>0&&Number.isFinite(dt)){
  const carbonize=Math.min(dt,Math.max(0,CHARCOAL_RULES.carbonizeSeconds-batch.carbonizeSeconds));
  batch.carbonizeSeconds+=carbonize;
  if(batch.carbonizeSeconds>=CHARCOAL_RULES.carbonizeSeconds)batch.coolingSeconds=Math.min(CHARCOAL_RULES.coolingSeconds,batch.coolingSeconds+dt-carbonize);
  batch.elapsedSeconds=batch.carbonizeSeconds+batch.coolingSeconds;
 }
 const ready=charcoalBatchReady(batch);
 return{ready,reason:ready?'Cooled charcoal needs physical pickup':batch.carbonizeSeconds<CHARCOAL_RULES.carbonizeSeconds?'Carbonising wood in the covered clamp':'Cooling the closed charcoal clamp'};
}
export function validCharcoalBatch(value:unknown,age:number):value is CharcoalBatch{
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isFinite(age)||age<0)return false;
 const b=value as CharcoalBatch,num=(v:unknown,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 return Object.keys(b).every(k=>['version','woodLogs','carbonizeSeconds','coolingSeconds','elapsedSeconds'].includes(k))&&b.version===1&&b.woodLogs===CHARCOAL_RULES.woodLogs&&num(b.carbonizeSeconds,CHARCOAL_RULES.carbonizeSeconds)&&num(b.coolingSeconds,CHARCOAL_RULES.coolingSeconds)&&num(b.elapsedSeconds,CHARCOAL_RULES.carbonizeSeconds+CHARCOAL_RULES.coolingSeconds)&&b.elapsedSeconds<=age+1e-6&&Math.abs(b.elapsedSeconds-b.carbonizeSeconds-b.coolingSeconds)<1e-6&&(b.coolingSeconds===0||b.carbonizeSeconds===CHARCOAL_RULES.carbonizeSeconds);
}
