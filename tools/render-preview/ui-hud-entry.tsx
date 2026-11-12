// Mounts the real HudHearth (or the archived Hud) against a live Game with a Proxy engine stub, for before/after UI renders.
// Scenarios put the Game in a real state (worker / building / commander / boat / placing / alerts) and the HUD reads it through snapshot().
import {createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {Game} from '@/game/sim';
import {applyEngineReadQuery} from '@/game/engineReadModels';
import {applyEngineCommand} from '@/game/engineDispatch';
import {appointCommander,assignToCommander} from '@/game/commanders';
import {ensureNaval} from '@/game/navalPorts';
import {HudHearth} from '@/ui/hearth/HudHearth';
import {Hud} from '@/ui/Hud';
import {lookAtCamera} from '@/ui/hearth/glanceModel';
const w=window as any;
w.hwMount=async(o:{scenario:string;ui?:'hearth'|'classic';years?:number})=>{
 const g:any=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();
 const end=g.state.time+(o.years??6)*90;while(g.state.time<end){g.state.paused=false;g.step(.5);}
 g.state.paused=true;
 const mine=g.state.units.filter((u:any)=>u.team===0&&u.hp>0);
 const workers=mine.filter((u:any)=>u.type==='worker'&&!u.militia);
 const sc=o.scenario;
 const clear=()=>{for(const u of g.state.units)u.selected=false;g.selectedBoat=null;g.state.selBld=null;};
 if(sc==='worker'&&workers[0]){clear();workers[0].selected=true;}
 if(sc==='crowd'){clear();workers.slice(0,4).forEach((u:any)=>u.selected=true);}
 if(sc==='building'){clear();const c=g.campOf(0);g.tribe(0).wood+=200;g.tribe(0).stone+=100;const res:any[]=[];for(const [t,dx,dz] of [['townhall',0,0],['hearth',9,8],['lumber',-12,6],['farm',14,-10]] as const){res.push(t+':'+g.placeBuilding(t,c.x+dx,c.z+dz,0));}(window as any).hwRes=res;
  const bs=g.state.buildings.filter((b:any)=>b.team===0);for(const b of bs){b.build=1;b.hp=b.maxHp*.8;}const b=bs.find((b:any)=>b.type==='hearth')||bs[0];if(b){b.selected=true;g.state.selBld=b;}}
 if(sc==='army'){clear();const t=g.tribe(0);t.wood+=40;const arm=mine.filter((u:any)=>u.age!==undefined||true).slice(0,4);arm.forEach((u:any)=>{u.militia=true;u.selected=true;});const r=appointCommander(g,arm[0].id,'army',{team:0,free:true});void r;const c=g.state.commanders?.roster?.[0];if(c)assignToCommander(g,c.id,arm.slice(1).map((u:any)=>u.id));}
 if(sc==='boat'){clear();const c=g.campOf(0),id=g.id();g.state.boats=[...(g.state.boats||[]),{id,team:0,dock:0,x:c.x+14,y:0,z:c.z+14,facing:0,hp:60,capacity:6}];ensureNaval(g).vessels.push({boatId:id,team:0,design:'cutter',commissionedAt:0,stores:{food:14,missiles:2},atSeaSeconds:0,captures:0,rams:0});g.selectedBoat=id;}
 const applyRaid=()=>{const home=g.campOf(0);const tpl=mine[0];
  const spawn=(dx:number,dz:number)=>{const u={...tpl,id:g.id(),team:3,x:home.x+dx,z:home.z+dz,y:g.height(home.x+dx,home.z+dz),hp:tpl.maxHp||10,selected:false,militia:false,hunger:0};g.state.units.push(u);const n=192,gx=Math.floor((u.x/g.world.size+.5)*n),gz=Math.floor((u.z/g.world.size+.5)*n);for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)g.vision[(gz+b)*n+(gx+a)]=2;};
  spawn(60,-40);spawn(64,-36);spawn(58,-44);spawn(-330,60);
  mine.slice(0,2).forEach((x:any)=>{x.hunger=90;});mine[2]&&(mine[2].coldSeconds=500);mine[3]&&(mine[3].workReason='cache full');
  if(sc==='glance'){const u=mine[4];if(u){u.thirstSeconds=400;u.x=home.x-170;u.z=home.z+40;u.y=g.height(u.x,u.z);}}};
 if(sc==='glance'){const c=g.campOf(0);g.tribe(0).wood+=200;g.tribe(0).stone+=100;for(const [t,dx,dz] of [['townhall',0,0],['hearth',9,8],['lumber',-12,6],['farm',14,-10]] as const)g.placeBuilding(t,c.x+dx,c.z+dz,0);for(const b of g.state.buildings.filter((b:any)=>b.team===0)){b.build=1;b.hp=b.maxHp;}}
 if(sc==='glance'){const home=g.campOf(0),n=192;for(let gz=0;gz<n;gz++)for(let gx=0;gx<n;gx++){const x=((gx+.5)/n-.5)*g.world.size-home.x,z=((gz+.5)/n-.5)*g.world.size-home.z;if(x*x+z*z<260*260&&g.vision[gz*n+gx]===0)g.vision[gz*n+gx]=1;}}
 const mkHud=(late=false)=>{const hud:any={...g.snapshot(),started:true,awaitingStart:false,founding:false};
  if(sc==='placing')hud.placing='house';
  if(late&&(sc==='raid'||sc==='glance'))hud.threat=.7;
  if(sc==='alerts'){const u=mine.slice(0,3);u.forEach((x:any)=>{x.hunger=80;});hud.threat=.7;hud.banner='C selects a gatherer · ] finds resources · R gives an order';}
  return hud;};
 let hud:any=mkHud();
 const base:any={game:g,dispatchEpoch:0,disposed:false,loggingMode:false,quarterTurn:false,gateFacing:0,
  view:{getMapStyle:()=>'painterly',getStyle:()=>'village',shadowsEnabled:true,unitRingsEnabled:true,look:{x:0,z:0},dist:60,camera:(()=>{const home=g.campOf(0),c:any=lookAtCamera({x:home.x-30,y:g.height(home.x,home.z)+70,z:home.z+90},{x:home.x,y:g.height(home.x,home.z),z:home.z},50,window.innerWidth/window.innerHeight);c.fov=50;c.aspect=window.innerWidth/window.innerHeight;return c;})()},
  profile:{measure:(_n:string,f:()=>void)=>f()},audio:{settings:{master:.8,music:.6,sfx:.8,ambience:.5},play(){}},
  readModel:async(q:any)=>({epoch:0,model:applyEngineReadQuery(g,q)}),
  dispatch:async(c:any,s:any)=>{const reply=(applyEngineCommand as any)?(applyEngineCommand as any)(g,c,s):{accepted:false};return{epoch:0,...reply};},
  canRotatePlacement:()=>false,pushHud(){},keyboard:{}};
 const engine:any=new Proxy(base,{get:(t,p)=>p in t?t[p as any]:(p==='then'?undefined:()=>undefined)});
 const root=createRoot(document.getElementById('root')!);
 const draw=()=>root.render(o.ui==='classic'?h(Hud as any,{hud,engine}):h(HudHearth,{hud,engine}));
 draw();
 if(sc==='glance'||sc==='raid'){
  // Let the HUD sample stock for a few simulated days so supply trends have history, then bring the trouble.
  if(sc==='glance'){for(let i=0;i<30;i++){g.state.paused=false;g.step(.5);for(let k=0;k<7;k++)g.step(.5);g.state.paused=true;hud=mkHud();draw();await new Promise(r=>setTimeout(r,20));}}
  await new Promise(r=>setTimeout(r,700));applyRaid();hud=mkHud(true);draw();
 }
 await new Promise(r=>setTimeout(r,1200));
 return {res:(window as any).hwRes,blds:g.state.buildings.filter((b:any)=>b.team===0).map((b:any)=>b.type).join(),banner:g.state.banner,pop:hud.pop,units:mine.length,sel:hud.selection.kind,name:hud.selection.name};
};
w.hwReady=true;
