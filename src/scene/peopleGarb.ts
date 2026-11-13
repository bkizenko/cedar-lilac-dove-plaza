/** PEOPLE GARB (people v2): the owned garment cut by the society's fibre, cut and climate layering, tailored onto a human-shaped trunk. Pure data and maths.
 *
 *  A real garment item (Unit.garment.item) fixes the WARMTH CLASS (light / mild / cold) and the FIBRE the society makes it from
 *  (peopleLook.fibreOf); the society's `cuts` choose the shape for that class (robe, deel, tunic, poncho, kilt, drape...). The clothed trunk is
 *  a tapered torso under a sloped shoulder yoke (wider than deep, shoulders over a narrow waist), an A-line skirt or kilt on the hips with a
 *  worn hem band and an under-layer peeking below it, sleeves in the body parts with their own cloth and cuffs, a collar, a belt or sash with tails, then
 *  mantle (cape, fur, shawl, feather, blanket, hood), fibre detail (pleats, ribbing, rolled felt edge, tufted fur, stitched hide, tapa blocks,
 *  feather fringe, silk trim) and wear: patches, soil and frayed hems follow the garment's real condition. Role changes the silhouette: a farmer's
 *  short hem and apron, a trader's long coat with a sash and capelet, an elder's long hem and shawl, a child's plain short tunic. */
import {Q,TB,shade,frameOf,frontZ,type KitCtx} from './peopleKit';
import {mix} from './unitAppearance';
import type {LodTier} from './buildingParts';
import type {Cut} from './peopleLook';

const TAU=Math.PI*2;
const ring=(n:number,r:number,f:(i:number,a:number,x:number,z:number)=>ReturnType<typeof Q>)=>Array.from({length:n},(_,i)=>{const a=i/n*TAU;return f(i,a,Math.sin(a)*r,Math.cos(a)*r);});
type P2=readonly [number,number];

