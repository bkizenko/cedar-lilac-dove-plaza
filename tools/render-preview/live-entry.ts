// Browser entry for tools/render-preview/live-shot.mjs: boots the real Game + WorldView on a canvas and renders staged shots.
import {Game} from '@/game/sim';
import {WorldView} from '@/scene/world';
import {BUILDINGS} from '@/game/constants';
import {watermillSite,windmillSite} from '@/game/waterWorks';
const w=window as any;
type Opts={shot:string;style:'current'|'optionH';seed:number;age:number;dist:number|null;yaw:number|null;pitch:number|null;frames:number;time:number|null;x:number|null;z:number|null};
const dry=(g:Game,x:number,z:number)=>g.height(x,z)>g.waterAt(x,z)+.02;
function findSite(g:Game,type:'watermill'|'windmill',step:number){
  for(let z=-460;z<=460;z+=step)for(let x=-460;x<=460;x+=step){if(!dry(g,x,z))continue;if(g.placementIssue(type,x,z,0))continue;return{x,z};}
  return null;
}
function finish(g:Game,type:string,x:number,z:number){
  if(!g.placeBuilding(type as any,x,z,0))return null;
  const b=g.state.buildings.filter(q=>q.type===type&&q.hp>0).pop()!;b.build=1;b.plannedCost=undefined as any;return b;
}
w.hwShot=async(o:Opts)=>{
  const canvas=document.getElementById('c') as HTMLCanvasElement;
  const g=new Game();g.reset(o.seed,18,{size:1040,layout:'pangaea'} as any);g.enterIsland();(g as any).testMode=true;g.revealMap=true;g.updateVision(0);
  Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5,paused:true});
  const t=g.tribe(0);t.wood+=9999;t.stone+=9999;t.food+=999;t.age=Math.max(t.age,o.age);
  const info:any={};let focus:{x:number;z:number}|null=null;
  if(o.shot==='watermill'||o.shot==='all'){const s=findSite(g,'watermill',12);if(s){const b=finish(g,'watermill',s.x,s.z);if(b){focus={x:b.x,z:b.z};info.mill={x:b.x,z:b.z,site:watermillSite(g,b.x,b.z)};}}}
  if(o.shot==='windmill'||o.shot==='all'){const s=findSite(g,'windmill',20);if(s){const b=finish(g,'windmill',s.x,s.z);if(b){focus=focus&&o.shot==='all'?focus:{x:b.x,z:b.z};info.wind={x:b.x,z:b.z,site:windmillSite(g,b.x,b.z)};}}}
  if(o.shot==='village'){
    const camp=g.world.camps.find(c=>c.team===0)||g.world.camps[0],types=['townhall','hut','house','house','hut','warehouse','workshop','forge','kiln','potter','oven','hearth','smokehouse','grindingStone','tanner','tailor','butcher','dryrack','fibreWorkshop','threshingFloor','temple','market','barracks','watchtower','stables','keep','university','well','cistern','lumber','quarry','cairn','grove'];
    focus={x:camp.x,z:camp.z};const placed:string[]=[];let n=0;
    for(const type of types){let ok=false;for(let k=n;k<n+80&&!ok;k++){const a=k*2.399,r=7+Math.sqrt(k)*5.2,x=camp.x+Math.cos(a)*r,z=camp.z+Math.sin(a)*r;if(!dry(g,x,z)||g.placementIssue(type as any,x,z,0))continue;const b=finish(g,type,x,z);if(b){ok=true;n=k+1;placed.push(type);}}}
    info.placed=placed;
  }
  if(o.x!=null&&o.z!=null)focus={x:o.x,z:o.z};
  if(focus)for(const tr of g.state.trees){if(Math.hypot(tr.x-focus.x,tr.z-focus.z)<(o.shot==='village'?9:22))tr.amount=0;}
  const view=new WorldView(canvas);
  view.setRenderStyle(o.style==='optionH'?'carved':'current');
  view.applyQuality('low');
  view.resize();
  view.rebuild(g);
  (view as any).cameraGround=null;// review shots must frame the subject exactly; the gameplay camera collision would pull it away
  if(focus)view.look.set(focus.x,g.height(focus.x,focus.z)+1,focus.z);
  view.dist=o.dist??34;view.yaw=o.yaw??.9;view.pitch=o.pitch??.5;
  view.updateCamera(0);
  for(let i=0;i<o.frames;i++){if(o.time!=null)g.state.time=o.time+i*.05;view.sync(g,.05);view.render();await new Promise(r=>setTimeout(r,16));}
  info.style=view.getRenderStyle();info.cam=[view.camera.position.x,view.camera.position.y,view.camera.position.z].map(v=>+v.toFixed(1));info.look=[view.look.x,view.look.y,view.look.z].map(v=>+v.toFixed(1));info.dist=view.dist;info.tris=view.renderer.info.render.triangles;info.calls=view.renderer.info.render.calls;
  void BUILDINGS;
  return info;
};
w.hwLive=true;
