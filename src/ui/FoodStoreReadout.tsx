import {Wheat,Package} from 'lucide-react';
import {FOOD_KINDS,FOOD_NAMES} from '@/game/pantry';
import type {ItemStock} from '@/game/production';
import type {HudSnapshot} from '@/game/types';
import type {foodExperienceReport} from '@/game/foodExperience';

type FoodStock = Pick<HudSnapshot,'food'|'foodLots'>;
const readyKinds=FOOD_KINDS.filter(kind=>kind!=='grain'&&kind!=='fish');
const rawKinds=['grain','fish'] as const;
const fieldStock=[
 ['grainSheaves','Cereal sheaves'],['roughGrain','Grain with chaff'],
 ['flour','Flour'],['rawMeat','Raw meat'],
] as const;

export function readyFoodStock(stock:FoodStock){
 return stock.foodLots
  ?readyKinds.reduce((sum,kind)=>sum+(stock.foodLots?.[kind]??0),0)
  :stock.food;
}

export function FoodStoreReadout({stock,items,experience}:{stock:FoodStock;items?:ItemStock;experience?:ReturnType<typeof foodExperienceReport>}){
 const stored=stock.foodLots?FOOD_KINDS.reduce((sum,kind)=>sum+(stock.foodLots?.[kind]??0),0):stock.food;
 const ready=readyKinds.flatMap(kind=>{
  const amount=stock.foodLots?.[kind]??0;
  return amount>=1?[{name:FOOD_NAMES[kind],amount}]:[];
 });
 const processing=[
  ...rawKinds.map(kind=>({name:FOOD_NAMES[kind],amount:stock.foodLots?.[kind]??0})),
  ...fieldStock.map(([kind,name])=>({name,amount:items?.[kind]??0})),
 ].filter(row=>row.amount>=1);
 return <>
  <p className="mt-1 flex items-center gap-3 tabular-nums" title="Ready to eat · all pantry stock"><span className="inline-flex items-center gap-1"><Wheat className="size-4" aria-label="Ready to eat"/>{Math.floor(readyFoodStock(stock))} ready</span><span className="inline-flex items-center gap-1"><Package className="size-4" aria-label="Pantry"/>{Math.floor(stored)} stored</span></p>
  {experience?.tasted&&<p title="Enjoyment of meals eaten. Food mood slightly raises village appeal." aria-label="Meal enjoyment">Taste {experience.taste.toFixed(1)}/10 · Mood {experience.mood>=0?'+':''}{Math.round(experience.mood*100)}%</p>}
  {ready.length>0&&<dl aria-label="Ready to eat">{ready.map(({name,amount})=><div key={name}><dt>{name}</dt><dd>{Math.floor(amount)}</dd></div>)}</dl>}
  {processing.length>0&&<>
   <strong className="mt-2 block" title="Villagers turn to raw rations when ready food runs out. Raw meat and fish can cause illness.">To process</strong>
   <dl aria-label="Food for processing">{processing.map(({name,amount})=><div key={name}><dt>{name}</dt><dd>{Math.floor(amount)}</dd></div>)}</dl>
  </>}
 </>;
}
