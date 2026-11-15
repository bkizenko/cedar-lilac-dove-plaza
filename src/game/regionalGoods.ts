import type {Game} from './sim';
import {climateAt} from './ecology';
import {receiveFood} from './pantry';
import {isDependent} from './settlement';
import {pressHouseFor,PRESS_BONUS_JARS} from './vineyards';
import {planFoodWithdrawal,commitFoodWithdrawal} from './tradeFood';
const reviewed=new WeakMap<object,number>();
/** Regional goods: olive oil and wine. Region comes from the measured climate at the society's camp; inputs are real stores.
 * Pressing converts food + a vessel (one pottery vessel, or a cask of timber) into jars; nothing appears from nowhere.
 * Consumption turns jars back into food energy. Rival societies press under the very same rules (tickRegionalPressing). */
export type RegionalGood='oliveOil'|'wine';
export const REGIONAL_RULES={version:1,minimumAge:1,batchFoodIn:6,batchJars:2,caskWood:3,reviewSeconds:300,
 oliveOil:{label:'olive oil',tempMin:11,tempMax:30,humidityMax:.68,foodEachJar:3},
 wine:{label:'wine',tempMin:9,tempMax:26,humidityMin:.38,humidityMax:.78,foodEachJar:1.5}} as const;
export function regionalSuitability(g:Game,team:number,kind:RegionalGood):{ok:boolean;reason:string}{
 const home=g.campOf(team),c=climateAt(g,home.x,home.z),r=REGIONAL_RULES[kind];
 if(c.temperature<r.tempMin)return{ok:false,reason:`Too cold here for ${r.label} (${c.temperature.toFixed(0)}°C)`};
 if(c.temperature>r.tempMax)return{ok:false,reason:`Too hot and dry for ${r.label} (${c.temperature.toFixed(0)}°C)`};
 if(c.humidity>r.humidityMax)return{ok:false,reason:`Too damp here for ${r.label}`};
 if(kind==='wine'&&c.humidity<REGIONAL_RULES.wine.humidityMin)return{ok:false,reason:'Too dry here for vines'};
 return{ok:true,reason:''};
}
export function pressingIssue(g:Game,team:number,kind:RegionalGood):string|null{
 const t=g.tribe(team);if(!t)return 'No such society';
 if(t.age<REGIONAL_RULES.minimumAge)return 'Pressing needs Bronze Age craft';
 if(!g.state.buildings.some(b=>b.team===team&&(b.type==='warehouse'||b.type==='townhall'||b.type==='press')&&b.hp>0&&g.finished(b)))return 'Finish a storehouse or press house to press and store jars';
 const s=regionalSuitability(g,team,kind);if(!s.ok)return s.reason;
 if((t.food||0)<REGIONAL_RULES.batchFoodIn)return `Need ${REGIONAL_RULES.batchFoodIn} food of fruit in stores`;
 if((t.items?.pottery||0)<1&&(t.wood||0)<REGIONAL_RULES.caskWood)return `Need a pottery vessel or ${REGIONAL_RULES.caskWood} timber for a cask`;
 return null;
}
export function pressRegional(g:Game,team:number,kind:RegionalGood,batches=1):{accepted:boolean;reason:string}{
 if(!['oliveOil','wine'].includes(kind)||!Number.isSafeInteger(batches)||batches<1||batches>6)return{accepted:false,reason:'Choose oil or wine and 1-6 batches'};
 const t=g.tribe(team);let done=0;const jarsPerBatch=REGIONAL_RULES.batchJars+(pressHouseFor(g,team)?PRESS_BONUS_JARS:0);
 for(;done<batches;done++){const issue=pressingIssue(g,team,kind);if(issue){if(!done)return{accepted:false,reason:issue};break;}
  const lots=planFoodWithdrawal(g,team,REGIONAL_RULES.batchFoodIn);if(!lots||!commitFoodWithdrawal(g,team,lots))break;
  const items=t.items??={};if((items.pottery||0)>=1){items.pottery!--;const lot=t.potteryOrigins?.find(o=>o.count>0);if(lot)lot.count--;}else t.wood-=REGIONAL_RULES.caskWood;
  items[kind]=(items[kind]||0)+jarsPerBatch;}
 return done?{accepted:true,reason:`${done*jarsPerBatch} jars of ${REGIONAL_RULES[kind].label} pressed from ${done*REGIONAL_RULES.batchFoodIn} food`}:{accepted:false,reason:'Could not pay for a batch'};
}
export function consumeRegional(g:Game,team:number,kind:RegionalGood,jars:number):{accepted:boolean;reason:string}{
 const t=g.tribe(team),held=t?.items?.[kind]||0;
 if(!t||!['oliveOil','wine'].includes(kind)||!Number.isSafeInteger(jars)||jars<1||jars>12)return{accepted:false,reason:'Choose 1-12 jars'};
 if(held<jars)return{accepted:false,reason:`Only ${held} jars in stores`};
 t.items![kind]=held-jars;const food=jars*REGIONAL_RULES[kind].foodEachJar;receiveFood(g,team,food,'provisions');
 return{accepted:true,reason:`${jars} jars of ${REGIONAL_RULES[kind].label} shared at table, worth ${food.toFixed(1)} food`};
}
/** Rivals press what their region grows from surplus food; the player decides by command. */
export function tickRegionalPressing(g:Game){
 const at=Math.floor(g.state.time/REGIONAL_RULES.reviewSeconds);
 if(reviewed.get(g)===at)return;reviewed.set(g,at);
 for(const t of g.state.tribes){if(t.id===0||t.id===3)continue;
  const pop=g.state.units.filter(u=>u.team===t.id&&u.hp>0&&!isDependent(g,u)).length,want=Math.max(2,Math.ceil(pop/5));
  for(const kind of ['oliveOil','wine'] as const)if((t.items?.[kind]||0)<want&&(t.food||0)>REGIONAL_RULES.batchFoodIn*8)pressRegional(g,t.id,kind,1);}
}
