import {useState} from 'react';
import type {Engine} from '../game/engine';
import {DEFAULT_TOWER_PLATFORM,TOWER_PLATFORM_RULES,TOWER_PLATFORM_RANGE,towerRangeMeters,normalizeTowerPlatform,towerPlatformSpec,setTowerPlacement,type TowerMaterial} from '../game/towerPlatforms';
/** Configuration belongs to the next paid site, never a free existing upgrade. */
export function TowerPlatformControls({engine}:{engine:Engine}){
 const[revision,setRevision]=useState(0),[feedback,setFeedback]=useState(''),g=engine.game;
 if(g.state.placing!=='watchtower')return null;
 const config=normalizeTowerPlatform(g.state.towerPlacement??DEFAULT_TOWER_PLATFORM),rule=TOWER_PLATFORM_RULES[config.material],spec=towerPlatformSpec(config),stock=g.tribe(0);
 const change=(material:TowerMaterial,height:number)=>{const next=normalizeTowerPlatform({version:1,material,heightMeters:height});const okay=setTowerPlacement(g,next.material,next.heightMeters);setFeedback(okay?'Updated the next tower plan':g.state.banner);setRevision(revision+1);engine.pushHud();};
 const missing=[...(stock.wood<(spec.cost.wood||0)?[`${Math.ceil((spec.cost.wood||0)-stock.wood)} logs`]:[]),...(stock.stone<(spec.cost.stone||0)?[`${Math.ceil((spec.cost.stone||0)-stock.stone)} stone`]:[])];
 return <section className="hud-panel space-y-2 p-3 text-xs" aria-label="Tower platform placement">
  <h3 className="font-semibold">Tower platform</h3>
  <label className="flex items-center justify-between gap-3">Material<select aria-label="Tower material" value={config.material} onChange={e=>change(e.target.value as TowerMaterial,config.heightMeters)}><option value="timber">Timber · {TOWER_PLATFORM_RULES.timber.minHeightMeters}–{TOWER_PLATFORM_RULES.timber.maxHeightMeters} m</option><option value="stone">Stone · {TOWER_PLATFORM_RULES.stone.minHeightMeters}–{TOWER_PLATFORM_RULES.stone.maxHeightMeters} m</option></select></label>
  <label className="block">Deck height · <strong>{config.heightMeters} m</strong><input className="mt-2 w-full" aria-label="Tower deck height in metres" type="range" min={rule.minHeightMeters} max={rule.maxHeightMeters} step={1} value={config.heightMeters} onChange={e=>change(config.material,Number(e.target.value))}/></label>
  <p>{spec.cost.wood||0} logs · {spec.cost.stone||0} stone · {spec.workSeconds} base work seconds · {spec.hp} durability</p>
  <p>Defensive range {spec.rangeMeters.toFixed(1)} m · Fixed footprint {spec.widthMeters} × {spec.depthMeters} m</p>
  {!!missing.length&&<p className="text-parchment-dim">Missing {missing.join(' · ')}. An unfunded plan must wait for actual materials.</p>}
  <p className="text-parchment-dim">Changes apply to the next tower site. Existing towers keep their paid design. A ladder and platform do not add resident guards or ammunition; staffed garrisons and ammunition supply remain future work.</p>
  {feedback&&<p role="status">{feedback}</p>}
 </section>;
}

/** Inspect the selected saved design; placement preferences cannot upgrade it. */
export function TowerPlatformReadout({engine}:{engine:Engine}){
 const b=engine.game.state.selBld;if(!b||b.team!==0||b.type!=='watchtower')return null;
 const config=b.towerPlatform,height=config?.heightMeters??TOWER_PLATFORM_RANGE.legacyPlatformMeters;
 return <section className="space-y-1 text-xs" aria-label="Selected tower design"><strong>{config?config.material==='stone'?'Stone tower':'Timber tower':'Original tower'}</strong><p>Deck height {height} m · Durability {Math.ceil(b.hp)} / {b.maxHp} · Defensive range {towerRangeMeters(b).toFixed(1)} m</p><p className="text-parchment-dim">{b.plannedCost?'Unfunded plan — no defensive fire':b.build<1?'Under construction — no defensive fire':'Completed saved design'}. New placement settings do not upgrade this tower. Resident garrisons and ammunition supply remain future work.</p></section>;
}
