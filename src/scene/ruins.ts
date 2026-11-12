/** Ruins: turns any building or wonder spec into an aged, broken variant, as pure part specs.
 * It is a physical transformation of the source parts, not a clean building with a label:
 *   - roofs go first (timber, thatch and shingle fail sooner than tile or stone) and are gone at decay >= .6;
 *   - walls are cut into segments with a broken skyline; timber walls rot to stumps, stone survives lower;
 *   - what fell becomes rubble: stone blocks piled beside the wall it came from (never more stone than fell),
 *     fallen roof timbers and thatch litter lie inside;
 *   - parts left floating by the collapse fall too (nothing hangs in the air at any LOD tier);
 *   - fire, cloth and water vanish; growth reclaims it (shrubs, vines on standing faces, saplings) or,
 *     in arid climates, wind-blown sand drifts instead;
 *   - discoverable-artifact SLOTS sit where such things would really be: under the hearth, below the threshold,
 *     beneath the largest rubble pile, among the fallen timbers, in a thick wall, in a dug floor pit, under a
 *     wonder's foundation. Content (what is found) belongs to the game; slots carry only place, depth and
 *     rarity. Footprint is unchanged; ruins never add geometry outside it. */
import {hashSeed,part,partBounds,partTriangles,rotatePoint,seededRandom,floatingParts,type BuildingSpec,type Part,type Rng} from './buildingParts';
import {ensureTierSupport} from './buildingFamilies';
import type {CarvedMaterialId} from './carvedPalette';

export type RuinSource=Pick<BuildingSpec,'family'|'footprint'|'parts'>&{variantKey?:string;entry?:BuildingSpec['entry']};
export type RuinOptions={seed:number;/** 0 sound, 1 almost gone */decay:number;/** 0 bare .. 1 reclaimed */overgrowth?:number;climate?:'arid'|'temperate'|'cold'|'wet'};
export type SlotKind='hearth'|'threshold'|'rubble'|'roofFall'|'floorPit'|'wallNiche'|'foundation';
export type ArtifactSlot={id:string;kind:SlotKind;x:number;y:number;z:number;radius:number;/** metres below the local surface the find lies (0 on the surface) */depthM:number;
 access:'open'|'under-rubble'|'in-wall'|'under-wall'|'dug';/** index in RuinSpec.parts of the pile or wall that covers it */coveredBy?:number;rarity:0|1|2};
export type RuinSpec=BuildingSpec&{ruin:{decay:number;overgrowth:number;climate:string;source:{family:string;variantKey?:string;parts:number};
 standing:number[];rubble:number[];growth:number[];fallen:number[];stats:{wallVolumeBefore:number;wallVolumeAfter:number;stoneFallenM3:number;rubbleM3:number;roofPartsRemoved:number;roofPartsBefore:number};slots:ArtifactSlot[]}};

const ROOF_MAT:CarvedMaterialId[]=['thatch','shingle','tile'],STONE_MAT:CarvedMaterialId[]=['stone','stoneDark','plaster'],TIMBER_MAT:CarvedMaterialId[]=['woodLight','woodMid','woodDark','woodEdge','woodInlay','trunk'];
const GONE_MAT:CarvedMaterialId[]=['fire','cloth','water'];
const vol=(p:Part)=>{const [w,h,d]=p.size;return p.shape==='cylinder'?Math.PI*h*(w/2)*(d/2):p.shape==='box'?w*h*d:w*h*d/2;};
const yawOnly=(p:Part)=>!p.rot||(Math.abs(p.rot[0])<1e-9&&Math.abs(p.rot[2])<1e-9);
type Kind='roof'|'wall'|'post'|'floor'|'upper'|'gone';
function classify(p:Part):Kind{
 if(GONE_MAT.includes(p.mat))return 'gone';
 const b=partBounds(p),h=b.maxY-b.minY;
 if(ROOF_MAT.includes(p.mat)&&b.minY>.5||(['prism','hip','wedge','pyramid','cone'].includes(p.shape)&&b.minY>1.2))return 'roof';
 if(b.maxY<=.6)return 'floor';
 if(b.minY>.6||!yawOnly(p))return 'upper';
 if(p.ends||(h>=.9&&Math.min(p.size[0],p.size[2])<.25))return 'post';
 return h>=.5&&(p.shape==='box'||p.shape==='cylinder')?'wall':'floor';
}
const clamp=(v:number,a:number,b:number)=>a>b?(a+b)/2:Math.max(a,Math.min(b,v));
const yaw=(p:Part)=>p.rot?.[1]??0;

