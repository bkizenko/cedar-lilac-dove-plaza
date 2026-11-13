import {useMemo,useState} from 'react';
import {Landmark,Sparkles,Hammer,Check,Lock,MapPin,Users,Clock,Scroll,Mountain,Save,Trash2,ChevronRight} from 'lucide-react';
import type {WondersModel,WonderRow,WonderRowState} from '@/game/wonderPanelModel';
import type {WonderLook} from '@/game/wonderRecords';
import {WONDER_STAGES} from '@/game/wonderDefs';
import {RES_ICON} from './icons';
import {cx} from './kit';
import './wonders.css';

/** Wonders panel (Hearth): available, suggested, in progress and finished wonders; a site picker, cost, effect words, a "Suggest a wonder" button that
 * ranks by ground, goods, the people's traits and current needs (with reasons), saved styles, and the ruins and ancient sites found so far.
 * Size floors: text 16 px, icons 24 px, taps 52 px (wonders.css). Pure view over WondersModel; the screen wrapper supplies the model and commands. */
export type SavedStyle={id:string;label:string;look:WonderLook};
export type WondersPanelProps={model:WondersModel;focus?:string;setFocus:(id:string|undefined)=>void;onFound:(id:string,site?:{x:number;z:number},look?:WonderLook)=>void;
 styles?:SavedStyle[];onSaveStyle?:(id:string,look:WonderLook)=>void;onRemoveStyle?:(styleId:string)=>void;initialSuggest?:boolean;initialTab?:'wonders'|'ruins';busy?:boolean};
