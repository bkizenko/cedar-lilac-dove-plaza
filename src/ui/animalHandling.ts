/** Compact per-animal handling lines for the husbandry panel: tries, refusals and the real cooldown from each
 * wild animal's saved domestication memory, keyed by the village's recorded outcomes. Pure; never shows odds. */
type Outcome={animalId:number;species:string;purpose:'pen'|'pack';outcome:'success'|'refused'|'abandoned'};
type Wild={id:number;species?:string;domestication?:{attempts:number;cooldownUntil:number}};
export function animalHandlingLines(recent:readonly Outcome[],wildlife:readonly Wild[]|undefined,now:number,max=4):string[]{
 const by=new Map<number,{species:string;purpose:string;tries:number;refused:number;handled:boolean}>();
 for(const r of recent){const e=by.get(r.animalId)??{species:r.species,purpose:r.purpose,tries:0,refused:0,handled:false};e.tries++;if(r.outcome==='refused')e.refused++;if(r.outcome==='success')e.handled=true;by.set(r.animalId,e);}
 return [...by.entries()].slice(-max).map(([id,e])=>{
  const w=wildlife?.find(a=>a.id===id),mem=w?.domestication,tries=Math.max(e.tries,mem?.attempts??0);
  const wait=mem&&mem.cooldownUntil>now?`calms in ${Math.ceil(mem.cooldownUntil-now)}s`:w?'ready to try again':'';
  const name=`${e.purpose==='pack'?'Pack ':''}${e.species} #${id}`;
  return [name,`${tries} ${tries===1?'try':'tries'}`,e.refused?`${e.refused} refused`:'',e.handled?'handled':wait].filter(Boolean).join(' · ');
 });
}
