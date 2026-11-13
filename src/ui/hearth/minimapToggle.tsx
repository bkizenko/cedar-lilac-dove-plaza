import {useCallback,useEffect,useState} from 'react';
import {MINIMAP_KEY,readMinimapCollapsed,writeMinimapCollapsed,isMinimapShortcut} from './minimapPrefs';
import {Map as MapIcon,ChevronsDownRight} from 'lucide-react';

export {MINIMAP_KEY,readMinimapCollapsed,writeMinimapCollapsed,isMinimapShortcut};
export function useMinimapCollapsed(){
 const [collapsed,setCollapsed]=useState(()=>readMinimapCollapsed());
 const set=useCallback((v:boolean|((p:boolean)=>boolean))=>setCollapsed(p=>{const n=typeof v==='function'?v(p):v;writeMinimapCollapsed(n);return n;}),[]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if(!isMinimapShortcut(e))return;e.preventDefault();e.stopImmediatePropagation();set(p=>!p);};
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
 },[set]);
 return [collapsed,set] as const;
}
/** Always-visible reopen control (tap 52, text 16). */
export function MinimapReopen({onClick}:{onClick:()=>void}){
 return <button type="button" className="hw-map-reopen" aria-label="Show map (Shift+M)" title="Show map (Shift+M)" onClick={onClick}><MapIcon size={24}/><span>Map</span></button>;
}
export function MinimapCollapseButton({onClick}:{onClick:()=>void}){
 return <button type="button" className="hw-map-collapse" aria-label="Hide map (Shift+M)" title="Hide map (Shift+M)" onClick={onClick}><ChevronsDownRight size={24}/></button>;
}
