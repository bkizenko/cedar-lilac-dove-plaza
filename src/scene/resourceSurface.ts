import type {Game} from '../game/sim';
import type {ResourceNode} from '../game/types';
/** A finite bank-fishing resource marker, not a free simulated animal. Local
 * water and supporting ground are sampled live, including flood and real cuts. */
export function fishMarkerHeight(g:Pick<Game,'world'|'height'|'waterAt'>,node:Pick<ResourceNode,'x'|'z'>){
 return g.world.localWaterVersion===17?Math.max(g.height(node.x,node.z),g.waterAt(node.x,node.z))+.1:g.world.waterY+.1;
}
