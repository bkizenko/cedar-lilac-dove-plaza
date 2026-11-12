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
 const hudBase:any=g.snapshot();
 const hud:any={...hudBase,started:true,awaitingStart:false,founding:false};
 if(sc==='placing')hud.placing='house';
 if(sc==='alerts'){const u=mine.slice(0,3);u.forEach((x:any)=>{x.hunger=80;});hud.threat=.7;hud.banner='C selects a gatherer · ] finds resources · R gives an order';}
 const base:any={game:g,dispatchEpoch:0,disposed:false,loggingMode:false,quarterTurn:false,gateFacing:0,
  view:{getMapStyle:()=>'painterly',getStyle:()=>'village',shadowsEnabled:true,unitRingsEnabled:true,look:{x:0,z:0},dist:60,camera:{fov:50,aspect:1.6}},
  profile:{measure:(_n:string,f:()=>void)=>f()},audio:{settings:{master:.8,music:.6,sfx:.8,ambience:.5},play(){}},
  readModel:async(q:any)=>({epoch:0,model:applyEngineReadQuery(g,q)}),
  dispatch:async(c:any,s:any)=>{const reply=(applyEngineCommand as any)?(applyEngineCommand as any)(g,c,s):{accepted:false};return{epoch:0,...reply};},
  canRotatePlacement:()=>false,pushHud(){},keyboard:{}};
 const engine:any=new Proxy(base,{get:(t,p)=>p in t?t[p as any]:(p==='then'?undefined:()=>undefined)});
 const root=createRoot(document.getElementById('root')!);
 root.render(o.ui==='classic'?h(Hud as any,{hud,engine}):h(HudHearth,{hud,engine}));
 await new Promise(r=>setTimeout(r,1200));
 return {res:(window as any).hwRes,blds:g.state.buildings.filter((b:any)=>b.team===0).map((b:any)=>b.type).join(),banner:g.state.banner,pop:hud.pop,units:mine.length,sel:hud.selection.kind,name:hud.selection.name};
};
w.hwReady=true;
