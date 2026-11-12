import type {WildPlantState} from "./ecology";
import type {ConflictIntent,OccupationControl} from './conflictIntent';
import type {PrisonerCustody} from './captivity';
import type {ConflictJournal} from './conflictMetrics';
import type {FarmToolKind,FarmToolWork} from "./farmTools";
import type {HaulageKind,HaulageWork} from "./haulage";
export type UnitType =
  "worker" | "spearman" | "archer" | "swordsman" | "cavalry" | "leader" | "warden" | "ranger";

export type BldType =
  | "threshingFloor" | "fibreWorkshop" | "potter" | "kiln" | "smokehouse" | "grindingStone" | "oven" | "hearth" | "butcher" | "dryrack" | "tanner" | "tailor"
  | "townhall"
  | "cornerstone"
  | "hut"
  | "house"
  | "farm"
  | "pen"
  | "lumber"
  | "quarry"
  | "dock"
  | "bridge"
  | "warehouse"
  | "barracks"
  | "forge"
  | "workshop"
  | "watchtower"
  | "temple"
  | "market"
  | "keep"
  | "stables"
  | "university"
  | "cairn"
  | "grove"
  | "well" | "cistern" | "watermill" | "windmill" | "aqueduct" | "canal"
  | "palisade" | "gate" | "stonewall" | "trench" | "moat";

export type ResKind = "food" | "wood" | "stone" | "copper" | "iron";
export type FoodKind = "provisions" | "berries" | "fish" | "meat" | "grain" | "pulses" | "tubers" | "milk" | "bread" | "driedMeat" | "driedFish" | "smokedMeat" | "smokedFish" | "cookedFish" | "porridge" | "fermentedMilk" | "freshCurd" | "whey" | "smallBeer" | "beer";
export type CropKind = "grain" | "pulses" | "tubers";
export type Order =
  | "idle"
  | "move"
  | "gather"
  | "return"
  | "attack"
  | "attackmove"
  | "hold"
  | "trade"
  | "explore"
  | "build";

export type Weather =
  "clear" | "mist" | "rain" | "storm" | "frost" | "golden" | "flood" | "drought";

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

export type Cost = {
  seeds?: number;
  food?: number;
  wood?: number;
  stone?: number;
  copper?: number;
  iron?: number;
  pop?: number;
};

export type TradeDeal = { give: ResKind; giveAmt: number; get: ResKind; getAmt: number };

