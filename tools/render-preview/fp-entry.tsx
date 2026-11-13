/** Browser entry for the REAL first-person frames (bundled by fp.mjs with esbuild; real three.js, SwiftShader headless).
 * Same game, same art, same HUD: the real Game, the real WorldView (painterly terrain, botanical trees, village buildings in a civ skin, people v2 with items,
 * draw distance, season and light) and the real HudHearth, drawn over the frame the same way the app draws it. The ONLY thing that differs from play is the
 * camera: it is set to an adult eye (about 1.55 m) after the orbit rig has placed the sun and the shadow frustum. Nothing here is wired into src/. */
import * as THREE from 'three';
import {createElement as h,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Game} from '@/game/sim';
import {WorldView} from '@/scene/world';
import {wearTrail} from '@/game/trails';
import {skinById} from '@/scene/civSkin';
import {HudHearth} from '@/ui/hearth/HudHearth';
import {IconBtn,Stat,cx} from '@/ui/hearth/kit';
import {applyEngineReadQuery} from '@/game/engineReadModels';
import {applyEngineCommand} from '@/game/engineDispatch';
import {Users,Wheat,Droplets,MessageCircle,X,Eye} from 'lucide-react';

type V3=[number,number,number];
type Shot={name:string;eye:[number,number];yaw:number;pitch?:number;fov?:number;eyeH?:number;near?:number;hour?:number;season?:'spring'|'summer'|'autumn'|'winter';
 select?:'steward'|'farmer'|'visitor'|'hall'|'none';report?:{who:string;role:string;basis:string;line:string;replies:string[];stat?:string;tone?:'bad'|'warn'|'good'};
 hud?:boolean;drawDistance?:'low'|'medium'|'high'|'ultra';shadowHalf?:number;fogScale?:number;exposure?:number;hideSky?:boolean;pins?:boolean;staged?:boolean;ownEye?:boolean;shadows?:boolean;quality?:'low'|'med'|'high';orbit?:{x:number;z:number;dist:number;pitch:number;yaw:number}};
const w=window as any;
const dry=(g:Game,x:number,z:number)=>g.height(x,z)>g.waterAt(x,z)+.05;
let G:Game,V:WorldView,canvas:HTMLCanvasElement,staged:any={};

/** real placement; tries a few metres around the wanted spot so the staging never silently drops a building */
function put(g:Game,type:string,x:number,z:number,team=0,reach=1.1){
 for(let k=0;k<120;k++){const a=k*2.399,r=k===0?0:1.2+Math.sqrt(k)*reach,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;if(!dry(g,px,pz)||g.placementIssue(type as any,px,pz,0))continue;
  if(!g.placeBuilding(type as any,px,pz,0))continue;const b=g.state.buildings.filter(q=>q.type===type&&q.hp>0).pop()!;b.build=1;(b as any).plannedCost=undefined;b.hp=b.maxHp;b.team=team;return b;}
 console.warn('placement failed',type,x,z);return null;
}
function teach(g:Game,team:number){const t=g.tribe(team);t.age=Math.max(t.age,5);t.wood+=9999;t.stone+=9999;t.food+=999;const u=g.state.units.find(q=>q.team===team&&q.hp>0);if(u&&!(u as any).housingSkill)(u as any).housingSkill={version:1,sourceHouseId:0,originTeam:team,demonstratedAt:0};}
const terrainSlope=(g:Game,x:number,z:number,r=14)=>{let lo=1e9,hi=-1e9;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const hh=g.height(x+i*r/2,z+j*r/2);lo=Math.min(lo,hh);hi=Math.max(hi,hh);}return hi-lo;};