/** Cloth cut for the owned garment. */
export function garmentParts(c:KitCtx){
 const {cut,pal,bones,look,ind,cls,cond,fibre,cold,role}=c;if(!fibre)return {cloakShoulders:false,coversNeck:false};
 const b=look.body,F=frameOf(b),{tw,ww,wd,cw,cd}=F,hp=b.hip,sh=b.shoulder,child=cls==='child',elder=cls==='elder',v=ind.variant,sd=ind.hand;
 const fade=Math.round(cond*4)/4,fd=(h:string)=>mix(h,'#6e6552',(1-fade)*.22),cl=fd(pal.cloth),cl2=fd(pal.cloth2),tr=pal.trim,und=pal.under,soil=pal.soil,rich=c.rich>=1||role==='ruler'||role==='priest'||role==='merchant';
 const hemVar=[-.02,0,.02,.04][v%4],hem=Math.max(.06,cut.hem+hemVar+(elder?-.02:0)+(child?.03:0)+(role==='farmer'||role==='worker'?.03:0));
 const full=cut.torso==='tunic'||cut.torso==='robe'||cut.torso==='deel',covered=full||cut.torso==='poncho';
 const skirtKind:'tunic'|'deel'|'robe'|'skirt'|'kilt'|null=full?cut.torso as 'tunic'|'deel'|'robe':cut.lower==='skirt'?'skirt':cut.lower==='kilt'?'kilt':null;
 const SK={tunic:[.43,.31],deel:[.47,.33],robe:[.53,.36],skirt:[.5,.34],kilt:[.42,.3]} as const;
 const bw=skirtKind?SK[skirtKind][0]*hp+(child?-.04:0):0,bd=skirtKind?SK[skirtKind][1]*hp+(child?-.03:0):0,skTop=tw+.03,skH=skTop-hem;
 const top:P2=[ww+.05,wd+.045];
 /** skirt half depth at height y (the A-line narrows towards the waist) */
 const zS=(y:number)=>(bd+(top[1]-bd)*Math.min(1,Math.max(0,(y-hem)/skH)))/2;
 const zT=(y:number)=>frontZ(F,y)+.016;
 /** a thin strip lying on a sloped front: from (y0,z0) to (y1,z1), so it follows the cloth */
 const strip=(col:string,w:number,y0:number,y1:number,x:number,zf:(y:number)=>number,lod:LodTier,th=.014,roll=0)=>{const z0=zf(y0)+th/2,z1=zf(y1)+th/2;return Q(col,'box',[w,Math.hypot(y1-y0,z1-z0),th],[x,y0,z0],lod,[Math.atan2(z1-z0,y1-y0),0,roll]);};
 const L1:LodTier=1;void L1;
 // ---- lower body: A-line skirt on the hips, worn hem band, under-layer peeking below, trouser/dhoti wrap
 if(skirtKind){
  bones.hips.push(TB(cl,[bw,bd],top,skH,[0,hem,0],2));
  bones.hips.push(TB(soil,[bw+.016,bd+.016],[bw*.985,bd*.985],.055,[0,hem,0],1));
  if(skirtKind==='robe'||skirtKind==='deel'||(cold&&skirtKind==='tunic'))bones.hips.push(TB(und,[bw*.93,bd*.93],[bw*.92,bd*.92],.05,[0,Math.max(.03,hem-.04),0],1));
  if(rich||skirtKind==='robe')bones.hips.push(TB(tr,[bw*.97,bd*.97],[bw*.96,bd*.96],.022,[0,hem+.06,0],0));
  if(skirtKind==='kilt'||skirtKind==='skirt')bones.hips.push(TB(cl2,[bw*.99,bd*.99],[bw*.88,bd*.9],skH*.34,[0,hem,0],1));
 }
 if(cut.lower==='dhoti'){bones.hips.push(TB(cl,[.46*hp,.34*hp],[ww+.03,wd+.03],tw-.2,[0,.22,0],2),TB(cl2,[.16,.04],[.14,.04],.36,[0,.16,zS(.3)*0+.14*hp],1),TB(tr,[.16,.035],[.16,.035],.03,[0,.16,.14*hp],0));}
 // ---- trunk: tapered torso under a sloped shoulder yoke (cut from the garment, the body skips its bare trunk)
 const tb=tw-.03,tH=.8-tb;
 if(covered){
  const trunk=cut.torso==='poncho'?pal.sleeve:cl;
  bones.spine.push(TB(trunk,[ww+.03,wd+.03],[cw+.035,cd+.03],tH,[0,tb,0],2),TB(trunk,[F.sw,cd+.02],[.17,.17],.1,[0,.79,0],2));
  // collar: a rolled neckline (tunic, poncho), a stand collar (robe, deel) with a lapel
  if(cut.torso==='robe'||cut.torso==='deel')bones.spine.push(TB(cut.torso==='deel'?(cold||role==='ruler'?pal.fur:tr):tr,[.19,.17],[.17,.15],.06,[0,.85,0],1));
  else bones.spine.push(TB(cut.torso==='poncho'?cl2:und,[.18,.16],[.16,.14],.035,[0,.865,0],1));
  if(cut.torso==='robe')bones.spine.push(strip(tr,.045,tb+.02,.86,0,zT,1),strip(tr,.045,hem+.02,skTop,0,zS,1));
  if(cut.torso==='deel'){
   bones.spine.push(strip(cl2,.1,tb+.02,.86,-.03*sd,zT,1,.016,.5*sd),strip(tr,.02,tb+.02,.86,-.08*sd,zT,0,.018,.5*sd),...[0,1,2].map(i=>Q(tr,'sphere',[.03,.03,.02],[.09*sd*(1-i*.1),.62+i*.07,zT(.62+i*.07)+.01],0)));
   bones.hips.push(strip(cl2,.07,hem+.02,skTop,.03*sd,zS,1,.016));
  }
  if(cut.torso==='tunic'){bones.spine.push(strip(shade(cl,.82),.016,tb+.04,.84,0,zT,0));if(rich)bones.spine.push(Q(tr,'box',[.16,.02,.014],[0,.795,zT(.8)],0));}
  if(cut.torso==='poncho'){
   // short shoulder poncho over a belted shirt: the cloth ends at the hip so the forearms and hands stay in the open
   bones.spine.push(TB(cl,[.52*sh,.37],[.17,.17],.3,[0,.6,0],2),TB(tr,[.52*sh+.005,.375],[.52*sh,.37],.025,[0,.6,0],1),...ring(7,.22*sh,(i,a,x,z)=>Q(cl2,'cone',[.045,.08,.04],[x,.57,z*.72],0,[Math.PI,0,0],3)));
  }
 }else if(cut.torso==='wrapchest'){
  bones.spine.push(Q(cl,'box',[.14*cw/.4,.36,.03],[.1,tb+.04,zT(.7)],1,[.1,0,.55]),Q(cl,'box',[.14*cw/.4,.36,.03],[-.1,tb+.04,zT(.7)],1,[.1,0,-.55]),TB(cl2,[ww+.045,wd+.04],[ww+.04,wd+.035],.1,[0,tw-.07,0],1));
 }else if(cut.torso==='drape'){
  bones.spine.push(Q(cl,'box',[.15*cw/.4,.42,.035],[sd*.11,tb+.01,zT(.7)],2,[.1,0,sd*.55]),Q(cl,'box',[.15*cw/.4,.42,.035],[-sd*.11,tb+.02,-zT(.7)],1,[-.1,0,-sd*.55]),TB(cl2,[ww+.045,wd+.04],[ww+.04,wd+.035],.09,[0,tw-.07,0],1),Q(tr,'box',[.04,.3,.02],[sd*.11,.56,zT(.7)+.02],0,[.1,0,sd*.55]));
 }else if(cut.torso==='vest'){
  bones.spine.push(TB(cl,[.12*cw/.4,.05],[.1*cw/.4,.04],.34,[-.1*cw/.4*1.2,tb+.02,zT(.7)-.02],1),TB(cl,[.12*cw/.4,.05],[.1*cw/.4,.04],.34,[.1*cw/.4*1.2,tb+.02,zT(.7)-.02],1),TB(cl,[cw*.9,.04],[cw*.9,.04],.34,[0,tb+.02,-zT(.7)+.02],1),Q(tr,'box',[.025,.34,.03],[-.055*cw/.4,tb+.02,zT(.7)],0),Q(tr,'box',[.025,.34,.03],[.055*cw/.4,tb+.02,zT(.7)],0));
  bones.spine.push(Q(cl,'box',[.1,.035,.2],[-F.sw*.38,.8,0],1),Q(cl,'box',[.1,.035,.2],[F.sw*.38,.8,0],1));
 }
 // ---- belt or sash, with tails
 const by=tw-.045,bwid=ww+.062,bdep=wd+.052;
 if(cut.belt==='cord')bones.spine.push(Q(pal.accent,'box',[bwid-.01,.028,bdep-.005],[0,by,0],1),Q(pal.accent,'box',[.02,.2,.02],[.1*sd,by-.2,bdep/2-.01],0,[.05,0,.08*sd]));
 else if(cut.belt==='sash')bones.spine.push(Q(pal.accent,'box',[bwid,.075,bdep],[0,by-.03,0],1),TB(pal.accent,[.075,.025],[.05,.02],.3,[.14*sd,by-.3,bdep/2+.004],1,[.04,0,.05*sd]),TB(shade(pal.accent,.9),[.07,.025],[.045,.02],.24,[.09*sd,by-.24,bdep/2+.012],0,[.05,0,-.08*sd]),Q(tr,'box',[.075,.025,.028],[.14*sd,by-.3,bdep/2+.012],0));
 else if(cut.belt==='wide')bones.spine.push(Q(pal.leather,'box',[bwid,.085,bdep],[0,by-.03,0],1),Q(pal.metal,'box',[.065,.062,.02],[0,by-.02,bdep/2+.008],0),Q(tr,'box',[bwid+.002,.014,bdep+.002],[0,by+.05,0],0),Q(shade(pal.leather,.8),'box',[.03,.16,.014],[.07*sd,by-.17,bdep/2+.006],0,[.05,0,.05*sd]));
 // ---- mantles
 let cloakShoulders=false;
 const cm=cut.mantle,backZ=-(cd/2+.028);
 if(cm==='cape'){
  bones.spine.push(TB(cl2,[.55*sh,.31],[.3,.2],.17,[0,.69,0],2),TB(cl2,[.5*sh,.07],[.42*sh,.05],.6,[0,.2,backZ-.01],2,[.07,0,0]),TB(tr,[.5*sh+.004,.074],[.5*sh,.074],.032,[0,.2,backZ-.013],0,[.07,0,0]),Q(pal.metal,'sphere',[.05,.05,.04],[.14*sh,.79,cd/2+.02],0),Q(shade(cl2,.85),'box',[.12,.1,.03],[-.1*sh,.74,cd/2+.012],0,[.1,0,-.3]));cloakShoulders=true;
 }else if(cm==='fur'){
  bones.spine.push(TB(pal.fur,[.54*sh,.34],[.3,.22],.15,[0,.69,0],2),TB(pal.fur,[.48*sh,.08],[.4*sh,.06],.4,[0,.36,backZ-.01],2,[.07,0,0]),...ring(9,.17,(i,a,x,z)=>Q(shade(pal.fur,1.08),'cone',[.055,.06,.05],[x,.86,z*.9],0,undefined,3)),...ring(7,.22*sh,(i,a,x,z)=>Q(shade(pal.fur,.85),'cone',[.06,.07,.05],[x,.62,z*.75],0,[Math.PI,0,0],3)));cloakShoulders=true;
 }else if(cm==='shawl'){
  bones.spine.push(Q(cl2,'box',[.13*cw/.4,.44,.04],[sd*.11,tb,zT(.7)+.012],2,[.1,0,sd*.6]),Q(cl2,'box',[.13*cw/.4,.44,.04],[-sd*.11,tb+.02,backZ-.01],1,[-.1,0,-sd*.6]),TB(cl2,[F.sw+.03,cd+.03],[.2,.19],.06,[0,.8,0],1),Q(tr,'box',[.13,.026,.044],[sd*.1,.31,zT(.34)+.03],0));
 }else if(cm==='feather'){
  bones.spine.push(...ring(11,.2*sh,(i,a,x,z)=>Q(i%2?pal.accent:cl2,'cone',[.06,.2,.04],[x*1.18,.7-.02*(i%3),z*.95],i%2?1:0,[Math.cos(a)*-.6,0,Math.sin(a)*.6],4)),TB(tr,[.32*sh,.26],[.2,.18],.05,[0,.79,0],1));cloakShoulders=true;
 }else if(cm==='blanket'){
  bones.spine.push(TB(cl2,[.5*sh,.07],[.44*sh,.06],.48,[0,.35,backZ-.01],2),TB(cl2,[F.sw+.03,cd+.04],[.2,.19],.08,[0,.79,0],1),Q(tr,'box',[.5*sh,.03,.075],[0,.5,backZ-.01],0),Q(tr,'box',[.5*sh,.03,.075],[0,.42,backZ-.01],0),Q(cl2,'box',[.1,.3,.04],[-.1*sh*sd,.5,zT(.6)+.024],1,[.1,0,.2*sd]));cloakShoulders=true;
 }else if(cm==='hood')bones.spine.push(TB(cl2,[.44*sh,.3],[.22,.2],.12,[0,.74,-.02],2),TB(cl2,[.4*sh,.06],[.3*sh,.05],.5,[0,.28,backZ-.01],1),TB(pal.fur,[.34*sh,.3],[.26,.22],.04,[0,.82,0],1));
 // ---- role silhouette
 if(!cm||cm==='none'){
  if(role==='elder'&&cls==='elder')bones.spine.push(TB(shade(cl2,.95),[F.sw+.04,cd+.05],[.22,.2],.07,[0,.78,0],1),Q(shade(cl2,.9),'box',[.12,.4,.04],[-.09*sd,.43,backZ+.12],1,[-.05,0,.3*sd]));
  if(role==='merchant'&&!cloakShoulders)bones.spine.push(TB(cl2,[F.sw+.05,cd+.06],[.2,.2],.085,[0,.76,0],1),Q(tr,'box',[F.sw+.05,.022,cd+.062],[0,.766,0],0));
 }
 if(role==='farmer'&&!child){
  bones.spine.push(TB(pal.apron,[ww+.01,.03],[ww-.02,.03],.4,[0,.18,zS(.3)+.004-.0],1));
  bones.hips.push(TB(pal.apron,[.3*hp,.03],[.24*hp,.03],.34,[0,Math.max(.1,hem+.02),zS(.4)+.006],1),Q(shade(pal.apron,.8),'box',[.1,.1,.02],[-.07,.3,zS(.4)+.02],0));
 }
 // ---- fibre detail on the front and hem, near only
 fibreDetail(c,{hem,skH,bw,bd,zS,zT,kind:skirtKind,tb,tH,strip});
 // ---- wear: patches and frayed hem from the REAL condition
 const worn=cond>=.85?0:cond>=.62?1:cond>=.4?2:3,n=Math.min(worn,ind.patches+1),spots:[number,number][]=[[.09,.66],[-.1,.74],[.06,.4],[-.07,.3]];
 if(covered||skirtKind)for(let i=0;i<n;i++){const [x,y]=spots[(i+v)%4],pc=i%2?shade(cl,.74):mix(cl,pal.accent,.3),yy=y>tw?y:Math.max(hem+.08,y),z=(yy>tw?zT(yy):zS(yy))+.008;(yy>tw?bones.spine:bones.hips).push(Q(pc,'box',[.07,.06,.012],[x,yy,z],0,[0,0,i*.3-.2]),Q(shade(pc,.8),'box',[.07,.008,.014],[x,yy+.03,z],0));}
 if(cond<.45&&skirtKind)bones.hips.push(...ring(7,bw*.5,(i,a,x,z)=>Q(shade(cl,.8),'cone',[.05,.06+(i%2)*.03,.03],[x*1.02,hem-.04-(i%2)*.02,z*.72],0,[Math.PI,0,0],3)));
 return {cloakShoulders,coversNeck:cm==='hood'};
}

