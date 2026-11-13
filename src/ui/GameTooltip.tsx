import {useId,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {layout} from './hearth/hudLayout';
/** Brief game help on hover/focus, outside scrolling HUD panels. */
export function GameTooltip({title,description,children}:{title:string;description?:string;children:ReactNode}){
 const id=useId(),[position,setPosition]=useState<{left:number;top:number;above:boolean}|null>(null);
/** Hover tips follow the HUD "Tips" panel: minimised, no tooltip bubbles open (every control keeps its aria-label). */
 const show=(element:HTMLElement)=>{if(layout.isCollapsed('tips'))return;const r=element.getBoundingClientRect();setPosition({left:Math.max(12,Math.min(window.innerWidth-292,r.left+r.width/2-140)),top:r.top>150?r.top-8:r.bottom+8,above:r.top>150});};
 return <span className="game-tooltip-anchor" data-tooltip-title={title} data-tooltip-description={description} aria-describedby={position?id:undefined} onMouseEnter={e=>show(e.currentTarget)} onMouseLeave={()=>setPosition(null)} onFocusCapture={e=>show(e.currentTarget)} onBlurCapture={()=>setPosition(null)} onKeyDown={e=>{if(e.key==='Escape')setPosition(null);}}>{children}{position&&typeof document!=='undefined'&&createPortal(<div role="tooltip" id={id} className="game-tooltip" style={{left:position.left,top:position.top,transform:position.above?'translateY(-100%)':undefined}}><strong>{title}</strong>{description&&<span>{description}</span>}</div>,document.body)}</span>;
}
