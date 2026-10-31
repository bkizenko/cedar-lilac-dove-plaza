import { useEffect, useRef, type PointerEvent } from 'react';
import type { Engine } from '@/game/engine';
import type { HudSnapshot } from '@/game/types';
import {MINIMAP_RULES,sampleMinimapTerrain,fogMinimapColor,worldToMinimap,minimapToWorld,cameraSurfaceFootprint} from './minimapModel';
const SIZE=MINIMAP_RULES.pixels;
/** North is negative world Z. Unknown terrain and unknown settlements stay hidden. */
export function WorldMinimap({hud,engine}:{hud:HudSnapshot;engine:Engine|null}){
 const latest=useRef(hud);latest.current=hud;
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!engine||!canvas.current)return;const ctx=canvas.current.getContext('2d');if(!ctx)return;
  const draw=()=>{
   // Read the current game here: a restored/reset world can replace it while the
   // same engine and minimap component remain mounted.
   const g=engine.game,hud=latest.current,terrain=sampleMinimapTerrain(g,performance.now()),map=terrain.size,pixels=ctx.createImageData(SIZE,SIZE);
   for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
    const p=minimapToWorld(x+.5,z+.5,map),n=z*SIZE+x,seen=g.exploredAt(p.x,p.z),visible=seen&&g.visibleAt(p.x,p.z),i=n*4;
    const color=fogMinimapColor([terrain.colors[n*3],terrain.colors[n*3+1],terrain.colors[n*3+2]],seen,visible);
    pixels.data[i]=color[0];pixels.data[i+1]=color[1];pixels.data[i+2]=color[2];pixels.data[i+3]=255;
   }
   ctx.putImageData(pixels,0,0);
   const point=(x:number,z:number,color:string,r:number)=>{const p=worldToMinimap(x,z,map);ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();};
   for(const c of hud.camps||[])if(c.known)point(c.x,c.z,c.alive?c.color:'#82786b',3);
   const home=g.campOf(0);point(home.x,home.z,'#f7d48b',4);
   engine.view.camera.updateMatrixWorld(true);
   const footprint=cameraSurfaceFootprint(engine.view.camera,map,(x,z)=>Math.max(g.height(x,z),g.waterAt(x,z))).points;
   ctx.strokeStyle='#fff4dc';ctx.lineWidth=1.25;ctx.beginPath();
   // Clip the outline to surveyed ground as well; its terrain-dependent shape
   // must not become an indirect reveal of an unknown ridge or lake.
   if(footprint.length>=3)for(let i=0;i<footprint.length;i++){
    const a=footprint[i],b=footprint[(i+1)%footprint.length],pa=worldToMinimap(a.x,a.z,map),pb=worldToMinimap(b.x,b.z,map),steps=Math.max(1,Math.ceil(Math.hypot(pb.x-pa.x,pb.y-pa.y)));let pen=false;
    for(let k=0;k<=steps;k++){const t=k/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,p=worldToMinimap(x,z,map);
     if(!g.exploredAt(x,z)){pen=false;continue;}if(pen)ctx.lineTo(p.x,p.y);else{ctx.moveTo(p.x,p.y);pen=true;}}
   }
   ctx.stroke();const look=engine.view.look;point(look.x,look.z,'#fff4dc',1.5);
  };
  const measuredDraw=()=>engine.profile.measure('map',draw);measuredDraw();const timer=setInterval(measuredDraw,MINIMAP_RULES.terrainRefreshMilliseconds);return()=>clearInterval(timer);
 },[engine]);
 const pan=(e:PointerEvent<HTMLCanvasElement>)=>{if(!engine)return;const r=e.currentTarget.getBoundingClientRect(),p=minimapToWorld((e.clientX-r.left)/r.width*SIZE,(e.clientY-r.top)/r.height*SIZE,engine.game.world.size);engine.focusMinimap(p.x,p.z);};
 return <div className="world-minimap"><canvas ref={canvas} width={SIZE} height={SIZE} role="button" tabIndex={0}
  aria-label="World map, north up. Drag to pan. White outline shows the current camera view. Arrow keys move the camera; Home returns to your village."
  onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pan(e);}}
  onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))pan(e);}}
  onKeyDown={e=>{if(!engine)return;const map=engine.game.world.size,step=map/30,p=engine.view.look,dirs:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
   if(e.key==='Home'){e.preventDefault();e.stopPropagation();const home=engine.game.campOf(0);engine.focusMinimap(home.x,home.z);}
   else if(dirs[e.key]){e.preventDefault();e.stopPropagation();const[x,z]=dirs[e.key];engine.focusMinimap(Math.max(-map/2,Math.min(map/2,p.x+x)),Math.max(-map/2,Math.min(map/2,p.z+z)));}
  }}/><span className="world-minimap-north" aria-hidden="true">N ↑</span></div>;
}
