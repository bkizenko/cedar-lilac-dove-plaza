import {BUILDINGS} from './constants';
import {compactGrainWorkplace} from './cerealRules';
import type {BldType,Building} from './types';
export type PlotSize={w:number;d:number};
export function scalablePlot(type:BldType){return type==='farm'||type==='warehouse'||type==='pen';}
export function expandablePlot(type:BldType){return scalablePlot(type)||compactGrainWorkplace(type);}
export function expandedGrainWorkplace(b:Pick<Building,'type'|'w'|'d'>){
 return compactGrainWorkplace(b.type)&&plotArea(b)>1;
}
export function validPlot(type:BldType,size:PlotSize){
 const base=BUILDINGS[type];
 if(!expandablePlot(type)||!Number.isFinite(size.w)||!Number.isFinite(size.d)||size.w<base.w||size.d<base.d||size.w>base.w*3||size.d>base.d*3)return false;
 return !compactGrainWorkplace(type)||(size.w%base.w===0&&size.d%base.d===0);
}
export function plotArea(b:Pick<Building,'type'|'w'|'d'>){
 const base=BUILDINGS[b.type];
 return expandablePlot(b.type)?Math.max(1,Math.round(b.w*b.d/(base.w*base.d)*1e6)/1e6):1;
}
export const PLOT_DRAG_RULES={minimumPointerPixels:8,minimumWorldMeters:2} as const;
export function plotDragIntent(start:{x:number;y:number}|null,pointer:{x:number;y:number},a:{x:number;z:number},b:{x:number;z:number}){
 return !!start&&Math.hypot(pointer.x-start.x,pointer.y-start.y)>=PLOT_DRAG_RULES.minimumPointerPixels&&Math.hypot(b.x-a.x,b.z-a.z)>PLOT_DRAG_RULES.minimumWorldMeters;
}
export function dragPlot(type:BldType,a:{x:number;z:number},b:{x:number;z:number}){
 const base=BUILDINGS[type];
 const w=Math.min(base.w*3,Math.max(base.w,Math.ceil(Math.abs(b.x-a.x)/2)*2));
 const d=Math.min(base.d*3,Math.max(base.d,Math.ceil(Math.abs(b.z-a.z)/2)*2));
 return {x:a.x+Math.sign(b.x-a.x||1)*w/2,z:a.z+Math.sign(b.z-a.z||1)*d/2,w,d};
}
export function penFenceWood(size:PlotSize){const base=BUILDINGS.pen;return Math.ceil(base.wood*(.25+.75*(size.w+size.d)/(base.w+base.d))-1e-6);}
export function expansionCost(b:Pick<Building,'type'|'w'|'d'>,size:PlotSize){
 const delta=Math.max(0,plotArea({...b,...size})-plotArea(b));
 if(b.type==='pen')return{wood:Math.max(0,penFenceWood(size)-penFenceWood(b))};
 if(compactGrainWorkplace(b.type)){
  const base=BUILDINGS[b.type];
  return {wood:Math.ceil(base.wood*delta),stone:Math.ceil(base.stone*delta)};
 }
 return b.type==='farm'?{seeds:Math.ceil(4*delta-1e-6)}:{wood:Math.ceil(60*delta-1e-6)};
}
