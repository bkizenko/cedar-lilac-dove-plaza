import {useState} from 'react';
import {Lightbulb} from 'lucide-react';
import {FoldHandle,FoldMin,useFold} from './fold';
import {cx} from './kit';
/** First-run, dismissible one-liner: interface style, map style and world graphics are switchable in Menu > Game. Remembered per viewer. */
export const STARTUP_HINT_KEY='hearthwild.ui.hintGraphics';
const seen=():boolean=>{try{return globalThis.localStorage?.getItem(STARTUP_HINT_KEY)==='1';}catch{return true;}};
const remember=()=>{try{globalThis.localStorage?.setItem(STARTUP_HINT_KEY,'1');}catch{/* hint only */}};
export function StartupHint({onOpenMenu,onOpenHelp}:{onOpenMenu:()=>void;onOpenHelp?:()=>void}){
 const [show,setShow]=useState(()=>!seen());
 const f=useFold('tips');
 // Minimised, the hint is a "Tips" handle (it also switches hover tooltips off). It stays reachable even after the first-run line is gone.
 if(!f.showPanel)return <FoldHandle f={f} icon={<Lightbulb size={24}/>}/>;
 if(!show)return null;
 const dismiss=()=>{remember();setShow(false);};
 return <div className={cx('hw-hint',f.cls)} role="note" aria-label="Display options hint">
  <span>Interface style and graphics: <button type="button" className="hw-hint-link" onClick={()=>{dismiss();onOpenMenu();}}>Menu</button>{onOpenHelp&&<> · Keys: <button type="button" className="hw-hint-link" onClick={()=>{dismiss();onOpenHelp();}}>Help</button></>}</span>
  <FoldMin f={f} className="hw-hint-x"/>
 </div>;
}
