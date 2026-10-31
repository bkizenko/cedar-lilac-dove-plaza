import { useEffect, useRef, type PointerEvent } from 'react';
import type { Engine } from '@/game/engine';
import type { HudSnapshot } from '@/game/types';
import {MINIMAP_RULES,sampleMinimapTerrain,paintMinimapFog,worldToMinimap,minimapToWorld,minimapViewRectangle} from './minimapModel';
const SIZE=MINIMAP_RULES.pixels;
/** North is negative world Z. Unknown terrain and unknown settlements stay hidden. */
export function WorldMinimap({hud,engine}:{hud:HudSnapshot;engine:Engine|null}){
 const latest=useRef(hud);latest.current=hud;
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!engine||!canvas.current)return;const ctx=canvas.current.getContext('2d');if(!ctx)return;
  // Reuse the canvas pixel buffer; terrain/fog still refresh at the same2Hz.
  const pixels=ctx.createImageData(SIZE,SIZE);
  const draw=()=>{
   // Read the current game here: a restored/reset world can replace it while the
   // same engine and minimap component remain mounted.
   const g=engine.game,hud=latest.current,terrain=sampleMinimapTerrain(g,performance.now()),map=terrain.size;
   paintMinimapFog(g,terrain,pixels.data);
   ctx.putImageData(pixels,0,0);
   const point=(x:number,z:number,color:string,r:number)=>{const p=worldToMinimap(x,z,map);ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();};
   for(const c of hud.camps||[])if(c.known)point(c.x,c.z,c.alive?c.color:'#82786b',3);
   const home=g.campOf(0);point(home.x,home.z,'#f7d48b',4);
   const view=engine.view,rect=minimapViewRectangle(view.look,map,view.dist,view.camera.fov,view.camera.aspect);
   ctx.strokeStyle='rgba(227, 215, 193, 0.45)';ctx.lineWidth=1;
   ctx.strokeRect(rect.x,rect.y,rect.width,rect.height);
  };
  const measuredDraw=()=>engine.profile.measure('map',draw);measuredDraw();const timer=setInterval(measuredDraw,MINIMAP_RULES.terrainRefreshMilliseconds);return()=>clearInterval(timer);
 },[engine]);
 const pan=(e:PointerEvent<HTMLCanvasElement>)=>{if(!engine)return;const r=e.currentTarget.getBoundingClientRect(),p=minimapToWorld((e.clientX-r.left)/r.width*SIZE,(e.clientY-r.top)/r.height*SIZE,engine.game.world.size);engine.focusMinimap(p.x,p.z);};
 return <div className="world-minimap"><canvas ref={canvas} width={SIZE} height={SIZE} role="button" tabIndex={0}
  aria-label="World map, north up. Drag to pan. Muted square marks the approximate view centre and zoom. Arrow keys move the camera; Home returns to your village."
  onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pan(e);}}
  onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))pan(e);}}
  onKeyDown={e=>{if(!engine)return;const map=engine.game.world.size,step=map/30,p=engine.view.look,dirs:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
   if(e.key==='Home'){e.preventDefault();e.stopPropagation();const home=engine.game.campOf(0);engine.focusMinimap(home.x,home.z);}
   else if(dirs[e.key]){e.preventDefault();e.stopPropagation();const[x,z]=dirs[e.key];engine.focusMinimap(Math.max(-map/2,Math.min(map/2,p.x+x)),Math.max(-map/2,Math.min(map/2,p.z+z)));}
  }}/><span className="world-minimap-north" aria-hidden="true">N ↑</span></div>;
}
