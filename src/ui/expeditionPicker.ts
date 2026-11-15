/** Map-side destination picker for the send-expedition panel. A tiny shared store (the panel arms it, the minimap fills it) so no
 * game state is touched: the target is only a UI choice until the engine receives a send-expedition order. */
export type PickedTarget={x:number;z:number};
type Listener=()=>void;
const state:{armed:boolean;target:PickedTarget|null}={armed:false,target:null};
const listeners=new Set<Listener>();
const emit=()=>{for(const l of listeners)l();};
export const expeditionPicker={
 get armed(){return state.armed;},get target(){return state.target;},
 arm(on=true){state.armed=on;emit();},
 pick(x:number,z:number){if(!Number.isFinite(x)||!Number.isFinite(z))return false;state.target={x,z};state.armed=false;emit();return true;},
 clear(){state.target=null;state.armed=false;emit();},
 subscribe(l:Listener){listeners.add(l);return()=>{listeners.delete(l);};},
};
