import {DRAW_DISTANCE_RULES} from '../game/drawDistance';
import {BOTANICAL_SPECIES,type BaseForm} from './botanicalSpecies';
/** Cosmetic filler forest: render-only trees that keep the woods from thinning out with distance.
 *
 * The simulation only places a limited number of tree resources (per-province density, steep and wet ground refused, felled stands do not regrow
 * into a forest), so beyond the camps the world read as bare. Filler trees are NOT resources: they have negative ids (see isFillerId), never enter
 * game.state, are never picked, never chopped, never counted, never saved and never consume the simulation's random stream. They are a pure function of
 * (world seed, province grid, height, water, geology soil, camp positions, sim tree positions, chunk coordinates), so every client draws the same
 * forest and a reload draws it again.
 *
 * Where: only beyond `simTreeRadiusMetres` of every camp (thinning in over `fillerBlendMetres`, so the edge of the sim-tree area is a gradient, not a ring),
 * never within 3.5 m of a sim tree, never within `buildingClearMetres` of a building (dynamic, checked by the caller), never on wet, steep, bare-rock or
 * scree ground, never outside the world. Density follows the province's own sim density (trees per hectare) shaped into groves and clearings by value
 * noise, and thinned by thin geology soil.
 *
 * How it is drawn is decided by the caller: individual trees inside the detail radius, merged low-poly clustered crowns ("blobs": one per 16/32/64 m cell)
 * beyond it, both faded with a screen-door dither where they hand over. */
export const FILLER_RULES={chunkMetres:64,candidateMetres:6.4,simSeparationMetres:3.5,worldMarginMetres:6,maxGrade:.6,minDryMetres:.85,minSoil:.08,maxChunks:900,
 /** blob radius is the merged canopy area of its trees scaled by this (crowns overlap) */
 canopyOverlap:.72} as const;
export type FillerEnv={
 seed:number;size:number;
 height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number;
 /** ecological province at a point: its kind and the sim's own target density (trees per hectare) */
 provinceAt:(x:number,z:number)=>{kind:string;treeDensityPerHectare:number};
 /** geology soil depth 0..1 (already reduced by scree) or null when the map has no geology layer */
 soilAt:(x:number,z:number)=>number|null;
 camps:readonly {x:number;z:number}[];
 /** forest base form of a tree id at a point (the same function the forest uses to pick species) */
 baseFormAt:(id:number,x:number,z:number)=>BaseForm;
};
export type FillerTree={id:number;x:number;y:number;z:number;amount:number;scale:number;regenT:number;filler:true};
export type FillerBlob={x:number;y:number;z:number;/** crown half-width */r:number;/** crown half-height */h:number;/** summer leaf colour, 0..1 */cr:number;cg:number;cb:number;/** share of needle-leaf crowns 0..1 */needle:number;/** share of deciduous crowns 0..1 */dec:number;/** trees merged */n:number};
type Chunk={trees:FillerTree[];blobs:(FillerBlob[]|null)[]};
/** Filler ids are negative; sim resource ids are positive. */
const nowMs=()=>typeof performance!=='undefined'?performance.now():Date.now();
export const isFillerId=(id:number)=>id<0;
const groupLeaf=(()=>{const acc=new Map<string,{r:number;g:number;b:number;n:number;dec:number}>();
 for(const s of BOTANICAL_SPECIES){const h=s.leaf.replace('#',''),a=acc.get(s.group)??{r:0,g:0,b:0,n:0,dec:0};a.r+=parseInt(h.slice(0,2),16)/255;a.g+=parseInt(h.slice(2,4),16)/255;a.b+=parseInt(h.slice(4,6),16)/255;a.n++;if(!s.evergreen)a.dec++;acc.set(s.group,a);}
 const out=new Map<string,{r:number;g:number;b:number;dec:number}>();for(const [k,a] of acc)out.set(k,{r:a.r/a.n,g:a.g/a.n,b:a.b/a.n,dec:a.dec/a.n});return out;})();
