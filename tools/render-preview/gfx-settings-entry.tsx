// Mounts the real GraphicsSettingsPanel over the real GraphicsSettings controller (no engine, no WebGL) for the settings-UI screenshot.
import {createElement as h,useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import {GraphicsSettings} from '@/game/graphicsSettings';
import {GraphicsSettingsPanel} from '@/ui/GraphicsSettingsPanel';
const w=window as any;
w.gfxMount=(o:{easeFirst?:boolean;pick?:{graphics?:string;draw?:string;trees?:string|number}})=>{
 const mem=new Map<string,string>();const st={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v);}};
 const g=new GraphicsSettings(()=>{},st);g.start();
 if(o.pick){if(o.pick.graphics)g.choose('graphics',o.pick.graphics as never);if(o.pick.draw)g.choose('draw',o.pick.draw as never);if(o.pick.trees!==undefined)g.choose('trees',o.pick.trees as never);}
 if(o.easeFirst){g.hold(0);for(let i=0;i<400;i++)g.observe(16);for(let i=0;i<200;i++)g.observe(60);}
 let bump:()=>void=()=>{};
 const engine:any={gfx:g,chooseGraphics:(v:any)=>{g.choose('graphics',v);bump();},chooseDrawDistance:(v:any)=>{g.choose('draw',v);bump();},chooseTreeDetail:(v:any)=>{g.choose('trees',v);bump();},restoreGraphics:()=>{g.restore();bump();}};
 const App=()=>{const [,f]=useReducer((x:number)=>x+1,0);bump=f;return h('section',{className:'hw-card'},h('h3',null,'Display'),h('div',{className:'hw-form'},h(GraphicsSettingsPanel,{engine,variant:'hearth'})));};
 createRoot(document.getElementById('root')!).render(h(App));
 w.gfx=g;
};
w.gfxReady=true;
