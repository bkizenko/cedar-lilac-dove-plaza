export type RendererFrameMetrics={calls:number;triangles:number;lines:number;points:number;geometries:number;textures:number;programs:number|null};
type RendererInfo={autoReset:boolean;reset:()=>void;render:{calls:number;triangles:number;lines:number;points:number};memory:{geometries:number;textures:number};programs:unknown[]|null};
/** Three resets after each pass by default. One explicit reset keeps the full
 * composited frame, including submitted work before a fallback, measurable. */
export function beginRendererFrame(info:RendererInfo){info.autoReset=false;info.reset();}
export function rendererFrameMetrics(info:RendererInfo):RendererFrameMetrics{return{calls:info.render.calls,triangles:info.render.triangles,lines:info.render.lines,points:info.render.points,geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs?.length??null};}
export type BrowserHeapEstimate={usedMiB:number;allocatedMiB?:number;limitMiB?:number};
/** Optional browser estimate, never a GPU-memory measurement. */
export function browserHeapEstimate(source:unknown=globalThis.performance):BrowserHeapEstimate|undefined{
 const memory=(source as {memory?:{usedJSHeapSize?:unknown;totalJSHeapSize?:unknown;jsHeapSizeLimit?:unknown}}|null)?.memory;
 const mib=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value/(1024*1024):undefined;
 const usedMiB=mib(memory?.usedJSHeapSize);if(usedMiB===undefined)return;
 const allocatedMiB=mib(memory?.totalJSHeapSize),limitMiB=mib(memory?.jsHeapSizeLimit);
 return{usedMiB,...(allocatedMiB===undefined?{}:{allocatedMiB}),...(limitMiB===undefined?{}:{limitMiB})};
}
