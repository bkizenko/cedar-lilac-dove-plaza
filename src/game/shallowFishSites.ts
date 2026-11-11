/** The same standing radii used by the ordinary fishing executor. */
export const FISHING_BANK_RADII=[1,2,3.5,5,6.5] as const;
export const SHALLOW_FISH_SITE_RULES={version:19,maximumSites:300,maximumDepthMetres:2.5,maximumBankHeightMetres:.5,minimumWaterDepthMetres:.04,dryClearanceMetres:.12,navigationWidth:520,maximumCellRiseMetres:2.45,lakeShoreSpacingMetres:6,lakeInsetsMetres:[1.2,2.5,4] as readonly number[]} as const;
type Terrain={size:number;height:(x:number,z:number)=>number;water:(x:number,z:number)=>number};
/** Generation admission only. The ordinary runtime fishingBank must still
 * independently find an actual clear connected worker approach before work. */
export function shallowFishSite(t:Terrain,x:number,z:number){
 const r=SHALLOW_FISH_SITE_RULES,h=t.height(x,z),surface=t.water(x,z);if(h<surface-r.maximumDepthMetres||h>surface+r.maximumBankHeightMetres)return false;
 let wet=h<=surface-r.minimumWaterDepthMetres,bank=false;const half=t.size/2,cell=t.size/r.navigationWidth;
 for(const radius of FISHING_BANK_RADII)for(let i=0;i<16;i++){
  const px=x+Math.sin(i*Math.PI/8)*radius,pz=z+Math.cos(i*Math.PI/8)*radius,ph=t.height(px,pz),pw=t.water(px,pz);if(ph<pw-r.minimumWaterDepthMetres)wet=true;
  if(!bank){const ix=Math.floor((px+half)/cell),iz=Math.floor((pz+half)/cell),cx=(ix+.5)*cell-half,cz=(iz+.5)*cell-half,ch=t.height(cx,cz);let dry=Math.max(Math.abs(cx),Math.abs(cz))<half-1.5&&ch>=t.water(cx,cz)+r.dryClearanceMetres&&Math.abs(ch-t.height(cx+cell,cz))<=r.maximumCellRiseMetres&&Math.abs(ch-t.height(cx,cz+cell))<=r.maximumCellRiseMetres;
   if(dry)for(const dz of[-.48,0,.48])for(const dx of[-.48,0,.48])if(t.height(cx+dx*cell,cz+dz*cell)<t.water(cx+dx*cell,cz+dz*cell)+r.dryClearanceMetres){dry=false;break;}if(dry)bank=true;
  }
  if(wet&&bank)return true;
 }return false;
}
