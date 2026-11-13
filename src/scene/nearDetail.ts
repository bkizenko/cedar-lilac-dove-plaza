/** Near-tier building detail pass: pure, deterministic, no three.js.
 *
 * The generators draw a hut as a handful of boxes (about 280 triangles). That is fine as a mid-distance mass but reads as "low detail" at the zoom a player
 * actually uses. This pass reads the finished spec and adds geometry that a builder would actually have made, ONLY at the near tier (lod 0, plus a few cheap
 * structural members at mid): thatch/shingle courses and ridge cap on roofs, eave boards, log or plank courses and corner posts on walls, stone courses
 * on stone walls, window frames with shutters and sills, door planks, and a few props by the door (firewood, barrel, bench).
 *
 * Everything added overlaps its host part (so nothing floats), stays inside the footprint, is seeded from the variant key, and is limited by a per-building
 * triangle budget so near-tier cost stays predictable (see NEAR_DETAIL.maxAdded and docs/DETAIL_AUDIT.md for the measured before/after counts).
 * Mid and far tiers and the impostor card are untouched except the structural members marked lod 1. */
import {hashSeed,part,partBounds,partTriangles,seededRandom,specTriangles,type BuildingSpec,type Part,type Rng} from './buildingParts';

export const NEAR_DETAIL={
 /** triangles this pass may add at the near tier, and the ceiling for the finished near tier (carved tests allow 2600) */
 maxAdded:1250,nearCeiling:2400,
 /** structural members (ridge cap, corner posts) also drawn at mid; their share of the mid budget */
 maxMidAdded:120,
 /** buildings whose generator already carries this much near detail are left alone */
 skipAbove:2000,
 /** spacing of roof courses along the slope (metres) */
 courseMetres:.3,
 enabled:true,
} as const;

type V3=[number,number,number];
const ISROOF=/(^|\.)(roof|thatch|shingle|tile|slate|straw)$/,ISSTONE=/(^|\.)(stone|stoneDark|wall2?)$/,ISWOOD=/(^|\.)(wood(Light|Mid|Dark|Edge)?|trunk|wall|wall2|trim|plaster|mud)$/;
const slot=(m:string)=>m.includes('.')?m.slice(m.indexOf('.')+1):m;
const prefix=(m:string)=>m.includes('.')?m.slice(0,m.indexOf('.')+1):'';
const hasOwnTable=(spec:BuildingSpec)=>!!spec.materials;
const rot3=(v:V3,rot?:readonly number[]):V3=>{if(!rot)return v;const [rx,ry,rz]=rot;let [x,y,z]=v;let c=Math.cos(rz),s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];c=Math.cos(rx);s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];return [x,y,z];};

/** Material ids this pass may use, resolved from the host so civ tables and carved palettes both work. */
function pickMats(spec:BuildingSpec,host:string){
 const pre=prefix(host),civ=!!pre&&hasOwnTable(spec);
 return civ?{trim:pre+'trim',dark:pre+'accent',wall2:pre+'wall2',roof:pre+'roof'}:{trim:'woodDark',dark:'woodDark',wall2:'woodMid',roof:host};
}
const classOf=(m:string):'roof'|'wall'|'other'=>{const s=slot(m);return ISROOF.test(s)?'roof':ISWOOD.test(s)||ISSTONE.test(s)||s==='plaster'||s==='stone'?'wall':'other';};

