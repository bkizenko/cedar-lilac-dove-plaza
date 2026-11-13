import * as THREE from 'three';
import type {Game} from '../game/sim';
import {paintRouteField,routeCorridors,routeRevision,routesEnabled,corridorLine,corridorWear,ROUTE_RULES,type RouteField} from '../game/routeWear';

/** Ground wear as a field, not geometry. One RGBA texture of the world (about one metre a texel) holds the worn strips from
 * routeWear.ts; the painterly terrain shader reads it to thin the grass, expose the local soil, cut ruts, hold puddles and
 * pack snow. R wear, G trodden core, B per-strand tone, A strand strength. No meshes, no draw calls, never touches simulation. */
export const ROUTE_FIELD_RULES={texelMetres:1,maxRes:1536,minIntervalMs:1500,wetRiseSeconds:20,wetFallSeconds:420} as const;
const EMPTY=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1,THREE.RGBAFormat,THREE.UnsignedByteType);EMPTY.needsUpdate=true;

export class RouteFieldMap{
 readonly texture:THREE.DataTexture;readonly res:number;readonly size:number;
 /** x: wetness 0..1 (rain, slow to dry), y: field enabled. Shared with the terrain material by reference. */
 readonly cfg=new THREE.Vector4(0,1,0,0);
 private data:Uint8Array;private field:RouteField|undefined;private rev=-1;private at=-1e9;private wetAt=0;private wet=0;
 constructor(size:number){
  this.size=size;this.res=Math.max(8,Math.min(ROUTE_FIELD_RULES.maxRes,Math.ceil(size/ROUTE_FIELD_RULES.texelMetres)));
  this.data=new Uint8Array(this.res*this.res*4);
  this.texture=new THREE.DataTexture(this.data,this.res,this.res,THREE.RGBAFormat,THREE.UnsignedByteType);
  this.texture.minFilter=THREE.LinearMipmapLinearFilter;this.texture.magFilter=THREE.LinearFilter;this.texture.generateMipmaps=true;this.texture.anisotropy=4;this.texture.needsUpdate=true;
 }
 /** Repaint when the routes changed (at most every 1.5 s) and ease the wetness toward the weather. Returns true when the texture changed. */
 update(game:Game,nowMs:number,weather:string,snow:number){
  const target=weather==='rain'||weather==='storm'||weather==='flood'?1:weather==='mist'?.35:0;
  if(!this.wetAt)this.wet=target;
  const dt=this.wetAt?Math.min(2,(nowMs-this.wetAt)/1000):0;this.wetAt=nowMs;
  this.wet+=(target-this.wet)*Math.min(1,dt/(target>this.wet?ROUTE_FIELD_RULES.wetRiseSeconds:ROUTE_FIELD_RULES.wetFallSeconds));
  this.cfg.x=this.wet*(1-Math.min(1,snow)*.8);
  const on=routesEnabled(game);this.cfg.y=on?1:0;
  const rev=routeRevision(game)*2+(on?1:0);
  if(rev===this.rev||nowMs-this.at<ROUTE_FIELD_RULES.minIntervalMs)return false;
  this.rev=rev;this.at=nowMs;
  const f=this.field=paintRouteField(on?routeCorridors(game):[],game.state.seed,this.size,ROUTE_FIELD_RULES.texelMetres,this.field);
  const d=this.data,n=f.wear.length;
  // Row 0 of the texture is world z = -size/2, the same orientation the contact map uses.
  for(let i=0;i<n;i++){const o=i*4;d[o]=Math.round(f.wear[i]*255);d[o+1]=Math.round(f.core[i]*255);d[o+2]=Math.round(f.hash[i]*255);d[o+3]=Math.round(f.amp[i]*255);}
  this.texture.needsUpdate=true;return true;
 }
 /** Repaint at the next update regardless of the throttle (tests and render tools). */
 invalidate(){this.rev=-1;this.at=-1e9;this.wetAt=0;}
 dispose(){this.texture.dispose();}
}
export const emptyRouteTexture=EMPTY;

/** Fallback for the archived classic look: route strips as ribbon quads for the legacy instanced mesh. */
export type RouteRibbon={points:{x:number;z:number;displayWear:number}[];lengthMetres:number;widthMetres:number};
export function routeRibbons(game:Pick<Game,'state'>):RouteRibbon[]{
 const out:RouteRibbon[]=[];
 for(const c of routeCorridors(game)){
  const w=corridorWear(c);if(w<ROUTE_RULES.faint)continue;
  const line=corridorLine(c,game.state.seed,3,true),pts:{x:number;z:number;displayWear:number}[]=[];
  for(let i=0;i<line.length;i+=2)pts.push({x:line[i],z:line[i+1],displayWear:Math.min(.45,w*.45)});
  out.push({points:pts,lengthMetres:c.len,widthMetres:.5+w*1.1});
 }
 return out;
}
