import {foundationProfile} from '../scene/foundations';
import type {Game} from './sim';
import type {Building,Cost,GameState} from './types';
export type TowerMaterial='timber'|'stone';
export type TowerPlatform={version:1;material:TowerMaterial;heightMeters:number};
/** Balance parameters, not historical structural engineering claims. Legacy
 * towers without this paid configuration retain their original statistics. */
export const TOWER_PLATFORM_RULES={
 timber:{minHeightMeters:2,maxHeightMeters:8,baseWood:32,woodPerMeter:8,baseStone:8,stonePerMeter:0,baseHp:900,hpPerMeter:100,baseWorkSeconds:24,workSecondsPerMeter:6},
 stone:{minHeightMeters:3,maxHeightMeters:14,baseWood:20,woodPerMeter:0,baseStone:60,stonePerMeter:16,baseHp:1800,hpPerMeter:180,baseWorkSeconds:40,workSecondsPerMeter:10},
} as const;
export const DEFAULT_TOWER_PLATFORM:TowerPlatform={version:1,material:'timber',heightMeters:6};
export const TOWER_PLATFORM_RANGE={baseMeters:14,perHeightMeter:.6,maximumMeters:24,footprintMeters:4.6,legacyPlatformMeters:5.2,releaseAboveDeckMeters:1.4} as const;
export function normalizeTowerPlatform(value?:unknown):TowerPlatform{const raw=value&&typeof value==='object'?value as Partial<TowerPlatform>:{},material=raw.material==='stone'?'stone':'timber',rule=TOWER_PLATFORM_RULES[material],height=typeof raw.heightMeters==='number'&&Number.isFinite(raw.heightMeters)?raw.heightMeters:DEFAULT_TOWER_PLATFORM.heightMeters;return {version:1,material,heightMeters:Math.max(rule.minHeightMeters,Math.min(rule.maxHeightMeters,Math.round(height)))};}
export function validTowerPlatform(value:unknown):value is TowerPlatform{if(!value||typeof value!=='object'||Array.isArray(value))return false;const c=value as TowerPlatform;if(c.version!==1||!Object.hasOwn(TOWER_PLATFORM_RULES,c.material)||!Number.isInteger(c.heightMeters))return false;const r=TOWER_PLATFORM_RULES[c.material];return c.heightMeters>=r.minHeightMeters&&c.heightMeters<=r.maxHeightMeters;}
export function towerPlatformSpec(value?:unknown){const config=normalizeTowerPlatform(value),r=TOWER_PLATFORM_RULES[config.material],extra=Math.max(0,config.heightMeters-4),cost:Cost={wood:r.baseWood+r.woodPerMeter*extra,stone:r.baseStone+r.stonePerMeter*extra};return {config,...config,cost,hp:r.baseHp+r.hpPerMeter*extra,workSeconds:r.baseWorkSeconds+r.workSecondsPerMeter*config.heightMeters,rangeMeters:Math.min(TOWER_PLATFORM_RANGE.maximumMeters,TOWER_PLATFORM_RANGE.baseMeters+config.heightMeters*TOWER_PLATFORM_RANGE.perHeightMeter),projectileHeightMeters:config.heightMeters+TOWER_PLATFORM_RANGE.releaseAboveDeckMeters,widthMeters:TOWER_PLATFORM_RANGE.footprintMeters,depthMeters:TOWER_PLATFORM_RANGE.footprintMeters};}
export function towerBuildConfiguration(g:Game,team=0){return normalizeTowerPlatform(team===0?g.state.towerPlacement:DEFAULT_TOWER_PLATFORM);}
export function setTowerPlacement(g:Game,material:TowerMaterial,heightMeters:number){const config={version:1,material,heightMeters};if(!validTowerPlatform(config)){const r=TOWER_PLATFORM_RULES[material];g.banner(r?`${material==='timber'?'Timber':'Stone'} platforms require a whole height from ${r.minHeightMeters} to ${r.maxHeightMeters} metres`:'Choose timber or stone for the platform',4);return false;}g.state.towerPlacement={...config,version:1};return true;}
export function configureTowerPlatform(g:Game,b:Building){if(b.type!=='watchtower')return;const spec=towerPlatformSpec(towerBuildConfiguration(g,b.team)),fraction=b.maxHp>0?Math.max(0,Math.min(1,b.hp/b.maxHp)):1;b.towerPlatform=spec.config;b.maxHp=spec.hp;b.hp=Math.floor(spec.hp*fraction);}
export function towerBuildWorkSeconds(b:Building,legacySeconds:number){return b.type==='watchtower'&&b.towerPlatform?towerPlatformSpec(b.towerPlatform).workSeconds:legacySeconds;}
export function towerRangeMeters(b:Building){return b.towerPlatform?towerPlatformSpec(b.towerPlatform).rangeMeters:16;}
export function towerProjectileBase(g:Game,b:Building){return b.towerPlatform?foundationProfile(g,b).level:b.y;}
export function towerProjectileHeight(b:Building){return b.type==='watchtower'?(b.towerPlatform?towerPlatformSpec(b.towerPlatform).projectileHeightMeters:TOWER_PLATFORM_RANGE.legacyPlatformMeters+TOWER_PLATFORM_RANGE.releaseAboveDeckMeters):1.4;}
export function validTowerPlatformState(s:GameState){if(s.towerPlacement!==undefined&&!validTowerPlatform(s.towerPlacement))return false;for(const b of s.buildings)if(b.towerPlatform!==undefined){if(b.type!=='watchtower'||!validTowerPlatform(b.towerPlatform)||b.maxHp!==towerPlatformSpec(b.towerPlatform).hp||b.hp>b.maxHp||b.w!==TOWER_PLATFORM_RANGE.footprintMeters||b.d!==TOWER_PLATFORM_RANGE.footprintMeters)return false;}return true;}
