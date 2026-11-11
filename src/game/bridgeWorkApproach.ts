import type {Game} from './sim';
import type {Building,Unit} from './types';
export const BRIDGE_WORK_APPROACH_RULES={outwardMetres:[0,.75,1.5,2.5],lateralMetres:[0,-.75,.75],dryClearanceMetres:.28,segmentSpacingMetres:.5} as const;
/** Workers build from their reachable dry bank, never the unfinished deck.
 * Endpoint survey points may share a conservative navigation cell with water;
 * sample a small frontage behind each bank without moving the saved span. */
export function bridgeWorkApproach(g:Game,u:Unit,b:Building){
 const s=b.bridge;if(!s)return null;
 const dx=s.bx-s.ax,dz=s.bz-s.az,length=Math.hypot(dx,dz);if(length<1e-8)return null;
 const R=BRIDGE_WORK_APPROACH_RULES,candidates:{x:number;z:number;bankX:number;bankZ:number}[]=[];
 for(const [x,z,sign]of[[s.ax,s.az,-1],[s.bx,s.bz,1]])for(const outward of R.outwardMetres)for(const lateral of R.lateralMetres)candidates.push({x:x+sign*dx/length*outward+dz/length*lateral,z:z+sign*dz/length*outward-dx/length*lateral,bankX:x,bankZ:z});
 candidates.sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z));
 for(const p of candidates){
  if(!g.walkable(p.x,p.z)||g.height(p.x,p.z)<=g.waterAt(p.x,p.z)+R.dryClearanceMetres||!g.workBoard.connected(g,u.x,u.z,p.x,p.z))continue;
  const steps=Math.max(1,Math.ceil(Math.hypot(p.x-p.bankX,p.z-p.bankZ)/R.segmentSpacingMetres));let clear=true;
  // Validate the complete dry work strip to the actual bank, including this
  // actor's body, rather than admitting a dry point across a water pocket.
  let probe={...u,x:p.x,z:p.z,y:g.travelHeight(p.x,p.z)};
  for(let i=0;i<=steps;i++){const x=p.x+(p.bankX-p.x)*i/steps,z=p.z+(p.bankZ-p.z)*i/steps;if(g.height(x,z)<=g.waterAt(x,z)+R.dryClearanceMetres||!g.canStep(probe,x,z)){clear=false;break;}probe={...probe,x,z,y:g.travelHeight(x,z)};}
  if(clear)return{x:p.x,z:p.z};
 }
 return null;
}
