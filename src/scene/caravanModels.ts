/** Carved Option H models for trade: caravan carriers (pack animal, sled, cart,
 * boat), an armed-escort variant, a market stall that shows its real stock,
 * and the small "dropped parcel" heap requested by Societies (grain sacks, log
 * bundle, pots...). Pure specs (no three.js), same Part pipeline as buildings.
 *
 * INPUT RULE: every load/stock part comes from an actual cargo list the
 * simulation passes in (kind + amount). Empty cargo draws an empty carrier;
 * kinds that do not fit the slots are reported in `cargo.overflowKinds`
 * rather than silently dropped. Fill fraction = held / capacity. Nothing
 * here decides what is carried. Nothing has been rendered. */
import {beam,hashSeed,part,partBounds,seededRandom,specBounds,type BuildingSpec,type Part,type LodTier} from './buildingParts';
import {ensureTierSupport} from './buildingFamilies';
import {goodVisual,loadUnitParts} from './goodsVisuals';
import {HULL_SEATS,hullSize} from './hullSizes';

export type CargoStack={kind:string;amount:number};
export type CarrierKind='packAnimal'|'sled'|'cart'|'boat'|'stall';
export type CaravanInput={carrier:CarrierKind;seed:number;cargo:readonly CargoStack[];/** amount the carrier can hold in total; default per carrier */capacity?:number;
 escort?:boolean;boatClass?:keyof typeof HULL_SEATS;era?:number};
export type CaravanSpec=BuildingSpec&{cargo:{kinds:string[];units:Record<string,number>;slots:number;overflowKinds:string[];fill:number};loadPartIndices:number[]};
const DEFAULT_CAPACITY:Record<CarrierKind,number>={packAnimal:60,sled:80,cart:160,boat:240,stall:120};
const ESCORT_W=.8;

type Slot=[number,number,number,0|1];
/** Slots are base positions for units; layer 1 units stack on layer 0 (lod 0 only). */
function layout(carrier:CarrierKind,dims:{w:number;d:number}):{slots:Slot[];deckY:number}{
 const s:Slot[]=[];
 if(carrier==='packAnimal')return {deckY:1.22,slots:[[-.25,1.22,-.35,0],[.25,1.22,-.35,0],[-.25,1.22,.2,0],[.25,1.22,.2,0],[0,0,0,1],[0,0,0,1]]};
 if(carrier==='sled'){for(const z of[-.55,0,.55])for(const x of[-.22,.22])s.push([x,.26,z,0]);for(const z of[0,1])s.push([0,0,0,1]);return {deckY:.26,slots:s};}
 if(carrier==='cart'){for(const z of[-.7,-.1,.5])for(const x of[-.3,.3])s.push([x,.7,z,0]);for(const z of[0,1])s.push([0,0,0,1]);return {deckY:.7,slots:s};}
 if(carrier==='boat'){const L=dims.d*.5,n=Math.max(2,Math.floor(L/.55));for(let i=0;i<n;i++)for(const x of(dims.w>1.4?[-.3,.3]:[0]))s.push([x,.12,-L/2+(i+.5)*L/n,0]);for(let i=0;i<Math.floor(n/2);i++)s.push([0,0,0,1]);return {deckY:.12,slots:s};}
 for(const z of[.3,.6])for(const x of[-.85,-.4,.05,.5,.95].filter(v=>Math.abs(v)<dims.w/2-.3))s.push([x,.88,z,0]);
 return {deckY:.88,slots:s};
}
const wheel=(parts:Part[],x:number,z:number,D:number,t:number)=>parts.push(part('cylinder','woodDark',[D,t,D],[x-t/2,D/2,z],2,[0,0,-Math.PI/2],10),part('cylinder','woodEdge',[.14,t+.1,.14],[x-t/2-.02,D/2,z],1,[0,0,-Math.PI/2],5));

