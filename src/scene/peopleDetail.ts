/** PEOPLE NEAR-TIER DETAIL (people v2): the extra part geometry a person has ONLY at the near rig tier (every part here is lod 0, so mid and far are untouched).
 *
 *  What a close view adds: face structure (hair-coloured brows, eye whites, nostrils, lips and mouth line, cheekbones, chin, ear rim and lobe, forehead lines and
 *  crow's feet on elders, hairline fringe, beard strands and moustache ends by style), hands with four fingers and a thumb (curled a little, arm-fix tilt kept),
 *  feet with toes, sandal straps, boot laces, wraps ties, and cloth tailoring (side seams, a rolled hem, vertical folds on skirts, a sleeve-cuff seam, waist
 *  gathers). Per-person asymmetry (one brow higher, a slightly turned mouth, one shorter sleeve fold, a scar on about one in five adults) comes from a seeded
 *  generator keyed by the society and the individual: no Math.random, no clock. Everything stays inside the existing silhouette, so reach, animation and
 *  held items are unchanged; the triangle cost is bounded by NEAR_PEOPLE.maxTris and tested against RIG_BUDGET. `?people=legacy` / `rig1` never reach this file. */
import {hashSeed,seededRandom,type LodTier} from './buildingParts';
import {Q,TB,shade,frameOf,ARM,armX,armSeg,type KitCtx} from './peopleKit';
import {mix} from './unitAppearance';
import type {RigPart} from './characterRig';
import type {Foot} from './peopleLook';

export const NEAR_PEOPLE={enabled:true,/** triangles this layer may add per person (face + hands + feet + cloth), measured and tested */maxTris:760} as const;
const L0:LodTier=0;
/** near triangles the bones carry so far; this layer yields when the person is already rich in gear (armour, helmet, shield), keeping RIG_BUDGET.near */
const bonesNear=(c:KitCtx)=>Object.values(c.bones).reduce((n,l)=>n+l.reduce((m,p)=>m+tris(p),0),0),CAP=1850;
const fits=(c:KitCtx,n:number)=>bonesNear(c)+n<=CAP;
type V3=[number,number,number];
const tris=(p:RigPart)=>p.shape==='box'?12:p.shape==='cone'?(p.sides??8)*2:p.shape==='cylinder'?(p.sides??8)*4:12;

function rngFor(c:KitCtx){const {look,ind}=c;return seededRandom(hashSeed('peopleDetail',look.id,ind.skinTone,ind.hairColour,ind.variant,ind.hair,ind.beard,Math.round(ind.height*100),Math.round(ind.build*100)));}

