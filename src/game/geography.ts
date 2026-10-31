import {composedGeography} from './composedGeography';
import {regionalGeography} from './regionalGeography';
import {mulberry32,fbm} from './rng';
export type LandFeature={kind:'mountain-range'|'plateau'|'valley'|'lake'|'bay'|'cove'|'hills'|'canyon'|'cliff'|'terrace'|'pillars'|'dunes'|'wetland'|'waterfall';x:number;z:number;radius:number;shape?:{rx:number;rz:number;rotation:number}};
type Point={x:number;z:number};
const distanceToPath=(x:number,z:number,path:Point[])=>{
 let best=Infinity;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
 }
 return best;
};
/** Geographic forms share a watershed instead of independently stamped circles. */
export function geography(seed:number,size:number,landDistance:(x:number,z:number)=>number,rolling=false,composed=false,complete=false){
 if(complete)return composedGeography(seed,size,landDistance);
 if(composed)return regionalGeography(seed,size,landDistance);
 const rand=mulberry32(seed^0x432aac1),core:Point[]=[],coasts:Point[]=[];
 for(let z=-size*.46;z<size*.46;z+=24)for(let x=-size*.46;x<size*.46;x+=24){
  const d=landDistance(x,z);if(d>68)core.push({x,z});else if(d> -8&&d<12)coasts.push({x,z});
 }
 if(!core.length||!coasts.length)throw new Error('No geographic interior or coastline');
 const lake=core[Math.floor(rand()*core.length)];
 const mouth=[...coasts].sort((a,b)=>Math.hypot(a.x-lake.x,a.z-lake.z)-Math.hypot(b.x-lake.x,b.z-lake.z))[0];
 const dx=mouth.x-lake.x,dz=mouth.z-lake.z,len=Math.hypot(dx,dz)||1;
 const peak=core.filter(p=>Math.hypot(p.x-lake.x,p.z-lake.z)>75).sort((a,b)=>Math.hypot(a.x-lake.x,a.z-lake.z)-Math.hypot(b.x-lake.x,b.z-lake.z))[0]||core[0];
 const plateau=[...core].sort((a,b)=>Math.hypot(b.x-peak.x,b.z-peak.z)-Math.hypot(a.x-peak.x,a.z-peak.z))[0];
 const angle=rand()*Math.PI,cs=Math.cos(angle),sn=Math.sin(angle);
 const rangeLength=Math.min(rolling?250:150,size*(rolling?.16:.105)),rangeWidth=(rolling?55:27)+rand()*(rolling?30:17),peakHeight=(rolling?40:50)+rand()*30;
 const lakeRadius=28+rand()*15,plateauRadius=45+rand()*22,plateauHeight=15+rand()*7;
 const end={x:mouth.x+dx/len*40,z:mouth.z+dz/len*40};
 const river=Array.from({length:19},(_,i)=>{
  const t=i/18,offset=Math.sin(t*Math.PI*2)*Math.sin(t*Math.PI)*Math.min(24,len*.14);
  return {x:lake.x+(end.x-lake.x)*t-dz/len*offset,z:lake.z+(end.z-lake.z)*t+dx/len*offset};
 });
 // Carve inlets from existing sea into land, with a wide inner bay and narrow cove.
 const makeInlet=(coast:Point,width:number,depth:number)=>{
  const eps=8,gx=landDistance(coast.x+eps,coast.z)-landDistance(coast.x-eps,coast.z),gz=landDistance(coast.x,coast.z+eps)-landDistance(coast.x,coast.z-eps);
  const g=Math.hypot(gx,gz)||1,nx=gx/g,nz=gz/g;
  return {path:[{x:coast.x-nx*35,z:coast.z-nz*35},{x:coast.x,z:coast.z},{x:coast.x+nx*depth-nz*width*.4,z:coast.z+nz*depth+nx*width*.4}],width};
 };
 const bayCoast=coasts[Math.floor(rand()*coasts.length)];
 const coveCoast=[...coasts].sort((a,b)=>Math.hypot(b.x-bayCoast.x,b.z-bayCoast.z)-Math.hypot(a.x-bayCoast.x,a.z-bayCoast.z))[0];
 const bay=makeInlet(bayCoast,35,55),cove=makeInlet(coveCoast,14,28);
 const features:LandFeature[]=[
  {kind:'mountain-range',...peak,radius:rangeLength},{kind:'plateau',...plateau,radius:plateauRadius},
  {kind:'valley',x:(peak.x+lake.x)/2,z:(peak.z+lake.z)/2,radius:28},
  {kind:'lake',...lake,radius:lakeRadius},{kind:'bay',...bayCoast,radius:35},{kind:'cove',...coveCoast,radius:14}
 ];
 const tributary=Array.from({length:12},(_,i)=>{const t=.3+.7*i/11,offset=Math.sin(i/11*Math.PI*2)*5;return {x:peak.x+(lake.x-peak.x)*t+offset,z:peak.z+(lake.z-peak.z)*t-offset};});
 return {features,rivers:[{pts:river,w:Math.max(14+rand()*8,size/256*3.5)},{pts:tributary,w:Math.max(7,size/256*1.6)}],
  coast(x:number,z:number,d:number){
   return Math.min(d,distanceToPath(x,z,bay.path)-bay.width,distanceToPath(x,z,cove.path)-cove.width);
  },
  elevation(x:number,z:number,h:number,water:number){
   if(rolling){
    const inland=Math.max(0,Math.min(1,landDistance(x,z)/45));
    const broad=fbm(x*.0035+seed%271,z*.0035-81,4);
    const folded=1-Math.abs(fbm(x*.007-37,z*.007+seed%431,3)*2-1);
    h+=inland*(broad*15+folded*folded*9);
   }
   const px=x-peak.x,pz=z-peak.z,along=px*cs+pz*sn,across=-px*sn+pz*cs;
   const spine=across-Math.sin(along*.018)*rangeWidth*.35;
   h+=peakHeight*Math.exp(-spine*spine/(rangeWidth*rangeWidth))*Math.max(0,1-Math.abs(along)/rangeLength)**.65;
   const sx=x-plateau.x,sz=z-plateau.z;
   const shelf=Math.hypot(sx/plateauRadius,sz/(plateauRadius*.75))+(fbm(x*.035+seed%331,z*.035,2)-.5)*.18;
   if(shelf<1){const blend=Math.min(1,(1-shelf)/.22);h=h*(1-blend)+(plateauHeight+fbm(x*.02,z*.02,2)*.4)*blend;}
   const valley=distanceToPath(x,z,[peak,lake]);
   if(valley<25){const blend=(1-valley/25)*.8;h=h*(1-blend)+(water+1.4)*blend;}
   const basin=Math.hypot((x-lake.x)/lakeRadius,(z-lake.z)/(lakeRadius*.72));
   if(basin<1.35){const blend=Math.min(1,(1.35-basin)/.35);h=h*(1-blend)+(water-1.4)*blend;}
   return h;
  }
 };
}
