import type {Engine} from '@/game/engine';
import {GRAPHICS_CHOICES,GRAPHICS_LABELS,DRAW_CHOICES,DRAW_LABELS,TREE_CHOICES,TREE_DETAIL,isGraphicsChoice,isDrawChoice,isTreeChoice,type GraphicsSettings,type TreeChoice} from '@/game/graphicsSettings';
/** Graphics, draw distance and tree detail: every option is a real selectable <option>. Each shows what is actually in force when it is on Auto, and an automatic or
 *  safety lowering is shown with its reason and a one-click "Restore my setting". The settings controller (engine.gfx) is the only writer. */
type Props={engine:Pick<Engine,'chooseGraphics'|'chooseDrawDistance'|'chooseTreeDetail'|'restoreGraphics'>&{gfx?:GraphicsSettings}|null|undefined;variant?:'hud'|'hearth'};
const treeLabel=(c:TreeChoice)=>c==='auto'?'Auto':`${c} ${TREE_DETAIL[c].label}`;
export function GraphicsSettingsPanel({engine,variant='hearth'}:Props){
 const g=engine?.gfx;if(!engine||!g||typeof g.choose!=='function')return null;
 const hud=variant==='hud',lab=hud?'px-2 py-2':undefined,chip=hud?'text-xs':'hw-chip',note=hud?'px-2 py-2 text-xs':'hw-chip t-warn';
 const now=(text:string)=><span className={chip} data-testid="gfx-in-use"> in use: {text}</span>;
 const n=g.notice,e=g.effective,c=g.choices;
 return <>
  <label className={lab}>Graphics{hud?' ':''}<select aria-label="Graphics quality" value={c.graphics} onChange={ev=>{const v=ev.target.value;if(isGraphicsChoice(v))engine.chooseGraphics(v);}}>{GRAPHICS_CHOICES.map(v=><option key={v} value={v}>{GRAPHICS_LABELS[v]}</option>)}</select>{(c.graphics==='auto'||e.graphics!==c.graphics)&&now(GRAPHICS_LABELS[e.graphics])}</label>
  <label className={lab}>Draw distance{hud?' ':''}<select aria-label="Draw distance" value={c.draw} onChange={ev=>{const v=ev.target.value;if(isDrawChoice(v))engine.chooseDrawDistance(v);}}>{DRAW_CHOICES.map(v=><option key={v} value={v}>{DRAW_LABELS[v]}</option>)}</select>{(c.draw==='auto'||e.draw!==c.draw)&&now(DRAW_LABELS[e.draw])}</label>
  <label className={lab}>Tree detail{hud?' ':''}<select aria-label="Tree detail" title="Five steps between sparse and full. Auto starts in the middle of Low and Medium." value={String(c.trees)} onChange={ev=>{const v=ev.target.value==='auto'?'auto':Number(ev.target.value);if(isTreeChoice(v))engine.chooseTreeDetail(v);}}>{TREE_CHOICES.map(v=><option key={v} value={String(v)}>{treeLabel(v)}</option>)}</select>{(c.trees==='auto'||e.trees!==c.trees)&&now(treeLabel(e.trees))}</label>
  {n&&<p role="status" className={note} data-testid="gfx-notice">{n.text} <button type="button" onClick={()=>engine.restoreGraphics()}>Restore my setting</button></p>}
 </>;
}