/** Add the near-tier detail. Returns the same spec object when nothing is added. */
export function withNearDetail(spec:BuildingSpec):BuildingSpec{
 if(!NEAR_DETAIL.enabled)return spec;
 const base=specTriangles(spec,0);if(base>=NEAR_DETAIL.skipAbove)return spec;
 const r:Rng=seededRandom(hashSeed('nearDetail',spec.variantKey));
 const budget=Math.max(0,Math.min(NEAR_DETAIL.maxAdded,NEAR_DETAIL.nearCeiling-base));
 const fw=spec.footprint.w/2-.03,fd=spec.footprint.d/2-.03;
 const add:Part[]=[];let used=0,mid=0;
 const inside=(p:Part)=>{const b=partBounds(p);return b.minX>=-fw&&b.maxX<=fw&&b.minZ>=-fd&&b.maxZ<=fd;};
 /** a group is all-or-nothing, so a seat is never left without its legs */
 const group=(ps:Part[])=>{const t=ps.reduce((n,p)=>n+partTriangles(p),0);if(used+t>budget||!ps.every(inside))return false;used+=t;add.push(...ps);return true;};
 const push=(p:Part)=>{const t=partTriangles(p);if(used+t>budget)return false;if(!inside(p))return false;if(p.lod===1){if(mid+t>NEAR_DETAIL.maxMidAdded)return false;mid+=t;}used+=t;add.push(p);return true;};
 // priority 1: roofs and wall structure (most of the silhouette), priority 2: openings, priority 3: props
 const roofs=spec.parts.filter(p=>p.onlyFrom===undefined&&p.lod>=0&&classOf(p.mat)==='roof'&&flat(p)&&p.size[1]>.3&&p.pos[1]>=.3);
 const walls=spec.parts.filter(p=>p.onlyFrom===undefined&&classOf(p.mat)==='wall'&&p.shape==='box'&&flat(p)&&p.size[1]>=1.0&&p.size[0]>=.9&&p.size[2]>=.9&&p.pos[1]<.8&&p.pos[1]>=-.01);
 const rounds=spec.parts.filter(p=>p.onlyFrom===undefined&&classOf(p.mat)==='wall'&&p.shape==='cylinder'&&flat(p)&&p.size[1]>=1.0&&p.size[0]>=1.6&&p.pos[1]<.8&&p.pos[1]>=-.01&&slot(p.mat)!=='trim');
 for(const p of roofs)roofDetail(p,spec,r,push);
 for(const p of walls)wallDetail(p,spec,r,push);
 for(const p of rounds)roundWallDetail(p,spec,r,push);
 for(const p of walls)openings(p,spec,r,push);
 if(walls.length)props(walls,spec,r,push,group);else if(rounds.length)props([{...rounds[0],shape:'box',size:[rounds[0].size[0]*.8,rounds[0].size[1],rounds[0].size[0]*.8]}],spec,r,push,group);
 if(!add.length)return spec;
 return {...spec,parts:[...spec.parts,...add]};
}

/** Parts in the host's frame: `o` is an offset from the host base centre, rotated with the host (y rotation only is supported). */
/** the generators lean parts by a few thousandths of a radian for imperfection: that is "flat" for this pass */
const flat=(p:Part)=>!p.rot||(Math.abs(p.rot[0])<.03&&Math.abs(p.rot[2])<.03);
const hostRot=(p:Part):readonly number[]|undefined=>p.rot&&(Math.abs(p.rot[1])>1e-3)&&flat(p)?[0,p.rot[1],0]:undefined;
const child=(host:Part,shape:Part['shape'],mat:string,size:V3,o:V3,lod:0|1,rot?:V3,sides?:number):Part=>{
 const hr=hostRot(host),w=rot3(o,hr);const r:V3|undefined=hr||rot?[(hr?.[0]??0)+(rot?.[0]??0),(hr?.[1]??0)+(rot?.[1]??0),(hr?.[2]??0)+(rot?.[2]??0)]:undefined;
 return part(shape,mat as Part['mat'],size,[host.pos[0]+w[0],host.pos[1]+w[1],host.pos[2]+w[2]],lod,r&&(r[0]||r[1]||r[2])?r:undefined,sides);
};

