import {fbm,hash2} from '../game/rng';
/** The land and sea beyond the playable square: pure geometry, no three.js, no simulation state, so tests can read it.
 *
 * Before this the terrain mesh and the water plane both stopped at the map edge and everything past it was the fog colour, so a village on a hill looked like an
 * island floating in cloud. The ring continues the world to the camera far plane:
 *   - the first metres carry the real edge heights outward (the 160 m land continuation of continental maps, or the clamped edge of the heightfield),
 *   - then they blend into a seeded far field: a continent mask (coast, bays, headlands, far islands over sea edges), rolling hills, ridged mountain ranges
 *     with a snowline, forested lowlands, all deterministic from the world seed,
 *   - ground that falls below sea level is sea (flat at the water line, shaded with a Fresnel sky reflection in the material),
 *   - distant forest masses are coarse canopy blobs (one cone per 22..150 m cell) on forested lowland slopes, tinted by the haze.
 * The mesh is a stack of concentric square rings with geometrically growing spacing (fine near the edge, coarse at the horizon), sharing the map's edge line.
 * Render-only: nothing here is read by the simulation, navigation, resources or saves. */
export type HorizonTierName='low'|'medium'|'high'|'ultra';
export type HorizonTier={side:number;rings:number;growth:number;canopyCap:number};
export const HORIZON_RULES={
 /** vertices per side, radial rings, radial growth factor, and the most canopy blobs per level; the ring is part of the frame so it scales with the draw distance level */
 tiers:{
  low:{side:72,rings:20,growth:1.2,canopyCap:0},
  medium:{side:128,rings:26,growth:1.15,canopyCap:2600},
  high:{side:160,rings:30,growth:1.12,canopyCap:4400},
  ultra:{side:192,rings:34,growth:1.11,canopyCap:7200},
 } as Record<HorizonTierName,HorizonTier>,
 /** metres over which the carried edge heights give way to the far field */
 blendMetres:560,
 /** metres over which an edge that is sea (or land) keeps biasing the continent mask towards sea (or land) */
 carryMetres:1300,
 /** how far under the transparent continuation the ring lies where both draw land, so the two never z-fight */
 underContinuation:.45,
 /** canopy bands: outer distance beyond the edge (m) and cell size (m); crowns grow with distance because they stand for forest masses, not single trees */
 canopyBands:[{to:260,cell:22},{to:700,cell:40},{to:1500,cell:80},{to:4200,cell:150}] as readonly {to:number;cell:number}[],
 /** ground heights above water for the snowline and tree line */
 snowlineMetres:250,treelineMetres:190,
 mountainMetres:330,hillMetres:34,
 /** triangle cost of one canopy blob (open 6-sided cone) */
 canopyTriangles:6,
} as const;
export type HorizonInput={
 seed:number;half:number;
 /** width of the already-drawn land continuation beyond the square (0 when there is none) */
 width:number;seaY:number;
 /** distance beyond the outer edge that must be covered (the camera far plane) */
 extent:number;tier:HorizonTierName;
 /** terrain height at any x,z within half+width of the centre (clamping outside); the real world height, or the continuation mesh heights */
 inner:(x:number,z:number)=>number;
};
export type Canopy={x:number;y:number;z:number;r:number;h:number;tone:number};
export type HorizonGeometry={
 positions:Float32Array;colors:Float32Array;sea:Float32Array;indices:Uint32Array;
 /** skirt: one downward wall under the inner edge so no sliver shows between the terrain and the ring */
 canopies:Canopy[];
 stats:{vertices:number;triangles:number;canopies:number;canopyTriangles:number;rings:number;side:number;extent:number;firstStep:number};
};
const sstep=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
/** Distance beyond the playable square's edge (Chebyshev) */
export function edgeDistance(half:number,x:number,z:number){return Math.max(Math.abs(x),Math.abs(z))-half;}
/** Radial offsets (m) of each ring beyond the first: geometric, summing to `extent`. */
export function ringOffsets(extent:number,rings:number,growth:number){
 const sum=(Math.pow(growth,rings)-1)/(growth-1),a=extent/sum,out=[0];
 for(let i=1;i<=rings;i++)out.push(a*(Math.pow(growth,i)-1)/(growth-1));
 return out;
}
/** Far-field ground height (metres, absolute) at a point `t` metres beyond the blended edge. `carry` is +1 when the edge is land, -1 when sea. */
export function farHeight(seed:number,seaY:number,x:number,z:number,t:number,carry:number){
 const ox=seed%977*13.7,oz=seed%653*9.1;
 const continent=fbm(x/2900+ox,z/2900+oz,3),mask=continent-.5+carry*.21*(1-sstep(0,HORIZON_RULES.carryMetres,t))+(fbm(x/520+oz,z/520-ox,2)-.5)*.1;
 const hills=fbm(x/330+oz,z/330+ox,3);
 const range=fbm(x/1700-ox,z/1700+oz,3),ridgeNoise=1-Math.abs(2*fbm(x/640+ox*.3,z/640-oz*.3,4)-1);
 const mount=sstep(.46,.66,range)*sstep(.02,.2,mask)*Math.pow(ridgeNoise,1.5);
 const land=sstep(-.005,.06,mask);
 const coast=seaY+land*(5+hills*HORIZON_RULES.hillMetres)+sstep(.03,.2,mask)*hills*22;
 const sea=seaY-2-Math.max(0,-mask)*60;
 return mask<=0?sea:lerp(sea,coast,land)+mount*HORIZON_RULES.mountainMetres*sstep(.04,.18,mask);
}
/** Height of the whole horizon field at x,z (metres, absolute). Inside the continuation band it is the real edge terrain; beyond, edge heights carried out and blended into the far field. */
export function horizonHeight(inp:Pick<HorizonInput,'seed'|'half'|'width'|'seaY'|'inner'>,x:number,z:number){
 const {half,width,seaY,seed}=inp,outer=half+width,dd=edgeDistance(half,x,z);
 if(dd<=width)return inp.inner(x,z);
 const bx=Math.max(-outer,Math.min(outer,x)),bz=Math.max(-outer,Math.min(outer,z)),b=inp.inner(bx,bz),t=dd-width;
 const carry=b>seaY+.3?1:-1,far=farHeight(seed,seaY,x,z,t,carry);
 return lerp(b,far,sstep(0,HORIZON_RULES.blendMetres,t));
}
const PAL={
 grass:[.36,.47,.22],dry:[.5,.49,.27],forest:[.2,.34,.19],pine:[.15,.27,.17],rock:[.46,.43,.39],rockHigh:[.56,.54,.52],snow:[.86,.89,.93],sand:[.72,.66,.46],
 shallow:[.21,.5,.52],deep:[.08,.26,.42],
};
/** Ground colour (linear-ish rgb, fed to vertex colours) for a point of the far field. */
export function horizonGround(seed:number,seaY:number,x:number,z:number,h:number,slope:number){
 const rel=h-seaY,ox=seed%977*5.3;
 if(rel<=.02){const depth=Math.min(1,-rel/6+.1);return {rgb:[lerp(PAL.shallow[0],PAL.deep[0],depth),lerp(PAL.shallow[1],PAL.deep[1],depth),lerp(PAL.shallow[2],PAL.deep[2],depth)],sea:1,forest:0};}
 const patch=fbm(x/240+ox,z/240,3),fine=fbm(x/60-ox,z/60,2);
 const lowland=1-sstep(HORIZON_RULES.treelineMetres*.7,HORIZON_RULES.treelineMetres,rel+(patch-.5)*40);
 const forest=sstep(.47,.6,fbm(x/310+ox,z/310+3.1,3))*lowland*(1-sstep(.45,.8,slope))*sstep(1.5,5,rel);
 const g=PAL.grass,d=PAL.dry,dryMix=sstep(.45,.7,patch);
 let r=lerp(g[0],d[0],dryMix),gg=lerp(g[1],d[1],dryMix),b=lerp(g[2],d[2],dryMix);
 const pine=sstep(40,140,rel),fc=[lerp(PAL.forest[0],PAL.pine[0],pine),lerp(PAL.forest[1],PAL.pine[1],pine),lerp(PAL.forest[2],PAL.pine[2],pine)];
 r=lerp(r,fc[0],forest);gg=lerp(gg,fc[1],forest);b=lerp(b,fc[2],forest);
 const rocky=Math.max(sstep(.5,.95,slope),sstep(HORIZON_RULES.treelineMetres*.8,HORIZON_RULES.treelineMetres*1.5,rel));
 const rc=lerp(PAL.rock[0],PAL.rockHigh[0],sstep(100,300,rel));
 r=lerp(r,rc,rocky*.85);gg=lerp(gg,lerp(PAL.rock[1],PAL.rockHigh[1],sstep(100,300,rel)),rocky*.85);b=lerp(b,lerp(PAL.rock[2],PAL.rockHigh[2],sstep(100,300,rel)),rocky*.85);
 const snow=sstep(HORIZON_RULES.snowlineMetres,HORIZON_RULES.snowlineMetres+60,rel+(patch-.5)*50)*(1-sstep(.9,1.4,slope)*.6);
 r=lerp(r,PAL.snow[0],snow);gg=lerp(gg,PAL.snow[1],snow);b=lerp(b,PAL.snow[2],snow);
 const sand=1-sstep(.4,1.6,rel);r=lerp(r,PAL.sand[0],sand*.8);gg=lerp(gg,PAL.sand[1],sand*.8);b=lerp(b,PAL.sand[2],sand*.8);
 const shade=.93+fine*.14;
 return {rgb:[r*shade,gg*shade,b*shade],sea:0,forest};
}
/** Build the ring geometry (typed arrays) and the canopy list. Deterministic from the input. */
export function buildHorizon(inp:HorizonInput):HorizonGeometry{
 const tier=HORIZON_RULES.tiers[inp.tier]??HORIZON_RULES.tiers.medium,{half,seaY,seed,width}=inp,S=tier.side,N=tier.rings,per=4*S;
 const offs=ringOffsets(inp.extent,N,tier.growth);
 const vcount=(N+1)*per,positions=new Float32Array(vcount*3),colors=new Float32Array(vcount*3),sea=new Float32Array(vcount);
 const H=(x:number,z:number)=>horizonHeight(inp,x,z);
 const under=(x:number,z:number,h:number)=>width>0&&edgeDistance(half,x,z)<=width&&h>seaY+.2?h-HORIZON_RULES.underContinuation:h;
 for(let i=0;i<=N;i++){
  const rho=half+offs[i];
  for(let s=0;s<per;s++){
   const side=Math.floor(s/S),f=(s%S)/S;let x:number,z:number;
   if(side===0){x=rho;z=-rho+2*rho*f;}else if(side===1){x=rho-2*rho*f;z=rho;}else if(side===2){x=-rho;z=rho-2*rho*f;}else{x=-rho+2*rho*f;z=-rho;}
   const h=H(x,z),sp=Math.max(6,offs[Math.min(N,i+1)]-offs[Math.max(0,i-1)])*.6+6;
   const slope=Math.hypot(H(x+sp,z)-H(x-sp,z),H(x,z+sp)-H(x,z-sp))/(2*sp);
   const g=horizonGround(seed,seaY,x,z,h,slope),v=i*per+s;
   const y=g.sea?seaY:under(x,z,h);
   positions[v*3]=x;positions[v*3+1]=y;positions[v*3+2]=z;
   colors[v*3]=g.rgb[0];colors[v*3+1]=g.rgb[1];colors[v*3+2]=g.rgb[2];sea[v]=g.sea;
  }
 }
 const indices=new Uint32Array(N*per*6);let k=0;
 for(let i=0;i<N;i++)for(let s=0;s<per;s++){
  const a=i*per+s,b=i*per+(s+1)%per,c=(i+1)*per+s,d=(i+1)*per+(s+1)%per;
  // normals face up: the ring runs counter-clockwise seen from above on this winding
  indices[k++]=a;indices[k++]=b;indices[k++]=c;indices[k++]=b;indices[k++]=d;indices[k++]=c;
 }
 const canopies=tier.canopyCap>0?placeCanopies(inp,tier.canopyCap):[];
 return {positions,colors,sea,indices,canopies,stats:{vertices:vcount,triangles:indices.length/3,canopies:canopies.length,canopyTriangles:canopies.length*HORIZON_RULES.canopyTriangles,rings:N,side:S,extent:inp.extent,firstStep:offs[1]-offs[0]}};
}
/** Merged forest masses: jittered cells, bigger with distance, only on forested lowland land. Thinned uniformly when over the cap. */
export function placeCanopies(inp:HorizonInput,cap:number):Canopy[]{
 const {half,seaY,seed}=inp,bands=HORIZON_RULES.canopyBands,out:Canopy[]=[];
 let from=0;const all:Canopy[]=[];
 for(const band of bands){
  const to=Math.min(band.to,inp.extent);if(from>=inp.extent)break;
  const lim=half+to,cell=band.cell,n0=Math.floor(-lim/cell),n1=Math.ceil(lim/cell);
  for(let gz=n0;gz<n1;gz++)for(let gx=n0;gx<n1;gx++){
   const jx=hash2(gx*7.1+seed,gz*3.7+band.cell),jz=hash2(gx*1.9-seed,gz*5.3+band.cell);
   const x=(gx+.15+jx*.7)*cell,z=(gz+.15+jz*.7)*cell,dd=edgeDistance(half,x,z);
   if(dd<=from+(from===0?18:0)||dd>to)continue;
   const h=horizonHeight(inp,x,z),sp=cell*.5,slope=Math.hypot(horizonHeight(inp,x+sp,z)-horizonHeight(inp,x-sp,z),horizonHeight(inp,x,z+sp)-horizonHeight(inp,x,z-sp))/(2*sp);
   const g=horizonGround(seed,seaY,x,z,h,slope);
   if(g.sea||g.forest<.42||slope>.75)continue;
   if(hash2(gx*13.3+seed*.1,gz*17.9)>g.forest*1.15)continue;
   const r=cell*(.5+hash2(gx*2.2,gz*9.1+seed)*.28);
   all.push({x,y:h-Math.min(4,r*.12),z,r,h:r*(.9+hash2(gx+seed,gz*4.4)*.6),tone:hash2(gx*5.5,gz*6.6)});
  }
  from=to;
 }
 if(all.length<=cap)return all;
 const keep=cap/all.length;
 for(const c of all)if(hash2(c.x*.37,c.z*.53)<keep)out.push(c);
 return out.slice(0,cap);
}
/** Horizon cost for the budget report and tests. */
export function horizonBudget(tier:HorizonTierName){
 const t=HORIZON_RULES.tiers[tier];
 return {triangles:t.rings*4*t.side*2+t.canopyCap*HORIZON_RULES.canopyTriangles,drawCalls:t.canopyCap>0?2:1};
}