type Detail={hem:number;skH:number;bw:number;bd:number;zS:(y:number)=>number;zT:(y:number)=>number;kind:string|null;tb:number;tH:number;strip:(col:string,w:number,y0:number,y1:number,x:number,zf:(y:number)=>number,lod:LodTier,th?:number,roll?:number)=>ReturnType<typeof Q>};
/** Fibre detail on the torso front and hem, near LOD only. */
function fibreDetail(c:KitCtx,d:Detail){
 const {fibre,pal,bones,look}=c,tr=pal.trim,cl=pal.cloth,b=look.body,F=frameOf(b),hips=bones.hips,spine=bones.spine,{hem,skH,bw,bd,zS,zT,kind,tb,strip}=d,cwd=F.cw;
 if(!fibre)return;
 const hemRing=(f:(i:number,x:number,z:number)=>ReturnType<typeof Q>,n=8)=>{if(kind)hips.push(...ring(n,bw*.47,(i,a,x,z)=>f(i,x*1.0,z*bd/bw*1.0)));};
 switch(fibre){
  case 'linen':if(kind)for(let i=-2;i<=2;i++)hips.push(strip(shade(cl,1.1),.012,hem+.07,hem+skH-.05,i*.07*b.hip,zS,0,.01));spine.push(Q(shade(cl,.9),'box',[cwd*.7,.012,.012],[0,tb+.1,zT(tb+.1)+.004],0));break;
  case 'wool':if(kind)hips.push(TB(shade(tr,.95),[bw+.02,bd+.02],[bw+.02,bd+.02],.028,[0,hem+.075,0],0));for(let i=0;i<3;i++)spine.push(Q(shade(cl,.9),'box',[cwd*.8,.012,.012],[0,tb+.06+i*.06,zT(tb+.06+i*.06)+.004],0));break;
  case 'felt':if(kind)hips.push(TB(tr,[bw+.04,bd+.04],[bw+.04,bd+.04],.05,[0,hem,0],1));spine.push(TB(shade(cl,.86),[.2,.18],[.18,.16],.05,[0,.84,0],0));break;
  case 'hide':hemRing((i,x,z)=>Q(shade(cl,.78),'cone',[.07,.1+(i%3)*.03,.06],[x,hem-.02-(i%3)*.02,z],0,[Math.PI,0,0],3),7);spine.push(strip(shade(cl,.65),.014,tb+.02,.84,-.03,zT,0),strip(shade(cl,.65),.014,tb+.02,.84,.03,zT,0));break;
  case 'fur':hemRing((i,x,z)=>Q(pal.fur,'cone',[.07,.1,.06],[x,hem-.01,z],0,[Math.PI,0,0],3),10);spine.push(...ring(8,.16,(i,a,x,z)=>Q(pal.fur,'cone',[.07,.09,.06],[x,.86,z],0,undefined,3)));break;
  case 'cotton':for(let i=0;i<3;i++)spine.push(Q(shade(cl,.84),'box',[cwd*.9,.012,.012],[0,tb+.05+i*.07,zT(tb+.05+i*.07)+.004],0));if(kind)for(let i=-2;i<=2;i++)hips.push(strip(shade(cl,.88),.012,hem+.07,hem+skH-.06,i*.06*b.hip,zS,0,.01));break;
  case 'bark':for(let i=0;i<6;i++){const y=hem+.07+Math.floor(i/3)*.09;if(kind)hips.push(Q(shade(cl,.72),'box',[.06,.05,.012],[((i%3)-1)*.1*b.hip+(Math.floor(i/3)%2)*.03,y,zS(y)+.006],0));}break;
  case 'feather':hemRing((i,x,z)=>Q(i%2?pal.accent:pal.cloth2,'cone',[.05,.11,.03],[x,hem-.02,z],0,[Math.PI,0,0],4),10);break;
  case 'silk':spine.push(Q(tr,'box',[cwd*.9,.03,.01],[0,.7,zT(.7)+.004],0));if(kind)hips.push(TB(tr,[bw+.02,bd+.02],[bw+.02,bd+.02],.03,[0,hem+.08,0],0));break;
  case 'leather':spine.push(strip(shade(cl,.6),.02,tb+.02,.82,-.09,zT,0),strip(shade(cl,.6),.02,tb+.02,.82,.09,zT,0));break;
 }
}
export type {Cut};
