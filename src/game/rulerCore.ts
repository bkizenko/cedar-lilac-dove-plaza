/** Shared pure helpers for the rulers / dynasty lane: seeded randomness, bands, small math.
 * No game state, no Date.now, no Math.random: every function is a pure function of its inputs. */
export type Rng=()=>number;

export function hash32(...parts:(number|string)[]):number{
 let h=0x811c9dc5;
 for(const p of parts){const s=String(p);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}h^=0x2c;h=Math.imul(h,0x01000193);}
 return h>>>0;
}
export function makeRng(seed:number):Rng{
 let a=seed>>>0;
 return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
export const clamp=(x:number,lo=0,hi=100)=>x<lo?lo:x>hi?hi:x;
export const clamp01=(x:number)=>clamp(x,0,1);
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const round=(x:number,d=2)=>{const m=10**d;return Math.round(x*m)/m;};
/** Standard normal via Box-Muller. */
export function gauss(r:Rng):number{let u=0;while(u===0)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
export const normal=(r:Rng,mean:number,sd:number,lo=0,hi=100)=>clamp(mean+gauss(r)*sd,lo,hi);
export function pick<T>(r:Rng,xs:readonly T[]):T{return xs[Math.min(xs.length-1,Math.floor(r()*xs.length))];}
export function weighted<T>(r:Rng,items:readonly (readonly [T,number])[]):T{
 let total=0;for(const it of items)total+=Math.max(0,it[1]);
 if(total<=0)return items[0][0];
 let x=r()*total;
 for(const it of items){x-=Math.max(0,it[1]);if(x<=0)return it[0];}
 return items[items.length-1][0];
}
/** Scale non-negative weights so they sum to 1 (uniform when all are zero). */
export function normalize<K extends string>(w:Record<K,number>):Record<K,number>{
 const keys=Object.keys(w) as K[];let s=0;for(const k of keys)s+=Math.max(0,w[k]);
 const out={} as Record<K,number>;for(const k of keys)out[k]=s>0?Math.max(0,w[k])/s:1/keys.length;return out;
}
export type Band=0|1|2|3|4;
export const BAND_LABELS=['very low','low','middling','high','very high'] as const;
export const bandOf=(v:number):Band=>Math.min(4,Math.max(0,Math.floor(v/20))) as Band;
/** Deterministic unit value in [0,1) from arbitrary parts. */
export const unitOf=(...parts:(number|string)[])=>makeRng(hash32(...parts))();
