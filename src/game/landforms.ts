import {mulberry32,fbm} from './rng';
import {WORLD_SIZES,WORLD_LAYOUTS,type WorldRequest,type WorldOptions} from './worldOptions';
type Lobe={x:number;z:number;rx:number;rz:number;angle:number};
/** Separate landmass topology from elevation, resources and legacy save generation. */
export function landforms(seed:number,request:WorldRequest={}) {
 if(request.size!==undefined&&!WORLD_SIZES.includes(request.size)||request.layout!==undefined&&request.layout!=='random'&&!WORLD_LAYOUTS.includes(request.layout))throw new Error('Unsupported world settings');
 const rand=mulberry32(seed^0x61cd8a9),size=request.size??1560;
 const layout=request.layout&&request.layout!=='random'?request.layout:WORLD_LAYOUTS[Math.floor(rand()*WORLD_LAYOUTS.length)];
 const options:WorldOptions={size,layout},lobes:Lobe[]=[];
 const rotation=rand()*Math.PI*2,cs=Math.cos(rotation),sn=Math.sin(rotation);
 const add=(x:number,z:number,rx:number,rz:number,angle=0)=>lobes.push({x:x*size,z:z*size,rx:rx*size,rz:rz*size,angle});
 if(layout==='pangaea'){
  for(let i=0;i<6;i++)add(-.28+i*.112,(rand()-.5)*.13,.16+rand()*.045,.16+rand()*.055,(rand()-.5)*.7);
  for(let i=0;i<3;i++)add((rand()-.5)*.55,(i%2?1:-1)*(.15+rand()*.08),.10+rand()*.06,.10+rand()*.06,rand()*Math.PI);
 }else if(layout==='continents'){
  for(const side of [-1,1]){
   const x=side*.265,z=(rand()-.5)*.15;
   for(let i=0;i<3;i++)add(x+(rand()-.5)*.035,z+(i-1)*.14,.17+rand()*.025,.17+rand()*.035,(rand()-.5)*.5);
  }
 }else{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
   const cx=x*.30+(rand()-.5)*.04,cz=z*.29+(rand()-.5)*.04;
   const angle=rand()*Math.PI,rx=.105+rand()*.025,rz=.075+rand()*.025;
   add(cx,cz,rx,rz,angle);
   add(cx+Math.sin(angle)*.055,cz+Math.cos(angle)*.055,rx*.65,rz*.75,angle+.4);
  }
 }
 const distance=(x:number,z:number)=>{
  const edge=Math.min(size*.49-Math.abs(x),size*.49-Math.abs(z));
  const a=x*cs+z*sn,b=-x*sn+z*cs;
  const wx=a+(fbm(a/size*8+seed%997,b/size*8,3)-.5)*size*.10;
  const wz=b+(fbm(a/size*8-33,b/size*8+seed%619,3)-.5)*size*.10;
  let d=-size;
  for(const l of lobes){const dx=wx-l.x,dz=wz-l.z,c=Math.cos(l.angle),s=Math.sin(l.angle);
   const px=(dx*c+dz*s)/l.rx,pz=(-dx*s+dz*c)/l.rz;
   d=Math.max(d,(1-Math.hypot(px,pz))*Math.min(l.rx,l.rz));}
  return Math.min(edge,d+(fbm(x/size*35+seed%223,z/size*35,3)-.5)*size*.035);
 };
 return {options,distance};
}
