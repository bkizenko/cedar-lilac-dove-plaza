import {BUILDINGS} from './constants';
import type {BldType,Building} from './types';
export type PlotSize={w:number;d:number};
export function scalablePlot(type:BldType){return type==='farm'||type==='warehouse';}
export function validPlot(type:BldType,size:PlotSize){
 const base=BUILDINGS[type];
 return scalablePlot(type)&&Number.isFinite(size.w)&&Number.isFinite(size.d)&&size.w>=base.w&&size.d>=base.d&&size.w<=base.w*3&&size.d<=base.d*3;
}
export function plotArea(b:Pick<Building,'type'|'w'|'d'>){
 const base=BUILDINGS[b.type];
 return scalablePlot(b.type)?Math.max(1,Math.round(b.w*b.d/(base.w*base.d)*1e6)/1e6):1;
}
export function dragPlot(type:BldType,a:{x:number;z:number},b:{x:number;z:number}){
 const base=BUILDINGS[type];
 const w=Math.min(base.w*3,Math.max(base.w,Math.ceil(Math.abs(b.x-a.x)/2)*2));
 const d=Math.min(base.d*3,Math.max(base.d,Math.ceil(Math.abs(b.z-a.z)/2)*2));
 return {x:a.x+Math.sign(b.x-a.x||1)*w/2,z:a.z+Math.sign(b.z-a.z||1)*d/2,w,d};
}
