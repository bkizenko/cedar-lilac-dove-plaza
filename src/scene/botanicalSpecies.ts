/** Botanical species table and site-driven species choice (pure data and maths, no three.js). Each species carries real proportions:
 * height in metres, trunk radius, flare, where the trunk forks, crown reach, bark pattern, leaf and autumn colours, and its architecture
 * (decurrent dome, excurrent whorled spire, weeping, palm, flat umbrella, swollen bottle, stilted mangrove, shrub stool, columnar flame, snag).
 * Species choice reads the ecological province, moisture, temperature, slope, soil depth and aspect, so a stand is not one tree repeated. */
export type Architecture='decurrent'|'whorl'|'weeping'|'palm'|'umbrella'|'bottle'|'mangrove'|'shrub'|'column'|'snag';
export type BarkPattern='ridged'|'smooth'|'birch'|'scaly'|'peeling'|'ringed'|'rough'|'gnarled';
export type BaseForm='broadleaf'|'conifer'|'willow'|'acacia'|'palm'|'stunted'|'scrub';
export type Rgb=[number,number,number];
export type BotanicalSpecies={
 id:string;label:string;group:BaseForm;arch:Architecture;evergreen:boolean;
 /** Mature height (m), base and top trunk radius, root flare (fraction of base), fork height as a fraction of H (decurrent) or bare bole (whorl/umbrella). */
 H:number;r0:number;rTop:number;flare:number;fork:number;
 limbs:[number,number];pitch:number;crownR:number;crownH:number;clumpR:number;cards:[number,number];cardSize:[number,number];tile:number;flat:number;
 bark:{pattern:BarkPattern;base:Rgb;dark:Rgb;light:Rgb;moss:number};
 /** Warm top / cool underside tints baked into foliage. */
 top:Rgb;bottom:Rgb;leaf:string;autumn:string[];
 lean:number;curve:number;sparse:number;whorlLen?:number;whorlDroop?:number;fronds?:number;
};
const rgb=(r:number,g:number,b:number):Rgb=>[r,g,b];
const WARM:Rgb=[1.2,1.15,.82],COOL:Rgb=[.62,.74,.72];
export const BOTANICAL_SPECIES:BotanicalSpecies[]=[
 {id:'oak',label:'English oak',group:'broadleaf',arch:'decurrent',evergreen:false,H:8.6,r0:.44,rTop:.2,flare:.7,fork:.3,limbs:[4,5],pitch:.98,crownR:4.7,crownH:4.1,clumpR:1.9,cards:[26,9],cardSize:[1.0,1.5],tile:0,flat:.18,
  bark:{pattern:'ridged',base:rgb(.36,.3,.24),dark:rgb(.17,.14,.11),light:rgb(.52,.45,.35),moss:.4},top:WARM,bottom:COOL,leaf:'#5d8c37',autumn:['#a8662a','#9a5a22','#b87a30','#c28a3a'],lean:.05,curve:.5,sparse:1},
 {id:'beech',label:'Beech',group:'broadleaf',arch:'decurrent',evergreen:false,H:10.2,r0:.38,rTop:.17,flare:.8,fork:.36,limbs:[4,6],pitch:.72,crownR:4,crownH:5.4,clumpR:1.8,cards:[28,10],cardSize:[1,1.45],tile:0,flat:.1,
  bark:{pattern:'smooth',base:rgb(.55,.52,.47),dark:rgb(.33,.31,.28),light:rgb(.66,.63,.57),moss:.55},top:[1.12,1.14,.8],bottom:[.55,.7,.66],leaf:'#4c8a3e',autumn:['#c0652a','#d27a2e','#b5521f','#a8481a'],lean:.03,curve:.25,sparse:1},
 {id:'birch',label:'Silver birch',group:'broadleaf',arch:'decurrent',evergreen:false,H:9.6,r0:.17,rTop:.055,flare:.35,fork:.46,limbs:[4,6],pitch:.46,crownR:2.1,crownH:4.6,clumpR:1.1,cards:[20,7],cardSize:[.95,1.35],tile:6,flat:0,
  bark:{pattern:'birch',base:rgb(.88,.86,.8),dark:rgb(.1,.1,.1),light:rgb(.95,.93,.88),moss:0},top:[1.22,1.2,.8],bottom:[.7,.82,.7],leaf:'#86ae3a',autumn:['#e0b92f','#d9a62a','#e8c840','#cfa026'],lean:.09,curve:.9,sparse:.9},
 {id:'maple',label:'Field maple',group:'broadleaf',arch:'decurrent',evergreen:false,H:8.2,r0:.34,rTop:.17,flare:.6,fork:.28,limbs:[5,6],pitch:.86,crownR:3.8,crownH:3.9,clumpR:1.7,cards:[26,9],cardSize:[1,1.4],tile:0,flat:.12,
  bark:{pattern:'ridged',base:rgb(.42,.38,.34),dark:rgb(.22,.2,.17),light:rgb(.55,.5,.43),moss:.25},top:WARM,bottom:COOL,leaf:'#4e8a2e',autumn:['#c43a1f','#d8582a','#e08a2a','#b82a1c'],lean:.04,curve:.35,sparse:1},
 {id:'poplar',label:'Black poplar',group:'broadleaf',arch:'decurrent',evergreen:false,H:13.2,r0:.3,rTop:.1,flare:.5,fork:.17,limbs:[6,8],pitch:.2,crownR:1.7,crownH:10.5,clumpR:1.3,cards:[18,6],cardSize:[.95,1.3],tile:6,flat:0,
  bark:{pattern:'ridged',base:rgb(.34,.31,.27),dark:rgb(.16,.14,.12),light:rgb(.48,.44,.37),moss:.1},top:[1.18,1.2,.82],bottom:[.58,.74,.62],leaf:'#69993a',autumn:['#e6c53a','#dcb42e','#d9a82a'],lean:.06,curve:.3,sparse:.95},
 {id:'willow',label:'Weeping willow',group:'willow',arch:'weeping',evergreen:false,H:7.6,r0:.52,rTop:.22,flare:.8,fork:.3,limbs:[4,5],pitch:.9,crownR:3.9,crownH:3.4,clumpR:1.8,cards:[26,9],cardSize:[.9,1.3],tile:2,flat:.2,
  bark:{pattern:'ridged',base:rgb(.31,.28,.22),dark:rgb(.14,.12,.09),light:rgb(.44,.4,.3),moss:.5},top:[1.12,1.15,.78],bottom:[.64,.78,.66],leaf:'#7ea04c',autumn:['#c9b348','#b9a640','#d6bd4a'],lean:.12,curve:.7,sparse:1},
 {id:'hawthorn',label:'Hawthorn',group:'scrub',arch:'shrub',evergreen:false,H:3,r0:.1,rTop:.05,flare:.3,fork:.05,limbs:[5,7],pitch:.7,crownR:1.7,crownH:2.2,clumpR:.95,cards:[16,6],cardSize:[.7,1],tile:0,flat:0,
  bark:{pattern:'ridged',base:rgb(.34,.28,.23),dark:rgb(.16,.13,.1),light:rgb(.48,.4,.31),moss:.1},top:[1.2,1.15,.8],bottom:[.6,.72,.6],leaf:'#6a8f40',autumn:['#c0872a','#a8441e','#d9a233'],lean:0,curve:.9,sparse:1},
 {id:'scotsPine',label:'Scots pine',group:'conifer',arch:'decurrent',evergreen:true,H:12.4,r0:.34,rTop:.12,flare:.55,fork:.6,limbs:[4,5],pitch:1.2,crownR:3.7,crownH:3.4,clumpR:1.6,cards:[18,7],cardSize:[1.3,1.9],tile:1,flat:.7,
  bark:{pattern:'scaly',base:rgb(.4,.3,.24),dark:rgb(.19,.14,.1),light:rgb(.6,.42,.3),moss:0},top:[1.05,1.12,.9],bottom:[.5,.66,.62],leaf:'#466f4a',autumn:[],lean:.08,curve:.8,sparse:1},
 {id:'stonePine',label:'Stone pine',group:'conifer',arch:'umbrella',evergreen:true,H:10.8,r0:.42,rTop:.16,flare:.6,fork:.56,limbs:[4,5],pitch:1.25,crownR:5.6,crownH:2.7,clumpR:2.1,cards:[20,8],cardSize:[1.4,2],tile:1,flat:.9,
  bark:{pattern:'scaly',base:rgb(.44,.32,.24),dark:rgb(.2,.14,.1),light:rgb(.64,.46,.32),moss:0},top:[1.08,1.12,.88],bottom:[.52,.66,.6],leaf:'#4b7448',autumn:[],lean:.1,curve:.7,sparse:1},
 {id:'spruce',label:'Norway spruce',group:'conifer',arch:'whorl',evergreen:true,H:13.4,r0:.4,rTop:.03,flare:.6,fork:.07,limbs:[6,7],pitch:0,crownR:3,crownH:12,clumpR:1,cards:[0,0],cardSize:[1,1],tile:1,flat:0,
  bark:{pattern:'scaly',base:rgb(.4,.3,.24),dark:rgb(.18,.13,.1),light:rgb(.56,.4,.3),moss:.15},top:[1.08,1.12,.95],bottom:[.46,.6,.6],leaf:'#2f5a3f',autumn:[],lean:.03,curve:.3,sparse:1,whorlLen:3,whorlDroop:.38},
 {id:'fir',label:'Silver fir',group:'conifer',arch:'whorl',evergreen:true,H:12.2,r0:.36,rTop:.03,flare:.5,fork:.1,limbs:[6,7],pitch:0,crownR:2.4,crownH:11,clumpR:1,cards:[0,0],cardSize:[1,1],tile:1,flat:0,
  bark:{pattern:'smooth',base:rgb(.5,.46,.41),dark:rgb(.28,.26,.23),light:rgb(.62,.58,.52),moss:.2},top:[1.04,1.14,1],bottom:[.44,.62,.62],leaf:'#2b5e47',autumn:[],lean:.02,curve:.2,sparse:1,whorlLen:2.3,whorlDroop:-.12},
 {id:'cedar',label:'Cedar of Lebanon',group:'conifer',arch:'decurrent',evergreen:true,H:10.4,r0:.66,rTop:.22,flare:.7,fork:.22,limbs:[4,5],pitch:1.32,crownR:5.4,crownH:4.2,clumpR:2.3,cards:[22,8],cardSize:[1.5,2.1],tile:1,flat:.95,
  bark:{pattern:'scaly',base:rgb(.31,.26,.22),dark:rgb(.14,.11,.09),light:rgb(.47,.39,.31),moss:.1},top:[1.02,1.12,.92],bottom:[.46,.62,.58],leaf:'#3d684c',autumn:[],lean:.05,curve:.6,sparse:1},
 {id:'cypress',label:'Mediterranean cypress',group:'conifer',arch:'column',evergreen:true,H:10.6,r0:.2,rTop:.08,flare:.3,fork:.05,limbs:[0,0],pitch:0,crownR:1.2,crownH:9.8,clumpR:.9,cards:[10,4],cardSize:[1,1.4],tile:1,flat:0,
  bark:{pattern:'ridged',base:rgb(.36,.29,.24),dark:rgb(.17,.13,.1),light:rgb(.5,.4,.3),moss:0},top:[1.05,1.12,.9],bottom:[.46,.6,.56],leaf:'#37603b',autumn:[],lean:.02,curve:.2,sparse:1},
 {id:'juniper',label:'Juniper',group:'stunted',arch:'decurrent',evergreen:true,H:4.8,r0:.2,rTop:.06,flare:.4,fork:.1,limbs:[5,6],pitch:.38,crownR:1.7,crownH:3.8,clumpR:1.1,cards:[14,6],cardSize:[.9,1.3],tile:1,flat:.1,
  bark:{pattern:'ridged',base:rgb(.42,.3,.24),dark:rgb(.2,.14,.11),light:rgb(.6,.42,.3),moss:0},top:[.98,1.08,.95],bottom:[.44,.58,.56],leaf:'#4d6d56',autumn:[],lean:.06,curve:1,sparse:1},
 {id:'krummholz',label:'Wind-bent mountain pine',group:'stunted',arch:'decurrent',evergreen:true,H:3.4,r0:.26,rTop:.07,flare:.5,fork:.15,limbs:[4,5],pitch:1.2,crownR:2.6,crownH:1.9,clumpR:1.3,cards:[14,6],cardSize:[1,1.5],tile:1,flat:.55,
  bark:{pattern:'scaly',base:rgb(.38,.28,.22),dark:rgb(.16,.12,.09),light:rgb(.55,.38,.26),moss:.1},top:[1.02,1.1,.92],bottom:[.46,.6,.58],leaf:'#43664f',autumn:[],lean:.32,curve:1.2,sparse:.9},
 {id:'coconutPalm',label:'Coconut palm',group:'palm',arch:'palm',evergreen:true,H:9.6,r0:.2,rTop:.12,flare:.7,fork:0,limbs:[0,0],pitch:0,crownR:3.4,crownH:2,clumpR:1,cards:[0,0],cardSize:[1,1],tile:4,flat:0,
  bark:{pattern:'ringed',base:rgb(.58,.5,.4),dark:rgb(.34,.28,.21),light:rgb(.7,.62,.5),moss:0},top:[1.15,1.15,.8],bottom:[.55,.7,.55],leaf:'#5e9a3c',autumn:[],lean:.22,curve:1.2,sparse:1,fronds:13},
 {id:'datePalm',label:'Date palm',group:'palm',arch:'palm',evergreen:true,H:7.4,r0:.3,rTop:.22,flare:.9,fork:0,limbs:[0,0],pitch:0,crownR:3,crownH:2.4,clumpR:1,cards:[0,0],cardSize:[1,1],tile:4,flat:0,
  bark:{pattern:'rough',base:rgb(.46,.36,.26),dark:rgb(.22,.16,.11),light:rgb(.62,.5,.36),moss:0},top:[1.1,1.12,.8],bottom:[.5,.66,.52],leaf:'#5a8f3c',autumn:[],lean:.1,curve:.5,sparse:1,fronds:18},
 {id:'acacia',label:'Flat-topped acacia',group:'acacia',arch:'umbrella',evergreen:true,H:6.4,r0:.3,rTop:.12,flare:.6,fork:.45,limbs:[3,4],pitch:.9,crownR:4.4,crownH:1.9,clumpR:2,cards:[24,9],cardSize:[1,1.4],tile:6,flat:.95,
  bark:{pattern:'ridged',base:rgb(.33,.27,.22),dark:rgb(.15,.12,.09),light:rgb(.48,.38,.28),moss:0},top:[1.18,1.1,.75],bottom:[.66,.72,.6],leaf:'#8a9440',autumn:[],lean:.14,curve:.9,sparse:.9},
 {id:'baobab',label:'Baobab',group:'acacia',arch:'bottle',evergreen:false,H:7.2,r0:1.25,rTop:.5,flare:.35,fork:.62,limbs:[5,7],pitch:.9,crownR:3.4,crownH:2.1,clumpR:1.5,cards:[14,6],cardSize:[1,1.4],tile:0,flat:.3,
  bark:{pattern:'rough',base:rgb(.55,.47,.4),dark:rgb(.32,.26,.21),light:rgb(.68,.58,.48),moss:0},top:[1.15,1.12,.8],bottom:[.6,.7,.58],leaf:'#6f8f3a',autumn:['#a89a3a','#b8a040'],lean:.02,curve:.3,sparse:.6},
 {id:'mangrove',label:'Mangrove',group:'willow',arch:'mangrove',evergreen:true,H:5.2,r0:.2,rTop:.12,flare:.2,fork:.35,limbs:[4,5],pitch:.9,crownR:3,crownH:2.4,clumpR:1.5,cards:[22,8],cardSize:[.9,1.3],tile:0,flat:.2,
  bark:{pattern:'ridged',base:rgb(.3,.24,.2),dark:rgb(.13,.1,.08),light:rgb(.42,.34,.26),moss:.3},top:[1.05,1.15,.8],bottom:[.5,.7,.55],leaf:'#3f7a3a',autumn:[],lean:.05,curve:.5,sparse:1},
 {id:'tamarisk',label:'Tamarisk',group:'acacia',arch:'shrub',evergreen:false,H:4.8,r0:.14,rTop:.05,flare:.3,fork:.05,limbs:[5,6],pitch:.7,crownR:2.3,crownH:3.6,clumpR:1.3,cards:[18,7],cardSize:[1,1.4],tile:2,flat:.1,
  bark:{pattern:'ridged',base:rgb(.4,.28,.22),dark:rgb(.2,.13,.1),light:rgb(.56,.4,.3),moss:0},top:[1.15,1.15,.95],bottom:[.62,.76,.7],leaf:'#7f9a62',autumn:['#b9a05a','#a88f4a'],lean:.06,curve:1,sparse:.9},
 {id:'olive',label:'Olive',group:'acacia',arch:'decurrent',evergreen:true,H:5.4,r0:.4,rTop:.16,flare:.5,fork:.24,limbs:[4,5],pitch:.8,crownR:3.1,crownH:2.7,clumpR:1.5,cards:[24,8],cardSize:[.9,1.3],tile:2,flat:.25,
  bark:{pattern:'gnarled',base:rgb(.42,.38,.33),dark:rgb(.2,.17,.14),light:rgb(.58,.54,.46),moss:.1},top:[1.05,1.12,.95],bottom:[.58,.7,.64],leaf:'#7a8c5a',autumn:[],lean:.04,curve:1.4,sparse:1},
 {id:'eucalyptus',label:'Gum tree',group:'acacia',arch:'decurrent',evergreen:true,H:14,r0:.36,rTop:.1,flare:.45,fork:.52,limbs:[4,5],pitch:.62,crownR:3.6,crownH:5.4,clumpR:1.7,cards:[20,8],cardSize:[1.2,1.8],tile:2,flat:.1,
  bark:{pattern:'peeling',base:rgb(.78,.74,.68),dark:rgb(.38,.33,.28),light:rgb(.9,.88,.82),moss:0},top:[1.04,1.1,.96],bottom:[.54,.68,.66],leaf:'#6f8f6a',autumn:[],lean:.1,curve:.9,sparse:.9},
 {id:'snag',label:'Dead standing tree',group:'broadleaf',arch:'snag',evergreen:true,H:8,r0:.34,rTop:.1,flare:.6,fork:.4,limbs:[3,4],pitch:.9,crownR:2,crownH:3,clumpR:1,cards:[0,0],cardSize:[1,1],tile:0,flat:0,
  bark:{pattern:'ridged',base:rgb(.42,.4,.36),dark:rgb(.2,.19,.17),light:rgb(.6,.58,.52),moss:.2},top:WARM,bottom:COOL,leaf:'#6f6a50',autumn:[],lean:.1,curve:1,sparse:0},
];
export const SPECIES_BY_ID:Record<string,BotanicalSpecies>=Object.fromEntries(BOTANICAL_SPECIES.map(s=>[s.id,s]));
export const SPECIES_IDS=BOTANICAL_SPECIES.map(s=>s.id);
export const VARIANTS_PER_SPECIES=3;
/** Age classes baked into geometry variants: 0 mature, 1 young and vigorous, 2 old with gnarled, broken limbs. */
export type AgeClass='mature'|'young'|'old';
export const AGE_CLASSES:AgeClass[]=['mature','young','old'];
export type TreeSite={moisture:number;/** degrees C relative to the temperate norm */temp:number;/** rise over run, 0..~1 */slope:number;/** 0..1, thin or scree soil near 0 */soil:number;/** -1 cool shaded .. +1 sun-baked */aspect:number;/** metres to open fresh or salt water */waterDist:number};
export const DEFAULT_SITE:TreeSite={moisture:.5,temp:0,slope:.05,soil:.7,aspect:0,waterDist:200};
function unit(id:number,seed:number,salt:number){let n=(id^seed^Math.imul(salt,0x9e3779b1))|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
export {unit as stableUnit};
const clamp=(v:number,a=0,b=1)=>v<a?a:v>b?b:v;
/** Species weights for a base group on a given site. The base group comes from the existing biome rows (so ecology still decides how much
 * is conifer, willow, palm...); the site decides which species of that group grows here. */
export function speciesWeights(base:BaseForm,kind:string,site:TreeSite):[string,number][]{
 const {moisture:m,temp:t,slope:sl,soil,aspect,waterDist}=site,cold=clamp(-t/6),hot=clamp(t/6),dry=clamp((.5-m)/.4),wet=clamp((m-.5)/.4),thin=clamp((.4-soil)/.4),sunny=clamp(aspect),shaded=clamp(-aspect),coast=kind==='warm-coast'||kind==='wetland';
 switch(base){
 case 'broadleaf':return [
  ['oak',1.1*(1-.5*wet)*(1-.5*cold)],['beech',.9*(1-.7*dry)*(1-.6*thin)*(1+.5*shaded)],['birch',.55+1.4*cold+1.1*thin+.3*sunny],['maple',.55*(1-.4*dry)],['poplar',.2+1.1*wet*(1-cold)],
  ['olive',hot>.15||dry>.5?.9*(hot+dry)*(kind==='dry-scrub'||kind==='warm-coast'||kind==='arid'?1.6:.4):0],['eucalyptus',(hot>.35&&dry>.3)?.35*hot*dry:0],['snag',.05+.08*thin+.04*sunny],['hawthorn',.1*(kind==='meadow'?1.5:.6)]];
 case 'conifer':return [
  ['spruce',(1.2+cold*1.2)*(1-.6*dry)*(1-.4*hot)],['fir',.7*(1-.5*dry)*(1+.6*shaded)*(1-.6*hot)],['scotsPine',.7+.8*thin+.4*sunny+.3*dry],['stonePine',hot>.2?.5*hot*(1+dry):0],['cedar',(hot>.1&&sl>.1)?.45*(1+sl):.06],
  ['cypress',hot>.15?.55*hot*(1+.8*dry):0],['juniper',.12+.7*thin+.4*dry],['snag',.05+.08*thin]];
 case 'willow':return [
  ['willow',1.2*(1-.6*hot)],['poplar',.55*(1-.3*cold)],['birch',.25+.9*cold],['mangrove',(hot>.25&&coast&&waterDist<40)?2.4*hot:0],['hawthorn',.1]];
 case 'acacia':return [
  ['acacia',1.1+.6*dry],['tamarisk',.35+.9*clamp(1-waterDist/50)],['olive',.7*(1-.5*wet)],['baobab',hot>.3&&dry>.35?.22*hot:0],['eucalyptus',.3*hot],['cypress',.25*hot],['snag',.05+.1*dry]];
 case 'palm':return [
  ['coconutPalm',1.2*(1-.6*dry)*(coast?1.4:1)],['datePalm',.35+1.1*dry*(1+clamp(1-waterDist/30)),]];
 case 'stunted':return [
  ['krummholz',1+1.3*cold+.5*thin],['juniper',.8+.5*dry+.3*thin],['birch',.1+.5*cold],['snag',.1+.12*thin]];
 default:return [
  ['hawthorn',1],['juniper',.35+.5*dry],['tamarisk',.2*hot+.4*dry],['birch',.1+.5*cold]];
 }
}
export function pickSpecies(base:BaseForm,kind:string,site:TreeSite,u:number){
 const w=speciesWeights(base,kind,site).map(([id,x])=>[id,Math.max(0,x)] as [string,number]),total=w.reduce((s,[,x])=>s+x,0)||1;let v=u*total;
 for(const [id,x] of w){v-=x;if(v<0)return id;}return w[0][0];
}
/** Age/growth variant: young when the instance is small or planted, otherwise mostly mature with a share of old gnarled trees on poor soil, cold or exposed ground. */
export function pickVariant(scale:number,site:TreeSite,u:number){
 if(scale<.56)return 1;
 const old=.18+.3*clamp((.4-site.soil)/.4)+.1*clamp(-site.temp/6),young=.14;
 return u<old?2:u<old+young?1:0;
}