/** face, ears, hair edge, beard strands, elder lines, a seeded scar */
export function nearFaceDetail(c:KitCtx,hairCovered:boolean,lite=false){
 if(!NEAR_PEOPLE.enabled)return;
 const {look,ind,pal,bones,cls}=c,hs=look.body.head,f=look.face,r=rngFor(c),h=bones.head,sk=pal.skin,fz=.112*hs,child=cls==='child',elder=cls==='elder'||ind.age>.62;
 const dark=mix(sk,'#2a1a14',.55),lip=mix(sk,'#8a3a32',.35),brow=mix(pal.hair,'#1a120e',.15),white='#e9e4d6';
 const tilt=(r()-.5)*.14,mouthTurn=(r()-.5)*.12,asy=r()<.5?1:-1;
 // brows: hair coloured, proud of the brow ridge, one lifted a little
 h.push(Q(brow,'box',[.056*(1+f.brow*.1),.012,.012],[-.056*hs,1.071+(asy>0?.004:0),fz+.006],L0,[0,0,.08+tilt]),Q(brow,'box',[.056*(1+f.brow*.1),.012,.012],[.056*hs,1.071+(asy<0?.004:0),fz+.006],L0,[0,0,-.08+tilt]));
 // eye whites behind the pupil boxes, so the eye has a socket
 h.push(Q(white,'box',[.042,.02,.008],[-.052*hs,1.05,fz-.004],L0),Q(white,'box',[.042,.02,.008],[.052*hs,1.05,fz-.004],L0));
 // nostrils and the nose wing, mouth line, upper and lower lip, chin, cheekbones
 if(!lite)h.push(Q(dark,'box',[.011,.01,.012],[-.014*f.nose,.978,fz+.004],L0),Q(dark,'box',[.011,.01,.012],[.014*f.nose,.978,fz+.004],L0));
 h.push(
  Q(dark,'box',[.058,.007,.008],[0,.944,fz+.002],L0,[0,0,mouthTurn]),Q(lip,'box',[.05,.009,.012],[0,.953,fz+.001],L0,[0,0,mouthTurn*.6]),Q(lip,'box',[.042,.011,.012],[0,.934,fz],L0),
  Q(sk,'box',[.07*f.jaw,.034,.036],[0,.888,.098*hs],L0));
 if(lite)return;
 h.push(Q(shade(sk,1.06),'box',[.034,.026,.024],[-.075*hs,1.01,.092*hs],L0),Q(shade(sk,1.06),'box',[.034,.026,.024],[.075*hs,1.01,.092*hs],L0));
 // ears: helix rim and lobe behind the lobe-less base ear of headParts
 for(const s of [-1,1])h.push(Q(shade(sk,.88),'box',[.012,.05*f.ears,.03*f.ears],[s*.136*hs,.99,0],L0),Q(shade(sk,.95),'box',[.014,.02,.022],[s*.128*hs,.965,.005],L0));
 // hairline fringe over the forehead for styles that leave the front uncovered
 if(!hairCovered&&ind.hair!=='shaved'&&ind.hair!=='crest'&&ind.hair!=='wrapped'){for(let i=0;i<4;i++){const x=(i-1.5)*.05*hs,y=1.112-.006*Math.abs(i-1.5)-(r()*.01),lenY=.026+r()*.016;h.push(Q(pal.hair,'box',[.052,lenY,.016],[x,y-lenY,.1*hs+.012],L0,[0,0,(r()-.5)*.4]));}}
 // elders and weathered faces: forehead lines and crow's feet; a seeded scar on a minority of adults
 if(elder&&!child){const wr=mix(sk,'#2a1a14',.22);for(let i=0;i<2;i++)h.push(Q(wr,'box',[.09*hs,.004,.006],[0,1.095+i*.014,fz+.002],L0));for(const s of [-1,1])h.push(Q(wr,'box',[.022,.004,.006],[s*.088*hs,1.04,fz-.006],L0,[0,0,s*.4]));}
 if(!child&&r()<.2+ind.dirt*.5){const s=r()<.5?-1:1,sc=mix(sk,'#ffffff',.2);h.push(Q(sc,'box',[.05,.007,.007],[s*.06*hs,1.0,fz-.002],L0,[0,0,s*.7]),Q(shade(sc,.85),'box',[.012,.005,.007],[s*.052*hs,.99,fz-.002],L0),Q(shade(sc,.85),'box',[.012,.005,.007],[s*.068*hs,1.012,fz-.002],L0));}
 // beard strands: the tips and sides that the single block of the kit cannot show
 const bt=ind.beard;
 if(bt==='full'||bt==='braided'){for(let i=0;i<4;i++){const x=(i-1.5)*.04*f.jaw,len=.07+r()*.05;h.push(Q(pal.hair,'box',[.026,len,.02],[x,.82-len*.4,.11*hs],L0,[(r()-.5)*.15,0,(i-1.5)*.1]));}for(const s of [-1,1])h.push(Q(pal.hair,'box',[.02,.12,.07],[s*.098*f.jaw*hs,.84,.045],L0));}
 else if(bt==='short'){for(const s of [-1,1])h.push(Q(pal.hair,'box',[.018,.1,.06],[s*.098*f.jaw*hs,.885,.045],L0));}
 else if(bt==='moustache'){for(const s of [-1,1])h.push(Q(pal.hair,'box',[.02,.045,.014],[s*.082,.925,.12*hs],L0,[0,0,s*.25]));}
}

/** hands: four fingers (a little curled) and a thumb on each hand, hung from the same knuckle line as the arm-fix mitten */
export function nearHandDetail(c:KitCtx){
 if(!NEAR_PEOPLE.enabled||!fits(c,110))return;
 const {look,pal,bones,cls}=c,b=look.body,hh=b.hand,sk=pal.skin,child=cls==='child',r=rngFor(c),tilt=ARM.foreTilt+ARM.handTilt,WZ=ARM.foreLen*Math.sin(ARM.foreTilt),k=child?.8:1;
 for(const sd of [-1,1] as const){
  const arm=sd<0?'armL':'armR',ax=sd*armX(b),d0=.032*hh,top=ARM.wristY-d0*Math.cos(tilt),z0=WZ+d0*Math.sin(tilt)+ARM.handD*hh*.52;
  const dx=[-.0215,-.0072,.0072,.0205],len=[.046,.052,.048,.038],curl=[.34,.42,.5,.58];
  for(let i=0;i<4;i++){const l=len[i]*hh*k,ct=tilt+curl[i]+(r()-.5)*.12;bones[arm].push({...Q(i===1?shade(sk,1.02):sk,'box',[.0125*hh,l,.0125*hh],armSeg(ax+dx[i]*hh*sd,top,l,ct,z0),L0,[-ct,0,0])});}
  // thumb on the front-inner edge, angled forward
  bones[arm].push({...Q(shade(sk,.97),'box',[.014*hh,.04*hh*k,.014*hh],armSeg(ax-sd*.03*hh,ARM.wristY-.012,.04*hh*k,tilt+.62,WZ+.02),L0,[-(tilt+.62),0,0])});
 }
}

