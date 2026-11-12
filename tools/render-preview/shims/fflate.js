// Harness-only stand-in for three/examples/jsm/libs/fflate.module.js (the save codec is never exercised by UI renders).
const no=()=>{throw new Error('fflate stub');};
export const zlibSync=no,unzlibSync=no,gzipSync=no,gunzipSync=no;
export function Unzlib(){no();}
export function Zlib(){no();}
export const strToU8=s=>new TextEncoder().encode(s),strFromU8=u=>new TextDecoder().decode(u);
