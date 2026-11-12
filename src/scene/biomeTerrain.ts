/** Natural biome terrain colour for the H style (replaces the carved-wood terrace; carvedTerrace.ts is deprecated).
 * Pure: height sampler in, linear-ish RGB out. Grass, dirt, rock on slopes, sand at shores, snow by height, brown
 * savanna or steppe by biome. Noise is isotropic value-noise FBM (no stripes, no grain direction). Only the warm
 * golden-hour grade is kept, applied uniformly by `goldenHour`. Visual only: never changes the heightfield. */
export type TerrainBiome='temperate'|'grassland'|'steppe'|'savanna'|'desert'|'canyon'|'tundra'|'alpine'|'boreal'|'jungle'|'wetland'|'coast';
export type BiomePalette={grass:string;grassDry:string;dirt:string;rock:string;rockWarm:string;sand:string;snow:string|null;snowLine:number;wet:string;scrub:string};
const P=(o:BiomePalette)=>o;
export const BIOME_TERRAIN:Record<TerrainBiome,BiomePalette>={
 temperate:P({grass:'#6e8f3d',grassDry:'#9a9a52',dirt:'#8a6a45',rock:'#8d8a82',rockWarm:'#9a8670',sand:'#d2bf8e',snow:'#f2f4f6',snowLine:60,wet:'#4e6b3a',scrub:'#7a8040'}),
 grassland:P({grass:'#7d9a45',grassDry:'#b0aa5c',dirt:'#94704a',rock:'#938f86',rockWarm:'#a08c74',sand:'#d8c694',snow:'#f2f4f6',snowLine:70,wet:'#587a3c',scrub:'#8a8c48'}),
 steppe:P({grass:'#9a9a55',grassDry:'#b8a468',dirt:'#9a7c56',rock:'#8f8a80',rockWarm:'#a28f78',sand:'#d6c493',snow:'#eef1f4',snowLine:55,wet:'#707a48',scrub:'#a49660'}),
 savanna:P({grass:'#a8a04e',grassDry:'#c3a65a',dirt:'#a8723f',rock:'#9a8168',rockWarm:'#b08a62',sand:'#dcc38a',snow:null,snowLine:1e9,wet:'#8a8a45',scrub:'#9d8a4a'}),
 desert:P({grass:'#b4a468',grassDry:'#cdb27a',dirt:'#b88c58',rock:'#a08a70',rockWarm:'#b8906a',sand:'#e0c890',snow:null,snowLine:1e9,wet:'#9a9560',scrub:'#a99a62'}),
 canyon:P({grass:'#a39a58',grassDry:'#b9a068',dirt:'#b4693c',rock:'#a75a38',rockWarm:'#c0714a',sand:'#d9b57e',snow:null,snowLine:1e9,wet:'#8c8854',scrub:'#8f8a50'}),
 tundra:P({grass:'#8a9468',grassDry:'#a39a78',dirt:'#7a6a58',rock:'#85847f',rockWarm:'#8d8479',sand:'#bfb59a',snow:'#f4f6f8',snowLine:12,wet:'#66705a',scrub:'#7d7a62'}),
 alpine:P({grass:'#6a8a48',grassDry:'#8f9558',dirt:'#7a6650',rock:'#7f7e7a',rockWarm:'#8a8074',sand:'#c0b48e',snow:'#f6f8fa',snowLine:34,wet:'#506e40',scrub:'#6d7a48'}),
 boreal:P({grass:'#55743c',grassDry:'#7a8250',dirt:'#6a5238',rock:'#7a7a76',rockWarm:'#857b6c',sand:'#b9ae88',snow:'#f0f3f6',snowLine:30,wet:'#405e34',scrub:'#5c6a3c'}),
 jungle:P({grass:'#3f7a2e',grassDry:'#6a8a3a',dirt:'#6a4a30',rock:'#6f716c',rockWarm:'#7d7260',sand:'#cdbd8a',snow:null,snowLine:1e9,wet:'#2f5f28',scrub:'#4a7a30'}),
 wetland:P({grass:'#678a46',grassDry:'#8a9a56',dirt:'#5f4c36',rock:'#7e8078',rockWarm:'#89806e',sand:'#bdb48c',snow:null,snowLine:1e9,wet:'#48683a',scrub:'#5b7c40'}),
 coast:P({grass:'#729446',grassDry:'#a0a458',dirt:'#8a6c48',rock:'#8d8c86',rockWarm:'#9c8a74',sand:'#dcc896',snow:null,snowLine:1e9,wet:'#58783e',scrub:'#7a8848'}),
};
export const GOLDEN_HOUR={warm:[1.05,1,.93] as const,strength:1};
export const TERRAIN_TREATMENT='natural' as const;
const rgbOf=(h:string):[number,number,number]=>{const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const mix=(a:readonly number[],b:readonly number[],t:number):[number,number,number]=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const hash=(x:number,z:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(s|0,2246822519);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
/** Isotropic value noise 0..1. */
export function vnoise(x:number,z:number,seed=0){const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
 const a=hash(xi,zi,seed),b=hash(xi+1,zi,seed),c=hash(xi,zi+1,seed),d=hash(xi+1,zi+1,seed);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
export function fbm(x:number,z:number,seed=0,oct=4){let s=0,a=.5,f=1,n=0;for(let i=0;i<oct;i++){s+=a*vnoise(x*f+i*17.3,z*f-i*9.1,seed+i);n+=a;a*=.5;f*=2.03;}return s/n;}
export type TerrainInput={biome:TerrainBiome;height:number;slope:number;waterY:number;x:number;z:number;seed?:number;/** 0..1, path weight (trodden dirt) */path?:number;/** 0..1 */moisture?:number};
export type TerrainClass='water'|'shore'|'grass'|'dirt'|'rock'|'snow'|'path';
export function classify(i:TerrainInput):TerrainClass{
 const p=BIOME_TERRAIN[i.biome],rel=i.height-i.waterY;if(rel<0)return 'water';if(rel<.7)return 'shore';
 if(p.snow&&rel>p.snowLine+fbm(i.x*.05,i.z*.05,(i.seed??0)+3)*8&&i.slope<1.6)return 'snow';
 if(i.slope>.85+(fbm(i.x*.08,i.z*.08,(i.seed??0)+5)-.5)*.3)return 'rock';
 if((i.path??0)>.5)return 'path';
 const dirtN=fbm(i.x*.12,i.z*.12,(i.seed??0)+7);return dirtN>.64+((i.moisture??.5)-.5)*.2?'dirt':'grass';
}
export function terrainColor(i:TerrainInput):[number,number,number]{
 const p=BIOME_TERRAIN[i.biome],s=i.seed??0,rel=i.height-i.waterY,fine=fbm(i.x*.9,i.z*.9,s+11)-.5,patch=fbm(i.x*.06,i.z*.06,s+13);
 const grass=mix(rgbOf(p.grass),rgbOf(p.grassDry),Math.min(1,Math.max(0,(1-(i.moisture??.5))*.6+patch*.6-.2)));
 let c:[number,number,number];
 switch(classify(i)){
  case 'water':c=mix(rgbOf(p.sand),rgbOf(p.wet),Math.min(1,-rel/2.5)*.5);break;
  case 'shore':c=mix(rgbOf(p.sand),grass,Math.max(0,(rel-.25)/.45));break;
  case 'snow':c=mix(rgbOf(p.snow!),rgbOf(p.rock),Math.max(0,fine)*.35);break;
  case 'rock':c=mix(rgbOf(p.rock),rgbOf(p.rockWarm),patch);break;
  case 'path':c=mix(rgbOf(p.dirt),rgbOf(p.sand),.35+fine*.3);break;
  case 'dirt':c=mix(rgbOf(p.dirt),rgbOf(p.scrub),patch*.5);break;
  default:c=mix(grass,rgbOf(p.scrub),Math.max(0,fine)*.5);
 }
 const k=1+fine*.14;return [Math.min(1,c[0]*k),Math.min(1,c[1]*k),Math.min(1,c[2]*k)];
}
/** The one thing kept from the H look: a uniform warm golden-hour multiply (no banding, no stripes). */
export const goldenHour=(c:readonly number[],t=GOLDEN_HOUR.strength):[number,number,number]=>[Math.min(1,c[0]*(1+(GOLDEN_HOUR.warm[0]-1)*t)),Math.min(1,c[1]*(1+(GOLDEN_HOUR.warm[1]-1)*t)),Math.min(1,c[2]*(1+(GOLDEN_HOUR.warm[2]-1)*t))];
export type HeightSampler=(x:number,z:number)=>number;
export const slopeAt=(h:HeightSampler,x:number,z:number,e=.75)=>Math.hypot((h(x+e,z)-h(x-e,z))/(2*e),(h(x,z+e)-h(x,z-e))/(2*e));
export function bakeTerrainColors(h:HeightSampler,half:number,segments:number,waterY:number,biome:TerrainBiome,seed=0,pathWeight?:(x:number,z:number)=>number,grade=true){
 const n=segments+1,out=new Float32Array(n*n*3);for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-half+i*2*half/segments,z=-half+j*2*half/segments,c=terrainColor({biome,height:h(x,z),slope:slopeAt(h,x,z),waterY,x,z,seed,path:pathWeight?.(x,z)}),g=grade?goldenHour(c):c,k=(j*n+i)*3;out[k]=g[0];out[k+1]=g[1];out[k+2]=g[2];}return out;
}
