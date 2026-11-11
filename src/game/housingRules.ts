export const HOUSING_RULES = {
  version: 1,
  wood: 24,
  stone: 8,
  // Basic timber joinery and stone footing do not require textile practice.
  plantFibre: 0,
  workSeconds: 48,
  packetCapacity: 8,
  additionalPlaces: 2,
  maximumHp: 320,
  shelterWarmthCelsius: 1.5,
  demonstrationSeconds: 30,
  reviewSeconds: 1,
  npcReviewSeconds: 15,
  npcMealReserveSeconds: 240,
  npcTimberReserve: 12,
  npcStoneReserve: 4,
} as const;