function roofDetail(h:Part,spec:BuildingSpec,r:Rng,push:(p:Part)=>boolean){
 const [w,ht,d]=h.size,M=pickMats(spec,h.mat),cm=NEAR_DETAIL.courseMetres;
 if(h.shape==='prism'||h.shape==='hip'){
  const hw=w/2,th=Math.atan2(ht,hw),slopeLen=Math.hypot(hw,ht),n=Math.max(2,Math.min(9,Math.floor(slopeLen/cm))),inset=h.shape==='hip'?Math.min(h.inset??0,d/2):0;
  for(const sgn of[-1,1])for(let i=0;i<n;i++){
   // courses overlap like shingles: each is a thin plank lying on the slope, a little longer than the pitch between courses, offset in x by a small random stagger
   const f=(i+.5)/n,x=sgn*hw*(1-f),y=ht*f,len=Math.min(d+.12,d-2*inset*f+.08),seg=slopeLen/n*1.25;
   if(len<.4)continue;
   const jx=(r()-.5)*.05,ly=(r()-.5)*.03;
   push(child(h,'box',M.roof,[seg,.07,len],[x+jx,y+ly-.01,0],0,[0,0,-sgn*th]));
  }
  // ridge cap (also at mid: it carries the roof's silhouette)
  push(child(h,'box',M.trim,[.2,.14,d+.16],[0,ht-.06,0],1));
  // eave boards along both long edges and the two gable barge boards
  for(const sgn of[-1,1])push(child(h,'box',M.trim,[.1,.12,d+.1],[sgn*(hw-.02),-.05,0],0));
  // bundles of thatch hanging over the eave: short uneven tufts
  const tufts=Math.min(10,Math.floor(d/.45));for(let i=0;i<tufts;i++){const z=-d/2+.3+i*(d-.6)/Math.max(1,tufts-1);push(child(h,'box',M.roof,[.16,.22+r()*.14,.2],[(i%2?1:-1)*(hw+.03),-.18-r()*.06,z],0));}
 }else if(h.shape==='cone'||h.shape==='pyramid'){
  const R=Math.max(w,d)/2,n=Math.max(3,Math.min(5,Math.floor(ht/.5)));
  for(let i=1;i<=n;i++){const f=i/(n+1),rr=R*(1-f)+.03;if(rr<.25)continue;push(child(h,'cylinder',M.roof,[rr*2,.1,rr*2],[0,ht*f-.03,0],0,undefined,h.sides&&h.sides>=8?Math.min(h.sides,10):8));}
  push(child(h,'cylinder',M.trim,[.2,.5,.2],[0,ht-.18,0],1,undefined,6));
 }
}

function wallDetail(h:Part,spec:BuildingSpec,r:Rng,push:(p:Part)=>boolean){
 const [w,ht,d]=h.size,M=pickMats(spec,h.mat),s=slot(h.mat),stone=s==='stone'||s==='stoneDark'||s==='wall2'&&r()<.4;
 const hw=w/2,hd=d/2,px=.12;
 // corner posts: structure shows at the corners (also at mid)
 for(const sx of[-1,1])for(const sz of[-1,1])push(child(h,'box',M.trim,[px,ht+.04,px],[sx*(hw-px*.2),0,sz*(hd-px*.2)],1));
 // a base plinth of stones and a head plate under the eaves
 push(child(h,'box',M.wall2,[w+.1,.28,d+.1],[0,0,0],0));
 push(child(h,'box',M.trim,[w+.08,.12,d+.08],[0,ht-.1,0],0));
 // courses on the entry (+z) face and the long side faces
 const courseH=stone?.34:.26,rows=Math.max(2,Math.min(stone?6:5,Math.floor((ht-.5)/courseH)));
 for(let i=0;i<rows;i++){
  const y=.3+i*(ht-.55)/rows,lenF=stone?.85+r()*.12:.96;
  push(child(h,'box',stone?M.wall2:M.trim,[w*lenF,.06,.06],[(r()-.5)*.1,y,hd+.01],0));
  if(i%2===0){push(child(h,'box',stone?M.wall2:M.trim,[.06,.06,d*lenF],[hw+.01,y,(r()-.5)*.1],0));push(child(h,'box',stone?M.wall2:M.trim,[.06,.06,d*lenF],[-hw-.01,y,(r()-.5)*.1],0));}
 }
 // log or beam ends poking out at the corners (wood walls)
 if(!stone)for(let i=0;i<3;i++)for(const sx of[-1,1])push(child(h,'box',M.trim,[.2,.11,.11],[sx*(hw+.02),.55+i*(ht-.9)/3,hd-.08],0));
}

