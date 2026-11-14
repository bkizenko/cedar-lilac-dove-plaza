/** Pure storage helpers for the "Previously" recap. Failures (private window, blocked storage) simply mean no recap. */
const PREFIX='hearthwild.ui.seenLog:';
const read=(key:string):string[]|null=>{try{const v=globalThis.localStorage?.getItem(PREFIX+key);if(v===null||v===undefined)return null;const a=JSON.parse(v);return Array.isArray(a)?a.filter((x):x is string=>typeof x==='string'):null;}catch{return null;}};
export function rememberLines(key:string,log:readonly string[]){try{globalThis.localStorage?.setItem(PREFIX+key,JSON.stringify(log.slice(-12)));}catch{/* convenience only */}}
/** Lines in the current log the viewer has not seen, newest last, at most 5. First visit (nothing stored) yields none. */
export function previousLines(key:string,log:readonly string[],max=5):string[]{
 const seen=read(key);if(!seen)return [];const known=new Set(seen);return log.filter(l=>!known.has(l)).slice(-max);
}
