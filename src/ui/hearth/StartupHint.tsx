import {useState} from 'react';
import {X} from 'lucide-react';
/** First-run, dismissible one-liner: interface style, map style and world graphics are switchable in Menu > Game. Remembered per viewer. */
export const STARTUP_HINT_KEY='hearthwild.ui.hintGraphics';
const seen=():boolean=>{try{return globalThis.localStorage?.getItem(STARTUP_HINT_KEY)==='1';}catch{return true;}};
const remember=()=>{try{globalThis.localStorage?.setItem(STARTUP_HINT_KEY,'1');}catch{/* hint only */}};
export function StartupHint({onOpenMenu}:{onOpenMenu:()=>void}){
 const [show,setShow]=useState(()=>!seen());
 if(!show)return null;
 const dismiss=()=>{remember();setShow(false);};
 return <div className="hw-hint" role="note" aria-label="Display options hint">
  <span>Looks and feel are yours to change: interface style, map style and world graphics live in <button type="button" className="hw-hint-link" onClick={()=>{dismiss();onOpenMenu();}}>Menu</button>. The old look stays available.</span>
  <button type="button" className="hw-hint-x" aria-label="Dismiss hint" onClick={dismiss}><X size={16}/></button>
 </div>;
}
