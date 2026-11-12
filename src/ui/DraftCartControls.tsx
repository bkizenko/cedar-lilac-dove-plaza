import type{Engine}from'../game/engine';
import type{Unit}from'../game/types';
import type{EngineDispatchCommand}from'../game/engineDispatch';
import{useOwnerReadModels}from'./useOwnerReadModels';
import{DRAFT_CART_RULES}from'../game/draftCart';
export function DraftCartControls({engine,people,run}:{engine:Engine;people:Unit[];run:(c:EngineDispatchCommand)=>Promise<void>}){
 const read=useOwnerReadModels(engine,people.map(u=>({kind:'draft-cart-choices' as const,unitId:u.id}))),button='rounded border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50';
 return <>{people.map(u=>{const reply=read({kind:'draft-cart-choices',unitId:u.id}),m=reply.model;if(!m||!u.draftCartOrder&&!u.draftCart&&!['horse','cattle'].includes(u.packAnimal?.species||'')&&!m.loose.length)return null;const w=m.work,issue=reply.issue||(u.draftCart?m.detach:m.hitch);return <div key={u.id} className="flex flex-wrap items-center gap-2 text-xs" aria-label="Draft cart">
 {w?<><span>{w.mode==='hitch'?'Fit cart':w.mode==='detach'?'Unhitch cart':'Recover cart'} · {Math.floor(w.progress/(w.mode==='hitch'?DRAFT_CART_RULES.fittingSeconds:DRAFT_CART_RULES.detachSeconds)*100)}%</span><button className={button} onClick={()=>run({kind:'pause-draft-cart',unitId:u.id,paused:!w.paused})}>{w.paused?'Resume':'Pause'}</button><button className={button} onClick={()=>run({kind:'cancel-draft-cart',unitId:u.id})}>Cancel</button></>:<><button className={button} disabled={!!issue} title={issue||`Fitting uses ${DRAFT_CART_RULES.wood} logs and ${DRAFT_CART_RULES.cordage} cordage. Bring the actual handcart owner nearby; both walk to the crafting shelter.`} onClick={()=>run({kind:'draft-cart',unitId:u.id,mode:u.draftCart?'detach':'hitch'})}>{u.draftCart?'Unhitch cart':`Fit draft cart · ${DRAFT_CART_RULES.wood} logs · ${DRAFT_CART_RULES.cordage} cordage`}</button>{m.loose.map(c=><button key={c.id} className={button} disabled={!!c.issue} title={c.issue||'Walk to recover the same dropped cart'} onClick={()=>run({kind:'recover-draft-cart',unitId:u.id,cartId:c.id})}>Recover cart #{c.id}</button>)}</>}
 </div>;})}</>;
}
