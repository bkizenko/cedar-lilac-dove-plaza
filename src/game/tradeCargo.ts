import type {Game} from './sim';
import type {Unit,ResKind,Building} from './types';
import type {PackJourneySupplies} from './packJourneyCare';
import {carryingCapacity} from './haulage';
import {CARRIED_LOAD_RULES} from './carriedLoad';
import {GATHER} from './constants';

/** Abstract load units, not kilograms: care and merchandise use the same actual
 * transport budget. Equipment is already deducted by carryingCapacity. */
export function tradeCargoCapacity(u:Unit,kind:ResKind,care:PackJourneySupplies|undefined=u.packJourneySupplies){
 const feed=care?Object.values(care.feed).reduce((n,v)=>n+(v||0),0):0;
 const careLoad=feed/CARRIED_LOAD_RULES.provisionFood+(care?.waterLiters||0)/CARRIED_LOAD_RULES.waterLiters;
 return Math.max(0,Math.floor(carryingCapacity(u,kind)-GATHER[kind].carry*careLoad+1e-8));
}
export const PACK_TRADE_TRAVEL_RULES={pathMargin:1.6,loadedPaceAllowance:.68,minimumPace:.35,handlingSeconds:120} as const;
/** Planning reads a witnessed meeting site, not a private route or rival stock.
 * Real consumption and the return threshold handle slower or obstructed paths. */
export function packTradeCareSeconds(g:Game,u:Unit,site:Pick<Building,'x'|'z'>){
 const r=PACK_TRADE_TRAVEL_RULES,pace=Math.max(r.minimumPace,g.travelSpeed(u)*r.loadedPaceAllowance);
 return 2*Math.hypot(site.x-u.x,site.z-u.z)*r.pathMargin/pace+r.handlingSeconds;
}
