/** V14 opening survey. Actual dry navigation cells and live collector sampling;
 * no revealed cells or invented water are added to the world. */
import type {LocalWaterBody} from './localWater';
export const OPENING_WATER_RULES={knownBankDistanceMetres:22,navigationWidth:520,clearanceMetres:.12,maxCellRiseMetres:2.45,candidateBankLimit:256,homeOffsetMetres:16,campFoundationHalfExtentMetres:6,maxFoundationReliefMetres:3,nearDryApproaches:6,outerDryApproaches:4} as const;
type Point={x:number;z:number};
type Terrain={size:number;height:(x:number,z:number)=>number;water:(x:number,z:number)=>number;rivers:{pts:Point[]}[];features?:({kind:string}&Point)[];waterBodies:LocalWaterBody[]};
export function openingWaterSurvey(t:Terrain){
 const rules=OPENING_WATER_RULES,half=t.size/2,cell=t.size/rules.navigationWidth,sources:Point[]=[],banks:{x:number;z:number;sourceX:number;sourceZ:number}[]=[],dry=new Map<number,boolean>();
 const coords=(x:number,z:number)=>({ix:Math.floor((x+half)/cell),iz:Math.floor((z+half)/cell)});
 const dryCell=(ix:number,iz:number)=>{
  if(ix<0||iz<0||ix>=rules.navigationWidth||iz>=rules.navigationWidth)return false;
  const key=iz*rules.navigationWidth+ix,prior=dry.get(key);if(prior!==undefined)return prior;
  const x=-half+(ix+.5)*cell,z=-half+(iz+.5)*cell,h=t.height(x,z);
  let ok=Math.abs(x)<=half-1.5&&Math.abs(z)<=half-1.5&&h>=t.water(x,z)+rules.clearanceMetres&&Math.abs(h-t.height(x+cell,z))<=rules.maxCellRiseMetres&&Math.abs(h-t.height(x,z+cell))<=rules.maxCellRiseMetres;
  if(ok)for(const dz of[-.48,0,.48])for(const dx of[-.48,0,.48])if(t.height(x+dx*cell,z+dz*cell)<t.water(x+dx*cell,z+dz*cell)+rules.clearanceMetres)ok=false;
  dry.set(key,ok);return ok;
 };
 const reachable=(a:Point,b:Point)=>{const from=coords(a.x,a.z),to=coords(b.x,b.z);for(const axis of[0,1]){let{ix,iz}=from,ok=dryCell(ix,iz);for(let pass=0;pass<2&&ok;pass++){const horizontal=(pass+axis)%2===0;while(ok&&(horizontal?ix!==to.ix:iz!==to.iz)){if(horizontal)ix+=Math.sign(to.ix-ix);else iz+=Math.sign(to.iz-iz);ok=dryCell(ix,iz);}}if(ok)return true;}return false;};
 for(const river of t.rivers)for(let i=1;i<river.pts.length-2;i++){const a=river.pts[i-1],b=river.pts[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/8));for(let j=0;j<steps;j++)sources.push({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps});}
 for(const f of t.features||[])if(f.kind==='lake')sources.push(f);
 for(const body of t.waterBodies)if(body.kind==='lake'&&body.shoreline){const stride=Math.max(1,Math.floor(body.shoreline.length/16));for(let i=0;i<body.shoreline.length;i+=stride){const p=body.shoreline[i];sources.push({x:body.x+(p.x-body.x)*.94,z:body.z+(p.z-body.z)*.94});}}
 const seen=new Set<string>();
 for(const p of sources){if(t.height(p.x,p.z)>t.water(p.x,p.z)+.25)continue;for(const d of[8,16,24,32])for(let i=0;i<12;i++){const a=i*Math.PI/6,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d,key=`${Math.round(x)},${Math.round(z)}`;if(seen.has(key))continue;seen.add(key);const c=coords(x,z);if(!dryCell(c.ix,c.iz))continue;let wetReach=false;for(let j=0;j<8;j++){const a=j*Math.PI/4,px=x+Math.cos(a)*5,pz=z+Math.sin(a)*5;if(t.height(px,pz)<t.water(px,pz)+.2)wetReach=true;}if(wetReach)banks.push({x,z,sourceX:p.x,sourceZ:p.z});}}
 return {
  at(home:Point){const bank=banks.filter(b=>Math.hypot(b.x-home.x,b.z-home.z)<=rules.knownBankDistanceMetres&&reachable(home,b)).sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z))[0];return bank?{bankX:bank.x,bankZ:bank.z,sourceX:bank.sourceX,sourceZ:bank.sourceZ,bankDistanceMetres:Math.hypot(bank.x-home.x,bank.z-home.z),surveyedDryCells:dry.size}:null;},
  candidates(near:Point){const points:Point[]=[],used=new Set<string>();for(const b of [...banks].sort((a,b)=>Math.hypot(a.x-near.x,a.z-near.z)-Math.hypot(b.x-near.x,b.z-near.z)).slice(0,rules.candidateBankLimit))for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.round((b.x+Math.cos(a)*rules.homeOffsetMetres)/2)*2,z=Math.round((b.z+Math.sin(a)*rules.homeOffsetMetres)/2)*2,key=`${x},${z}`;if(!used.has(key)){used.add(key);points.push({x,z});}}return points;},
 };
}
