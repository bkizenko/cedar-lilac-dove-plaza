export const SIMULATION_PHASE_LABELS={preparation:'Step preparation',navigation:'Navigation grid',geography:'Geographic influence',production:'Crafting and maintenance',missions:'Missions and trade planning',construction:'Construction and ownership',people:'Individual decisions and work',combat:'Movement and combat',ecology:'Wildlife and communities',economy:'Routes, farms and yields',society:'Influence, survival and population',observation:'Vision and encounters',rivals:'Rival strategy',reconciliation:'Final reconciliation',effects:'Particles and messages'} as const;
export type SimulationPhase=keyof typeof SIMULATION_PHASE_LABELS;
export const SIMULATION_PHASE_RULES=Object.freeze({maximumSamples:240});
/** Optional coarse attribution. Never installed on game sampling methods or saved. */
export class SimulationPhaseProfile{
 enabled=false;
 private samples=new Map<SimulationPhase,number[]>();
 private now:()=>number;
 constructor(now=()=>performance.now()){this.now=now;}
 begin(){
  if(!this.enabled)return undefined;
  let phase:SimulationPhase='preparation',last=this.now(),ended=false;
  const record=()=>{const next=this.now(),values=this.samples.get(phase)||[];values.push(Math.max(0,next-last));if(values.length>SIMULATION_PHASE_RULES.maximumSamples)values.shift();this.samples.set(phase,values);last=next;};
  return{mark:(next:SimulationPhase)=>{if(ended)return;record();phase=next;},end:()=>{if(ended)return;record();ended=true;}};
 }
 reset(){this.samples.clear();}
 report(){return{enabled:this.enabled,phases:[...this.samples].map(([phase,values])=>{const sorted=[...values].sort((a,b)=>a-b);return{phase,label:SIMULATION_PHASE_LABELS[phase],samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0,maxMs:sorted.at(-1)||0};})};}
}
