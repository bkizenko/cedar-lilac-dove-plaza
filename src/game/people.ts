import type { Unit } from "./types";
const cache = new WeakMap<Unit, ReturnType<typeof calculate>>();
export function predisposition(u:Unit) {
  let value=cache.get(u);if(!value){value=calculate(u);cache.set(u,value);}return value;
}
/** Stable identity-based predispositions: no random rerolls on loading or changing jobs. */
function calculate(u: Unit) {
  const sample=(salt:number)=>{
    let n=Math.imul(u.id ^ salt, 0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);
    return ((n^(n>>>16))>>>0)/4294967295;
  };
  const bell=(salt:number)=>(sample(salt)+sample(salt+1)+sample(salt+2))/3;
  const size=0.88+bell(101)*0.24;
  return {size, appetite:size*size, strength:size*(0.9+bell(201)*0.2),
    speed:(0.9+bell(301)*0.2)/size, fighting:0.85+bell(401)*0.3,
    trading:0.8+bell(501)*0.4};
}
