import {RotateCcw,RotateCw} from 'lucide-react';
/** Explicit rotate controls for the placement card: left / right buttons plus the Q, E and R keys. */
export function RotateButtons({engine,gate}:{engine:{rotatePlacementBy:(d:1|-1)=>boolean|void};gate?:boolean}){
 return <div className="hw-rotate" role="group" aria-label={gate?'Rotate gate':'Rotate building'}>
  <button type="button" className="hw-btn-wide hw-rotate-btn" aria-label="Rotate left (Q)" title="Rotate left (Q)" onClick={()=>engine.rotatePlacementBy(-1)}><RotateCcw aria-hidden="true"/>Left</button>
  <button type="button" className="hw-btn-wide hw-rotate-btn" aria-label="Rotate right (E or R)" title="Rotate right (E or R)" onClick={()=>engine.rotatePlacementBy(1)}>Right<RotateCw aria-hidden="true"/></button>
  <span className="hw-rotate-hint">Q left · E or R right</span>
 </div>;
}