w.fpBoot=async(o:{seed:number;width:number;height:number;skin?:string;quality?:'low'|'med'|'high';version?:number})=>{
 canvas=document.getElementById('c') as HTMLCanvasElement;canvas.width=o.width;canvas.height=o.height;canvas.style.cssText=`width:${o.width}px;height:${o.height}px;display:block;position:absolute;left:0;top:0`;
 G=new Game();G.testMode=true;G.revealMap=true;G.reset(o.seed,o.version??18,{size:1040,layout:'pangaea'} as any);G.enterIsland();G.updateVision(0);
 Object.assign(G.state,{weather:'clear',weatherT:1e5,raidT:1e5,paused:true});
 if(o.skin){const sk=skinById(o.skin);if(sk)G.state.skins!.slots['0']=sk;}
 teach(G,0);Object.assign(G.tribe(0),{seeds:60,cultivated:['grain','pulses','tubers']});
 // find the flattest spot by the player's camp for a straight street running along +z; the hall closes it at the far (-z) end; its door faces +z, down the street
 const camp=G.world.camps.find(c=>c.team===0)||G.world.camps[0];
 let best={x:camp.x,z:camp.z,s:1e9};for(let a=0;a<24;a++)for(let r=0;r<=60;r+=10){const x=camp.x+Math.cos(a/24*6.283)*r,z=camp.z+Math.sin(a/24*6.283)*r;const s=terrainSlope(G,x,z+6,70);if(dry(G,x,z)&&s<best.s)best={x,z,s};}
 const C=best,st:any={camp,C,placed:[] as any[]};
 const rows:[string,number,number][]=[['house',-9,-26],['hut',9,-24],['house',-9,-12],['workshop',9,-10],['hut',-9,2],['house',9,4],['market',-10,16],['hut',9,17],['hearth',-5,-3],['well',3,-6]];
 for(const [t,dx,dz] of rows){const b=put(G,t,C.x+dx,C.z+dz);if(b)st.placed.push([t,Math.round(b.x),Math.round(b.z)]);}
 const hall=put(G,'townhall',C.x,C.z-36);st.hall=hall?{x:hall.x,z:hall.z,w:(hall as any).w,d:(hall as any).d}:null;
 const well=G.state.buildings.find(b=>b.type==='well');st.well=well?{x:well.x,z:well.z}:null;
 // two crop plots beside the street, ripening grain and young pulses
 const farmAt=(x:number,z:number,kind:'grain'|'pulses'|'tubers',stage:string,ww:number,dd:number)=>{const b=put(G,'farm',x,z,0,2.4) as any;if(!b)return null;b.w=ww;b.d=dd;b.cropType=kind;const S:Record<string,number[]>={young:[.45,.2,0,1],mature:[1,.7,0,1],ripe:[1,1,1,1]};const [planted,tended,ripened,remaining]=S[stage];b.crop={kind,planted,tended,ripened:!!ripened,remaining};return b;};
 const f1=farmAt(C.x+30,C.z-6,'grain','ripe',22,16),f2=farmAt(C.x+34,C.z+16,'pulses','mature',18,14);st.farms=[f1,f2].filter(Boolean).map((f:any)=>({id:f.id,x:f.x,z:f.z}));
 // a worn street between the houses and a track to the plots
 for(const [a,b] of [[[C.x,C.z-30],[C.x,C.z+30]],[[C.x+4,C.z-2],[C.x+26,C.z-4]]] as [number,number][][]){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/1.5);for(let rep=0;rep<3;rep++)for(let i=0;i<=n;i++)wearTrail(G,a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,(b[0]-a[0])/len*1.5,(b[1]-a[1])/len*1.5);}
 // clear trees from the street itself (the sim would have felled them); keep every other tree where the generator put it
 let cleared=0;for(const tr of G.state.trees){if(Math.abs(tr.x-C.x)<14&&tr.z>C.z-44&&tr.z<C.z+34){tr.amount=0;cleared++;}if(Math.hypot(tr.x-(C.x+32),tr.z-(C.z+5))<22){tr.amount=0;cleared++;}}st.cleared=cleared;
 Object.assign(G.tribe(0),{food:420,wood:180,stone:70});
 V=new WorldView(canvas);V.applyQuality(o.quality??'med');V.resize();V.rebuild(G);(V as any).cameraGround=null;
 // who is who: real units, moved. Adult workers of team 0 stand in for steward and farmer; a team-1 unit is the visitor.
 const mine=G.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker');st.mine=mine.length;
 const other=G.state.units.filter(u=>u.team!==0&&u.hp>0);st.other=other.length;st.otherTeams=[...new Set(other.map(u=>u.team))];
 staged=st;w.__game=G;w.__view=V;
 // river nearest the camp, for the long view
 let rv:any=null,rd=1e9;for(const r of (G.world as any).rivers||[])for(let i=0;i<r.pts.length;i++){const p=r.pts[i],d=Math.hypot(p.x-C.x,p.z-C.z);if(d<rd){rd=d;rv={r,i,p};}}
 st.river=rv?{x:Math.round(rv.p.x),z:Math.round(rv.p.z),d:Math.round(rd),n:rv.r.pts.length,i:rv.i,w:rv.r.w}:null;
 return {C,camp:[camp.x,camp.z],placed:st.placed,hall:st.hall,farms:st.farms,mine:st.mine,other:st.other,otherTeams:st.otherTeams,river:st.river,cleared,size:G.world.size,riverPts:rv?rv.r.pts.map((p:any)=>[Math.round(p.x),Math.round(p.z)]):null,skin:G.state.skins?.slots['0']?.id,trees:G.state.trees.length};
};