export type TradeRoute = {
  caravan?: {size:number;guards:number;transport:'any'|'pack'|'cart';workerIds:number[];trips:number;losses:number;received:Partial<Record<ResKind,number>>;refunded:number;lastResult?:string};
  paused?: boolean;
  workerId?: number;
  status?: string;
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

export type CritterKind = "deer" | "boar" | "goat" | "sheep" | "horse" | "cattle" | "bird";

export type Critter = {
  huntDefense?:{hunterId:number;expiresAt:number;nextAttackAt:number;lastX:number;lastZ:number};
  grazing?: {x:number;z:number};
  carcass?: {meat:number;diedAt:number;hides?:number;bones?:number;prepared?:true;preparationWork?:number;skinningWork?:number};
  id: number;
  species: CritterKind;
  fleece?:import('./sheep').SheepFleece;
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

export type Livestock = Critter & {
  packHarness?:import('./packAnimalState').PackHarness;
  foodConsumed?:number;waterConsumedLiters?:number;
  adultScale?:number;
  team: number; pen: number; sex: 'female' | 'male';
  /** Exclusive live escort custody; ownership changes only on physical pen delivery. */
  ledBy?:number;
  born: number; tamedAt: number; hunger: number; milk: number;
  thirstSeconds?:number; pregnancy: number; lactatingUntil?: number; stuckT?: number;
};

export type Unit = import("./communityHandoverTypes").HandoverProvenance&{
  waterCargoEvidence?:import('./boatPractice').WaterCargoEvidence;
  practicalHelper?:import('./practicalHelpers').PracticalHelper;
  structureReportCargo?:import('./structureKnowledge').StructureReport[];
  tradeIntelCargo?:import('./tradeIntel').PartnerTradeReport[];
  visitorRefusalCargo?:import('./visitorRefusals').VisitorRefusalCargo;
  societyMissionId?:number;
  coastalVoyageId?:number;
  coastalCommissionId?:number;
  seaExplorationId?:number;
  tradeNeedsId?:number;
  cargoRecoveryId?:number;
  tradeCargoPending?:true;
  fibreWork?:import('./fibre').FibreWork;
  basket?:import('./fibre').OwnedBasket;
  clayWork?:import('./pottery').ClayWork;
  waterVessel?:import('./pottery').WaterVessel;
  sitePreparationId?:number;
  productionProjectId?:number;
  productionSkills?:Partial<Record<import('./production').ProductionRecipe,import('./productionPractice').ProductionSkill>>;
  tradedTeaching?:import('./tradedTeaching').TradedTeachingOrder;
  productionApprentice?:import('./productionPractice').ProductionApprentice;
  weaponCargo?:import('./weaponCargo').WeaponCargo;
  armorCargoId?:number;
  itemCargo?:import('./production').ItemStock;
  rawHuntMeat?:true;
  armorRepair?:import('./armorRepair').ArmorRepair;
  garmentRepair?:import('./garmentRepair').GarmentRepair;
  garment?:import('./textiles').Garment;
  spareGarment?:import('./textiles').Garment;
  exploreAfterDelivery?:true;
  campMoveId?:number;
  contactDemand?:{targetId:number;lastTimeSeconds:number};
  contactAttackTargetId?:number;
  contactSurrender?:{team:number;until:number};
  conflictIntent?:ConflictIntent;
  captureTargetId?:number;
  prisoner?:PrisonerCustody;
  waterWork?:import('./survivalNeeds').WaterWork;
  thirstSeconds?:number;
  coldSeconds?:number;
  name?: string;
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
  stationOnArrival?: boolean;
  campSupport?:import('./finiteCamp').CampSupport;
  campTrip?:import('./finiteCamp').CampTrip;
  campReport?:import('./finiteCamp').CampReport;
  campObserveAt?:number;
  homeCamp?: number;
  goatSearchPen?: number;
  searchJob?: "wood" | "food" | "hunt";
  recalled?: boolean;
  demobilizing?: boolean;
  returnAfterCombat?: boolean;
  massRaidTarget?: number;
  enslavedFrom?: number;
  repatriating?: boolean;
  captivityUnrest?: number;
  tributeJourney?: {phase:"pickup"|"deliver"|"return"; amount:number};
  settlementJourney?: {version:1;owner:number;siteId?:number;x:number;z:number;recordedAt:number};
  diplomaticAccount?:import('./diplomaticKnowledge').DiplomaticAccount;
  envoy?: {team:number; kind:"peace"|"trade"|"gift"|"compact"; term?:PeaceTerm; phase:"outbound"|"return"; talk:number; report?: {time:number; offers:TradeDeal[]}};
  sickUntil?: number;
  maturesAt?: number;
  workReason?: string;
  workCheckAt?: number;
  blockedTask?: number;
  retryWorkAt?: number;
  emergency?: { until: number; job: ResKind | null; jobLock: boolean; autoArmed: boolean; defending?: boolean;
    resume?: { order: "move" | "hold" | "explore" | "trade"; tx: number; tz: number; station: boolean } };
  attackDestination?: { x: number; z: number } | null;
  tx: number;
  tz: number;
  job: ResKind | null;
  drill?: number;
  node: ResourceNode | Building | Critter | null;
  gatherT: number;
  carry: number;
  carryType: ResKind | null;
  carryFood?: FoodKind;
  seedSamples?: Partial<Record<CropKind,number>>;
  studyCrop?: CropKind;
  farmToolCargoId?:number;
  farmTool?: FarmToolKind;
  farmToolCondition?:number;
  /** Actual productive seconds guiding a horse-drawn ard; not an age grant. */
  draftPracticeSeconds?:number;
  farmToolWork?: FarmToolWork;
  packAnimal?: import('./packAnimalState').PackAnimal;
  packPastureOrder?:{version:1;pen:number;animal:number;requestedAt:number;phase:'queued'|'unloading'|'returning';reason?:string};
  tamingWork?: {animal:number;progress:number;paused?:boolean;pen?:number;penGateReached?:boolean};
  husbandryWork?: {stable?:number;pen:number;progress:number;action:"care"|"slaughter"|"pack"|"shear";phase:"pen"|"fetch"|"feed"|"deliver"|"waterFetch"|"waterDeliver"|"waterReturn"|"beddingFetch"|"beddingDeliver"|"beddingLay"|"beddingReturn";beddingUnits?:number;beddingProgress?:number;releaseAfterBedding?:true;waterLiters?:number;waterTeam?:number;releaseAfterWater?:true;animal?:number;paused?:boolean};
  haulage?: HaulageKind;
  haulageWork?: HaulageWork;
  seaRaidReturn?: import("./seaRaiderReturn").SeaRaiderReturn;
  seaRaid?: {plan?:import('./raidIntent').RaidPlan;x:number;z:number;goalX:number;goalZ:number;phase:"raid"|"retreat";thinkAt:number;departAt:number};
  siegeRamId?:number;
  craftingXP?: number;
  copperStudy?:import('./materialStudy').CopperStudy;
  caravanRoute?:number;
  hullRecovery?:import('./hullLossRecovery').HullLossRecovery;
  boat?: {id:number;phase:'boarding'|'aboard'|'landing';x?:number;z?:number};
  plantingWork?: {treeId:number;progress:number};
  weaponWork?: {kind: "spear" | "bow" | "blade"; progress:number; duration:number; workplace:number; paused?:boolean};
  combatXP?: number;
  target: Unit | Building | null;
  wanderT: number;
  aggroT: number;
  stride: number;
  trade: TradeDeal | null;
  tradeLoading?:true;
  foodRole?:true;
  tradeTeam: number;
  tradeReservation?: {team:number;kind:ResKind;amount:number};
  ageT: number;
  hunger?: number;
  customOffer?: boolean;
  procurement?: { minimum: number };
  homeHall?: number;
  parents?: number[];
  foundingJourney?: {x:number;z:number;leader:boolean;timber?:number};
  expedition?: {food:number;returning:boolean;forage:number};
  scout?: {legs:number;returning:boolean;preparing?:true};
  scoutProvisions?: import('./scoutProvisions').ScoutProvisions;
  fatigue?: number;
  resting?: boolean;
  shelterId?: number;
  visit?: {phase:"outbound"|"waiting"|"return";wait:number;team?:number;wanted?:ResKind};
  housingWorkId?:number;
  housingCargo?:import('./housingTypes').HousingCargo;
  housingSkill?:import('./housingTypes').HousingSkill;
  housingUse?:import('./housingTypes').HousingUse;
  buildingRepairId?:number;
  buildOrder?: number;
  constructionQueue?: {sites:number[];paused?:true};
  jobLock: boolean;
  huntOnly: boolean;
  huntTrail?:{animal:number;x:number;z:number;seenAt:number;expiresAt:number;searchStartedAt?:number};
  stuckT: number;
  pillage: number;
  stature: number;
  tint: number;
  militia: boolean;
  caravanArmed?: boolean;
  escortId?: number;
};

export type QueueItem = { unit: UnitType; t: number; max: number };

export type Building = {
  fabric?:import('./buildingFabric').BuildingFabric;
  sitePreparation?:import('./sitePreparation').SitePreparation;
  renovation?:import('./housingTypes').HousingRenovation;
  housingReceipt?:import('./housingTypes').HousingReceipt;
  maintenance?:import('./buildingMaintenance').BuildingCare;
  repair?:import('./buildingMaintenance').BuildingRepair;
  excavationDepth?:number;
  excavationVolume?:number;
  excavationWorkSeconds?:number;
  towerPlatform?:import('./towerPlatforms').TowerPlatform;
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
  bridge?: {ax:number;az:number;bx:number;bz:number};
  excavation?: {remaining:number;dug:number;quality:number;prospected?:number};
  queue: QueueItem[];
  rally: { x: number; z: number } | null;
  cd: number;
  build: number;
  reclaimed: boolean;
  expansion?: {w:number;d:number;progress:number;paid:boolean};
  plannedCost?: Cost;
  planPaused?: boolean;
  constructionPriority?:0|1|2;
  gateOpen?: boolean;
  gateMode?: "auto" | "open" | "closed";
  gateFacing?: "north" | "east" | "south" | "west";
  raiderCamp?: boolean;
  campEconomy?:import('./finiteCamp').CampEconomy;
  lootClaimed?: boolean;
  raidLoot?: Partial<Record<ResKind,number>>;
  lootTeam?: number;
  storeCare?: number;
  goatSearch?:import('./animalOrders').GoatSearchOrder;
  penBedding?:import('./penBedding').PenBedding;
  penWater?:import('./penWater').PenWater;
  pasture?: {condition:number;feed:number;care:number;initialFeed?:number;feedDelivered?:number;feedConsumed?:number;grazedFood?:number};
  fertility?: number;
  fallowYear?: number;
  cerealProcessingVersion?:1;
  cropType?: CropKind;
  crop?: { year: number; planted: number; tended: number; remaining: number; ripened: boolean; water?:number; kind?:CropKind };
};

export type ResourceNode = {
  planted?: boolean;
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
  pressure?: number;
  cropCandidate?: CropKind;
  wildPlant?: WildPlantState;
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
  wildlifeTargetId?:number;
  huntingWeapon?:"stone"|"bow";
  huntingVelocity?:{x:number;y:number;z:number};
  attackerId?:number;
  conflictIntent?:ConflictIntent;
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

export type PeaceTerm = "whitePeace" | "tribute" | "forcedLabor" | "puppet" | "annexation";

export type Tribe = {
  foodExperience?:import("./foodExperience").FoodExperience;
  identity?:import('./societyIdentity').SocietyIdentity;
  inheritedCropTrials?:import("./communityHandoverTypes").InheritedCropTrial[];
  animalProcessingVersion?:1;
  productionPractice?:Partial<Record<import('./production').ProductionRecipe,import('./productionPractice').ProductionDemonstration>>;
  basketOrigins?:{origin:import('./pottery').PotteryOrigin;count:number}[];
  potteryOrigins?:{origin:import('./pottery').PotteryOrigin;count:number}[];
  items?:import('./production').ItemStock;
  itemFreshness?:Partial<Record<'flour'|'rawHide'|'cleanHide'|'greenMalt'|import('./cerealRules').StoredCerealKind,number>>;
  survival?:import('./survivalNeeds').SurvivalStock;
  seeds?: number;
  boatPractice?:import('./boatPractice').BoatPractice;
  haulagePractice?: number;
  id: number;
  name: string;
  short: string;
  color: string;
  food: number;
  foodLots?: Partial<Record<FoodKind,number>>;
  cropSamples?: Partial<Record<CropKind,number>>;
  copperExperiment?: boolean;
  cultivated?: CropKind[];
  cultivationEvidence?: Partial<Record<CropKind,import("./cultivation").CultivationEvidence>>;
  cropTrial?: {kind:CropKind; progress:number; duration:number;workActorIds?:number[]};
  wood: number;
  stone: number;
  copper: number;
  iron: number;
  age: number;
  aggro: number;
  expand: number;
  tech: number;
  lastRaid: number;
  trust?: number;
  recoveryUntil?: number;
  compactUntil?: number;
  intent?: string;
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
  lastSettlement?: number;
  peaceOffer?: { from: number; term: PeaceTerm; expires: number };
  peaceTerm?: PeaceTerm;
  tributeUntil?: number;
  tribute?: {amount:number; remaining:number; next:number; owed:number; paid:number};
  nextPeaceOffer?: number;
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
  penBedding?:import('./penBedding').PenBeddingLedger;
  copperTrials?:import('./materialStudy').CopperTrials;
  teachingOffers?:import('./tradedTeaching').TeachingOffer[];
  armorMaintenance?:import('./armorRepair').ArmorMaintenance;
  garmentMaintenance?:import('./garmentRepair').GarmentMaintenance;
  captiveDealings?:import('./captiveDealings').CaptiveDealingsState;
  droppedWeaponCargo?:import('./weaponCargo').DroppedWeaponCargo[];
  armor?:import('./armor').ArmorState;
  siegeRams?:import('./siegeRam').SiegeRamState;
  retainedHousingProjects?:import('./housingTypes').RetainedHousingProject[];
  retainedBuildingRepairs?:import('./buildingMaintenance').RetainedBuildingRepair[];
  buildingMaintenanceVersion?:1;
  raidIntentHistory?:import('./raidIntent').RaidIntentHistory[];
  communityHandovers?:import("./communityHandoverTypes").CommunityHandover[];
  diplomaticReports?:import('./diplomaticKnowledge').DiplomaticReport[];
  diplomaticMessages?:import('./diplomaticKnowledge').DiplomaticMessage[];
  observedClaims?:import('./frontiers').ObservedClaim[];
  observedSettlements?:import('./settlementKnowledge').ObservedSettlement[];
  practicalHelpers?:import('./practicalHelpers').PracticalHelperMetrics;
  structureReports?:import('./structureKnowledge').StructureReport[];
  tradeIntel?:import('./tradeIntel').TradeIntelState;
  excavations?:import('./excavation').TerrainCut[];
  excavationDepth?:number;
  canalWorks?:import('./canalBreach').CanalWork[];
  aqueductWorks?: import('./waterLineWorks').AqueductWorksPlan[];
  societyRelations?:import('./societyRelations').SocietyRelation[];
  rivalMissions?:import('./rivalActivity').RivalMission[];
  coastalVoyages?:import('./coastalTrade').CoastalVoyage[];
  coastalTradeReviewAt?:number;
  coastalCommissions?:import('./coastalCommission').CoastalCommission[];
  seaExploration?:import('./seaExploration').SeaExplorationState;
  farmToolCargo?:import('./farmToolCargo').FarmToolCargoState;
  droppedCargo?:import('./stolenCargo').DroppedCargoState;
  rivalActivity?:import('./rivalActivity').RivalActivityJournal;
  rivalActivityNextReview?:{team:number;timeSeconds:number}[];
  towerPlacement?:import('./towerPlatforms').TowerPlatform;
  fibre?:import('./fibre').FibreState;
  clay?:import('./pottery').ClayState;
  cerealProcessing?:import('./cerealRules').CerealLedger;
  production?:import('./production').ProductionState;
  campSites?:{team:number;x:number;z:number}[];
  campMove?:import('./nomadicCamp').CampMove;
  autoWorkEnabled?:boolean;
  occupations?:OccupationControl[];
  conflictJournal?:ConflictJournal;
  seasonReports?:import('./seasonReports').SeasonReports;
  simulationEvents?:import('./simulationEvents').SimulationEventLog;
  finiteRaiderCampVersion?:1;
  survivalVersion?:1;
  haulageProjects?:import('./haulage').HaulageProject[];
  cartUpgradeRequests?:import('./haulage').CartUpgradeRequest[];
  contacts?:number[];
  encounter?:{team:number;person:number;stranger:number;resume:boolean};
  cultivationVersion?: number;
  lifeHistory?: {team:number;text:string;time:number}[];
  communities?: {hall:number;team:number;name:string;founded:number;emptySince:number|null;status:"growing"|"thriving"|"struggling"|"abandoned"}[];
  communityTimer?: number;
  trails?: {cell:number;wear:number;last:number;angle:number;x?:number;z?:number}[];
  rivalKnowledge?: {team:number;cells:number[]}[];
  scoutTimer?: number;
  tradeNeeds?:import('./tradeNeeds').TradeNeedsState;
  seaStorms?:import('./seaStorms').SeaStormState;
  rivalTradeRefusals?: {team:number;partner:number;wanted:ResKind;offered:ResKind;time:number}[];
  conquestAt?: number;
  difficulty?: import("./difficulty").Difficulty;
  nightWork?: boolean;
  visitorTimer?: number;
  boats?: import('./boats').Riverboat[];
  worldgenVersion?: number;
  wildPlantVersion?: 1;
  worldOptions?: import("./worldOptions").WorldOptions;
  /** Rulers lane (Claude): optional; absent in old saves. See rulersRuntime.ts. */
  rulers?: import("./rulersState").RulersState;
  tradeReports?: {team:number; time:number; offers:TradeDeal[]; observation?: {populationLow:number; populationHigh:number; buildings:number; stocks:Partial<Record<ResKind,"scarce"|"adequate"|"plentiful">>}}[];
  traditions?: {age: number; kind: "pathfinders" | "winter-stores" | "woodcraft"}[];
  discoveries?: { id: string; age: number; time: number }[];
  growthPolicy?: "stable" | "welcome" | "eager";
  laborPolicy?: "balanced" | "food" | "build" | "wood" | "stone" | "hunt" | "explore" | "trade";
  conflict?: "quiet" | "balanced" | "dangerous";
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
  founding?: boolean;
  event: "none" | "herd";
  eventT: number;
  weather: Weather;
  weatherT: number;
  birthT: number;
  marketT: number;
  deals: TradeDeal[];
  raidT: number;
  wildlife: Critter[];
  sheepVersion?:1;
  horseVersion?:1;
  cattleVersion?:1;
  livestock?: Livestock[];
  routes: TradeRoute[];
  routeOffer: RouteOffer | null;
  routeOfferT: number;
  routePopups: number;
  yearOffset: number;
  raidWave: number;
  raidCampaign?: {active:boolean; adults:number; buildings:number; loss:number; people?:number[]; sites?:number[]};
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
  kind: "none" | "unit" | "units" | "building" | "resource" | "boat";
  type?: string;
  team?: number;
  queue?: string;
  carry?: string;
  job?: ResKind | "hold" | "hunt" | "drill" | null;
  canRecycle?: boolean;
  planned?: boolean;
  buildingId?: number;
  completed?: boolean;
};

export type HudSnapshot = {
  foodLots?: Partial<Record<FoodKind,number>>;
  cornerstoneCount?: number;
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
  daylight?: string;
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
  plotSummary?: string;
  banner: string | null;
  selection: HudSelection;
  canAge: boolean;
  ageIssue: string | null;
  ageCost: Cost | null;
  nextAge: string | null;
  tribes: {
    id: number;
    name: string;
    color: string;
    age: number;
    alive: boolean;
    relationKnown: boolean;
    relationStale: boolean;
    hostile: boolean;
    ally: boolean;
    spec: string;
    leader: string;
    csType: string;
    tension: number;
  }[];
  trainOptions: { type: UnitType; name: string; cost: Cost; age: number }[];
  buildOptions: { type: BldType; name: string; cost: Cost; age: number; hint: string }[];
  fps: number;
  started: boolean;
  awaitingStart: boolean;
  founding: boolean;
  muted: boolean;
  quality: "low" | "med" | "high";
  workerSelected: number;
  militiaSelected: number;
  militarySelected: number;
  job: ResKind | "hold" | "hunt" | "drill" | null;
  canRaid: boolean;
  trade: {
    rival: string;
    relationKnown: boolean;
    relationStale: boolean;
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
  camps: {
    x: number;
    z: number;
    name: string;
    color: string;
    alive: boolean;
    hostile: boolean;
    team: number;
    known: boolean;
  }[];
  raidName: string | null;
  idleWorkers: number;
  pendingAge: {
    next: string;
    econ: { name: string; hint: string };
    army: { name: string; hint: string };
  } | null;
  routeOffer: RouteOffer | null;
  routes: {
    rival: string;
    give: ResKind;
    giveAmt: number;
    get: ResKind;
    getAmt: number;
    t: number;
  }[];
  event: string | null;
  regions: {
    name: string;
    res: ResKind;
    owner: number;
    color: string;
    x: number;
    z: number;
    r: number;
    cluster: string;
  }[];
  richRes: ResKind;
  clusters: { name: string; bonus: string; held: boolean }[];
  prestige: number;
  prestigeBreakdown?:import('./prestigeGame').GamePrestigeView;
  prestigeRivals?:import('./prestigeGame').GamePrestigeView[];
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
