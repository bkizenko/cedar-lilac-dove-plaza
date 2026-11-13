/** Birds (duck, goose, raptor) and fish (trout, carp, pike, eel): same pipeline as the quadrupeds (lofts -> jointed parts -> three LODs -> pose solver),
 * registered into animalCatalog. Birds have a neck, head, bill, two-part wings that fold or flap, tail, legs; fish are three body segments that undulate
 * with the dorsal, pectoral, pelvic, anal and caudal fins, an eye and countershaded colouring. Deterministic: seed only. */
import * as THREE from 'three';
import {append,blob,counter,hex,loft,mix,mul,newMesh,plate,smooth,toGeometry,triangles,tube,tuft,type Mesh,type Paint,type RGB,type Sec} from './animalGeo';
import {registerEntry,type PoseRequest,type Posed} from './animalCatalog';
import type {RigModel} from './animalRig';
import type {SpeciesId} from './animalSpecs';
import {hashSeed,seededRandom} from './buildingParts';

const D=Math.PI/180;
type Tier=0|1|2;
type Bn={id:string;part:string;parent:string|null;pivot:[number,number,number];rest:[number,number,number]};
const bm=(b:Bn,ex?:[number,number,number])=>new THREE.Matrix4().compose(new THREE.Vector3(...b.pivot),new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rest[0]+(ex?.[0]??0),b.rest[1]+(ex?.[1]??0),b.rest[2]+(ex?.[2]??0),'ZYX')),new THREE.Vector3(1,1,1));
function restMats(bones:readonly Bn[]){const o=new Map<string,THREE.Matrix4>();for(const b of bones){const m=bm(b);if(b.parent)m.premultiply(o.get(b.parent)!);o.set(b.id,m);}return o;}
const addRig=(g:THREE.BufferGeometry,m:THREE.Matrix4)=>{const p=g.getAttribute('position'),a=new Float32Array(p.count*3),v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);a[i*3]=v.x;a[i*3+1]=v.y;a[i*3+2]=v.z;}g.setAttribute('rig',new THREE.BufferAttribute(a,3));return g;};
const flipZ=(m:Mesh):Mesh=>{for(let i=0;i<m.pos.length;i+=3)m.pos[i+2]*=-1;for(let i=0;i<m.idx.length;i+=3){const t=m.idx[i+1];m.idx[i+1]=m.idx[i+2];m.idx[i+2]=t;}return m;};

// ================================================================================================================ birds
export type BirdSpec={id:'duck'|'goose'|'raptor';label:string;ref:string;real:{length:number;span:number;kg:number};body:number;height:number;neck:number;neckR:number;head:number;bill:number;legLen:number;spanI:number;spanO:number;chord:number;tail:number;
 col:{back:string;belly:string;wing:string;head:string;bill:string;leg:string;eye:string;extra?:string;female?:string};flap:number;/** wingbeats per second */hz:number};
