export type RuntimeStage='simulation'|'scene'|'draw'|'interface'|'save'|'map';
export class RuntimeProfile {
 private samples=new Map<RuntimeStage,number[]>();
 private gaps:number[]=[];
 private lastFrame=0;
 private now:()=>number;
 constructor(now=()=>performance.now()){this.now=now;}
 measure<T>(stage:RuntimeStage,fn:()=>T):T {const start=this.now();try{return fn();}finally{const values=this.samples.get(stage)||[];values.push(Math.max(0,this.now()-start));if(values.length>240)values.shift();this.samples.set(stage,values);}}
 frame(timestamp:number){if(this.lastFrame&&timestamp>this.lastFrame){this.gaps.push(timestamp-this.lastFrame);if(this.gaps.length>600)this.gaps.shift();}this.lastFrame=timestamp;}
 report(){const summary=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0,maxMs:sorted.at(-1)||0};};return {frames:summary(this.gaps),stalls:this.gaps.filter(n=>n>100).length,stages:Object.fromEntries([...this.samples].map(([stage,values])=>[stage,summary(values)])) as Partial<Record<RuntimeStage,ReturnType<typeof summary>>>};}
}
