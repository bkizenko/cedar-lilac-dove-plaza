import { useEffect, useRef, type PointerEvent } from 'react';
import type { Engine } from '@/game/engine';
import type { HudSnapshot } from '@/game/types';
import { MAP } from '@/game/constants';

const SIZE = 160;
/** North-up, equal-scale map. Hidden terrain is never painted through the fog. */
export function WorldMinimap({ hud, engine }: {hud: HudSnapshot; engine: Engine | null}) {
  const latest = useRef(hud); latest.current = hud;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!engine || !canvas.current) return;
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    const g = engine.game;
    // Terrain is immutable within a game; fog and markers update at only 2 Hz.
    const heights = new Float32Array(SIZE * SIZE);
    for (let z=0; z<SIZE; z++) for (let x=0; x<SIZE; x++)
      heights[z*SIZE+x] = g.height(((x+.5)/SIZE-.5)*MAP, ((z+.5)/SIZE-.5)*MAP);
    const draw = () => {
      const hud=latest.current;
      const pixels = ctx.createImageData(SIZE,SIZE);
      for(let z=0;z<SIZE;z++) for(let x=0;x<SIZE;x++) {
        const wx=((x+.5)/SIZE-.5)*MAP, wz=((z+.5)/SIZE-.5)*MAP;
        const h=heights[z*SIZE+x]-g.world.waterY;
        const seen=g.exploredAt(wx,wz), visible=seen&&g.visibleAt(wx,wz);
        const color=!seen?[25,32,35]:h<0?[57,104,123]:h<2?[158,151,109]:h<16?[102,129,83]:h<35?[129,133,106]:[173,170,151];
        const shade=seen&&!visible?.65:1, i=(z*SIZE+x)*4;
        pixels.data[i]=color[0]*shade;pixels.data[i+1]=color[1]*shade;pixels.data[i+2]=color[2]*shade;pixels.data[i+3]=255;
      }
      ctx.putImageData(pixels,0,0);
      const point=(x:number,z:number,color:string,r:number)=>{
        ctx.fillStyle=color;ctx.beginPath();ctx.arc((x/MAP+.5)*SIZE,(z/MAP+.5)*SIZE,r,0,Math.PI*2);ctx.fill();
      };
      for(const c of hud.camps||[]) if(c.known)point(c.x,c.z,c.alive?c.color:'#82786b',3);
      point(hud.homeX??0,hud.homeZ??0,'#f7d48b',4);
      const look=engine.view.look;
      const x=(look.x/MAP+.5)*SIZE,z=(look.z/MAP+.5)*SIZE;
      ctx.strokeStyle='#fff4dc';ctx.lineWidth=1.5;ctx.strokeRect(x-5,z-5,10,10);
    };
    draw();const timer=setInterval(draw,500);
    return ()=>clearInterval(timer);
  },[engine,engine?.game]);
  const pan=(e:PointerEvent<HTMLCanvasElement>)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const at=(n:number,start:number,size:number)=>(Math.max(0,Math.min(1,(n-start)/size))-.5)*MAP;
    engine?.focusMinimap(at(e.clientX,r.left,r.width),at(e.clientY,r.top,r.height));
  };
  return <div className="world-minimap">
    <canvas ref={canvas} width={SIZE} height={SIZE} role="button" tabIndex={0}
      aria-label="World map. Drag to pan. Arrow keys move the camera; Home returns to your village."
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pan(e);}}
      onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))pan(e);}}
      onKeyDown={e=>{
        if(!engine)return;
        const step=MAP/30, p=engine.view.look;
        const dirs:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
        if(e.key==='Home'){e.preventDefault();e.stopPropagation();engine.focusMinimap(hud.homeX??0,hud.homeZ??0);}
        else if(dirs[e.key]){e.preventDefault();e.stopPropagation();const [x,z]=dirs[e.key];engine.focusMinimap(Math.max(-MAP/2,Math.min(MAP/2,p.x+x)),Math.max(-MAP/2,Math.min(MAP/2,p.z+z)));}
      }}/>
    <span className="world-minimap-north" aria-hidden="true">N ↑</span>
  </div>;
}
