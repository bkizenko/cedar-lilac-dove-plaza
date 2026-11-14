import {useEffect,useRef} from 'react';
/** One Escape rule for every Hearth menu and panel: Escape closes the topmost open one and nothing else.
 *  Each open menu registers itself while mounted; the last to open is the topmost. A single window listener (capture) handles the key,
 *  so a game key such as "clear selection" is not also triggered while something is open. With nothing registered, Escape passes through. */
type Entry={close:()=>void};
const stack:Entry[]=[];
let installed=false;
export const escapeDepth=()=>stack.length;
/** Close the topmost entry. Returns false when nothing was open. */
export function closeTopmost():boolean{const top=stack[stack.length-1];if(!top)return false;top.close();return true;}
export function pushEscape(close:()=>void):()=>void{
 const e:Entry={close};stack.push(e);install();
 return()=>{const i=stack.lastIndexOf(e);if(i>=0)stack.splice(i,1);if(!stack.length)uninstall();};
}
/** Pure key test, shared with the listener and the tests. */
export const isEscape=(e:{key?:string;code?:string;defaultPrevented?:boolean;isComposing?:boolean})=>(e.key==='Escape'||e.code==='Escape')&&!e.isComposing;
const onKey=(e:KeyboardEvent)=>{
 if(!isEscape(e)||!stack.length)return;
 e.preventDefault();e.stopImmediatePropagation();closeTopmost();
};
function install(){if(installed||typeof window==='undefined')return;installed=true;window.addEventListener('keydown',onKey,true);}
function uninstall(){if(!installed||typeof window==='undefined')return;installed=false;window.removeEventListener('keydown',onKey,true);}
/** Register `onClose` as an Escape target while `enabled`. Always calls the latest callback. */
export function useEscapeClose(onClose:()=>void,enabled=true){
 const ref=useRef(onClose);ref.current=onClose;
 useEffect(()=>{if(!enabled)return;return pushEscape(()=>ref.current());},[enabled]);
}
