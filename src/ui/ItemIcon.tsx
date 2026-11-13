import {useMemo} from 'react';
import {itemIconUrl} from '../scene/itemIcon';
import type {EquipmentState} from '../scene/itemRegistry';

/** A real item's own model as a small picture (its society's skin, its age's material, its real condition). Renders nothing when there is no model or no WebGL. */
export function ItemIcon({eq,size=34,label}:{eq:EquipmentState;size?:number;label?:string}){
  const url=useMemo(()=>itemIconUrl(eq),[eq.kind,eq.era,eq.skin,eq.variant,eq.broken,Math.round((eq.condition??.85)*4)]);
  if(!url)return null;
  return <img src={url} width={size} height={size} alt={label??eq.kind} title={label} className="inline-block align-middle" draggable={false}/>;
}
