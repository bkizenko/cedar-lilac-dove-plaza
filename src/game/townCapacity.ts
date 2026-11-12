import type {Game} from './sim';
import {walkLabels} from './mountains';
import {soilQuality} from './ecology';
import {influenceRadius} from './territory';
import {INFLUENCE_RULES} from './influenceField';

/** GW-14 multiple towns per landmass (Grok W-World). How many settlements each
 * landmass (walk-grid component) can hold under the game's own rules: candidate
 * town halls on a lattice are tested with the real `placementIssue('townhall', …)`
 * (spacing from existing settlements, clump, terrain, explored site for the
 * player), and accepted greedily best-soil-first while keeping the same spacing
 * from each other. Larger islands therefore support more towns. Whether the
 * five-hall administrative cap should scale with landmass size is a rules call
 * for Codex/Boris; `administrativeCap` reports the current rule separately. */
export const TOWN_CAPACITY_RULES={version:1,latticeMetres:24,spacingMetres:75,administrativeCap:5,minimumLandmassSquareMetres:6000} as const;
/** Towns whose full territories (town-hall influence core + fade) do not overlap: no self-contested land. */
export function territorySpacingMetres(){return 2*(influenceRadius('townhall')*INFLUENCE_RULES.radiusScale+INFLUENCE_RULES.fadeMeters);}
export type LandmassTowns={label:number;areaSquareMetres:number;existing:number;
 /** Additional halls the current rules admit (75 m spacing). */sites:{x:number;z:number;soil:number}[];capacity:number;
 /** Additional halls whose territories would not overlap any settlement's. */territorySites:{x:number;z:number;soil:number}[];territoryCapacity:number};

export function townCapacity(g:Game,team=0){
 const R=TOWN_CAPACITY_RULES,size=g.world.size,{W,labels}=walkLabels(g),wc=size/W,area=new Map<number,number>();
 for(let i=0;i<labels.length;i++)if(labels[i]>=0)area.set(labels[i],(area.get(labels[i])??0)+wc*wc);
 const labelAt=(x:number,z:number)=>{const ix=Math.floor((x+size/2)/wc),iz=Math.floor((z+size/2)/wc);return ix<0||iz<0||ix>=W||iz>=W?-1:labels[iz*W+ix];};
 const near=(x:number,z:number)=>{for(let r=0;r<=10;r+=2)for(let k=0;k<12;k++){const l=labelAt(x+Math.cos(k/12*Math.PI*2)*r,z+Math.sin(k/12*Math.PI*2)*r);if(l>=0)return l;}return -1;};
 const settlements=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&(b.type==='townhall'||b.type==='cornerstone'));
 const candidates:{x:number;z:number;label:number;soil:number}[]=[];
 for(let z=-size/2+R.latticeMetres/2;z<size/2;z+=R.latticeMetres)for(let x=-size/2+R.latticeMetres/2;x<size/2;x+=R.latticeMetres){
  const label=labelAt(x,z);if(label<0||(area.get(label)??0)<R.minimumLandmassSquareMetres)continue;
  if(g.placementIssue('townhall',x,z,team))continue;candidates.push({x,z,label,soil:+soilQuality(g,x,z).toFixed(3)});}
 candidates.sort((a,b)=>b.soil-a.soil||a.z-b.z||a.x-b.x);
 const out=new Map<number,LandmassTowns>();
 const get=(label:number)=>{let m=out.get(label);if(!m){m={label,areaSquareMetres:Math.round(area.get(label)??0),existing:0,sites:[],capacity:0,territorySites:[],territoryCapacity:0};out.set(label,m);}return m;};
 for(const s of settlements){const l=near(s.x,s.z);if(l>=0)get(l).existing++;}
 const chosen:{x:number;z:number}[]=[];
 for(const c of candidates){if(chosen.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<R.spacingMetres))continue;chosen.push(c);get(c.label).sites.push({x:c.x,z:c.z,soil:c.soil});}
 const wide=territorySpacingMetres(),roomy:{x:number;z:number}[]=settlements.map(s=>({x:s.x,z:s.z}));
 for(const c of candidates){if(roomy.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<wide))continue;roomy.push(c);get(c.label).territorySites.push({x:c.x,z:c.z,soil:c.soil});}
 for(const m of out.values()){m.capacity=m.existing+m.sites.length;m.territoryCapacity=m.existing+m.territorySites.length;}
 const halls=settlements.filter(b=>b.type==='townhall').length;
 return{landmasses:[...out.values()].sort((a,b)=>b.areaSquareMetres-a.areaSquareMetres),halls,administrativeCap:R.administrativeCap,hallsBeforeCap:Math.max(0,R.administrativeCap-halls)};
}
