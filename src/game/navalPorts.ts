import type {Game} from './sim';
import type {Building} from './types';
/** Placeholder until the full port module lands below this line in the same file. */
export function portInfluenceReachMeters(g:Game,dock:Building,ships:number){void g;void dock;return Math.min(260,140+40*Math.max(0,ships-1));}
