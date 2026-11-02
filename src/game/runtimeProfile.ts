import type {AutosaveReport} from './autosave';
import {browserHeapEstimate,type RendererFrameMetrics} from '../scene/renderMetrics';
export type RuntimeStage='simulation'|'scene'|'draw'|'interface'|'save'|'map';
export const RUNTIME_PROFILE_RULES=Object.freeze({maximumFrames:600,maximumStageSamples:240,displayRateWindowMilliseconds:400,interfaceRefreshMilliseconds:1000});
export class RuntimeProfile {
 private autosaveReport:(()=>AutosaveReport)|undefined;private autosaveReset:(()=>void)|undefined;
 setAutosaveReporter(report:()=>AutosaveReport,reset:()=>void){this.autosaveReport=report;this.autosaveReset=reset;}
 private samples=new Map<RuntimeStage,number[]>();
 private gaps:number[]=[];
 private rendererSamples:RendererFrameMetrics[]=[];
 recordRenderer(sample:RendererFrameMetrics|undefined){if(!sample)return;this.rendererSamples.push({...sample});if(this.rendererSamples.length>RUNTIME_PROFILE_RULES.maximumStageSamples)this.rendererSamples.shift();}
 private lastFrame:number|null=null;
 private scheduling={frames:0,limitedFrames:0,discardedWallSeconds:0,maximumSteps:0};
 private windowStarted:number;
 recordScheduling(s:{steps:number;limited:boolean;discardedSeconds:number}){this.scheduling.frames++;this.scheduling.limitedFrames+=Number(s.limited);this.scheduling.discardedWallSeconds+=s.discardedSeconds;this.scheduling.maximumSteps=Math.max(this.scheduling.maximumSteps,s.steps);}
 private now:()=>number;
 constructor(now=()=>performance.now()){this.now=now;this.windowStarted=now();}
 measure<T>(stage:RuntimeStage,fn:()=>T):T {const start=this.now();try{return fn();}finally{const values=this.samples.get(stage)||[];values.push(Math.max(0,this.now()-start));if(values.length>RUNTIME_PROFILE_RULES.maximumStageSamples)values.shift();this.samples.set(stage,values);}}
 /** Actual animation timestamps, never the capped simulation delta. */
 frame(timestamp:number){if(!Number.isFinite(timestamp))return 0;const gap=this.lastFrame!==null&&timestamp>this.lastFrame?timestamp-this.lastFrame:0;this.lastFrame=timestamp;if(gap){this.gaps.push(gap);if(this.gaps.length>RUNTIME_PROFILE_RULES.maximumFrames)this.gaps.shift();}return gap;}
 frameRate(windowMilliseconds=Infinity){let milliseconds=0,count=0;for(let i=this.gaps.length-1;i>=0;i--){milliseconds+=this.gaps[i];count++;if(milliseconds>=windowMilliseconds)break;}return milliseconds>0?count*1000/milliseconds:0;}
 /** Diagnostics only: does not touch the game, speed, queues or save data. */
 reset(){this.autosaveReset?.();this.rendererSamples=[];this.samples.clear();this.gaps=[];this.lastFrame=null;this.scheduling={frames:0,limitedFrames:0,discardedWallSeconds:0,maximumSteps:0};this.windowStarted=this.now();}
 report(){const summary=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0,maxMs:sorted.at(-1)||0};};const countSummary=(key:'calls'|'triangles'|'lines'|'points')=>{const r=summary(this.rendererSamples.map(s=>s[key]));return{samples:r.samples,mean:r.meanMs,p95:r.p95Ms,max:r.maxMs};};const latest=this.rendererSamples.at(-1);return {autosave:this.autosaveReport?.(),renderer:latest?{latest:{...latest},calls:countSummary('calls'),triangles:countSummary('triangles'),lines:countSummary('lines'),points:countSummary('points')}:null,heap:browserHeapEstimate(),windowSeconds:Math.max(0,(this.now()-this.windowStarted)/1000),scheduling:{...this.scheduling},frames:{...summary(this.gaps),fps:this.frameRate()},stalls:this.gaps.filter(n=>n>100).length,stages:Object.fromEntries([...this.samples].map(([stage,values])=>[stage,summary(values)])) as Partial<Record<RuntimeStage,ReturnType<typeof summary>>>};}
}
