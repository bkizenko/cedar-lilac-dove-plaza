import {useCallback,useEffect,useMemo,useState} from 'react';
import {Landmark} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {WonderLook} from '@/game/wonderRecords';
import {wonderDef} from '@/game/wonderDefs';
import {readWonderPresets,saveWonderPreset,removeWonderPreset,type WonderPresetStorage} from '@/scene/wonderPresetStore';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {useActionFeedback,FeedbackList} from '../council/useActionFeedback';
import {Screen} from './screens';
import {WondersPanel,type SavedStyle} from './wondersPanel';

/** Saved styles live in this browser only (wonderPresetStore): a style is the pinned kit choices, never a save-game field. */
const storage=():WonderPresetStorage|null=>{try{return typeof window!=='undefined'?window.localStorage:null;}catch{return null;}};
const toPreset=(family:string,look:WonderLook)=>({v:1 as const,seed:0,civ:'aureline' as const,family:family as never,options:{...(look.axis?{axis:look.axis}:{}),...(look.enclosure?{enclosure:look.enclosure}:{}),...(look.water!==undefined?{water:look.water}:{}),...(look.crown?{crown:look.crown as never}:{}),...(look.density!==undefined?{density:look.density}:{})}});
export function useSavedStyles(){
 const [styles,setStyles]=useState<SavedStyle[]>([]);
 const load=useCallback(()=>{const s=storage();if(!s){setStyles([]);return;}const r=readWonderPresets(s);setStyles(r.ok?r.entries.map(e=>({id:e.id,label:e.label,look:{...(e.preset.options.axis?{axis:e.preset.options.axis}:{}),...(e.preset.options.enclosure?{enclosure:e.preset.options.enclosure}:{}),...(e.preset.options.water!==undefined?{water:e.preset.options.water}:{}),...(e.preset.options.crown?{crown:e.preset.options.crown}:{})}})):[]);},[]);
 useEffect(load,[load]);
 const save=useCallback((family:string,look:WonderLook)=>{const s=storage();if(!s)return false;const cur=readWonderPresets(s),n=(cur.ok?cur.entries.filter(e=>e.id.startsWith(family+'-')).length:0)+1;
  const r=saveWonderPreset(s,{id:`${family}-s${n}`,label:`${wonderDef(family)?.label??family} style ${n}`,preset:toPreset(family,look)});load();return r.ok;},[load]);
 const remove=useCallback((id:string)=>{const s=storage();if(s)removeWonderPreset(s,id);load();},[load]);
 return {styles,save,remove};
}
export function WondersScreen({engine,onClose,initial}:{engine:Engine;onClose:()=>void;initial?:string}){
 const [focus,setFocus]=useState<string|undefined>(initial);
 const Q=useMemo(()=>({kind:'wonders' as const,...(focus?{focus}:{})}),[focus]);
 const read=useOwnerReadModels(engine,[Q]),model=read(Q).model?.wonders,fb=useActionFeedback(engine),saved=useSavedStyles();
 return <Screen title="Wonders" icon={<Landmark size={32}/>} onClose={onClose} wide>
  <FeedbackList items={fb.items}/>
  {model?<WondersPanel model={model} focus={focus} setFocus={setFocus} styles={saved.styles} onSaveStyle={saved.save} onRemoveStyle={saved.remove}
   onFound={(id,site,look)=>{void fb.send({kind:'found-wonder',family:id,...(site?{x:site.x,z:site.z}:{}),...(look?{look}:{})});}}/>:<p className="hw-empty">Reading the ground…</p>}
 </Screen>;
}
