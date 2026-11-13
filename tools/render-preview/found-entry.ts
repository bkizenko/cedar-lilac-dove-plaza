// Browser entry for tools/render-preview/foundations.mjs: the REAL Game + WorldView with a patch of terrain rewritten to a plane of a given slope,
// then hut / house / granary / workshop placed through the real placeBuilding (graded slope model, real siteRecord, real foundationProfile,
// real ground supports, real carved layer). One staged step per slope; the camera is the game's default (yaw 1.12, pitch .38, dist 58) unless overridden.
import {Game} from '@/game/sim';
import {WorldView} from '@/scene/world';
import {sampleWorldHeight} from '@/game/worldgen';
const w=window as any;
const dry=(g:Game,x:number,z:number)=>g.height(x,z)>g.waterAt(x,z)+.5;
function teach(g:Game){const t=g.tribe(0);t.age=Math.max(t.age,5);t.wood+=9999;t.stone+=9999;t.food+=999;const u=g.state.units.find(q=>q.team===0&&q.hp>0);if(u&&!(u as any).housingSkill)(u as any).housingSkill={version:1,sourceHouseId:0,originTeam:0,demonstratedAt:0};}
w.hwFound=async(o:{seed:number;slopes:number[];types:string[];dist:number;yaw:number;pitch:number;biome?:string})=>{
  const canvas=document.getElementById('c') as HTMLCanvasElement;
  const g=new Game();g.reset(o.seed,18,{size:1040,layout:'pangaea'} as any);g.enterIsland();(g as any).testMode=true;g.revealMap=true;g.updateVision(0);
  Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5,paused:true});teach(g);
  const camp=g.world.camps.find(c=>c.team===0)||g.world.camps[0];
  // a dry site with room: flattest 70 m square near the camp
  let best:{x:number;z:number;s:number}|null=null;
  for(let a=0;a<48;a++)for(let r=30;r<=150;r+=10){const x=camp.x+Math.cos(a/48*6.283)*r,z=camp.z+Math.sin(a/48*6.283)*r;let lo=1e9,hi=-1e9,wet=false;for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){const px=x+i*14,pz=z+j*14;if(!dry(g,px,pz))wet=true;const h=g.height(px,pz);lo=Math.min(lo,h);hi=Math.max(hi,h);}if(!wet&&(!best||hi-lo<best.s))best={x,z,s:hi-lo};}
  const C=best||{x:camp.x+40,z:camp.z,s:-1};
  const base=g.height(C.x,C.z),heights=g.world.heights,segs=Math.round(Math.sqrt(heights.length))-1,n=segs+1,cell=g.world.size/segs,orig=heights.slice();
  const view=new WorldView(canvas);view.setStyle('village');view.applyQuality('low');view.resize();
  const info:any={site:C,base};
  const stage=async(deg:number)=>{
    heights.set(orig);(g.world as any).bankTerrain=undefined;
    const t=Math.tan(deg*Math.PI/180),R=60;
    for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const x=(ix/segs-.5)*g.world.size,z=(iz/segs-.5)*g.world.size,dx=x-C.x,dz=z-C.z,d=Math.hypot(dx,dz);if(d>R+12)continue;const k=d<R?1:1-(d-R)/12,h=base+t*dx;heights[iz*n+ix]=h*k+orig[iz*n+ix]*(1-k);}
    g.state.buildings=g.state.buildings.filter(b=>b.type==='townhall'&&Math.hypot(b.x-C.x,b.z-C.z)>90);
    for(const tr of g.state.trees)if(Math.hypot(tr.x-C.x,tr.z-C.z)<48)tr.amount=0;
    const placed:any[]=[];let z=C.z-1.5*14;
    for(const label of o.types){const type=label==='granary'?'warehouse':label;const x=C.x;const issue=g.placementIssue(type as any,x,z,0);if(!issue&&g.placeBuilding(type as any,x,z,0)){const b=g.state.buildings.filter(q=>q.type===type&&q.hp>0).pop()!;b.build=1;b.plannedCost=undefined as any;placed.push({type:label,x:b.x,z:b.z,w:b.w,d:b.d,site:b.site||null});}else placed.push({type:label,x,z,issue});z+=14;}
    (g as any).terrainRevision=g.terrainRevision;view.rebuild(g);(view as any).cameraGround=null;
    view.look.set(C.x,base+1,C.z);view.dist=o.dist;view.yaw=o.yaw;view.pitch=o.pitch;view.updateCamera(0);
    for(let i=0;i<4;i++){view.sync(g,.05);view.render();await new Promise(r=>setTimeout(r,16));}
    return placed;
  };
  info.steps=o.slopes.map(String);
  w.hwStep=async(id:string)=>{const placed=await stage(+id);return {id,placed};};
  w.hwGame=g;w.hwView=view;
  return info;
};
w.hwLive=true;
void sampleWorldHeight;
