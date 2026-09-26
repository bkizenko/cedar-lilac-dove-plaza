export type UnitType = "worker" | "spearman" | "archer" | "swordsman" | "cavalry" | "leader" | "warden" | "ranger";

export type BldType =
  | "townhall"
  | "hut"
  | "farm"
  | "lumber"
  | "quarry"
  | "dock"
  | "warehouse"
  | "barracks"
  | "forge"
  | "watchtower"
  | "temple"
  | "market"
  | "keep"
  | "stables"
  | "university"
  | "cairn"
  | "grove";

export type ResKind = "food" | "wood" | "stone" | "copper" | "iron";
export type Order = "idle" | "move" | "gather" | "return" | "attack" | "attackmove" | "hold" | "trade" | "explore" | "build";

export type Weather = "clear" | "mist" | "rain" | "storm" | "frost" | "golden" | "flood" | "drought";

export type SeasonName = "Spring" | "Summer" | "Autumn" | "Winter";

export type SeasonMix = {
  name: SeasonName;
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
  snow: number;
  yearFrac: number;
};

export type Cost = { food?: number; wood?: number; stone?: number; copper?: number; iron?: number; pop?: number };

export type TradeDeal = { give: ResKind; giveAmt: number; get: ResKind; getAmt: number };

export type TradeRoute = {
  id: number;
  team: number;
  rival: string;
  give: ResKind;
  giveAmt: number;
  get: ResKind;
  getAmt: number;
  interval: number;
  t: number;
};

export type RouteOffer = {
  team: number;
  rival: string;
  color: string;
  give: ResKind;
  giveAmt: number;
  get: ResKind;
  getAmt: number;
  interval: number;
};

export type Region = {
  id: number;
  name: string;
  x: number;
  z: number;
  r: number;
  res: ResKind;
  owner: number;
  cluster: number;
  clusterName: string;
};

export type CritterKind = "deer" | "boar" | "goat" | "bird";

export type Critter = {
  id: number;
  species: CritterKind;
  x: number;
  y: number;
  z: number;
  facing: number;
  vx: number;
  vz: number;
  wanderT: number;
  hp: number;
  maxHp: number;
  fly: number;
  scale: number;
};

export type Unit = {
  id: number;
  kind: "unit";
  type: UnitType;
  team: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  hp: number;
  maxHp: number;
  speed: number;
  range: number;
  dmg: number;
  rof: number;
  cd: number;
  r: number;
  selected: boolean;
  order: Order;
  tx: number;
  tz: number;
  job: ResKind | null;
  node: ResourceNode | Building | Critter | null;
  gatherT: number;
  carry: number;
  carryType: ResKind | null;
  target: Unit | Building | null;
  wanderT: number;
  aggroT: number;
  stride: number;
  trade: TradeDeal | null;
  tradeTeam: number;
  ageT: number;
  jobLock: boolean;
  huntOnly: boolean;
  stuckT: number;
  pillage: number;
  stature: number;
  tint: number;
  militia: boolean;
};

export type QueueItem = { unit: UnitType; t: number; max: number };

export type Building = {
  id: number;
  kind: "building";
  type: BldType;
  team: number;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  hp: number;
  maxHp: number;
  selected: boolean;
  queue: QueueItem[];
  rally: { x: number; z: number } | null;
  cd: number;
  build: number;
  reclaimed: boolean;
};

export type ResourceNode = {
  id: number;
  kind: "tree" | "stone" | "forage" | "farm" | "fish" | "copper" | "iron";
  x: number;
  z: number;
  y: number;
  amount: number;
  maxAmt: number;
  regenT: number;
  scale: number;
  rich: number;
};

export type Floater = {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  life: number;
  max: number;
};

export type Projectile = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  target: Unit | Building | null;
  speed: number;
  life: number;
  dmg: number;
  team: number;
};

export type Tribe = {
  id: number;
  name: string;
  short: string;
  color: string;
  food: number;
  wood: number;
  stone: number;
  copper: number;
  iron: number;
  age: number;
  aggro: number;
  expand: number;
  tech: number;
  lastRaid: number;
  thinkT: number;
  alive: boolean;
  hostile: boolean;
  ally: boolean;
  spec: ResKind;
  tradeCd: number;
  leader: string;
  leaderTitle: string;
  csType: string;
  tension: number;
  tensionBand: number;
  spears: number;
  bows: number;
  blades: number;
  fallenT: number;
};

