/** Doors face the plaza. Dwellings are modelled with their doorway on local +Z; this picks the quarter turn that points it at the village's
 * nearest hall (or, before there is a hall, the camp), so a hut's door looks toward the paths and the common instead of the map edge.
 * Pure: the ghost and the finished building call the same function with the same inputs, so the preview always shows the door where it will be built. */
export type Anchor={x:number;z:number};
const DWELLINGS=new Set(['hut','house']);
export const facesPlaza=(type:string,w:number,d:number)=>DWELLINGS.has(type)&&Math.abs(w-d)<=1.2;
/** Number of quarter turns (0..3) about +Y that bring local +Z toward `anchor`; 0 when there is no anchor or the building stands on it. */
export function plazaQuarterTurns(x:number,z:number,anchor:Anchor|null|undefined):number{
 if(!anchor)return 0;const dx=anchor.x-x,dz=anchor.z-z;if(Math.hypot(dx,dz)<3)return 0;
 return(Math.round(Math.atan2(dx,dz)/(Math.PI/2))%4+4)%4;
}
export function nearestAnchor(x:number,z:number,anchors:readonly Anchor[]):Anchor|null{
 let best:Anchor|null=null,bd=Infinity;for(const a of anchors){const d=Math.hypot(a.x-x,a.z-z);if(d<bd){bd=d;best=a;}}return best;
}
