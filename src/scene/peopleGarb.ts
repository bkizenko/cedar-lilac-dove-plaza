/** PEOPLE GARB (people v2): the owned garment cut by the society's fibre, cut and climate layering. Pure data and maths.
 *
 *  A real garment item (Unit.garment.item) fixes the WARMTH CLASS (light / mild / cold) and the FIBRE the society makes it from
 *  (peopleLook.fibreOf); the society's `cuts` choose the shape for that class (robe, deel, poncho, kilt, drape...), then mantle, belt,
 *  an under-layer peeking at neck and hem, fibre detail (pleats, tassels, rolled felt edge, tufted fur, quilting, bark blocks,
 *  feather fringe, silk trim) and wear: patches and frayed hems follow the garment's real condition. Sleeves and trousers are the
 *  body parts' own colour (no extra triangles). */
import {Q,shade,type KitCtx} from './peopleKit';
import {mix} from './unitAppearance';
import type {LodTier} from './buildingParts';
import type {Cut} from './peopleLook';

const TAU=Math.PI*2;
const ring=(n:number,r:number,y:number,f:(i:number,a:number,x:number,z:number)=>ReturnType<typeof Q>)=>Array.from({length:n},(_,i)=>{const a=i/n*TAU;return f(i,a,Math.sin(a)*r,Math.cos(a)*r);});
/** Fibre detail on the torso front and hem, near LOD only. */
function fibreDetail(c:KitCtx,hem:number,hipR:number,tw:number){
 const {fibre,pal,bones,look}=c,tr=pal.trim,cl=pal.cloth,ch=look.body.chest;if(!fibre)return;
 const hips=bones.hips,spine=bones.spine;
 switch(fibre){
  case 'linen':for(let i=-2;i<=2;i++)hips.push(Q(shade(cl,1.12),'box',[.012,tw-hem-.04,.01],[i*.07*hipR,hem+.02,.17*hipR+.07],0));hips.push(Q(tr,'cylinder',[hipR*.95+.02,.03,hipR*.95+.02],[0,hem+.015,0],0,undefined,8));break;
  case 'wool':hips.push(...ring(8,hipR/2+.005,hem,(i,a,x,z)=>Q(tr,'cone',[.045,.07,.045],[x,hem-.05,z],0,[Math.PI,0,0],4)));hips.push(Q(tr,'cylinder',[hipR+.02,.035,hipR+.02],[0,hem+.04,0],0,undefined,8));break;
  case 'felt':hips.push(Q(tr,'cylinder',[hipR+.05,.05,hipR+.05],[0,hem,0],1,undefined,8));spine.push(Q(shade(cl,.86),'cylinder',[.2,.05,.19],[0,.85,0],1,undefined,8));break;
  case 'hide':hips.push(...ring(7,hipR/2,hem,(i,a,x,z)=>Q(shade(cl,.78),'cone',[.07,.1+(i%3)*.03,.06],[x,hem-.08-(i%3)*.02,z],0,[Math.PI,0,0],3)));spine.push(Q(shade(cl,.65),'box',[.012,.2,.01],[-.03,.64,.17*ch+.05],0),Q(shade(cl,.65),'box',[.012,.2,.01],[.03,.64,.17*ch+.05],0));break;
  case 'fur':hips.push(...ring(10,hipR/2+.005,hem,(i,a,x,z)=>Q(pal.fur,'cone',[.07,.1,.06],[x,hem-.05,z],0,[Math.PI,0,0],3)));spine.push(...ring(8,.15,.86,(i,a,x,z)=>Q(pal.fur,'cone',[.07,.09,.06],[x,.86,z],0,undefined,3)));break;
  case 'cotton':for(let i=0;i<3;i++)spine.push(Q(shade(cl,.84),'box',[.28*ch,.012,.012],[0,.62+i*.07,.172*ch+.01],0));for(let i=-2;i<=2;i++)spine.push(Q(shade(cl,.88),'box',[.012,.22,.012],[i*.06,.6,.172*ch+.01],0));break;
  case 'bark':for(let i=0;i<6;i++)hips.push(Q(shade(cl,.72),'box',[.06,.05,.012],[((i%3)-1)*.1*hipR+(Math.floor(i/3)%2)*.03,hem+.05+Math.floor(i/3)*.09,.17*hipR+.055],0));break;
  case 'feather':hips.push(...ring(10,hipR/2+.005,hem,(i,a,x,z)=>Q(i%2?pal.accent:pal.cloth2,'cone',[.05,.11,.03],[x,hem-.06,z],0,[Math.PI,0,0],4)));break;
  case 'silk':spine.push(Q(tr,'box',[.3*ch,.035,.01],[0,.7,.172*ch+.01],0),Q(tr,'cylinder',[.17,.03,.16],[0,.865,0],0,undefined,8));hips.push(Q(tr,'cylinder',[hipR+.03,.025,hipR+.03],[0,hem,0],0,undefined,8));break;
  case 'leather':spine.push(Q(shade(cl,.6),'box',[.02,.3,.012],[-.1,.58,.17*ch+.012],0),Q(shade(cl,.6),'box',[.02,.3,.012],[.1,.58,.17*ch+.012],0));break;
 }
}
/** Cloth cut for the owned garment. */
export function garmentParts(c:KitCtx){
 const {cut,pal,bones,look,ind,cls,cond,fibre,cold,rich}=c;if(!fibre)return {cloakShoulders:false,coversNeck:false};
 const b=look.body,hp=b.hip,w=b.waist,sh=b.shoulder,ch=b.chest,tw=.57+b.torso*.5,hemVar=[-.02,0,.02,.04][ind.variant%4],child=cls==='child';
 const hem=Math.max(.06,cut.hem+hemVar+(cls==='elder'?-.02:0)+(child?.02:0)),top=.885,cl=pal.cloth,cl2=pal.cloth2,tr=pal.trim;
 const full=cut.torso==='tunic'||cut.torso==='robe'||cut.torso==='deel';
 const L1:LodTier=1;
 // lower: skirts, kilts, tails
 const flare=cut.torso==='robe'?.26:cut.torso==='deel'?.16:cut.torso==='tunic'?.11:.0;
 const skirtTop=.3*hp,skirtBot=(.33+flare)*hp,skirtH=tw-hem;
 if(full||cut.lower==='skirt'||cut.lower==='kilt'){
  const long=cut.lower==='skirt'?.14:0,bot=(cut.lower==='kilt'?.4:cut.lower==='skirt'?.46:.33+flare)*hp+long*0;
  bones.hips.push(Q(cl,'cylinder',[bot,skirtH,skirtTop],[0,hem,0],2,undefined,8));
  if(cut.lower==='kilt'&&full===false)bones.hips.push(Q(cl2,'cylinder',[bot*.96,skirtH*.4,skirtTop+.02],[0,hem,0],1,undefined,8));
 }
 if(cut.lower==='dhoti'){bones.hips.push(Q(cl,'cone',[.46*hp,.3,.4*hp],[0,.22,0],1,undefined,8),Q(cl2,'box',[.15,.34,.03],[0,.18,.2*hp],1),Q(tr,'box',[.15,.03,.032],[0,.18,.2*hp],0));}
 // torso shells and wraps
 const shellBot=.3*w+.045,shellTop=.35*ch+.035;
 if(full){
  bones.spine.push(Q(cl,'cylinder',[shellBot,top-tw+.03,shellTop],[0,tw-.02,0],2,undefined,8));
  if(cut.torso==='deel'){bones.spine.push(Q(cl2,'box',[.3*ch,.3,.03],[.02,.58,.18*ch+.01],1,[0,0,-.5]),Q(cl2,'cylinder',[.17,.06,.16],[0,.86,0],1,undefined,8),...[0,1,2].map(i=>Q(tr,'box',[.025,.025,.02],[.1*ch-.02*i,.7-i*.07,.19*ch+.04],0)));}
  if(cut.torso==='robe')bones.spine.push(Q(tr,'box',[.04,top-tw,.02],[0,tw,.178*ch+.02],0));
 }else if(cut.torso==='poncho'){
  bones.spine.push(Q(cl,'cone',[.84*sh,.5,.84*sh],[0,.4,0],2,undefined,8),Q(tr,'cylinder',[.82*sh,.03,.82*sh],[0,.4,0],1,undefined,8),Q(pal.under,'cylinder',[.17,.04,.16],[0,.865,0],1,undefined,8),Q(cl2,'cylinder',[.62*sh,.02,.62*sh],[0,.54,0],0,undefined,8));
 }else if(cut.torso==='wrapchest'){
  bones.spine.push(Q(cl,'box',[.13*ch,.55,.05],[0,.6,.175*ch],1,[0,0,.6]),Q(cl,'box',[.13*ch,.55,.05],[0,.6,.175*ch],1,[0,0,-.6]),Q(cl2,'cylinder',[.31*w+.03,.07,.3*w+.03],[0,.56,0],1,undefined,8));
 }else if(cut.torso==='drape'){
  const sd=ind.hand;
  bones.spine.push(Q(cl,'box',[.15*ch,.66,.05],[sd*.02,.58,.178*ch],2,[0,0,sd*.55]),Q(cl,'box',[.15*ch,.66,.05],[sd*.02,.58,-.178*ch],1,[0,0,-sd*.55]),Q(cl2,'cylinder',[.32*w+.03,.07,.3*w+.03],[0,.56,0],1,undefined,8),Q(cl,'box',[.12,.3,.04],[-sd*.1,.28,.17],1),Q(tr,'box',[.12,.03,.042],[-sd*.1,.28,.17],0));
 }else if(cut.torso==='vest'){
  bones.spine.push(Q(cl,'box',[.11*ch,.3,.04],[-.09*ch,.58,.17*ch],1),Q(cl,'box',[.11*ch,.3,.04],[.09*ch,.58,.17*ch],1),Q(cl,'box',[.3*ch,.3,.04],[0,.58,-.17*ch],1),Q(tr,'box',[.025,.3,.044],[-.05*ch,.58,.17*ch],0),Q(tr,'box',[.025,.3,.044],[.05*ch,.58,.17*ch],0));
 }
 // under-layer peeking at the neck and hem (layering), only when a second layer is plausible
 if(full&&(cold||cut.torso==='deel'||cut.torso==='robe')){bones.spine.push(Q(pal.under,'cylinder',[.16,.035,.145],[0,.862,0],0,undefined,8));bones.hips.push(Q(pal.under,'cylinder',[skirtBot*.9,.035,skirtBot*.9],[0,Math.max(.05,hem-.03),0],0,undefined,8));}
 // belt
 const by=tw-.045;
 if(cut.belt==='cord')bones.spine.push(Q(pal.accent,'cylinder',[.3*w+.045,.028,.3*w+.045],[0,by,0],1,undefined,8));
 else if(cut.belt==='sash')bones.spine.push(Q(pal.accent,'cylinder',[.31*w+.05,.075,.3*w+.05],[0,by-.03,0],1,undefined,8),Q(pal.accent,'box',[.08,.3,.03],[.13*ind.hand,by-.28,.17],1),Q(tr,'box',[.08,.03,.032],[.13*ind.hand,by-.28,.17],0));
 else if(cut.belt==='wide')bones.spine.push(Q(pal.leather,'cylinder',[.31*w+.05,.085,.3*w+.05],[0,by-.03,0],1,undefined,8),Q(pal.metal,'box',[.06,.06,.02],[0,by-.015,.175],0),Q(tr,'cylinder',[.31*w+.052,.012,.3*w+.052],[0,by+.05,0],0,undefined,8));
 // mantles
 let cloakShoulders=false;
 const cmant=cut.mantle;
 if(cmant==='cape'){bones.spine.push(Q(cl2,'box',[.5*sh,.09,.28],[0,.78,-.02],2),Q(cl2,'box',[.46*sh,.64,.05],[0,.14,-.2],2,[.06,0,0]),Q(tr,'box',[.46*sh,.035,.052],[0,.14,-.2],0),Q(pal.metal,'sphere',[.05,.05,.04],[.15*sh,.8,.14],0));cloakShoulders=true;}
 else if(cmant==='fur'){bones.spine.push(Q(pal.fur,'cylinder',[.52*sh,.1,.36],[0,.76,0],2,undefined,8),Q(pal.fur,'box',[.46*sh,.3,.07],[0,.5,-.2],2),...ring(8,.2*sh,.86,(i,a,x,z)=>Q(shade(pal.fur,1.1),'cone',[.07,.09,.06],[x,.85,z*1.05],0,undefined,3)));cloakShoulders=true;}
 else if(cmant==='shawl'){const sd=ind.hand;bones.spine.push(Q(cl2,'box',[.12*ch,.7,.05],[sd*.02,.58,.185*ch],2,[0,0,sd*.6]),Q(cl2,'box',[.12*ch,.66,.05],[0,.6,-.185*ch],1,[0,0,-sd*.6]),Q(tr,'box',[.12,.03,.052],[0,.3,.19],0));}
 else if(cmant==='feather'){const n=12;bones.spine.push(...ring(n,.2*sh,.78,(i,a,x,z)=>Q(i%2?pal.accent:pal.cloth2,'cone',[.06,.2,.04],[x*1.1,.72-.02*(i%3),z*1.1],i%2?1:0,[Math.cos(a)*-.6,0,Math.sin(a)*.6],4)),Q(tr,'cylinder',[.3*sh,.03,.3*sh],[0,.79,0],1,undefined,8));cloakShoulders=true;}
 else if(cmant==='blanket'){bones.spine.push(Q(cl2,'box',[.58*sh,.5,.07],[0,.38,-.19],2),Q(cl2,'box',[.5*sh,.1,.3],[0,.78,0],1),Q(tr,'box',[.58*sh,.03,.072],[0,.5,-.19],0),Q(tr,'box',[.58*sh,.03,.072],[0,.42,-.19],0),Q(cl2,'box',[.1,.3,.05],[-.17*sh,.5,.17],1),Q(cl2,'box',[.1,.3,.05],[.17*sh,.5,.17],1));cloakShoulders=true;}
 else if(cmant==='hood')bones.spine.push(Q(cl2,'box',[.46*sh,.1,.3],[0,.76,-.01],2),Q(cl2,'box',[.42*sh,.5,.05],[0,.28,-.2],1),Q(pal.fur,'cylinder',[.38*sh,.04,.3],[0,.82,0],1,undefined,8));
 fibreDetail(c,hem,full||cut.lower==='skirt'||cut.lower==='kilt'?(cut.lower==='kilt'?.4:cut.lower==='skirt'?.46:.33+flare)*hp:.3*hp,tw);
 // wear: patches and frayed hem from the REAL condition
 const worn=cond>=.85?0:cond>=.62?1:cond>=.4?2:3,n=Math.min(worn,ind.patches+1),spots:[number,number,number][]=[[.1,.66,.185],[-.12,.74,.18],[.06,.44,.19],[-.07,.36,.18]];
 if(full||cut.lower==='skirt'||cut.lower==='kilt')for(let i=0;i<n;i++){const [x,y,z]=spots[(i+ind.variant)%4],pc=i%2?shade(cl,.76):mix(cl,pal.accent,.35);(y>tw?bones.spine:bones.hips).push(Q(pc,'box',[.07,.06,.012],[x*ch,y,z*hp],0,[0,0,i*.3-.2]),Q(shade(pc,.8),'box',[.07,.008,.014],[x*ch,y+.03,z*hp],0));}
 if(cond<.45&&(full||cut.lower==='skirt'||cut.lower==='kilt'))bones.hips.push(...ring(7,skirtBot*.5,hem,(i,a,x,z)=>Q(shade(cl,.8),'cone',[.05,.06+(i%2)*.03,.03],[x,hem-.04-(i%2)*.02,z],0,[Math.PI,0,0],3)));
 void L1;void rich;
 return {cloakShoulders,coversNeck:cmant==='hood'};
}
export type {Cut};