/** Crown half-width and height (metres at scale 1) per base form: broad oak-like, narrow spruce-like, and so on. */
const CROWN:Record<BaseForm,{r:number;h:number}>={broadleaf:{r:4.6,h:15},conifer:{r:2.9,h:20},willow:{r:4,h:10},acacia:{r:3.6,h:8},palm:{r:2.3,h:11},stunted:{r:1.9,h:4},scrub:{r:1.6,h:3}};
function hash(a:number,b:number,seed:number,salt:number){let n=Math.imul(a|0,0x1b873593)^Math.imul(b|0,0x85ebca6b)^Math.imul(seed|0,0xc2b2ae35)^Math.imul(salt|0,0x9e3779b1);n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function vnoise(x:number,z:number,seed:number,salt:number){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=hash(ix,iz,seed,salt),b=hash(ix+1,iz,seed,salt),c=hash(ix,iz+1,seed,salt),d=hash(ix+1,iz+1,seed,salt);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
/** Grove/clearing field 0..1 (two octaves: woods ~70 m across, groves ~22 m). */
export function groveAt(seed:number,x:number,z:number){return vnoise(x/70,z/70,seed,11)*.62+vnoise(x/22,z/22,seed,23)*.38;}
export class FillerForest{
 private env:FillerEnv;private chunks=new Map<number,Chunk>();private simHash=new Map<number,{x:number;z:number}[]>();private simCount=-1;
 /** counters for tests and the measurement harness */
 stats={chunksBuilt:0,treesBuilt:0};
 constructor(env:FillerEnv){this.env=env;}
 private key(cx:number,cz:number){return (cx+4096)*8192+(cz+4096);}
 /** Whether the chunk is already built (the renderer defers unbuilt ones when its per-frame time budget is spent). */
 has(cx:number,cz:number){return this.chunks.has(this.key(cx,cz));}
 /** Tell the filler where the sim's own trees stand so it keeps clear of them. Rebuilds only when the list changes length (planting); felled trees keep their entry. */
 setSimTrees(trees:readonly {x:number;z:number}[]){
  if(trees.length===this.simCount)return;this.simCount=trees.length;this.simHash.clear();this.chunks.clear();
  for(const t of trees){const k=Math.floor(t.x/8)*8192+Math.floor(t.z/8),l=this.simHash.get(k);if(l)l.push(t);else this.simHash.set(k,[t]);}
 }
 private nearSim(x:number,z:number){
  const r=FILLER_RULES.simSeparationMetres,ix=Math.floor(x/8),iz=Math.floor(z/8);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const l=this.simHash.get((ix+dx)*8192+iz+dz);if(l)for(const t of l)if(Math.hypot(t.x-x,t.z-z)<r)return true;}
  return false;
 }
 /** Distance (metres) from a point to the nearest camp (Infinity with none). */
 campDistance(x:number,z:number){let d=Infinity;for(const c of this.env.camps)d=Math.min(d,Math.hypot(c.x-x,c.z-z));return d;}
 /** Expected density multiplier at a point: groves, clearings and soil. Exposed so tests can reason about stands. */
 chunk(cx:number,cz:number):Chunk{
  const k=this.key(cx,cz),hit=this.chunks.get(k);if(hit){this.chunks.delete(k);this.chunks.set(k,hit);return hit;}
  const built=this.build(cx,cz);this.chunks.set(k,built);
  if(this.chunks.size>FILLER_RULES.maxChunks){const first=this.chunks.keys().next().value;if(first!==undefined)this.chunks.delete(first);}
  return built;
 }
 private build(cx:number,cz:number):Chunk{
  const env=this.env,R=FILLER_RULES,C=R.chunkMetres,step=R.candidateMetres,n=Math.floor(C/step),half=env.size/2-R.worldMarginMetres,trees:FillerTree[]=[];
  const perHectare=10000/(step*step);let k=0;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const x=cx*C+(i+.12+hash(cx*64+i,cz*64+j,env.seed,3)*.76)*step,z=cz*C+(j+.12+hash(cx*64+i,cz*64+j,env.seed,5)*.76)*step;
   if(Math.abs(x)>half||Math.abs(z)>half)continue;
   const p=env.provinceAt(x,z);if(!(p.treeDensityPerHectare>0))continue;
   const soil=env.soilAt(x,z);if(soil!==null&&soil<R.minSoil)continue;
   const grove=smooth(.3,.72,groveAt(env.seed,x,z))*1.8,soilMul=soil===null?1:.3+.7*Math.min(1,soil*1.25);
   const accept=Math.min(1,p.treeDensityPerHectare*grove*soilMul/perHectare);
   if(hash(cx*64+i,cz*64+j,env.seed,7)>=accept)continue;
   // keep the sim's own area authoritative: thin in over a gradient beyond the camps
   const d=this.campDistance(x,z),blend=smooth(DRAW_DISTANCE_RULES.simTreeRadiusMetres,DRAW_DISTANCE_RULES.simTreeRadiusMetres+DRAW_DISTANCE_RULES.fillerBlendMetres,d);
   if(blend<=0||hash(cx*64+i,cz*64+j,env.seed,13)>=blend)continue;
   const y=env.height(x,z);if(!Number.isFinite(y)||y<env.waterAt(x,z)+R.minDryMetres)continue;
   const grade=Math.max(Math.abs(env.height(x+2,z)-env.height(x-2,z)),Math.abs(env.height(x,z+2)-env.height(x,z-2)))/4;if(grade>R.maxGrade)continue;
   if(this.nearSim(x,z))continue;
   const id=-(1+((cx+2048)*4096+(cz+2048))*128+k++);
   trees.push({id,x,y,z,amount:1,scale:(.8+.6*hash(cx*64+i,cz*64+j,env.seed,17))*(.88+.12*(soil??1)),regenT:0,filler:true});
  }
  this.stats.chunksBuilt++;this.stats.treesBuilt+=trees.length;
  return {trees,blobs:[null,null,null]};
 }
 /** Merged crowns for a chunk at a cell size index (0: 16 m, 1: 32 m, 2: 64 m). Built from the chunk's trees, so they cost nothing extra to keep deterministic. */
 blobs(cx:number,cz:number,level:0|1|2):FillerBlob[]{
  const ch=this.chunk(cx,cz),cached=ch.blobs[level];if(cached)return cached;
  const cell=DRAW_DISTANCE_RULES.blobCells[level].size,groups=new Map<number,{n:number;sx:number;sz:number;area:number;hs:number;r:number;g:number;b:number;needle:number;dec:number}>();
  for(const t of ch.trees){
   const base=this.env.baseFormAt(t.id,t.x,t.z),crown=CROWN[base]??CROWN.broadleaf,leaf=groupLeaf.get(base)??groupLeaf.get('broadleaf')!,g0=Math.floor(t.x/cell)*4096+Math.floor(t.z/cell),
    jitter=.9+.2*hash(t.id,7,this.env.seed,29),cr=crown.r*t.scale,g=groups.get(g0)??{n:0,sx:0,sz:0,area:0,hs:0,r:0,g:0,b:0,needle:0,dec:0};
   g.n++;g.sx+=t.x;g.sz+=t.z;g.area+=Math.PI*cr*cr;g.hs+=crown.h*t.scale;g.r+=leaf.r*jitter;g.g+=leaf.g*jitter;g.b+=leaf.b*jitter;if(base==='conifer')g.needle++;g.dec+=leaf.dec;groups.set(g0,g);
  }
  const out:FillerBlob[]=[];
  for(const g of groups.values()){
   const x=g.sx/g.n,z=g.sz/g.n,y=this.env.height(x,z),h=g.hs/g.n,needle=g.needle/g.n,r=Math.min(cell*.8,Math.sqrt(g.area*FILLER_RULES.canopyOverlap/Math.PI));
   // a tall crown for a conifer stand, a squat one for a broadleaf grove; centred a little above the ground so the base sits in the trunks
   out.push({x,y:y+h*.42,z,r,h:h*.5,cr:g.r/g.n,cg:g.g/g.n,cb:g.b/g.n,needle,dec:g.dec/g.n,n:g.n});
  }
  ch.blobs[level]=out;return out;
 }
 /** Gather what to draw for one camera. Individual trees inside `detail`, blobs from `detail - fade` to `far`; caps are honoured nearest-first and the effective radii
  * are reported so the renderer fades exactly where the content really ends (no ring at a budget cut). `inView` is a conservative chunk test (cx,cz of its centre, radius). */
 collect(camera:{x:number;z:number},p:{detail:number;far:number;fade:number;maxTrees:number;maxBlobs:number;/** milliseconds this call may spend generating new chunks (nearest first); the rest fill in on later calls. Absent = no limit. */buildMs?:number;inView?:(x:number,z:number,r:number)=>boolean;exclude?:(x:number,z:number)=>boolean},out:{trees:FillerTree[];blobs:FillerBlob[]}){
  out.trees.length=0;out.blobs.length=0;
  const C=FILLER_RULES.chunkMetres,far=p.far,c0x=Math.floor((camera.x-far)/C),c1x=Math.floor((camera.x+far)/C),c0z=Math.floor((camera.z-far)/C),c1z=Math.floor((camera.z+far)/C),list:{cx:number;cz:number;d:number}[]=[];
  const maxIndex=Math.floor((this.env.size/2)/C)+1;
  for(let cz=Math.max(c0z,-maxIndex);cz<=Math.min(c1z,maxIndex);cz++)for(let cx=Math.max(c0x,-maxIndex);cx<=Math.min(c1x,maxIndex);cx++){
   const mx=(cx+.5)*C,mz=(cz+.5)*C,d=Math.hypot(mx-camera.x,mz-camera.z);if(d-C*.71>far)continue;
   if(p.inView&&d>C&&!p.inView(mx,mz,C*.72))continue;
   list.push({cx,cz,d});
  }
  list.sort((a,b)=>a.d-b.d);
  const t0=nowMs(),budget=p.buildMs??Infinity;let deferred=0;const afford=(cx:number,cz:number,level:0|1|2|-1)=>{if(this.has(cx,cz)&&(level<0||this.chunk(cx,cz).blobs[level]))return true;if(nowMs()-t0<=budget)return true;deferred++;return false;};
  let detailEff=p.detail,farEff=far,treeCapped=false;const cells=DRAW_DISTANCE_RULES.blobCells;
  for(const c of list){
   if(c.d-C*.71<=detailEff&&!treeCapped){
    if(!afford(c.cx,c.cz,-1))continue;
    const ch=this.chunk(c.cx,c.cz);
    if(out.trees.length+ch.trees.length>p.maxTrees){treeCapped=true;detailEff=Math.max(0,Math.min(detailEff,c.d-C*.71));}
    else for(const t of ch.trees){const d=Math.hypot(t.x-camera.x,t.z-camera.z);if(d<=detailEff&&!(p.exclude&&p.exclude(t.x,t.z)))out.trees.push(t);}
   }
  }
  // blobs: from the hand-over band outward, resolution by distance
  const start=Math.max(0,detailEff-p.fade);let blobCapped=false;
  for(const c of list){
   if(blobCapped)break;if(c.d+C*.71<start)continue;
   const level=(c.d>=cells[2].from?2:c.d>=cells[1].from?1:0) as 0|1|2;if(!afford(c.cx,c.cz,level))continue;const bl=this.blobs(c.cx,c.cz,level);
   for(const b of bl){
    const d=Math.hypot(b.x-camera.x,b.z-camera.z);if(d<start||d>far||(p.exclude&&p.exclude(b.x,b.z)))continue;
    if(out.blobs.length>=p.maxBlobs){blobCapped=true;farEff=Math.min(farEff,d);break;}
    out.blobs.push(b);
   }
  }
  return {detailEff,farEff,chunks:list.length,treeCapped,blobCapped,deferred};
 }
}
