/** Workplace and civic props (pure): the trade-specific kit that makes a smithy, kiln, tannery, loom shed, drying rack, sawyer, oven, market, temple, stable, quay,
 * tower, gate and palisade read as that building at close and mid zoom, in the same detail grammar as dwellings (seeded per building, wear-aware, props leaning
 * on the walls, nothing floating, every part inside the footprint and above ground). Runs on the Village-family spec BEFORE the skin tint, so under a CivSkin the
 * props take that society's own swatches (iron, cloth, thatch, mud, stone ids are repainted per civ by villageRetint). Props that carry the silhouette are lod 1
 * (capped to 140 mid triangles); the rest are near-only; the finished near tier is held under the near-detail ceiling. */
import {hashSeed,part,partBounds,partTriangles,pick,range,seededRandom,specTriangles,type BuildingSpec,type Part,type Rng} from './buildingParts';

type V=[number,number,number];
let enabled=true;export const setWorksDetail=(on:boolean)=>{enabled=!!on;};export const getWorksDetail=()=>enabled;
const KIT_OF_FAMILY:Record<string,string>={church:'temple',marketStalls:'market',stables:'stables',pier:'quay',tower:'tower',gate:'gate',palisade:'palisade',hearth:'hearth',millHouse:'mill',college:'college',keep:'tower'};
const KIT_OF_TRADE:Record<string,string>={forge:'forge',kiln:'kiln',pottery:'kiln',oven:'oven',loom:'loom',rack:'rack',saw:'saw',smoke:'rack',bench:'bench'};
export const WORKS_BUDGET={nearCeiling:2300,maxAdded:520,maxMid:140};
/** The kit a spec gets, or null (field plots, pens, water works and ruins are left to their own generators). */
export function kitFor(family:string,trade?:string):string|null{if(family==='workshop')return KIT_OF_TRADE[trade??'bench']??'bench';return KIT_OF_FAMILY[family]??null;}
export function dressWorks(spec:BuildingSpec,trade?:string,wear=.3,wealth=.4):BuildingSpec{
 if(!enabled)return spec;const kit=kitFor(spec.family,trade);if(!kit)return spec;
 const r:Rng=seededRandom(hashSeed('works',spec.variantKey)),fw=spec.footprint.w/2-.12,fd=spec.footprint.d/2-.12,base=specTriangles(spec,0),budget=Math.max(0,Math.min(WORKS_BUDGET.maxAdded,WORKS_BUDGET.nearCeiling-base));
 if(budget<40)return spec;
 let mass={minX:1e9,maxX:-1e9,minZ:1e9,maxZ:-1e9};for(const p of spec.parts){if(p.lod<2||p.pos[1]>.6||p.size[1]<.8)continue;const b=partBounds(p);mass={minX:Math.min(mass.minX,b.minX),maxX:Math.max(mass.maxX,b.maxX),minZ:Math.min(mass.minZ,b.minZ),maxZ:Math.max(mass.maxZ,b.maxZ)};}
 if(mass.maxX<=mass.minX)mass={minX:-fw*.6,maxX:fw*.6,minZ:-fd*.6,maxZ:fd*.6};
 const out:Part[]=[];let used=0,mid=0;const ex=spec.entry?.x??0;
 const put=(p:Part)=>{const t=partTriangles(p),b=partBounds(p);if(used+t>budget||b.minX<-fw||b.maxX>fw||b.minZ<-fd||b.maxZ>fd||b.minY<-.001)return false;if(p.lod===1){if(mid+t>WORKS_BUDGET.maxMid)return false;mid+=t;}used+=t;out.push(p);return true;};
 const box=(m:string,s:V,pos:V,lod:0|1=0,rot?:V)=>put(part('box',m as never,s,pos,lod,rot)),cyl=(m:string,d:number,h:number,pos:V,lod:0|1=0,sides=7,top?:number,rot?:V)=>put(part('cylinder',m as never,[d,h,top??d],pos,lod,rot,sides)),cone=(m:string,d:number,h:number,pos:V,lod:0|1=0,sides=7)=>put(part('cone',m as never,[d,h,d],pos,lod,undefined,sides));
 const side=r()<.5?-1:1,flank=(e:number)=>side*(mass.maxX+e),front=(e:number)=>mass.maxZ+e,rear=(e:number)=>mass.minZ-e;
 const awayFromDoor=(x:number)=>Math.abs(x-ex)<.9?x+(x>=ex?1:-1)*1.0:x;
 const log=(x:number,z:number,y:number,len:number,rot=0)=>cyl('woodDark',.2,len,[x,y,z],0,6,undefined,[0,rot,Math.PI/2]);
 switch(kit){
  case 'forge':{box('stone',[.9,.5,.9],[flank(.55),0,front(-.5)],1);cyl('iron',.5,.3,[flank(.55),.5,front(-.5)],0,6);box('iron',[.5,.22,.18],[flank(.55),.5,front(-.5)],0);
   box('woodDark',[1.3,.5,.55],[flank(.7),0,rear(-1.2)],0);box('stone',[1.2,.36,.5],[flank(.75),.5,rear(-1.2)],0);cone('recess',.9,.4,[awayFromDoor(-side*(mass.maxX-.5)),0,front(.5)],0);
   box('stoneDark',[.7,2.0,.7],[side*(mass.maxX-.45),0,rear(-.6)],1);box('recess',[.55,.22,.55],[side*(mass.maxX-.45),2.0,rear(-.6)],0);break;}
  case 'kiln':{for(let i=0;i<3;i++)cyl(i%2?'mud':'clothRed',.4,.5,[awayFromDoor(flank(.45)+i*.1),0,front(.4+i*.34)],0,7,.3);cone('mud',1.3,.9,[flank(1.0),0,rear(-.6)],1,8);cyl('woodMid',.18,1.0,[flank(.45),0,front(-.4)],0,6,undefined,[0,0,Math.PI/2]);
   for(let i=0;i<4;i++)log(awayFromDoor(-side*(mass.maxX-.2)),front(.4+i*.01),.1+(i%2)*.18,.9,0);cyl('stone',.6,.8,[side*(mass.maxX-.6),0,rear(-.6)],1,8,.45);break;}
  case 'oven':{cyl('mud',1.1,.7,[flank(.8),0,front(-.1)],1,8,.8);box('recess',[.4,.3,.12],[flank(.8),.15,front(.4)],0);for(let i=0;i<3;i++)log(awayFromDoor(-side*(mass.maxX-.3)),front(.5),.1+i*.17,.8,Math.PI/2);box('woodMid',[.3,.05,1.0],[flank(.2),.7,front(.3)],0);break;}
  case 'loom':{const x=flank(.9);for(const s of[-1,1])box('woodMid',[.1,1.6,.1],[x+s*.55,0,front(.2)],1);box('woodMid',[1.2,.1,.1],[x,1.5,front(.2)],1);box('woodDark',[1.2,.1,.1],[x,.4,front(.2)],0);for(let i=0;i<5;i++)box(i%2?'clothRed':'cloth',[.08,.9,.02],[x-.45+i*.22,.5,front(.2)],0);
   cyl('straw',.5,.35,[awayFromDoor(-side*(mass.maxX-.2)),0,front(.5)],0,8);box('clothBlue',[.5,.5,.5],[awayFromDoor(-side*(mass.maxX-.8)),0,front(.4)],0,[0,.3,0]);break;}
  case 'rack':{const x=flank(1.0),n=pick(r,[2,3]);for(let i=0;i<=n;i++)box('woodMid',[.09,1.6,.09],[x-.7+i*1.4/n,0,front(.7)],1);box('woodMid',[1.5,.08,.08],[x,1.5,front(.7)],1);box('woodMid',[1.5,.08,.08],[x,.8,front(.7)],0);
   for(let i=0;i<5;i++)box(i%2?'clothRed':'cloth',[.14,.5+r()*.25,.05],[x-.6+i*.3,1.0-.05,front(.7)],0);box('woodDark',[.5,.4,.5],[awayFromDoor(-side*(mass.maxX-.4)),0,front(.5)],0);break;}
  case 'saw':{for(let i=0;i<6;i++)log(awayFromDoor(flank(.5)),front(.3+(i%3)*.01),.1+Math.floor(i/3)*.2,range(r,1.6,2.4)+0,0);box('woodMid',[.9,.7,.1],[flank(1.4),0,rear(-.8)],1,[0,0,.25]);box('woodMid',[.1,.7,.9],[flank(1.4),0,front(-.4)],0);cone('straw',.9,.25,[awayFromDoor(-side*mass.maxX),0,front(.7)],0);break;}
  case 'temple':{for(const s of[-1,1]){cyl('stone',.55,.9,[awayFromDoor(ex+s*1.9),0,front(.7)],1,8,.45);cyl('recess',.35,.1,[ex+s*1.9,.9,front(.7)],0,8);}box('stone',[3.4,.2,1.2],[ex,0,front(.7)],1);for(let i=0;i<2;i++)box('clothRed',[.08,1.7,.5],[ex+(i?1:-1)*2.6,0,front(.9)],0);cyl('stoneDark',.4,.35,[flank(.6),0,rear(-.5)],0,7);break;}
  case 'market':{const n=Math.round(range(r,2,4));for(let i=0;i<n;i++){const x=cl(-fw*.7+i*(fw*1.4)/Math.max(1,n-1)+(r()-.5)*.5,fw-.4);box(pick(r,['woodLight','woodMid']),[.7,.4,.5],[x,0,front(.5)],0,[0,(r()-.5)*.6,0]);if(r()<.6)box(pick(r,['cloth','clothRed','clothBlue']),[.4,.28,.3],[x,.4,front(.5)],0);}
   cyl('woodDark',.45,.6,[awayFromDoor(-fw*.8),0,rear(-.7)],0,8,.4);box('cloth',[.5,.35,.35],[awayFromDoor(fw*.75),0,rear(-.7)],0,[0,.4,0]);for(let i=0;i<3;i++)cyl('straw',.34,.28,[-fw*.4+i*.4,0,front(.2)],0,7);break;}
  case 'stables':{box('straw',[range(r,.7,1.2),range(r,.4,.8),range(r,.5,.8)],[flank(.7),0,front(-.5)],1,[0,(r()-.5)*.6,0]);box('woodDark',[range(r,1.1,1.7),.4,.4],[awayFromDoor(-side*(mass.maxX-.8)),0,front(.5)],0);box('woodMid',[1.4,.08,.08],[awayFromDoor(flank(.4)),1.0,front(.9)],0);for(const s of[-1,1])box('woodMid',[.1,1.1,.1],[awayFromDoor(flank(.4))+s*.7,0,front(.9)],0);break;}
  case 'quay':{for(let i=0;i<3;i++)cyl('woodDark',.3,.8,[-fw*.7+i*fw*.7,0,front(.3)],0,6);cyl('cloth',.5,.12,[fw*.4,0,front(.2)],0,8);box('woodMid',[.8,.5,.6],[-fw*.3,0,rear(-.9)],1);box('woodDark',[.6,.4,.5],[fw*.5,0,rear(-.9)],0,[0,.5,0]);break;}
  case 'tower':{box('woodDark',[.9,.5,.7],[flank(.6),0,front(.3)],0);cyl('iron',.5,.25,[flank(.6),.5,front(.3)],0,8);box('clothRed',[.06,1.4,.5],[side*(mass.maxX-.2),0,front(.1)],0);break;}
  case 'gate':{for(const s of[-1,1]){box('iron',[.12,.12,.12],[ex+s*range(r,1.1,1.5),range(r,1.4,1.8),front(.05)],0);cyl('woodDark',.12,range(r,1.0,1.6),[ex+s*range(r,1.4,1.8),0,front(.2)],0,5);}box('stoneDark',[.8,.3,.5],[ex,0,front(.6)],0);break;}
  case 'palisade':{
   // Lashings sit on real stakes only: a join mask (wall continues one way) or a gate gap removes stakes, so x/z come from the stakes that exist.
   const stakes=spec.parts.filter(p=>p.shape==='cylinder'&&p.pos[1]<.05&&p.size[1]>1.5);
   if(!stakes.length)break;const n=Math.round(range(r,3,6));
   for(let i=0;i<n;i++){const st=pick(r,stakes);box(pick(r,['woodDark','woodMid']),[.14,range(r,.35,.7),.14],[st.pos[0]+(r()-.5)*.1,range(r,1.7,2.1),st.pos[2]+.1],0,[(r()-.5)*.3,0,(r()-.5)*.3]);}
   break;}
  case 'hearth':{for(let i=0;i<4;i++)cyl('stoneDark',.3,.2,[Math.sin(i*1.57)*.7,0,Math.cos(i*1.57)*.7+front(.8)],0,6);log(flank(.6),front(.4),.12,.9,0.4);break;}
  case 'mill':{for(let i=0;i<3;i++)box('cloth',[.45,.34,.3],[awayFromDoor(-side*(mass.maxX-.5))+i*.28,0,front(.4)],0,[0,i*.4,0]);cyl('stone',1.1,.25,[flank(.9),0,front(.8)],1,9);cyl('stoneDark',.25,.3,[flank(.9),.25,front(.8)],0,6);break;}
  case 'college':{for(const s of[-1,1])box('stone',[.5,.5,.5],[ex+s*2.0,0,front(.6)],0);box('woodMid',[.8,.45,.35],[flank(.7),0,front(.5)],0);break;}
  default:{box('woodMid',[1.2,.55,.5],[flank(.7),0,front(.3)],1);for(let i=0;i<2;i++)cyl('woodDark',.4,.55,[awayFromDoor(-side*(mass.maxX-.3))+i*.45,0,front(.5)],0,8,.34);box('woodMid',[.1,1.3,.08],[flank(.2),0,front(.05)],0,[0,0,.12]);box('iron',[.3,.1,.06],[flank(.12),1.25,front(.0)],0);}
 }
 if(!out.length)return spec;
 const m=out;return {...spec,parts:[...spec.parts,...m]};
 function cl(v:number,l:number){return Math.max(-l,Math.min(l,v));}
}