/** put a real unit somewhere, standing or mid-stride, facing a direction */
function stand(u:any,x:number,z:number,face:number,walk=false){u.x=x;u.z=z;u.y=G.height(x,z);u.facing=face;u.vx=walk?Math.sin(face)*1.5:0;u.vz=walk?Math.cos(face)*1.5:0;u.stride=walk?1.2:0;u.order='idle';u.target=null;u.path=[];u.selected=false;u.hunger=0;u.jobLock=false;delete u.shelterId;}
const people:{steward?:any;farmer?:any;visitor?:any;crowd:any[]}={crowd:[]};
w.fpStage=(spec:{eye:[number,number];yaw:number;case:'a'|'b'|'c'|'d'})=>{
 const mine=G.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker') as any[];
 const [ex,ez]=spec.eye,fx=Math.sin(spec.yaw),fz=Math.cos(spec.yaw),rx=Math.cos(spec.yaw),rz=-Math.sin(spec.yaw);
 for(const u of G.state.units){(u as any).selected=false;(u as any).thirstSeconds=0;}G.state.selBld=null as any;
 mine.forEach((u,i)=>stand(u,staged.C.x+(i%2?-1:1)*(10+i),staged.C.z-30-i*3,0));// everyone else parked down the street, out of frame
 const at=(f:number,r:number)=>[ex+fx*f+rx*r,ez+fz*f+rz*r] as [number,number];
 const pick=(i:number)=>mine[i%mine.length];
 const info:any={};
 if(spec.case==='a'){
  const s=pick(0);const [x,z]=at(4.2,.3);stand(s,x,z,spec.yaw+Math.PI,true);s.selected=true;people.steward=s;
  const p1=pick(1) as any;{const [x2,z2]=at(11,-3.2);stand(p1,x2,z2,spec.yaw+Math.PI/2,true);p1.thirstSeconds=520;}
  const p2=pick(2) as any;{const [x2,z2]=at(15,3.2);stand(p2,x2,z2,spec.yaw+Math.PI*1.2,false);p2.carry=6;p2.thirstSeconds=520;}// the two the steward is talking about are really dry: the pin and the card read the same state
  const p3=pick(3);{const [x2,z2]=at(24,-.5);stand(p3,x2,z2,spec.yaw,true);}
 }
 if(spec.case==='b'){
  const f=staged.farms[0],s=pick(0) as any;const [x,z]=at(3.4,-.6);stand(s,x,z,Math.atan2(f.x-x,f.z-z)+.1);s.farmTool='stoneHoe';s.order='gather';s.node=G.state.buildings.find(b=>b.id===f.id);s.selected=true;s.carry=0;people.farmer=s;
  const s2=pick(1) as any;{const [x2,z2]=at(9,5);stand(s2,x2,z2,Math.atan2(f.x-x2,f.z-z2)+.4);s2.farmTool='stoneHoe';s2.order='gather';s2.node=s.node;}
  const s3=pick(2) as any;{const [x2,z2]=at(13,-6);stand(s3,x2,z2,Math.atan2(f.x-x2,f.z-z2)-.3);s3.farmTool='stoneHoe';s3.order='gather';s3.node=s.node;}
 }
 if(spec.case==='c'){
  const other=G.state.units.filter(u=>u.team!==0&&u.hp>0) as any[];const v=other[0]||pick(0);const [x,z]=at(3.5,-1.2);stand(v,x,z,spec.yaw+Math.PI,false);(v as any).tradeCargoPending=true;(v as any).carry=4;(v as any).visible=true;people.visitor=v;info.visitorTeam=v.team;info.visitorType=v.type;
  const g1=pick(0);{const [x2,z2]=at(5,3.4);stand(g1,x2,z2,spec.yaw+2.2,false);}
  const g2=pick(1);{const [x2,z2]=at(8.5,-5);stand(g2,x2,z2,spec.yaw+Math.PI*.5,true);}
 }
 if(spec.case==='d'){
  const p=pick(0);const [x,z]=at(9,-6);stand(p,x,z,spec.yaw+1.6,false);(p as any).carry=0;
 }
 return info;
};

