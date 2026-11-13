/** Dugout / plank-built canoe hull: a real shell (outer skin, inner skin, rim) with an upswept pointed bow and stern, rocker, a raised gunwale,
 * ribs, two thwarts and a bow post. Replaces the box hull; same footprint (about 1.1 m beam, 2.9 m length, bow towards +Z), one merged geometry. */
import * as THREE from 'three';

export const CANOE={length:2.9,beam:1.1,depth:.34,wall:.06} as const;
type V3=[number,number,number];
export function canoeGeo():THREE.BufferGeometry{
 const pos:number[]=[],uv:number[]=[],Lh=CANOE.length/2,W=CANOE.beam/2,Dp=CANOE.depth,T=CANOE.wall,K=10,N=24;
 const tri=(a:V3,b:V3,c:V3)=>{for(const p of [a,b,c]){pos.push(p[0],p[1],p[2]);uv.push(p[0]*.8+.5,p[2]*.35+.5);}};
 const quad=(a:V3,b:V3,c:V3,d:V3)=>{tri(a,b,c);tri(a,c,d);};
 const station=(i:number,inner:boolean):V3[]=>{
  const u=-1+2*i/N,z=u*Lh,e=Math.abs(u);
  const w=Math.max(.0001,W*Math.pow(Math.max(0,1-Math.pow(e,2.3)),.5)-(inner?T:0)),d=Math.max(.0001,Dp*(1-.65*Math.pow(e,1.8))-(inner?T:0));
  const rise=.36*Math.pow(e,2.6)+.05*e*e;               // upswept ends: sheer line lifts towards bow and stern
  const out:V3[]=[];
  for(let k=0;k<=K;k++){const phi=-Math.PI/2+Math.PI*k/K;out.push([w*Math.sin(phi),-d*Math.pow(Math.max(0,Math.cos(phi)),.85)+rise+.18,z]);}
  return out;
 };
 const outer=Array.from({length:N+1},(_,i)=>station(i,false)),inner=Array.from({length:N+1},(_,i)=>station(i,true));
 for(let i=0;i<N;i++){
  for(let k=0;k<K;k++){
   quad(outer[i][k],outer[i+1][k],outer[i+1][k+1],outer[i][k+1]);                  // outer skin
   quad(inner[i][k+1],inner[i+1][k+1],inner[i+1][k],inner[i][k]);                  // inner skin (faces the cargo well)
  }
  // rim: the gunwale joining both skins on each side
  quad(outer[i][K],outer[i+1][K],inner[i+1][K],inner[i][K]);
  quad(inner[i][0],inner[i+1][0],outer[i+1][0],outer[i][0]);
 }
 const box=(cx:number,cy:number,cz:number,w:number,h:number,d:number)=>{
  const x0=cx-w/2,x1=cx+w/2,y0=cy-h/2,y1=cy+h/2,z0=cz-d/2,z1=cz+d/2;
  quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);quad([x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1]);
  quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);quad([x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1]);
  quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]);quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);
 };
 // thwarts (cross seats) resting on the rim, ribs along the inner floor, bow and stern posts
 for(const z of [-.45,.5])box(0,.29,z,CANOE.beam*.8,.045,.22);
 for(let i=-4;i<=4;i++)box(0,.18-Dp+.06,i*.28,CANOE.beam*.42,.03,.05);
 for(const s of [-1,1])box(0,.5+.12,s*(Lh-.04),.06,.26,.1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
