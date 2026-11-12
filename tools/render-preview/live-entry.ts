// Browser entry for tools/render-preview/live-shot.mjs: boots the real Game + WorldView on a canvas and renders staged shots.
import {Game} from '@/game/sim';
import {WorldView} from '@/scene/world';
import {BUILDINGS} from '@/game/constants';
import {watermillSite,windmillSite} from '@/game/waterWorks';
import {skinById} from '@/scene/civSkin';
import {skinOfTeam,buildSkins} from '@/game/skinState';
import {generateCiv} from '@/game/civGenerator';
import {skinFromCiv} from '@/scene/civSkin';
const w=window as any;
type Opts={shot:string;style:'village'|'current'|'optionH';seed:number;age:number;dist:number|null;yaw:number|null;pitch:number|null;frames:number;time:number|null;x:number|null;z:number|null;skins?:string[];skin?:string;seeds?:number[];family?:string};
const dry=(g:Game,x:number,z:number)=>g.height(x,z)>g.waterAt(x,z)+.02;
function findSite(g:Game,type:'watermill'|'windmill',step:number){
  for(let z=-460;z<=460;z+=step)for(let x=-460;x<=460;x+=step){if(!dry(g,x,z))continue;if(g.placementIssue(type,x,z,0))continue;return{x,z};}
  return null;
}
function finish(g:Game,type:string,x:number,z:number){
  if(!g.placeBuilding(type as any,x,z,0))return null;
  const b=g.state.buildings.filter(q=>q.type===type&&q.hp>0).pop()!;b.build=1;b.plannedCost=undefined as any;return b;
}
/** flattest dry w x d plot within `radius` of a point (height spread over a 5x5 sample grid), for staging a wonder */
function flatSite(g:Game,cx:number,cz:number,w:number,radius:number){
  let best:{x:number;z:number;spread:number}|null=null;
  for(let a=0;a<48;a++)for(let r=18;r<=radius;r+=6){const x=cx+Math.cos(a/48*Math.PI*2)*r,z=cz+Math.sin(a/48*Math.PI*2)*r;let lo=1e9,hi=-1e9,wet=false;
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const px=x+i*w/4,pz=z+j*w/4;if(!dry(g,px,pz)){wet=true;}const h=g.height(px,pz);lo=Math.min(lo,h);hi=Math.max(hi,h);}
    if(!wet&&(!best||hi-lo<best.spread))best={x,z,spread:hi-lo};}
  return best;
}
const SKIN_VILLAGE=['townhall','hut','house','house','hut','house','workshop','forge','hearth','temple','market','well','university','barracks','watchtower','stables','oven'];
/** Staging rules the live game enforces: 'house' needs a unit that has demonstrated housing (housingAdoptionIssue), and every placement
 * needs its tribe at the building's age (university is age 5) plus its cost. Without this the harness silently dropped houses and the academy. */
