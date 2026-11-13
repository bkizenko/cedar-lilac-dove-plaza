import {useCallback,useEffect} from 'react';
import {layout} from './hudLayout';
import {useLayoutVersion} from './fold';
import {MINIMAP_KEY,readMinimapCollapsed,writeMinimapCollapsed,isMinimapShortcut} from './minimapPrefs';
import {Map as MapIcon,Minimize2} from 'lucide-react';

export {MINIMAP_KEY,readMinimapCollapsed,writeMinimapCollapsed,isMinimapShortcut};
export function useMinimapCollapsed(){
 // The minimap is one panel of the shared HUD layout (same MINIMAP_KEY on disk), so Show all / Reset layout reach it too.
 useLayoutVersion();const collapsed=layout.isCollapsed('map');
 const set=useCallback((v:boolean|((p:boolean)=>boolean))=>layout.set('map',typeof v==='function'?v(layout.isCollapsed('map')):v),[]);
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
 return <button type="button" className="hw-map-collapse" aria-label="Hide map (Shift+M)" title="Hide map (Shift+M)" onClick={onClick}><Minimize2 size={24}/></button>;
}
