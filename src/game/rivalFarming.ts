import type {Game} from './sim';
import type {CropKind} from './types';
import {calendar,crop,reserveSeconds,YEAR_SECONDS} from './settlement';
import {fieldTerrain} from './fieldTerrain';
import {isRivalTeam} from './factions';
import {rivalDevelopmentPlan} from './rivalDevelopment';

const reviews=new WeakMap<Game,Map<number,number>>();
/** Learned crops and actual land shape each rival's agricultural choices.
 * No free knowledge, food or labor; standing crops are never converted. */
export function manageRivalFields(g:Game,team:number){
 if(!isRivalTeam(team)||!g.tribe(team).alive||calendar(g).phase!==0)return 0;
 let times=reviews.get(g);if(!times){times=new Map();reviews.set(g,times);}
 const due=times.get(team)||0;if(due>g.state.time&&due<=g.state.time+60)return 0;
 times.set(team,g.state.time+60);
 const fields=g.state.buildings.filter(b=>b.team===team&&b.type==='farm'&&g.finished(b));
 const known=g.tribe(team).cultivated||[],reserve=reserveSeconds(g,team),year=calendar(g).year;
 const spare=reserve>=YEAR_SECONDS?Math.max(0,Math.min(Math.floor(fields.length/5),fields.length-rivalDevelopmentPlan(g,team).foodFields)):0;
 let resting=fields.filter(b=>b.fallowYear===year).length,changed=0;
 for(const b of fields.sort((a,b)=>(a.fertility??1)-(b.fertility??1))){
  const c=crop(g,b);if(c.planted>0)continue;
  if(b.fallowYear===year){
   if(reserve<600){b.fallowYear=undefined;resting--;changed++;}else continue;
  }
  if((b.fertility??1)<.65&&resting<spare){
   b.fallowYear=year;resting++;changed++;
   for(const u of g.state.units)if(u.node===b&&u.order==='gather'){u.node=null;u.order=u.carry>0?'return':'idle';u.workCheckAt=0;}
   continue;
  }
  const land=fieldTerrain(g,b);
  // Pulses conserve tired soil; tubers pay off in woodland. Food-insecure
  // communities choose immediate yield instead of sacrificing it for rotation.
  const score=(kind:CropKind)=>kind==='tubers'?land.tubers:land.grain*(kind==='pulses'?((b.fertility??1)<.7&&reserve>900?1.2:.85):1);
  const best=[...known].sort((a,b)=>score(b)-score(a))[0];
  if(best&&(c.kind!==best||b.cropType!==best)){c.kind=best;b.cropType=best;changed++;}
 }
 if(changed)g.workBoard.reset();return changed;
}
