import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {Minimize2,PanelTop,RotateCcw,Maximize2} from 'lucide-react';
import {layout,panelLabel,PANELS,FOLD_MS,hudKeyAction,type PanelId} from './hudLayout';
import {cx} from './kit';

/** Collapsible HUD panels. A panel that is minimised is not rendered at all (so it cannot leave an invisible, click-blocking box);
 *  a labelled handle (52 px tap, 16 px text, 24 px icon) sits where it was and brings it back. The fold animates in `FOLD_MS`. */
const reduced=()=>{try{return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
export type Fold={id:PanelId;label:string;collapsed:boolean;/** render the panel */showPanel:boolean;/** render the handle */showHandle:boolean;/** animation class for the panel root */cls:string;collapse:()=>void;expand:()=>void;toggle:()=>void};
export function useLayoutVersion(){return useSyncExternalStore(layout.subscribe,layout.version,layout.version);}
export function useFold(id:PanelId):Fold{
 useLayoutVersion();
 const collapsed=layout.isCollapsed(id);
 const [phase,setPhase]=useState<'open'|'closing'|'closed'|'opening'>(collapsed?'closed':'open');
 const timer=useRef<ReturnType<typeof setTimeout>>();
 useEffect(()=>{
  clearTimeout(timer.current);
  if(collapsed&&(phase==='open'||phase==='opening')){if(reduced())setPhase('closed');else{setPhase('closing');timer.current=setTimeout(()=>setPhase('closed'),FOLD_MS);}}
  else if(!collapsed&&(phase==='closed'||phase==='closing')){if(reduced())setPhase('open');else{setPhase('opening');timer.current=setTimeout(()=>setPhase('open'),FOLD_MS);}}
  return()=>clearTimeout(timer.current);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[collapsed]);
 const collapse=useCallback(()=>layout.set(id,true),[id]),expand=useCallback(()=>layout.set(id,false),[id]),toggle=useCallback(()=>layout.toggle(id),[id]);
 return {id,label:panelLabel(id),collapsed,showPanel:phase!=='closed',showHandle:phase==='closed',cls:phase==='closing'?'is-folding':phase==='opening'?'is-unfolding':'',collapse,expand,toggle};
}
/** The always-visible way back: icon, word, optional count. Sits in the panel's own corner (`at-<id>`). */
export function FoldHandle({f,icon,badge,tone,className}:{f:Fold;icon:ReactNode;badge?:ReactNode;tone?:'bad'|'warn';className?:string}){
 if(!f.showHandle)return null;
 return <button type="button" className={cx('hw-fold-handle','at-'+f.id,tone&&'t-'+tone,className)} aria-label={`Show ${f.label}`} aria-expanded={false} title={`Show ${f.label}`} onClick={f.expand}>
  {icon}<span>{f.label}</span>{badge!==undefined&&badge!==null&&badge!==false&&badge!==0&&<i className="hw-fold-badge">{badge}</i>}
 </button>;
}
/** The minimise control that lives inside an open panel. */
export function FoldMin({f,className,text}:{f:Fold;className?:string;text?:boolean}){
 return <button type="button" className={cx('hw-fold-min',text&&'has-text',className)} aria-label={`Minimise ${f.label}`} aria-expanded={true} title={`Minimise ${f.label}`} onClick={f.collapse}><Minimize2 size={24} aria-hidden="true"/>{text&&<span>{f.label}</span>}</button>;
}
/** Wrap any panel (test lab, wonders, skills, a future one) to give it a minimise button and handle without touching its layout.
 *  `className` positions the wrapper like the panel it holds (e.g. an absolute corner). */
export function Foldable({id,icon,className,children,badge}:{id:PanelId;icon:ReactNode;className?:string;children:ReactNode;badge?:ReactNode}){
 const f=useFold(id);
 return <>
  {f.showPanel&&<div className={cx('hw-foldable',className,f.cls)} data-fold={id}><FoldMin f={f}/>{children}</div>}
  <FoldHandle f={f} icon={icon} badge={badge} className={className}/>
 </>;
}
/** Window-level keys: O (sound effects), U (hide interface), Shift+U (minimise or show every panel). Capture phase, so a game key is never also triggered. */
export function useHudHotkeys(on:{sfx:()=>void;hide:()=>void;allPanels:()=>void},enabled=true){
 const ref=useRef(on);ref.current=on;
 useEffect(()=>{
  if(!enabled)return;
  const key=(e:KeyboardEvent)=>{const a=hudKeyAction(e);if(!a)return;e.preventDefault();e.stopImmediatePropagation();ref.current[a==='sfx'?'sfx':a==='hide'?'hide':'allPanels']();};
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
 },[enabled]);
}
/** Menu block: Show all, Minimise all, Reset layout, and a line per panel so any one can be switched without hunting for its corner. */
export function LayoutControls(){
 useLayoutVersion();
 const open=PANELS.filter(p=>layout.isCollapsed(p.id)).length;
 return <div className="hw-layout hw-stack" role="group" aria-label="Interface layout">
  <div className="hw-row">
   <button type="button" className="hw-btn-wide" disabled={open===0} onClick={()=>layout.setAll(false)}><Maximize2 aria-hidden="true"/>Show all</button>
   <button type="button" className="hw-btn-wide" onClick={()=>layout.setAll(true,PANELS.filter(p=>!['testlab','wonders','skills'].includes(p.id)).map(p=>p.id))}><PanelTop aria-hidden="true"/>Minimise all</button>
   <button type="button" className="hw-btn-wide" onClick={()=>layout.reset()}><RotateCcw aria-hidden="true"/>Reset layout</button>
  </div>
  <div className="hw-layout-list" role="list">{PANELS.filter(p=>!['testlab','wonders','skills'].includes(p.id)).map(p=>{const off=layout.isCollapsed(p.id);return <button key={p.id} role="listitem" type="button" className="hw-chip hw-chip-btn" aria-pressed={!off} onClick={()=>layout.toggle(p.id)} title={`${off?'Show':'Minimise'} ${p.label} (${p.where})`}>{p.label}<em>{off?'minimised':'shown'}</em></button>;})}</div>
 </div>;
}