function openings(h:Part,spec:BuildingSpec,r:Rng,push:(p:Part)=>boolean){
 const [w,ht,d]=h.size,M=pickMats(spec,h.mat);if(ht<1.5)return;
 const hw=w/2,hd=d/2,wy=Math.min(ht*.5,1.15),ww=.5,wh=.55;
 // shuttered windows on the two side faces and the back face, framed and sill-ed
 for(const sgn of[-1,1]){
  const x=sgn*(hw+.01);
  push(child(h,'box',M.dark,[.07,wh,ww],[x,wy,-hd*.25],0));
  push(child(h,'box',M.trim,[.1,.07,ww+.18],[sgn*(hw+.03),wy-.07,-hd*.25],0));push(child(h,'box',M.trim,[.1,.07,ww+.14],[sgn*(hw+.03),wy+wh,-hd*.25],0));
  push(child(h,'box',M.trim,[.1,wh+.14,.07],[sgn*(hw+.03),wy-.07,-hd*.25-ww/2-.03],0));push(child(h,'box',M.trim,[.1,wh+.14,.07],[sgn*(hw+.03),wy-.07,-hd*.25+ww/2+.03],0));
  push(child(h,'box',M.trim,[.05,wh,ww*.48],[sgn*(hw+.05),wy,-hd*.25+ww*.74],0,[0,sgn*.5,0]));
 }
 // door planks on the entry face: three vertical boards and a lintel, each proud of the wall
 const dw=.9;for(let i=-1;i<=1;i++)push(child(h,'box',M.trim,[dw/3-.02,1.6,.04],[i*dw/3+(r()-.5)*.06,0,hd+.045],0));
 push(child(h,'box',M.trim,[dw+.1,.08,.06],[0,.55,hd+.075],0));push(child(h,'box',M.trim,[dw+.1,.08,.06],[0,1.2,hd+.075],0));
}

function props(walls:Part[],spec:BuildingSpec,r:Rng,push:(p:Part)=>boolean,group:(ps:Part[])=>boolean){
 const h=walls.reduce((a,b)=>b.size[0]*b.size[2]>a.size[0]*a.size[2]?b:a,walls[0]);if(h.pos[1]>.05)return;const M=pickMats(spec,h.mat),hw=h.size[0]/2,hd=h.size[2]/2;
 const fw=spec.footprint.w/2-.2;
 // firewood stack against the side wall, a barrel by the door, a low bench; each only if it fits in the footprint
 const sx=h.pos[0]+hw+.35<fw?1:h.pos[0]-hw-.35>-fw?-1:0;
 if(sx)for(let i=0;i<4;i++)for(let j=0;j<(i<2?4:3);j++)push(part('cylinder',M.trim as Part['mat'],[.16,.7,.16],[h.pos[0]+sx*(hw+.12),h.pos[1]+.12+i*.15,h.pos[2]+hd*.35-.2+j*.17+(i%2)*.08],0,[Math.PI/2,0,0],6));
 group([part('cylinder',M.wall2 as Part['mat'],[.5,.7,.5],[h.pos[0]+hw*.75,h.pos[1],h.pos[2]+hd+.34],0,undefined,8),part('cylinder',M.trim as Part['mat'],[.52,.06,.52],[h.pos[0]+hw*.75,h.pos[1]+.38,h.pos[2]+hd+.34],0,undefined,8)]);
 group([part('box',M.trim as Part['mat'],[.9,.07,.3],[h.pos[0]-hw*.7,h.pos[1]+.38,h.pos[2]+hd+.3],0),...[-.38,.38].map(dx=>part('box',M.trim as Part['mat'],[.07,.38,.26],[h.pos[0]-hw*.7+dx,h.pos[1],h.pos[2]+hd+.3],0))]);
 void r;
}

/** Round huts (cone/dome/tent): upright staves round the wall, binding hoops, and a skirt of thatch tufts at the eave. */
function roundWallDetail(h:Part,spec:BuildingSpec,r:Rng,push:(p:Part)=>boolean){
 const [w,ht]=h.size,M=pickMats(spec,h.mat),R=w/2,n=Math.max(8,Math.min(14,Math.round(R*5)));
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2+.2;if(Math.abs(Math.sin(a/2+Math.PI/4))>.995)continue;
  // skip the doorway side (+z) so the staves never cross the opening
  if(Math.cos(a-Math.PI/2)>.93)continue;
  push(child(h,'box',M.trim,[.09,ht+.06,.09],[Math.cos(a)*(R+.01),0,Math.sin(a)*(R+.01)],i%3===0?1:0,[0,-a,0]));
 }
 for(const f of[.18,.5,.82])push(child(h,'cylinder',M.trim,[w+.08,.07,w+.08],[0,ht*f,0],0,undefined,10));
 push(child(h,'cylinder',M.wall2,[w+.18,.22,w+.18],[0,0,0],0,undefined,10));
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2+r()*.2;if(Math.cos(a-Math.PI/2)>.9)continue;push(child(h,'box',M.roof,[.14,.3+r()*.12,.14],[Math.cos(a)*(R+.12),ht-.25,Math.sin(a)*(R+.12)],0,[0,-a,0]));}
}