function body(c:CarrierKind,input:CaravanInput):{parts:Part[];dims:{w:number;d:number};reference:string}{
 const parts:Part[]=[],r=seededRandom(hashSeed(input.seed,'caravan',c));
 if(c==='packAnimal'){
  const dims={w:1.3,d:2.2};
  for(const sx of[-1,1])for(const sz of[-1,1])parts.push(part('cylinder','woodDark',[.13,.7,.1],[sx*.2,0,sz*.5],2,undefined,5));
  parts.push(part('box','woodMid',[.56,.52,1.3],[0,.62,0],2),part('box','woodMid',[.24,.55,.26],[0,.95,.7],1,[0.35,0,0]),part('box','woodLight',[.26,.3,.5],[0,1.28,.95],2),
   part('box','woodEdge',[.06,.2,.08],[-.08,1.55,.9],0),part('box','woodEdge',[.06,.2,.08],[.08,1.55,.9],0),beam('woodEdge',[0,.9,-.65],[0,.45,-.95],.07,0));
  // Pack saddle frame and cargo ropes; panniers hang either side when anything is carried.
  parts.push(part('box','woodDark',[.62,.08,.8],[0,1.14,-.05],1));
  return {parts,dims,reference:'Donkey/mule pack train: pack saddle frame, panniers and top load (Silk Road and Roman caravans)'};}
 if(c==='sled'){
  const dims={w:1.1+(r()*.1),d:2.4};
  for(const s of[-1,1]){parts.push(part('box','woodDark',[.1,.12,2.3],[s*.4,0,0],2));parts.push(part('box','woodDark',[.1,.18,.3],[s*.4,.12,1.05],1,[0,0,0]));}
  for(const z of[-.8,0,.8])parts.push(part('box','woodMid',[.9,.08,.12],[0,.12,z],1));
  parts.push(part('box','woodLight',[.9,.06,1.9],[0,.2,0],2),beam('woodDark',[-.35,.15,1.0],[-.2,.15,1.2],.08,1),beam('woodDark',[.35,.15,1.0],[.2,.15,1.2],.08,1));
  return {parts,dims,reference:'Nordic and steppe cargo sleds with raked runners, planked bed and tow bar (also drawn on forest tracks as a travois)'};}
 if(c==='cart'){
  const dims={w:1.7,d:2.8};
  for(const s of[-1,1])wheel(parts,s*.78,-.1,.9,.1);
  parts.push(part('cylinder','woodDark',[.12,1.6,.1],[-.8,.45,-.1],1,[0,0,-Math.PI/2],5));
  parts.push(part('box','woodMid',[1.2,.15,1.9],[0,.55,-.1],2),part('box','woodDark',[.9,.1,.1],[0,.45,.05],1));
  for(const s of[-1,1]){parts.push(part('box','woodDark',[.08,.3,1.9],[s*.56,.7,-.1],1),beam('woodDark',[s*.45,.5,.8],[s*.38,.5,1.35],.09,1));}
  parts.push(part('box','woodDark',[1.2,.3,.08],[0,.7,-1.03],1),part('box','woodDark',[1.2,.3,.08],[0,.7,.83],1));
  return {parts,dims,reference:'Two-wheeled medieval farm cart with side boards and shafts'};}
 if(c==='boat'){
  const cls=input.boatClass??'riverboat',h=hullSize(HULL_SEATS[cls]),L=h.length,Bm=h.beam,dims={w:Bm,d:L},punt=cls==='freightPunt';
  parts.push(part('box','woodDark',[Bm*.78,.12,L*.84],[0,0,0],2));
  for(const s of[-1,1]){parts.push(part('box','woodMid',[.1,.42,L*.9],[s*(Bm/2-.05),0,0],2));}
  const tip=punt?Bm*.9:Bm*.34;for(const s of[-1,1]){parts.push(part('box','woodMid',[tip,.42,L*.08],[0,0,s*(L/2-L*.04)],2));if(!punt)parts.push(part('box','woodMid',[Bm*.7,.32,L*.04],[0,0,s*(L/2-L*.12)],1));}
  parts.push(part('box','woodEdge',[.1,.08,L*.9],[-(Bm/2-.05),.42,0],1),part('box','woodEdge',[.1,.08,L*.9],[Bm/2-.05,.42,0],1));
  const seats=HULL_SEATS[cls];for(let i=0;i<Math.min(seats,6);i++){const z=-L*.4+(i+.5)*L*.8/Math.min(seats,6);if(Math.abs(z)<L*.27&&seats>3)continue;parts.push(part('box','woodLight',[Bm*.9,.06,.2],[0,.3,z],0));}
  parts.push(part('box','woodDark',[.1,.12,.3],[0,.12,L/2-.2],1)); // keel stem
  return {parts,dims,reference:'Dugout and plank river boats: lashed scout canoe, ferry skiff, braced freight punt (Dover and Nydam boats)'};}
 // Market stall: counter, posts, awning.
 const dims={w:2.6,d:1.6};
 for(const dx of[-1.2,1.2])for(const [dz,hh] of[[-.7,2.2],[.7,1.95]] as const)parts.push(beam('woodDark',[dx,0,dz],[dx,hh,dz],.09,1));
 parts.push(part('box','woodMid',[2.4,.8,.5],[0,0,.45],2),part('box','woodLight',[2.5,.08,.62],[0,.8,.45],1),part('wedge','cloth',[2.6,.38,1.5],[0,1.9,0],2),part('box','woodDark',[2.3,.1,.1],[0,.5,-.65],1),part('box','woodMid',[2.3,.7,.1],[0,0,-.72],1));
 return {parts,dims,reference:'Medieval market-square booth with a plank counter and cloth awning (stocked from real market goods)'};
}