export function ruinSpec(source:RuinSource,opt:RuinOptions):RuinSpec{
 // Far-tier impostors and supports of the clean building are dropped; supports are regenerated for the ruin.
 const src:RuinSource={...source,parts:source.parts.filter(p=>p.onlyFrom===undefined)};
 const d=clamp(opt.decay,0,1),over=clamp(opt.overgrowth??d*.8,0,1),climate=opt.climate??'temperate',r=seededRandom(hashSeed(opt.seed,'ruin',src.family,Math.round(d*100)));
 const kinds=src.parts.map(classify),parts:Part[]=[],standing:number[]=[],rubble:number[]=[],growth:number[]=[],fallen:number[]=[];
 const st={wallVolumeBefore:0,wallVolumeAfter:0,stoneFallenM3:0,rubbleM3:0,roofPartsRemoved:0,roofPartsBefore:kinds.filter(k=>k==='roof').length};
 const falls:{x:number;z:number;vol:number;mat:'stone'|'timber'|'thatch';thick:number;yaw:number}[]=[];
 const keepCut:Part[]=[];
 const combustible=(m:CarvedMaterialId)=>m==='thatch'||m==='shingle'||TIMBER_MAT.includes(m);
 src.parts.forEach((p,i)=>{
  const k=kinds[i],b=partBounds(p),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
  if(k==='gone')return;
  if(k==='roof'){const chance=d<=0?0:d>=.6?1:clamp(d*(combustible(p.mat)?1.7:.9)+.05,0,1);
   if(r()<chance){st.roofPartsRemoved++;falls.push({x:cx,z:cz,vol:vol(p),mat:p.mat==='thatch'?'thatch':p.mat==='tile'?'stone':'timber',thick:1,yaw:yaw(p)});return;}
   keepCut.push(p);return;}
  if(k==='floor'){if(d>.6&&r()<(d-.5)*.4&&b.maxY-b.minY<.4&&!STONE_MAT.includes(p.mat)){return;}keepCut.push(p);return;}
  if(k==='upper'){if(r()<clamp(d*1.3,0,.98)){falls.push({x:cx,z:cz,vol:vol(p),mat:STONE_MAT.includes(p.mat)?'stone':'timber',thick:1,yaw:yaw(p)});return;}keepCut.push(p);return;}
  if(k==='post'){const rot=TIMBER_MAT.includes(p.mat);if(rot&&r()<d*.8){// timber rots to a stump
    const stump=.25+r()*.25;if(p.ends){falls.push({x:cx,z:cz,vol:vol(p)*.6,mat:'timber',thick:1,yaw:0});return;}
    keepCut.push({...p,size:[p.size[0],Math.min(p.size[1],stump),p.size[2]]});return;}
   const h=p.size[1],nh=clamp(h*(1-d*r()),.3,h);if(nh<h)falls.push({x:cx,z:cz,vol:vol(p)*(1-nh/h),mat:rot?'timber':'stone',thick:1,yaw:0});keepCut.push(p.ends?p:{...p,size:[p.size[0],nh,p.size[2]]});return;}
  // wall: cut into segments along its long axis with a broken skyline.
  const along=p.size[0]>=p.size[2]?0:2,len=p.size[along],thick=Math.min(p.size[0],p.size[2]),h=p.size[1],isTimber=TIMBER_MAT.includes(p.mat),sound=isTimber?.35:.55;
  st.wallVolumeBefore+=vol(p);
  if(p.shape==='cylinder'||!yawOnly(p)){const nh=clamp(h*(1-d*(.35+r()*.65)),.3,h);if(nh<h)falls.push({x:cx,z:cz,vol:vol(p)*(1-nh/h),mat:isTimber?'timber':'stone',thick,yaw:yaw(p)});keepCut.push({...p,size:[p.size[0],nh,p.size[2]]});st.wallVolumeAfter+=vol({...p,size:[p.size[0],nh,p.size[2]]});return;}
  const n=clamp(Math.round(len/2.2),1,5),sl=len/n;let level=1-d*sound*r();
  for(let s=0;s<n;s++){level=clamp(level+(r()-.5)*d*.9,.0,1);
   const gone=r()<d*(isTimber?.9:.55)*(.5+r()*.5);let nh=gone?clamp(.25+r()*.15,.2,h):clamp(h*clamp(1-d*(isTimber?1:.8)*(1-level),.05,1),.3,h);if(nh>h)nh=h;
   const off=(-len/2+(s+.5)*sl),loc:[number,number,number]=along===0?[off,0,0]:[0,0,off],w=rotatePoint(loc,[0,yaw(p),0]);
   const seg:Part={...p,size:along===0?[sl*1.0,nh,p.size[2]]:[p.size[0],nh,sl*1.0],pos:[p.pos[0]+w[0],p.pos[1],p.pos[2]+w[2]]};
   st.wallVolumeAfter+=vol(seg);if(nh<h)falls.push({x:seg.pos[0],z:seg.pos[2],vol:vol({...p,size:along===0?[sl,h-nh,p.size[2]]:[p.size[0],h-nh,sl]}),mat:isTimber?'timber':'stone',thick,yaw:yaw(p)});
   keepCut.push(seg);}
 });
 // Drop anything the collapse left hanging (any LOD), until stable; it falls too.
 let cur=keepCut;for(let g=0;g<60;g++){const fl=floatingParts({family:'',variantKey:'',footprint:src.footprint,parts:cur,notes:{reference:''}});if(!fl.length)break;for(const i of fl){const b=partBounds(cur[i]);falls.push({x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,vol:vol(cur[i]),mat:STONE_MAT.includes(cur[i].mat)?'stone':'timber',thick:1,yaw:0});}cur=cur.filter((_,i)=>!fl.includes(i));}
 for(const p of cur){standing.push(parts.length);parts.push(p);}
 const hw=src.footprint.w/2-.05,hd=src.footprint.d/2-.05,inFp=(x:number,z:number,s:number)=>Math.abs(x)+s/2<=hw&&Math.abs(z)+s/2<=hd;
 // Rubble: stone that fell lies beside where it fell; never more stone than fell.
 const stoneFall=falls.filter(f=>f.mat==='stone'),stoneVol=stoneFall.reduce((s,f)=>s+f.vol,0);st.stoneFallenM3=Math.round(stoneVol*100)/100;
 let budget=stoneVol*.9,placed=0;const nBlocks=Math.min(60,Math.max(stoneVol>.05?2:0,Math.floor(stoneVol/.1)));
 const avgV=nBlocks?stoneVol*.8/nBlocks:0,scale=clamp(Math.cbrt(avgV/.06),1,3.2);
 for(let i=0;i<nBlocks&&budget>.002;i++){const f=stoneFall[Math.floor(r()*stoneFall.length)],big=r()<.25,s=Math.min((big?.5+r()*.4:.22+r()*.28)*scale,Math.min(hw,hd)*.5),h=s*(.5+r()*.5),side=(r()<.5?-1:1)*(f.thick/2+r()*.9),ang=f.yaw;
  const off=rotatePoint([side,0,(r()-.5)*1.4],[0,ang,0]);let x=f.x+off[0],z=f.z+off[2];const rad=Math.hypot(s,s*1.2)/2;x=clamp(x,-hw+rad,hw-rad);z=clamp(z,-hd+rad,hd-rad);
  const v=s*h*s*.9;if(v>budget)continue;budget-=v;placed+=v;
  rubble.push(parts.length);parts.push(part(r()<.2?'wedge':'box',pick(r,['stone','stoneDark','stone','plaster']),[s,h,s*(.7+r()*.5)],[x,0,z],big?2:r()<.5?1:0,[0,r()*Math.PI,0]));}
 st.rubbleM3=Math.round(placed*100)/100;
 // Fallen roof timbers and thatch litter.
 const timbers=falls.filter(f=>f.mat==='timber'&&f.vol>.01),thatch=falls.filter(f=>f.mat==='thatch');
 for(let i=0;i<Math.min(8,timbers.length);i++){const f=timbers[i],L=Math.min(1+r()*1.6,Math.min(hw,hd)*1.8),x=clamp(f.x+(r()-.5),-hw+L/2,hw-L/2),z=clamp(f.z+(r()-.5),-hd+L/2,hd-L/2);fallen.push(parts.length);parts.push(part('box','woodDark',[L,.1,.12],[x,0,z],1,[0,r()*Math.PI,0]));}
 for(let i=0;i<Math.min(3,thatch.length);i++){const f=thatch[i],s=Math.min(1+r()*1.4,Math.min(hw,hd)*1.1),rad=Math.hypot(s,s*.8)/2,x=clamp(f.x,-hw+rad,hw-rad),z=clamp(f.z,-hd+rad,hd-rad);fallen.push(parts.length);parts.push(part('box','thatch',[s,.06,s*.8],[x,0,z],0,[0,r()*Math.PI,0]));}
 // Growth reclaims standing faces and floors; arid ruins drift with sand instead.
 const wallIdx=standing.filter(i=>kinds.length&&classify(parts[i])==='wall'&&parts[i].shape==='box'&&yawOnly(parts[i]));
 if(over>0&&climate==='arid'){for(let i=0;i<Math.round(over*5);i++){const w=wallIdx.length?parts[wallIdx[Math.floor(r()*wallIdx.length)]]:null,s=Math.min(1+r()*1.6,Math.min(hw,hd)*1.1),rad=Math.hypot(s,s*.8)/2,x=clamp(w?w.pos[0]+(r()-.5)*2:0,-hw+rad,hw-rad),z=clamp(w?w.pos[2]+(r()-.5)*2:0,-hd+rad,hd-rad);growth.push(parts.length);parts.push(part('wedge','plaster',[s,.25+r()*.2,s*.8],[x,0,z],1,[0,r()*Math.PI*2,0]));}}
 else if(over>0){
  for(let i=0;i<Math.round(over*9);i++){const w=wallIdx.length?parts[wallIdx[Math.floor(r()*wallIdx.length)]]:null,s=.45+r()*.5,x=clamp((w?w.pos[0]:0)+(r()-.5)*3,-hw+s/2,hw-s/2),z=clamp((w?w.pos[2]:0)+(r()-.5)*3,-hd+s/2,hd-s/2);growth.push(parts.length);parts.push(part('sphere',r()<.5?'foliage':'foliageDark',[s,s*.7,s],[x,0,z],1));}
  for(const wi of wallIdx){if(r()>over)continue;const w=parts[wi],along=w.size[0]>=w.size[2]?0:2,hv=Math.min(w.size[1]*.9,.4+r()*1.4),sgn=r()<.5?-1:1,face=(along===0?w.size[2]:w.size[0])/2+.03,len=w.size[along]*(.2+r()*.5),sh=(r()-.5)*(w.size[along]-len);
   const loc:[number,number,number]=along===0?[sh,0,sgn*face]:[sgn*face,0,sh],o=rotatePoint(loc,[0,yaw(w),0]);growth.push(parts.length);parts.push(part('box','foliageDark',along===0?[len,hv,.06]:[.06,hv,len],[w.pos[0]+o[0],w.pos[1],w.pos[2]+o[2]],0,w.rot?[0,w.rot[1],0]:undefined));}
  if(over>.5)for(let i=0;i<Math.round((over-.45)*4);i++){const s=.8+r()*.8,x=clamp((r()-.5)*src.footprint.w*.6,-hw+s/2,hw-s/2),z=clamp((r()-.5)*src.footprint.d*.6,-hd+s/2,hd-s/2),th=1+r()*1.2;
   if(standing.some(j=>{const b=partBounds(parts[j]);return x>b.minX-.3&&x<b.maxX+.3&&z>b.minZ-.3&&z<b.maxZ+.3;}))continue;growth.push(parts.length);parts.push(part('cylinder','trunk',[.12,th,.12],[x,0,z],1,undefined,5));growth.push(parts.length);parts.push(part('sphere','foliage',[s,s*.8,s],[x,th-.1,z],1));}
 }
 // A ruin always keeps a far-tier silhouette: promote the heaviest surviving part when none is core.
 if(parts.length&&!parts.some(p=>p.lod===2)){let bi=0;parts.forEach((p,i)=>{if(vol3(p)>vol3(parts[bi]))bi=i;});parts[bi]={...parts[bi],lod:2};}
 // Artifact slots: real places tied to what stands and what fell.
 const slots=artifactSlots(src,parts,standing,rubble,fallen,kinds,src.parts,r,d);
 const spec:BuildingSpec={family:'ruin:'+src.family,variantKey:`ruin|${src.variantKey??src.family}|${Math.round(d*100)}|${Math.round(over*100)}|${climate}|${opt.seed}`,footprint:{...src.footprint},parts:ensureTierSupport(parts,src.footprint),...(src.entry?{entry:src.entry}:{}),notes:{reference:`Ruined ${src.family}: roofs fallen, walls broken, growth reclaiming`}};
 return {...spec,ruin:{decay:d,overgrowth:over,climate,source:{family:src.family,variantKey:src.variantKey,parts:src.parts.length},standing,rubble,growth,fallen,stats:{...st,wallVolumeBefore:Math.round(st.wallVolumeBefore*100)/100,wallVolumeAfter:Math.round(st.wallVolumeAfter*100)/100},slots}};
}
const pick=<T,>(r:Rng,a:readonly T[]):T=>a[Math.floor(r()*a.length)%a.length];

