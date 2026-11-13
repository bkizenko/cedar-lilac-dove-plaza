/** Kit recipes for the registry wonders (pure data, type-only imports). A recipe names the pieces; the civ style (crown bias, signature
 * landmark, palette) and the per-record seed decide how they are assembled, so one definition renders differently per civ and per game.
 *   core      the function mass that keeps the wonder's identity (wonderKit CORES)
 *   base      pool the seed picks the base from (terrace / plinth / causeway)
 *   crowns    pool; the civ's own crown bias wins where it overlaps, otherwise the seed picks from the pool
 *   ornaments flank pool (colonnade, statue, brazier ...)
 * The six original functions (observatory, terraceGarden, harbor, millMarket, cistern, assembly) keep their built-in recipe and have no row here. */
import type {Axis,CoreId,KitId} from './wonderKit';
export type WonderRecipe={core:CoreId;base:KitId[];crowns:KitId[];ornaments:KitId[];axis?:Axis;enclosure?:'wall'|'colonnade'|'none';water?:boolean};
const R=(core:CoreId,base:KitId[],crowns:KitId[],ornaments:KitId[],extra:Partial<WonderRecipe>={}):WonderRecipe=>({core,base,crowns,ornaments,...extra});
export const WONDER_RECIPES={
 ziggurat:R('zigguratCore',['baseTerrace','plinth'],['dome','spire','statue','pagodaTiers'],['bannerPair','brazier','statue','pylonPair'],{axis:'processional'}),
 library:R('archiveHall',['plinth','baseTerrace'],['dome','tholos','spire','arch'],['colonnade','statue','relief','brazier'],{enclosure:'colonnade'}),
 lighthouse:R('lighthouseTower',['plinth','causeway'],['brazier','spire','statue','dome'],['bannerPair','brazier','statue'],{enclosure:'none',axis:'linear'}),
 aqueduct:R('aqueductSpan',['causeway'],['arch','gate','spire'],['waterFeature','statue','arch'],{axis:'linear',enclosure:'none',water:true}),
 greatWall:R('wallCircuit',['causeway','plinth'],['gate','spire','pylonPair'],['bannerPair','brazier','gate','wall'],{axis:'linear',enclosure:'none'}),
 mausoleum:R('tombMound',['baseTerrace','plinth'],['statue','dome','spire','zigguratTiers'],['statue','colonnade','brazier','relief'],{axis:'processional'}),
 colossus:R('colossus',['plinth','baseTerrace'],['statue','spire','arch'],['brazier','bannerPair','pylonPair'],{enclosure:'none'}),
 stoneCircle:R('standingStones',['plinth','causeway'],['statue','spire'],['brazier','statue','bannerPair'],{axis:'radial',enclosure:'none',water:false}),
 causeway:R('roadSpan',['causeway'],['arch','gate','pylonPair','statue'],['statue','brazier','bannerPair','wall'],{axis:'linear',enclosure:'none'}),
 amphitheatre:R('ovalTiers',['baseTerrace','plinth'],['pylonPair','arch','statue','gate'],['bannerPair','colonnade','statue','brazier'],{axis:'radial'}),
 iceHouse:R('iceCellar',['plinth'],['dome','spire'],['brazier','wall','statue'],{enclosure:'wall',water:false}),
 citadel:R('keepCitadel',['baseTerrace','plinth'],['gate','spire','pylonPair','statue'],['bannerPair','brazier','gate','statue'],{enclosure:'wall',axis:'cross'}),
 pilgrimShrine:R('shrineStair',['baseTerrace'],['pagodaTiers','dome','spire','tholos'],['brazier','statue','bannerPair','arch'],{axis:'linear'}),
 granary:R('granaryRow',['plinth','baseTerrace'],['gate','spire','relief'],['wall','brazier','bannerPair','statue'],{enclosure:'wall',water:false}),
 harbourMole:R('moleQuay',['causeway'],['brazier','spire','statue','pylonPair'],['bannerPair','brazier','statue'],{axis:'linear',enclosure:'none'}),
 caravanserai:R('caravanCourt',['plinth','baseTerrace'],['gate','arch','pylonPair'],['brazier','waterFeature','bannerPair','statue'],{enclosure:'wall',axis:'cross'}),
 bathhouse:R('bathHall',['plinth','baseTerrace'],['dome','tholos','spire'],['colonnade','waterFeature','statue','brazier'],{water:true}),
 stepwell:R('stepwell',['baseTerrace','plinth'],['pagodaTiers','arch','dome','relief'],['relief','statue','brazier','arch'],{water:true,axis:'processional'}),
 beaconTower:R('beaconTower',['plinth','causeway'],['spire','brazier','statue'],['brazier','bannerPair','wall'],{enclosure:'none'}),
 arsenal:R('shipSlips',['causeway','plinth'],['gate','spire','pylonPair'],['bannerPair','brazier','wall','statue'],{axis:'linear',enclosure:'wall'}),
} as const satisfies Record<string,WonderRecipe>;
export type RecipeWonder=keyof typeof WONDER_RECIPES;
export const RECIPE_WONDERS=Object.keys(WONDER_RECIPES) as RecipeWonder[];
export const recipeOf=(id:string):WonderRecipe|undefined=>(WONDER_RECIPES as Record<string,WonderRecipe>)[id];