/** Armed escort: a guard standing beside the carrier with spear, shield and a short banner pole. */
function escortParts(side:1|-1,x0:number,z:number):Part[]{
 const x=side*x0,p:Part[]=[];
 for(const dx of[-.1,.1])p.push(part('cylinder','woodDark',[.14,.8,.12],[x+dx,0,z],2,undefined,5));
 p.push(part('box','cloth',[.42,.62,.26],[x,.8,z],2),part('sphere','woodLight',[.26,.28,.26],[x,1.42,z],1),part('box','iron',[.32,.1,.3],[x,1.62,z],0));
 p.push(beam('woodLight',[x+side*.22,0,z+.1],[x+side*.22,2.2,z+.1],.06,1),part('cone','iron',[.1,.22,.1],[x+side*.22,2.2,z+.1],0,undefined,4));
 p.push(part('cylinder','woodDark',[.5,.06,.5],[x-side*.26,.95,z+.1],1,[0,0,side*Math.PI/2],8)); // round shield on the off side
 return p;
}

export function caravanSpec(input:CaravanInput):CaravanSpec{
 const {parts:carrier,dims,reference}=body(input.carrier,input),parts=[...carrier],{slots}=layout(input.carrier,dims);
 const r=seededRandom(hashSeed(input.seed,'cargo',input.carrier)),live=input.cargo.filter(c=>c.amount>0&&Number.isFinite(c.amount)).sort((a,b)=>b.amount-a.amount||a.kind.localeCompare(b.kind));
 const total=live.reduce((s,c)=>s+c.amount,0),cap=input.capacity??DEFAULT_CAPACITY[input.carrier],fill=cap>0?Math.min(1,total/cap):0;
 const wanted=total>0?Math.max(1,Math.round(fill*slots.length)):0,units:Record<string,number>={},overflow:string[]=[];
 // Largest-remainder split of `wanted` slots over the kinds actually carried (each present kind gets >=1 while slots remain).
 const shown=live.slice(0,Math.max(1,Math.min(live.length,wanted)));for(const c of live.slice(shown.length))overflow.push(c.kind);
 const shownTotal=shown.reduce((s,c)=>s+c.amount,0);let given=0;
 for(const c of shown){const u=Math.max(1,Math.floor(wanted*c.amount/shownTotal));units[c.kind]=u;given+=u;}
 for(let i=0;given<wanted;i=(i+1)%Math.max(1,shown.length)){units[shown[i].kind]++;given++;}
 for(let i=0;given>wanted;i=(i+1)%Math.max(1,shown.length)){const k=shown[shown.length-1-(i%shown.length)].kind;if(units[k]>1){units[k]--;given--;}else if(i>shown.length*3)break;}
 const loadIdx:number[]=[],order:string[]=shown.flatMap(c=>Array(units[c.kind]).fill(c.kind));
 const n0=slots.filter(q=>q[3]===0).length,seenKind=new Set<string>(),placed:{x:number;z:number;top:number}[]=[];let si=0;
 for(const kind of order){const s=slots[si++];if(!s)break;const first=!seenKind.has(kind)&&s[3]===0;seenKind.add(kind);
  let x=s[0],y=s[1],z=s[2];if(s[3]===1){const b=placed[(si-1-n0)%Math.max(1,placed.length)];if(!b)break;x=b.x;z=b.z;y=b.top;}
  const lod:LodTier=first?1:0,yaw=(r()-.5)*.3,ps=loadUnitParts(kind,x,y,z,lod,yaw);
  if(s[3]===0)placed.push({x,z,top:Math.max(...ps.map(p=>partBounds(p).maxY))-.01});
  for(const p of ps){loadIdx.push(parts.length);parts.push(s[3]===1?{...p,lod:0}:p);}}
 let w=dims.w;
 if(input.escort&&input.carrier!=='stall'){const ex=dims.w/2+ESCORT_W/2-.1;parts.push(...escortParts(1,ex,dims.d*.12));w=dims.w+ESCORT_W;
  // Re-centre so the whole group stays in its footprint: shift everything by -ESCORT_W/2.
  for(let i=0;i<parts.length;i++)parts[i]={...parts[i],pos:[parts[i].pos[0]-ESCORT_W/2,parts[i].pos[1],parts[i].pos[2]] as [number,number,number],...(parts[i].ends?{ends:[[parts[i].ends![0][0]-ESCORT_W/2,parts[i].ends![0][1],parts[i].ends![0][2]],[parts[i].ends![1][0]-ESCORT_W/2,parts[i].ends![1][1],parts[i].ends![1][2]]] as const}:{})};}
 const mb=specBounds({family:'',variantKey:'',footprint:{w,d:dims.d},parts,notes:{reference:''}}),up=(v:number)=>Math.ceil(v*20-1e-9)/20;
 const fit=(declared:number,m:number)=>m<=declared+1e-6?declared:up(m),footprint={w:fit(Math.round(w*100)/100,2*Math.max(-mb.minX,mb.maxX)),d:fit(dims.d,2*Math.max(-mb.minZ,mb.maxZ))},variantKey=`caravan|${input.carrier}|${input.carrier==='boat'?input.boatClass??'riverboat':''}|${input.escort?'escort':''}|${order.join(',')}`;
 return {family:'caravan:'+input.carrier,variantKey,footprint,parts:ensureTierSupport(parts,footprint),notes:{reference},
  cargo:{kinds:shown.map(c=>c.kind),units,slots:slots.length,overflowKinds:overflow,fill:Math.round(fill*100)/100},loadPartIndices:loadIdx};
}

