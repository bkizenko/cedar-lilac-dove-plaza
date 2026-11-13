import {methodRecordTitle} from '../game/methodRecordRules';
import {methodRecords} from '../game/methodRecords';
import {draftCartCapacity} from '../game/draftCart';
import {toolmakingPracticeRate} from "../game/crafting";
import {packCapacityMultiplier} from '../game/packAnimalState';
import {siegeRamCarriedMaterials} from '../game/siegeRam';
import {wornArmor} from '../game/armor';
import type { Unit } from '../game/types';
import { personName, predisposition } from '../game/people';
import { ITEM_KINDS, ITEM_NAMES, PRODUCTION_RECIPES } from '../game/production';

import { productionPracticeRate } from '../game/productionPractice';
import type { Game } from '../game/sim';
import { WorkerActivity } from './WorkerActivity';
import { ItemIcon } from './ItemIcon';
import { itemEraForAge, FARM_TOOL_ERA, type EquipmentState } from '../scene/itemRegistry';
import { skinOfTeam } from '../game/skinState';
import { farmToolCondition } from '../game/farmTools';

const amount = (value: number) => Number(value.toFixed(2));

export function ResidentInventory({ residents, game }: { residents: Unit[]; game?:Game }) {
  return <ul className="space-y-2 text-xs">
    {residents.map(resident => {
      const carried: string[] = [];
      const record=game&&resident.team===0?methodRecords(game).find(r=>r.team===0&&r.id===resident.methodRecordCargoId&&r.holder.kind==='carrier'&&r.holder.unitId===resident.id):undefined;
      if(record)carried.push(`${methodRecordTitle(record.source.recipe)} method record · ${record.source.makerName}`);
      const traits = predisposition(resident);
      const craftSeconds = resident.craftingXP ?? 0;
      const skills = Object.entries(resident.productionSkills ?? {});
      if (resident.carry > 0 && resident.carryType) {
        carried.push(`${amount(resident.carry)} ${resident.carryFood ?? resident.carryType}`);
      }
      for (const item of ITEM_KINDS) {
        const count = resident.itemCargo?.[item] ?? 0;
        if (count > 0) carried.push(`${amount(count)} ${ITEM_NAMES[item]}`);
      }
      const water = resident.waterWork?.liters ?? 0;
      if (water > 0) carried.push(`${amount(water)} L water`);
      if (resident.expedition) carried.push(`${amount(resident.expedition.food)} journey food`);
      if (resident.scoutProvisions) {
        carried.push(`${amount(resident.scoutProvisions.food)} journey food`);
        carried.push(`${amount(resident.scoutProvisions.water)} L journey water`);
      }
      const ramPacket=game&&siegeRamCarriedMaterials(game,resident);if(ramPacket)carried.push(`Ram materials · ${ramPacket.wood} timber · ${ramPacket.cordage} cordage`);
      const equipped: string[] = [];
      if (resident.militia || resident.type === 'spearman' || resident.type === 'archer' || resident.type === 'swordsman') {
        equipped.push(resident.type === 'archer' ? 'Bow' : resident.type === 'swordsman' ? 'Blade' : 'Spear');
      }
      if (resident.farmTool) {
        equipped.push(resident.farmTool==='woodenArd'?`Wooden ard · ${Math.round(resident.draftPracticeSeconds??0)}s draft practice`:resident.farmTool.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
      }
      if(resident.draftCart)equipped.push(`Animal-drawn cart #${resident.draftCart.id}`);
      if(resident.cartIdentity)equipped.push(`Handcart #${resident.cartIdentity.id}`);
      if (resident.basket) equipped.push('Woven basket');
      if (resident.waterVessel) equipped.push('Water vessel');
      if (resident.haulage) equipped.push(resident.haulage === 'pack' ? (resident.packAnimal?`${resident.draftCart?'Draft':'Pack'} ${resident.packAnimal.species??'goat'} · capacity ×${(draftCartCapacity(resident)??packCapacityMultiplier(resident)).toFixed(2)}`:'Pack harness · no animal') : resident.haulage);
      const armor=game&&wornArmor(game,resident);if(armor)equipped.push(`Padded armor (${Math.round(armor.condition*100)}%)`);
      if (resident.garment) equipped.push(`${ITEM_NAMES[resident.garment.item]} (${Math.round(resident.garment.condition * 100)}%)`);
      if (resident.spareGarment) carried.push(`Spare ${ITEM_NAMES[resident.spareGarment.item]}`);
      // pictures of the real equipment: each icon is that item's own model in this society's skin, in its age's material and real condition
      const icons:{eq:EquipmentState;label:string}[]=[];
      if(game){
        const era=itemEraForAge(game.state.age),skin=skinOfTeam(game.state,resident.team)?.id??null;
        if (resident.type === 'archer') icons.push({eq:{kind:'bow',era,skin},label:'Bow'});
        else if (resident.type === 'swordsman') icons.push({eq:{kind:'bladeSword',era,skin},label:'Blade'});
        else if (resident.militia || resident.type === 'spearman') icons.push({eq:{kind:'spear',era,skin},label:'Spear'});
        if (resident.farmTool) icons.push({eq:{kind:resident.farmTool==='woodenArd'?'ard':'hoe',era:FARM_TOOL_ERA[resident.farmTool]??era,skin,condition:farmToolCondition(resident)},label:resident.farmTool});
        if (resident.basket) icons.push({eq:{kind:'basket',era,skin,condition:resident.basket.condition},label:'Woven basket'});
        if (resident.waterVessel) icons.push({eq:{kind:'waterskin',era,skin},label:'Water vessel'});
        for (const [k,model] of [['spears','spear'],['bows','bow'],['blades','bladeSword']] as const) {
          const n = resident.weaponCargo?.[k] ?? 0;
          if (n > 0) icons.push({eq:{kind:model,era,skin},label:`${n} ${k} carried`});
        }
        if ((resident.itemCargo?.pottery ?? 0) > 0) icons.push({eq:{kind:'pot',era,skin},label:'Pottery carried'});
        if ((resident.itemCargo?.cordage ?? 0) > 0) icons.push({eq:{kind:'ropeCoil',era,skin},label:'Cordage carried'});
      }
      return <li key={resident.id}>
        <strong>{personName(resident)}</strong>
        {icons.length > 0 && <div className="flex flex-wrap items-center gap-1">{icons.map((i,n) => <ItemIcon key={n} eq={i.eq} label={i.label}/>)}</div>}
        <div>{carried.length ? carried.join(' · ') : 'Empty hands'}</div>
        {equipped.length > 0 && <div>Equipped · {equipped.join(' · ')}</div>}
        {resident.packAnimal&&<div title={`Feed consumed ${amount(resident.packAnimal.foodConsumed??0)} · Water drunk ${amount(resident.packAnimal.waterConsumedLiters??0)} L. Feed and water are available at a reached village cache.`}>{resident.packAnimal.species==='cattle'?'Cattle':resident.packAnimal.species==='horse'?'Horse':'Goat'} · Health {Math.round(resident.packAnimal.hp/resident.packAnimal.maxHp*100)}% · Hunger {Math.round(resident.packAnimal.hunger??0)}%{game?.state.survivalVersion===1?` · Thirst ${Math.round(resident.packAnimal.thirstSeconds??0)}s`:''}</div>}
        {game?<WorkerActivity state={game.state} resident={resident}/>:resident.workReason&&<div>{resident.workReason}</div>}
        <details>
          <summary>Aptitudes & practice</summary>
          <div>Strength {Math.round(traits.strength * 100)}% · Speed {Math.round(traits.speed * 100)}% · Combat {Math.round(traits.fighting * 100)}% · Trade {Math.round(traits.trading * 100)}%</div>
          <div>{amount(craftSeconds / 60)} min hands-on crafting · +{Math.round(Math.min(0.3, craftSeconds / 1200) * 100)}% work rate</div>
          {resident.craftingPractice?.toolmaking&&<div>Toolmaking · {amount(resident.craftingPractice.toolmaking.workSeconds/60)} min · {resident.craftingPractice.toolmaking.completedTools} tools · {resident.craftingPractice.toolmaking.completedRepairs} repairs · +{amount((toolmakingPracticeRate(resident)-1)*100)}% work rate</div>}
          {skills.map(([method, skill]) => <div key={method}>
            {PRODUCTION_RECIPES[method as keyof typeof PRODUCTION_RECIPES].name} · {skill.successfulBatches} made · {skill.taughtBatches} learned · +{Math.round((productionPracticeRate(resident, method) - 1) * 100)}% work rate
          </div>)}
        </details>
        {resident.stuckT > 3 && <div className="text-blood">Movement blocked for {Math.floor(resident.stuckT)} seconds</div>}
      </li>;
    })}
  </ul>;
}
