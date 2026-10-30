/** Visual shoreline follows actual water and low banks, never a radial island mask. */
export function shorelineAt(height:(x:number,z:number)=>number,x:number,z:number,water:number){
 const h=height(x,z);
 if(h<=water+.32||h>water+1.2)return false;
 return [[8,0],[-8,0],[0,8],[0,-8]].some(([dx,dz])=>height(x+dx,z+dz)<water-.05);
}
