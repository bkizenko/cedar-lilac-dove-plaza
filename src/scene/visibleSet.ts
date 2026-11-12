/** PROPOSAL (pure, not wired): residency decision for a world of many villages. Given the camera, say which chunks
 * need a full per-building spec, a merged-chunk mesh, an impostor, or nothing; far settlements collapse to one cluster
 * card. Hard caps on draws, instances and full buildings are enforced by degrading the farthest chunks first, and
 * hysteresis keeps a chunk from popping when the camera hovers on a band edge. Codex owns culling infrastructure
 * (renderMetrics, instanceCameraCull); this only decides WHAT detail, never touches the scene. */
export type Residency='full'|'merged'|'impostor'|'none';
export type BuildingRef={id:string;x:number;z:number;/** (family,variant) key: buildings sharing it share a draw when full */kind:string};
export type SettlementRef={id:string;x:number;z:number;buildings:BuildingRef[]};
export type Bands={full:number;merged:number;impostor:number;far:number;hysteresis:number;chunk:number};
export type Caps={maxDraws:number;maxInstances:number;maxFullBuildings:number;maxCards:number};
export const DEFAULT_BANDS:Bands={full:60,merged:140,impostor:320,far:900,hysteresis:12,chunk:32};
export const DEFAULT_CAPS:Caps={maxDraws:260,maxInstances:2500,maxFullBuildings:150,maxCards:40};
export type ChunkDecision={id:string;settlement:string;residency:Residency;distance:number;buildings:string[];draws:number;instances:number};
export type CardDecision={settlement:string;x:number;z:number;distance:number};
export type Stats={draws:number;instances:number;fullBuildings:number;cards:number;byResidency:Record<Residency,number>;degraded:number};
export type VisibleSet={chunks:ChunkDecision[];cards:CardDecision[];stats:Stats;/** feed back as `previous` next frame */state:Record<string,Residency>};
const ORDER:Residency[]=['full','merged','impostor','none'];
const lvl=(r:Residency)=>ORDER.indexOf(r);

/** Level from distance, with hysteresis against the previous level: to gain detail a chunk must be h inside the edge, to lose it h outside. */
export function levelFor(d:number,b:Bands,prev?:Residency):Residency{
 const edges=[b.full,b.merged,b.impostor,b.far];let raw=edges.findIndex(e=>d<e);if(raw<0)raw=4;const cap=(n:number)=>Math.min(n,3);
 if(prev===undefined)return ORDER[cap(raw)];
 const p=lvl(prev);if(raw===p||(raw>=3&&p===3))return ORDER[cap(raw)];
 if(raw>p){ // want less detail: only once clearly past the edge of the previous level
  const edge=edges[p];return d>edge+b.hysteresis?ORDER[cap(raw)]:prev;}
 // want more detail: only once clearly inside the next-better edge
 const edge=edges[p-1];return d<edge-b.hysteresis?ORDER[cap(raw)]:prev;
}
const nearestDist=(cx:number,cz:number,cell:number,x:number,z:number)=>{const dx=Math.max(cx*cell-x,0,x-(cx+1)*cell),dz=Math.max(cz*cell-z,0,z-(cz+1)*cell);return Math.hypot(dx,dz);};
function cost(res:Residency,bs:BuildingRef[]):{draws:number;instances:number}{
 if(res==='full')return {draws:new Set(bs.map(b=>b.kind)).size,instances:bs.length};
 if(res==='merged')return {draws:1,instances:1};
 if(res==='impostor')return {draws:1,instances:bs.length};
 return {draws:0,instances:0};
}
export function visibleSet(input:{camera:{x:number;z:number};settlements:SettlementRef[];bands?:Partial<Bands>;caps?:Partial<Caps>;previous?:Record<string,Residency>}):VisibleSet{
 const b={...DEFAULT_BANDS,...input.bands},caps={...DEFAULT_CAPS,...input.caps},{camera:c}=input,prev=input.previous??{};
 const chunks:ChunkDecision[]=[],cards:CardDecision[]=[],cardOf=new Map<string,CardDecision>();
 for(const s of input.settlements){
  const sd=Math.hypot(s.x-c.x,s.z-c.z);
  // Settlements entirely beyond the far radius (by their nearest building) cost nothing; between impostor and far they are one card.
  const cells=new Map<string,BuildingRef[]>();for(const bd of s.buildings){const k=`${Math.floor(bd.x/b.chunk)},${Math.floor(bd.z/b.chunk)}`;(cells.get(k)??cells.set(k,[]).get(k)!).push(bd);}
  const list:ChunkDecision[]=[];let near=Infinity;
  for(const [k,bs] of cells){const [cx,cz]=k.split(',').map(Number),d=nearestDist(cx,cz,b.chunk,c.x,c.z),id=`${s.id}/${k}`;near=Math.min(near,d);
   const res=levelFor(d,b,prev[id]);const co=cost(res,bs);list.push({id,settlement:s.id,residency:res,distance:d,buildings:bs.map(x=>x.id),...co});}
  if(near>=b.far||!list.length)continue;
  if(near>=b.impostor){const sdist=Math.max(near,Math.min(sd,near));const card={settlement:s.id,x:s.x,z:s.z,distance:sdist};cards.push(card);cardOf.set(s.id,card);for(const ch of list){ch.residency='none';ch.draws=0;ch.instances=0;}}
  chunks.push(...list);
 }
 // Hard caps: degrade the farthest chunks first, one level at a time, until every cap holds.
 let degraded=0;const sum=()=>{let draws=cards.length,instances=cards.length,full=0;for(const ch of chunks){draws+=ch.draws;instances+=ch.instances;if(ch.residency==='full')full+=ch.buildings.length;}return {draws,instances,full};};
 const byId=new Map(input.settlements.map(s=>[s.id,s])),refs=(ch:ChunkDecision)=>byId.get(ch.settlement)!.buildings.filter(x=>ch.buildings.includes(x.id));
 for(let guard=0;guard<100000;guard++){
  const t=sum();if(t.draws<=caps.maxDraws&&t.instances<=caps.maxInstances&&t.full<=caps.maxFullBuildings)break;
  const needFull=t.full>caps.maxFullBuildings;
  const cand=chunks.filter(ch=>ch.residency!=='none'&&(!needFull||ch.residency==='full')).sort((a,z)=>z.distance-a.distance)[0];
  if(!cand)break;const nxt=ORDER[lvl(cand.residency)+1];cand.residency=nxt;Object.assign(cand,cost(nxt,refs(cand)));degraded++;
  // a settlement with nothing left drawn becomes a card
  if(nxt==='none'&&!cardOf.has(cand.settlement)&&chunks.filter(x=>x.settlement===cand.settlement).every(x=>x.residency==='none')){const s=byId.get(cand.settlement)!,card={settlement:s.id,x:s.x,z:s.z,distance:Math.hypot(s.x-c.x,s.z-c.z)};cards.push(card);cardOf.set(s.id,card);}
 }
 cards.sort((a,z)=>a.distance-z.distance);while(cards.length>caps.maxCards)cards.pop();
 const t=sum(),state:Record<string,Residency>={},by:Record<Residency,number>={full:0,merged:0,impostor:0,none:0};
 // Remember what was DECIDED by distance (not by caps) would cause pop when caps relax; remember the drawn level so a capped chunk stays calm.
 for(const ch of chunks){state[ch.id]=ch.residency;by[ch.residency]++;}
 return {chunks,cards,stats:{draws:t.draws,instances:t.instances,fullBuildings:t.full,cards:cards.length,byResidency:by,degraded},state};
}