/** Dropped cargo parcel (Societies request, backlog 107 stolen cargo): a small heap
 * on the ground showing the real dropped kind. 1-6 units by amount (kind unit
 * size), base <= 1.2 m, supported on the ground, tipped slightly so it reads as
 * dropped rather than stacked. */
export function parcelSpec(kind:string,amount:number,seed:number):BuildingSpec&{units:number}{
 const r=seededRandom(hashSeed(seed,'parcel',kind)),v=goodVisual(kind),units=Math.max(1,Math.min(6,Math.ceil(Math.max(0,amount)/v.unit))),parts:Part[]=[];
 const ground:[number,number][]=[[-.2,-.12],[.2,-.1],[0,.2],[-.22,.2]],stack=Math.min(units,4);
 for(let i=0;i<stack;i++)parts.push(...loadUnitParts(kind,ground[i][0]+(r()-.5)*.06,0,ground[i][1]+(r()-.5)*.06,i===0?2:1,(r()-.5)*.9));
 const top=Math.max(...loadUnitParts(kind,0,0,0).map(p=>partBounds(p).maxY))-.01;
 for(let i=0;i<units-stack;i++)parts.push(...loadUnitParts(kind,ground[i][0],top,ground[i][1],0,(r()-.5)*.5));
 const pb=specBounds({family:'',variantKey:'',footprint:{w:2,d:2},parts,notes:{reference:''}}),fe=Math.max(1.2,Math.ceil(2*Math.max(-pb.minX,pb.maxX,-pb.minZ,pb.maxZ)*20-1e-9)/20),footprint={w:fe,d:fe};
 return {family:'parcel',variantKey:`parcel|${kind}|${units}`,footprint,parts:ensureTierSupport(parts,footprint),notes:{reference:'Dropped trade goods: sack, log bundle, pot or basket heap left on the ground'},units};
}