export const BIRDS:Record<'duck'|'goose'|'raptor',BirdSpec>={
 duck:{id:'duck',label:'Mallard (Anas platyrhynchos)',ref:'0.50-0.65 m long, 1 kg, wingspan 0.85-0.95 m; drake: green head, white neck ring, chestnut breast, grey flanks, curled black tail coverts, yellow bill; duck: mottled brown',
  real:{length:.58,span:.9,kg:1},body:.38,height:.17,neck:.15,neckR:.03,head:.08,bill:.055,legLen:.09,spanI:.2,spanO:.25,chord:.14,tail:.08,col:{back:'#8a8070',belly:'#d9d2c2',wing:'#6a6354',head:'#2d6b4a',bill:'#d8b830',leg:'#d98a2e',eye:'#17120e',extra:'#6a3a28',female:'#8a6a48'},flap:50,hz:9},
 goose:{id:'goose',label:'Greylag goose (Anser anser)',ref:'0.75-0.90 m long, 3.3 kg, wingspan 1.5-1.8 m; long neck, heavy orange bill, grey-brown body with pale barred flanks, white rump and tail edge, pink legs',
  real:{length:.82,span:1.6,kg:3.3},body:.58,height:.26,neck:.34,neckR:.04,head:.1,bill:.075,legLen:.17,spanI:.36,spanO:.44,chord:.2,tail:.1,col:{back:'#7d7160',belly:'#b8ae9a',wing:'#6a604f',head:'#8a7e6c',bill:'#e0883a',leg:'#d89a8a',eye:'#17120e',extra:'#ece6d8'},flap:42,hz:4.5},
 raptor:{id:'raptor',label:'Common buzzard / golden eagle type (Buteo buteo)',ref:'0.50-0.58 m long, 0.9 kg, wingspan 1.1-1.3 m; broad rounded wings with splayed primaries, fan tail, hooked yellow-based bill, strong talons; brown above, pale barred below',
  real:{length:.54,span:1.2,kg:.9},body:.34,height:.14,neck:.07,neckR:.04,head:.07,bill:.035,legLen:.1,spanI:.28,spanO:.32,chord:.2,tail:.2,col:{back:'#6a5440',belly:'#c9b79a',wing:'#5a4634',head:'#6a5440',bill:'#2e2a26',leg:'#d8b84a',eye:'#d8a030',extra:'#8a7458'},flap:30,hz:3},
};
function birdPart(sp:BirdSpec,part:string,t:Tier,sex:'m'|'f',seed:number):Mesh|null{
 const m=newMesh(),c=sp.col,seg=t===0?9:t===1?6:5,r=seededRandom(hashSeed(seed,'bird'));
 const male=sex==='m',back=hex(male||sp.id!=='duck'?c.back:c.female!),belly=hex(c.belly),wing=hex(c.wing),head=hex(male||sp.id!=='duck'?c.head:c.female!),bill=hex(c.bill),leg=hex(c.leg),extra=c.extra?hex(c.extra):back;
 const b=sp.body,h=sp.height;
 switch(part){
  case 'body':{
   const sec:Sec[]=[[-.5,.01,.28,.3],[-.38,.01,.62,.62],[-.15,0,.92,.9],[.1,.0,1,1],[.32,.02,.85,.78],[.48,.05,.5,.5]].map(([f,u,k,w])=>({s:f*b,u:u*h,ru:h*.5*k,rv:h*.46*w,sq:2.2}));
   const breast=sp.id==='duck'&&male?hex('#7a4a30'):belly;
   loft(m,sec,{seg:t===0?11:seg,paint:(x,y,z,ny,s)=>{let col=counter(mix(back,wing,.15),mix(breast,belly,smooth(.1,.3,s/b+.5)),ny,-.1);if(s<-.3*b&&sp.id==='goose')col=mix(col,extra,.85);if(sp.id==='duck'&&male&&s<-.4*b)col=mul(col,.4);if(sp.id==='raptor'&&ny<.1)col=mix(col,belly,.8);return col;}});
   if(t===0&&sp.id==='raptor')for(let i=0;i<10;i++){const k=r();tuft(m,[-.2*b+k*.35*b,-h*.5*r(),(r()-.5)*h*.8],[-.4,-1,0],.025,.01,belly);}
   return m;}
  case 'neck':{
   const L=sp.neck,n=t===0?5:3,secs:Sec[]=[];
   for(let i=0;i<n;i++){const f=i/(n-1);secs.push({s:f*L-.03*(i===0?1:0),ru:sp.neckR*(1.35-.45*f),rv:sp.neckR*(1.35-.45*f)*.95});}
   loft(m,secs,{seg:t===0?8:5,paint:(x,y,z,ny,s)=>{let col=counter(head,belly,ny,.2);if(sp.id==='duck'&&male&&s>L*.1&&s<L*.3)col=hex('#eee9dc');if(sp.id==='duck'&&male&&s<L*.1)col=hex('#7a4a30');return col;}});return m;}
  case 'head':{
   const H=sp.head,sec:Sec[]=[[0,.0,.5,.45],[.3,.0,.55,.5],[.7,-.05,.4,.36],[1,-.07,.3,.28]].map(([f,u,k,w])=>({s:f*H,u:u*H,ru:H*.5*k*1.1,rv:H*.5*w*1.1,sq:2.1}));
   loft(m,sec,{seg:t===0?9:6,paint:(x,y,z,ny)=>counter(head,mix(head,belly,.4),ny,.1)});
   // bill: duck/goose = broad flat bill; raptor = hooked
   if(sp.id==='raptor'){loft(m,[{s:H*.85,u:-.0,ru:H*.17,rv:H*.15},{s:H*1.08,u:-.005,ru:H*.15,rv:H*.13},{s:H*1.22,u:-.025,ru:H*.06,rv:H*.07},{s:H*1.25,u:-.05,ru:H*.01,rv:H*.02}],{seg:6,paint:(x,y,z,ny,s)=>s<H*1.0?hex('#d8b84a'):bill});}
   else loft(m,[{s:H*.85,u:-.01,ru:H*.14,rv:H*.2},{s:H*1.0+sp.bill*.5,u:-.012,ru:H*.1,rv:H*.24},{s:H+sp.bill,u:-.014,ru:H*.05,rv:H*.22},{s:H+sp.bill*1.04,u:-.014,ru:H*.01,rv:H*.1}],{seg:6,paint:()=>bill,});
   if(t===0){for(const sd of [-1,1])blob(m,[H*.5,H*.1,sd*H*.5*.55],[H*.075,H*.075,H*.04],hex(c.eye),{lon:6,lat:3});}
   return m;}
  case 'tail':{
   const L=sp.tail,tp=sp.id==='goose'?extra:sp.id==='duck'?(male?hex('#1c1816'):back):mix(back,extra,.3);
   const w=sp.id==='raptor'?sp.chord*.6:sp.chord*.4;
   plate(m,[[0,.005,-w*.25],[L*.9,.0,-w*.55],[L,.0,0],[L*.9,.0,w*.55],[0,.005,w*.25]].map(p=>[-p[0],p[1],p[2]] as [number,number,number]),tp,{});
   if(sp.id==='duck'&&male&&t===0)tube(m,[[0,.0,0],[-.03,.03,0],[-.05,.05,0],[-.04,.07,0]],[[.012,.01],[.01,.008],[.008,.006],[.002,.002]],{seg:4,paint:()=>hex('#1c1816')});
   return m;}
  case 'wingIR':case 'wingIL':case 'wingOR':case 'wingOL':{
   const inner=part.startsWith('wingI'),span=inner?sp.spanI:sp.spanO,ch=inner?sp.chord:sp.chord*.8,col=inner?wing:mix(wing,mul(wing,.55),.5),under=belly;
   // leaf-shaped wing panel in the x-z plane, leading edge at +x, trailing edge at -x with feather tips
   const n=inner?4:6,pts:[number,number,number][]=[];
   for(let i=0;i<=n;i++){const f=i/n;pts.push([ch*(.35-.12*f*(inner?0:1))*(inner?1-.5*f:1-.3*f),0,span*f]);}
   for(let i=n;i>=0;i--){const f=i/n,tip=inner?1:(sp.id==='raptor'?1+.2*Math.sin(f*Math.PI*5):1);pts.push([-ch*(.65-.25*f*(inner?0:1))*tip*(inner?1-.45*f:1-.2*f),0,span*f*(inner||i<n?1:1.06)]);}
   const sgn=part.endsWith('L')?-1:1;
   const pp=pts.map(p=>[p[0],p[1],p[2]*sgn] as [number,number,number]);
   if(sgn<0)pp.reverse();
   plate(m,pp,col,{paint:(i)=>i<n+1?col:mix(col,under,.5)});
   // wing thickness near the shoulder
   if(inner&&t<2)loft(m,[{s:0,ru:.02,rv:.02},{s:span*.9,ru:.012,rv:.012}],{axis:'x',seg:5,paint:()=>col}),void 0;
   return m;}
  case 'leg':{
   const L=sp.legLen;loft(m,[{s:0,ru:.012,rv:.012},{s:L*.7,ru:.008,rv:.008},{s:L,ru:.008,rv:.008}],{axis:'down',seg:5,paint:()=>leg,capStart:false});
   if(t<2){
    if(sp.id==='raptor')for(const z of [-.012,.0,.012])tube(m,[[0,-L,z],[.045,-L-.004,z],[.058,-L-.025,z]],[[.006,.006],[.005,.005],[.002,.002]],{seg:3,paint:()=>hex('#26211c')});
    else for(const z of [-.025,0,.025])tube(m,[[0,-L,0],[.05,-L-.002,z],[.075,-L-.004,z]],[[.005,.004],[.004,.003],[.002,.002]],{seg:3,paint:()=>leg});
   }
   return m;}
 }
 return null;
}
const BIRD_BONES=(sp:BirdSpec):Bn[]=>{const b=sp.body,h=sp.height;return [
 {id:'body',part:'body',parent:null,pivot:[0,0,0],rest:[0,0,0]},
 {id:'neck',part:'neck',parent:'body',pivot:[b*.4,h*.1,0],rest:[0,0,(sp.id==='raptor'?25:sp.id==='goose'?62:48)*D]},
 {id:'head',part:'head',parent:'neck',pivot:[sp.neck,0,0],rest:[0,0,(sp.id==='raptor'?-30:-48)*D]},
 {id:'tail',part:'tail',parent:'body',pivot:[-b*.46,h*.05,0],rest:[0,0,(sp.id==='raptor'?-12:12)*D]},
 {id:'wingIR',part:'wingIR',parent:'body',pivot:[b*.12,h*.2,h*.3],rest:[0,0,0]},{id:'wingIL',part:'wingIL',parent:'body',pivot:[b*.12,h*.2,-h*.3],rest:[0,0,0]},
 {id:'wingOR',part:'wingOR',parent:'wingIR',pivot:[0,0,sp.spanI],rest:[0,0,0]},{id:'wingOL',part:'wingOL',parent:'wingIL',pivot:[0,0,-sp.spanI],rest:[0,0,0]},
 {id:'legR',part:'leg',parent:'body',pivot:[b*.02,-h*.35,h*.22],rest:[0,0,0]},{id:'legL',part:'leg',parent:'body',pivot:[b*.02,-h*.35,-h*.22],rest:[0,0,0]},
];};
const birdCache=new Map<string,{rig:RigModel;bones:Bn[];tris:[number,number,number]}>();
const BIRD_PARTS=['body','neck','head','tail','wingIR','wingIL','wingOR','wingOL','leg'];
function birdModel(id:'duck'|'goose'|'raptor',sex:'m'|'f',seed:number){
 const key=id+':'+sex+':'+(seed%2);const hit=birdCache.get(key);if(hit)return hit;
 const sp=BIRDS[id],bones=BIRD_BONES(sp),rest=restMats(bones),geo:Record<string,THREE.BufferGeometry|null>={};
 for(const p of BIRD_PARTS){const m=birdPart(sp,p,0,sex,seed);const bone=bones.find(b=>b.part===p)!;geo[p]=m?addRig(toGeometry(m),rest.get(bone.id)!):null;}
 const merge=(t:Tier,ids:string[],inv?:string):THREE.BufferGeometry=>{const acc=newMesh();for(const bid of ids){const b=bones.find(x=>x.id===bid)!;const mm=birdPart(sp,b.part,t,sex,seed);if(!mm)continue;const mat=rest.get(bid)!.clone();if(inv)mat.premultiply(rest.get(inv)!.clone().invert());append(acc,mm,mat);}const g=toGeometry(acc);addRig(g,inv?rest.get(inv)!:new THREE.Matrix4());return g;};
 const body=merge(1,['body','neck','head','tail','legR','legL']),wR=merge(1,['wingIR','wingOR'],'wingIR'),wL=merge(1,['wingIL','wingOL'],'wingIL');
 const far=merge(2,['body','neck','head','tail']),farFly=merge(2,['body','neck','head','tail','wingIR','wingOR','wingIL','wingOL']);
 const rig:RigModel={key,bones:bones.map(b=>({id:b.id,part:b.part,parent:b.parent})),geo,far,farFly,size:sp.body,mid:[{name:'body',bones:['body'],geo:body},{name:'wingR',bones:['wingIR'],geo:wR},{name:'wingL',bones:['wingIL'],geo:wL}]};
 const tris=[BIRD_PARTS.reduce((a,p)=>a+(geo[p]?triangles(geo[p]!)*(p==='leg'?2:1):0),0),triangles(body)+triangles(wR)+triangles(wL),triangles(far)] as [number,number,number];
 const out={rig,bones,tris};birdCache.set(key,out);return out;
}
function birdPose(id:'duck'|'goose'|'raptor',sex:'m'|'f',seed:number,req:PoseRequest):Posed{
 const sp=BIRDS[id],{bones}=birdModel(id,sex,seed),ex=new Map<string,[number,number,number]>(),set=(k:string,v:[number,number,number])=>ex.set(k,v);
 const g=req.gait,flying=g==='fly'||g==='glide',w=Math.PI*2*req.phase,t=req.t;
 let lift=sp.legLen+sp.height*.4,pitch=0,roll=0,swim=g==='swim';
 // wings: folded along the flanks (Y rotation sweeps the span backwards), or spread and flapping about the forward axis
 const fold=(side:1|-1,amount:number)=>{set(side>0?'wingIR':'wingIL',[side*Math.PI/2*amount,0,-1.5*amount]);};
 if(flying){
  const a=(g==='glide'?.06:.8)*Math.sin(w),b=(g==='glide'?.04:.8)*Math.sin(w-.8);
  for(const side of [1,-1] as const){set(side>0?'wingIR':'wingIL',[-side*(a*.75+.1),0,0]);set(side>0?'wingOR':'wingOL',[-side*(b*.8+.1),0,0]);}
  lift=sp.height;pitch=g==='glide'?-.05:.08*Math.cos(w);roll=g==='glide'?.18*Math.sin(t*.4+seed):0;
  set('neck',[0,0,-.35]);set('head',[0,0,.25]);set('legR',[0,0,-1.2]);set('legL',[0,0,-1.2]);
 }else{fold(1,1);fold(-1,1);
  if(swim){lift=sp.height*.1;set('legR',[0,0,-1.4]);set('legL',[0,0,-1.4]);}
  if(g==='graze'||g==='drink'){set('neck',[0,0,-.9]);set('head',[0,0,-.4]);}
  else if(g==='alert'){set('neck',[0,0,.35]);set('head',[0,0,.2]);}
  else {set('neck',[0,0,.06*Math.sin(t*.7+seed)]);}
  if(g==='walk'||g==='trot'||g==='gallop'){set('legR',[0,0,.5*Math.sin(w)]);set('legL',[0,0,-.5*Math.sin(w)]);set('body',[0,0,0.04*Math.sin(w*2)]);}
 }
 const mats=new Map<string,THREE.Matrix4>(),root=new THREE.Matrix4().compose(new THREE.Vector3(),new THREE.Quaternion().setFromEuler(new THREE.Euler(roll,0,pitch,'ZYX')),new THREE.Vector3(1,1,1));
 for(const b of bones){const m=bm(b,ex.get(b.id));if(b.parent)m.premultiply(mats.get(b.parent)!);else m.premultiply(root);mats.set(b.id,m);}
 if(!flying)for(const id2 of ['wingOR','wingOL'])mats.set(id2,mats.get(id2)!.clone().multiply(new THREE.Matrix4().makeScale(.001,.001,.001)));
 return {mats,lift};
}
for(const id of ['duck','goose','raptor'] as const){
 registerEntry(id,{rig:(sex,seed)=>birdModel(id,sex,seed).rig,pose:(sex,seed,req)=>birdPose(id,sex,seed,req),gait:{walkMax:.6,trotMax:1.6,stride:[.3,.5,.8]},herbivore:true,tris:(sex,seed)=>birdModel(id,sex,seed).tris});
}

