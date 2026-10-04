import type { BldType, Cost, ResKind, UnitType } from "./types";

export const MAP = 1040;
export const HALF = MAP / 2;
export const SEGS = 256;
export const WATER_Y = 0.42;
export const TILE = 2;
export const LUMBER_R = 18;
export const QUARRY_R = 16;
export const DOCK_R = 20;
export const CORNERSTONE_R = 28;
export const SETTLEMENT_GAP = 64;

export const PLAYER_CAMP = { x: 0, z: 38 };
export const RIVAL_CAMP = { x: 82, z: -86 };
export const ASHFEN_CAMP = { x: -82, z: -80 };

export const TRADE_OFFERS: { give: ResKind; giveAmt: number; get: ResKind; getAmt: number }[] = [
  { give: "food", giveAmt: 40, get: "wood", getAmt: 30 },
  { give: "wood", giveAmt: 35, get: "stone", getAmt: 18 },
  { give: "food", giveAmt: 50, get: "stone", getAmt: 16 },
];

export const AGES = ["Stone", "Bronze", "Iron", "Classical", "Medieval", "Renaissance"] as const;

export const AGE_COST: (Cost | null)[] = [
  null,
  { food: 220, wood: 150, stone: 60, pop: 10 },
  { food: 260, wood: 200, stone: 90, copper: 18, pop: 12 },
  { food: 380, wood: 280, stone: 160, copper: 28, iron: 12, pop: 16 },
  { food: 520, wood: 400, stone: 240, copper: 36, iron: 22, pop: 20 },
  { food: 700, wood: 520, stone: 340, copper: 48, iron: 32, pop: 24 },
];

export const AGE_STAT = [1, 1.1, 1.22, 1.35, 1.5, 1.68];

export const BUILDINGS: Record<
  BldType,
  {
    name: string;
    w: number;
    d: number;
    food: number;
    wood: number;
    stone: number;
    copper?: number;
    iron?: number;
    pop: number;
    hp: number;
    age: number;
    hint: string;
  }
> = {
  townhall: {
    name: "Town Hall",
    w: 10,
    d: 10,
    food: 0,
    wood: 20,
    stone: 0,
    pop: 8,
    hp: 1100,
    age: 0,
    hint: "The first hearth is free. Later settlements need 20 logs, construction labor and room beyond existing villages. Two cornerstones can claim distant clumps.",
  },
  cornerstone: {
    name: "Cornerstone",
    w: 3, d: 3, food: 0, wood: 70, stone: 0, pop: 0, hp: 320, age: 0,
    hint: "Claims a distant resource clump. Workers gather nearby and deliver here. Two beyond the home hall.",
  },
  hut: {
    name: "Hut",
    w: 5.4,
    d: 5.2,
    food: 0,
    wood: 40,
    stone: 0,
    pop: 5,
    hp: 240,
    age: 0,
    hint: "Raises population cap by 5.",
  },
  farm: {
    name: "Farm",
    w: 8.2,
    d: 8.2,
    food: 0,
    wood: 20,
    stone: 0,
    pop: 0,
    hp: 200,
    age: 0,
    hint: "Sow in spring, tend in summer, harvest in autumn. Base full yield: 260 food/year, adjusted by soil and habitat. See Village (L).",
  },
  lumber: {
    name: "Lumber Camp",
    w: 6.2,
    d: 5.8,
    food: 0,
    wood: 32,
    stone: 0,
    pop: 0,
    hp: 220,
    age: 0,
    hint: "Optional workplace: nearby cutting takes 42% less time. Known trees can be cut without it. Spent stands return most of the timber.",
  },
  quarry: {
    name: "Quarry",
    w: 6.4,
    d: 6,
    food: 0,
    wood: 36,
    stone: 0,
    pop: 0,
    hp: 240,
    age: 0,
    hint: "Logs only. Sit it on a grey outcrop — people haul stone after it stands.",
  },
  dock: {
    name: "Fishing Dock",
    w: 6.4,
    d: 5.2,
    food: 0,
    wood: 40,
    stone: 0,
    pop: 0,
    hp: 200,
    age: 0,
    hint: "Drop it on the white posts by the water.",
  },
  warehouse: {
    name: "Storehouse",
    w: 6.6,
    d: 6,
    food: 0,
    wood: 60,
    stone: 0,
    pop: 0,
    hp: 300,
    age: 0,
    hint: "Shelters 160 food. Adults can dry and smoke surplus food here using timber. Also shortens carrying trips.",
  },
  barracks: {
    name: "Barracks",
    w: 8.8,
    d: 8.2,
    food: 0,
    wood: 40,
    stone: 0,
    pop: 0,
    hp: 480,
    age: 0,
    hint: "Arm existing adults from the Bronze Age. Early villagers hunt and defend without a separate profession.",
  },
  forge: {
    name: "Forge",
    w: 6.4,
    d: 6,
    food: 0,
    wood: 70,
    stone: 60,
    copper: 10,
    pop: 0,
    hp: 360,
    age: 1,
    hint: "Copper becomes bronze blades. Iron becomes steel. Speeds metal work nearby.",
  },
  watchtower: {
    name: "Watchtower",
    w: 4.6,
    d: 4.6,
    food: 0,
    wood: 60,
    stone: 50,
    pop: 0,
    hp: 420,
    age: 2,
    hint: "Fires on enemies in range.",
  },
  temple: {
    name: "Temple",
    w: 8.4,
    d: 8,
    food: 40,
    wood: 60,
    stone: 120,
    pop: 8,
    hp: 520,
    age: 3,
    hint: "Faith and order. +8 population.",
  },
  market: {
    name: "Market",
    w: 7.4,
    d: 7,
    food: 0,
    wood: 90,
    stone: 40,
    pop: 0,
    hp: 340,
    age: 3,
    hint: "Traders. Gatherers work 12% faster.",
  },
  keep: {
    name: "Keep",
    w: 9.2,
    d: 9.2,
    food: 0,
    wood: 80,
    stone: 160,
    iron: 12,
    pop: 6,
    hp: 900,
    age: 4,
    hint: "Stone stronghold. +6 population.",
  },
  stables: {
    name: "Stables",
    w: 8.4,
    d: 8,
    food: 40,
    wood: 100,
    stone: 40,
    pop: 0,
    hp: 400,
    age: 4,
    hint: "Train cavalry.",
  },
  university: {
    name: "University",
    w: 10,
    d: 8.6,
    food: 80,
    wood: 140,
    stone: 160,
    pop: 10,
    hp: 640,
    age: 5,
    hint: "Learning. +10 population.",
  },
  cairn: {
    name: "Stone Cairn",
    w: 4.2,
    d: 4.2,
    food: 0,
    wood: 20,
    stone: 40,
    pop: 0,
    hp: 280,
    age: 0,
    hint: "Redcliff marker. Radiates influence toward stone.",
  },
  grove: {
    name: "Ash Grove",
    w: 5.2,
    d: 5.2,
    food: 0,
    wood: 36,
    stone: 0,
    pop: 0,
    hp: 240,
    age: 0,
    hint: "Ashfen marker. Radiates influence toward forage.",
  },
};