export type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  r: number;
  color: string;
};

export type GameState = {
  seed: number;
  time: number;
  age: number;
  tribes: Tribe[];
  units: Unit[];
  buildings: Building[];
  trees: ResourceNode[];
  stones: ResourceNode[];
  forage: ResourceNode[];
  fish: ResourceNode[];
  copper: ResourceNode[];
  iron: ResourceNode[];
  projectiles: Projectile[];
  floaters: Floater[];
  particles: Particle[];
  selBld: Building | null;
  paused: boolean;
  speed: number;
  ended: null | "win" | "lose";
  endReason: string;
  banner: string;
  bannerT: number;
  placing: BldType | null;
  placeIssue: string | null;
  nextId: number;
  walkDirty: boolean;
  agePicks: ("econ" | "army")[];
  pendingAge: boolean;
  event: "none" | "herd";
  eventT: number;
  weather: Weather;
  weatherT: number;
  birthT: number;
  marketT: number;
  deals: TradeDeal[];
  raidT: number;
  wildlife: Critter[];
  routes: TradeRoute[];
  routeOffer: RouteOffer | null;
  routeOfferT: number;
  routePopups: number;
  yearOffset: number;
  raidWave: number;
  regions: Region[];
  richRes: ResKind;
  harvestDay: number;
  yieldT: number;
};

export type HudSelection = {
  name: string;
  info: string;
  hp: number;
  maxHp: number;
  kind: "none" | "unit" | "units" | "building";
  type?: string;
  team?: number;
  queue?: string;
  carry?: string;
  job?: ResKind | "hold" | null;
  canRecycle?: boolean;
};

export type HudSnapshot = {
  food: number;
  wood: number;
  stone: number;
  copper: number;
  iron: number;
  pop: number;
  popCap: number;
  age: number;
  ages: string[];
  time: number;
  day: number;
  clock: string;
  period: string;
  weather: string;
  season: string;
  paused: boolean;
  speed: number;
  ended: null | "win" | "lose";
  endReason: string;
  objective: string;
  placing: BldType | null;
  placeIssue: string | null;
  banner: string | null;
  selection: HudSelection;
  canAge: boolean;
  ageCost: Cost | null;
  nextAge: string | null;
  tribes: { id: number; name: string; color: string; age: number; alive: boolean; hostile: boolean; ally: boolean; spec: string; leader: string; csType: string; tension: number }[];
  trainOptions: { type: UnitType; name: string; cost: Cost; age: number }[];
  buildOptions: { type: BldType; name: string; cost: Cost; age: number; hint: string }[];
  fps: number;
  started: boolean;
  awaitingStart: boolean;
  muted: boolean;
  quality: "low" | "med" | "high";
  workerSelected: number;
  militarySelected: number;
  job: ResKind | "hold" | "hunt" | null;
  canRaid: boolean;
  trade: {
    rival: string;
    hostile: boolean;
    alive: boolean;
    cd: number;
    offers: TradeDeal[];
    canCycle: boolean;
    ally: boolean;
    spec: string;
    canPact: boolean;
    leader: string;
    leaderTitle: string;
    csType: string;
  } | null;
  rivalX: number;
  rivalZ: number;
  homeX: number;
  homeZ: number;
  camps: { x: number; z: number; name: string; color: string; alive: boolean; hostile: boolean }[];
  raidName: string | null;
  idleWorkers: number;
  pendingAge: {
    next: string;
    econ: { name: string; hint: string };
    army: { name: string; hint: string };
  } | null;
  routeOffer: RouteOffer | null;
  routes: { rival: string; give: ResKind; giveAmt: number; get: ResKind; getAmt: number; t: number }[];
  event: string | null;
  regions: { name: string; res: ResKind; owner: number; color: string; x: number; z: number; r: number; cluster: string }[];
  richRes: ResKind;
  clusters: { name: string; bonus: string; held: boolean }[];
  prestige: number;
  stockCap: number;
  port: boolean;
  night: boolean;
  threat: number;
  spears: number;
  bows: number;
  blades: number;
  armed: number;
  raidIn: number;
};