// ================================================================================================================== fish
export type FishSpec={id:'trout'|'carp'|'pike'|'eel';label:string;ref:string;real:{length:number;kg:number};depth:number;width:number;headFrac:number;
 profile:readonly (readonly [f:number,h:number,w:number])[];col:{back:string;flank:string;belly:string;fin:string;eye:string;spot?:string;band?:string};hz:number;wave:number};
export const FISH:Record<'trout'|'carp'|'pike'|'eel',FishSpec>={
 trout:{id:'trout',label:'Brown trout / salmon (Salmo trutta)',ref:'0.30-0.60 m, 1-3 kg; fusiform, adipose fin, forked square tail, red-and-black spotted flanks, olive back and cream belly',
  real:{length:.45,kg:1.2},depth:.2,width:.12,headFrac:.2,profile:[[0,.02,.02],[.06,.4,.3],[.18,.7,.55],[.4,1,.8],[.62,.85,.62],[.82,.4,.3],[.94,.2,.15],[1,.28,.04]],
  col:{back:'#5b6b3a',flank:'#b9b27a',belly:'#e9e3cc',fin:'#8a7a52',eye:'#17120e',spot:'#a83a2a',band:'#d88a7a'},hz:2.4,wave:.5},
 carp:{id:'carp',label:'Common carp (Cyprinus carpio)',ref:'0.40-0.80 m, 5-10 kg; deep, thick body with a long dorsal fin, scaly bronze-gold flanks, two pairs of barbels, forked tail',
  real:{length:.55,kg:6},depth:.3,width:.14,headFrac:.22,profile:[[0,.02,.02],[.06,.45,.4],[.2,.85,.7],[.42,1,.85],[.65,.8,.62],[.84,.4,.3],[.95,.22,.14],[1,.3,.04]],
  col:{back:'#4f5a2e',flank:'#b3893c',belly:'#e4d8a8',fin:'#a07838',eye:'#17120e'},hz:1.6,wave:.4},
 pike:{id:'pike',label:'Northern pike (Esox lucius)',ref:'0.50-1.0 m, 4-8 kg; torpedo body with the dorsal and anal fins far back by the tail, duckbill snout full of teeth, green with cream bars and spots',
  real:{length:.8,kg:5},depth:.15,width:.1,headFrac:.28,profile:[[0,.02,.02],[.06,.4,.35],[.18,.6,.55],[.4,.8,.8],[.65,.9,.8],[.85,.5,.4],[.95,.22,.15],[1,.3,.04]],
  col:{back:'#3f5a2a',flank:'#7a8a3e',belly:'#e0dcb8',fin:'#9a7a3a',eye:'#d8c050',spot:'#d8d090'},hz:2,wave:.55},
 eel:{id:'eel',label:'European eel (Anguilla anguilla)',ref:'0.50-1.0 m, 1 kg; snake-like with a continuous dorsal-caudal-anal fin, small pectoral fins, olive-black back and yellow belly',
  real:{length:.8,kg:1},depth:.06,width:.055,headFrac:.1,profile:[[0,.02,.02],[.04,.5,.5],[.1,.8,.8],[.5,1,1],[.9,.8,.7],[1,.2,.2]],
  col:{back:'#2e3022',flank:'#5b5a30',belly:'#cfc890',fin:'#3c3c28',eye:'#17120e'},hz:2.2,wave:.9},
};
const FISH_BONES=(sp:FishSpec):Bn[]=>{const L=sp.real.length;return [
 {id:'fore',part:'fore',parent:null,pivot:[0,0,0],rest:[0,0,0]},
 {id:'mid',part:'mid',parent:'fore',pivot:[-L*.42,0,0],rest:[0,0,0]},
 {id:'tail',part:'tail',parent:'mid',pivot:[-L*.3,0,0],rest:[0,0,0]},
];};
/** Body profile sampled between x range [f0,f1] of the body (f from the snout 0 to the caudal peduncle 1). */
function fishBody(sp:FishSpec,m:Mesh,f0:number,f1:number,t:Tier,xOrigin:number,c0:RGB){
 const L=sp.real.length,seg=t===0?14:t===1?8:5,c=sp.col,back=hex(c.back),flank=hex(c.flank),belly=hex(c.belly);
 const pr=sp.profile,at=(f:number)=>{for(let i=0;i<pr.length-1;i++)if(f<=pr[i+1][0]){const k=(f-pr[i][0])/(pr[i+1][0]-pr[i][0]);return [pr[i][1]+(pr[i+1][1]-pr[i][1])*k,pr[i][2]+(pr[i+1][2]-pr[i][2])*k];}return [pr[pr.length-1][1],pr[pr.length-1][2]];};
 const n=Math.max(2,Math.round((f1-f0)*(t===0?16:5))+1),secs:Sec[]=[];
 for(let i=0;i<n;i++){const f=f0+(f1-f0)*i/(n-1),[h,w]=at(f);secs.push({s:-(f*L)+xOrigin,ru:sp.depth*.5*h,rv:sp.width*.5*w,sq:2.2});}
 // fish face -X in the loft above, so mirror to +X facing afterwards (done by negating s above) : s decreases with f, so the rings run from snout (+) to tail (-)
 secs.reverse();
 const spot=c.spot?hex(c.spot):null,rr=seededRandom(7);void rr;
 loft(m,secs,{seg,paint:(x,y,z,ny)=>{let col=ny>.1?mix(flank,back,smooth(.1,.75,ny)):mix(flank,belly,smooth(.0,-.55,ny));if(sp.id==='eel'||sp.id==='pike')col=mix(col,mul(col,.85),.15);if(c.band&&Math.abs(y)<sp.depth*.12)col=mix(col,hex(c.band),.35);return col;}});
 void c0;void spot;
}
function fishPart(sp:FishSpec,part:string,t:Tier):Mesh|null{
 const m=newMesh(),L=sp.real.length,c=sp.col,fin=hex(c.fin),fin2=mul(fin,.8),back=hex(c.back);
 const finP=(pts:[number,number,number][])=>plate(m,pts,fin,{paint:(i)=>i%2?fin:fin2});
 if(part==='fore'){
  fishBody(sp,m,0,.42,t,0,back);
  // head: snout taper already in the profile; add eye, jaw line, gill cover
  const hd=sp.depth*.5,wd=sp.width*.5;
  if(t===0){
   for(const sd of [-1,1]){blob(m,[-L*.06,hd*.18,sd*wd*.38],[L*.014,L*.014,L*.008],hex(c.eye),{lon:6,lat:3});
    blob(m,[-L*.17,-hd*.1,sd*wd*.7],[L*.05,L*.05,L*.01],mix(hex(c.flank),hex(c.back),.3),{lon:6,lat:3});}
   // pectoral fins
   for(const sd of [-1,1])finP([[-L*.18,-hd*.45,sd*wd*.5],[-L*.28,-hd*.8,sd*(wd*.5+L*.07)],[-L*.31,-hd*.55,sd*(wd*.5+L*.07)],[-L*.25,-hd*.4,sd*wd*.5]]);
   if(sp.id==='pike'){tube(m,[[-L*.0,-hd*.15,0],[L*.0,-hd*.25,0]],[[wd*.5,wd*.4],[wd*.3,wd*.2]],{seg:4,paint:()=>hex('#c8c090')});}
   if(sp.id==='carp')for(const sd of [-1,1])tube(m,[[L*.0,-hd*.2,sd*wd*.4],[L*.02,-hd*.5,sd*wd*.5]],[[.004,.004],[.002,.002]],{seg:3,paint:()=>hex('#cfb070')});
  }else if(t===1){for(const sd of [-1,1])finP([[-L*.18,-hd*.45,sd*wd*.5],[-L*.28,-hd*.8,sd*(wd*.5+L*.06)],[-L*.25,-hd*.4,sd*wd*.5]]);}
  // dorsal fin (anterior): trout/carp mid-back; pike/eel far back handled on tail
  if(sp.id==='trout')finP([[-L*.3,hd*.98,0],[-L*.36,hd*1.7,0],[-L*.42,hd*1.6,0],[-L*.45,hd*.98,0]]);
  if(sp.id==='carp')finP([[-L*.22,hd*.9,0],[-L*.3,hd*1.5,0],[-L*.5,hd*1.35,0],[-L*.76,hd*.95,0]]);
  if(sp.id==='eel')finP([[-L*.25,hd*.9,0],[-L*.3,hd*1.2,0],[-L*.6,hd*1.15,0],[-L*.75,hd*.95,0]]);
  return m;
 }
 if(part==='mid'){
  fishBody(sp,m,.42,.72,t,L*.42,back);
  const hd=sp.depth*.5;
  if(t<2){
   if(sp.id==='trout'||sp.id==='pike'||sp.id==='carp')for(const sd of [-1,1])finP([[-L*.1,-hd*.85,sd*sp.width*.3],[-L*.17,-hd*1.25,sd*sp.width*.55],[-L*.2,-hd*.85,sd*sp.width*.3]]);
   if(sp.id==='trout')finP([[-L*.17,-hd*.9,0],[-L*.22,-hd*1.3,0],[-L*.3,-hd*.8,0]]);
   if(sp.id==='pike')finP([[-L*.18,hd*.9,0],[-L*.22,hd*1.6,0],[-L*.3,hd*1.5,0],[-L*.32,hd*.8,0]]);
   if(sp.id==='eel')finP([[-L*.05,hd*.95,0],[-L*.1,hd*1.25,0],[-L*.3,hd*1.2,0],[-L*.36,hd*.9,0]]);
  }
  return m;
 }
 if(part==='tail'){
  fishBody(sp,m,.72,.97,t,L*.72,back);
  const hd=sp.depth*.5,x0=-L*.235,k=sp.id==='eel'?.25:1;
  // caudal fin (forked or rounded)
  const fork=sp.id==='trout'?.75:sp.id==='carp'?.55:sp.id==='pike'?.6:.9,h=hd*(sp.id==='eel'?.35:1.4);
  finP([[x0,hd*.0,0],[x0-L*.08*k,h*.95,0],[x0-L*.12*k*fork,h*.35,0],[x0-L*.08*k,-h*.9,0]]);
  if(t<2){
   if(sp.id==='trout')finP([[-L*.05,hd*.35,0],[-L*.06,hd*.55,0],[-L*.09,hd*.3,0]]);   // adipose fin
   if(sp.id==='trout'||sp.id==='carp')finP([[-L*.0,-hd*.35,0],[-L*.05,-hd*.75,0],[-L*.1,-hd*.3,0]]);   // anal fin
   if(sp.id==='pike'){finP([[-L*.0,hd*.5,0],[-L*.04,hd*1.4,0],[-L*.12,hd*1.1,0],[-L*.14,hd*.45,0]]);finP([[-L*.0,-hd*.5,0],[-L*.05,-hd*1.3,0],[-L*.12,-hd*.9,0],[-L*.14,-hd*.45,0]]);}
  }
  return m;
 }
 return null;
}
const fishCache=new Map<string,{rig:RigModel;bones:Bn[];tris:[number,number,number];sp:FishSpec}>();
function fishModel(id:'trout'|'carp'|'pike'|'eel'){
 const hit=fishCache.get(id);if(hit)return hit;
 const sp=FISH[id],bones=FISH_BONES(sp),rest=restMats(bones),geo:Record<string,THREE.BufferGeometry|null>={};
 for(const b of bones){const m=fishPart(sp,b.part,0);geo[b.part]=m?addRig(toGeometry(m),rest.get(b.id)!):null;}
 const merge=(t:Tier)=>{const acc=newMesh();for(const b of bones){const mm=fishPart(sp,b.part,t);if(mm)append(acc,mm,rest.get(b.id)!);}const g=toGeometry(acc);addRig(g,new THREE.Matrix4());return g;};
 const midGeo=bones.map(b=>{const acc=newMesh();const mm=fishPart(sp,b.part,1);if(mm)append(acc,mm);const g=toGeometry(acc);addRig(g,rest.get(b.id)!);return {name:b.id,bones:[b.id],geo:g};});
 const far=merge(2);
 const rig:RigModel={key:'fish:'+id,bones:bones.map(b=>({id:b.id,part:b.part,parent:b.parent})),geo,mid:midGeo,far,size:sp.real.length};
 const tris=[bones.reduce((a,b)=>a+triangles(geo[b.part]!),0),midGeo.reduce((a,p)=>a+triangles(p.geo),0),triangles(far)] as [number,number,number];
 const out={rig,bones,tris,sp};fishCache.set(id,out);return out;
}
function fishPose(id:'trout'|'carp'|'pike'|'eel',req:PoseRequest):Posed{
 const {sp,bones}=fishModel(id),w=Math.PI*2*req.phase,ex=new Map<string,[number,number,number]>(),sw=req.gait==='idle'?.25:1,k=sp.wave*sw;
 // body wave travels head to tail: yaw about the vertical axis, amplitude growing toward the tail
 ex.set('fore',[0,.06*k*Math.sin(w),0]);ex.set('mid',[0,.32*k*Math.sin(w-.9),0]);ex.set('tail',[0,.55*k*Math.sin(w-1.8),0]);
 const mats=new Map<string,THREE.Matrix4>();for(const b of bones){const m=bm(b,ex.get(b.id));if(b.parent)m.premultiply(mats.get(b.parent)!);mats.set(b.id,m);}
 return {mats,lift:0};
}
for(const id of ['trout','carp','pike','eel'] as const)registerEntry(id,{rig:()=>fishModel(id).rig,pose:(_s,_d,req)=>fishPose(id,req),gait:{walkMax:1,trotMax:2,stride:[.5,.8,1.2]},herbivore:false,tris:()=>fishModel(id).tris});
export const birdTris=(id:'duck'|'goose'|'raptor')=>birdModel(id,'m',1).tris;
export const fishTris=(id:'trout'|'carp'|'pike'|'eel')=>fishModel(id).tris;
void (null as unknown as SpeciesId);