/** feet: toes on bare and sandalled feet, straps, laces, tied wraps; a seam welt on shoes */
export function nearFootDetail(c:KitCtx,foot:Foot){
 if(!NEAR_PEOPLE.enabled||!fits(c,90))return;
 const {pal,bones,look}=c,sk=pal.skin,lea=pal.leather,hip=look.body.hip;
 for(const sd of [-1,1] as const){
  const o=bones[sd<0?'legL':'legR'],x=sd*.085*hip;
  const toes=(col:string,y=0)=>{for(let i=0;i<4;i++){const l=i===0?.034:.026+(i===1?.004:0);o.push(Q(col,'box',[.021-.002*i,.022-.002*i,l],[x+(i-1.5)*-.022*sd+(i-1.5)*.0,y,.125+(i===0?.0:.004*i)],L0));}};
  switch(foot){
   case 'bare':toes(sk);break;
   case 'sandal':toes(sk,.012);o.push(Q(lea,'box',[.1,.012,.012],[x,.052,.04],L0,[0,0,.2*sd]),Q(lea,'box',[.1,.012,.012],[x,.052,.075],L0,[0,0,-.2*sd]),Q(lea,'box',[.012,.04,.012],[x,.04,.105],L0));break;
   case 'boot':case 'tallboot':for(let i=0;i<3;i++)o.push(Q(shade(lea,1.25),'box',[.05,.01,.01],[x,.1+i*.045,.058+.004*i],L0,[0,0,i%2?.1:-.1]));break;
   case 'wraps':for(let i=0;i<2;i++)o.push(Q(pal.trim,'box',[.13,.012,.012],[x,.09+i*.07,.056],L0,[0,0,i?.45:-.45]));break;
   case 'moccasin':o.push(Q(shade(lea,.78),'box',[.012,.03,.1],[x,.075,.1],L0),Q(shade(lea,.78),'box',[.1,.016,.012],[x,.07,.06],L0));break;
   case 'clog':o.push(Q(shade('#8a6a42',1.2),'box',[.09,.01,.01],[x,.076,.04],L0));break;
  }
 }
}

type GarbD={hem:number;skH:number;bw:number;bd:number;zS:(y:number)=>number;zT:(y:number)=>number;kind:string|null;tb:number;tH:number};
/** cloth tailoring: side seams, a rolled hem, vertical folds on skirts, waist gathers, a seam at the sleeve cuff */
const pending=new WeakMap<KitCtx,GarbD>();
/** garmentParts records its tailoring numbers here; nearPersonDetail draws the cloth detail once the rest of the person is known */
export const deferGarmentDetail=(c:KitCtx,d:GarbD)=>{pending.set(c,d);};
export function nearGarmentDetail(c:KitCtx,d:GarbD){
 if(!NEAR_PEOPLE.enabled||!c.fibre||!fits(c,190))return;
 const {pal,bones,look,cut,ind}=c,b=look.body,F=frameOf(b),r=rngFor(c),cl=pal.cloth,seam=shade(cl,.78),full=cut.torso==='tunic'||cut.torso==='robe'||cut.torso==='deel',covered=full||cut.torso==='poncho';
 if(d.kind){
  // rolled hem and vertical folds, uneven by person
  bones.hips.push(TB(shade(cl,1.08),[d.bw+.012,d.bd+.012],[d.bw+.01,d.bd+.01],.018,[0,d.hem+.052,0],L0));
  const nf=5;for(let i=0;i<nf;i++){const x=(i-(nf-1)/2)*(d.bw*.8/(nf-1))*(.92+r()*.16),y0=d.hem+.075+r()*.03,h=d.skH*(.5+r()*.25);bones.hips.push(Q(i%2?shade(cl,.9):shade(cl,1.07),'box',[.02+r()*.012,h,.012],[x,y0,d.zS(y0)+.006],L0,[0,0,(x/d.bw)*.12]));}
  for(const s of [-1,1])bones.hips.push(Q(seam,'box',[.008,d.skH*.9,.012],[s*d.bw*.48,d.hem+.04,0],L0));
 }
 if(covered){
  for(const s of [-1,1])bones.spine.push(Q(seam,'box',[.007,d.tH*.9,.012],[s*(F.ww+.02)*.97,d.tb+.01,0],L0));
  // gathers at the waist under the belt
  for(let i=0;i<5;i++)bones.spine.push(Q(shade(cl,.9),'box',[.012,.05,.012],[(i-2)*.05*b.waist,d.tb-.025,d.zT(d.tb)+.003],L0));
  // sleeve cuff seam on both arms (follows the arm-fix forearm tilt)
  if(cut.sleeve!=='none')for(const s of [-1,1] as const)bones[s<0?'armL':'armR'].push({...Q(seam,'cylinder',[(ARM.foreBot+.012)*b.limb,.008,(ARM.foreBot+.012)*b.limb],armSeg(s*armX(b),ARM.wristY+.03,.008,ARM.foreTilt,ARM.foreLen*Math.sin(ARM.foreTilt)),L0,[-ARM.foreTilt,0,0],6)});
 }
 void ind;
}

/** one call from peopleOutfit for everything that is not cloth */
/** `heavy` = owns armour, a helmet or a shield (or leads): those people already carry the near budget in gear, so they get the face only */
export function nearPersonDetail(c:KitCtx,o:{hairCovered:boolean;foot:Foot;heavy:boolean}){nearFaceDetail(c,o.hairCovered,o.heavy);if(o.heavy)return;nearHandDetail(c);const g=pending.get(c);if(g)nearGarmentDetail(c,g);nearFootDetail(c,o.foot);}
export {tris as nearPartTriangles};