export const UNITS: Record<
  UnitType,
  {
    name: string;
    hp: number;
    speed: number;
    range: number;
    dmg: number;
    rof: number;
    food: number;
    wood: number;
    stone: number;
    copper?: number;
    iron?: number;
    train: number;
    r: number;
    age: number;
    from: BldType;
  }
> = {
  worker: {
    name: "Gatherer",
    hp: 48,
    speed: 5.4,
    range: 1.6,
    dmg: 4,
    rof: 1.2,
    food: 36,
    wood: 0,
    stone: 0,
    train: 6,
    r: 0.55,
    age: 0,
    from: "townhall",
  },
  spearman: {
    name: "Spearman",
    hp: 92,
    speed: 4.8,
    range: 2.6,
    dmg: 12,
    rof: 1.05,
    food: 28,
    wood: 6,
    stone: 0,
    train: 5,
    r: 0.6,
    age: 1,
    from: "barracks",
  },
  archer: {
    name: "Archer",
    hp: 58,
    speed: 5.0,
    range: 12,
    dmg: 9,
    rof: 1.2,
    food: 26,
    wood: 10,
    stone: 0,
    train: 6,
    r: 0.55,
    age: 1,
    from: "barracks",
  },
  swordsman: {
    name: "Swordsman",
    hp: 130,
    speed: 4.5,
    range: 2.0,
    dmg: 16,
    rof: 1.0,
    food: 36,
    wood: 8,
    stone: 0,
    copper: 4,
    train: 8,
    r: 0.65,
    age: 1,
    from: "barracks",
  },
  cavalry: {
    name: "Rider",
    hp: 150,
    speed: 7.2,
    range: 2.3,
    dmg: 18,
    rof: 1.1,
    food: 45,
    wood: 16,
    stone: 0,
    iron: 4,
    train: 10,
    r: 0.9,
    age: 4,
    from: "stables",
  },
  leader: {
    name: "Chieftain",
    hp: 210,
    speed: 3.6,
    range: 2.1,
    dmg: 8,
    rof: 1.3,
    food: 0,
    wood: 0,
    stone: 0,
    train: 0,
    r: 0.8,
    age: 0,
    from: "townhall",
  },
  warden: {
    name: "Warden",
    hp: 155,
    speed: 4.1,
    range: 2.2,
    dmg: 15,
    rof: 1.15,
    food: 0,
    wood: 0,
    stone: 0,
    train: 0,
    r: 0.72,
    age: 9,
    from: "barracks",
  },
  ranger: {
    name: "Ranger",
    hp: 64,
    speed: 5.2,
    range: 15,
    dmg: 10,
    rof: 1.15,
    food: 0,
    wood: 0,
    stone: 0,
    train: 0,
    r: 0.55,
    age: 9,
    from: "barracks",
  },
};

export const GATHER = {
  food: { period: 2.6, carry: 7, campBonus: 0.62 },
  wood: { period: 2.5, carry: 7, campBonus: 0.58 },
  stone: { period: 3.3, carry: 6, campBonus: 0.6 },
  copper: { period: 3.6, carry: 5, campBonus: 0.62 },
  iron: { period: 3.9, carry: 4, campBonus: 0.6 },
};