function artifactSlots(src:RuinSource,parts:Part[],standing:number[],rubble:number[],fallen:number[],kinds:Kind[],orig:Part[],r:Rng,d:number):ArtifactSlot[]{
 const out:ArtifactSlot[]=[],hw=src.footprint.w/2,hd=src.footprint.d/2,wallBoxes=standing.filter(i=>{const p=parts[i];return partBounds(p).maxY>.5;}).map(i=>({i,b:partBounds(parts[i])}));
 const inWall=(x:number,z:number,m=.1)=>wallBoxes.some(({b})=>x>b.minX-m&&x<b.maxX+m&&z>b.minZ-m&&z<b.maxZ+m);
 const near=(x:number,z:number,s=.6)=>out.some(o=>Math.hypot(o.x-x,o.z-z)<s);
 const add=(s:Omit<ArtifactSlot,'id'>)=>{if(near(s.x,s.z)||Math.abs(s.x)>hw-.05||Math.abs(s.z)>hd-.05)return false;out.push({...s,id:`slot-${out.length+1}`});return true;};
 // Hearth: where a fire part stood; otherwise the clearest floor point near the middle.
 const fireIdx=orig.findIndex(p=>p.mat==='fire'),fire=fireIdx>=0?partBounds(orig[fireIdx]):undefined;
 let hx=fire?(fire.minX+fire.maxX)/2:0,hz=fire?(fire.minZ+fire.maxZ)/2:0;
 if(!fire||inWall(hx,hz)){let best=-1;for(let k=0;k<60;k++){const x=(r()-.5)*src.footprint.w*.6,z=(r()-.5)*src.footprint.d*.6;if(inWall(x,z,.3))continue;const c=Math.hypot(x,z);if(best<0||c<best){best=c;hx=x;hz=z;}}}
 if(!inWall(hx,hz))add({kind:'hearth',x:hx,y:0,z:hz,radius:.5,depthM:.1+r()*.2,access:'dug',rarity:0});
 // Threshold: just inside the entry, below door-stone rubble when any lies near.
 const e=src.entry;if(e){const x=e.x,z=Math.max(-hd+.2,Math.min(hd-.2,e.z-.6));if(!inWall(x,z,.05))add({kind:'threshold',x,y:0,z,radius:.45,depthM:.15+r()*.2,access:'dug',rarity:1});}
 // Under the largest rubble pile.
 const big=[...rubble].sort((a,b)=>vol3(parts[b])-vol3(parts[a]))[0];
 if(big!==undefined){const p=parts[big];add({kind:'rubble',x:p.pos[0],y:0,z:p.pos[2],radius:Math.max(.3,Math.max(p.size[0],p.size[2])*.6),depthM:0,access:'under-rubble',coveredBy:big,rarity:1});}
 const beamIdx=fallen.find(i=>parts[i].mat==='woodDark');if(beamIdx!==undefined){const p=parts[beamIdx];add({kind:'roofFall',x:p.pos[0],y:0,z:p.pos[2],radius:.5,depthM:0,access:'under-rubble',coveredBy:beamIdx,rarity:0});}
 // Dug floor pit in the clearest space.
 for(let k=0;k<40&&out.length<8;k++){const x=(r()-.5)*src.footprint.w*.7,z=(r()-.5)*src.footprint.d*.7;if(inWall(x,z,.5)||near(x,z,1))continue;if(add({kind:'floorPit',x,y:0,z,radius:.6,depthM:.4+r()*.5,access:'dug',rarity:2}))break;}
 // A niche inside the thickest standing wall that still stands at least a metre high.
 const thick=wallBoxes.filter(({i,b})=>b.maxY>=1&&Math.min(b.maxX-b.minX,b.maxZ-b.minZ)>=.5).sort((a,b)=>Math.min(b.b.maxX-b.b.minX,b.b.maxZ-b.b.minZ)-Math.min(a.b.maxX-a.b.minX,a.b.maxZ-a.b.minZ))[0];
 if(thick){const b=thick.b;add({kind:'wallNiche',x:(b.minX+b.maxX)/2,y:Math.min(.7,b.maxY*.5),z:(b.minZ+b.maxZ)/2,radius:.25,depthM:0,access:'in-wall',coveredBy:thick.i,rarity:2});}
 // Wonders and large buildings keep a foundation deposit under the first course; bigger sites get more slots.
 if(src.footprint.w*src.footprint.d>200||src.family.length&&['ringObservatory','cascadeGarden','crescentHarbor','millMarket','canyonCistern','assemblyCourt'].includes(src.family)){
  for(let k=0;k<40;k++){const w=wallBoxes[Math.floor(r()*Math.max(1,wallBoxes.length))];if(!w)break;const b=w.b,x=b.minX+(b.maxX-b.minX)*r(),z=b.minZ+(b.maxZ-b.minZ)*r();if(add({kind:'foundation',x,y:0,z,radius:.4,depthM:.3,access:'under-wall',coveredBy:w.i,rarity:2}))break;}
  for(let k=0;k<30&&out.length<8;k++){const x=(r()-.5)*src.footprint.w*.8,z=(r()-.5)*src.footprint.d*.8;if(inWall(x,z,.5)||near(x,z,1.2))continue;add({kind:'floorPit',x,y:0,z,radius:.7,depthM:.5,access:'dug',rarity:1});}}
 void kinds;void d;return out;
}
const vol3=(p:Part)=>p.size[0]*p.size[1]*p.size[2];
export const ruinTriangles=(s:RuinSpec,tier:0|1|2)=>s.parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier).reduce((n,p)=>n+partTriangles(p),0);