/** the real frame: orbit rig first (sun, shadow frustum, culls follow `look`), then the eye */
w.fpShot=async(S:Shot&{width:number;height:number;luminanceOnly?:boolean})=>{
 const g=G,view=V;(g as any).testMode=true;
 const hour=S.hour??10.5,season=S.season??'summer',winter=season==='winter';
 {const gg=g as any;gg.dayPhase=()=>hour/24;gg.daylight=()=>winter?{sunrise:7.9,sunset:16.3,hours:8.4}:{sunrise:5.7,sunset:19.7,hours:14};gg.isNight=()=>{const d=winter?[7.9,16.3]:[5.7,19.7];return hour<d[0]||hour>=d[1];};
  const mix={spring:{spring:1,summer:0,autumn:0,winter:0,snow:0},summer:{spring:0,summer:1,autumn:0,winter:0,snow:0},autumn:{spring:0,summer:0,autumn:1,winter:0,snow:0},winter:{spring:0,summer:0,autumn:0,winter:1,snow:.9}}[season];gg.seasonMix=()=>({name:season,yearFrac:0,...mix});view.seasonDirty();}
 if(S.shadows!==undefined||S.quality){if(S.shadows!==undefined)view.shadowsEnabled=S.shadows;view.applyQuality(S.quality??'med');}
 view.renderer.setSize(S.width,S.height,false);view.renderer.setPixelRatio(1);view.camera.aspect=S.width/S.height;view.composer?.setSize(S.width,S.height);
 if(view.fowMesh)view.fowMesh.visible=false;
 view.setDrawDistance(S.drawDistance??'medium');
 if(S.orbit){const o=S.orbit;view.look.set(o.x,g.height(o.x,o.z),o.z);view.yaw=o.yaw;view.pitch=o.pitch;view.dist=o.dist;view.camera.fov=45;view.camera.near=.5;view.camera.updateProjectionMatrix();view.updateCamera(0);for(let i=0;i<4;i++){view.sync(g,.5);}view.sync(g,5);view.render();return {orbit:true};}
 const [ex,ez]=S.eye,gy=g.height(ex,ez),eyeH=S.eyeH??1.55,pitch=S.pitch??-.04;
 // orbit side: look at the ground under the eye so the sun, the shadow box and the tree/building culls are centred on the avatar
 view.look.set(ex,gy,ez);view.yaw=S.yaw;view.pitch=1.2;view.dist=14;view.updateCamera(0);
 const eye=new THREE.Vector3(ex,gy+eyeH,ez),dir=new THREE.Vector3(-Math.sin(S.yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(S.yaw)*Math.cos(pitch));
 // NOTE the orbit yaw convention: the orbit camera sits at +sin(yaw),+cos(yaw) from `look` and looks toward -sin,-cos; `fpShot` yaw therefore means "the direction you LOOK" = yaw+PI of the orbit.
 const lookDir=(y:number)=>new THREE.Vector3(Math.sin(y)*Math.cos(pitch),Math.sin(pitch),Math.cos(y)*Math.cos(pitch));void dir;
 const aim=()=>{view.camera.position.copy(eye);view.camera.near=S.near??.1;view.camera.fov=S.fov??60;view.camera.up.set(0,1,0);view.camera.lookAt(eye.clone().add(lookDir(S.yaw)));view.camera.updateProjectionMatrix();view.camera.updateMatrixWorld(true);};
 aim();
 if(S.shadowHalf){const c=view.sun.shadow.camera;c.left=-S.shadowHalf;c.right=S.shadowHalf;c.top=S.shadowHalf;c.bottom=-S.shadowHalf;c.updateProjectionMatrix();}
 for(let i=0;i<4;i++){aim();view.sync(g,.5);}
 aim();view.sync(g,5);aim();view.sync(g,5);
 for(let k=0;k<600;k++){const bs=(view as any).biomeScene;if(!bs?.lastFiller||bs.lastFiller.deferred===0)break;aim();view.sync(g,5);}
 aim();
 if(S.fogScale!==undefined){const f=view.scene.fog as THREE.FogExp2;if(f)f.density*=S.fogScale;}
 if(S.exposure!==undefined)view.renderer.toneMappingExposure=S.exposure;
 view.render();
 const info=view.renderer.info;
 const cp=view.camera.position;
 return {eye:[+cp.x.toFixed(1),+cp.y.toFixed(2),+cp.z.toFixed(1)],ground:+gy.toFixed(2),near:view.camera.near,far:Math.round(view.camera.far),fogDensity:(view.scene.fog as any)?.density,exposure:view.renderer.toneMappingExposure,tone:view.renderer.toneMapping,calls:info.render.calls,tris:info.render.triangles,sun:[view.sun.intensity,view.sun.shadow.mapSize.x,view.sun.shadow.camera.right,view.sun.castShadow,view.renderer.shadowMap.enabled,view.renderer.shadowMap.type],dd:S.drawDistance??'medium',bands:(view as any).getDrawBands?.()};
};

/** report card: built only from the real kit (IconBtn, Stat) and the real Hearth size tokens (--hw-hit 48px, --hw-fs 16px, 26px icons); the copy is the design doc's own steward example */
function ReportCard({r,onClose}:{r:NonNullable<Shot['report']>;onClose?:()=>void}){
 return h('section',{className:'hw-sel hw-report','aria-label':`${r.who} reports`,style:{position:'absolute',left:'14px',bottom:'14px',width:'min(476px,46vw)',pointerEvents:'auto'}},
  h('header',{className:'hw-sel-head'},h('span',{className:'hw-medal'},h(Users,{size:40})),
   h('div',{className:'hw-sel-title'},h('h2',null,r.who),h('span',{style:{fontSize:'var(--hw-fs-s)',color:'var(--hw-dim)',fontWeight:650}},r.role+' · '+r.basis)),
   h(IconBtn,{label:'Later',tip:'Dismiss for now',onClick:()=>onClose?.(),small:true},h(X,{size:24}))),
  h('p',{className:'hw-info',style:{fontSize:'var(--hw-fs-m)',margin:'2px 4px 6px',lineHeight:1.35,color:'var(--hw-text)'}},'“'+r.line+'”'),
  r.stat?h('div',{className:'hw-sel-meta'},h(Stat,{icon:h(Droplets,{size:26}),value:r.stat,label:'Water',tone:r.tone||'warn',className:'hw-chip'})):null,
  h('div',{className:'hw-actions'},...r.replies.map((t,i)=>h('button',{key:t,type:'button',className:i===0?'hw-primary':'hw-btn-wide'},i===0?h(Droplets,{size:26}):i===1?h(Eye,{size:26}):h(MessageCircle,{size:26}),t))));
}
void useState;void Wheat;void cx;

w.fpHud=async(S:Shot)=>{
 const g=G,mine=g.state.units.filter(u=>u.team===0&&u.hp>0);
 g.state.paused=false;g.state.banner='';g.state.bannerT=0;
 const hud:any={...g.snapshot(),started:true,awaitingStart:false,founding:false};
 if(S.select==='hall'){const b=g.state.buildings.find(q=>q.type==='townhall');if(b){for(const u of g.state.units)(u as any).selected=false;b.selected=true as any;g.state.selBld=b;}}
 const hud2:any={...g.snapshot(),started:true,awaitingStart:false,founding:false};void hud;
 if(S.report)hud2.selection={...hud2.selection,kind:'none'};// the report card takes the selection card's slot while someone is reporting
 const base:any={game:g,dispatchEpoch:0,disposed:false,loggingMode:false,quarterTurn:false,gateFacing:0,
  view:{getMapStyle:()=>'painterly',getStyle:()=>'village',shadowsEnabled:true,unitRingsEnabled:true,look:V.look,dist:V.dist,camera:V.camera},
  profile:{measure:(_n:string,f:()=>void)=>f()},audio:{settings:{master:.8,music:.6,sfx:.8,ambience:.5},play(){}},
  readModel:async(q:any)=>({epoch:0,model:applyEngineReadQuery(g,q)}),dispatch:async(c:any,s:any)=>{const reply=(applyEngineCommand as any)?(applyEngineCommand as any)(g,c,s):{accepted:false};return{epoch:0,...reply};},canRotatePlacement:()=>false,pushHud(){},keyboard:{}};
 const engine:any=new Proxy(base,{get:(t,p)=>p in t?t[p as any]:(p==='then'?undefined:()=>undefined)});
 let host=document.getElementById('root')!;host.style.display='block';
 const root=createRoot(host);
 root.render(h('div',{style:{position:'absolute',inset:0}},h(HudHearth as any,{hud:hud2,engine}),S.report?h(ReportCard,{r:S.report}):null));
 await new Promise(r=>setTimeout(r,1400));
 g.state.paused=true;
 return {sel:hud2.selection?.kind,name:hud2.selection?.name,pop:hud2.pop,mine:mine.length};
};
w.fpHideHud=()=>{const r=document.getElementById('root');if(r)r.style.display='none';};
w.fpShowHud=()=>{const r=document.getElementById('root');if(r)r.style.display='block';};
w.fpUnitInfo=()=>({steward:people.steward&&{x:people.steward.x,z:people.steward.z},farmer:people.farmer&&{x:people.farmer.x,z:people.farmer.z}});
w.fpPick=(nx:number,ny:number)=>{const rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(nx,ny),V.camera);const hits=rc.intersectObjects(V.scene.children,true).filter(h=>(h.object as any).visible!==false).slice(0,6);
 return hits.map(h=>({name:h.object.name||h.object.type,parent:h.object.parent?.name,d:+h.distance.toFixed(2),type:h.object.type,mat:(h.object as any).material?.type}));};
