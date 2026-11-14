/** Fish for a fishing-ground node, from real state only: the node's id picks the fish (trout/salmon, carp, pike, eel), its remaining stock sets how
 * many are shown (a depleted ground shows none), the clock moves them. Small fish school (a loose rotating shoal with a shared heading wave),
 * big ones cruise alone; every few seconds one fish rises to the surface (ripple ring) and now and then a trout leaps clear. Pure and deterministic. */
import {hashSeed,seededRandom} from './buildingParts';

export type FishKind='trout'|'carp'|'pike'|'eel';
export type FishNode={id:number;x:number;z:number;amount:number;maxAmt?:number;scale?:number};
export type ShoalFish={kind:FishKind;x:number;z:number;facing:number;phase:number;/** metres below the surface (negative while leaping) */depth:number;size:number;
 /** pitch about the lateral axis during a leap (radians, nose up positive) */pitch:number;leaping:boolean;speed:number};
export type Ripple={x:number;z:number;age:number;life:number;radius:number};
export const kindFor=(id:number):FishKind=>{const h=hashSeed(id,'fish')%100;return h<44?'trout':h<72?'carp':h<84?'pike':'eel';};
export const fishCount=(kind:FishKind,amount:number,max=40)=>{
 if(!(amount>=1))return 0;const stock=Math.min(1,amount/Math.max(8,max));
 return kind==='trout'?Math.max(3,Math.round(3+stock*6)):kind==='carp'?Math.max(1,Math.round(1+stock*2.4)):kind==='pike'?1+(stock>.7?1:0):1+(stock>.5?1:0);
};
export function shoalFor(n:FishNode,t:number):{fish:ShoalFish[];ripples:Ripple[]}{
 const kind=kindFor(n.id),count=fishCount(kind,n.amount,n.maxAmt),fish:ShoalFish[]=[],ripples:Ripple[]=[];
 if(!count)return {fish,ripples};
 const r0=seededRandom(hashSeed(n.id,'shoal')),sc=n.scale??1,lenScale=kind==='trout'?.8+.4*r0():.9+.4*r0();
 const radius=(kind==='trout'?1.6:kind==='carp'?2.4:kind==='pike'?3.2:2)*(.8+.4*r0());
 const wob=(k:number,s:number)=>Math.sin(t*s+k*1.7+n.id);
 const jumpEvery=11+n.id%9,jumpSlot=Math.floor((t+n.id%5)/jumpEvery),jumpT=((t+n.id%5)%jumpEvery);
 for(let k=0;k<count;k++){
  const r=seededRandom(hashSeed(n.id,'f',k)),ph=r()*Math.PI*2,om=(kind==='trout'?.55:kind==='carp'?.3:kind==='pike'?.22:.28)*(.9+.2*r())*(k%2?1:1),rad=radius*(.55+.5*r());
  // school members share one orbit direction and trail each other; solitary fish wander on a slow figure of eight
  const th=t*om+ph*(kind==='trout'?.35:1),ex=kind==='trout'?1:1.4;
  const x=n.x+Math.cos(th)*rad*ex+wob(k,.7)*.3,z=n.z+Math.sin(th)*rad+wob(k,.9)*.3;
  const vx=-Math.sin(th)*rad*ex*om,vz=Math.cos(th)*rad*om;
  const facing=Math.atan2(-vz,vx);
  const speed=Math.hypot(vx,vz);
  const rise=(jumpSlot%Math.max(1,count))===k&&jumpT<1.2;
  let depth=.2+.12*r()+.04*wob(k,1.1),pitch=0,leaping=false;
  if(rise&&kind==='trout'&&jumpSlot%2===0){const u=jumpT/1.2;depth=-(1-(2*u-1)**2)*.55;pitch=(1-2*u)*.9;leaping=true;}
  else if(rise){depth=Math.max(.04,.2-.16*Math.sin(Math.PI*jumpT/1.2));}   // slow rise to dimple the surface
  fish.push({kind,x,z,facing,phase:(t*(kind==='eel'?1.3:kind==='trout'?2.2:1.5)*(.8+.4*r())+ph)%1000,depth,size:sc*lenScale*(.8+.35*r()),pitch,leaping,speed});
  if(rise&&jumpT<1.2)ripples.push({x,z,age:jumpT,life:1.8,radius:.35+.8*jumpT});
 }
 // every fish, not a few, carries its own pulsing ring on the surface so each one reads as a catchable fish (rings breathe out of phase)
 fish.forEach((f,i)=>{if(!f.leaping)ripples.push({x:f.x,z:f.z,age:((t*.6+i*.37+(f.x*7.1%1+1)%1)%1)*.9,life:1,radius:.22*Math.max(.8,f.size)});});
 return {fish,ripples};
}