function teach(g:Game,team:number){
  const t=g.tribe(team);t.age=Math.max(t.age,5);t.wood+=9999;t.stone+=9999;t.food+=999;
  const u=g.state.units.find(q=>q.team===team&&q.hp>0);if(u&&!(u as any).housingSkill)(u as any).housingSkill={version:1,sourceHouseId:0,originTeam:team,demonstratedAt:0};
}
/** place a small village of `types` around a camp for `team` (test-only: ownership is rewritten after placement so any team can be staged) */
function settle(g:Game,camp:{x:number;z:number},team:number,types:string[],tight=1){
  const placed:string[]=[];let n=0;teach(g,team);
  for(const type of types){let ok=false;for(let k=n;k<n+90&&!ok;k++){const a=k*2.399,r=(6+Math.sqrt(k)*5.4)*tight,x=camp.x+Math.cos(a)*r,z=camp.z+Math.sin(a)*r;if(!dry(g,x,z)||g.placementIssue(type as any,x,z,0))continue;
    if(!g.placeBuilding(type as any,x,z,0))continue;const b=g.state.buildings.filter(q=>q.type===type&&q.hp>0).pop()!;b.build=1;b.plannedCost=undefined as any;b.team=team;ok=true;n=k+1;placed.push(type);}}
  return placed;
}
const shotImages=async(view:WorldView,g:Game,frames:number)=>{for(let i=0;i<frames;i++){view.sync(g,.05);view.render();await new Promise(r=>setTimeout(r,16));}};
w.hwShot=async(o:Opts)=>{
  const canvas=document.getElementById('c') as HTMLCanvasElement;
  const g=new Game();g.reset(o.seed,18,{size:1040,layout:'pangaea'} as any);g.enterIsland();(g as any).testMode=true;g.revealMap=true;g.updateVision(0);
  Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5,paused:true});
  const t=g.tribe(0);t.wood+=9999;t.stone+=9999;t.food+=999;t.age=Math.max(t.age,o.age);
  const info:any={};let focus:{x:number;z:number}|null=null;
  if(o.shot==='watermill'||o.shot==='all'){const s=findSite(g,'watermill',12);if(s){const b=finish(g,'watermill',s.x,s.z);if(b){focus={x:b.x,z:b.z};info.mill={x:b.x,z:b.z,site:watermillSite(g,b.x,b.z)};}}}
  if(o.shot==='windmill'||o.shot==='all'){const s=findSite(g,'windmill',20);if(s){const b=finish(g,'windmill',s.x,s.z);if(b){focus=focus&&o.shot==='all'?focus:{x:b.x,z:b.z};info.wind={x:b.x,z:b.z,site:windmillSite(g,b.x,b.z)};}}}
  if(o.shot==='village'){
    teach(g,0);const camp=g.world.camps.find(c=>c.team===0)||g.world.camps[0],types=['townhall','hut','house','house','hut','warehouse','workshop','forge','kiln','potter','oven','hearth','smokehouse','grindingStone','tanner','tailor','butcher','dryrack','fibreWorkshop','threshingFloor','temple','market','barracks','watchtower','stables','keep','university','well','cistern','lumber','quarry','cairn','grove'];
    focus={x:camp.x,z:camp.z};const placed:string[]=[];let n=0;
    for(const type of types){let ok=false;for(let k=n;k<n+80&&!ok;k++){const a=k*2.399,r=7+Math.sqrt(k)*5.2,x=camp.x+Math.cos(a)*r,z=camp.z+Math.sin(a)*r;if(!dry(g,x,z)||g.placementIssue(type as any,x,z,0))continue;const b=finish(g,type,x,z);if(b){ok=true;n=k+1;placed.push(type);}}}
    info.placed=placed;
  }
  if(o.shot==='defence'){// a palisade run with a gate and a stone-wall corner beside the camp, plus a warehouse
    teach(g,0);const camp=g.world.camps.find(c=>c.team===0)||g.world.camps[0];focus={x:camp.x,z:camp.z};const placed:string[]=[];
    const cx=Math.round(camp.x/2)*2+14,cz=Math.round(camp.z/2)*2;focus={x:cx+6,z:cz+4};
    const run:[string,number,number][]=[['palisade',0,0],['palisade',4,0],['gate',8,0],['palisade',12,0],['stonewall',16,0],['stonewall',16,4],['stonewall',16,8],['palisade',0,4],['palisade',0,8]];
    for(const [t,dx,dz] of run){const b=finish(g,t as any,cx+dx,cz+dz);if(b)placed.push(t);}
    for(const [t,dx,dz] of [['warehouse',-8,-14],['dock',-20,6]] as [string,number,number][]){const b=finish(g,t as any,cx+dx,cz+dz);if(b)placed.push(t);}
    info.placed=placed;
  }
  if(o.shot==='skins'){// one village, the player's slot wears each requested skin in turn (contact sheet)
    const camp=g.world.camps.find(c=>c.team===0)||g.world.camps[0];focus={x:camp.x,z:camp.z};info.placed=settle(g,camp,0,SKIN_VILLAGE,.9);
  }
  if(o.shot==='wonders'){// one wonder on open ground near the player camp; the player's slot wears each requested skin in turn
    const camp=g.world.camps.find(c=>c.team===0)||g.world.camps[0],site=flatSite(g,camp.x,camp.z,34,90)||{x:camp.x+24,z:camp.z,spread:-1};focus={x:site.x,z:site.z};info.site=site;
    (g.state as any).wonders=[{id:1,team:0,family:o.family||'assembly',x:focus.x,z:focus.z,w:34,d:34,yaw:0,seed:o.seed,progress:1,era:Math.max(3,o.age),wealth:.7}];
    info.placed=settle(g,{x:focus.x-34,z:focus.z},0,['townhall','hut','hut','market','well'],.8);
  }
  if(o.shot==='societies'){// every society of the game, each in its own camp wearing the skin the game gave it
    info.slots=[];const camps=g.world.camps;for(let team=0;team<4;team++){const camp=camps.find(c=>c.team===team);if(!camp)continue;g.tribe(team).age=Math.max(g.tribe(team).age,o.age);info.slots.push({team,skin:skinOfTeam(g.state,team)?.id,placed:settle(g,camp,team,SKIN_VILLAGE,.85).length});}
    focus={x:camps[0].x,z:camps[0].z};
  }
  if(o.x!=null&&o.z!=null)focus={x:o.x,z:o.z};
  if(o.shot==='societies')for(const c of g.world.camps)for(const tr of g.state.trees){if(Math.hypot(tr.x-c.x,tr.z-c.z)<30)tr.amount=0;}
  if(focus&&o.shot!=='societies')for(const tr of g.state.trees){if(Math.hypot(tr.x-focus.x,tr.z-focus.z)<(o.shot==='village'?9:o.shot==='skins'||o.shot==='wonders'?34:22))tr.amount=0;}
  const view=new WorldView(canvas);
  view.setStyle(o.style);
  view.applyQuality('low');
  view.resize();
  view.rebuild(g);
  (view as any).cameraGround=null;// review shots must frame the subject exactly; the gameplay camera collision would pull it away
  if(focus)view.look.set(focus.x,g.height(focus.x,focus.z)+1,focus.z);
  view.dist=o.dist??34;view.yaw=o.yaw??.9;view.pitch=o.pitch??.5;
  view.updateCamera(0);
  g.state.paused=false;
  if(o.shot==='skins'||o.shot==='wonders'||o.shot==='societies'){// staged: node calls hwStep per tile and screenshots the canvas (toDataURL of a non-preserved drawing buffer is blank)
    info.steps=o.shot!=='societies'?o.skins:g.world.camps.filter(c=>c.team<4).map(c=>String(c.team));
    w.hwStep=async(id:string)=>{
      if(o.shot!=='societies'){const sk=id.startsWith('gen:')?skinFromCiv(generateCiv(+id.split(':')[2],+id.split(':')[3],id.split(':')[1] as any)):skinById(id);if(!sk)return null;g.state.skins!.slots['0']=sk;await shotImages(view,g,4);return {id:sk.id,name:sk.name,mode:sk.mode,grammar:sk.grammar};}
      const c=g.world.camps.find(q=>q.team===+id)!;view.look.set(c.x,g.height(c.x,c.z)+1,c.z);view.updateCamera(0);const sk=skinOfTeam(g.state,c.team);await shotImages(view,g,4);return {id:sk?.id??'neutral',name:sk?.name??'Village',mode:sk?.mode??'neutral',grammar:sk?.grammar,team:c.team};
    };
    return info;
  }
  for(let i=0;i<o.frames;i++){if(o.time!=null)g.state.time=o.time+i*.05;view.sync(g,.05);view.render();await new Promise(r=>setTimeout(r,16));}
  {const L=(view as any).carvedLayer,rs=L?[...L.pickSources().keys()].filter((m:any)=>m.name.includes('~')):[];const mm=rs[0]?new (rs[0].matrix.constructor)():null;if(mm)rs[0].getMatrixAt(0,mm);info.rotors=rs.length;info.rotorM=mm?Array.from(mm.elements as number[]).slice(0,3).map(v=>+v.toFixed(3)):null;info.paused=g.state.paused;}
  info.wonders=(view as any).wonderLayer?.stats();info.style=view.getStyle();info.cam=[view.camera.position.x,view.camera.position.y,view.camera.position.z].map(v=>+v.toFixed(1));info.look=[view.look.x,view.look.y,view.look.z].map(v=>+v.toFixed(1));info.dist=view.dist;info.tris=view.renderer.info.render.triangles;info.calls=view.renderer.info.render.calls;
  void BUILDINGS;
  return info;
};
w.hwLive=true;