w.fpTree=()=>V.scene.children.map((c:any,i:number)=>`${i}:${c.type}:${(c.name||'').slice(0,40)}:${c.children?.length||0}:${c.visible}`);
w.fpHideIdx=(i:number)=>{V.scene.children[i].visible=false;V.render();};w.fpShowIdx=(i:number)=>{V.scene.children[i].visible=true;};
w.fpBisect=(px:number,py:number)=>{const out:any[]=[];const c2=document.createElement('canvas');c2.width=canvas.width;c2.height=canvas.height;const x2=c2.getContext('2d')!;
 const probe=()=>{V.render();x2.drawImage(canvas,0,0);const d=x2.getImageData(px,py,1,1).data;return [d[0],d[1],d[2]];};
 out.push(['base',probe()]);
 V.scene.children.forEach((ch:any,i:number)=>{if(!ch.visible)return;ch.visible=false;const c=probe();ch.visible=true;out.push([i,ch.type,ch.name,c]);});return out;};
w.fpProfile=(x:number,z:number,yaw:number,len:number,step:number)=>{const o:any[]=[];for(let d=0;d<=len;d+=step){const px=x+Math.sin(yaw)*d,pz=z+Math.cos(yaw)*d;o.push([d,+G.height(px,pz).toFixed(1),+G.waterAt(px,pz).toFixed(1)]);}return o;};
w.fpGrid=(cx:number,cz:number,half:number,step:number)=>{const rows:string[]=[];for(let z=cz-half;z<=cz+half;z+=step){let r='';for(let x=cx-half;x<=cx+half;x+=step){const hh=G.height(x,z),ww=G.waterAt(x,z);r+=hh<ww?'~':hh-ww<1?',':hh>ww+6?'#':hh>ww+3?'+':'.';}rows.push(String(Math.round(z)).padStart(5)+' '+r);}return rows;};
w.fpFind=(px:number,py:number,isBad:(c:number[])=>boolean)=>{const c2=document.createElement('canvas');c2.width=canvas.width;c2.height=canvas.height;const x2=c2.getContext('2d')!;
 const probe=()=>{V.render();x2.drawImage(canvas,0,0);const d=x2.getImageData(px,py,1,1).data;return [d[0],d[1],d[2]];};
 let cand=V.scene.children.map((c:any,i:number)=>i).filter((i:number)=>V.scene.children[i].visible&&!/Light|Object3D/.test(V.scene.children[i].type)&&V.scene.children[i].name!=='terrain');const steps:any[]=[];
 while(cand.length>1){const half=cand.slice(0,cand.length>>1),rest=cand.slice(cand.length>>1);half.forEach((i:number)=>V.scene.children[i].visible=false);const c=probe();half.forEach((i:number)=>V.scene.children[i].visible=true);
  const bad=c[0]+c[1]+c[2]<30;steps.push([half.length,c,bad]);cand=bad?rest:half;}
 const i=cand[0],o:any=V.scene.children[i];return {steps,culprit:{i,type:o?.type,name:o?.name,mat:o?.material?.type,count:o?.count,geo:o?.geometry?.type}};};
w.fpReady=true;
type _V=V3;void (null as unknown as _V);
