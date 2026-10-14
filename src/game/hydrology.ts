import type {Weather} from './types';
/** Saves persist weather, so navigation and rendered water must reconstruct its level too. */
export function weatherWaterLevel(base:number,weather:Weather){
  return base+(weather==='flood'?.55:weather==='drought'?-.18:0);
}
