import type {Game} from './sim';
import type {Building} from './types';
import {soilQuality,climateAt} from './ecology';
import {calendar} from './settlement';
import {PEN_RULES,penInterior,penHousingCapacity,penFeedCapacity} from './penGeometry';
type Survey={usableAreaSquareMeters:number;interiorAreaSquareMeters:number;meanSoil:number;meanMoisture:number;productiveAreaSquareMeters:number;eligibleCapacity:number};
const surveys=new WeakMap<Game,{world:Game['world'];state:Game['state'];revision:number;water:number;pens:Map<number,{key:string;survey:Survey}>}>();
/** Physical area is sampled once per changed enclosure/terrain revision. Weather
 * and seasonal productivity are applied separately, without rescanning terrain. */
export function surveyPenPasture(g:Game,b:Building):Survey{
 let cache=surveys.get(g);const revision=g.terrainRevision(),water=g.world.waterY;if(!cache||cache.world!==g.world||cache.state!==g.state||cache.revision!==revision||cache.water!==water){cache={world:g.world,state:g.state,revision,water,pens:new Map()};surveys.set(g,cache);}
 const key=`${b.x}:${b.z}:${b.w}:${b.d}`,prior=cache.pens.get(b.id);if(prior?.key===key)return prior.survey;
 const {halfWidth:hw,halfDepth:hd}=penInterior(b),nx=Math.max(1,Math.ceil(hw)),nz=Math.max(1,Math.ceil(hd)),cellArea=4*hw*hd/(nx*nz);let usable=0,soil=0,moisture=0;
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=b.x-hw+(i+.5)*hw*2/nx,z=b.z-hd+(j+.5)*hd*2/nz,h=g.height(x,z),grade=Math.hypot((g.height(x+1,z)-g.height(x-1,z))/2,(g.height(x,z+1)-g.height(x,z-1))/2);if(h<g.waterAt(x,z)+.3||grade>PEN_RULES.maximumGrade)continue;usable+=cellArea;soil+=soilQuality(g,x,z)*cellArea;moisture+=climateAt(g,x,z,0,'clear').humidity*cellArea;}
 const meanSoil=usable?soil/usable:0,meanMoisture=usable?moisture/usable:0,interiorAreaSquareMeters=4*hw*hd,productiveAreaSquareMeters=usable*Math.max(.1,Math.min(1.2,.2+meanSoil*.5+meanMoisture*.5));
 const survey={usableAreaSquareMeters:usable,interiorAreaSquareMeters,meanSoil,meanMoisture,productiveAreaSquareMeters,eligibleCapacity:Math.min(penHousingCapacity(b),Math.max(0,Math.floor(penHousingCapacity(b)*usable/Math.max(1,interiorAreaSquareMeters)+1e-6)))};if(cache.pens.size>=PEN_RULES.maximumCachedSurveys)cache.pens.delete(cache.pens.keys().next().value!);cache.pens.set(b.id,{key,survey});return survey;
}
export function penPastureState(b:Building){const p=b.pasture??={condition:1,feed:0,care:0};p.initialFeed??=p.feed;p.feedDelivered??=0;p.feedConsumed??=0;p.grazedFood??=0;return p;}
export function penPastureReport(g:Game,b:Building){const survey=surveyPenPasture(g,b),animals=(g.state.livestock||[]).filter(a=>a.hp>0&&a.pen===b.id),keepers=g.state.units.filter(u=>u.hp>0&&u.husbandryWork?.pen===b.id&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused),phase=calendar(g).phase;
 const biomassCapacity=survey.productiveAreaSquareMeters*PEN_RULES.biomassFoodPerSquareMetre,regrowthPerSecond=biomassCapacity*PEN_RULES.springRegrowthPerSecond*PEN_RULES.seasonRegrowth[phase]*(g.state.weather==='drought'?PEN_RULES.droughtRegrowthFactor:1),demandPerSecond=animals.length*PEN_RULES.feedPerAnimalSecond;
 return{...survey,housingCapacity:penHousingCapacity(b),animals:animals.length,keepers:keepers.length,keepersNeeded:Math.max(1,Math.ceil(animals.length/PEN_RULES.animalsPerKeeper)),biomassCapacity,biomassFood:biomassCapacity*(b.pasture?.condition??1),regrowthPerSecond,demandPerSecond,feedCapacity:penFeedCapacity(b),storedFeedSeconds:demandPerSecond?(b.pasture?.feed||0)/demandPerSecond:Infinity,winter:phase===3};
}
