// Mounts the real Hearth CouncilScreen / MenuScreen against a live Game (rulersVersion 2) with a minimal engine stub (read models answered by applyEngineReadQuery).
import {createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {Game} from '@/game/sim';
import {applyEngineReadQuery} from '@/game/engineReadModels';
import {CouncilScreen,MenuScreen} from '@/ui/hearth/screens';
import {WondersScreen} from '@/ui/hearth/wondersScreen';
const w=window as any;
w.hwMount=async(o:{screen:'council'|'menu'|'wonders';tab?:string;years?:number})=>{
 const g=new Game();(g as any).reset(5,10,{rulersVersion:2});g.enterIsland();
 const end=g.state.time+(o.years??8)*90;while(g.state.time<end){g.state.paused=false;g.step(.5);}
 g.state.paused=true;
 const engine:any={game:g,dispatchEpoch:0,disposed:false,view:{getMapStyle:()=>'painterly',getStyle:()=>'village',shadowsEnabled:true,unitRingsEnabled:true},audio:{settings:{master:.8,music:.6,sfx:.8,ambience:.5},play(){}},
  readModel:async(q:any)=>({epoch:0,model:applyEngineReadQuery(g,q)}),dispatch:async()=>({accepted:false,reason:'stub'}),pushHud(){},keyboard:{}};
 const hud:any=g.snapshot();
 const root=createRoot(document.getElementById('root')!);
 root.render(o.screen==='wonders'?h(WondersScreen,{engine,onClose(){},initial:o.tab}):o.screen==='menu'?h(MenuScreen,{hud,engine,onClose(){},lifecycle:{busy:false,run:async()=>{}} as any,onTest(){},onHide(){}}):h(CouncilScreen,{engine,onClose(){},initial:o.tab}));
 await new Promise(r=>setTimeout(r,1500));
 return true;
};
w.hwReady=true;
