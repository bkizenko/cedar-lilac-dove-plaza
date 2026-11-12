import {TERRAIN_INFLUENCE_RULES,type TerrainInfluenceField} from './terrainInfluence';
/**
 * Read model for drawing spheres of influence as a soft gradient. Plain JSON, no typed arrays, no Game.
 * The map layer colours `team` by tribe, uses `alpha` for opacity (already smooth: no ring edge exists) and
 * `contest` to feather the border where a second society also reaches the cell.
 */
export type InfluenceGradientModel={
 version:1;size:number;width:number;cellMeters:number;
 /** Cell bounding box that holds any influence; null when nothing is claimed. Arrays are row-major over it. */
 bounds:{i0:number;j0:number;w:number;h:number}|null;
 teams:number[];
 /** Dominant team per cell, -1 where unclaimed. */team:number[];
 /** 0..255 strength of the dominant team. */alpha:number[];
 /** 0..255: how close the runner-up is to the leader. 0 where only one society reaches. */contest:number[];
 /** 0/1: the dominant claim here reaches across open water by ship. */shipBorne:number[];
};
export function influenceGradientModel(fields:readonly {team:number;field:TerrainInfluenceField}[],options:{threshold?:number}={}):InfluenceGradientModel{
 const threshold=options.threshold??TERRAIN_INFLUENCE_RULES.minimumStrength*20,ordered=fields.slice().sort((a,b)=>a.team-b.team);
 const first=ordered[0]?.field,empty:InfluenceGradientModel={version:1,size:first?.size??0,width:first?.width??0,cellMeters:first?.cellMeters??0,bounds:null,teams:[],team:[],alpha:[],contest:[],shipBorne:[]};
 if(!first)return empty;
 const W=first.width;let i0=W,j0=W,i1=-1,j1=-1;const lead=new Int16Array(W*W).fill(-1),top=new Float32Array(W*W),second=new Float32Array(W*W),ship=new Uint8Array(W*W);
 for(const {team,field} of ordered){
  if(field.width!==W)throw new Error('Influence fields must share one grid');
  for(let i=0;i<W*W;i++){
   const v=field.strength[i];if(!(v>threshold))continue;
   if(v>top[i]){second[i]=top[i];top[i]=v;lead[i]=team;ship[i]=field.byShip[i];}else if(v>second[i])second[i]=v;
  }
 }
 for(let i=0;i<W*W;i++)if(lead[i]>=0){const x=i%W,z=(i-x)/W;i0=Math.min(i0,x);i1=Math.max(i1,x);j0=Math.min(j0,z);j1=Math.max(j1,z);}
 if(i1<0)return {...empty,teams:ordered.map(f=>f.team)};
 const w=i1-i0+1,h=j1-j0+1,model:InfluenceGradientModel={...empty,bounds:{i0,j0,w,h},teams:ordered.map(f=>f.team)};
 for(let z=j0;z<=j1;z++)for(let x=i0;x<=i1;x++){
  const i=z*W+x;model.team.push(lead[i]);model.alpha.push(Math.round(Math.min(1,top[i])*255));
  model.contest.push(top[i]>0?Math.round(Math.min(1,second[i]/top[i])*255):0);model.shipBorne.push(lead[i]>=0?ship[i]:0);
 }
 return model;
}
/** Dominant team and strength at a world point, from the model alone. */
export function gradientAt(m:InfluenceGradientModel,x:number,z:number){
 if(!m.bounds)return {team:-1,alpha:0,contest:0};
 const ix=Math.floor((x+m.size/2)/m.cellMeters)-m.bounds.i0,iz=Math.floor((z+m.size/2)/m.cellMeters)-m.bounds.j0;
 if(ix<0||iz<0||ix>=m.bounds.w||iz>=m.bounds.h)return {team:-1,alpha:0,contest:0};
 const k=iz*m.bounds.w+ix;return {team:m.team[k],alpha:m.alpha[k],contest:m.contest[k]};
}