export const BUILD_ORDER: BldType[] = [
  "hut",
  "farm",
  "dock",
  "lumber",
  "quarry",
  "warehouse",
  "barracks",
  "forge",
  "watchtower",
  "temple",
  "market",
  "keep",
  "stables",
  "university",
];

export const TEAM_COLORS = ["#c4a060", "#c4452a", "#3d7a62", "#4a2428"];
export const TEAM_STYLE = [
  { roof: "#c9a36a", timber: "#c4a060", unit: "#e0c078", yaw: 0, sx: 1, sy: 1, sz: 1 },
  { roof: "#4a1c18", timber: "#8a2820", unit: "#e05038", yaw: 0.42, sx: 1.08, sy: 1.2, sz: 1.02 },
  { roof: "#1e3a28", timber: "#2d5a40", unit: "#5a9a78", yaw: -0.32, sx: 1.18, sy: 0.86, sz: 1.16 },
  { roof: "#2a1818", timber: "#4a2428", unit: "#6a3030", yaw: 0.1, sx: 1, sy: 1, sz: 1 },
] as const;
export const TEAM_NAMES = ["Dawnfolk", "Redcliff", "Ashfen", "Sea Raiders"];
export const TEAM_SHORT = ["You", "Redcliff", "Ashfen", "Raiders"];
export const REGION_CLUSTERS: { id: number; name: string; bonus: ResKind; hint: string }[] = [
  { id: 0, name: "Highlands", bonus: "stone", hint: "Stone gather runs faster island-wide" },
  { id: 1, name: "Riverlands", bonus: "food", hint: "Berries and farms run faster island-wide" },
  { id: 2, name: "Wildwood", bonus: "wood", hint: "Logging runs faster island-wide" },
];

export const CITY_LEADERS: Record<ResKind, { name: string; title: string; csType: string }[]> = {
  food: [
    { name: "Oren", title: "Fisher-thane", csType: "Agrarian" },
    { name: "Syla", title: "Harvest-mother", csType: "Agrarian" },
  ],
  wood: [
    { name: "Maela", title: "Grove-speaker", csType: "Cultural" },
    { name: "Tomas", title: "Timber-warden", csType: "Cultural" },
  ],
  stone: [
    { name: "Caran", title: "Warden", csType: "Militaristic" },
    { name: "Brigg", title: "Shield-thane", csType: "Militaristic" },
  ],
  copper: [
    { name: "Rhuna", title: "Forge-speaker", csType: "Industrial" },
    { name: "Kael", title: "Vein-lord", csType: "Industrial" },
  ],
  iron: [
    { name: "Kael", title: "Vein-lord", csType: "Industrial" },
    { name: "Rhuna", title: "Forge-speaker", csType: "Industrial" },
  ],
};

export function costOfBuilding(t: BldType): Cost {
  const d = BUILDINGS[t];
  return { food: d.food, wood: d.wood, stone: d.stone, copper: d.copper, iron: d.iron };
}

export function costOfUnit(t: UnitType): Cost {
  const d = UNITS[t];
  return { food: d.food, wood: d.wood, stone: d.stone, copper: d.copper, iron: d.iron };
}

export const SAVE_KEY = "dawn-of-empire-v17";
export const SAVE_VERSION = 17;

export const AGE_CHOICES: {
  econ: { name: string; hint: string };
  army: { name: string; hint: string };
}[] = [
  {
    econ: { name: "Granaries", hint: "+220 food capacity; ordinary spoilage reduced by 65%" },
    army: { name: "Hardened hides", hint: "People gain 25% more health and 20% more damage" },
  },
  {
    econ: { name: "Timber rights", hint: "Woodcutting takes 35% less time. Other work is unchanged" },
    army: { name: "Long spears", hint: "People gain 25% more health and 20% more damage" },
  },
  {
    econ: { name: "Market weights", hint: "Caravans leave sooner and bring a little more home" },
    army: { name: "Watchfires", hint: "Watchtower sight grows from 22 to 30 units, plus stronger defenders" },
  },
  {
    econ: { name: "Open fields", hint: "Sowing, tending and harvests improve. Soil tires slower" },
    army: { name: "Shield wall", hint: "Soldiers hold a tighter line, with more health and damage" },
  },
  {
    econ: { name: "Ledgers", hint: "Haulers and traders walk faster on the road" },
    army: { name: "Royal guard", hint: "Existing soldiers gain 50% health; civilians gain 25%. No new people are created." },
  },
];

export const BUILD_TIME: Record<BldType, number> = {
  townhall: 0,
  cornerstone: 12,
  hut: 8,
  farm: 10,
  lumber: 10,
  dock: 10,
  quarry: 12,
  warehouse: 12,
  barracks: 12,
  forge: 24,
  watchtower: 16,
  temple: 28,
  market: 22,
  keep: 36,
  stables: 28,
  university: 32,
  cairn: 18,
  grove: 16,
};

export const FOW = 192;
