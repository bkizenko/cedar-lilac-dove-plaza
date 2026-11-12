import {useMemo} from 'react';
import {Dices,Home,Palette,Shuffle} from 'lucide-react';
import {APPROVED_CIVS,isApprovedSkin,listSkins,presetSkin,skinChips,type CivSkin} from '../scene/civSkin';
import {emblemSvgFor} from '../scene/civPeople';
import type {SkinRequest} from '../game/skinState';
import './skinPicker.css';

/** Look of the player's village for a new world: an approved/registry skin, a remix of a civ, a random draw, or the plain Village grammar.
 * Terse and icon-led; the preview is the skin's own palette, banner emblem and people's cloth, drawn from the same data the renderer reads. */
const MODES:{mode:SkinRequest['mode'];label:string;Icon:typeof Palette}[]=[{mode:'preset',label:'Preset',Icon:Palette},{mode:'remix',label:'Remix',Icon:Shuffle},{mode:'random',label:'Random',Icon:Dices},{mode:'neutral',label:'Plain',Icon:Home}];

/** A small hall, house and banner coloured from the skin: what the palette will look like before the world exists. */
export function SkinPreview({skin,size=96}:{skin:CivSkin;size?:number}){
 const p=skin.palette,w=p?.wall.hex??'#e3d6b8',w2=p?.wall2.hex??'#a8a396',r=p?.roof.hex??'#b79a52',t=p?.trim.hex??'#6b4a2d',a=p?.accent.hex??'#a8432f',c=p?.cloth.hex??'#a8432f',g=p?.ground.hex??'#7a8a68';
 return (
  <svg className="skin-preview" width={size} height={size*.75} viewBox="0 0 96 72" role="img" aria-label={`${skin.name} palette`}>
   <rect width="96" height="72" rx="8" fill={g} opacity=".55"/>
   <rect x="10" y="38" width="30" height="22" fill={w}/><polygon points="6,38 25,22 44,38" fill={r}/><rect x="21" y="46" width="8" height="14" fill={a}/>
   <rect x="46" y="26" width="30" height="34" fill={w2}/><polygon points="42,26 61,12 80,26" fill={r}/><rect x="56" y="44" width="10" height="16" fill={t}/><rect x="46" y="34" width="30" height="3" fill={t}/>
   <rect x="80" y="16" width="2" height="44" fill={t}/><polygon points="82,17 94,21 82,27" fill={c}/>
   <circle cx="12" cy="66" r="3" fill={skin.garb.body}/><circle cx="20" cy="66" r="3" fill={skin.garb.trim}/>
  </svg>
 );
}
export function SkinBanner({skin}:{skin:CivSkin}){
 const svg=useMemo(()=>emblemSvgFor(skin,28),[skin]);
 return <span className="skin-banner" dangerouslySetInnerHTML={{__html:svg}} aria-hidden="true"/>;
}

export function SkinPicker({value,onChange}:{value:SkinRequest;onChange:(r:SkinRequest)=>void}){
 const skins=useMemo(()=>[...listSkins().filter(s=>s.mode==='preset')].sort((a,b)=>Number(isApprovedSkin(b.id))-Number(isApprovedSkin(a.id))),[]);
 const shown=value.mode==='preset'?skins.find(s=>s.id===value.skinId)??skins[0]:value.mode==='remix'?presetSkin((value.preset as typeof APPROVED_CIVS[number])??'aureline'):null;
 return (
  <fieldset className="skin-pick">
   <legend>Village look</legend>
   <div className="skin-modes" role="radiogroup" aria-label="Village look mode">
    {MODES.map(({mode,label,Icon})=>(
     <button key={mode} type="button" role="radio" aria-checked={value.mode===mode} className={value.mode===mode?'is-on':''} title={label}
      onClick={()=>onChange(mode==='preset'?{mode,skinId:(value.mode==='preset'?value.skinId:'civ:aureline')}:mode==='remix'?{mode,preset:value.mode==='remix'?value.preset:undefined}:{mode} as SkinRequest)}>
      <Icon size={18} aria-hidden/><span>{label}</span>
     </button>
    ))}
   </div>
   {(value.mode==='preset'||value.mode==='remix')&&(
    <div className="skin-chips" role="listbox" aria-label={value.mode==='remix'?'Base civ to remix':'Preset skin'}>
     {skins.filter(s=>value.mode==='preset'||isApprovedSkin(s.id)).map(s=>{
      const on=value.mode==='preset'?value.skinId===s.id:value.preset===s.preset;
      return (
       <button key={s.id} type="button" role="option" aria-selected={on} className={on?'is-on':''} title={s.name}
        onClick={()=>onChange(value.mode==='remix'?{mode:'remix',preset:s.preset}:{mode:'preset',skinId:s.id})}>
        <span className="skin-dots">{skinChips(s).map((h,i)=><i key={i} style={{background:h}}/>)}</span><b>{s.name}</b>
       </button>
      );
     })}
    </div>
   )}
   <div className="skin-view">
    {shown?<><SkinPreview skin={shown}/><div><b>{shown.name}{value.mode==='remix'?' ~':''}</b><SkinBanner skin={shown}/><small>{value.mode==='remix'?'kin of this civ; hue, trim, banner and garb vary with the world':isApprovedSkin(shown.id)?'approved look':'extra skin'}</small></div></>
     :<small>{value.mode==='random'?'a generated people: preset, remix or free, drawn from the world seed':'the plain village grammar, no skin'}</small>}
   </div>
   <small className="skin-note">Rivals each get their own.</small>
  </fieldset>
 );
}
