import {useState} from 'react';
import {RotateCcw} from 'lucide-react';
/** Restart with an explicit confirm step: one tap arms it, a second tap on Confirm abandons the current village. */
export function RestartControl({busy,onRestart}:{busy?:boolean;onRestart:()=>void}){
 const [armed,setArmed]=useState(false);
 if(!armed)return <button type="button" className="hw-btn-wide" disabled={busy} onClick={()=>setArmed(true)}><RotateCcw aria-hidden="true"/>Restart game</button>;
 return <div className="hw-row hw-restart-confirm" role="alertdialog" aria-label="Confirm restart">
  <span>Restart? The current village is abandoned. Save first to keep it.</span>
  <button type="button" className="hw-btn-wide" onClick={()=>{setArmed(false);onRestart();}}>Confirm restart</button>
  <button type="button" className="hw-btn-wide" onClick={()=>setArmed(false)}>Cancel</button>
 </div>;
}
