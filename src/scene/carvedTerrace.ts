/** Carved contour terrace treatment for Option H. Pure functions over a
 * height sampler: stepped band colour from height, darkened carved risers
 * at band edges (constant width in metres regardless of slope), and a
 * gentle wood-grain modulation. Visual only: it never changes the game
 * heightfield. `terracedHeight` is offered for the isolated review diorama;
 * using it in-game would need Grok's terrain query to agree first. */
import {CARVED_TERRAIN,hexToRgb} from './carvedPalette';

export type HeightSampler=(x:number,z:number)=>number;
export type TerraceSample={band:number;edge:number;grain:number;rgb:[number,number,number]};

const bandRgb=CARVED_TERRAIN.bands.map(c=>hexToRgb(c)),riserRgb=hexToRgb(CARVED_TERRAIN.riser),shoreRgb=hexToRgb(CARVED_TERRAIN.shore),bedRgb=hexToRgb(CARVED_TERRAIN.riverbed);
const mix=(a:readonly number[],b:readonly number[],t:number):[number,number,number]=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

export function terraceBand(height:number,waterY:number,bandMetres:number=CARVED_TERRAIN.bandMetres){return Math.floor((height-waterY)/bandMetres);}

/** Wood grain: long warped stripes along a fixed carving direction. Range [-1,1]. */
export function woodGrain(x:number,z:number,seed=0){
 const a=.62+(seed%97)*.001,u=x*Math.cos(a)+z*Math.sin(a),v=-x*Math.sin(a)+z*Math.cos(a);
 return Math.sin(u/CARVED_TERRAIN.grainWavelengthMetres*Math.PI*2+1.7*Math.sin(v*.11+seed*.37)+.6*Math.sin(v*.031));
}

export function carvedTerraceSample(sample:HeightSampler,x:number,z:number,waterY:number,seed=0):TerraceSample{
 const h=sample(x,z),step=CARVED_TERRAIN.bandMetres;
 const e=.75,gx=(sample(x+e,z)-sample(x-e,z))/(2*e),gz=(sample(x,z+e)-sample(x,z-e))/(2*e),slope=Math.hypot(gx,gz);
 const grain=woodGrain(x,z,seed);
 if(h<waterY)return {band:-1,edge:0,grain,rgb:mix(bedRgb,shoreRgb,Math.max(0,1+(h-waterY)/1.5)*.4)};
 const rel=(h-waterY)/step,band=Math.floor(rel),frac=rel-band;
 // Height distance to the nearest band boundary, converted to horizontal metres.
 const heightToEdge=Math.min(frac,1-frac)*step,metres=heightToEdge/Math.max(slope,1e-3);
 const edge=Math.max(0,Math.min(1,1-metres/CARVED_TERRAIN.riserWidth))*(band>=0?1:0);
 const base=bandRgb[((band%bandRgb.length)+bandRgb.length)%bandRgb.length];
 let rgb=mix(base,riserRgb,edge*.85);
 if(h-waterY<.35)rgb=mix(rgb,shoreRgb,1-(h-waterY)/.35);
 const g=1+grain*CARVED_TERRAIN.grainAmplitude;
 rgb=[Math.min(1,rgb[0]*g),Math.min(1,rgb[1]*g),Math.min(1,rgb[2]*g)];
 return {band,edge,grain,rgb};
}

/** Stepped display height for the review diorama: flat treads with a short
 * carved riser. strength 0 returns the input, 1 fully stepped. */
export function terracedHeight(height:number,waterY:number,strength=.7){
 if(height<=waterY)return height;
 const step=CARVED_TERRAIN.bandMetres,rel=(height-waterY)/step,band=Math.floor(rel),frac=rel-band;
 const riser=.18,t=frac<1-riser?0:(frac-(1-riser))/riser,stepped=waterY+(band+t*t*(3-2*t))*step;
 return height+(stepped-height)*Math.max(0,Math.min(1,strength));
}

/** Vertex colours for arbitrary terrain vertices (xyz triples, Y up), so the
 * adapter can recolour the existing game terrain geometry without assuming a
 * grid layout. `pathWeight` (0..1 per vertex, optional) inlays light path
 * strips, as on the board; Grok's trail/route grid is the authoritative input. */
export function carvedTerrainColorsForPositions(positions:ArrayLike<number>,sample:HeightSampler,waterY:number,seed=0,pathWeight?:(x:number,z:number)=>number){
 const n=Math.floor(positions.length/3),out=new Float32Array(n*3),path=hexToRgb(CARVED_TERRAIN.path);
 for(let i=0;i<n;i++){
  const x=positions[i*3],z=positions[i*3+2],s=carvedTerraceSample(sample,x,z,waterY,seed);let rgb=s.rgb;
  const p=pathWeight?Math.max(0,Math.min(1,pathWeight(x,z))):0;if(p>0&&s.band>=0)rgb=mix(rgb,path,p);
  out[i*3]=rgb[0];out[i*3+1]=rgb[1];out[i*3+2]=rgb[2];
 }
 return out;
}

/** Vertex colours for a regular grid of (segments+1)^2 vertices covering
 * [-half,half] in X and Z, row-major in Z then X (PlaneGeometry rotated -90° X order). */
export function bakeCarvedTerrainColors(sample:HeightSampler,half:number,segments:number,waterY:number,seed=0){
 const n=segments+1,out=new Float32Array(n*n*3);
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const x=-half+2*half*ix/segments,z=-half+2*half*iz/segments,s=carvedTerraceSample(sample,x,z,waterY,seed),o=(iz*n+ix)*3;
  out[o]=s.rgb[0];out[o+1]=s.rgb[1];out[o+2]=s.rgb[2];
 }
 return out;
}
