import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import {TEAM_STYLE} from '../game/constants';
const groundWork=new Set(['farm','pen','dock','bridge','lumber','quarry','grove','cairn','cornerstone','palisade','gate','stonewall','trench','moat']);
const cache=new WeakMap<Building,{heights:Float32Array;w:number;d:number;x:number;z:number;level:number;bottom:number}>();
/** Rigid walls sit above their highest footprint corner; a footing fills below. */
export function foundationProfile(g:Game,b:Building){
 if(groundWork.has(b.type))return {level:b.y,bottom:b.y};
 const old=cache.get(b);if(old&&old.heights===g.world.heights&&old.w===b.w&&old.d===b.d&&old.x===b.x&&old.z===b.z)return old;
 const st=TEAM_STYLE[b.team]||TEAM_STYLE[0],yaw=b.type==='warehouse'?0:st.yaw,co=Math.cos(yaw),si=Math.sin(yaw);
 const sx=b.type==='warehouse'?1:st.sx,sz=b.type==='warehouse'?1:st.sz;
 let top=-Infinity,bottom=Infinity;
 for(let iz=-2;iz<=2;iz++)for(let ix=-2;ix<=2;ix++){
  const x=ix*b.w*.25*sx,z=iz*b.d*.25*sz,h=g.height(b.x+co*x+si*z,b.z-si*x+co*z);top=Math.max(top,h);bottom=Math.min(bottom,h);
 }
 const value={heights:g.world.heights,w:b.w,d:b.d,x:b.x,z:b.z,level:top+.03,bottom:bottom-.03};cache.set(b,value);return value;
}
