import {FOOD_KINDS,FOOD_NAMES} from '@/game/pantry';
import type {ItemStock} from '@/game/production';
import type {HudSnapshot} from '@/game/types';

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

export function FoodStoreReadout({stock,items}:{stock:FoodStock;items?:ItemStock}){
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
  <strong>Food in stores</strong>
  <p className="mt-1 tabular-nums">{Math.floor(readyFoodStock(stock))} ready to eat · {Math.floor(stored)} pantry stock</p>
  {ready.length>0&&<dl aria-label="Ready to eat">{ready.map(({name,amount})=><div key={name}><dt>{name}</dt><dd>{Math.floor(amount)}</dd></div>)}</dl>}
  {processing.length>0&&<>
   <strong className="mt-2 block">For processing</strong>
   <dl aria-label="Food for processing">{processing.map(({name,amount})=><div key={name}><dt>{name}</dt><dd>{Math.floor(amount)}</dd></div>)}</dl>
   <p className="text-parchment-dim">Villagers turn to raw rations when ready food runs out. Raw meat and fish can cause illness.</p>
  </>}
 </>;
}
