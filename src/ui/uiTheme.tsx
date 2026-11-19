import {useEffect,useSyncExternalStore} from 'react';
/** Interface style, per viewer.
 * `hearth`  the new interface (default): calm parchment-and-wood HUD, big icons and numbers, contextual command bar.
 * `field`   the previous interface (Hud.tsx), teal palette. Archived, fully working.
 * `classic` the original warm-brown palette on the previous interface. Archived, fully working. */
export type UiTheme='hearth'|'field'|'classic';
const KEY='hearthwild.ui.theme';
/** The new interface is always used unless a review link asks for an archived one (?ui=classic|field). A saved Classic choice no longer applies, so old browsers cannot show the old HUD by accident. */
const read=():UiTheme=>{try{const q=new URLSearchParams(globalThis.location?.search??'').get('ui');return q==='classic'||q==='field'?q:'hearth';}catch{return 'hearth';}};
let current:UiTheme=read();
const listeners=new Set<()=>void>();
const apply=(t:UiTheme)=>{if(typeof document==='undefined')return;const r=document.documentElement;if(t==='hearth')delete r.dataset.hwUi;else r.dataset.hwUi=t;};
export const getUiTheme=()=>current;
export function setUiTheme(t:UiTheme){current=t;try{globalThis.localStorage?.setItem(KEY,t);}catch{/* preference only */}apply(t);listeners.forEach(l=>l());}
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};};
export function useUiTheme():[UiTheme,(t:UiTheme)=>void]{
 const theme=useSyncExternalStore(subscribe,()=>current,()=>'hearth' as UiTheme);
 useEffect(()=>{apply(theme);},[theme]);
 return [theme,setUiTheme];
}
/** Hearth palette, per viewer: `warm` (default, parchment and wood) or `dusk` (cool slate, higher contrast, roomier type). */
export type HearthPalette='warm'|'dusk';
const PKEY='hearthwild.ui.palette';
const readPal=():HearthPalette=>{try{return globalThis.localStorage?.getItem(PKEY)==='dusk'?'dusk':'warm';}catch{return 'warm';}};
let pal:HearthPalette=readPal();
const palListeners=new Set<()=>void>();
const applyPal=(p:HearthPalette)=>{if(typeof document==='undefined')return;const r=document.documentElement;if(p==='warm')delete r.dataset.hwPal;else r.dataset.hwPal=p;};
export const getHearthPalette=()=>pal;
export function setHearthPalette(p:HearthPalette){pal=p;try{globalThis.localStorage?.setItem(PKEY,p);}catch{/* preference only */}applyPal(p);palListeners.forEach(l=>l());}
const subscribePal=(l:()=>void)=>{palListeners.add(l);return()=>{palListeners.delete(l);};};
export function useHearthPalette():[HearthPalette,(p:HearthPalette)=>void]{
 const p=useSyncExternalStore(subscribePal,()=>pal,()=>'warm' as HearthPalette);
 useEffect(()=>{applyPal(p);},[p]);
 return [p,setHearthPalette];
}
/** Colour vision, per viewer: `safe` swaps the Hearth status colours (good, bad, warning) for a blue/orange/yellow set
 * that stays apart under red-green colour blindness, and adds a shape to status chips. `standard` is the default. */
export type ColourVision='standard'|'safe';
const CKEY='hearthwild.ui.colourVision';
const readCvd=():ColourVision=>{try{return globalThis.localStorage?.getItem(CKEY)==='safe'?'safe':'standard';}catch{return 'standard';}};
let cvd:ColourVision=readCvd();
const cvdListeners=new Set<()=>void>();
const applyCvd=(c:ColourVision)=>{if(typeof document==='undefined')return;const r=document.documentElement;if(c==='standard')delete r.dataset.hwCvd;else r.dataset.hwCvd=c;};
export function setColourVision(c:ColourVision){cvd=c;try{globalThis.localStorage?.setItem(CKEY,c);}catch{/* preference only */}applyCvd(c);cvdListeners.forEach(l=>l());}
const subscribeCvd=(l:()=>void)=>{cvdListeners.add(l);return()=>{cvdListeners.delete(l);};};
export function useColourVision():[ColourVision,(c:ColourVision)=>void]{
 const c=useSyncExternalStore(subscribeCvd,()=>cvd,()=>'standard' as ColourVision);
 useEffect(()=>{applyCvd(c);},[c]);
 return [c,setColourVision];
}
/** True for the interface that uses the archived HUD (Hud.tsx). */
export const isClassicFamily=(t:UiTheme)=>t!=='hearth';
/** Settings row: "New" (Hearth) or "Classic" (the previous interface); Classic offers its two palettes. */
export function UiThemeToggle(){
 const [theme,setTheme]=useUiTheme(),[palette,setPalette]=useHearthPalette(),[vision,setVision]=useColourVision(),classic=isClassicFamily(theme);
 return <div className="ui-style-switch mt-2 grid gap-2 text-xs" role="group" aria-label="Interface style">
  <div className="flex items-center justify-between gap-2"><span className="text-parchment-dim">Interface style</span>
   <span className="inline-flex overflow-hidden rounded-md border border-parchment/20">{([['hearth','New'],['field','Classic']] as const).map(([t,label])=><button key={t} type="button" aria-pressed={t==='hearth'?!classic:classic} className={'px-2 py-0.5 '+((t==='hearth'?!classic:classic)?'bg-bronze/30 text-parchment':'text-parchment-dim')} onClick={()=>setTheme(t)}>{label}</button>)}</span></div>
  {!classic&&<div className="flex items-center justify-between gap-2"><span className="text-parchment-dim">Palette</span>
   <span className="inline-flex overflow-hidden rounded-md border border-parchment/20">{(['warm','dusk'] as const).map(x=><button key={x} type="button" aria-pressed={palette===x} className={'px-2 py-0.5 '+(palette===x?'bg-bronze/30 text-parchment':'text-parchment-dim')} onClick={()=>setPalette(x)}>{x==='warm'?'Warm':'Dusk'}</button>)}</span></div>}
  {!classic&&<div className="flex items-center justify-between gap-2"><span className="text-parchment-dim">Colour vision</span>
   <span className="inline-flex overflow-hidden rounded-md border border-parchment/20" data-colour-vision>{(['standard','safe'] as const).map(x=><button key={x} type="button" aria-pressed={vision===x} className={'min-h-11 px-2 py-0.5 '+(vision===x?'bg-bronze/30 text-parchment':'text-parchment-dim')} onClick={()=>setVision(x)}>{x==='standard'?'Standard':'Red-green safe'}</button>)}</span></div>}
  {classic&&<div className="flex items-center justify-between gap-2"><span className="text-parchment-dim">Classic palette</span>
   <span className="inline-flex overflow-hidden rounded-md border border-parchment/20">{(['field','classic'] as const).map(t=><button key={t} type="button" aria-pressed={theme===t} className={'px-2 py-0.5 '+(theme===t?'bg-bronze/30 text-parchment':'text-parchment-dim')} onClick={()=>setTheme(t)}>{t==='field'?'Teal':'Brown'}</button>)}</span></div>}
 </div>;
}
/** Applies the remembered style as soon as a HUD mounts, even if the settings row is never opened. */
export function UiThemeBoot(){useEffect(()=>{apply(current);applyPal(pal);applyCvd(cvd);},[]);return null;}
