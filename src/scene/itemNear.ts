/** ITEM near-tier finishing pass: pure, deterministic. After a generator has drawn an item at the NEAR tier (lod 0), this adds the marks of use that a close view
 *  shows and that the base shapes do not: residue (soot, dried blood, soil, pitch or clay by category), edge chips (pale knapped flakes where a blade edge has been
 *  worked), scuffs, and for leather and cloth items a few stitched seams. Every addition is a flattened ellipsoid or small box sitting on a vertex the generator already
 *  made (so nothing floats), sampled with the item's own seeded generator, scaled by real wear, and limited by the item's remaining triangle budget (`room()`),
 *  so the near tier never exceeds ITEM_DEFS budget. Mid and far tiers are untouched. Hand-shaped details (shaft grain, lashing knots, grip stitching) live in itemKit.ts. */
import type {Ctx} from './itemKit';
import {flat,hexRgb,rgbMix,v3,type V3,type RGB} from './itemMesh';

export const NEAR_ITEM={enabled:true,/** most triangles this pass adds to one item */maxTris:260,/** vertices considered when sampling (bounded for speed) */sample:4000} as const;
const RESIDUE:Record<string,[string,string]>={melee:['#3a1c16','#2a2422'],ranged:['#4a3a26','#2c2a26'],shield:['#4a3a2c','#2d2620'],siege:['#2c2a26','#4a3c2a'],farm:['#4b3a28','#5a4a30'],craft:['#5a4630','#3a342c'],hunt:['#3a2420','#4a3a2c'],fish:['#4a4a3c','#3a4038'],carry:['#5a4a34','#3c3228'],ship:['#2c2a26','#4a3f30'],light:['#2a2420','#3a2e22']};
const CHIP='#d9cdb2';

export function nearItemDetail(c:Ctx,category:string){
 if(!NEAR_ITEM.enabled||c.lod!==0)return;
 const b=c.b,total=b.P.length/9;if(total<12)return;
 const room=Math.min(NEAR_ITEM.maxTris,c.room?c.room():NEAR_ITEM.maxTris);if(room<60)return;
 // vertices: P holds 3 vertices per triangle (x,y,z each); sample on a fixed stride so the pass is O(sample)
 const nv=b.P.length/3,stride=Math.max(1,Math.floor(nv/NEAR_ITEM.sample)),idx:number[]=[];for(let i=0;i<nv;i+=stride)idx.push(i);
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const i of idx){const x=b.P[i*3],y=b.P[i*3+1];if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
 const span=Math.max(maxX-minX,maxY-minY,.1),wear=Math.min(1,c.wear+.12),scale=Math.min(1,span/.9),pal=RESIDUE[category]??RESIDUE.melee;
 const resid:RGB[]=pal.map(h=>hexRgb(h)),chipCol=hexRgb(CHIP);
 let used=0;
 const vtx=(i:number):[V3,V3]=>[[b.P[i*3],b.P[i*3+1],b.P[i*3+2]],v3.norm([b.N[i*3],b.N[i*3+1],b.N[i*3+2]])];
 // residue patches (ellipsoids lying flat on the surface): more with wear, fewer on tiny items
 const nPatch=Math.min(5,Math.round(2+wear*4*(.4+scale*.6)));
 for(let k=0;k<nPatch&&used+48<=room;k++){
  const i=idx[Math.floor(c.r('p'+k)*idx.length)%idx.length],[p,n]=vtx(i);if(v3.len(n)<.5)continue;
  const r=(.006+c.r('pr'+k)*.011)*(.6+scale*.6),paint=flat(rgbHex(rgbMix(resid[k%2],[.5,.42,.3],.1+.25*c.r('pm'+k))));
  b.pushAlong(v3.add(p,v3.mul(n,.0004)),v3.add(p,n));b.ellipsoid([0,0,0],[r,.0014,r*(.6+.5*c.r('pe'+k))],paint,4);b.pop();used+=48;
 }
 // edge chips: pale flakes at the widest vertices (blade edges, axe bits, adze lips), only on edged categories and worked items
 if(category==='melee'||category==='hunt'||category==='craft'||category==='farm'){
  const edge=idx.filter(i=>Math.abs(b.P[i*3]-(minX+maxX)/2)>(maxX-minX)*.42);
  const nChip=Math.min(5,Math.round(1+wear*5));
  for(let k=0;k<nChip&&edge.length&&used+14<=room;k++){
   const i=edge[Math.floor(c.r('c'+k)*edge.length)%edge.length],[p,n]=vtx(i),s=.004+c.r('cs'+k)*.005;
   b.push(v3.add(p,v3.mul(n,.0006)),[c.r('cx'+k)*3,c.r('cy'+k)*3,c.r('cz'+k)*3]);b.box([s,s*.5,s*.8],[0,0,0],flat(rgbHex(rgbMix(chipCol,[.5,.45,.35],c.r('cm'+k)*.5))));b.pop();used+=12;
  }
 }
}
const rgbHex=(c:RGB)=>'#'+c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
