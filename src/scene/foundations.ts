import {expandedGrainWorkplace} from '../game/plots';
import{buildingGroundContacts,type GroundContact}from'./groundContacts';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import {TEAM_STYLE} from '../game/constants';
const groundWork=new Set(['farm','pen','dock','bridge','lumber','quarry','grove','cairn','cornerstone','palisade','gate','stonewall','trench','moat']);
const cache=new WeakMap<Building,{world:Game['world'];banks:Game['world']['bankTerrain'];height:Game['height'];contacts:readonly GroundContact[]|undefined;terrainRevision:number;team:number;heights:Float32Array;w:number;d:number;x:number;z:number;axisAligned:boolean;profile:{level:number;bottom:number}}>();
/** Rigid walls sit above their highest footprint corner; a footing fills below. */
export function foundationProfile(g:Game,b:Building){
 if(groundWork.has(b.type))return {level:b.y,bottom:b.y};
 const axisAligned=b.type==='warehouse'||expandedGrainWorkplace(b)||b.type==='watchtower'&&!!b.towerPlatform;
 const terrainRevision=g.terrainRevision?.()??g.state?.excavations?.length??0;
 const contacts=b.type==='watchtower'&&b.towerPlatform?undefined:buildingGroundContacts(b);
 const old=cache.get(b);if(old&&old.contacts===contacts&&old.world===g.world&&old.banks===g.world.bankTerrain&&old.height===g.height&&old.terrainRevision===terrainRevision&&old.team===b.team&&old.heights===g.world.heights&&old.w===b.w&&old.d===b.d&&old.x===b.x&&old.z===b.z&&old.axisAligned===axisAligned)return old.profile;
 const st=TEAM_STYLE[b.team]||TEAM_STYLE[0],yaw=axisAligned?0:st.yaw,co=Math.cos(yaw),si=Math.sin(yaw);
 const sx=axisAligned?1:st.sx,sz=axisAligned?1:st.sz;
 let top=-Infinity,bottom=Infinity;
 const take=(x:number,z:number)=>{const h=g.height(b.x+co*x*sx+si*z*sz,b.z-si*x*sx+co*z*sz);top=Math.max(top,h);bottom=Math.min(bottom,h);};
 if(contacts?.length){for(const line of contacts){const n=Math.max(1,Math.ceil(Math.hypot(line.bx-line.ax,line.bz-line.az)/.25));for(let i=0;i<=n;i++)take(line.ax+(line.bx-line.ax)*i/n,line.az+(line.bz-line.az)*i/n);}}
 else for(let iz=-2;iz<=2;iz++)for(let ix=-2;ix<=2;ix++)take(ix*b.w*.25,iz*b.d*.25);
 const profile={level:top+.03,bottom:bottom-.03};
 const value={contacts,world:g.world,banks:g.world.bankTerrain,height:g.height,terrainRevision,team:b.team,heights:g.world.heights,w:b.w,d:b.d,x:b.x,z:b.z,axisAligned,profile};cache.set(b,value);return profile;
}
