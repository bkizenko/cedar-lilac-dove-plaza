/** Felled trees leave cut logs on the ground (B30 follow-up). Purely derived from the tree's existing fields, so nothing new is
 *  saved or simulated: a fallen tree (felledAt set, wood left) holds ceil(amount / LOG_WOOD) logs, and every cut that takes wood
 *  from it removes one log's worth until the last log is gone and the tree becomes a stump. A carrier lifts one log load at a
 *  time (the shoulder or pole load drawn by the people layer is that log). Deterministic: positions come from the tree id only. */
export const FELL_LOG_RULES={woodPerLog:7,maxLogs:6,length:2.1,radius:.13,/** metres the log pile lies off the trunk axis */offset:.75,viewMetres:130} as const;
export type FellTree={id:number;x:number;y:number;z:number;amount:number;felledAt?:number;scale?:number;kind?:string;planted?:boolean};
export type LogPose={x:number;y:number;z:number;yaw:number;length:number;radius:number};
export const isFallen=(t:Pick<FellTree,'felledAt'|'amount'>)=>t.felledAt!==undefined&&t.amount>0;
/** Logs still lying beside a fallen tree. */
export function logsLeft(t:Pick<FellTree,'felledAt'|'amount'>):number{
 if(!isFallen(t))return 0;return Math.min(FELL_LOG_RULES.maxLogs,Math.ceil(t.amount/FELL_LOG_RULES.woodPerLog));
}
const h=(id:number,k:number)=>{let x=(Math.imul(id|0,0x9e3779b1)^Math.imul(k+1,0x85ebca6b))>>>0;x=Math.imul(x^(x>>>15),0x2c1b3c6d)>>>0;return (x^(x>>>12))/4294967296%1;};
/** Pose of log `i` of `n` for a fallen tree: side by side, parallel, stacked on the third. Stable for a given id and index. */
export function logPose(t:FellTree,i:number):LogPose{
 const yaw=h(t.id,0)*Math.PI,R=FELL_LOG_RULES,row=i%3,tier=Math.floor(i/3),side=(row-1)*R.radius*2.1+R.offset;
 const nx=Math.cos(yaw),nz=-Math.sin(yaw),along=(h(t.id,i+1)-.5)*.5;
 return {x:t.x+nx*side+Math.sin(yaw)*along,y:t.y+R.radius*(1+tier*1.7),z:t.z+nz*side+Math.cos(yaw)*along,yaw,length:R.length*(.86+h(t.id,i+9)*.28),radius:R.radius*(.9+h(t.id,i+17)*.2)};
}
/** Every log to draw near the viewer, nearest trees first, within an instance cap. */
export function visibleLogs(trees:readonly FellTree[],cam:{x:number;z:number},cap=300):LogPose[]{
 const R=FELL_LOG_RULES,out:LogPose[]=[],m2=R.viewMetres*R.viewMetres;
 for(const t of trees){if(out.length>=cap)break;if(t.felledAt===undefined||t.amount<=0)continue;const dx=t.x-cam.x,dz=t.z-cam.z;if(dx*dx+dz*dz>m2)continue;
  const n=logsLeft(t);for(let i=0;i<n&&out.length<cap;i++)out.push(logPose(t,i));}
 return out;
}
