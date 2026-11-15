/** Build effort scales with how complicated a building is. Each type has a complexity tier (1-5); each tier has a band of
 *  person-work-seconds per plot unit. constants.ts BUILD_TIME keeps the exact figure per type; scripts/building-behaviour-complexity.test.mjs
 *  checks every figure sits inside its tier's band, so a new building cannot be cheap and elaborate at once.
 *  1 lean-to/open frame; 2 simple enclosed or single-process workshop; 3 multi-part works, fired/fortified or timber-engineered;
 *  4 masonry, public or heavy-duty buildings; 5 monumental or water-driven engineering. Types are strings to avoid an import cycle. */
export const COMPLEXITY_BANDS={1:[8,10],2:[12,14],3:[16,20],4:[22,30],5:[32,48]} as const;
export type ComplexityTier=keyof typeof COMPLEXITY_BANDS;
export const BUILDING_COMPLEXITY:Readonly<Record<string,ComplexityTier>>={
 hut:1,hearth:1,dryrack:1,well:1,lumber:1,dock:1,farm:1,
 butcher:2,tailor:2,grindingStone:2,quarry:2,warehouse:2,palisade:2,tanner:2,potter:2,fibreWorkshop:2,threshingFloor:2,workshop:2,cornerstone:2,
 pen:3,watchtower:3,oven:3,smokehouse:3,gate:3,trench:3,cairn:3,grove:3,kiln:3,barracks:3,
 market:4,forge:4,stonewall:4,cistern:4,canal:4,temple:4,stables:4,moat:4,
 university:5,keep:5,windmill:5,bridge:5,watermill:5,aqueduct:5,
};
/** Effort rank used to order two buildings: tier first, then exact seconds. */
export const complexityTier=(type:string):ComplexityTier|null=>BUILDING_COMPLEXITY[type]??null;
