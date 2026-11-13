import {GATE_FACINGS,gateOrientation,rotateGateFacing,type GateFacing} from '../game/gateGeometry';
export function GateRotationControl({facing,onChange}:{facing:GateFacing;onChange:(facing:GateFacing)=>void}){
 const axis=gateOrientation(facing).wallAxis;
 return <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Gate direction">
  <span>Gate faces</span>
  {GATE_FACINGS.map(value=><button key={value} type="button" aria-label={`Gate faces ${value}`} aria-pressed={facing===value} title={`Face ${value}`} className={`rounded border px-2 py-1 ${facing===value?'border-bronze text-parchment':'border-bronze/30 text-parchment-dim'}`} onClick={()=>onChange(value)}>{value[0].toUpperCase()}</button>)}
  <span className="text-xs text-parchment-dim">{axis==='x'?'Joins an east–west wall':'Joins a north–south wall'}</span>
 </div>;
}
