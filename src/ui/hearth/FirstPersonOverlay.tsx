import type {Engine} from '@/game/engine';
/** Walk mode chrome: a crosshair, what it is on, and the way out. Everything else is the normal HUD. */
export function FirstPersonOverlay({engine}:{engine:Engine}){
 const label=engine.firstPersonLabel;
 return <div aria-hidden={false} style={{position:'fixed',inset:0,pointerEvents:'none',display:'grid',placeItems:'center',zIndex:4}}>
  <span aria-hidden="true" style={{width:10,height:10,borderRadius:'50%',border:'2px solid rgba(255,255,255,.9)',boxShadow:'0 0 0 1px rgba(0,0,0,.55)'}}/>
  {label&&<span role="status" style={{position:'absolute',top:'calc(50% + 24px)',maxWidth:'min(80vw,420px)',padding:'4px 10px',borderRadius:8,background:'rgba(24,20,14,.72)',color:'#f6efe0',fontSize:15,textAlign:'center'}}>{label}</span>}
  {engine.firstPersonHeld&&<span style={{position:'absolute',left:16,bottom:'max(16px,env(safe-area-inset-bottom))',padding:'4px 10px',borderRadius:8,background:'rgba(24,20,14,.72)',color:'#f6efe0',fontSize:15}}>{engine.firstPersonHeld}</span>}
  <button type="button" className="hw-btn-wide" style={{position:'absolute',bottom:'max(16px,env(safe-area-inset-bottom))',left:'50%',transform:'translateX(-50%)',pointerEvents:'auto'}} onClick={()=>engine.toggleFirstPerson()}>Walking · Y or Esc to return</button>
 </div>;
}