const FILTERS:{id:'all'|WonderRowState;label:string}[]=[{id:'all',label:'All'},{id:'suggested',label:'Suggested'},{id:'rising',label:'Raising'},{id:'finished',label:'Standing'},{id:'available',label:'Possible'},{id:'locked',label:'Not yet'}];
const AXES=['processional','cross','radial','linear','spiral'] as const,ENCLOSURES=['wall','colonnade','none'] as const;
const GOOD=(k:'wood'|'stone'|'food'|'copper'|'iron')=>RES_ICON[k]({size:24});
export function Cost({row,stock}:{row:WonderRow;stock?:Partial<Record<string,number>>}){
 const c=row.cost,items=([['wood',c.wood],['stone',c.stone],['food',c.food],['copper',c.copper],['iron',c.iron]] as const).filter(([,n])=>n>0);
 return <ul className="hw-w-cost" aria-label="Cost">{items.map(([k,n])=><li key={k} className={cx('hw-chip',stock&&(stock[k]??0)<n&&'t-bad')} title={`${n} ${k}`}>{GOOD(k)}<b>{n}</b><span className="hw-w-sr">{k}</span></li>)}
  <li className="hw-chip" title="Crew"><Users size={24} aria-hidden/><b>{c.crew}</b></li><li className="hw-chip" title="Crew labour"><Clock size={24} aria-hidden/><b>{Math.round(c.labourSeconds/60)} min of labour</b></li></ul>;
}
function Stages({level}:{level:number}){
 return <ol className="hw-w-stages" aria-label="Construction stages">{WONDER_STAGES.map((s,i)=><li key={s.id} data-done={i<level} data-now={i===level}><span className="hw-w-dot">{i<level?<Check size={24} aria-hidden/>:<span aria-hidden>{i+1}</span>}</span><span>{s.label}</span></li>)}</ol>;
}
const stateIcon=(s:WonderRowState)=>s==='rising'?<Hammer size={24} aria-hidden/>:s==='finished'?<Landmark size={24} aria-hidden/>:s==='suggested'?<Sparkles size={24} aria-hidden/>:s==='fallen'?<Mountain size={24} aria-hidden/>:s==='locked'?<Lock size={24} aria-hidden/>:<ChevronRight size={24} aria-hidden/>;
function Detail({row,model,onFound,styles,onSaveStyle,onRemoveStyle,busy}:{row:WonderRow;model:WondersModel;onFound:WondersPanelProps['onFound'];styles:SavedStyle[];onSaveStyle?:WondersPanelProps['onSaveStyle'];onRemoveStyle?:WondersPanelProps['onRemoveStyle'];busy?:boolean}){
 const [site,setSite]=useState(0),[look,setLook]=useState<WonderLook>({});
 const mine=styles,chosen=row.sites[Math.min(site,row.sites.length-1)];
 const set=(k:keyof WonderLook,v:unknown)=>setLook(l=>{const n={...l};if(v===''||v===undefined)delete n[k];else (n as Record<string,unknown>)[k]=v;return n;});
 return <div className="hw-w-detail">
  {row.reasons.length>0&&<section aria-label="Why this one"><h4>Why this one</h4><ul className="hw-w-list">{row.reasons.map(r=><li key={r}>{r}</li>)}</ul></section>}
  {row.blocker&&<p className="hw-w-blocker" role="status"><Lock size={24} aria-hidden/>{row.blocker}</p>}
  <section aria-label="Effects"><h4>What it does</h4><ul className="hw-w-list">{row.effects.map(e=><li key={e}>{e}</li>)}</ul>
   {row.hooks.length>0&&<p className="hw-w-dim">Later, when the game can: {row.hooks.join('; ')}.</p>}</section>
  <p className="hw-w-dim">Inspired by {row.analogue}{row.analogueSourced?'':'; the likeness is unchecked'}.</p>
  {row.state==='rising'&&row.project&&<section aria-label="Progress"><h4>{row.project.stage}</h4><progress className="hw-w-bar" max={1} value={row.project.progress} aria-label="Progress"/><Stages level={row.project.level}/>
   <p>{row.project.crew} at work{row.project.nextGoods?`; next delivery: ${row.project.nextGoods.toLowerCase()}`:''}</p>{row.project.waiting&&<p className="hw-w-blocker" role="status">{row.project.waiting}</p>}</section>}
  {(row.state==='available'||row.state==='suggested')&&row.sites.length>0&&<>
   <section aria-label="Choose the ground"><h4>Choose the ground</h4><div className="hw-w-sites" role="radiogroup" aria-label="Sites">{row.sites.map((s,i)=><button key={i} type="button" role="radio" aria-checked={site===i} className={cx('hw-w-site',site===i&&'is-on')} onClick={()=>setSite(i)}><MapPin size={24} aria-hidden/>Site {i+1}: {s.words}</button>)}</div></section>
   <section aria-label="Style"><h4>Style</h4><p className="hw-w-dim">Left open, your people's own style and this game's seed decide the look. Pin any of it, or reuse a saved style.</p>
    <div className="hw-w-fields"><label>Layout<select value={look.axis??''} onChange={e=>set('axis',e.target.value)}><option value="">Chosen by the seed</option>{AXES.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
     <label>Enclosure<select value={look.enclosure??''} onChange={e=>set('enclosure',e.target.value)}><option value="">Chosen by the seed</option>{ENCLOSURES.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
     <label>Water feature<select value={look.water===undefined?'':look.water?'yes':'no'} onChange={e=>set('water',e.target.value===''?undefined:e.target.value==='yes')}><option value="">Chosen by the seed</option><option value="yes">With water</option><option value="no">Without</option></select></label></div>
    <div className="hw-w-row">{onSaveStyle&&<button type="button" className="hw-btn-wide" onClick={()=>onSaveStyle(row.id,look)}><Save size={24} aria-hidden/>Save this style</button>}</div>
    {mine.length>0&&<ul className="hw-w-saved" aria-label="Saved styles">{mine.map(s=><li key={s.id}><button type="button" className="hw-btn-wide" onClick={()=>setLook(s.look)}>{s.label}</button>{onRemoveStyle&&<button type="button" className="hw-btn" aria-label={`Remove ${s.label}`} onClick={()=>onRemoveStyle(s.id)}><Trash2 size={24} aria-hidden/></button>}</li>)}</ul>}</section>
   <button type="button" className="hw-primary hw-w-found" disabled={!row.ready||busy} title={row.blocker} onClick={()=>onFound(row.id,chosen?{x:chosen.x,z:chosen.z}:undefined,Object.keys(look).length?look:undefined)}><Hammer size={24} aria-hidden/>Begin raising it</button>
   {!row.ready&&row.blocker&&<p className="hw-w-dim">Not yet: {row.blocker}</p>}</>}
  {row.state==='locked'&&!row.earthworks&&<p className="hw-w-dim">Needs the {['Stone','Bronze','Iron','Classical','Medieval','Late'][row.minAge]??'later'} era or better ground. {model.reserve?`A reserve of ${model.reserve.wood} wood, ${model.reserve.stone} stone and ${model.reserve.food} food is always kept.`:''}</p>}
 </div>;
}
export function WondersPanel(p:WondersPanelProps){
 const {model,focus,setFocus}=p,[filter,setFilter]=useState<'all'|WonderRowState>('all'),[suggest,setSuggest]=useState(!!p.initialSuggest),[tab,setTab]=useState<'wonders'|'ruins'>(p.initialTab??'wonders');
 const rows=useMemo(()=>model.rows.filter(r=>filter==='all'||r.state===filter),[model,filter]),top=model.rows.filter(r=>model.suggested.includes(r.id)).sort((a,b)=>b.score-a.score);
 if(!model.enabled)return <p className="hw-empty">Great works are not part of this save.</p>;
 return <div className="hw-wonders">
  <div className="hw-w-tabs" role="tablist"><button role="tab" type="button" aria-selected={tab==='wonders'} onClick={()=>setTab('wonders')}><Landmark size={24} aria-hidden/>Wonders</button><button role="tab" type="button" aria-selected={tab==='ruins'} onClick={()=>setTab('ruins')}><Scroll size={24} aria-hidden/>Ruins{model.ruins.length>0&&<b>{model.ruins.length}</b>}</button></div>
  {tab==='wonders'&&<>
   <div className="hw-w-bar"><button type="button" className="hw-primary" aria-pressed={suggest} onClick={()=>setSuggest(v=>!v)}><Sparkles size={24} aria-hidden/>Suggest a wonder</button>
    <div className="hw-w-filters" role="group" aria-label="Show">{FILTERS.map(f=><button key={f.id} type="button" className={cx('hw-btn-wide',filter===f.id&&'is-on')} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div></div>
   {suggest&&<section className="hw-card hw-w-suggest" aria-label="Suggested wonders"><div className="hw-card-head"><h3>Suggested for your people</h3></div>
    {top.length===0?<p>No wonder suits your ground and age yet. Explore further, reach a later era, or gather stone and timber.</p>:<ol>{top.map((r,i)=><li key={r.id}><div className="hw-w-sug-head"><b>{i+1}. {r.label}</b><span className="hw-chip">{Math.round(r.score*100)} of 100</span></div><ul className="hw-w-list">{r.reasons.slice(0,4).map(x=><li key={x}>{x}</li>)}</ul>{r.blocker&&<p className="hw-w-dim">Not yet: {r.blocker}</p>}<button type="button" className="hw-btn-wide" onClick={()=>{setFocus(r.id);setSuggest(false);}}>Look closer</button></li>)}</ol>}</section>}
   <div className="hw-w-grid">{rows.map(r=><article key={r.id} className={cx('hw-card hw-w-card',focus===r.id&&'is-open')} data-state={r.state}>
    <button type="button" className="hw-w-head" aria-expanded={focus===r.id} onClick={()=>setFocus(focus===r.id?undefined:r.id)}>{stateIcon(r.state)}<span className="hw-w-name">{r.label}</span><span className="hw-chip" data-state={r.state}>{r.stateWords}</span></button>
    <p>{r.blurb}</p>
    {r.project&&<><progress className="hw-w-bar" max={1} value={r.project.progress} aria-label={`${r.label} progress`}/><p className="hw-w-dim">{r.project.stage}</p></>}
    <Cost row={r} stock={undefined}/>
    {focus===r.id&&<Detail row={r} model={model} onFound={p.onFound} styles={(p.styles??[]).filter(s=>s.id.startsWith(r.id+'-'))} onSaveStyle={p.onSaveStyle} onRemoveStyle={p.onRemoveStyle} busy={p.busy}/>}
   </article>)}{rows.length===0&&<p className="hw-empty">Nothing here yet.</p>}</div></>}
  {tab==='ruins'&&<div className="hw-w-grid">{model.ruins.length===0?<p className="hw-empty">No ruins found yet. Send workers to explore the hills and the far ground; old sites, fallen villages and broken great works show themselves when someone stands near.</p>:model.ruins.map(r=><article key={r.id} className="hw-card hw-w-card" data-state={r.kind}>
   <div className="hw-w-head"><Mountain size={24} aria-hidden/><span className="hw-w-name">{r.label}</span><span className="hw-chip">{r.stage}</span></div>
   <p>{r.words}</p><ul className="hw-w-cost"><li className="hw-chip"><Scroll size={24} aria-hidden/><b>{r.left} finds left, {r.open} within reach</b></li>{r.lore&&<li className="hw-chip"><Sparkles size={24} aria-hidden/><b>A carved record is buried here</b></li>}</ul>
   {r.open===0&&r.left>0&&<p className="hw-w-dim">The rest lies under fallen walls; time will uncover it.</p>}</article>)}
   <p className="hw-w-dim">Lore recovered: {model.lore}. Sites searched: {model.ruinsFound}. A worker standing at a ruin carries back one find at a time; each find is gone once taken.</p></div>}
 </div>;
}
