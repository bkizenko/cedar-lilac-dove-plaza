/** Per-separation-pass membership only. Never update buckets as actors yield:
 * later queries intentionally use the original pass membership and live positions.
 * Numeric z/x keys avoid query strings; insertion retains original unit ordinals.
 * No persistent cache or retained actor references: storage is O(input length).
 */
export type SeparationMember={x:number;z:number;hp:number;boat?:{phase:string}};
export type SeparationNeighbors=Map<number,Map<number,number[]>>;
export function buildSeparationNeighbors(units:readonly SeparationMember[],cell:number):SeparationNeighbors{
 const rows:SeparationNeighbors=new Map();
 for(let i=0;i<units.length;i++){
  const u=units[i];if(u.hp<=0||u.boat?.phase==='aboard')continue;
  const x=Math.floor(u.x/cell),z=Math.floor(u.z/cell);
  let row=rows.get(z);if(!row){row=new Map();rows.set(z,row);}
  let bucket=row.get(x);if(!bucket){bucket=[];row.set(x,bucket);}
  bucket.push(i);
 }
 return rows;
}
