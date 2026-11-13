import type {Game} from './sim';
import type {BldType} from './types';
import {wonderPrestige} from './wonderEffects';

export const CIVIC_PRESTIGE_RULES = {
  duplicateMultiplier: .55,
  landmarkValue: {grove:8,cairn:14,temple:45,university:34} satisfies Partial<Record<BldType,number>>,
} as const;

export function civicPrestige(g:Game,team=0){
  const values=new Map<BldType,number[]>();
  const weights:Partial<Record<BldType,number>>=CIVIC_PRESTIGE_RULES.landmarkValue;
  for(const building of g.state.buildings){
    const weight=weights[building.type];
    if(!weight||building.team!==team||!g.finished(building))continue;
    const condition=Math.max(0,Math.min(1,building.hp/Math.max(1,building.maxHp),building.maintenance?.condition??1));
    const group=values.get(building.type)??[];
    group.push(condition*weight);
    values.set(building.type,group);
  }
  const landmarks=[...values].map(([type,group])=>({
    type,count:group.length,points:group.sort((a,b)=>b-a).reduce((sum,value,index)=>sum+value*CIVIC_PRESTIGE_RULES.duplicateMultiplier**index,0),
  }));
  const wonders=wonderPrestige(g.state,team);
  return {total:Math.round(landmarks.reduce((sum,row)=>sum+row.points,0))+wonders.total,landmarks,wonders:wonders.rows};
}
