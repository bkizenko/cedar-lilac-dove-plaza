import {useEffect,useState} from 'react';
export type UiTheme='field'|'classic';
const KEY='hearthwild.ui.theme';
const read=():UiTheme=>{try{return globalThis.localStorage?.getItem(KEY)==='classic'?'classic':'field';}catch{return 'field';}};
/** Per-viewer palette preference. `field` is the current refreshed palette; `classic` restores the original warm-brown tokens (styles.css, never deleted). */
export function useUiTheme():[UiTheme,(t:UiTheme)=>void]{
 const [theme,set]=useState<UiTheme>(read);
 useEffect(()=>{const r=document.documentElement;if(theme==='classic')r.dataset.hwUi='classic';else delete r.dataset.hwUi;},[theme]);
 return [theme,t=>{set(t);try{globalThis.localStorage?.setItem(KEY,t);}catch{/* preference only */}}];
}
export function UiThemeToggle(){
 const [theme,setTheme]=useUiTheme();
 return <div className="mt-2 flex items-center justify-between gap-2 text-xs" role="group" aria-label="Interface palette"><span className="text-parchment-dim">Interface palette</span>
  <span className="inline-flex overflow-hidden rounded-md border border-parchment/20">{(['field','classic'] as const).map(t=><button key={t} type="button" aria-pressed={theme===t} className={'px-2 py-0.5 '+(theme===t?'bg-bronze/30 text-parchment':'text-parchment-dim')} onClick={()=>setTheme(t)}>{t==='field'?'Field':'Classic'}</button>)}</span></div>;
}
/** Applies the remembered palette as soon as the HUD mounts, even if the settings row is never opened. */
export function UiThemeBoot(){useEffect(()=>{if(read()==='classic')document.documentElement.dataset.hwUi='classic';},[]);return null;}
