import {planBridge,onBridge,bridgeHeight,bridgeApproach} from './transport';
import {quarryAvailable,quarryReport,digStone} from "./mining";
import {fishingGrounds,fishingBank,fishingReport,catchDockFish} from "./fishing";
import {beginWeaponWork,weaponWorkAI,raidLootAI,combatPractice} from "./warfare";
import {tickCommunities,foundingJourneyAI,lifeEvent} from "./communities";
import {beginExpedition,expeditionAI,routineRest} from "./journeys";
import {wearTrail,pathPace,fadeTrails} from "./trails";
import {tickScouts,scoutAI} from "./scouting";
import { tickVisitors, visitorAI } from "./visitors";
import { personName, citizenName, prehistoricName, predisposition } from "./people";
import { sendDelegation, delegationAI } from "./delegations";
import { establishRaiderCamps, campRaidAI } from "./raiders";
import { recordDiscoveries, hasTradition } from "./discovery";
import { receiveFood, consumeAndSpoilFood, preserveFood, growthFoodNeed, foodInventory } from "./pantry";
import {initializeCultivation,collectSamples,deliverSamples,cultivationIssue,cropStudyAI,beginCropTrial,CROPS,CROP_NAMES} from "./cultivation";
import { habitatAt, soilQuality, cropWater } from "./ecology";
import { knownSettlement, quoteShipment, shipmentIssue, proposeShipment, reportedQuote } from "./barter";
import {
  WorkBoard,
  emergencyResponse,
  calendar,
  crop,
  farmAvailable,
  farmWork,
  reserveSeconds,
  neighborIntent,
  foodDemand,
  isDependent,
} from "./settlement";
import { findPath } from "./navigation";
import {
  AGE_CHOICES,
  AGE_COST,
  AGE_STAT,
  AGES,
  BUILD_ORDER,
  BUILD_TIME,
  CORNERSTONE_R,
  SETTLEMENT_GAP,
  BUILDINGS,
  FOW,
  GATHER,
  HALF,
  LUMBER_R,
  MAP,
  QUARRY_R,
  DOCK_R,
  TEAM_COLORS,
  TEAM_NAMES,
  TEAM_SHORT,
  CITY_LEADERS,
  REGION_CLUSTERS,
  TILE,
  UNITS,
} from "./constants";
import type {
  BldType,
  Building,
  Cost,
  Critter,
  GameState,
  HudSnapshot,
  Projectile,
  Region,
  ResKind,
  ResourceNode,
  RouteOffer,
  TradeDeal,
  Tribe,
  Unit,
  UnitType,
  Weather,
  SeasonMix,
} from "./types";
import { generateWorld, inBounds, isFertile, sampleHeight, type WorldData } from "./worldgen";

const WALK = 520;
const YEAR_DAYS = 32;
const DAY_RATE = (86400 * YEAR_DAYS) / 1800;

export class Game {
  state: GameState;
  world: WorldData;
  walk: Uint8Array;
  vision = new Uint8Array(FOW * FOW);
  visAge = new Float32Array(FOW * FOW);
  territory = new Uint8Array(FOW * FOW);
  territoryStrength = new Float32Array(FOW * FOW);
  selectedResource: ResourceNode | null = null;
  private approachCache = new WeakMap<Unit,{building:Building;revision:number;time:number;spot:{x:number;z:number}|null}>();
  chopMarks = new Set<number>();
  looted = new Set<number>();
  started = false;
  awaitingStart = true;
  muted = false;
  quality: "low" | "med" | "high" = "high";
  fps = 60;
  idleCursor = 0;
  workBoard = new WorkBoard();
  tradeTeam = 1;
  onSfx: (name: string) => void = () => {};
  private navRevision = 0;
  private navBudget = 4;
  private paths = new Map<
    number,
    {
      tx: number;
      tz: number;
      revision: number;
      points: { x: number; z: number }[];
      failed: boolean;
      retry: number;
    }
  >();
  seaT = 180;
  calamityT = 180 + Math.random() * 120;

  constructor() {
    this.world = generateWorld(0xdae1);
    this.walk = new Uint8Array(WALK * WALK);
    this.state = this.blank();
    this.workBoard.reset();
  }

  blank(): GameState {
    return {
      seed: 0xdae1,
      time: 0,
      age: 0,
      tribes: [],
      units: [],
      buildings: [],
      trees: [],
      stones: [],
      forage: [],
      fish: [],
      copper: [],
      iron: [],
      projectiles: [],
      floaters: [],
      particles: [],
      selBld: null,
      paused: false,
      speed: 1,
      growthPolicy: "welcome",
      laborPolicy: "balanced",
      ended: null,
      endReason: "",
      banner: "",
      bannerT: 0,
      placing: null,
      placeIssue: null,
      nextId: 1,
      walkDirty: true,
      agePicks: [],
      pendingAge: false,
      event: "none",
      eventT: 80,
      weather: "clear",
      weatherT: 300,
      birthT: 42,
      marketT: 28,
      deals: [
        { give: "food", giveAmt: 40, get: "wood", getAmt: 28 },
        { give: "wood", giveAmt: 32, get: "food", getAmt: 26 },
        { give: "food", giveAmt: 48, get: "stone", getAmt: 16 },
        { give: "wood", giveAmt: 36, get: "stone", getAmt: 18 },
        { give: "stone", giveAmt: 16, get: "wood", getAmt: 28 },
      ],
      raidT: 70 + Math.random() * 50,
      wildlife: [],
      routes: [],
      routeOffer: null,
      routeOfferT: 70,
      routePopups: 0,
      yearOffset: 0.1,
      raidWave: 0,
      regions: [],
      richRes: "food",
      harvestDay: 1,
      yieldT: 38,
    };
  }

  id() {
    return this.state.nextId++;
  }

  private bridges: Building[] = [];

  travelHeight(x:number,z:number) {
    for(const b of this.bridges)if(this.finished(b)&&b.bridge&&onBridge(b.bridge,x,z))return bridgeHeight(this,b.bridge,x,z);
    return this.height(x,z);
  }

  height(x: number, z: number) {
    return sampleHeight(this.world.heights, x, z);
  }

  campOf(team: number) {
    return (
      this.state.buildings.find(b=>b.team===team&&b.type==="townhall"&&b.hp>0) || this.world.camps.find((c) => c.team === team) || this.world.camps[0] || { x: 0, z: 0, team }
    );
  }

  nearestDockSite(x: number, z: number, r = 12) {
    let best: { x: number; z: number } | null = null;
    let bd = r;
    for (const s of this.world.dockSites || []) {
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  reset(seed?: number, worldgenVersion = seed === undefined ? 2 : 1) {
    this.chopMarks.clear();
    const s = seed ?? (Math.random() * 0xffffffff) | 0;
    this.world = generateWorld(s,worldgenVersion);
    this.state = this.blank();
    this.workBoard.reset();
    this.paths.clear();
    this.state.seed = s;
    this.state.worldgenVersion=worldgenVersion;
    this.started = true;
    this.awaitingStart = true;
    this.state.paused = true;
    this.state.trees = this.world.trees.map((t) => ({
      ...t,
      maxAmt: t.maxAmt || t.amount,
      regenT: 0,
      rich: t.rich ?? 1,
    }));
    this.state.stones = this.world.stones.map((t) => ({
      ...t,
      maxAmt: t.maxAmt || t.amount,
      regenT: 0,
      rich: t.rich ?? 1,
    }));
    this.state.forage = this.world.forage.map((t) => ({
      ...t,
      maxAmt: t.maxAmt || t.amount,
      regenT: 0,
      rich: t.rich ?? 1,
    }));
    this.state.fish = this.world.fish.map((t) => ({
      ...t,
      maxAmt: t.maxAmt || t.amount,
      regenT: 0,
      rich: t.rich ?? 1,
    }));
    this.state.copper = this.world.copper.map((t) => ({
      ...t,
      maxAmt: t.maxAmt || t.amount,
      regenT: 0,
      rich: t.rich ?? 1,
    }));
    this.state.iron = this.world.iron.map((t) => ({
      ...t,
      maxAmt: t.maxAmt || t.amount,
      regenT: 0,
      rich: t.rich ?? 1,
    }));
    this.state.nextId =
      Math.max(
        0,
        ...[
          this.state.trees,
          this.state.stones,
          this.state.forage,
          this.state.fish,
          this.state.copper,
          this.state.iron,
        ]
          .flat()
          .map((n) => n.id),
      ) + 1;
    this.tradeTeam = 1;
    this.looted.clear();
    this.visAge.fill(0);

    const specRoll = Math.random();
    const folk = [
      ["Dunmere", "#6a4e92"],
      ["Saltborn", "#3a6e92"],
      ["Greyhaven", "#7a7568"],
      ["Mossfall", "#3f7a3a"],
      ["Redcliff", "#c4452a"],
      ["Ashfen", "#3d7a62"],
      ["Harrow", "#8a5a28"],
      ["Kest", "#2f6a6a"],
    ];
    const pickFolk = () => folk.splice((Math.random() * folk.length) | 0, 1)[0];
    this.state.tribes = TEAM_NAMES.map((name, i) => {
      const rolled = i === 1 || i === 2 ? pickFolk() : null;
      return {
      id: i,
      name: rolled ? prehistoricName(s,i*977) : name,
      short: rolled ? prehistoricName(s,i*977) : TEAM_SHORT[i],
      color: rolled ? rolled[1] : TEAM_COLORS[i],
      // Neighbor settlements are already established, with finite spring stores.
      // This is initial provisioning, never an income bonus or periodic refill.
      food: i === 0 ? 72 : i === 3 ? 0 : 300,
      wood: i === 0 ? 58 : i === 3 ? 0 : 90,
      stone: i === 0 ? 16 : i === 3 ? 0 : 10,
      copper: i === 0 ? 0 : i === 1 ? 4 : 0,
      iron: 0,
      age: 0,
      aggro: i === 3 ? 1 : i === 1 ? 0.48 : i === 2 ? 0.34 : 0,
      expand: i === 2 ? 1.05 : i === 1 ? 0.72 : 0.5,
      tech: i === 2 ? 0.7 : i === 1 ? 0.58 : 0.45,
      lastRaid: i === 0 || i === 3 ? 90 : 42,
      thinkT: 1 + i * 0.4,
      alive: true,
      hostile: i === 3,
      ally: false,
      spec: (i === 1
        ? specRoll < 0.5
          ? "stone"
          : "copper"
        : i === 2
          ? specRoll < 0.5
            ? "wood"
            : "food"
          : i === 0
            ? "food"
            : "stone") as import("./types").ResKind,
      tradeCd: 0,
      leader: TEAM_NAMES[i],
      leaderTitle: "Chieftain",
      csType: "Settled",
      tension: 0,
      tensionBand: 0,
      spears: i === 0 ? 3 : i === 3 ? 0 : 2,
      bows: i === 2 ? 2 : 0,
      blades: i === 1 ? 1 : 0,
      fallenT: 0,
      };
    });
    for (const tr of this.state.tribes) {
      if (tr.id === 0 || tr.id === 3) continue;
      const pool = CITY_LEADERS[tr.spec] || CITY_LEADERS.wood;
      const pick = pool[(Math.random() * pool.length) | 0];
      tr.leader = pick.name;
      tr.leaderTitle = pick.title;
      tr.csType = pick.csType;
    }
    this.state.yearOffset = [0.1, 0.34, 0.6][(Math.random() * 3) | 0];
    this.state.raidWave = 0;

    for (const camp of this.world.camps) {
      const h = this.height(camp.x, camp.z);
      this.state.buildings.push(this.makeBld("townhall", camp.x, camp.z, camp.team, h));
      const hutOff =
        camp.team === 1
          ? [
              [10, 5],
              [-7, -6],
              [4, 11],
            ]
          : camp.team === 2
            ? [
                [-9, 8],
                [11, -3],
                [-5, -9],
              ]
            : [
                [-8, 6],
                [8, 5],
                [-3, 10],
              ];
      const nHuts = camp.team === 0 ? 1 : 2;
      for (let i = 0; i < nHuts; i++) {
        const ox = hutOff[i][0] + (Math.random() - 0.5) * 3;
        const oz = hutOff[i][1] + (Math.random() - 0.5) * 3;
        this.state.buildings.push(
          this.makeBld(
            "hut",
            camp.x + ox,
            camp.z + oz,
            camp.team,
            this.height(camp.x + ox, camp.z + oz),
          ),
        );
      }
      if (camp.team !== 0) {
        const lx = camp.team === 1 ? 9 : -10;
        const lz = camp.team === 1 ? -7 : 6;
        this.state.buildings.push(
          this.makeBld(
            "lumber",
            camp.x + lx,
            camp.z + lz,
            camp.team,
            this.height(camp.x + lx, camp.z + lz),
          ),
        );
        const bx = camp.team === 1 ? -9 : 10;
        const bz = camp.team === 1 ? 8 : -8;
        this.state.buildings.push(
          this.makeBld(
            "barracks",
            camp.x + bx,
            camp.z + bz,
            camp.team,
            this.height(camp.x + bx, camp.z + bz),
          ),
        );
      }

      const nWork = camp.team === 0 || camp.team === 2 ? 3 : 2;
      for (let i = 0; i < nWork; i++) {
        const a = (i / nWork) * Math.PI * 2;
        const u = this.spawnUnit(
          "worker",
          camp.x + Math.cos(a) * 5,
          camp.z + Math.sin(a) * 5 - 3,
          camp.team,
        );
        u.order = "idle";
      }
      if (camp.team === 1) {
        this.spawnUnit("worker", camp.x + 6, camp.z + 2, camp.team);
        this.spawnUnit("worker", camp.x - 5, camp.z + 5, camp.team);
        this.spawnUnit("worker", camp.x + 3, camp.z - 6, camp.team);
        const cairn = this.makeBld(
          "cairn",
          camp.x + 12,
          camp.z - 6,
          camp.team,
          this.height(camp.x + 12, camp.z - 6),
        );
        cairn.build = 1;
        this.state.buildings.push(cairn);
      } else if (camp.team === 2) {
        this.spawnUnit("worker", camp.x - 5, camp.z - 3, camp.team);
        this.spawnUnit("worker", camp.x + 5, camp.z - 4, camp.team);
        this.spawnUnit("worker", camp.x - 3, camp.z + 6, camp.team);
        const grove = this.makeBld(
          "grove",
          camp.x - 11,
          camp.z + 7,
          camp.team,
          this.height(camp.x - 11, camp.z + 7),
        );
        grove.build = 1;
        this.state.buildings.push(grove);
      } else {
        this.spawnUnit("worker", camp.x + 4, camp.z - 5, camp.team);
        this.spawnUnit("worker", camp.x - 5, camp.z - 4, camp.team);
      }
      if (camp.team === 1 || camp.team === 2) {
        const chief = this.spawnUnit("leader", camp.x + 2.2, camp.z + 1.4, camp.team);
        chief.order = "hold";
      }
    }

    for (const camp of this.world.camps) {
      if (camp.team === 0) continue;
      const hx = camp.x;
      const hz = camp.z;
      const nExtra = 4;
      for (let i = 0; i < nExtra; i++) {
        const x = hx - 8 - (i % 3) * 2.4;
        const z = hz - 9 - Math.floor(i / 3) * 2.2;
        this.state.forage.push({
          id: this.id(),
          kind: "forage",
          x,
          z,
          y: this.height(x, z),
          amount: 12,
          maxAmt: 12,
          regenT: 0,
          scale: 1,
          rich: 0.85 + Math.random() * 0.4,
        });
      }
      for (let i = 0; i < nExtra; i++) {
        const x = hx + 10 + (i % 3) * 2.6;
        const z = hz - 7 - Math.floor(i / 3) * 2.4;
        this.state.trees.push({
          id: this.id(),
          kind: "tree",
          x,
          z,
          y: this.height(x, z),
          amount: 12,
          maxAmt: 12,
          regenT: 0,
          scale: 1,
          rich: 0.8 + Math.random() * 0.45,
        });
      }
    }

    this.spawnWildlife();
    this.spawnRegions();
    // Existing neighbors begin with a worked landscape and protected stores.
    // These are generated starting assets, not supplies granted during play.
    for (const camp of this.world.camps.filter(c=>[1,2].includes(c.team))) {
      for (const type of ["warehouse","warehouse","farm","farm","farm"] as BldType[]) {
        const spot=this.findOpenSpot(camp.x,camp.z,type,camp.team);
        if(spot)this.state.buildings.push(this.makeBld(type,spot.x,spot.z,camp.team));
      }
    }
    this.state.richRes = (["food", "wood", "stone"] as ResKind[])[(Math.random() * 3) | 0];
    initializeCultivation(this);
    this.rebuildWalk();
    establishRaiderCamps(this);
    this.rebuildWalk();
    // Starting landscape is assembled before people receive their final positions.
    // Extra rival structures must not spawn on top of existing residents.
    for(const u of this.state.units){
      if(!this.state.buildings.some(b=>this.solidBuilding(b)&&Math.abs(u.x-b.x)<b.w*.4+u.r&&Math.abs(u.z-b.z)<b.d*.4+u.r))continue;
      search:for(let radius=1;radius<=16;radius++)for(let i=0;i<24;i++){
        const x=u.x+Math.sin(i*Math.PI/12)*radius,z=u.z+Math.cos(i*Math.PI/12)*radius;
        if(!this.walkable(x,z)||this.state.buildings.some(b=>this.solidBuilding(b)&&Math.abs(x-b.x)<b.w*.4+u.r&&Math.abs(z-b.z)<b.d*.4+u.r))continue;
        u.x=x;u.z=z;u.y=this.height(x,z);u.tx=x;u.tz=z;break search;
      }
    }
    this.vision.fill(0);
    this.territory.fill(255);
    this.chopMarks.clear();
    const home = this.campOf(0);
    this.stampVision(home.x, home.z, 26, 1);
    this.updateVision(0);
    this.banner("C selects a gatherer · ] finds resources · R gives an order", 4.5);
  }

  enterIsland() {
    this.awaitingStart = false;
    this.state.paused = false;
    this.state.founding = false;
    this.banner("C selects a gatherer · ] finds resources · R gives an order", 4.2);
  }

  enterAsBand() {
    this.enterIsland();
    for (const b of this.state.buildings) {
      if (b.team === 0 && (b.type === "townhall" || b.type === "hut")) b.hp = 0;
    }
    this.state.walkDirty = true;
    this.state.founding = true;
    this.state.placing = "townhall";
    const home = this.campOf(0);
    for (const u of this.state.units) {
      if (u.team !== 0 || u.hp <= 0) continue;
      u.order = "move";
      u.tx = home.x + (Math.random() - 0.5) * 6;
      u.tz = home.z + (Math.random() - 0.5) * 6;
    }
    this.banner("The band is still walking. Plant the hall on berries or timber.", 5);
  }

  nearClump(x: number, z: number) {
    let trees = 0;
    let stones = 0;
    let food = 0;
    let ore = 0;
    for (const n of this.state.trees) if (n.amount > 0 && Math.hypot(n.x - x, n.z - z) < 20) trees++;
    for (const n of this.state.stones)
      if (n.amount > 0 && Math.hypot(n.x - x, n.z - z) < 18) stones++;
    for (const n of this.state.forage)
      if (n.amount > 0 && Math.hypot(n.x - x, n.z - z) < 16) food++;
    for (const n of this.state.copper)
      if (n.amount > 0 && Math.hypot(n.x - x, n.z - z) < 16) ore++;
    for (const n of this.state.iron) if (n.amount > 0 && Math.hypot(n.x - x, n.z - z) < 16) ore++;
    return trees >= 5 || stones >= 2 || food >= 3 || ore >= 2;
  }

  makeBld(type: BldType, x: number, z: number, team: number, y?: number): Building {
    const d = BUILDINGS[type];
    const hp = d.hp;
    const bridge=type==="bridge"?planBridge(this,x,z):null;
    if(bridge){x=(bridge.ax+bridge.bx)/2;z=(bridge.az+bridge.bz)/2;}
    return {
      id: this.id(),
      kind: "building",
      type,
      team,
      x,
      y: bridge?bridgeHeight(this,bridge,x,z):y ?? this.height(x, z),
      z,
      bridge: bridge || undefined,
      w: bridge?Math.abs(bridge.bx-bridge.ax)+5.2:d.w,
      d: bridge?Math.abs(bridge.bz-bridge.az)+5.2:d.d,
      hp,
      maxHp: hp,
      selected: false,
      queue: [],
      rally: null,
      cd: 0,
      build: 1,
      reclaimed: false,
    };
  }

  finished(b: Building) {
    return b.hp > 0 && b.build >= 1;
  }

  spawnUnit(type: UnitType, x: number, z: number, team: number): Unit {
    const d = UNITS[type];
    // Recruitment and initial camp layouts must never place people inside walls.
    const free = (px: number, pz: number) =>
      inBounds(px, pz, 1) &&
      this.height(px, pz) > this.world.waterY + 0.3 &&
      !this.state.buildings.some(
        (b) =>
          this.solidBuilding(b) &&
          Math.abs(px - b.x) < b.w * 0.4 + d.r + 0.8 &&
          Math.abs(pz - b.z) < b.d * 0.4 + d.r + 0.8,
      );
    if (!free(x, z)) {
      const originX = x,
        originZ = z;
      search: for (let radius = 2; radius <= 40; radius += 2) {
        for (let step = 0; step < 24; step++) {
          const a = (step * Math.PI) / 12,
            px = originX + Math.cos(a) * radius,
            pz = originZ + Math.sin(a) * radius;
          if (free(px, pz)) {
            x = px;
            z = pz;
            break search;
          }
        }
      }
    }
    const tribe = this.state.tribes[team];
    const mul = AGE_STAT[tribe?.age ?? 0];
    const u: Unit = {
      id: this.id(),
      kind: "unit",
      type,
      team,
      x,
      y: this.height(x, z),
      z,
      vx: 0,
      vz: 0,
      facing: 0,
      hp: Math.round(d.hp * mul),
      maxHp: Math.round(d.hp * mul),
      speed: d.speed,
      range: d.range,
      dmg: d.dmg * mul,
      rof: d.rof,
      cd: 0,
      r: d.r,
      selected: false,
      order: "idle",
      tx: x,
      tz: z,
      job: null,
      node: null,
      gatherT: 0,
      carry: 0,
      carryType: null,
      target: null,
      wanderT: 2,
      aggroT: 20 + Math.random() * 20,
      stride: Math.random() * Math.PI * 2,
      trade: null,
      tradeTeam: 0,
      ageT: (18 + Math.random() * 24) * 1800,
      jobLock: false,
      huntOnly: false,
      stuckT: 0,
      pillage: -1,
      stature: 0.86 + Math.random() * 0.3,
      tint: Math.random(),
      militia: false,
    };
    u.stature = predisposition(u).size;
    if (team === 1 && type !== "worker") {
      u.hp = Math.round(u.hp * 1.15);
      u.maxHp = u.hp;
      u.dmg *= 1.08;
    }
    if (team === 2) {
      if (type === "worker") u.speed *= 1.1;
      if (type === "archer") u.range += 2;
    }
    u.name=citizenName(this.state.seed,u.id,team);
    this.state.units.push(u);
    return u;
  }

  tribe(team: number) {
    return this.state.tribes[team];
  }

  popCap(team = 0) {
    let cap = 0;
    for (const b of this.state.buildings) {
      if (this.finished(b) && b.team === team) cap += BUILDINGS[b.type]?.pop || 0;
    }
    return cap;
  }

  popNow(team = 0) {
    let n = 0;
    for (const u of this.state.units) if (u.team === team && u.hp > 0 && u.type !== "leader") n++;
    return n;
  }

  queued(team = 0) {
    let n = 0;
    for (const b of this.state.buildings) {
      if (b.team === team && this.finished(b)) n += b.queue.length;
    }
    return n;
  }

  canAfford(team: number, cost: Cost) {
    const t = this.tribe(team);
    if (!t) return false;
    return (
      t.food >= (cost.food || 0) &&
      t.wood >= (cost.wood || 0) &&
      t.stone >= (cost.stone || 0) &&
      t.copper >= (cost.copper || 0) &&
      t.iron >= (cost.iron || 0)
    );
  }

  spend(team: number, cost: Cost) {
    const t = this.tribe(team);
    if (!t) return;
    t.food -= cost.food || 0;
    t.wood -= cost.wood || 0;
    t.stone -= cost.stone || 0;
    t.copper -= cost.copper || 0;
    t.iron -= cost.iron || 0;
  }

  hasBld(team: number, type: BldType) {
    return this.state.buildings.some((b) => b.team === team && b.type === type && this.finished(b));
  }

  gatherMul(team: number) {
    let m = 1;
    if (this.hasBld(team, "market")) m *= 0.88;
    if (this.state.weather === "frost") m *= 1.22;
    if (this.state.weather === "storm") m *= 1.24;
    if (this.state.weather === "rain") m *= 0.92;
    if (this.state.weather === "golden") m *= 0.9;
    if (this.state.weather === "flood") m *= 1.18;
    if (this.state.weather === "drought") m *= 1.16;
    for (const tr of this.state.tribes) {
      if (tr.ally && !tr.hostile && tr.id !== 0 && tr.id !== 3) m *= 0.94;
    }
    return m;
  }

  dmgMul(team: number, x?: number, z?: number) {
    let m = this.hasBld(team, "forge") ? 1.12 : 1;
    if (team === 0) {
      for (const p of this.state.agePicks) if (p === "army") m *= 1.08;
    }
    if (x != null && z != null) {
      const reg = this.regionAt(x, z);
      if (reg && reg.owner === team) m *= 1.16;
    }
    return m;
  }

  hpMul(team: number) {
    let m = 1;
    if (team === 0) {
      for (const p of this.state.agePicks) if (p === "army") m *= 1.1;
    }
    return m;
  }

  banner(text: string, t = 2) {
    this.state.banner = text;
    this.state.bannerT = t;
  }

  addFloater(x: number, y: number, z: number, text: string, color: string) {
    if (this.state.floaters.length > 36) this.state.floaters.splice(0, 8);
    this.state.floaters.push({ x, y, z, text, color, life: 1.4, max: 1.4 });
  }

  addBurst(x: number, y: number, z: number, color: string, n = 8) {
    if (this.state.particles.length > 160) return;
    const count = Math.min(n, 160 - this.state.particles.length);
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 4,
        life: 0.5 + Math.random() * 0.4,
        max: 0.8,
        r: 0.08 + Math.random() * 0.08,
        color,
      });
    }
  }

  private solidBuilding(b: Building) {
    return b.hp > 0 && !["farm", "quarry", "dock", "bridge", "lumber", "grove", "cairn", "cornerstone"].includes(b.type);
  }

  rebuildWalk() {
    this.navRevision++;
    this.bridges=this.state.buildings.filter(b=>b.type==="bridge"&&this.finished(b)&&b.bridge);
    const cell = (HALF * 2) / WALK;
    for (let iz = 0; iz < WALK; iz++) {
      for (let ix = 0; ix < WALK; ix++) {
        const x = -HALF + (ix + 0.5) * cell;
        const z = -HALF + (iz + 0.5) * cell;
        const h = this.travelHeight(x, z);
        let ok = h > this.world.waterY + 0.28 && inBounds(x, z, 1.5);
        if (ok) {
          const hE = this.travelHeight(x + cell, z);
          const hN = this.travelHeight(x, z + cell);
          if (Math.abs(h - hE) > 2.45 || Math.abs(h - hN) > 2.45) ok = false;
        }
        if (ok) {
          for (const b of this.state.buildings) {
            if (!this.solidBuilding(b)) continue;
            if (Math.abs(b.x - x) < b.w * 0.4 + 0.75 && Math.abs(b.z - z) < b.d * 0.4 + 0.75) {
              ok = false;
              break;
            }
          }
        }
        this.walk[iz * WALK + ix] = ok ? 1 : 0;
      }
    }
    this.state.walkDirty = false;
  }

  navigationRevision() {
    return this.navRevision;
  }

  walkable(x: number, z: number) {
    if (!inBounds(x, z, 1.2)) return false;
    if (this.travelHeight(x, z) < this.world.waterY + 0.22) return false;
    // A deck edge can share a coarse cell with water; physical deck points remain safe.
    if(this.bridges.some(b=>this.finished(b)&&b.bridge&&onBridge(b.bridge,x,z)))return true;
    const cell = (HALF * 2) / WALK;
    const ix = Math.max(0, Math.min(WALK - 1, Math.floor((x + HALF) / cell)));
    const iz = Math.max(0, Math.min(WALK - 1, Math.floor((z + HALF) / cell)));
    return this.walk[iz * WALK + ix] === 1;
  }

  canStep(u: Unit, x: number, z: number) {
    if (!inBounds(x, z, 1)) return false;
    const h = this.travelHeight(x, z);
    if (h < this.world.waterY + 0.12 || Math.abs(h - u.y) > 2.55) return false;
    for (const b of this.state.buildings) {
      if (!this.solidBuilding(b)) continue;
      const w = b.w * 0.4 + u.r,
        d = b.d * 0.4 + u.r;
      const depth = Math.min(w - Math.abs(x - b.x), d - Math.abs(z - b.z));
      if (depth <= 0) continue;
      const old = Math.min(w - Math.abs(u.x - b.x), d - Math.abs(u.z - b.z));
      if (old <= 0 || depth >= old) return false;
    }
    return true;
  }

  nearestWalk(u: Unit, x: number, z: number) {
    if (this.canStep(u, x, z)) return { x, z };
    for (const dist of [1.6, 2.8, 4.2, 6]) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const tx = x + Math.sin(a) * dist;
        const tz = z + Math.cos(a) * dist;
        if (this.canStep(u, tx, tz) && Math.abs(this.height(tx, tz) - u.y) < 2.2)
          return { x: tx, z: tz };
      }
    }
    return { x, z };
  }

  settlementIssue(type: BldType, x: number, z: number, team = 0): string | null {
    if (team !== 0 || (type !== "townhall" && type !== "cornerstone")) return null;
    const settlements = this.state.buildings.filter(
      (b) => b.team === team && b.hp > 0 && (b.type === "townhall" || b.type === "cornerstone"),
    );
    const hall = settlements.find((b) => b.type === "townhall");
    if(type==="townhall"&&hall){
      if(settlements.filter(b=>b.type==="townhall").length>=5)return "Five settlements need regional administration before further expansion";
      if(settlements.some(b=>Math.hypot(b.x-x,b.z-z)<75))return "A new settlement needs room beyond the current village";
    }
    if (type === "cornerstone") {
      if (!hall || !this.finished(hall)) return "Plant the home hall first";
      if (settlements.filter(b=>b.type==="cornerstone").length >= 2) return "The hall and two cornerstones are enough to hold";
      if (settlements.some((b) => Math.hypot(b.x - x, b.z - z) < SETTLEMENT_GAP))
        return "A cornerstone needs a distant clump, away from your other settlements";
    }
    return this.nearClump(x, z) ? null : "Plant beside a clump — berries, timber, stone, or ore";
  }

  cornerstoneAt(x: number, z: number, team: number) {
    return this.state.buildings.find(
      (b) => b.team === team && b.type === "cornerstone" && this.finished(b) &&
        Math.hypot(b.x - x, b.z - z) <= CORNERSTONE_R,
    );
  }

  placementIssue(type: BldType, x: number, z: number, _team = 0): string | null {
    const issue = this.settlementIssue(type, x, z, _team);
    if (issue) return issue;
    const d = BUILDINGS[type];
    if(type==="bridge"){
      const span=planBridge(this,x,z);
      if(!span)return "Aim at a narrow shallow river with two gentle, clear banks";
      if(_team===0&&(!this.exploredAt(span.ax,span.az)||!this.exploredAt(span.bx,span.bz)))return "Explore both banks before planning a crossing";
      if(!inBounds(span.ax,span.az,4)||!inBounds(span.bx,span.bz,4))return "A bridge needs safe banks inside the map";
      return null;
    }
    if (!inBounds(x, z, Math.max(d.w, d.d) * 0.5 + 1)) return "Too close to the shore";
    if (type !== "dock" && Math.hypot(x, z) > this.world.islandR - 10)
      return "Too close to the shore";
    const steps = 4;
    if (type !== "dock") {
      for (let iz = 0; iz <= steps; iz++) {
        for (let ix = 0; ix <= steps; ix++) {
          const px = x - d.w / 2 + (ix / steps) * d.w;
          const pz = z - d.d / 2 + (iz / steps) * d.d;
          if (this.height(px, pz) < this.world.waterY + 0.28)
            return "Can't raise that in the water";
        }
      }
    }
    if (type !== "quarry") {
      for (const n of this.state.stones) {
        if (n.amount <= 0) continue;
        if (Math.hypot(n.x - x, n.z - z) < Math.max(d.w, d.d) * 0.38 + 1.1) {
          return "Too close to a stone outcrop";
        }
      }
    }
    if (type !== "quarry" && type !== "lumber") {
      for (const n of this.state.trees) {
        if (n.amount <= 0) continue;
        if (Math.hypot(n.x - x, n.z - z) < Math.max(d.w, d.d) * 0.28 + 1.15) {
          return "Too close to the trees — clear a plot first";
        }
      }
    }
    if (type !== "quarry") {
      for (const n of this.state.forage) {
        if (n.amount <= 0) continue;
        if (Math.hypot(n.x - x, n.z - z) < 1.85) {
          return "That's a berry thicket";
        }
      }
    }
    for (const b of this.state.buildings) {
      // Physical footprints exist for every society, independently of player fog.
      if (b.hp <= 0) continue;
      if (Math.abs(b.x - x) < (b.w + d.w) * 0.42 && Math.abs(b.z - z) < (b.d + d.d) * 0.42) {
        return "Too close to another building";
      }
    }
    if (type === "quarry") {
      let on = false;
      for (const s of this.state.stones) {
        if (s.amount > 0 && Math.hypot(s.x - x, s.z - z) < 8.8) {
          on = true;
          break;
        }
      }
      if(!on&&this.height(x,z)<10)return "Place a quarry near a stone outcrop or on a mountain slope";
      const grade=Math.max(Math.abs(this.height(x+3,z)-this.height(x-3,z)),Math.abs(this.height(x,z+3)-this.height(x,z-3)))/6;
      if(grade>1)return "This cliff is too steep for miners — choose an accessible mountain slope";
    }
    if (type === "lumber") {
      let n = 0;
      for (const t of this.state.trees) {
        if (t.amount > 0 && Math.hypot(t.x - x, t.z - z) < 14) n++;
      }
      if (n < 4) return "A lumber camp needs a stand of pines";
    }
    if (type === "farm") {
      const slope=Math.max(Math.abs(this.height(x+3,z)-this.height(x-3,z)),Math.abs(this.height(x,z+3)-this.height(x,z-3)))/6;
      if(slope>0.6)return "This slope is too steep for fields; choose a gentler bank or terrace";
    }
    if (type === "dock") {
      if (this.height(x, z) < this.world.waterY - 0.12) return "The dock would sink";
      const nearSite = (this.world.dockSites || []).some((s) => Math.hypot(s.x - x, s.z - z) < 7);
      if (nearSite) return null;
      let shore = false;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const h = this.height(x + Math.cos(a) * 7, z + Math.sin(a) * 7);
        if (h < this.world.waterY + 0.38) {
          shore = true;
          break;
        }
      }
      if (!shore) return "Put the dock on the white posts by the water";
    }
    return null;
  }

  placementValid(type: BldType, x: number, z: number, team = 0) {
    return this.placementIssue(type, x, z, team) === null;
  }

  snapQuarry(x: number, z: number) {
    let best: { x: number; z: number } | null = null;
    let bd = 24 * 24;
    for (const s of this.state.stones) {
      if (s.amount <= 0) continue;
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = { x: Math.round(s.x / TILE) * TILE, z: Math.round(s.z / TILE) * TILE };
      }
    }
    return best;
  }

  recycleSelected() {
    const b = this.state.selBld;
    if (!b || b.team !== 0 || b.hp <= 0) {
      this.onSfx("invalid");
      return;
    }
    if(b.type==="bridge"&&b.bridge&&this.state.units.some(u=>u.hp>0&&onBridge(b.bridge!,u.x,u.z))){this.banner("Wait until everyone has left the bridge before reclaiming it",3);return;}
    if (b.type === "townhall") {
      this.banner("The hall cannot be pulled down", 1.5);
      this.onSfx("invalid");
      return;
    }
    const d = BUILDINGS[b.type];
    const t = this.tribe(0);
    if (d && t) {
      t.wood += Math.round((d.wood || 0) * 0.65);
      t.stone += Math.round((d.stone || 0) * 0.65);
      t.copper += Math.round((d.copper || 0) * 0.65);
      t.iron += Math.round((d.iron || 0) * 0.65);
      for (const q of b.queue) {
        const u = UNITS[q.unit];
        if (!u) continue;
        t.food += u.food;
        t.wood += u.wood;
        t.stone += u.stone;
      }
    }
    b.queue = [];
    b.hp = 0;
    this.state.walkDirty = true;
    this.state.selBld = null;
    this.addBurst(b.x, b.y + 1, b.z, "#c4b494", 12);
    this.addFloater(b.x, b.y + 2.4, b.z, "Reclaimed", "#efe4b0");
    this.banner("Reclaimed " + (d?.name || "building") + " — most timber and stone returned", 1.8);
    this.onSfx("place");
  }

  raidThreat(team = 0) {
    const t = this.tribe(team);
    if (!t) return 0.04;
    let blds = 0;
    for (const b of this.state.buildings) if (b.team === team && b.hp > 0) blds++;
    const wealth = blds * 8 + (t.food + t.wood + t.stone) / 32;
    const armed = this.state.units.filter(
      (u) => u.team === team && u.hp > 0 && u.type !== "worker" && u.type !== "leader",
    ).length;
    const cover = 10 + armed * 7;
    const ageP = 0.035 + t.age * 0.09;
    return Math.max(0.025, Math.min(0.78, ageP * (wealth / cover)));
  }

  tribeFortune(team: number) {
    const t = this.tribe(team);
    if (!t || !t.alive) return 0;
    let blds = 0;
    for (const b of this.state.buildings) if (b.team === team && b.hp > 0) blds++;
    const pop = this.popNow(team);
    return t.food / 70 + t.wood / 80 + pop / 7 + blds / 5 + t.age * 0.35;
  }

  musicMood(): "peace" | "raid" | "pillage" {
    if (
      this.state.units.some(
        (u) =>
          u.team === 0 &&
          u.hp > 0 &&
          u.order === "attack" &&
          u.target &&
          u.target.hp > 0 &&
          Math.hypot(u.x - u.target.x, u.z - u.target.z) < 24,
      )
    )
      return "pillage";
    const c = this.campOf(0);
    if (
      this.state.units.some(
        (u) =>
          u.hp > 0 &&
          this.isFoe(0, u.team) &&
          this.visibleAt(u.x, u.z) &&
          Math.hypot(u.x - c.x, u.z - c.z) < 40,
      )
    )
      return "raid";
    return "peace";
  }

  craftWeapon(kind: "spear" | "bow" | "blade", workplaceId?:number) {
    return beginWeaponWork(this,kind,0,workplaceId);
  }

  callToArms(team = 0) {
    const t = this.tribe(team);
    if (!t) return 0;
    let n = 0;
    const selected = team===0 ? this.selectedUnits() : [];
    const workers = (selected.length ? selected : this.state.units).filter(
      u => u.team===team && u.hp>0 && u.type==="worker" && !u.militia && !isDependent(this,u) &&
        u.carry===0 && !u.expedition && !u.envoy && !u.visit && !u.scout && !u.weaponWork &&
        this.state.buildings.some(b=>b.team===team && this.finished(b) && ["townhall","warehouse","barracks"].includes(b.type) && Math.hypot(u.x-b.x,u.z-b.z)<20),
    );
    for (const u of workers) {
      let kind: UnitType | null = null;
      if ((t.blades || 0) > 0) {
        t.blades--;
        kind = "swordsman";
      } else if ((t.bows || 0) > 0) {
        t.bows--;
        kind = "archer";
      } else if ((t.spears || 0) > 0) {
        t.spears--;
        kind = "spearman";
      }
      if (!kind) break;
      const d = UNITS[kind];
      u.type = kind;
      u.militia = true;
      u.range = d.range;
      u.dmg = d.dmg * AGE_STAT[t.age];
      u.rof = d.rof;
      // Equipping a weapon never heals wounds or creates a new resident.
      u.order = "hold";
      u.job = null; u.node=null; u.target=null; u.emergency=undefined;
      u.workReason="Armed civilian — ready to defend or raid";
      n++;
    }
    if (team===0 && !n) this.banner("Bring empty-handed adults near your hall, store or barracks; craft weapons first",3);
    if (team === 0 && n) this.banner(n + " villagers take up arms", 1.8);
    return n;
  }

  standDown(team = 0) {
    const t = this.tribe(team);
    if (!t) return;
    let n = 0;
    for (const u of this.state.units) {
      if (u.team !== team || !u.militia || u.hp <= 0) continue;
      if(u.carry>0 || !this.state.buildings.some(b=>b.team===team&&this.finished(b)&&["townhall","warehouse","barracks"].includes(b.type)&&Math.hypot(u.x-b.x,u.z-b.z)<20))continue;
      if (u.type === "swordsman") t.blades = (t.blades || 0) + 1;
      else if (u.type === "archer") t.bows = (t.bows || 0) + 1;
      else t.spears = (t.spears || 0) + 1;
      const d = UNITS.worker;
      u.type = "worker";
      u.militia = false;
      u.range = d.range;
      u.dmg = d.dmg;
      u.rof = d.rof;
      u.order = "idle";
      u.target = null; u.pillage=-1; u.emergency=undefined; u.node=null;
      n++;
    }
    if(team===0&&!n)this.banner("Return militia and their cargo to the village before standing down",3);
    if (team === 0 && n) this.banner(n + " return to work — weapons stay in the armory", 1.7);
  }

  findPlaceSpot(type: BldType, x: number, z: number, team = 0) {
    const sx = Math.round(x / TILE) * TILE;
    const sz = Math.round(z / TILE) * TILE;
    if (this.placementValid(type, sx, sz, team)) return { x: sx, z: sz };
    for (let ring = 1; ring <= 5; ring++) {
      const r = ring * TILE;
      for (let i = 0; i < ring * 8; i++) {
        const a = (i / (ring * 8)) * Math.PI * 2;
        const px = Math.round((sx + Math.cos(a) * r) / TILE) * TILE;
        const pz = Math.round((sz + Math.sin(a) * r) / TILE) * TILE;
        if (this.placementValid(type, px, pz, team)) return { x: px, z: pz };
      }
    }
    return null;
  }

  placeBuilding(type: BldType, x: number, z: number, team = 0) {
    if (this.state.ended) return false;
    if (team === 0 && this.state.weather === "storm") {
      this.banner("The storm holds the builders", 1.6);
      this.onSfx("invalid");
      return false;
    }
    const d = BUILDINGS[type];
    const tribe = this.tribe(team);
    if (!d || !tribe) return false;
    if(type==="farm"&&cultivationIssue(this,team)){
      if(team===0)this.banner(cultivationIssue(this,team)!,5);return false;
    }
    const same = this.state.buildings.filter((b) => b.type === type && b.hp > 0).length;
    if (same >= 56) {
      if (team === 0) this.banner("The island can't hold more of those", 1.6);
      return false;
    }
    if (tribe.age < d.age) {
      if (team === 0) this.banner("Requires " + AGES[d.age] + " Age", 1.4);
      return false;
    }
    const halls =
      type === "townhall"
        ? this.state.buildings.filter((b) => b.team === team && b.type === "townhall" && b.hp > 0)
        : [];
    const founding = type === "townhall" && team === 0 && (!!this.state.founding || halls.length === 0);
    const settlementIssue = this.settlementIssue(type, x, z, team);
    if (settlementIssue) {
      if (team === 0) {
        this.banner(settlementIssue, 1.8);
        this.onSfx("invalid");
      }
      return false;
    }
    const cost = founding ? {} : { food: d.food, wood: d.wood, stone: d.stone };
    if (!this.canAfford(team, cost)) {
      if (team === 0) {
        const need = [];
        if ((d.food || 0) > tribe.food) need.push("berries");
        if ((d.wood || 0) > tribe.wood) need.push("logs");
        if ((d.stone || 0) > tribe.stone) need.push("stone");
        if ((d.copper || 0) > tribe.copper) need.push("copper");
        if ((d.iron || 0) > tribe.iron) need.push("iron");
        this.banner("Need more " + (need.join(" and ") || "resources") + " for a " + d.name, 1.6);
        this.onSfx("invalid");
      }
      return false;
    }
    if (type === "quarry" && this.height(x,z)<10) {
      const snap = this.snapQuarry(x, z);
      if (snap) {
        x = snap.x;
        z = snap.z;
      }
    }
    const spot = this.placementValid(type, x, z, team)
      ? { x, z }
      : this.findPlaceSpot(type, x, z, team);
    if (!spot) {
      if (team === 0) {
        this.banner(this.placementIssue(type, x, z, team) || "Can't build there", 1.8);
        this.onSfx("invalid");
      }
      return false;
    }
    this.spend(team, cost);
    const b = this.makeBld(type, spot.x, spot.z, team);
    if(type==="farm")b.cropType=tribe.cultivated?.[0]||"grain";
    if (BUILD_TIME[type] > 0 || (type === "townhall" && !founding)) {
      b.build = 0;
      b.hp = Math.max(16, Math.floor(b.maxHp * 0.14));
    }
    this.state.buildings.push(b);
    if(team!==0&&b.build<1)this.assignBuilders(b);
    this.state.walkDirty = true;
    if (type === "townhall" && team === 0) {
      this.state.founding = false;
      this.state.placing = null;
    }
    this.addBurst(spot.x, b.y + 1, spot.z, "#c4b494", 10);
    if (team === 0) {
      this.addFloater(spot.x, b.y + 3, spot.z, d.name, "#efe4b0");
      this.onSfx("place");
      if (b.build < 1) this.assignBuilders(b);
    }
    return true;
  }

  assignBuilders(b: Building) {
    let n = 0;
    for (const u of this.state.units) {
      if (u.team !== b.team || u.type !== "worker" || u.hp <= 0 || isDependent(this, u)) continue;
      if (u.envoy || u.scout || u.expedition || u.foundingJourney || u.visit || u.recalled || u.order === "explore" || u.order === "build" || u.order === "hold" || u.order === "trade" || u.order === "attack" || u.carry > 0)
        continue;
      if (u.jobLock && u.order === "gather") continue;
      u.order = "build";
      if(b.type==="townhall")u.homeHall=b.id;
      u.node = b;
      u.tx = b.x;
      u.tz = b.z;
      u.target = null;
      n++;
      if (n >= 2) break;
    }
  }

  nearestUnbuilt(u: Unit) {
    let best: Building | null = null;
    let bd = 1e9;
    for (const b of this.state.buildings) {
      if (b.team !== u.team || b.hp <= 0 || b.build >= 1) continue;
      const d = Math.hypot(b.x - u.x, b.z - u.z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  buildAI(u: Unit, dt: number) {
    const b = u.node && "type" in u.node ? (u.node as Building) : this.nearestUnbuilt(u);
    if (!b || b.hp <= 0 || b.build >= 1) {
      u.order = "idle";
      u.node = null;
      return;
    }
    u.node = b;
    if (!this.buildingWorkReached(u,b)) {
      const approach=b.type==="bridge"?bridgeApproach(this,u,b):{x:b.x,z:b.z};
      if(!approach){u.node=null;u.order="idle";u.blockedTask=b.id;u.retryWorkAt=this.state.time+30;u.workReason="No reachable bridge bank — approach from dry land";return;}
      u.tx = approach.x;
      u.tz = approach.z;
      this.steer(u, dt);
      return;
    }
    u.vx = 0;
    u.vz = 0;
    u.stride += dt * 8;
    u.facing = Math.atan2(b.x - u.x, b.z - u.z);
    const need = BUILD_TIME[b.type] || 16;
    b.build = Math.min(1, b.build + dt * predisposition(u).strength / need);
    b.hp = Math.max(b.hp, Math.floor(b.maxHp * (0.14 + 0.86 * b.build)));
    if (u.team === 0 && Math.random() < 0.08) this.onSfx("hammer");
    if (b.build >= 1) {
      b.build = 1;
      b.hp = b.maxHp;
      if(b.type==="bridge"){this.state.walkDirty=true;this.workBoard.reset();}
      if (u.team === 0) {
        this.banner(
          b.type === "quarry"
            ? (this.height(b.x,b.z)>=10?"Quarry stands — two miners can excavate the mountain seam":"Quarry stands — gatherers will haul stone from the outcrop")
            : BUILDINGS[b.type].name + " stands",
          1.8,
        );
        this.onSfx("place");
        this.addFloater(b.x, b.y + 3, b.z, "Raised", "#efe4b0");
        if (b.type === "quarry") {
          let n = 0;
          for (const w of this.state.units) {
            if (w.team !== 0 || w.hp <= 0 || w.type !== "worker") continue;
            if (w.jobLock && w.job && w.job !== "stone") continue;
            if (n >= 2) break;
            w.job = "stone";
            w.jobLock = false;
            w.order = "idle";
            n++;
          }
        }
      }
      u.order = "idle";
      u.node = null;
    }
  }

  clearSelect() {
    this.selectedResource = null;
    for (const u of this.state.units) u.selected = false;
    for (const b of this.state.buildings) b.selected = false;
    this.state.selBld = null;
  }

  setLaborPriority(policy: NonNullable<GameState["laborPolicy"]>) {
    this.state.laborPolicy=policy;
    this.workBoard.reset();
    for(const u of this.state.units) {
      if(u.team!==0||u.type!=="worker"||u.hp<=0||isDependent(this,u))continue;
      u.job=null;u.jobLock=false;u.huntOnly=false;u.searchJob=undefined;u.workCheckAt=0;
      // Deliver cargo and finish diplomatic missions before starting the new focus.
      if(u.envoy||u.order==="trade"||u.emergency||u.recalled)continue;
      u.node=null;u.target=null;u.attackDestination=null;u.pillage=-1;
      u.order=u.carry>0?"return":"idle";
      if(u.order==="idle")this.workBoard.assign(this,u);
    }
  }

  cycleVillager(direction=1) {
    const people=this.state.units.filter(u=>u.team===0&&u.hp>0).sort((a,b)=>a.id-b.id);
    if(!people.length)return null;
    const current=people.findIndex(u=>u.selected);
    const index=current<0?(direction<0?people.length-1:0):(current+direction+people.length)%people.length;
    this.selectEntity(people[index]);return people[index];
  }

  selectedUnits() {
    return this.state.units.filter((u) => u.selected && u.team === 0 && u.hp > 0);
  }

  visibleAt(x: number, z: number) {
    const gx = Math.floor(((x + HALF) / MAP) * FOW),
      gz = Math.floor(((z + HALF) / MAP) * FOW);
    return gx >= 0 && gz >= 0 && gx < FOW && gz < FOW && this.vision[gz * FOW + gx] === 2;
  }

  exploredAt(x: number, z: number) {
    const gx = Math.floor(((x + HALF) / MAP) * FOW),
      gz = Math.floor(((z + HALF) / MAP) * FOW);
    return gx >= 0 && gz >= 0 && gx < FOW && gz < FOW && this.vision[gz * FOW + gx] >= 1;
  }

  selectEntity(entity: Unit | Building, additive = false) {
    if (entity.hp <= 0 || (entity.team !== 0 && !this.visibleAt(entity.x, entity.z))) return;
    if (!additive || entity.kind === "building") this.clearSelect();
    entity.selected = true;
    if (entity.kind === "building") this.state.selBld = entity;
  }

  selectAt(x: number, z: number, additive: boolean) {
    let bestU: Unit | null = null;
    let bd = 2.2;
    for (const u of this.state.units) {
      if (u.hp <= 0 || (u.team !== 0 && !this.visibleAt(u.x, u.z))) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d < bd) {
        bd = d;
        bestU = u;
      }
    }
    let bestB: Building | null = null;
    let bb = 1e9;
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || (b.team !== 0 && !this.visibleAt(b.x, b.z))) continue;
      if (Math.abs(b.x - x) < b.w * 0.55 && Math.abs(b.z - z) < b.d * 0.55) {
        const d = Math.hypot(b.x - x, b.z - z);
        if (d < bb) {
          bb = d;
          bestB = b;
        }
      }
    }
    if (bestU && (!bestB || bd < 1.6)) {
      if (!additive) this.clearSelect();
      if (bestU.team === 0) bestU.selected = true;
      else {
        this.clearSelect();
        bestU.selected = true;
      }
      return;
    }
    if (bestB) {
      if (!additive) this.clearSelect();
      bestB.selected = true;
      this.state.selBld = bestB;
      return;
    }
    if (!additive) this.clearSelect();
    const resource = this.exploredAt(x,z) ? this.resourceAt(x,z) : null;
    this.selectedResource = resource && "amount" in resource ? resource : null;
  }

  selectBox(x0: number, z0: number, x1: number, z1: number) {
    const minx = Math.min(x0, x1),
      maxx = Math.max(x0, x1);
    const minz = Math.min(z0, z1),
      maxz = Math.max(z0, z1);
    this.clearSelect();
    for (const u of this.state.units) {
      if (u.team !== 0 || u.hp <= 0) continue;
      if (u.x >= minx && u.x <= maxx && u.z >= minz && u.z <= maxz) u.selected = true;
    }
  }

  slotOffsets(units: Unit[], x: number, z: number) {
    const line =
      units.length >= 4 && units.every((u) => u.type !== "worker" && u.type !== "leader");
    if (!line) {
      const ring = Math.max(1, Math.ceil(Math.sqrt(units.length)));
      return units.map((_, i) => ({
        ox: ((i % ring) - (ring - 1) / 2) * 1.35,
        oz: (Math.floor(i / ring) - (ring - 1) / 2) * 1.35,
      }));
    }
    let cx = 0;
    let cz = 0;
    for (const u of units) {
      cx += u.x;
      cz += u.z;
    }
    cx /= units.length;
    cz /= units.length;
    const len = Math.hypot(x - cx, z - cz) || 1;
    const fx = (x - cx) / len;
    const fz = (z - cz) / len;
    const px = -fz;
    const pz = fx;
    const tight = this.state.agePicks[3] === "army";
    const gap = tight ? 1.15 : 1.7;
    const ranks = units.length > 8 ? 2 : 1;
    const cols = Math.ceil(units.length / ranks);
    return units.map((_, i) => {
      const rank = Math.floor(i / cols);
      const col = i % cols;
      const across = Math.min(cols, units.length - rank * cols);
      const mid = (across - 1) / 2;
      return {
        ox: px * (col - mid) * gap - fx * rank * (tight ? 1.3 : 1.85),
        oz: pz * (col - mid) * gap - fz * rank * (tight ? 1.3 : 1.85),
      };
    });
  }

  interruptMission(u:Unit) {
    u.envoy=undefined;u.searchJob=undefined;u.recalled=undefined;u.scout=undefined;u.visit=undefined;
    u.foundingJourney=undefined;u.drill=undefined;u.studyCrop=undefined;u.emergency=undefined;
    u.trade=null;u.tradeTeam=0;u.shelterId=undefined;
    if(u.expedition)u.expedition.returning=false;
    if(u.weaponWork)u.weaponWork.paused=true;
    this.paths.delete(u.id);u.stuckT=0;
  }

  issueMove(x: number, z: number, attackMove = false) {
    const units = this.selectedUnits();
    if (!units.length) {
      if (this.state.selBld && this.state.selBld.team === 0) {
        this.state.selBld.rally = { x, z };
      }
      return;
    }
    const slots = this.slotOffsets(units, x, z);
    units.forEach((u, i) => {
      this.interruptMission(u);
      const { ox, oz } = slots[i];
      u.tx = x + ox;
      u.tz = z + oz;
      u.pillage = -1;
      u.stationOnArrival = !attackMove;
      u.workReason = attackMove ? "Advancing toward the ordered destination" : "Moving to your destination, then waiting for orders";
      u.order = attackMove ? "attackmove" : "move";
      u.attackDestination = attackMove ? { x: u.tx, z: u.tz } : null;
      u.target = null;
      u.node = null;
    });
    this.onSfx("move");
  }

  issueAttack(target: Unit | Building) {
    if (target.hp <= 0 || (target.team !== 0 && !this.visibleAt(target.x, target.z))) return;
    for (const u of this.selectedUnits()) { this.interruptMission(u);u.attackDestination = null; u.pillage = -1; }
    const selected = this.selectedUnits();
    const anyMil = selected.some((u) => u.type !== "worker" && u.type !== "leader");
    if (target.kind === "building" && target.team !== 0 && (anyMil || !selected.length)) {
      this.issuePillage(target);
      return;
    }
    if (target.team !== 0 && (anyMil || !selected.length)) {
      if (this.marchMilitary(target.x, target.z, target, "attack")) {
        for(const u of this.commandedMilitary())u.pillage=target.team;
        this.onSfx("move");
        return;
      }
    }
    const units = selected;
    const slots = this.slotOffsets(units, target.x, target.z);
    units.forEach((u, i) => {
      const { ox, oz } = slots[i];
      u.target = target;
      u.order = "attack";
      u.tx = target.x + ox;
      u.tz = target.z + oz;
    });
    if (target.team !== 0)for(const u of units)u.pillage=target.team;
    if (units.length) this.onSfx("move");
  }

  commandedMilitary() {
    const selected = this.selectedUnits();
    return (selected.length ? selected : this.state.units).filter(
      u => u.team === 0 && u.hp > 0 && u.type !== "leader" && !isDependent(this, u) &&
        (u.type !== "worker" || selected.length > 0),
    );
  }

  marchMilitary(
    tx: number,
    tz: number,
    target: Unit | Building | null,
    order: "attack" | "attackmove",
  ) {
    const mil = this.commandedMilitary();
    if (!mil.length) return false;
    const slots = this.slotOffsets(mil, tx, tz);
    mil.forEach((u, i) => {
      this.interruptMission(u);
      const { ox, oz } = slots[i];
      u.tx = tx + ox;
      u.tz = tz + oz;
      u.order = order;
      u.attackDestination = order === "attackmove" ? { x: u.tx, z: u.tz } : null;
      u.target = order === "attackmove" ? null : target;
      u.node = null;
      u.selected = true;
    });
    return true;
  }

  connectedCamp(start: Building) {
    const team = start.team;
    const pool = this.state.buildings.filter((b) => b.team === team && b.hp > 0);
    const seen = new Set<number>([start.id]);
    const out: Building[] = [start];
    let i = 0;
    while (i < out.length) {
      const cur = out[i++];
      for (const b of pool) {
        if (seen.has(b.id)) continue;
        if (Math.hypot(b.x - cur.x, b.z - cur.z) > 20) continue;
        seen.add(b.id);
        out.push(b);
      }
    }
    return out;
  }

  nextPillage(u: Unit): Building | null {
    if (u.pillage < 0) return null;
    let best: Building | null = null;
    let bd = 1e12;
    for (const b of this.state.buildings) {
      if ((b.hp<=0 && !(b.lootTeam===u.team&&b.raidLoot&&Object.values(b.raidLoot).some(n=>(n||0)>0))) || b.team !== u.pillage || (u.team === 0 && !this.exploredAt(b.x, b.z))) continue;
      const d = (b.x - u.x) ** 2 + (b.z - u.z) ** 2;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  issuePillage(target: Building) {
    if (target.team === 0 || (target.hp<=0 && !(target.lootTeam===0&&target.raidLoot&&Object.values(target.raidLoot).some(n=>(n||0)>0))) || !this.exploredAt(target.x, target.z)) {
      this.banner("Explore a rival settlement before ordering a raid", 1.8);
      return;
    }
    const mil = this.commandedMilitary();
    if (!this.marchMilitary(target.x, target.z, target, "attackmove")) {
      this.banner("Select adults to raid", 1.8);
      this.onSfx("invalid");
      return;
    }
    for (const u of mil) u.pillage = target.team;
    const name = this.tribe(target.team)?.name || "the camp";
    this.banner(mil.length + " villagers raid " + name + " — move or stop to withdraw", 2.2);
    this.onSfx("pillage");
  }

  defendHome(team: number) {
    const hall = this.state.buildings.find(
      (b) => b.team === team && b.type === "townhall" && b.hp > 0,
    );
    if (!hall) return;
    let threat: Unit | Building | null = null;
    let bd = 28 * 28;
    for (const u of this.state.units) {
      if (u.hp <= 0 || !this.isFoe(team, u.team)) continue;
      const d = (u.x - hall.x) ** 2 + (u.z - hall.z) ** 2;
      if (d < bd) {
        bd = d;
        threat = u;
      }
    }
    if (!threat) return;
    const mil = this.state.units.filter(
      (u) => u.team === team && u.hp > 0 && u.type !== "worker" && u.type !== "leader",
    );
    for (const u of mil) {
      if (u.order === "hold" || u.pillage >= 0 || Math.hypot(u.x - hall.x, u.z - hall.z) > 36)
        continue;
      if (
        u.order === "attack" &&
        u.target &&
        u.target.hp > 0 &&
        Math.hypot(u.x - hall.x, u.z - hall.z) < 22
      )
        continue;
      if (u.pillage >= 0 && Math.hypot(u.x - hall.x, u.z - hall.z) > 36) {
        u.pillage = -1;
      }
      u.order = "attackmove";
      u.target = threat;
      u.tx = threat.x;
      u.tz = threat.z;
    }
  }

  makeHostile(team: number) {
    if (team === 3) return;
    const tr = this.tribe(team);
    if (!tr || tr.hostile || team === 0) return;
    tr.ally = false;
    tr.trust = 0;
    tr.hostile = true;
    tr.aggro = team === 1 ? 0.75 : 0.35;
    tr.lastRaid = 50;
    this.banner(tr.name + " takes up arms", 2.4);
  }

  isAlly(team: number) {
    if (team === 0) return true;
    const tr = this.tribe(team);
    return !!tr && tr.ally && !tr.hostile && team !== 3;
  }

  isFoe(a: number, b: number) {
    if (a === b) return false;
    if (a === 3 || b === 3) return true;
    if (this.isAlly(a) && this.isAlly(b)) return false;
    const ta = this.tribe(a);
    const tb = this.tribe(b);
    if (a === 0) return !!tb?.hostile;
    if (b === 0) return !!ta?.hostile;
    return false;
  }

  agreeTruce(team: number) {
    const rival = this.tribe(team);
    if (!rival || team === 0 || team === 3) return;
    rival.hostile = false;
    rival.tension = 0;
    rival.trust = Math.max(0.4, rival.trust || 0);
    rival.recoveryUntil = this.state.time + 600;
    rival.lastRaid = 600;
    for (const u of this.state.units) {
      if (u.team !== team && u.team !== 0) continue;
      if (u.emergency) u.emergency.until = this.state.time;
      if (u.type === "worker" && !u.target && u.pillage < 0) continue;
      u.target = null;
      u.pillage = -1;
      u.attackDestination = null;
      const home = this.campOf(u.team);
      u.tx = home.x;
      u.tz = home.z;
      u.order = "move";
    }
    this.state.projectiles = this.state.projectiles.filter(
      (p) =>
        !((p.team === team && p.target?.team === 0) || (p.team === 0 && p.target?.team === team)),
    );
    this.banner("Truce agreed with " + rival.name + " — forces withdraw for ten minutes", 4);
  }

  offerCompact(team: number) {
    const you = this.tribe(0);
    const n = this.tribe(team);
    if (!you || !n || team === 0 || team === 3 || !n.alive || n.hostile) return false;
    if ((n.compactUntil || 0) > this.state.time) {
      this.banner("The grazing compact with " + n.name + " still holds", 1.6);
      return false;
    }
    if ((n.trust || 0) < 0.35) {
      this.banner(n.name + " will not share the pastures yet", 1.8);
      return false;
    }
    if (you.food < 20) {
      this.banner("Need 20 food to offer grazing rights", 1.6);
      return false;
    }
    you.food -= 20;
    n.food += 12;
    n.compactUntil = this.state.time + 480;
    n.trust = Math.min(1, (n.trust || 0) + 0.06);
    n.tension = Math.max(0, n.tension - 0.15);
    n.intent = "trade";
    this.banner(n.name + " accepts grazing rights — no raid while the compact holds", 2.6);
    return true;
  }

  offerPact(team?: number) {
    const rival = team != null ? this.tribe(team) : this.pickTradeRival();
    if (!rival || rival.id === 0 || rival.id === 3 || !rival.alive) return;
    if (rival.hostile) {
      this.banner(rival.name + " will not treat while at war", 1.6);
      return;
    }
    if (rival.ally) {
      this.banner("The pact with " + rival.name + " already holds", 1.4);
      return;
    }
    const gift = { food: 36, wood: 16 };
    if (!this.canAfford(0, gift)) {
      this.banner("A pact needs a gift of berries and logs", 1.7);
      this.onSfx("invalid");
      return;
    }
    this.spend(0, gift);
    rival.ally = true;
    rival.aggro = 0;
    this.banner("Pact with " + rival.name + " — we stand together", 2.4);
    this.onSfx("age");
    const hall = this.state.buildings.find(
      (b) => b.team === 0 && b.type === "townhall" && b.hp > 0,
    );
    const theirs = this.state.buildings.find(
      (b) => b.team === rival.id && b.type === "townhall" && b.hp > 0,
    );
    if (hall && theirs) {
      const u = this.spawnUnit("spearman", theirs.x + 4, theirs.z + 3, rival.id);
      u.order = "move";
      u.tx = hall.x - 6;
      u.tz = hall.z;
    }
  }

  callAlliesTo(x: number, z: number) {
    for (const tr of this.state.tribes) {
      if (!tr.ally || tr.hostile || !tr.alive || tr.id === 0 || tr.id === 3) continue;
      const mil = this.state.units.filter(
        (u) => u.team === tr.id && u.hp > 0 && u.type !== "worker" && u.type !== "leader",
      );
      for (const u of mil.slice(0, 4)) {
        u.order = "attackmove";
        u.tx = x;
        u.tz = z;
      }
    }
  }

  spawnRaid() {
    const home = this.campOf(0);
    const age = this.tribe(0)?.age ?? 0;
    const threat = this.raidThreat(0);
    this.state.raidWave += 1;
    const roll = Math.random();
    let n: number;
    let frail: number;
    let label: string;
    if (this.state.raidWave === 1 || threat < 0.12 || roll < 0.32) {
      n = 1 + ((Math.random() * 2) | 0);
      frail = 0.62 + Math.random() * 0.12;
      label = n === 1 ? "A scout from the sea" : "A scouting party from the sea";
    } else if (roll < 0.78 || age < 2) {
      n = 2 + ((Math.random() * (2 + Math.min(age, 2))) | 0);
      frail = 0.8 + Math.random() * 0.15;
      label = "Raiders from the sea";
    } else {
      n = 4 + ((Math.random() * (2 + age)) | 0);
      frail = 0.95 + Math.random() * 0.1;
      label = "A warband from the sea";
    }
    n = Math.max(1, Math.min(8, n));
    const a = Math.atan2(home.x, home.z) + Math.PI + (Math.random() - 0.5) * 1.4;
    const d = (this.world.islandR || 140) + 4;
    const sx = Math.sin(a) * d;
    const sz = Math.cos(a) * d;
    const marks = this.state.buildings.filter(
      (b) => b.team === 0 && b.hp > 0 && b.type !== "townhall" && b.type !== "keep",
    );
    const hall = this.state.buildings.find((b) => b.team === 0 && b.type === "townhall");
    const goHall = n >= 6 && age >= 3 && Math.random() < 0.35;
    for (let i = 0; i < n; i++) {
      let type: UnitType = "spearman";
      if (age >= 1 && Math.random() < 0.28) type = "archer";
      if (n >= 5 && age >= 2 && i === 0) type = "swordsman";
      const u = this.spawnUnit(
        type,
        sx + (Math.random() - 0.5) * 6,
        sz + (Math.random() - 0.5) * 6,
        3,
      );
      u.hp = Math.max(20, Math.round(u.hp * frail));
      u.maxHp = u.hp;
      u.dmg *= frail;
      u.order = "attackmove";
      const mark = goHall ? hall : marks.length ? marks[(Math.random() * marks.length) | 0] : hall;
      u.tx = mark ? mark.x : home.x + 8;
      u.tz = mark ? mark.z : home.z + 8;
      u.aggroT = 80;
    }
    this.banner(label, 2.2);
    this.onSfx("horn");
    this.callAlliesTo(home.x, home.z);
    this.defendHome(0);
    this.state.raidT = 480 + Math.random() * 240 + (1 - threat) * 120;
  }

  tickRaiders(dt: number) {
    if (
      this.state.conflict === "quiet" ||
      this.state.time < (this.state.conflict === "dangerous" ? 600 : 1200) ||
      this.tribe(0).age < 1
    )
      return;
    const live = this.state.units.filter((u) => u.team === 3 && u.hp > 0).length;
    if (live > 0) return;
    this.state.raidT -= dt;
    if (this.state.raidT > 0) return;
    const threat = this.raidThreat(0);
    this.state.raidT = 5 + Math.random() * 7;
    if (Math.random() < threat * 0.42) this.spawnRaid();
    else this.state.raidT = 10 + Math.random() * 22;
  }

  spawnWildlife() {
    const list: Critter[] = [];
    const r = this.world.islandR || 140;
    const camps = this.world.camps;
    const kinds: {
      species: Critter["species"];
      n: number;
      hp: number;
      scale: number;
      near: number;
    }[] = [
      { species: "deer", n: 6 + ((Math.random() * 5) | 0), hp: 3, scale: 1.15, near: 0 },
      { species: "boar", n: 5 + ((Math.random() * 4) | 0), hp: 4, scale: 1.05, near: 2 },
      { species: "goat", n: 8 + ((Math.random() * 6) | 0), hp: 2, scale: 0.95, near: 1 },
      { species: "bird", n: 10 + ((Math.random() * 8) | 0), hp: 1, scale: 0.7, near: -1 },
    ];
    for (const k of kinds) {
      let placed = 0;
      let tries = 0;
      const home = k.near >= 0 ? camps[k.near] : null;
      while (placed < k.n && tries < k.n * 18) {
        tries++;
        const a = Math.random() * Math.PI * 2;
        const d = home ? 22 + Math.random() * 50 : 18 + Math.random() * (r - 22);
        const x = (home ? home.x : 0) + Math.sin(a) * d;
        const z = (home ? home.z : 0) + Math.cos(a) * d;
        const h = this.height(x, z);
        if (k.species !== "bird" && h < this.world.waterY + 0.35) continue;
        if (this.world.camps.some((c) => Math.hypot(c.x - x, c.z - z) < 12) && k.species !== "goat")
          continue;
        list.push({
          id: this.id(),
          species: k.species,
          x,
          y: k.species === "bird" ? h + 7 + Math.random() * 5 : h,
          z,
          facing: Math.random() * Math.PI * 2,
          vx: 0,
          vz: 0,
          wanderT: Math.random() * 4,
          hp: k.hp,
          maxHp: k.hp,
          fly: Math.random() * Math.PI * 2,
          scale: k.scale * (0.88 + Math.random() * 0.22),
        });
        placed++;
      }
    }
    this.state.wildlife = list;
  }

  spawnRegions() {
    const ir = this.world.islandR || 160;
    const camps = this.world.camps;
    const p = camps[0] || { x: 0, z: 38 };
    const red = camps[1] || { x: ir * 0.5, z: -ir * 0.4 };
    const ash = camps[2] || { x: -ir * 0.5, z: -ir * 0.4 };
    const rx = this.world.ridgeNx || 1;
    const rz = this.world.ridgeNz || 0;
    const high = { x: rx * ir * 0.42, z: rz * ir * 0.42 };
    const river = this.world.rivers?.[0];
    const mid = river?.pts?.[Math.floor((river.pts.length - 1) / 2)];
    const mouth = mid || { x: ir * 0.5, z: 0 };
    const coastA = Math.atan2(p.x, p.z) + Math.PI;
    const coast = { x: Math.sin(coastA) * ir * 0.58, z: Math.cos(coastA) * ir * 0.58 };
    const pine = { x: (ash.x + high.x) * 0.5, z: (ash.z + p.z) * 0.35 };
    const rad = ir * 0.3;
    const specs: {
      name: string;
      x: number;
      z: number;
      res: ResKind;
      cluster: number;
      clusterName: string;
    }[] = [
      { name: "Home Vale", x: p.x, z: p.z, res: "food", cluster: 1, clusterName: "Riverlands" },
      { name: "Redridge", x: red.x, z: red.z, res: "stone", cluster: 0, clusterName: "Highlands" },
      { name: "Ashwood", x: ash.x, z: ash.z, res: "wood", cluster: 2, clusterName: "Wildwood" },
      {
        name: "Highspire",
        x: high.x,
        z: high.z,
        res: "stone",
        cluster: 0,
        clusterName: "Highlands",
      },
      {
        name: "Rivermouth",
        x: mouth.x,
        z: mouth.z,
        res: "food",
        cluster: 1,
        clusterName: "Riverlands",
      },
      {
        name: "Copper Coast",
        x: coast.x,
        z: coast.z,
        res: "copper",
        cluster: 2,
        clusterName: "Wildwood",
      },
      { name: "Pinehold", x: pine.x, z: pine.z, res: "wood", cluster: 2, clusterName: "Wildwood" },
    ];
    this.state.regions = specs.map((n) => ({
      id: this.id(),
      name: n.name,
      x: n.x,
      z: n.z,
      r: rad,
      res: n.res,
      owner: -1,
      cluster: n.cluster,
      clusterName: n.clusterName,
    }));
    this.tickRegions();
  }

  regionAt(x: number, z: number): Region | null {
    let best: Region | null = null;
    let bd = 1e12;
    for (const r of this.state.regions) {
      const d = (r.x - x) ** 2 + (r.z - z) ** 2;
      if (d < r.r * r.r && d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  tickRegions() {
    for (const r of this.state.regions) {
      const counts = [0, 0, 0];
      for (const b of this.state.buildings) {
        if (b.hp <= 0 || b.team > 2) continue;
        if (Math.hypot(b.x - r.x, b.z - r.z) < r.r) counts[b.team] += 1;
      }
      for (const u of this.state.units) {
        if (u.hp <= 0 || u.team > 2) continue;
        if (Math.hypot(u.x - r.x, u.z - r.z) < r.r) counts[u.team] += 0.35;
      }
      let owner = -1;
      let best = 0;
      for (let t = 0; t < 3; t++) {
        if (counts[t] > best) {
          best = counts[t];
          owner = t;
        } else if (counts[t] === best && counts[t] > 0) owner = -1;
      }
      if (best === 0) owner = -1;
      r.owner = owner;
    }
  }

  clusterHeld(cluster: number, team = 0) {
    const parts = this.state.regions.filter((r) => r.cluster === cluster);
    return parts.length > 0 && parts.every((r) => r.owner === team);
  }

  tickYields(dt: number) {
    this.state.yieldT -= dt;
    if (this.state.yieldT > 0) return;
    this.state.yieldT = 48 + Math.random() * 28;
    const reroll = (list: import("./types").ResourceNode[]) => {
      for (const n of list) {
        if (n.amount <= 0) continue;
        const roll = Math.random();
        n.rich = roll < 0.34 ? 0.52 : roll < 0.78 ? 1 : 1.48;
      }
    };
    reroll(this.state.trees);
    reroll(this.state.forage);
    reroll(this.state.fish);
  }

  influenceAt(x: number, z: number, team: number) {
    let v = 0;
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || b.team !== team || b.build < 1) continue;
      let str = 10;
      if (b.type === "townhall") str = 36;
      else if (b.type === "cairn" || b.type === "grove") str = 24;
      else if (b.type === "keep" || b.type === "watchtower") str = 16;
      const d = Math.hypot(b.x - x, b.z - z);
      v += str / (1 + d / 16);
    }
    if (team === 1) {
      for (const n of this.state.stones) {
        if (n.amount <= 0) continue;
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < 28) v += 2.4 / (1 + d / 10);
      }
    }
    if (team === 2) {
      for (const n of this.state.forage) {
        if (n.amount <= 0) continue;
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < 22) v += 1.8 / (1 + d / 9);
      }
      for (const n of this.state.trees) {
        if (n.amount <= 0) continue;
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < 18) v += 0.9 / (1 + d / 8);
      }
    }
    return v;
  }

  tickInfluence(dt: number) {
    const hall0 = this.state.buildings.find(
      (b) => b.team === 0 && b.type === "townhall" && b.hp > 0,
    );
    if (!hall0) return;
    for (const tr of this.state.tribes) {
      if (tr.id === 0 || tr.id === 3 || !tr.alive) continue;
      const hall = this.state.buildings.find(
        (b) => b.team === tr.id && b.type === "townhall" && b.hp > 0,
      );
      if (!hall) {
        tr.tension = Math.max(0, tr.tension - 0.08 * dt);
        continue;
      }
      const samples = [
        { x: hall0.x, z: hall0.z },
        { x: hall.x, z: hall.z },
        { x: (hall0.x + hall.x) / 2, z: (hall0.z + hall.z) / 2 },
      ];
      let overlap = 0;
      for (const s of samples) {
        overlap += Math.min(this.influenceAt(s.x, s.z, 0), this.influenceAt(s.x, s.z, tr.id));
      }
      const dist = Math.hypot(hall.x - hall0.x, hall.z - hall0.z);
      const space = Math.max(0, (dist - 70) / 140);
      tr.tension += overlap * 0.00115 * dt;
      const trespassers = this.state.units.filter(u => u.team === 0 && u.hp > 0 && u.order === "gather" && u.node &&
        !("type" in u.node && u.node.team === 0) && Math.hypot(u.node.x-hall.x,u.node.z-hall.z)<45 &&
        !tr.ally && !((tr.compactUntil || 0)>this.state.time && u.job === "food"));
      const previous = tr.tension;
      if (trespassers.length) {
        tr.tension += (0.025 + Math.min(0.05,trespassers.length*0.012)) * dt;
        tr.trust = Math.max(0,(tr.trust || 0)-0.008*dt);
        if (previous < 0.28 && tr.tension >= 0.28) this.banner(tr.name + " warns your gatherers to leave their resources alone",5);
        if (tr.tension >= 0.75 && !tr.hostile) {
          tr.hostile = true;
          this.banner(tr.name + " is defending its land against your continued taking of resources. Withdraw and seek a truce.",6);
        }
      } else tr.tension -= (0.032 + space * 0.055) * dt;
      tr.tension = Math.max(0, Math.min(1, tr.tension));
      const band = tr.tension > 0.72 ? 3 : tr.tension > 0.52 ? 2 : tr.tension > 0.28 ? 1 : 0;
      if (band > tr.tensionBand && this.started && band >= 3) {
        this.banner(tr.name + " is taut — a raid is likely if you stay this close", 2.4);
      }
      tr.tensionBand = band;
    }
  }

  tickHarvest() {
    const day = this.clockState().day;
    if (day === this.state.harvestDay) return;
    this.state.harvestDay = day;
    this.tickRegions();
    // Territory improves work on local deposits; it does not generate daily stock.

  }

  tickWildlife(dt: number) {
    for (const c of this.state.wildlife) {
      if (c.hp <= 0) {
        c.wanderT -= dt;
        if (c.wanderT <= 0) {
          c.wanderT = 60;
          // Recovery represents recruitment into a surviving local herd, not instant respawning.
          if (calendar(this).phase > 1) continue;
          const herd = this.state.wildlife.find(other =>
            other !== c && other.species === c.species && other.hp > 0 &&
            Math.hypot(other.x - c.x, other.z - c.z) < 120);
          if (!herd) continue;
          for (let attempt = 0; attempt < 24; attempt++) {
            const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 14;
            const x = herd.x + Math.cos(a) * d, z = herd.z + Math.sin(a) * d;
            const y = this.height(x, z);
            if (y <= this.world.waterY + 0.35 ||
                Math.hypot(x, z) >= (this.world.islandR || 140) - 6 || this.visibleAt(x, z)) continue;
            c.hp = c.maxHp;
            c.x = x; c.z = z; c.y = y + (c.species === "bird" ? 8 : 0);
            c.vx = 0; c.vz = 0;
            break;
          }
        }
        continue;
      }
      c.wanderT -= dt;
      if (c.species === "bird") {
        c.fly += dt * 0.7;
        const homeA = c.fly;
        const rad = 10 + (c.id % 5) * 2;
        const cx = Math.sin(c.id) * 30;
        const cz = Math.cos(c.id * 1.3) * 30;
        c.x = cx + Math.sin(homeA) * rad;
        c.z = cz + Math.cos(homeA * 0.85) * rad;
        c.y = this.height(c.x, c.z) + 7 + Math.sin(homeA * 2) * 1.4;
        c.facing = homeA + Math.PI / 2;
        continue;
      }
      let near = false;
      for (const u of this.state.units) {
        if (u.hp <= 0) continue;
        if (Math.hypot(u.x - c.x, u.z - c.z) < 7) {
          near = true;
          const a = Math.atan2(c.x - u.x, c.z - u.z);
          c.vx += Math.sin(a) * 8 * dt;
          c.vz += Math.cos(a) * 8 * dt;
          break;
        }
      }
      if (c.wanderT <= 0 && !near) {
        c.wanderT = 2.5 + Math.random() * 5;
        const a = Math.random() * Math.PI * 2;
        const spd = c.species === "deer" ? 3.4 : c.species === "boar" ? 2.4 : 2.1;
        c.vx = Math.sin(a) * spd;
        c.vz = Math.cos(a) * spd;
        c.facing = a;
      }
      c.vx *= 1 - dt * 0.6;
      c.vz *= 1 - dt * 0.6;
      // Fear accelerates an animal, but must not accumulate unbounded speed.
      // Primitive hunters can approach within spear reach; deer remain fastest.
      const fleeSpeed = c.species === "deer" ? 4 : c.species === "boar" ? 2.8 : 2.5;
      const velocity = Math.hypot(c.vx,c.vz);
      if (velocity > fleeSpeed) {c.vx *= fleeSpeed/velocity;c.vz *= fleeSpeed/velocity;}
      const nx = c.x + c.vx * dt;
      const nz = c.z + c.vz * dt;
      const h = this.height(nx, nz);
      if (h > this.world.waterY + 0.2 && Math.hypot(nx, nz) < (this.world.islandR || 140) - 6) {
        c.x = nx;
        c.z = nz;
        c.y = h;
      } else {
        c.vx *= -0.4;
        c.vz *= -0.4;
        c.wanderT = 0.4;
      }
      if (Math.hypot(c.vx, c.vz) > 0.15) c.facing = Math.atan2(c.vx, c.vz);
    }
  }

  tickRoutes(dt: number) {
    for (const r of this.state.routes) {
      if (r.paused) {
        r.status = "Departures paused; existing cargo continues home";
        continue;
      }
      const tr = this.tribe(r.team);
      if (!tr || !tr.alive || tr.hostile) {
        r.status = "Suspended by conflict";
        continue;
      }
      const active = this.state.units.find((u) => u.id === r.workerId && u.hp > 0);
      if (active && (active.order === "trade" || active.carry > 0)) {
        r.status = active.order === "trade" ? "Outbound caravan" : "Cargo returning";
        continue;
      }
      r.workerId = undefined;
      r.t -= dt;
      if (r.t > 0) {
        r.status = "Preparing next caravan";
        continue;
      }
      const cost = { [r.give]: r.giveAmt } as Cost;
      if (!this.canAfford(0, cost)) {
        r.status = "Waiting for available goods";
        continue;
      }
      if (r.give === "food" && this.tribe(0).food - r.giveAmt < foodDemand(this) * 180) {
        r.status = "Keeping emergency food reserves";
        continue;
      }
      const worker = this.state.units.find(
        (u) =>
          u.team === 0 &&
          u.type === "worker" &&
          u.hp > 0 &&
          !isDependent(this, u) &&
          !u.emergency &&
          !u.jobLock &&
          u.carry === 0 &&
          (u.order === "idle" || u.order === "gather"),
      );
      if (!worker) {
        r.status = "Waiting for an available adult";
        continue;
      }
      if (this.dispatchTrade(worker, r, tr.id)) {
        r.workerId = worker.id;
        r.t = r.interval * (this.state.agePicks[2] === "econ" ? 0.72 : 1);
        r.status = "Outbound caravan";
      }
    }
    if (this.state.routeOffer) return;
    if (this.state.pendingAge || this.state.ended) return;
    if (this.state.routePopups >= 2) {
      this.state.routeOfferT = 180;
      return;
    }
    this.state.routeOfferT -= dt;
    if (this.state.routeOfferT > 0) return;
    if (this.state.time < 180) {
      this.state.routeOfferT = 20;
      return;
    }
    const taken = new Set(this.state.routes.map((r) => r.team));
    const rivals = this.state.tribes.filter(
      (t) =>
        t.id !== 0 &&
        t.id !== 3 &&
        t.alive &&
        !t.hostile &&
        !taken.has(t.id) &&
        knownSettlement(this, t.id) &&
        ((t.trust || 0) >= 0.3 || this.tribe(0).age >= 1),
    );
    if (!rivals.length) {
      this.state.routeOfferT = 40;
      return;
    }
    const rival = rivals[(Math.random() * rivals.length) | 0];
    const spec = rival.spec || "wood";
    const give: ResKind = spec === "food" ? "wood" : "food";
    const get: ResKind =
      spec === "copper" ? "copper" : spec === "stone" ? "stone" : spec === "wood" ? "wood" : "food";
    const giveAmt = give === "food" ? 28 : 22;
    let getAmt = get === "copper" ? 6 : get === "stone" ? 12 : 18;
    if (rival.ally) getAmt = Math.round(getAmt * 1.15);
    if (this.state.agePicks[2] === "econ") getAmt = Math.round(getAmt * 1.12);
    const weights = this.state.agePicks[2] === "econ";
    this.state.routeOffer = {
      team: rival.id,
      rival: rival.name,
      color: rival.color,
      give,
      giveAmt,
      get: get === give ? "wood" : get,
      getAmt: get === give ? (weights ? 18 : 16) : getAmt,
      interval: weights ? 30 : 42,
    };
    this.state.routePopups += 1;
    this.onSfx("click");
  }

  acceptRoute() {
    const o = this.state.routeOffer;
    if (!o) return;
    if (this.state.routes.some((r) => r.team === o.team)) {
      this.banner("A route with " + o.rival + " already runs", 1.5);
      this.state.routeOffer = null;
      this.state.routeOfferT = 50;
      return;
    }
    this.state.routes.push({
      id: this.id(),
      team: o.team,
      rival: o.rival,
      give: o.give,
      giveAmt: o.giveAmt,
      get: o.get,
      getAmt: o.getAmt,
      interval: o.interval,
      t: 8,
    });
    this.state.routeOffer = null;
    this.state.routeOfferT = 90 + Math.random() * 40;
    this.onSfx("age");
  }

  declineRoute() {
    const o = this.state.routeOffer;
    this.state.routeOffer = null;
    this.state.routeOfferT = 35 + Math.random() * 20;
    if (o) this.banner(o.rival + " will ask again later", 1.5);
  }

  isArmed(ent: Unit | Building) {
    return (
      ent.kind === "building" ||
      (ent.kind === "unit" && ent.type !== "worker" && ent.order !== "trade")
    );
  }

  assignJob(job: ResKind | "hold" | "hunt" | "drill") {
    const units = this.selectedUnits().filter((u) => u.type === "worker");
    if (!units.length) {
      this.banner("Select gatherers first", 1.4);
      return;
    }
    if (job === "hold") {
      for (const u of units) {
        this.interruptMission(u);
        u.order = "hold";
        u.job = null;
        u.jobLock = false;
        u.huntOnly = false;
        u.drill = undefined;
        u.node = null;
        u.target = null;
        u.trade = null;
      }
      this.onSfx("click");
      return;
    }
    if (job === "drill") {
      if (this.tribe(0).age < 1) {
        this.banner("Villagers hunt and defend together. Dedicated soldiers require the Bronze Age.", 3);
        return;
      }
      if (reserveSeconds(this, 0) < 420) {
        this.banner("Drill waits on a food surplus. Eat first, then train.", 2);
        this.onSfx("invalid");
        return;
      }
      for (const u of units) {
        if (isDependent(this, u)) continue;
        u.drill = 0;
        u.job = null;
        u.jobLock = true;
        u.huntOnly = false;
        u.node = null;
        u.target = null;
        u.order = "hold";
        u.workReason = "Drilling";
      }
      this.onSfx("click");
      return;
    }
    if (job === "copper" && (this.tribe(0)?.age ?? 0) < 1) {
      this.banner("Copper waits on the Bronze Age", 1.7);
      this.onSfx("invalid");
      return;
    }
    if (job === "iron" && (this.tribe(0)?.age ?? 0) < 2) {
      this.banner("Iron waits on the Iron Age", 1.7);
      this.onSfx("invalid");
      return;
    }
    this.workBoard.reset();
    const huntOnly = job === "hunt";
    const real: ResKind = huntOnly ? "food" : job;
    for (const u of units) {
      u.searchJob=undefined;u.envoy=undefined;
      u.job = real;
      u.jobLock = true;
      u.huntOnly = huntOnly;
      u.trade = null;
      u.target = null;
      u.node = null;
      u.order = "idle";
      u.workCheckAt = 0;
      if (u.emergency) u.emergency.resume = undefined;

    }
    for (const u of units) this.workBoard.assign(this, u);
    this.onSfx("move");
  }

  resourceAt(x: number, z: number): ResourceNode | Building | null {
    let best: ResourceNode | Building | null = null;
    let bd = 5.2;
    const consider = (n: ResourceNode | Building, nx: number, nz: number, reach: number) => {
      if (!this.exploredAt(nx, nz)) return;
      const d = Math.hypot(nx - x, nz - z);
      if (d < reach && d < bd) {
        bd = d;
        best = n;
      }
    };
    for (const n of this.state.forage) if (n.amount > 0) consider(n, n.x, n.z, 3.6);
    for (const n of this.state.fish) if (n.amount > 0) consider(n, n.x, n.z, 3.4);
    for (const n of this.state.trees) if (n.amount > 0) consider(n, n.x, n.z, 4.8);
    for (const n of this.state.stones) if (n.amount > 0) consider(n, n.x, n.z, 4.4);
    for (const n of this.state.copper) if (n.amount > 0) consider(n, n.x, n.z, 4);
    for (const n of this.state.iron) if (n.amount > 0) consider(n, n.x, n.z, 4);
    for (const b of this.state.buildings) {
      if (b.hp > 0 && b.team === 0 && b.type === "farm" && this.finished(b))
        consider(b, b.x, b.z, Math.max(b.w, b.d) * 0.55);
    }
    return best;
  }

  issueGather(node: ResourceNode | Building) {
    if (!this.exploredAt(node.x, node.z)) return;
    let workers = this.selectedUnits().filter((u) => u.type === "worker");
    if (!workers.length) workers = this.idleWorkers().slice(0, 4);
    if (!workers.length) {
      this.banner("Need gatherers — tap Gatherer, then click the tree, bush, or stone", 2);
      this.onSfx("invalid");
      return;
    }
    const job = this.resKind(node);
    if (!job) {
      this.issueMove(node.x, node.z);
      return;
    }
    if (job === "copper" && (this.tribe(0)?.age ?? 0) < 1) {
      this.banner("Orange copper — it opens in the Bronze Age, then people can haul it", 2.2);
      this.onSfx("invalid");
      return;
    }
    if (job === "iron" && (this.tribe(0)?.age ?? 0) < 2) {
      this.banner("Dark iron — the Iron Age, then haul the dark rock. A forge turns it to blades", 2.4);
      this.onSfx("invalid");
      return;
    }
    let slots = Math.max(0, 2 - this.state.units.filter(u => !workers.includes(u) && u.hp > 0 && u.node === node && u.order === "gather").length);
    this.workBoard.reset();
    for (const u of workers) {
      u.selected = true; u.job = job; u.jobLock = true; u.huntOnly = false;
      u.target = null; u.trade = null; u.node = null; u.order = "idle"; u.workCheckAt = 0;
      if (u.emergency) u.emergency.resume = undefined;
    }
    for (const u of workers) {
      if (slots > 0) {
        slots--; u.node = node; u.order = "gather"; u.tx = node.x; u.tz = node.z;
      }
    }
    this.workBoard.reset();
    for (const u of workers) if (!u.node) this.workBoard.assign(this, u);

    this.onSfx("move");
  }

  issueExplore() {
    let units = this.selectedUnits();
    if (!units.length) units = this.idleWorkers().slice(0, 2);
    units = units.filter(u => !isDependent(this, u) && !u.emergency && u.carry === 0 && u.order !== "trade");
    if (!units.length) {
      this.banner("Select available adults with empty hands, then Explore (X)", 1.6);
      return;
    }
    let sent = 0;
    for (const u of units) {
      const t = this.findExploreTarget(u);
      if (!t || !beginExpedition(this,u)) continue;
      this.interruptMission(u);
      u.order = "explore";
      u.pillage = -1;
      u.attackDestination = null;
      u.stuckT = 0;
      u.workReason = "Exploring until you give another order";
      u.tx = t.x;
      u.tz = t.z;
      u.target = null;
      u.node = null;
      u.trade = null;
      u.wanderT = 0;
      u.gatherT = 0;
      sent++;
    }
    if (sent) {
      this.banner("Scouting the island", 1.6);
      this.onSfx("move");
    } else this.banner("No unknown ground found, or not enough food to pack a safe journey", 2.4);
  }

  findExploreTarget(u: Unit): { x: number; z: number } | null {
    const n = FOW;
    const cell = MAP / n;
    let best: { x: number; z: number } | null = null;
    let bd = 1e12;
    const step = 2;
    for (let iz = 1; iz < n - 1; iz += step) {
      for (let ix = 1; ix < n - 1; ix += step) {
        if (this.vision[iz * n + ix] !== 0) continue;
        const wx = -HALF + (ix + 0.5) * cell;
        const wz = -HALF + (iz + 0.5) * cell;
        if (!this.walkable(wx, wz)) continue;
        if(!this.workBoard.connected(this,u.x,u.z,wx,wz))continue;
        if (Math.hypot(wx, wz) > this.world.islandR - 8) continue;
        const d = Math.hypot(wx - u.x, wz - u.z);
        if (d < 12) continue;
        const score = d + Math.random() * 8;
        if (score < bd) {
          bd = score;
          best = { x: wx, z: wz };
        }
      }
    }
    return best;
  }

  lootMegaliths(u: Unit) {
    if (u.team !== 0 || u.type !== "worker") return;
    for (let i = 0; i < this.world.megaliths.length; i++) {
      if (this.looted.has(i)) continue;
      const m = this.world.megaliths[i];
      if (Math.hypot(u.x - m.x, u.z - m.z) > 5.2) continue;
      this.looted.add(i); // Historical field name: now records investigation, not treasure.
      this.banner("Investigated standing stones — a landmark for your exploration chronicle", 3);
    }
  }

  exploreAI(u: Unit, dt: number) {
    if(u.searchJob) {
      this.workBoard.assign(this,u);
      if(u.order!=="explore")return;
    }

    this.lootMegaliths(u);
    if (u.stuckT > 8) {
      const next=this.findExploreTarget(u);
      if(next&&this.workBoard.connected(this,u.x,u.z,next.x,next.z)){u.tx=next.x;u.tz=next.z;u.stuckT=0;this.paths.delete(u.id);return;}
      u.order = "return";
      u.workReason = "Scouting route blocked — returning toward the village";
      this.banner(u.workReason, 3);
      return;
    }
    if (this.steer(u, dt)) {
      const next = this.findExploreTarget(u);
      if (next) {
        u.tx = next.x;
        u.tz = next.z;
      } else {
        u.order = "hold";
        u.workReason = "No unknown ground found — awaiting orders";
        u.gatherT = 0;
      }
    }
  }

  soundRecall() {
    const home=this.campOf(0);
    for(const u of this.state.units) {
      if(u.team!==0||u.hp<=0)continue;
      u.recalled=true;u.envoy=undefined;u.searchJob=undefined;u.target=null;u.node=null;u.trade=null;u.pillage=-1;u.attackDestination=null;
      u.jobLock=false;u.huntOnly=false;u.drill=undefined;
      if(u.emergency)u.emergency.resume=undefined;
      u.tx=home.x+Math.sin(u.id)*7;u.tz=home.z+Math.cos(u.id)*7;
      u.order="move";u.stationOnArrival=true;u.workReason="Recall horn — returning to the village";
    }
    this.banner("Recall horn sounded — everyone returns with what they carry",4);this.onSfx("pillage");
  }

  raidRival() {
    const rival = this.pickRaidRival();
    if (!rival) {
      this.banner("Explore to find a rival settlement", 1.4);
      return;
    }
    const hall = this.state.buildings.find(
      (b) => b.team === rival.id && b.type === "townhall" && b.hp > 0,
    );
    if (!hall) return;
    this.issuePillage(hall);
  }

  pickRaidRival(): Tribe | null {
    const selU = this.state.units.find((u) => u.selected && u.team !== 0 && u.hp > 0);
    if (selU) {
      const tr = this.tribe(selU.team);
      if (tr?.alive) return tr;
    }
    const selB = this.state.selBld;
    if (selB && selB.team !== 0 && selB.hp > 0) {
      const tr = this.tribe(selB.team);
      if (tr?.alive) return tr;
    }
    const mil = this.selectedUnits().filter((u) => u.type !== "worker");
    const ox = mil.length ? mil.reduce((s, u) => s + u.x, 0) / mil.length : this.campOf(0).x;
    const oz = mil.length ? mil.reduce((s, u) => s + u.z, 0) / mil.length : this.campOf(0).z;
    let best: Tribe | null = null;
    let bd = 1e12;
    for (const tr of this.state.tribes) {
      if (tr.id === 0 || tr.id === 3 || !tr.alive) continue;
      const hall = this.state.buildings.find(
        (b) => b.team === tr.id && b.type === "townhall" && b.hp > 0,
      );
      if (!hall || !this.exploredAt(hall.x, hall.z)) continue;
      const d = (hall.x - ox) ** 2 + (hall.z - oz) ** 2;
      if (d < bd) {
        bd = d;
        best = tr;
      }
    }
    return best;
  }

  pickTradeRival(): Tribe | null {
    const focused = this.tribe(this.tradeTeam);
    if (focused && focused.id !== 0 && focused.id !== 3 && focused.alive && !focused.hostile && knownSettlement(this,focused.id))
      return focused;
    const selU = this.state.units.find((u) => u.selected && u.team !== 0 && u.hp > 0);
    if (selU) {
      const tr = this.tribe(selU.team);
      if (tr?.alive && !tr.hostile && knownSettlement(this,tr.id)) {
        this.tradeTeam = tr.id;
        return tr;
      }
    }
    const next =
      this.state.tribes.find((t) => t.id !== 0 && t.id !== 3 && t.alive && !t.hostile && knownSettlement(this,t.id)) ||
      this.state.tribes.find((t) => t.id !== 0 && t.id !== 3 && t.alive && knownSettlement(this,t.id)) ||
      null;
    if (next) this.tradeTeam = next.id;
    return next;
  }

  cycleTrade() {
    const rivals = this.state.tribes.filter((t) => t.id !== 0 && t.id !== 3 && t.alive && knownSettlement(this,t.id));
    if (!rivals.length) {
      this.banner("No one left to trade with", 1.4);
      return;
    }
    const i = rivals.findIndex((t) => t.id === this.tradeTeam);
    const next = rivals[(i + 1 + rivals.length) % rivals.length];
    this.tradeTeam = next.id;
    this.banner(
      next.hostile ? next.name + " is at war — trade closed" : "Trading with " + next.name,
      1.6,
    );
    this.onSfx("click");
  }

  setTradeTeam(id: number) {
    const tr = this.tribe(id);
    if (!tr || tr.id === 0) return;
    this.tradeTeam = id;
    this.banner(tr.hostile ? tr.name + " is at war" : "Trading with " + tr.name, 1.4);
  }

  tryTrade(deal: TradeDeal) {
    const rival = this.pickTradeRival();
    if (!rival) {
      this.banner("No one left to trade with", 1.4);
      return;
    }
    if (rival.hostile) {
      this.banner(rival.name + " will not trade while at war", 1.8);
      this.onSfx("invalid");
      return;
    }
    if (rival.tradeCd > 0) {
      this.banner("Traders are still on the path", 1.4);
      return;
    }
    const cost: Cost = { [deal.give]: deal.giveAmt };
    if (!this.canAfford(0, cost)) {
      this.banner("Not enough to trade", 1.4);
      this.onSfx("invalid");
      return;
    }
    const hall = this.state.buildings.find(
      (b) => b.team === rival.id && b.type === "townhall" && b.hp > 0,
    );
    if (!hall) return;
    let worker =
      this.selectedUnits().find(
        (u) =>
          u.type === "worker" &&
          !isDependent(this, u) &&
          !u.emergency &&
          u.carry === 0 &&
          u.order !== "trade",
      ) ||
      this.state.units.find(
        (u) =>
          u.team === 0 &&
          u.type === "worker" &&
          !isDependent(this, u) &&
          !u.emergency &&
          u.carry === 0 &&
          u.hp > 0 &&
          (u.order === "idle" || u.order === "hold" || u.order === "gather"),
      );
    if (!worker) {
      this.banner("Need a gatherer to carry the goods", 1.6);
      return;
    }
    if (this.dispatchTrade(worker, deal, rival.id)) {
      worker.selected = true;
      this.banner("A trader carries goods to " + rival.name, 1.8);
      this.onSfx("trade");
    }
  }

  dispatchTrade(worker: Unit, deal: TradeDeal, team: number) {
    const rival = this.tribe(team),
      hall = this.state.buildings.find((b) => b.team === team && b.type === "townhall" && b.hp > 0);
    if (
      !rival ||
      rival.hostile ||
      !hall ||
      worker.carry > 0 ||
      isDependent(this, worker) ||
      !this.canAfford(0, { [deal.give]: deal.giveAmt })
    )
      return false;
    this.spend(0, { [deal.give]: deal.giveAmt });
    rival.tradeCd = 32;
    worker.customOffer=undefined;
    worker.trade = { ...deal };
    worker.tradeTeam = team;
    worker.order = "trade";
    worker.carry = deal.giveAmt;
    worker.carryType = deal.give;
    worker.carryFood = deal.give==="food"?"provisions":undefined;
    worker.tx = hall.x;
    worker.tz = hall.z;
    worker.node = null;
    worker.target = null;
    worker.workReason = "Carrying goods to " + rival.name;
    return true;
  }

  haltSelected() {
    const units = this.selectedUnits();
    if (!units.length) return;
    for (const u of units) {
      this.interruptMission(u);
      u.order = u.type === "worker" ? "hold" : "idle";
      u.attackDestination = null;
      u.target = null;
      u.node = null;
      u.trade = null;
      u.pillage = -1;
    }
    this.onSfx("click");
  }

  idleWorkers() {
    return this.state.units.filter(
      (u) =>
        u.team === 0 &&
        u.hp > 0 &&
        u.type === "worker" &&
        !isDependent(this, u) &&
        (u.order === "hold" || u.order === "idle"),
    );
  }

  focusIdleWorker() {
    const idle = this.idleWorkers();
    if (!idle.length) {
      this.banner("Everyone is already working.", 1.6);
      return null;
    }
    this.idleCursor = (this.idleCursor + 1) % idle.length;
    this.clearSelect();
    const u = idle[this.idleCursor];
    u.selected = true;
    this.banner("Idle gatherer", 1.1);
    return u;
  }

  selectTownHall() {
    const hall = this.state.buildings.find(
      (b) => b.team === 0 && b.type === "townhall" && b.hp > 0,
    );
    if (!hall) return null;
    this.clearSelect();
    hall.selected = true;
    this.state.selBld = hall;
    return hall;
  }

  tickEvents(dt: number) {
    this.tickWeather(dt);
    if (this.state.event === "herd") this.state.event = "none";
    this.state.eventT = 120;
    this.tickCalamity(dt);
  }

  tickCalamity(dt: number) {
    this.calamityT -= dt;
    if (this.calamityT > 0) return;
    this.calamityT = 240 + Math.random() * 240;
    if (this.state.time < 70) return;
    const live = this.state.tribes.filter((t) => t.alive && t.id !== 3);
    if (!live.length) return;
    const tr = live[(Math.random() * live.length) | 0];
    const fortune = this.tribeFortune(tr.id);
    const shrinking = fortune < 1;
    const growing = fortune > 2.2;
    const bad = Math.random() < (shrinking ? 0.72 : growing ? 0.38 : 0.52);
    const hall = this.state.buildings.find(
      (b) => b.team === tr.id && b.type === "townhall" && b.hp > 0,
    );
    if (bad) {
      const kind = (Math.random() * 4) | 0;
      if (kind === 0) {
        tr.food = Math.max(0, tr.food - (18 + ((Math.random() * 16) | 0)));
        this.banner(
          (tr.id === 0 ? "Blight on the stores" : tr.name + " — blight") + ". Berries rot.",
          2.2,
        );
      } else if (kind === 1) {
        const blds = this.state.buildings.filter(
          (b) => b.team === tr.id && b.hp > 0 && b.type !== "townhall",
        );
        const b = blds[(Math.random() * blds.length) | 0];
        if (b) {
          b.hp = Math.max(0, b.hp - 90);
          this.addBurst(b.x, b.y + 2, b.z, "#e07030", 16);
          this.banner(
            (tr.id === 0 ? "Fire in the camp" : tr.name + " — fire") +
              " takes a " +
              (BUILDINGS[b.type]?.name || "building"),
            2.2,
          );
          this.onSfx("fire");
        }
      } else if (kind === 2) {
        const sick = this.state.units.filter(
          (x) => x.team === tr.id && x.hp > 0 && x.type !== "leader",
        );
        const n = Math.min(sick.length, this.popNow(tr.id) > 8 ? 1 + ((Math.random() * 3) | 0) : 1);
        for (let i = 0; i < n; i++) {
          sick[i].hp = Math.max(1, sick[i].hp - sick[i].maxHp * 0.25);
          sick[i].sickUntil = this.state.time + 120;
        }
        this.banner(
          (tr.id === 0 ? "A fever moves through the huts" : tr.name + " — plague") +
            (n > 1 ? " — " + n + " fall ill" : " — one villager falls ill"),
          2.2,
        );
      } else {
        tr.wood = Math.max(0, tr.wood - 12);
        tr.stone = Math.max(0, tr.stone - 6);
        this.banner(
          (tr.id === 0 ? "A slide in the hills" : tr.name + " — a slide") + " swallows stores",
          2,
        );
      }
    }
    // Goods enter stores through work, trade or carried loot, never lucky event payouts.
  }

  tickWeather(dt: number) {
    // Normalize legacy summer frosts immediately, even while the old weather timer is running.
    const frostSeason=calendar(this).phase!==1;
    if(!frostSeason&&this.state.weather==="frost"){this.state.weather="clear";this.state.weatherT=60;}
    // Severe storms are brief work interruptions, not months of enforced idleness.
    if(this.state.weather==="storm")this.state.weatherT=Math.min(50,this.state.weatherT);
    this.state.weatherT -= dt;
    if (this.state.weatherT > 0) return;
    const prev = this.state.weather;
    const sn = this.seasonMix();
    const cycle: Weather[] = [
      "clear",
      "mist",
      "rain",
      "storm",
      "frost",
      "golden",
      "flood",
      "drought",
    ];
    const weights = [
      0.14 + sn.summer * 0.16 + sn.spring * 0.06,
      0.1 + sn.spring * 0.08 + sn.winter * 0.08,
      0.1 + sn.spring * 0.12 + sn.autumn * 0.1,
      0.08 + sn.autumn * 0.08 + sn.summer * 0.04,
      frostSeason ? 0.02 + sn.winter * 0.28 : 0,
      0.06 + sn.summer * 0.14,
      0.06 + sn.spring * 0.08,
      0.04 + sn.summer * 0.12,
    ];
    const sum = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * sum;
    let next: Weather = "clear";
    for (let i = 0; i < cycle.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        next = cycle[i];
        break;
      }
    }
    if(next==="storm"&&prev==="storm")next=frostSeason&&sn.winter>.35?"frost":"rain";
    if (next === prev) {
      this.state.weatherT = 90 + Math.random() * 80;
      return;
    }
    this.state.weather = next;
    this.state.weatherT =
      next === "storm" ? 20 + Math.random()*30 : next === "flood" || next === "drought" ? 70 + Math.random() * 40 : 160 + Math.random() * 140;
    if (next === "flood") {
      this.world.waterY = this.world.baseWaterY + 0.55;
      this.rebuildWalk();
    } else if (next === "drought") {
      this.world.waterY = this.world.baseWaterY - 0.18;
      this.rebuildWalk();
    } else if (prev === "flood" || prev === "drought") {
      this.world.waterY = this.world.baseWaterY;
      this.rebuildWalk();
    }
    const line: Record<Weather, string> = {
      clear: "Skies open over the island",
      mist: "Mist rolls in from the sea",
      rain: "Rain on the pines — berries swell",
      storm: "A storm. Builders wait.",
      frost: "Hard frost. Foraging slows.",
      golden: "Golden light. The island is kind.",
      flood: "The river bursts its banks",
      drought: "The wells run low. Yields falter.",
    };
    this.banner(line[next], 2.2);
    if (next === "storm") this.onSfx("thunder");
    if (next === "rain") this.onSfx("splash");
  }

  tickMarket(dt: number) {
    this.state.marketT -= dt;
    if (this.state.marketT > 0) return;
    this.state.marketT = 34 + Math.random() * 22;
    const age = this.tribe(0)?.age ?? 0;
    const wobble = 0.9 + Math.sin(this.state.time * 0.017) * 0.1;
    const n = (v: number) => Math.max(8, Math.round(v * wobble));
    const deals: TradeDeal[] = [
      { give: "food", giveAmt: 40, get: "wood", getAmt: n(28) },
      { give: "wood", giveAmt: 32, get: "food", getAmt: n(26) },
      { give: "food", giveAmt: 48, get: "stone", getAmt: n(16) },
      { give: "wood", giveAmt: 36, get: "stone", getAmt: n(18) },
      { give: "stone", giveAmt: 16, get: "wood", getAmt: n(28) },
    ];
    if (age >= 1) {
      deals.push({ give: "food", giveAmt: 44, get: "copper", getAmt: n(8) });
      deals.push({ give: "copper", giveAmt: 6, get: "food", getAmt: n(36) });
    }
    if (age >= 2) deals.push({ give: "wood", giveAmt: 40, get: "iron", getAmt: n(7) });
    this.state.deals = deals;
  }

  offersFor(_spec: ResKind): TradeDeal[] {
    const rival=this.pickTradeRival();if(!rival)return [];
    return (this.state.tradeReports?.find(r=>r.team===rival.id)?.offers||[])
      .map(d=>reportedQuote(this,rival.id,d.give,d.get,d.giveAmt).deal)
      .filter((d):d is TradeDeal=>!!d).slice(0,3);
  }

  tickSea(dt: number) {
    this.seaT -= dt;
    if (this.seaT > 0) return;
    this.seaT = 480 + Math.random() * 240;
    if (this.state.time < 600) return;
    const dead = this.state.tribes.find((t) => (t.id === 1 || t.id === 2) && !t.alive);
    if (dead && this.popNow(dead.id)===0 && this.state.time - (dead.fallenT || 0) > 1800) {
      this.landSeaTribe(dead.id);
      return;
    }
    this.landSeaFolk();
  }

  landSeaFolk() {
    const you = this.tribe(0);
    const hall = this.state.buildings.find(
      (b) => b.team === 0 && b.type === "townhall" && b.hp > 0,
    );
    if (!you || !hall) return;
    const welcome = this.state.growthPolicy === "welcome";
    const reserve = reserveSeconds(this);
    if (reserve < (welcome ? 360 : 4000)) return;
    if (you.food < 16 || this.popNow(0) >= this.popCap(0)) return;
    const donors = this.state.tribes.filter(
      (t) => t.id === 1 || t.id === 2,
    );
    const thriving = donors.find((t) => t.alive && this.popNow(t.id) > 6 && this.tribeFortune(t.id) > 1.6);
    const failing = donors.find((t) => t.alive && this.popNow(t.id) > 4 && this.tribeFortune(t.id) < 1);
    const takeFrom = (tr: (typeof donors)[number] | undefined) => {
      if (!tr) return null;
      return (
        this.state.units.find(
          (u) => u.team === tr.id && u.hp > 0 && u.type === "worker" && !isDependent(this, u),
        ) || null
      );
    };
    const roll = Math.random();
    let label = "A wanderer from the sea stays";
    const migrant = roll < 0.4 ? takeFrom(thriving) : roll < 0.7 ? takeFrom(failing) : null;
    if (migrant) {
      const from = this.tribe(migrant.team);
      migrant.team = 0;
      migrant.order = "move";
      migrant.job = null;
      migrant.node = null;
      migrant.target = null;
      migrant.tx = hall.x + 4;
      migrant.tz = hall.z + 4;
      migrant.hp = Math.max(20, migrant.hp);
      label =
        roll < 0.4
          ? "Someone leaves " + (from?.name || "a village") + " and joins you"
          : "Refugees from " + (from?.name || "a failing village") + " ask to stay";
    } else {
      you.food -= 8;
      const a = Math.atan2(hall.x, hall.z) + Math.PI;
      const d = (this.world.islandR || 140) * 0.82;
      const group=Math.min(this.popCap(0)-this.popNow(0),Math.floor(you.food/8),1+Math.floor(Math.random()*3));
      for(let i=0;i<group;i++) {
        if(i>0)you.food-=8;
        const u=this.spawnUnit("worker",Math.sin(a)*d+i*2,Math.cos(a)*d,0);
        u.order="move";u.tx=hall.x+4+i;u.tz=hall.z+6;
      }
      if(group>1)label=`A group of ${group} wanderers is walking toward your village`;

      if(!label.startsWith("A group")) label = roll < 0.85 ? "A wanderer from the sea stays" : "Someone walking the shore asks to stay";
    }
    this.banner(label, 2.2);
  }

  landSeaTribe(slot: number) {
    const specs: ResKind[] = ["food", "wood", "stone", "copper"];
    const tr = this.tribe(slot);
    if (!tr) return;
    const ir = this.world.islandR || 160;
    const a = slot === 1 ? 2.1 : -2.1;
    const x = Math.sin(a) * ir * 0.62;
    const z = Math.cos(a) * ir * 0.62;
    const camp = this.world.camps.find((c) => c.team === slot);
    if (camp) {
      camp.x = x;
      camp.z = z;
    }
    tr.alive = true;
    tr.hostile = false;
    tr.ally = false;
    tr.age = Math.max(0, (this.tribe(0)?.age ?? 0) - 1);
    tr.food = 48;
    tr.wood = 40;
    tr.stone = 8;
    tr.copper = tr.age >= 1 ? 4 : 0;
    tr.iron = 0;
    tr.aggro = 0;
    tr.tension = 0;
    tr.spears = 2;
    tr.bows = 1;
    tr.blades = 0;
    tr.name = prehistoricName(this.state.seed,slot*977+Math.floor(this.state.time));
    tr.short = tr.name;
    tr.spec = specs[(Math.random() * (tr.age >= 1 ? 4 : 3)) | 0];
    const pool = CITY_LEADERS[tr.spec] || CITY_LEADERS.wood;
    const pick = pool[(Math.random() * pool.length) | 0];
    tr.leader = pick.name;
    tr.leaderTitle = pick.title;
    tr.csType = pick.csType;
    const h = this.height(x, z);
    this.state.buildings.push(this.makeBld("townhall", x, z, slot, h));
    this.state.buildings.push(this.makeBld("hut", x + 7, z + 5, slot, this.height(x + 7, z + 5)));
    for (let i = 0; i < 3; i++) {
      const u = this.spawnUnit("worker", x + Math.cos(i) * 5, z + Math.sin(i) * 5, slot);
      u.order = "idle";
    }
    this.spawnUnit("spearman", x + 4, z - 3, slot);
    this.banner(tr.name + " land from the sea — a new hall rises", 2.6);
    this.onSfx("age");
  }

  tickRegen(dt: number) {
    const rain = this.state.weather === "rain" || this.state.weather === "storm";
    const frost = this.state.weather === "frost";
    const drought = this.state.weather === "drought";
    const flood = this.state.weather === "flood";
    const grow = (list: ResourceNode[]) => {
      for (const n of list) {
        if(n.pressure&&!(this.state.units.some(u=>u.hp>0&&u.order==="gather"&&u.node===n)))n.pressure=Math.max(0,n.pressure-dt/7200);
        if (n.kind === "forage" && calendar(this).phase === 3 && n.amount > 0) {
          n.amount = Math.max(0, n.amount - dt * (n.maxAmt || 12) / 180);
          if (n.amount === 0) n.regenT = 100;
        }
        if (n.amount > 0) continue;
        if (n.kind === "stone" || n.kind === "copper" || n.kind === "iron") continue;
        // Exhausted wild food does not regrow through winter.
        if (n.kind === "forage" && calendar(this).phase === 3) continue;
        let rate = 1;
        if (rain) rate = 1.25;
        if (frost) rate = 0.55;
        if (drought) rate = 0.42;
        if (flood && n.kind === "forage") rate = 0.7;
        if (flood && n.kind === "fish") rate = 1.35;
        if (rain && n.kind === "fish") rate = 1.2;
        const habitat = habitatAt(this, n.x, n.z);
        if (n.kind === "forage") rate *= habitat.forage;
        if (n.kind === "tree") rate *= habitat.timber;
        n.regenT -= dt * rate;
        if (n.regenT <= 0) {
          const base = n.maxAmt || (n.kind === "tree" ? 10 : 8);
          n.amount = Math.max(1, Math.floor(base * (0.5 + Math.random() * 0.35)*(1-(n.pressure||0)*0.7)));
          n.regenT = 0;
        }
      }
    };
    grow(this.state.trees);
    grow(this.state.forage);
    grow(this.state.stones);
    grow(this.state.fish);
    grow(this.state.copper);
    grow(this.state.iron);
  }

  tickPeople(dt: number) {
    this.state.birthT -= dt;
    if (this.state.birthT <= 0) {
      let richest = 0;
      for (const tr of this.state.tribes) {
        if (!tr.alive || tr.id === 3) continue;
        richest = Math.max(richest, reserveSeconds(this, tr.id));
      }
      this.state.birthT =
        richest > 1800
          ? 70 + Math.random() * 35
          : richest > 1100
            ? 120 + Math.random() * 40
            : 200 + Math.random() * 55;
      for (const tr of this.state.tribes) {
        if (!tr.alive || tr.id === 3) continue;
        const pop = this.popNow(tr.id);
        const cap = this.popCap(tr.id);
        if (pop + this.queued(tr.id) >= cap) continue;
        if (reserveSeconds(this, tr.id) < 480) continue;
        if (tr.id !== 0) {
          if(tr.food<growthFoodNeed(this,tr.id))continue;
        }
        const family = this.state.units.filter(u => u.team === tr.id && u.hp > 0);
        if (family.filter(u => isDependent(this, u)).length >= Math.ceil(family.filter(u => !isDependent(this, u)).length / 2)) {
          const home = this.campOf(tr.id);
          if (reserveSeconds(this, tr.id) >= 900) this.welcomeSoul(tr.id, home.x, home.z);
          continue;
        }
        const hall = this.state.buildings.find(
          (b) => b.team === tr.id && b.type === "townhall" && b.hp > 0,
        );
        if (!hall) continue;
        tr.food -= 16;
        const a = Math.random() * Math.PI * 2;
        const u = this.spawnUnit(
          "worker",
          hall.x + Math.cos(a) * 5.5,
          hall.z + Math.sin(a) * 5.5,
          tr.id,
        );
        u.ageT = 0;
        u.maturesAt = this.state.time + 360;
        u.homeHall=hall.id;u.parents=family.filter(p=>!isDependent(this,p)).slice(0,2).map(p=>p.id);
        lifeEvent(this,tr.id,personName(u)+" was born",hall.x,hall.z);
        u.stature = 0.6;
        u.workReason = "Growing up — supported by the village";
        u.order = "idle";
        if (tr.id === 0) this.addFloater(u.x, u.y + 2.2, u.z, "Born", "#c9e8a0");
      }
    }

    for (const b of this.state.buildings) {
      if (b.type === "warehouse" && b.storeCare) b.storeCare = Math.max(0, b.storeCare - dt / 900);
    }
    const counts = this.state.tribes.map((tr) => this.popNow(tr.id));
    for (const tr of this.state.tribes) {
      if (!tr.alive && this.popNow(tr.id) === 0) continue;
      const pop = counts[tr.id];
      const upkeep = foodDemand(this, tr.id);
      consumeAndSpoilFood(this,tr.id,upkeep,dt);
      if (tr.id === 0 && tr.food < 8 && this.state.bannerT <= 0)
        this.banner("The stores run thin", 2);
    }

    for (const u of this.state.units) {
      if (u.hp <= 0) continue;
      u.ageT += dt;
      if(u.maturesAt!==undefined&&u.maturesAt>this.state.time+360)u.maturesAt=this.state.time+360;
      if (u.maturesAt !== undefined && !isDependent(this, u)) {
        u.maturesAt = undefined;
        u.stature = predisposition(u).size;
        u.workReason = "Ready to join the workforce";
        u.order = "idle";
        if (u.team === 0) this.addFloater(u.x, u.y + 2, u.z, "Grown", "#c9e8a0");
      }
      const tr = this.tribe(u.team);
      if (!tr) continue;
      const pop = counts[u.team];
      // Everyone needs food; a grace period avoids deaths from a momentary empty store.
      // A game year is 1800 seconds: one calendar month is 150 seconds.
      const hungry = (u.expedition ? u.expedition.food < 0.01 : tr.food < 0.01), previousHunger = u.hunger || 0;
      u.hunger = hungry ? Math.min(1200, previousHunger + dt) : Math.max(0, previousHunger - dt * 3);
      if (hungry) {
        const exposure = Math.max(0, previousHunger + dt - 5) - Math.max(0, previousHunger - 5);
        u.hp -= exposure * u.maxHp * predisposition(u).appetite / 145;
        if (u.hp <= 0 && u.team === 0) this.banner("Hunger takes a villager", 3);
      }
      if (u.sickUntil && this.state.time >= u.sickUntil && tr.food > 12) {
        u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.25);
        u.sickUntil = undefined;
      }
      const span = (58 + (u.id % 20)) * 1800;
      if (u.ageT > span && pop > 4 && Math.random() < 0.00003 * dt) {
        u.hp = 0;
        this.addBurst(u.x, u.y + 1, u.z, "#888", 8);
        if (u.team === 0) {
          this.banner("An elder has passed", 2);
          this.onSfx("death");
        }
      }
      if (u.hp <= 0) counts[u.team]--;
    }
  }

  stampVision(x: number, z: number, r: number, level = 2) {
    const n = FOW;
    const vis = this.vision;
    const cell = MAP / n;
    const cx = ((x + HALF) / cell) | 0;
    const cz = ((z + HALF) / cell) | 0;
    const cr = Math.ceil(r / cell);
    for (let iz = cz - cr; iz <= cz + cr; iz++) {
      if (iz < 0 || iz >= n) continue;
      for (let ix = cx - cr; ix <= cx + cr; ix++) {
        if (ix < 0 || ix >= n) continue;
        const wx = -HALF + (ix + 0.5) * cell;
        const wz = -HALF + (iz + 0.5) * cell;
        if ((wx - x) ** 2 + (wz - z) ** 2 <= r * r) {
          if (vis[iz * n + ix] < level) vis[iz * n + ix] = level;
        }
      }
    }
  }

  updateVision(dt = 0) {
    const vis = this.vision;
    const age = this.visAge;
    for (let i = 0; i < vis.length; i++) if (vis[i] === 2) vis[i] = 1;
    for (const u of this.state.units) {
      if (u.team !== 0 || u.hp <= 0) continue;
      this.stampVision(
        u.x,
        u.z,
        u.type === "archer" || u.type === "ranger" ? 16 : u.type === "worker" ? 11 : 13,
        2,
      );
    }
    for (const b of this.state.buildings) {
      if (b.team !== 0 || b.hp <= 0) continue;
      this.stampVision(b.x, b.z, b.type === "watchtower" ? (this.state.agePicks[2] === "army" ? 30 : 22) : b.type === "townhall" ? 18 : 12, 2);
    }
    for (let i = 0; i < vis.length; i++) {
      if (vis[i] === 2) age[i] = 0;
      else if (vis[i] === 1) {
        age[i] += dt;
        age[i] = Math.min(age[i], 55);
      }
    }
    this.paintTerritory();
  }

  paintTerritory() {
    const terr = this.territory;
    terr.fill(255);
    this.territoryStrength.fill(0);
    const n = FOW;
    const cell = MAP / n;
    const rad: Partial<Record<BldType, number>> = {
      townhall: 34,
      cornerstone: CORNERSTONE_R,
      hut: 16,
      farm: 14,
      lumber: 18,
      workshop: 16,
      quarry: 16,
      dock: 12,
      warehouse: 22,
      barracks: 18,
      forge: 15,
      watchtower: 28,
      temple: 20,
      market: 18,
      keep: 30,
      stables: 16,
      university: 20,
      cairn: 18,
      grove: 18,
    };
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || b.build < 1 || b.team > 2) continue;
      const r = (rad[b.type] ?? 14) * 1.45;
      const cx = ((b.x + HALF) / cell) | 0;
      const cz = ((b.z + HALF) / cell) | 0;
      const cr = Math.ceil(r / cell);
      for (let iz = cz - cr; iz <= cz + cr; iz++) {
        if (iz < 0 || iz >= n) continue;
        for (let ix = cx - cr; ix <= cx + cr; ix++) {
          if (ix < 0 || ix >= n) continue;
          const wx = -HALF + (ix + 0.5) * cell;
          const wz = -HALF + (iz + 0.5) * cell;
          if ((wx - b.x) ** 2 + (wz - b.z) ** 2 > r * r) continue;
          const i = iz * n + ix;
          this.territoryStrength[i] = Math.max(this.territoryStrength[i], Math.max(0,Math.min(1,(1-Math.hypot(wx-b.x,wz-b.z)/r)/0.25)));
          const cur = terr[i];
          if (cur === 255 || cur === b.team) terr[i] = b.team;
          else terr[i] = 254;
        }
      }
    }
  }

  enqueueTrain(bld: Building, unitType: UnitType) {
    if (!bld || bld.hp <= 0 || bld.build < 1) {
      if (bld?.team === 0) this.banner("The building is still being raised", 1.4);
      return false;
    }
    const d = UNITS[unitType];
    if (!d || d.from !== bld.type) {
      if (bld.team === 0 && unitType !== "worker")
        this.banner("Arm adults at the barracks — people are born, not trained", 2);
      return false;
    }
    const team = bld.team;
    const tribe = this.tribe(team);
    if (!tribe) return false;
    if (tribe.age < d.age) {
      if (team === 0) this.banner("Requires " + AGES[d.age] + " Age", 1.4);
      return false;
    }
    if (unitType !== "worker" && reserveSeconds(this, team) < 420) {
      if (team === 0) this.banner("Arming needs a food surplus. The village eats first.", 2);
      this.onSfx("invalid");
      return false;
    }
    if (unitType === "worker") {
      if (team === 0) this.banner("People join through birth and migration. Welcome settlers in Village (L).", 3);
      return false;
    }
    const cost = { food: d.food, wood: d.wood, stone: d.stone, copper: d.copper, iron: d.iron };
    if (!this.canAfford(team, cost)) {
      if (team === 0) this.banner("Not enough resources", 1.3);
      this.onSfx("invalid");
      return false;
    }
    if (bld.queue.length >= 5) {
      if (team === 0) this.banner("The hall queue is full", 1.3);
      return false;
    }
    this.spend(team, cost);
    bld.queue.push({ unit: unitType, t: 0, max: d.train });
    if (team === 0) this.onSfx("click");
    return true;
  }

  trainSelected(unitType: UnitType) {
    const prefer = UNITS[unitType].from;
    let bld =
      this.state.selBld && this.state.selBld.type === prefer && this.finished(this.state.selBld)
        ? this.state.selBld
        : this.state.buildings.find((b) => b.type === prefer && b.team === 0 && this.finished(b));
    if (!bld) {
      this.banner(
        unitType === "worker"
          ? "Need a standing Town Hall"
          : "Raise a Barracks first, then train soldiers",
        1.6,
      );
      return;
    }
    this.enqueueTrain(bld, unitType);
  }

  ageUpIssue(team = 0): string | null {
    const tribe = this.tribe(team);
    if (!tribe || tribe.age >= 5) return "This society has reached the final age";
    const c = AGE_COST[tribe.age + 1];
    if (!c) return "No next age is available";
    if (this.popNow(team) < (c.pop || 0)) return `Need ${c.pop} residents — welcome families in Village (L) or raise children`;
    const kinds = new Set(this.state.buildings.filter(b => b.team === team && this.finished(b)).map(b => b.type));
    if (kinds.size < tribe.age + 2) return `Need ${tribe.age + 2} different completed building types`;
    if (!this.canAfford(team, c)) {
      const missing = (["food","wood","stone","copper","iron"] as ResKind[])
        .filter(k => (c[k] || 0) > tribe[k])
        .map(k => `${Math.ceil((c[k] || 0)-tribe[k])} ${k === "wood" ? "timber" : k}`);
      return "Still need " + missing.join(", ");
    }
    return null;
  }

  tryAgeUp(team = 0) {
    const issue = this.ageUpIssue(team);
    if (issue) { if (team === 0) this.banner(issue, 3); return; }
    const tribe = this.tribe(team);
    if (team === 0) {
      this.state.pendingAge = true;
      this.banner("Choose a path into the " + AGES[tribe.age + 1] + " Age", 2.2);
      return;
    }
    this.commitAge(team, Math.random() < (tribe.aggro || 0.4) ? "army" : "econ");
  }

  commitAge(team: number, pick: "econ" | "army") {
    if (pick !== "econ" && pick !== "army") return;
    const issue = this.ageUpIssue(team);
    if (issue) { if (team === 0) {this.state.pendingAge = false; this.banner(issue, 3);} return; }
    const tribe = this.tribe(team);
    const c = AGE_COST[tribe.age + 1]!;
    this.spend(team, c);
    tribe.age++;
    if (team === 0) {
      this.state.age = tribe.age;
      this.state.agePicks.push(pick);
      this.state.pendingAge = false;
      this.state.routePopups = 0;
      this.state.routeOffer = null;
    }
    const mul = AGE_STAT[tribe.age] / AGE_STAT[tribe.age - 1];
    const extraHp = pick === "army" ? 1.25 : 1;
    for (const u of this.state.units) {
      if (u.team !== team) continue;
      const guard = pick === "army" && tribe.age === 5 && u.type !== "worker" ? 1.2 : 1;
      u.maxHp = Math.round(u.maxHp * mul * extraHp * guard);
      u.hp = Math.min(u.maxHp, Math.round(u.hp * mul * extraHp * guard));
      u.dmg *= mul * (pick === "army" ? 1.2 : 1);
    }
    if (team === 0) {
      this.onSfx("age");
      this.banner(AGES[tribe.age] + " Age · " + AGE_CHOICES[tribe.age - 1][pick].name, 2.8);
    }
    this.checkVictory();
  }

  interactionSpot(u: Unit, b: Building) {
    if(this.state.walkDirty)this.rebuildWalk();
    if(b.type==="bridge")return bridgeApproach(this,u,b);
    const cached=this.approachCache.get(u);if(cached&&cached.building===b&&cached.revision===this.navRevision&&this.state.time-cached.time<2)return cached.spot;
    let best:{x:number;z:number}|null=null,score=Infinity;
    // A physically clear frontage can still fall in a coarse blocked cell.
    // Try the nearest ring first, then a little farther out when necessary.
    for(const margin of [.8,1.2,1.6]) {
    const w=b.w*0.4+Math.max(u.r,0.45)+margin,d=b.d*0.4+Math.max(u.r,0.45)+margin;
    for(let i=0;i<32;i++) {
      const a=i*Math.PI/16,sx=Math.sin(a),sz=Math.cos(a),r=Math.min(w/(Math.abs(sx)||1e-6),d/(Math.abs(sz)||1e-6));
      const x=b.x+sx*r,z=b.z+sz*r;
      if(!this.walkable(x,z)||!this.workBoard.connected(this,u.x,u.z,x,z))continue;
      // A walkable grid cell doesn't guarantee this sub-cell point is clear.
      // Reject neighboring huts/stores rather than redirecting to their doors.
      if(this.state.buildings.some(other=>this.solidBuilding(other)&&
          Math.abs(x-other.x)<other.w*.4+u.r+.15&&Math.abs(z-other.z)<other.d*.4+u.r+.15))continue;
      if(u.order==="attack"&&u.target===b){const gap=Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w*.4),Math.max(0,Math.abs(z-b.z)-b.d*.4));if(gap>u.range+.4)continue;}
      const value=Math.hypot(x-u.x,z-u.z);if(value<score){score=value;best={x,z};}
    }
    if(best)break;
    }
    this.approachCache.set(u,{building:b,revision:this.navRevision,time:this.state.time,spot:best});
    return best;
  }

  buildingWorkReached(u:Unit,b:Building) {
    if(b.type==="bridge"){const p=bridgeApproach(this,u,b);return !!p&&Math.hypot(u.x-p.x,u.z-p.z)<=1.2;}
    if(this.attackDistance(u,b)<=u.r+1.8)return true;
    const entrance=this.interactionSpot(u,b);
    return !!entrance&&Math.hypot(u.x-entrance.x,u.z-entrance.z)<=1;
  }

  nearestDrop(x: number, z: number, team: number) {
    let best: Building | null = null;
    let bd = 1e12;
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || b.team !== team || !this.finished(b)) continue;
      if (b.type !== "townhall" && b.type !== "warehouse" && b.type !== "cornerstone") continue;
      if (b.type === "cornerstone" && !this.finished(b)) continue;
      const d = (b.x - x) ** 2 + (b.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  resKind(node: ResourceNode | Building | Critter | null): ResKind | null {
    if (!node) return null;
    if ("species" in node) return node.species === "bird" ? null : "food";
    if (node.kind === "building")
      return node.type==="quarry"?"stone":node.type === "farm" || node.type === "dock" || node.type === "warehouse" ? "food" : null;
    if (node.kind === "tree") return "wood";
    if (node.kind === "stone") return "stone";
    if (node.kind === "copper") return "copper";
    if (node.kind === "iron") return "iron";
    if (node.kind === "forage" || node.kind === "farm" || node.kind === "fish") return "food";
    return null;
  }

  findNode(u: Unit, job: ResKind): ResourceNode | Building | Critter | null {
    let best: ResourceNode | Building | Critter | null = null;
    let bd = 1e12;
    const consider = (n: ResourceNode | Building | Critter, x: number, z: number, extra = 0) => {
      if (u.team === 0 && (!("type" in n) || n.kind !== "building") &&
          ("species" in n ? !this.visibleAt(x, z) : !this.exploredAt(x, z))) return;
      const d = (x - u.x) ** 2 + (z - u.z) ** 2 + extra;
      if (d < bd) {
        bd = d;
        best = n;
      }
    };
    if (job === "food") {
      for (const b of this.state.buildings) {
        if (this.finished(b) && b.team === u.team && b.type === "farm" && farmAvailable(this, b))
          consider(b, b.x, b.z, -40);
        if (this.finished(b) && b.team === u.team && b.type === "dock" && fishingGrounds(this,b).length) consider(b, b.x, b.z, -20);
      }
      for (const n of this.state.forage) if (n.amount > 0) consider(n, n.x, n.z);
      for (const c of this.state.wildlife) {
        if (c.hp > 0 && c.species !== "bird") consider(c, c.x, c.z, u.huntOnly ? -80 : -28);
      }
      const docks = this.state.buildings.filter(
        (b) => b.team === u.team && b.type === "dock" && this.finished(b),
      );
      for (const n of this.state.fish) {
        if (n.amount <= 0) continue;
        const nearDock = docks.some((d) => Math.hypot(d.x - n.x, d.z - n.z) < DOCK_R);
        consider(n, n.x, n.z, nearDock ? -50 : 0);
      }
    } else if (job === "wood") {
      for (const n of this.state.trees) {
        if (n.amount <= 0) continue;
        const marked = u.team === 0 && this.chopMarks.has(n.id);
        consider(n, n.x, n.z, marked ? -1e7 : 0);
      }
    } else if (job === "stone") {
      const quarries = this.state.buildings.filter(
        (b) => b.team === u.team && b.type === "quarry" && this.finished(b),
      );
      for (const n of this.state.stones) {
        if (n.amount <= 0) continue;
        if (
          !this.cornerstoneAt(n.x, n.z, u.team) &&
          !quarries.some((q) => Math.hypot(q.x - n.x, q.z - n.z) < QUARRY_R) &&
          Math.hypot(n.x - this.campOf(u.team).x, n.z - this.campOf(u.team).z) > 28
        )
          continue;
        consider(n, n.x, n.z);
      }
    } else if (job === "copper") {
      if ((this.tribe(u.team)?.age ?? 0) < 1) return null;
      for (const n of this.state.copper) if (n.amount > 0) consider(n, n.x, n.z);
    } else if (job === "iron") {
      if ((this.tribe(u.team)?.age ?? 0) < 2) return null;
      for (const n of this.state.iron) if (n.amount > 0) consider(n, n.x, n.z);
    }
    return best;
  }

  findHunt(u: Unit): Critter | null {
    let best: Critter | null = null;
    let bd = 1e12;
    for (const c of this.state.wildlife) {
      if (c.hp <= 0 || c.species === "bird" || (u.team === 0 && !this.visibleAt(c.x, c.z))) continue;
      const d = (c.x - u.x) ** 2 + (c.z - u.z) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  pickJob(u: Unit): ResKind {
    if (u.jobLock && u.job) {
      if (u.job === "stone" && !this.hasBld(u.team, "quarry")) {
        u.jobLock = false;
        u.job = null;
      } else return u.job;
    }
    const t = this.tribe(u.team);
    if (!t) return "food";
    let nFood = 0,
      nWood = 0,
      nStone = 0,
      nCopper = 0,
      nIron = 0;
    for (const o of this.state.units) {
      if (o.team !== u.team || o.hp <= 0 || o.type !== "worker" || o.id === u.id) continue;
      if (o.job === "food") nFood++;
      else if (o.job === "wood") nWood++;
      else if (o.job === "stone") nStone++;
      else if (o.job === "copper") nCopper++;
      else if (o.job === "iron") nIron++;
    }
    const canStone = this.hasBld(u.team, "quarry");
    const canWood = !!this.findNode(u, "wood");
    const canCopper = t.age >= 1;
    const canIron = t.age >= 2;
    const specBonus = (k: ResKind) => (t.spec === k ? 18 : 0);
    const scores: [ResKind, number][] = [
      ["food", 100 - t.food - nFood * 22 + specBonus("food")],
      ["wood", canWood ? 90 - t.wood - nWood * 18 + specBonus("wood") : -999],
      ["stone", canStone ? 48 - t.stone * 0.85 - nStone * 20 + specBonus("stone") : -999],
      ["copper", canCopper ? 40 - t.copper * 1.2 - nCopper * 16 + specBonus("copper") : -999],
      ["iron", canIron ? 36 - t.iron * 1.3 - nIron * 16 : -999],
    ];
    scores.sort((a, b) => b[1] - a[1]);
    for (const [k] of scores) {
      if (this.findNode(u, k)) return k;
    }
    return "food";
  }

  campBonus(u: Unit, job: ResKind) {
    let m = this.gatherMul(u.team);
    const habitat = habitatAt(this, u.x, u.z);
    if (job === "wood") {
      m /= habitat.timber;
      if (u.team === 0 && hasTradition(this, "woodcraft")) m *= 0.8;
    }
    if (job === "food" && u.node && "kind" in u.node && u.node.kind === "forage") m /= habitat.forage;
    if (job === "stone" && !this.hasBld(u.team, "quarry")) m *= 2.8;
    const want =
      job === "wood"
        ? "lumber"
        : job === "stone"
          ? "quarry"
          : job === "food"
            ? "dock"
            : job === "copper" || job === "iron"
              ? "forge"
              : null;
    if (want) {
      for (const b of this.state.buildings) {
        if (
          b.hp > 0 &&
          b.team === u.team &&
          b.type === want &&
          this.finished(b) &&
          Math.hypot(b.x - u.x, b.z - u.z) <
            (want === "lumber"
              ? LUMBER_R
              : want === "quarry"
                ? QUARRY_R
                : want === "forge"
                  ? 16
                  : DOCK_R)
        ) {
          if (want === "dock" && this.height(u.x, u.z) > this.world.waterY + 0.7) continue;
          m *= GATHER[job].campBonus;
          break;
        }
      }
    }
    if (this.state.weather === "rain" && job === "food") m *= 0.82;
    if (this.state.weather === "rain" && job === "wood") m *= 1.16;
    if (this.state.weather === "frost" && job === "food") m *= 1.2;
    if (this.state.weather === "drought" && job === "food") m *= 1.28;
    if (this.state.weather === "flood" && job === "food") m *= 1.22;
    if (u.team === 0 && this.state.agePicks[1] === "econ" && job === "wood") m *= 0.65;
    if (u.team === 0 && this.state.agePicks[3] === "econ" && job === "food") m *= 0.84;
    const sn = this.seasonMix();
    if (sn.winter > 0.35 && job === "food") m *= 1 + sn.winter * 0.55;
    if (sn.autumn > 0.35 && job === "wood") m *= 1 - sn.autumn * 0.12;
    if (sn.spring > 0.4 && job === "food") m *= 0.88;
    if (this.isNight() && !this.nearTorch(u.x, u.z, u.team)) m *= 1.55;
    const tr = this.tribe(u.team);
    if (tr && tr.spec === job) m *= 0.74;
    const reg = this.regionAt(u.x, u.z);
    if (reg && reg.owner === u.team && reg.res === job) m *= 0.78;
    if (job === "stone" && this.clusterHeld(0, u.team)) m *= 0.82;
    if (job === "food" && this.clusterHeld(1, u.team)) m *= 0.84;
    if (job === "wood" && this.clusterHeld(2, u.team)) m *= 0.84;
    return Math.max(0.38, m);
  }

  travelSpeed(u: Unit) {
    return u.speed * predisposition(u).speed * pathPace(this,u.x,u.z) * (1-(u.fatigue||0)*0.12) * (u.visit || u.order === "trade" || (u.order === "return" && u.tradeTeam !== 0) ? 0.75 : 1) * Math.max(0.45,1-(u.hunger||0)/220) *
        (u.team === 0 && hasTradition(this, "pathfinders") ? (u.order === "explore" ? 1.25 : u.order === "trade" || (u.order === "return" && u.carry > 0) ? 1.15 : 1) : 1) *
        (u.team === 0 &&
        this.state.agePicks[4] === "econ" &&
        (u.order === "return" || u.order === "trade")
          ? 1.35
          : 1);
  }

  steer(u: Unit, dt: number) {
    if (this.state.walkDirty) this.rebuildWalk();
    // Coarse navigation can mark a citizen's cell blocked after construction.
    // Walk out through a physically clear segment before asking A* to route.
    if(!this.walkable(u.x,u.z)){
      let escape:{x:number;z:number}|null=null;
      search:for(const radius of [1,2,3,4,6,8])for(let i=0;i<24;i++){
        const x=u.x+Math.sin(i*Math.PI/12)*radius,z=u.z+Math.cos(i*Math.PI/12)*radius;
        if(!this.walkable(x,z))continue;
        const samples=Math.ceil(radius*2);
        let clear=true;
        let probe=u;
        for(let j=1;j<=samples;j++){const px=u.x+(x-u.x)*j/samples,pz=u.z+(z-u.z)*j/samples;
          if(!this.canStep(probe,px,pz)){clear=false;break;}
          probe={...u,x:px,z:pz,y:this.travelHeight(px,pz)};
        }
        if(!clear)continue;
        escape={x,z};break search;
      }
      if(escape){
        const dx=escape.x-u.x,dz=escape.z-u.z,distance=Math.hypot(dx,dz);
        const step=Math.min(distance,this.travelSpeed(u)*dt);
        const nx=u.x+dx/distance*step,nz=u.z+dz/distance*step;
        if(this.canStep(u,nx,nz)){u.vx=(nx-u.x)/dt;u.vz=(nz-u.z)/dt;u.x=nx;u.z=nz;u.y=this.travelHeight(nx,nz);u.facing=Math.atan2(dx,dz);u.stride+=step*3.6;u.stuckT=0;this.paths.delete(u.id);return false;}
      }
    }
    let tx = u.tx,
      tz = u.tz;
    for (const b of this.state.buildings) {
      if (
        !this.solidBuilding(b) ||
        Math.abs(tx - b.x) > b.w * 0.4 + u.r ||
        Math.abs(tz - b.z) > b.d * 0.4 + u.r
      )
        continue;
      const spot=this.interactionSpot(u,b);
      if(spot){tx=spot.x;tz=spot.z;}

    }
    const distance = Math.hypot(tx - u.x, tz - u.z);
    if (distance < 0.5) {
      this.paths.delete(u.id);
      u.stuckT = 0;
      return true;
    }
    let route = this.paths.get(u.id);
    if (
      !route ||
      Math.hypot(route.tx - tx, route.tz - tz) > 2 ||
      route.revision !== this.navRevision ||
      (route.failed && route.retry < this.state.time)
    ) {
      if (this.navBudget <= 0) return false;
      this.navBudget--;
      let direct = true;
      const samples = Math.ceil(distance);
      for (let i = 1; i <= samples; i++)
        if (!this.canStep(u, u.x + ((tx - u.x) * i) / samples, u.z + ((tz - u.z) * i) / samples)) {
          direct = false;
          break;
        }
      let points = [{ x: tx, z: tz }],
        failed = false;
      if (!direct) {
        const cell = MAP / WALK;
        const index = (x: number, z: number) =>
          Math.max(0, Math.min(WALK - 1, Math.floor((z + HALF) / cell))) * WALK +
          Math.max(0, Math.min(WALK - 1, Math.floor((x + HALF) / cell)));
        const goal = index(tx, tz);
        let end = goal;
        if (!this.walk[end]) {
          let best = Infinity;
          for (let dz = -3; dz <= 3; dz++)
            for (let dx = -3; dx <= 3; dx++) {
              const x = (goal % WALK) + dx,
                z = Math.floor(goal / WALK) + dz;
              if (x < 0 || z < 0 || x >= WALK || z >= WALK) continue;
              const n = z * WALK + x,
                d = dx * dx + dz * dz;
              if (this.walk[n] && d < best) {
                best = d;
                end = n;
              }
            }
        }
        const path = findPath(this.walk, WALK, index(u.x, u.z), end);
        if (path) {
          points = path.map((n) => ({
            x: -HALF + ((n % WALK) + 0.5) * cell,
            z: -HALF + (Math.floor(n / WALK) + 0.5) * cell,
          }));
          if(end===goal&&this.walkable(tx,tz))points.push({ x: tx, z: tz });
          // Cache against the requested destination even when the route ends on
          // nearby dry ground. Re-keying to that fallback replanned every frame.
        } else {
          points = [];
          failed = true;
        }
      }
      route = { tx, tz, revision: this.navRevision, points, failed, retry: this.state.time + 3 };
      this.paths.set(u.id, route);
    }
    while (
      route.points.length > 1 &&
      Math.hypot(route.points[0].x - u.x, route.points[0].z - u.z) < 0.6
    )
      route.points.shift();
    const point = route.points[0];
    if (!point) {
      u.stuckT += dt;
      return false;
    }
    const dx = point.x - u.x,
      dz = point.z - u.z,
      d = Math.hypot(dx, dz);
    if (d < 0.5 && route.points.length===1) {this.paths.delete(u.id);u.stuckT=0;return true;}
    const step = Math.min(this.travelSpeed(u)*dt, d);
    let nx = u.x + (dx / d) * step,
      nz = u.z + (dz / d) * step;
    if (!this.canStep(u, nx, nz)) {
      let found = false;
      for (const off of [0.55, -0.55, 1.1, -1.1, 1.6, -1.6]) {
        const a = Math.atan2(dx, dz) + off,
          x = u.x + Math.sin(a) * step,
          z = u.z + Math.cos(a) * step;
        if (this.canStep(u, x, z)) {
          nx = x;
          nz = z;
          found = true;
          break;
        }
      }
      if (!found) {
        u.stuckT += dt;
        if (u.stuckT > 1) {
          route.failed = true;
          route.retry = this.state.time + 1;
        }
        return false;
      }
    }
    u.vx = (nx - u.x) / dt;
    u.vz = (nz - u.z) / dt;
    wearTrail(this,nx,nz,nx-u.x,nz-u.z);
    u.x = nx;
    u.z = nz;
    u.y = this.travelHeight(nx, nz);
    u.facing = Math.atan2(dx, dz);
    u.stride += step * 3.6;
    u.stuckT = 0;
    return false;
  }

  separate(dt: number) {
    // Query nearby buckets instead of comparing every pair across the island.
    const us = this.state.units;
    const cell = Math.max(2, ...us.map((u) => u.r * 2));
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < us.length; i++) {
      const u = us[i];
      if (u.hp <= 0) continue;
      const key = `${Math.floor(u.x / cell)},${Math.floor(u.z / cell)}`;
      const bucket = buckets.get(key) || [];
      bucket.push(i);
      buckets.set(key, bucket);
    }
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      if (a.hp <= 0) continue;
      const cx = Math.floor(a.x / cell),
        cz = Math.floor(a.z / cell);
      for (let z = cz - 1; z <= cz + 1; z++)
        for (let x = cx - 1; x <= cx + 1; x++) {
          for (const j of buckets.get(`${x},${z}`) || []) {
            if (j <= i) continue;
            const b = us[j];
            const dx = a.x - b.x,
              dz = a.z - b.z;
            const min = a.r + b.r,
              d2 = dx * dx + dz * dz;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2);
            // Coincident spawns need a deterministic direction, too.
            const nx = d > 0.0001 ? dx / d : 1;
            const nz = d > 0.0001 ? dz / d : 0;
            const push = (min - d) * 0.5 * Math.min(1, dt * 8);
            if (a.order !== "hold" && this.canStep(a, a.x + nx * push, a.z + nz * push)) {
              a.x += nx * push;
              a.z += nz * push;
              a.y = this.travelHeight(a.x, a.z);
            }
            if (b.order !== "hold" && this.canStep(b, b.x - nx * push, b.z - nz * push)) {
              b.x -= nx * push;
              b.z -= nz * push;
              b.y = this.travelHeight(b.x, b.z);
            }
          }
        }
    }
  }

  sendDelegation(team:number,kind:"trade"|"peace"|"gift") {return sendDelegation(this,team,kind);}

  workerAI(u: Unit, dt: number) {
    if(foundingJourneyAI(this,u,dt))return;
    if(scoutAI(this,u,dt))return;
    if(visitorAI(this,u,dt))return;
    if(u.recalled) {
      if(this.steer(u,dt)) {
        if(u.carryType&&u.carry>0){deliverSamples(this,u);if(u.carryType==="food")receiveFood(this,u.team,u.carry,u.carryFood);else this.tribe(u.team)[u.carryType]+=u.carry;u.carry=0;u.carryType=null;u.carryFood=undefined;}
        u.recalled=undefined;u.stationOnArrival=undefined;u.order="hold";u.workReason="Home after the recall horn — awaiting orders";
      }
      return;
    }
    if(delegationAI(this,u,dt))return;
    if(cropStudyAI(this,u,dt))return;
    if(weaponWorkAI(this,u,dt))return;
    if (isDependent(this, u)) {
      u.node = null;
      u.target = null;
      u.order = "idle";
      u.workReason = "Growing up — supported by the village";
      return;
    }
    if (u.drill != null) {
      this.drillAI(u, dt);
      return;
    }
    if (u.order === "hold") return;
    if (u.order === "trade") {
      this.tradeAI(u, dt);
      return;
    }
    if (u.order === "move") {
      if (this.steer(u, dt)) {
        if(u.recalled && u.carryType && u.carry>0) {
          this.tribe(u.team)[u.carryType]+=u.carry;u.carry=0;u.carryType=null;
        }
        u.order = u.stationOnArrival ? "hold" : "idle";
        if (u.stationOnArrival) u.workReason = "At your destination — waiting for orders";
        u.stationOnArrival = undefined;u.recalled=undefined;
      }
      return;
    }
    if (u.order === "attack" || u.order === "attackmove") {
      this.combatAI(u, dt);
      return;
    }
    if (u.order === "explore") {
      this.exploreAI(u, dt);
      return;
    }
    if (u.stuckT > 4 && u.node) {
      u.blockedTask = u.node.id;
      u.retryWorkAt = this.state.time + 30;
      u.node = null;
      u.order = u.carry>0?"return":"idle";
      u.stuckT = 0;
      u.workReason = "Route blocked; finding another task";
    }
    if (u.order === "idle") {
      this.workBoard.assign(this, u);
      return;
    }
    if (u.order === "build") {
      this.buildAI(u, dt);
      return;
    }
    if (u.order === "gather") {
      const node = u.node;
      if (u.carry > 0 && u.carryType && node && this.resKind(node) !== u.carryType) {
        u.order = "return";
        return;
      }
      if (!node || ("amount" in node && node.amount <= 0) || ("hp" in node && node.hp <= 0)) {
        u.order = "idle";
        u.node = null;
        return;
      }
      const foodKind="species" in node?"meat":"type" in node?(node.type==="farm"?node.crop?.kind||node.cropType||"grain":"fish"):node.kind==="fish"?"fish":node.cropCandidate||"berries";
      if(u.carry>0&&u.carryType==="food"&&u.carryFood&&foodKind!==u.carryFood){u.order="return";return;}
      if (u.team === 0 && "species" in node && !this.visibleAt(node.x, node.z)) {
        u.order = "idle"; u.node = null; u.workReason = "Lost sight of the herd — explore to find it again"; return;
      }
      if (u.team !== 0 && "species" in node && Math.hypot(node.x-this.campOf(u.team).x,node.z-this.campOf(u.team).z)>75) {
        u.node=null;u.order=u.carry>0?"return":"idle";u.workReason="Herd beyond safe gathering range — returning to local work";return;
      }
      const atSurface=()=>"w" in node?this.buildingWorkReached(u,node):"kind" in node&&node.kind==="fish"?this.height(u.x,u.z)>this.world.waterY+.12&&Math.hypot(u.x-node.x,u.z-node.z)<=7:Math.hypot(u.x-node.x,u.z-node.z)<=("species" in node?5:1.22);
      if (!atSurface()) {
        const spot="w" in node&&this.solidBuilding(node)?this.interactionSpot(u,node):"kind" in node&&node.kind==="fish"?fishingBank(this,u,node):this.nearestWalk(u,node.x,node.z);
        if(!spot){u.blockedTask=node.id;u.retryWorkAt=this.state.time+60;u.node=null;u.order=u.carry>0?"return":"idle";u.workReason="Workplace unreachable — finding another task";return;}
        u.tx = spot.x;
        u.tz = spot.z;
        if (this.steer(u, dt) && !atSurface()) {
          u.blockedTask = node.id;
          u.retryWorkAt = this.state.time + 60;
          u.node = null;
          u.order = u.carry>0?"return":"idle";
          u.workReason = "Cannot reach the work surface; finding another task";
        }
        return;
      }
      if ("type" in node && node.type === "warehouse") {
        preserveFood(this, u, node as Building, dt);
        return;
      }
      if ("type" in node && node.type === "farm") {
        farmWork(this, u, node as Building, dt);
        return;
      }
      const t = this.resKind(node) || u.job || "food";
      const g = GATHER[t];
      const winterForage =
        "kind" in node && node.kind === "forage" && calendar(this).phase === 3 ? 2.2 : 1;
      const winterFishing = calendar(this).phase === 3 && (("type" in node && node.type === "dock") || ("kind" in node && node.kind === "fish")) ? 2.5 : 1;
      const period = g.period * this.campBonus(u, t) * winterForage * winterFishing;
      u.gatherT += dt;
      u.stride += dt * 9;
      u.facing = Math.atan2(node.x - u.x, node.z - u.z);
      if (u.gatherT >= period) {
        u.gatherT = 0;
        if ("species" in node) {
          const prey = node as Critter;
          prey.hp -= 1;
          u.carry += 4;
          u.carryType = "food";
          u.carryFood = "meat";
          if (u.team === 0) this.addFloater(u.x, u.y + 1.8, u.z, "hunt +4", "#efe4b0");
          if (prey.hp <= 0) {
            prey.wanderT = 55 + Math.random() * 40;
            this.addBurst(prey.x, prey.y + 0.6, prey.z, "#8a5a3a", 8);
            u.order = "return";
            const drop = this.nearestDrop(u.x, u.z, u.team);
            if (drop) {
              u.tx = drop.x;
              u.tz = drop.z;
            }
          }
          return;
        }
        if("type" in node&&node.type==="dock"){catchDockFish(this,u,node);return;}
        if("type" in node&&node.type==="quarry"){digStone(this,u,node);return;}
        const rich = "rich" in node ? ((node as ResourceNode).rich ?? 1) : 1;
        let gained = 1;
        if (rich < 0.7) {
          gained = Math.random() < 0.42 ? 0 : 1;
        } else if (rich > 1.2) {
          gained = Math.random() < 0.28 ? 2 : 1;
        } else {
          const roll = Math.random();
          if (roll < 0.1) gained = 0;
          else if (roll > 0.93) gained = 2;
        }
        if (gained <= 0) {
          if (u.team === 0) this.addFloater(u.x, u.y + 1.8, u.z, "thin", "#b8a888");
        } else {
          u.carry += gained;
          u.carryType = t;
          u.carryFood=t==="food"?("type" in node&&node.type==="dock"||"kind" in node&&node.kind==="fish"?"fish":"berries"):undefined;
          if("kind" in node&&node.kind==="forage"){
            if(node.cropCandidate)u.carryFood=node.cropCandidate;
            collectSamples(u,node,gained);
          }
          if (u.team === 0) {
            if (gained > 1) this.addFloater(u.x, u.y + 1.8, u.z, "+" + gained, "#efe4b0");
            if (Math.random() < 0.35)
              this.onSfx(node && "kind" in node && node.kind === "fish" ? "splash" : "chop");
          }
        }
        if ("amount" in node) {
          node.amount--;
          if(node.kind==="forage"||node.kind==="fish")node.pressure=Math.min(1,(node.pressure||0)+0.035);
          if (node.amount <= 0) {
            node.amount = 0;
            if (node.kind === "tree") this.chopMarks.delete(node.id);
            node.regenT =
              node.kind === "tree"
                ? 1800 * (3 + Math.random() * 2)
                : node.kind === "forage"
                  ? 240 + (node.pressure||0)*900 + Math.random() * 120
                  : node.kind === "fish"
                    ? 55 + Math.random() * 40
                    : 190 + Math.random() * 80;
            this.addBurst(
              node.x,
              u.y + 1,
              node.z,
              t === "wood" ? "#3a5a28" : node.kind === "fish" ? "#7ec8d4" : "#888",
              6,
            );
          }
        }
        if (u.carry >= g.carry || ("amount" in node && node.amount <= 0)) {
          const drop = this.nearestDrop(u.x, u.z, u.team);
          if (drop) {
            u.order = "return";
            u.tx = drop.x;
            u.tz = drop.z;
          } else u.order = "idle";
        }
      }
      return;
    }
    if (u.order === "return") {
      const candidates=this.state.buildings.filter(b=>b.team===u.team&&this.finished(b)&&["townhall","warehouse","cornerstone"].includes(b.type))
        .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
      let drop:Building|undefined,spot:{x:number;z:number}|null=null;
      for(const b of candidates){const p=this.interactionSpot(u,b);if(p){drop=b;spot=p;break;}}
      if(!drop||!spot){
        if(candidates.length&&!this.walkable(u.x,u.z)){u.tx=candidates[0].x;u.tz=candidates[0].z;this.steer(u,dt);u.workReason="Finding a way off blocked ground with supplies";}
        else {u.stuckT+=dt;u.workReason="No reachable store — carrying supplies; clear a route or build a local store";}
        return;
      }
      u.tx=spot.x;u.tz=spot.z;
      // Deliver along the reachable store frontage, not one exact shared point.
      // Otherwise congestion can hold a row of carriers next to the entrance.
      const dx=Math.abs(u.x-drop.x)-(drop.w*.4+u.r),dz=Math.abs(u.z-drop.z)-(drop.d*.4+u.r);
      const frontage=(dx>=0||dz>=0)&&Math.hypot(Math.max(0,dx),Math.max(0,dz))<=1.8;
      if(!frontage&&Math.hypot(u.x-spot.x,u.z-spot.z)>1){this.steer(u,dt);return;}
      if (u.carry > 0 && u.carryType) {
        const tr = this.tribe(u.team);
        deliverSamples(this,u);
        if(u.carryType==="food")receiveFood(this,u.team,u.carry,u.carryFood);else tr[u.carryType] += u.carry;
        if (u.team === 0) this.addFloater(drop.x, drop.y + 3, drop.z, "+" + u.carry, "#efe4b0");
        if (u.team === 0) this.onSfx("drop");
        u.carry = 0;
        u.carryType = null;
        u.carryFood = undefined;
      }
      u.tradeTeam = 0;
      u.node = null;
      u.order = "idle";
      if(u.type==="worker")this.workBoard.assign(this, u);
      else {u.order="hold";u.target=null;u.pillage=-1;u.workReason="Loot delivered — awaiting orders";}
    }
  }

  tradeAI(u: Unit, dt: number) {
    const deal = u.trade;
    if (!deal) {
      u.order = "idle";
      return;
    }
    if (u.carry !== deal.giveAmt || u.carryType !== deal.give) {
      u.trade = null; u.tradeTeam = 0; u.order = "return";
      this.banner("The shipment was damaged or stolen. The carrier is returning with what remains.", 4);
      return;
    }
    const rival = (u.tradeTeam ? this.tribe(u.tradeTeam) : null) || this.pickTradeRival();
    const hall = rival
      ? this.state.buildings.find((b) => b.team === rival.id && b.type === "townhall" && b.hp > 0)
      : null;
    if (!rival || !hall || rival.hostile) {
      u.trade = null;
      u.tradeTeam = 0;
      u.order = "return";
      this.banner(rival?.hostile ? "Trade called off" : "The traders turn back", 1.6);
      return;
    }
    const entrance=this.interactionSpot(u,hall);
    if(!entrance){u.trade=null;u.order="return";u.workReason="No reachable meeting place — bringing the offer home";return;}
    u.tx=entrance.x;u.tz=entrance.z;
    if (!this.buildingWorkReached(u,hall)) {
      this.steer(u, dt);
      return;
    }
    if(u.customOffer) {
      const quote=quoteShipment(this,rival.id,deal.give,deal.get,deal.giveAmt,u);
      u.customOffer=undefined;
      if(!quote.deal){u.trade=null;u.order="return";this.banner(quote.reason+" Your trader is bringing the offer home.",5);return;}
      if(quote.deal.getAmt<deal.getAmt) {
        deal.getAmt=quote.deal.getAmt;
        this.banner("They countered with a smaller shipment; your trader accepted the local terms.",5);
      }
    }
    const issue = shipmentIssue(this, rival.id, deal);
    if (issue) {
      u.trade = null;
      u.order = "return";
      this.banner(issue + " The carrier is bringing supplies home.", 4);
      return;
    }
    rival[deal.get] -= deal.getAmt;
    rival[deal.give] += deal.giveAmt;
    u.carry = deal.getAmt; // Every returned unit was deducted from the seller.
    u.carryType = deal.get;
    u.carryFood = deal.get==="food"?"provisions":undefined;
    u.workReason = "Bringing traded goods home";
    rival.trust = Math.min(1, (rival.trust || 0) + 0.15);
    rival.tension = Math.max(0, rival.tension - 0.12);
    this.addFloater(u.x, u.y + 2.4, u.z, "+" + deal.getAmt, "#efe4b0");
    this.banner("Traded with " + rival.name, 1.8);
    u.trade = null;
    // Keep the destination marker until payment reaches storage, for courier travel pace.
    const drop = this.nearestDrop(u.x, u.z, 0);
    if (drop) {
      u.order = "return";
      u.tx = drop.x;
      u.tz = drop.z;
    } else u.order = "idle";
    this.onSfx("place");
  }

  acquireTarget(u: Unit, radius: number) {
    let best: Unit | Building | null = null;
    let bd = radius * radius;
    for (const o of this.state.units) {
      if (
        (o.envoy?.kind === "peace" && o.envoy.team === u.team) ||
        o.hp <= 0 || o.shelterId ||
        o.team === u.team ||
        !this.isFoe(u.team, o.team) ||
        (u.team === 0 && !this.visibleAt(o.x, o.z))
      )
        continue;
      const d = (o.x - u.x) ** 2 + (o.z - u.z) ** 2;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    if (!best && (u.team !== 0 || u.order === "attack" || u.order === "attackmove")) {
      for (const b of this.state.buildings) {
        if (
          b.hp <= 0 ||
          b.team === u.team ||
          !this.isFoe(u.team, b.team) ||
          (u.team === 0 && !this.visibleAt(b.x, b.z))
        )
          continue;
        const d = (b.x - u.x) ** 2 + (b.z - u.z) ** 2;
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
    }
    return best;
  }

  attackDistance(u:Unit,t:Unit|Building){
    if(t.kind==="unit")return Math.hypot(u.x-t.x,u.z-t.z);
    return Math.hypot(Math.max(0,Math.abs(u.x-t.x)-t.w*.4),Math.max(0,Math.abs(u.z-t.z)-t.d*.4));
  }

  dealDamage(attacker: Unit | Building, target: Unit | Building) {
    if(!target||target.hp<=0||target.team===attacker.team)return;
    const skill=attacker.kind==="unit"?combatPractice(attacker):1;
    const dmg = ("dmg" in attacker ? attacker.dmg * predisposition(attacker).fighting * predisposition(attacker).strength * skill : 8) * this.dmgMul(attacker.team,attacker.x,attacker.z);
    if(attacker.kind==="unit")attacker.combatXP=Math.min(150,(attacker.combatXP||0)+.2);
    this.applyCombatDamage(attacker.team,target,dmg);
  }

  applyCombatDamage(attackerTeam:number,target:Unit|Building,dmg:number) {
    if(!target || target.hp<=0 || !Number.isFinite(dmg) || dmg<=0 || target.team===attackerTeam)return;
    target.hp -= dmg;
    this.addBurst(target.x, ("y" in target ? target.y : 0) + 1, target.z, "#c44", 3);
    if (attackerTeam === 0 || target.team === 0) this.onSfx("hit");
    if (attackerTeam === 0 && target.team !== 0 && target.team !== 3)
      this.makeHostile(target.team);
    if (target.team === 0 && attackerTeam !== 0 && attackerTeam !== 3)
      this.makeHostile(attackerTeam);
    if (target.hp <= 0) {
      if (
        target.kind === "unit" &&
        target.type === "worker" &&
        attackerTeam === 0 &&
        (target.team === 1 || target.team === 2) &&
        this.popNow(0) < this.popCap(0) &&
        !isDependent(this, target)
      ) {
        if([1,2].includes(target.team))this.state.conquestAt=this.state.time;
        target.team = 0;
        target.hp = Math.max(16, Math.round(target.maxHp * 0.45));
        target.order = target.carry>0 ? "return" : "move";
        target.pillage = -1;
        target.target = null;
        target.job = null;target.scout=undefined;target.envoy=undefined;target.visit=undefined;target.foundingJourney=undefined;target.studyCrop=undefined;target.weaponWork=undefined;target.emergency=undefined;target.drill=undefined;target.trade=null;target.tradeTeam=0;
        const home = this.campOf(0);
        target.tx = home.x;
        target.tz = home.z;
        this.banner("Taken — they walk to your camp", 1.8);
        this.onSfx("train");
        return;
      }
      target.hp = 0;
      if(attackerTeam===0&&[1,2].includes(target.team))this.state.conquestAt=this.state.time;
      this.addBurst(target.x, target.y + 1, target.z, target.team === 0 ? "#888" : "#e07030", 12);
      if (target.kind === "building" && attackerTeam !== target.team)
        this.lootBuilding(attackerTeam, target);
      this.addFloater(
        target.x,
        target.y + 2.4,
        target.z,
        target.kind === "building" ? (target.type === "townhall" ? "Fallen" : "Burned") : "Fallen",
        "#c44",
      );
      if (target.kind === "building") this.state.walkDirty = true;
      if (target.kind === "building" && attackerTeam === 0) this.tickRegions();
      if (target.kind === "building" && target.team === 0) this.defendHome(0);
      if (target.kind === "building" && (target.team === 1 || target.team === 2))
        this.defendHome(target.team);
      if (target.kind === "unit") {
        for (const u of this.state.units) {
          if (u.target === target) u.target = null;
        }
      }
      if (target.kind === "unit" && target.type === "leader") {
        const tr = this.tribe(target.team);
        if (tr) this.banner(tr.leader + " of " + tr.name + " has fallen", 2.4);
      }
      if (target.team === 0 || attackerTeam === 0) this.onSfx("death");
    }
  }

  fireArrow(from: Unit | Building, to: Unit | Building) {
    if(!to||to.hp<=0||to.team===from.team)return;
    const p: Projectile = {
      x: from.x,
      y: from.y + 1.4,
      z: from.z,
      tx: to.x,
      ty: to.y + 1,
      tz: to.z,
      target: to,
      speed: 22,
      life: 1.1,
      dmg: ("dmg" in from ? from.dmg * predisposition(from).fighting * predisposition(from).strength * combatPractice(from) : 8) * this.dmgMul(from.team, from.x, from.z),
      team: from.team,
    };
    if(from.kind==="unit")from.combatXP=Math.min(150,(from.combatXP||0)+.2);
    this.state.projectiles.push(p);
    if (from.team === 0 || to.team === 0) this.onSfx("bow");
    if (this.state.projectiles.length > 48)
      this.state.projectiles.splice(0, this.state.projectiles.length - 48);
  }

  lootBuilding(attackerTeam: number, b: Building) {
    const victim = this.tribe(b.team);
    const raider = this.tribe(attackerTeam);
    if (!victim || !raider || b.team === attackerTeam || b.lootClaimed) return;
    b.lootClaimed=true; b.lootTeam=attackerTeam;
    const take = (
      key: "food" | "wood" | "stone" | "copper" | "iron",
      frac: number,
      cap: number,
    ) => {
      const n = Math.min(victim[key], cap, Math.max(0, Math.floor(victim[key] * frac)));
      if (n <= 0) return 0;
      victim[key] -= n;
      b.raidLoot ??= {};
      b.raidLoot[key]=(b.raidLoot[key]||0)+n;
      return n;
    };
    let food = 0;
    let wood = 0;
    let stone = 0;
    let copper = 0;
    let iron = 0;
    if (b.type === "warehouse" || b.type === "townhall") {
      food = take("food", 0.35, 160);
      wood = take("wood", 0.3, 80);
      stone = take("stone", 0.25, 48);
    } else if (b.type === "lumber") wood = take("wood", 0.3, 48);
    else if (b.type === "quarry") stone = take("stone", 0.3, 36);
    else if (b.type === "farm" || b.type === "hut" || b.type === "dock")
      food = take("food", 0.15, 36);
    else if (b.type === "forge") {
      copper = take("copper", 0.5, 12);
      iron = take("iron", 0.5, 8);
    } else food = take("food", 0.05, 12);
    if (attackerTeam !== 0) return;
    const bits = [
      food ? food + " food" : "",
      wood ? wood + " logs" : "",
      stone ? stone + " stone" : "",
      copper ? copper + " copper" : "",
      iron ? iron + " iron" : "",
    ].filter(Boolean);
    this.banner(bits.length ? "Stores exposed: " + bits.join(", ") + " — raiders must carry them home" : "Burned — the stores were empty", 1.8);
  }

  combatAI(u: Unit, dt: number) {
    if(u.order==="attack"&&u.target&&u.target.team!==u.team&&!this.isFoe(u.team,u.target.team)) {
      if(Math.hypot(u.x-u.target.x,u.z-u.target.z)>Math.max(8,u.range+2)) {
        u.tx=u.target.x;u.tz=u.target.z;this.steer(u,dt);return;
      }
      this.makeHostile(u.team===0?u.target.team:u.team);
    }

    if(u.team>0&&u.team!==3&&u.pillage===0) {
      const home=this.campOf(0);
      if(Math.hypot(u.x-home.x,u.z-home.z)<30 || (u.target?.team===0 && Math.hypot(u.x-u.target.x,u.z-u.target.z)<20))this.makeHostile(u.team);
    }

    if(u.team===0 && u.pillage>0 && u.pillage!==3) {
      const observed=this.state.buildings.find(b=>b.team===u.pillage&&b.hp>0&&Math.hypot(u.x-b.x,u.z-b.z)<20);
      if(observed)this.makeHostile(observed.team);
    }

    u.cd = Math.max(0, u.cd - dt);
    if (u.order === "hold") {
      const t = this.acquireTarget(u, u.range + 1);
      if (
        t &&
        u.cd <= 0 &&
        this.attackDistance(u,t) <= u.range + (t.kind === "unit" ? t.r + 0.35 : 0.5)
      ) {
        u.cd = u.rof;
        u.facing = Math.atan2(t.x - u.x, t.z - u.z);
        if (u.type === "archer" || u.type === "ranger") this.fireArrow(u, t);
        else this.dealDamage(u, t);
      }
      return;
    }
    if (u.order === "move") {
      if (this.steer(u, dt)) u.order = "idle";
      return;
    }
    if (u.order === "attackmove") {
      const t =
        this.acquireTarget(u, 16) ||
        (u.target && u.target.hp > 0 && (u.team !== 0 || this.visibleAt(u.target.x, u.target.z))
          ? u.target
          : null);
      if (t) {
        u.target = t;
        u.order = "attack";
      } else if (this.steer(u, dt)) {
        u.attackDestination = null;
        u.order = "idle";
      }
    }
    if (u.order === "idle") {
      const t = this.acquireTarget(u, u.type === "archer" || u.type === "ranger" ? 13 : 7);
      if (t) {
        const foe = this.tribe(t.team);
        if (!(u.team === 0 && foe && !foe.hostile)) {
          u.target = t;
          u.order = "attack";
        }
      }
      return;
    }
    if (u.order === "attack") {
      if(u.target?.kind==="building"){
        const nearby=this.acquireTarget(u,Math.max(6,u.range+3));
        if(nearby?.kind==="unit")u.target=nearby;
      }
      const t = u.target;
      if (
        !t ||
        t.hp <= 0 ||
        !this.isFoe(u.team, t.team) ||
        (u.team === 0 && !this.visibleAt(t.x, t.z))
      ) {
        u.target = null;
        if (u.pillage >= 0) {
          const next = this.nextPillage(u);
          if (next) {
            u.target = next.hp>0 && this.visibleAt(next.x, next.z) ? next : null;
            u.tx = next.x;
            u.tz = next.z;
            u.attackDestination = { x: next.x, z: next.z };
            u.order = u.target ? "attack" : "attackmove";
            return;
          }
          u.pillage = -1;
        }
        if (u.attackDestination) {
          u.tx = u.attackDestination.x;
          u.tz = u.attackDestination.z;
          u.order = "attackmove";
        } else u.order = "idle";
        return;
      }
      u.tx = t.x;
      u.tz = t.z;
      const d = this.attackDistance(u,t);
      const reach = u.range + (t.kind === "building" ? 0.5 : t.r + 0.35);
      if (d > reach) this.steer(u, dt);
      else {
        u.facing = Math.atan2(t.x - u.x, t.z - u.z);
        u.stride += dt * 10;
        if (u.cd <= 0) {
          u.cd = u.rof;
          if (u.type === "archer" || u.type === "ranger") this.fireArrow(u, t);
          else this.dealDamage(u, t);
        }
      }
    }
  }

  barbarianAI(u: Unit, dt: number) {
    if(u.order==="move" && u.team!==3){this.combatAI(u,dt);return;}
    if (campRaidAI(this, u, dt)) return;
    u.wanderT -= dt;
    u.aggroT -= dt;
    if (u.type === "leader") {
      const hall = this.state.buildings.find(
        (b) => b.team === u.team && b.type === "townhall" && b.hp > 0,
      );
      const near = this.acquireTarget(u, 10);
      if (near) {
        u.target = near;
        u.order = "attack";
        this.combatAI(u, dt);
        return;
      }
      if (hall) {
        if (Math.hypot(u.x - hall.x, u.z - hall.z) > 7) {
          u.tx = hall.x + 2;
          u.tz = hall.z + 1.5;
          u.order = "move";
        } else if (u.wanderT <= 0) {
          u.wanderT = 4 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          u.tx = hall.x + Math.cos(a) * 3.5;
          u.tz = hall.z + Math.sin(a) * 3.5;
          u.order = "move";
        }
        this.steer(u, dt);
      }
      return;
    }
    if (u.order === "hold") return;
    if (u.order === "attack" && u.target && u.target.hp > 0) {
      this.combatAI(u, dt);
      return;
    }
    const tr = this.tribe(u.team);
    const hall = this.state.buildings.find(
      (b) => b.team === u.team && b.type === "townhall" && b.hp > 0,
    );
    let near: Unit | Building | null = null;
    if (tr.hostile || tr.ally || u.team === 3) {
      near = this.acquireTarget(u, u.team === 3 ? 22 : 14);
    } else if (hall) {
      const campR = 16;
      if (Math.hypot(u.x - hall.x, u.z - hall.z) < campR) {
        near = this.acquireTarget(u, 10);
        if (near && near.kind === "unit" && (near.type === "worker" || near.order === "trade"))
          near = null;
        if (near && Math.hypot(near.x - hall.x, near.z - hall.z) > campR + 2) near = null;
      }
    }
    if (near) {
      u.target = near;
      u.order = "attack";
      this.combatAI(u, dt);
      return;
    }
    if (u.order === "attackmove" || u.order === "move") {
      this.combatAI(u, dt);
      return;
    }
    if (u.wanderT <= 0 || Math.hypot(u.x - u.tx, u.z - u.tz) < 0.8) {
      u.wanderT = 2.5 + Math.random() * 4;
      const hall = this.state.buildings.find(
        (b) => b.team === u.team && b.type === "townhall" && b.hp > 0,
      );
      const cx = hall ? hall.x : u.x;
      const cz = hall ? hall.z : u.z;
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 9;
      u.tx = cx + Math.cos(a) * r;
      u.tz = cz + Math.sin(a) * r;
      u.order = "move";
    }
    this.steer(u, dt);
  }

  updateProjectiles(dt: number) {
    const ps = this.state.projectiles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      const t = p.target;
      const gx = t && t.hp > 0 ? t.x : p.tx;
      const gy = t && t.hp > 0 ? t.y + 1 : p.ty;
      const gz = t && t.hp > 0 ? t.z : p.tz;
      const d = Math.hypot(p.x - gx, p.y - gy, p.z - gz);
      if (d < 0.7 || p.life <= 0) {
        if(t && t.hp>0)this.applyCombatDamage(p.team,t,p.dmg);
        ps.splice(i, 1);
        continue;
      }
      const sp = p.speed * dt;
      p.x += ((gx - p.x) / d) * sp;
      p.y += ((gy - p.y) / d) * sp;
      p.z += ((gz - p.z) / d) * sp;
    }
  }

  updateTraining(dt: number) {
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || b.build < 1 || !b.queue.length) continue;
      const q = b.queue[0];
      q.t += dt;
      if (q.t < q.max) continue;
      b.queue.shift();
      const d = UNITS[q.unit];
      const tr = this.tribe(b.team);
      const refund = () => {
        if (!tr || !d) return;
        tr.food += d.food;
        tr.wood += d.wood;
        tr.stone += d.stone;
        tr.copper += d.copper || 0;
        tr.iron += d.iron || 0;
      };
      if (q.unit === "worker") {
        refund(); // Return the cost of obsolete worker queues loaded from older saves.
        continue;
      }
      const adult = this.state.units.find(
        (u) => u.team === b.team && u.hp > 0 && u.type === "worker" && !isDependent(this, u) && !u.expedition && !u.scout && !u.visit && !u.foundingJourney && !u.envoy && !u.emergency && !u.recalled && u.carry===0 && ["idle","gather","hold"].includes(u.order),
      );
      if (!adult || this.popNow(b.team) > this.popCap(b.team)) {
        refund();
        if (b.team === 0) this.banner("No free adult to arm", 1.6);
        continue;
      }
      adult.type = q.unit==="spearman"&&tr.age<3?"worker":q.unit;
      adult.hp = Math.round(d.hp * AGE_STAT[tr?.age ?? 0]);
      adult.maxHp = adult.hp;
      adult.speed = d.speed;
      adult.range = d.range;
      adult.dmg = d.dmg * AGE_STAT[tr?.age ?? 0];
      adult.rof = d.rof;
      adult.r = d.r;
      adult.order = "idle";
      adult.job = null;
      adult.node = null;
      adult.militia = q.unit==="spearman"&&tr.age<3;
      if (b.team === 0) {
        this.onSfx("train");
        this.addFloater(adult.x, adult.y + 2, adult.z, d.name, "#c9e8a0");
      }
    }
  }

  drillAI(u: Unit, dt: number) {
    const tr = this.tribe(u.team);
    if (!tr || tr.age < 1 || reserveSeconds(this, u.team) < 420) {
      u.drill = undefined;
      u.order = "idle";
      u.jobLock = false;
      u.workReason = "Drill stopped — the stores are thin";
      return;
    }
    const spot=this.state.buildings.find(b=>b.team===u.team&&b.type==="barracks"&&this.finished(b));
    const entrance=spot&&this.interactionSpot(u,spot);
    if(!spot||!entrance){u.workReason="Practice needs a completed, reachable barracks";return;}
    if(!this.buildingWorkReached(u,spot)){u.tx=entrance.x;u.tz=entrance.z;this.steer(u,dt);u.workReason="Walking to practice";return;}
    u.drill=(u.drill||0)+dt;u.stride+=dt*6;tr.food=Math.max(0,tr.food-.03*dt);
    u.workReason="Combat practice · "+Math.min(100,Math.floor(100*u.drill/36))+"%";
    if(u.drill<36)return;
    u.combatXP=Math.min(150,(u.combatXP||0)+6);u.drill=undefined;u.jobLock=false;u.order="idle";
    u.workReason="Combat practice complete — returning to civilian work";
    if(u.team===0)this.addFloater(u.x,u.y+2,u.z,"Practice complete","#c9e8a0");
  }

  welcomeSoul(team: number, x: number, z: number) {
    if (team === 0 && this.state.growthPolicy !== "welcome") return false;
    if (this.popNow(team) >= this.popCap(team)) return false;
    if (reserveSeconds(this, team) < 600) return false;
    const u = this.spawnUnit("worker", x + 6, z + 4, team);
    u.order = "move";
    u.tx = x;
    u.tz = z;
    if (team === 0) {
      this.banner("Kin from the paths join the village", 1.8);
      this.onSfx("birth");
    }
    return true;
  }

  markChop(ids: number[]) {
    let n = 0;
    for (const id of ids) {
      const tree = this.state.trees.find((t) => t.id === id && t.amount > 0);
      if (!tree || !this.exploredAt(tree.x, tree.z) || this.chopMarks.has(id)) continue;
      this.chopMarks.add(id);
      n++;
    }
    if (!n) {
      let cleared = 0;
      for (const id of ids) if (this.chopMarks.delete(id)) cleared++;
      if (cleared) { this.workBoard.reset(); this.banner("Cleared the tree marks", 1.2); }
      return 0;
    }
    // This is a work designation, not a recall order for soldiers, builders or haulers.
    this.workBoard.reset();
    this.banner(n + (n === 1 ? " tree marked — people will fell it" : " trees marked — people will fell them"), 1.6);
    this.onSfx("click");
    return n;
  }

  updateTowers(dt: number) {
    for (const b of this.state.buildings) {
      if (b.type !== "watchtower" || b.hp <= 0) continue;
      b.cd -= dt;
      if (b.cd > 0) continue;
      let best: Unit | null = null;
      let bd = 16 * 16;
      for (const u of this.state.units) {
        if (u.hp <= 0 || u.team === b.team) continue;
        if (b.team !== 0 && !this.tribe(b.team)?.hostile) {
          if (u.type === "worker" || u.order === "trade") continue;
          const hall = this.state.buildings.find(
            (h) => h.team === b.team && h.type === "townhall" && h.hp > 0,
          );
          if (hall && Math.hypot(u.x - hall.x, u.z - hall.z) > 16) continue;
        }
        const d = (u.x - b.x) ** 2 + (u.z - b.z) ** 2;
        if (d < bd) {
          bd = d;
          best = u;
        }
      }
      if (best) {
        b.cd = 1.15;
        this.fireArrow(b, best);
      }
    }
  }

  findOpenSpot(cx: number, cz: number, type: BldType, team: number) {
    if (type === "quarry") {
      for (const s of this.state.stones) {
        if (s.amount <= 0) continue;
        if (Math.hypot(s.x-cx,s.z-cz)>40) continue;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const x = Math.round((s.x + Math.cos(a) * 4.2) / TILE) * TILE;
          const z = Math.round((s.z + Math.sin(a) * 4.2) / TILE) * TILE;
          if (this.placementValid(type, x, z, team)) return { x, z };
        }
      }
    }
    if (type === "lumber") {
      for (const t of this.state.trees) {
        if (t.amount <= 0) continue;
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const x = Math.round((t.x + Math.cos(a) * 6) / TILE) * TILE;
          const z = Math.round((t.z + Math.sin(a) * 6) / TILE) * TILE;
          if (this.placementValid(type, x, z, team) && Math.hypot(x - cx, z - cz) < 36)
            return { x, z };
        }
      }
    }
    const maxR = type === "farm" ? 44 : 28;
    for (let r = 6; r < maxR; r += 2) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        const sx = Math.round(x / TILE) * TILE;
        const sz = Math.round(z / TILE) * TILE;
        if (this.placementValid(type, sx, sz, team)) return { x: sx, z: sz };
      }
    }
    return null;
  }

  rivalTick(team: number, dt: number) {
    if (team === 3) return;
    const tr = this.tribe(team);
    if (!tr || !tr.alive) return;
    const hall = this.state.buildings.find(
      (b) => b.team === team && b.type === "townhall" && b.hp > 0,
    );
    if (!hall) {
      tr.alive = false;
      tr.fallenT = this.state.time;
      if(this.started&&this.visibleAt(this.campOf(team).x,this.campOf(team).z)) this.banner(tr.name + " has lost its hall; survivors may rebuild", 3);
      return;
    }
    tr.thinkT -= dt;
    if (tr.thinkT > 0) return;
    tr.thinkT = 1.6 + Math.random();

    const costScale = 0.92;
    const pop = this.popNow(team);
    if(reserveSeconds(this,team)>450&&tr.wood>50&&!tr.cropTrial)
      for(const kind of CROPS)if((tr.cropSamples?.[kind]||0)>=4&&!tr.cultivated?.includes(kind)){beginCropTrial(this,kind,team);break;}
    const cap = this.popCap(team);
    const stage =
      !tr.hostile && this.state.time < 90 && tr.age < 1
        ? 1
        : tr.hostile && (tr.age >= 2 || this.state.time > 110)
          ? 3
          : 2;

    const fortune = this.tribeFortune(team);
    const growing = fortune > 2.1;
    const shrinking = fortune < 0.95;
    const reserve = reserveSeconds(this, team);
    const plannedStorage=this.stockCap(team)+this.state.buildings.filter(b=>b.team===team&&b.type==="warehouse"&&b.hp>0&&!this.finished(b)).length*160;
    const needsStorage=plannedStorage<foodDemand(this,team)*1800+100;

    // A shortage changes actual labor before optional investment or travel.
    if (reserve < 240) {
      for (const u of this.state.units) {
        if (u.team !== team || u.type !== "worker" || u.hp <= 0 || isDependent(this,u) ||
            u.emergency || u.visit || u.scout || u.foundingJourney || u.expedition || u.carry > 0) continue;
        const field = u.node && "type" in u.node && u.node.type === "farm";
        const preparingField = field && calendar(this).phase < 2;
        if (u.order === "build" || (u.order === "gather" && ((!field && u.job !== "food") || (preparingField && reserve < 90)))) {
          u.order = "idle"; u.node = null; u.jobLock = false; u.drill = undefined;
          u.workCheckAt = 0;
          this.workBoard.assign(this,u);
        }
      }
    }

    if (reserve > 600 && tr.age < 5 && pop >= (AGE_COST[tr.age + 1]?.pop || 0) * (growing ? 0.75 : 0.95)) {
      const c = AGE_COST[tr.age + 1];
      if (
        c &&
        tr.food > (c.food || 0) * costScale &&
        tr.wood > (c.wood || 0) * costScale &&
        Math.random() < tr.tech + (growing ? 0.38 : 0.08)
      ) {
        this.tryAgeUp(team);
      }
    }

    if (tr.age>=1 && !needsStorage && growing && reserveSeconds(this, team) > 1400 && Math.random() < 0.4) {
      const adult = this.state.units.find(
        (u) =>
          u.team === team &&
          u.hp > 0 &&
          u.type === "worker" &&
          u.drill == null && !u.scout && !u.visit && !u.foundingJourney && !u.expedition && !u.envoy && !u.emergency && u.carry===0 &&
          !isDependent(this, u),
      );
      if (adult) adult.drill = 0;
    }

    if (
      cap - pop < 3 &&
      reserve > 450 &&
      tr.wood >= 36 &&
      Math.random() < tr.expand * (growing ? 1.4 : shrinking ? 0.2 : 0.9)
    ) {
      const spot = this.findOpenSpot(hall.x, hall.z, "hut", team);
      if (spot) this.placeBuilding("hut", spot.x, spot.z, team);
    }

    const farms = this.state.buildings.filter(
      (b) => b.team === team && b.type === "farm" && b.hp > 0,
    ).length;
    if (needsStorage && tr.wood >= BUILDINGS.warehouse.wood) {
      const spot=this.findOpenSpot(hall.x,hall.z,"warehouse",team);
      if(spot)this.placeBuilding("warehouse",spot.x,spot.z,team);
    }
    if (team === 1 && reserve > 450 && !needsStorage) {
      if (!this.hasBld(team, "quarry") && tr.wood >= 36 && Math.random() < 0.55) {
        const spot = this.findOpenSpot(hall.x, hall.z, "quarry", team);
        if (spot) this.placeBuilding("quarry", spot.x, spot.z, team);
      }
      if (!this.hasBld(team, "cairn") && tr.stone >= 30 && Math.random() < 0.4) {
        const st = this.state.stones.find(
          (n) => n.amount > 0 && Math.hypot(n.x - hall.x, n.z - hall.z) < 40,
        );
        const spot = this.findOpenSpot(
          st ? st.x : hall.x + 10,
          st ? st.z : hall.z - 8,
          "cairn",
          team,
        );
        if (spot) this.placeBuilding("cairn", spot.x, spot.z, team);
      }
    }
    if (team === 2) {
      if ((!needsStorage||farms<3) && farms < Math.max(2 + tr.age, Math.ceil(foodDemand(this,team)*1800/130)+1) && tr.wood >= BUILDINGS.farm.wood && Math.random() < 0.62) {
        const spot = this.findOpenSpot(hall.x, hall.z, "farm", team);
        if (spot) this.placeBuilding("farm", spot.x, spot.z, team);
      }
      if (reserve > 450 && !this.hasBld(team, "grove") && tr.wood >= 30 && Math.random() < 0.45) {
        const fo = this.state.forage.find(
          (n) => n.amount > 0 && Math.hypot(n.x - hall.x, n.z - hall.z) < 36,
        );
        const spot = this.findOpenSpot(
          fo ? fo.x : hall.x - 10,
          fo ? fo.z : hall.z + 8,
          "grove",
          team,
        );
        if (spot) this.placeBuilding("grove", spot.x, spot.z, team);
      }
    }
    if ((!needsStorage||farms<3) && farms < Math.max(1 + tr.age, Math.ceil(foodDemand(this,team)*1800/130)+1) && tr.wood >= BUILDINGS.farm.wood && Math.random() < (team === 2 ? 0.25 : 0.5)) {
      const spot = this.findOpenSpot(hall.x, hall.z, "farm", team);
      if (spot) this.placeBuilding("farm", spot.x, spot.z, team);
    }

    if (reserve > 450 && !this.hasBld(team, "lumber") && tr.wood >= BUILDINGS.lumber.wood && Math.random() < 0.4) {
      const spot = this.findOpenSpot(hall.x, hall.z, "lumber", team);
      if (spot) this.placeBuilding("lumber", spot.x, spot.z, team);
    }
    if (!needsStorage && reserve > 450 && !this.hasBld(team, "quarry") && tr.wood >= 36 && Math.random() < 0.4) {
      const spot = this.findOpenSpot(hall.x, hall.z, "quarry", team);
      if (spot) this.placeBuilding("quarry", spot.x, spot.z, team);
    }

    if (growing && reserve > 700 && tr.wood > 50 && Math.random() < 0.45) {
      const spot = this.findOpenSpot(hall.x, hall.z, "hut", team);
      if (spot) this.placeBuilding("hut", spot.x, spot.z, team);
    }
    // Hunger affects every person through tickPeople. Empty settlements are
    // abandoned by tickCommunities after a grace period, not random AI damage.

    if (reserve > 600 && stage >= 2 && !this.hasBld(team, "barracks") && tr.wood >= 40) {
      const spot = this.findOpenSpot(hall.x, hall.z, "barracks", team);
      if (spot) this.placeBuilding("barracks", spot.x, spot.z, team);
    }

    const bar = this.state.buildings.find(
      (b) => b.team === team && b.type === "barracks" && b.hp > 0,
    );
    if (reserve > 700 && pop >= 7 && stage >= 2 && bar && bar.queue.length < 2) {
      const mil = this.state.units.filter(
        (u) => u.team === team && u.type !== "worker" && u.hp > 0,
      ).length;
      if (mil < 3 + tr.age * 2) {
        let kind: UnitType = "spearman";
        if (team === 1) kind = tr.age >= 1 && Math.random() < 0.55 ? "warden" : "spearman";
        else if (team === 2) kind = Math.random() < 0.65 ? "ranger" : "spearman";
        else if (tr.age >= 2 && Math.random() < 0.45) kind = "swordsman";
        else if (tr.age >= 1 && Math.random() < 0.4) kind = "archer";
        if (tr.age >= 4 && this.hasBld(team, "stables") && Math.random() < 0.35) {
          const st = this.state.buildings.find(
            (b) => b.team === team && b.type === "stables" && b.hp > 0,
          );
          if (st) this.enqueueTrain(st, "cavalry");
        } else this.enqueueTrain(bar, kind);
      }
    }

    tr.lastRaid -= 2;
    tr.intent = neighborIntent(this, team);
    if (
      tr.intent === "raid" &&
      tr.lastRaid <= 0 &&
      !tr.ally &&
      this.state.time >= (tr.compactUntil || 0)
    ) {
      const mil = this.state.units.filter(
        (u) => u.team === team && u.type !== "worker" && u.type !== "leader" && u.hp > 0,
      );
      const youThreat = this.raidThreat(0);
      const want = growing ? 0.28 : shrinking ? 0.08 : 0.16;
      if (mil.length >= 2 && Math.random() < want + tr.aggro * 0.25 + youThreat * 0.2) {
        tr.lastRaid = 360 + Math.random() * 180;
        tr.recoveryUntil = this.state.time + tr.lastRaid;
        const targets = this.state.buildings.filter(
          (b) => b.team === 0 && b.hp > 0 && b.type !== "townhall",
        );
        if (targets.length) {
          const t = targets[(Math.random() * targets.length) | 0];
          const n = shrinking ? 1 : 1 + ((Math.random() * Math.min(mil.length, 2 + tr.age)) | 0);
          for (const u of mil.slice(0, n)) {
            u.tx = t.x;
            u.tz = t.z;
            u.order = "attackmove";
            u.pillage=0;
            u.target = t;
          }
          if (this.started && mil.some(u=>this.visibleAt(u.x,u.z)))
            this.banner(tr.name + " strikes your " + (BUILDINGS[t.type]?.name || "camp"), 2);
        }
      } else tr.lastRaid = 14 + Math.random() * 20;
    }
  }

  checkVictory() {
    if (this.state.ended) return;
    if (this.state.founding) return;
    const th = this.state.buildings.find((b) => b.type === "townhall" && b.team === 0 && b.hp > 0);
    if ((!th || th.hp <= 0) && this.popNow(0)===0) {
      this.state.ended = "lose";
      this.state.endReason = "The Town Hall has fallen.";
      this.onSfx("lose");
      return;
    }
    const rivalsAlive = this.state.tribes
      .filter((t) => t.id === 1 || t.id === 2)
      .filter((t) => t.alive).length;
    if (this.state.conquestAt!==undefined && this.state.time-this.state.conquestAt<2 && rivalsAlive === 0 && !this.state.units.some(u=>[1,2].includes(u.team)&&u.hp>0) && this.state.time > 120) {
      this.state.ended = "win";
      this.state.endReason = "The last rival hall has fallen. The island is yours.";
      this.onSfx("win");
      return;
    }
    // Prosperity is a milestone, not a reason to stop an evolving settlement.

  }

  currentObjective() {
    if (this.state.founding) return "Plant the hall beside a clump of berries or timber.";
    if (this.state.units.some((u) => u.team === 0 && u.emergency))
      return "Alarm: civilians seek shelter; armed residents defend";
    if (reserveSeconds(this) < 120) return "Food reserves are low — prioritize food in Village (L)";
    const fields = this.state.buildings.filter(
      (b) => b.team === 0 && b.type === "farm" && this.finished(b),
    );
    const season = calendar(this);
    if (!this.tribe(0).cultivated?.length) {
      if (this.tribe(0).cropTrial) return "A resident is testing wild seeds — review the trial in Village (L)";
      if (Object.values(this.tribe(0).cropSamples||{}).some(n=>n>=4)) return "Seeds are home — begin a cultivation trial in Village (L)";
      return "Forage wild plants and bring seeds home before establishing fields";
    }
    if (!fields.length) return "Establish a farm for the seasonal harvest; keep foraging";
    if (season.phase === 0 && fields.some((b) => (b.crop?.planted || 0) < 1))
      return "Spring: sow your fields while food gatherers sustain the village";
    if (
      season.phase === 1 &&
      fields.some((b) => (b.crop?.planted || 0) > 0 && (b.crop?.tended || 0) < 1)
    )
      return "Summer: tend the fields and prepare storage";
    if (season.phase === 2 && fields.some((b) => (b.crop?.remaining || 0) > 0))
      return "Autumn: bring the harvest in before winter";
    if (!this.hasBld(0, "warehouse"))
      return "Build a storehouse to protect surplus food from spoilage";
    if (season.year === 0)
      return "Secure the first winter — review reserves and neighbors in Village (L)";
    const count = (type: BldType) =>
      this.state.buildings.filter((b) => b.type === type && b.team === 0 && b.hp > 0).length;
    if (this.popNow(0) < 6)
      return "Build food reserves and welcome migrants to grow the village";
    if (count("farm") < 1) return "Build a Farm  " + count("farm") + "/1";
    if (count("dock") < 1) return "Fishing Dock — put it on the white posts by the water";
    if (count("quarry") < 1)
      return "Raise a Quarry on a grey outcrop (logs only) — then people haul stone";
    if (this.tribe(0).age < 1) return "Build a surplus and advance to Bronze before forming a standing army";
    if (count("barracks") < 1) return "Raise a Barracks to equip existing adults";
    const spears = this.state.units.filter(
      (u) => u.team === 0 && u.type === "spearman" && u.hp > 0,
    ).length;
    if (spears < 2) return "Drill adult residents for defense; training takes time away from village work";
    if (this.tribe(0).age < 1) return "Advance to Bronze — copper for swordsmen";
    if (count("forge") < 1) return "Raise a Forge near copper";
    if (this.tribe(0).age < 2) return "Advance to the Iron Age";
    if (this.tribe(0).age < 3) return "Reach the Classical Age";
    if (this.tribe(0).age < 4) return "Reach the Medieval Age";
    if (this.tribe(0).age < 5) return "Found the Renaissance";
    const pop = this.popNow(0);
    if (pop < 28) return "Grow the realm  " + pop + "/28";
    const fighters = this.state.units.filter(
      (u) => u.team === 0 && u.hp > 0 && u.type !== "worker" && u.type !== "leader",
    ).length;
    if (fighters < 8) return "Field eight soldiers  " + fighters + "/8";
    return "Your realm is established — keep developing, trading and exploring";
  }

  seasonMix(): SeasonMix {
    const start = 6 * 3600 + 42 * 60;
    const t = start + this.state.time * DAY_RATE;
    const yearFrac = (this.state.time % 1800) / 1800;
    const w = (center: number) => {
      let d = Math.abs(yearFrac - center);
      if (d > 0.5) d = 1 - d;
      const full = 0.08;
      const zero = 0.22;
      if (d >= zero) return 0;
      if (d <= full) return 1;
      return 1 - (d - full) / (zero - full);
    };
    let spring = w(0.125);
    let summer = w(0.375);
    let autumn = w(0.625);
    let winter = this.state.time < 450 ? 0 : w(0.875);
    const s = spring + summer + autumn + winter || 1;
    spring /= s;
    summer /= s;
    autumn /= s;
    winter /= s;
    const name = calendar(this).name as SeasonMix["name"];
    const snow = Math.min(
      1,
      Math.max(0, winter * 1.2 - 0.08) + (this.state.weather === "frost" ? 0.12 : 0),
    );
    return { name, spring, summer, autumn, winter, snow, yearFrac };
  }

  clockState() {
    const start = 6 * 3600 + 42 * 60;
    const t = start + this.state.time * DAY_RATE;
    const day = 1 + Math.floor(this.state.time * DAY_RATE / 86400);
    const tod = ((t % 86400) + 86400) % 86400;
    const h = Math.floor(tod / 3600);
    const m = Math.floor((tod % 3600) / 60);
    const hh = (h < 10 ? "0" : "") + h;
    const mm = (m < 10 ? "0" : "") + m;
    let period = "Night";
    if (h >= 5 && h < 8) period = "Dawn";
    else if (h >= 8 && h < 12) period = "Morning";
    else if (h >= 12 && h < 17) period = "Afternoon";
    else if (h >= 17 && h < 21) period = "Dusk";
    const sn = this.seasonMix();
    const names: Record<Weather, string> = {
      clear: "Clear",
      mist: "Sea mist",
      rain: "Rain",
      storm: "Storm",
      frost: "Hard frost",
      golden: "Golden haze",
      flood: "Flood",
      drought: "Drought",
    };
    const temps: Record<Weather, number> = {
      clear: 0,
      mist: -3,
      rain: -2,
      storm: -5,
      frost: -8,
      golden: 2,
      flood: -1,
      drought: 4,
    };
    const base = sn.spring * 12 + sn.summer * 21 + sn.autumn * 10 + sn.winter * 0;
    let temp = Math.round(base + (temps[this.state.weather] ?? 0));
    if (h < 6 || h > 21) temp -= 3;
    let weather = names[this.state.weather] || "Clear";
    if (sn.snow > 0.55) {
      if (this.state.weather === "storm") weather = "Blizzard";
      else if (
        this.state.weather === "clear" ||
        this.state.weather === "mist" ||
        this.state.weather === "frost"
      )
        weather = "Snow";
    }
    return {
      day,
      time: hh + ":" + mm,
      period,
      weather: weather + " · " + temp + "°C",
      season: sn.name,
    };
  }

  dayPhase() {
    const start = 6 * 3600 + 42 * 60;
    const t = start + this.state.time * DAY_RATE;
    const tod = ((t % 86400) + 86400) % 86400;
    return tod / 86400;
  }

  isNight() {
    const hour = this.dayPhase() * 24;
    return hour < 4.7 || hour > 21.15;
  }

  nearTorch(x: number, z: number, team: number) {
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || b.team !== team || !this.finished(b)) continue;
      if (
        b.type !== "townhall" &&
        b.type !== "hut" &&
        b.type !== "watchtower" &&
        b.type !== "keep" &&
        b.type !== "lumber" &&
        b.type !== "barracks"
      )
        continue;
      if (Math.hypot(b.x - x, b.z - z) < 16) return true;
    }
    return false;
  }

  stockCap(team = 0) {
    let cap = 140;
    if (team === 0 && this.state.agePicks[0] === "econ") cap += 220;
    if (team === 0 && hasTradition(this, "winter-stores")) cap += 80;
    for (const b of this.state.buildings) {
      if (b.team !== team || !this.finished(b)) continue;
      if (b.type === "warehouse") cap += 160;
      else if (b.type === "townhall") cap += 80;
      else if (b.type === "hut") cap += 18;
    }
    return cap;
  }

  prestige() {
    const t = this.tribe(0);
    const owned = this.state.regions.filter((r) => r.owner === 0).length;
    const blds = this.state.buildings.filter((b) => b.team === 0 && this.finished(b)).length;
    const allies = this.state.tribes.filter((tr) => tr.id !== 0 && tr.alive && tr.ally).length;
    return Math.round(this.popNow(0) * 2 + owned * 14 + t.age * 22 + blds * 3 + allies * 12);
  }

  bankTrade(give: ResKind, get: ResKind) {
    const partner = this.pickTradeRival();
    if (!partner) { this.banner("Explore to find a willing trading partner", 3); return; }
    proposeShipment(this, partner.id, give, get, 20);
  }

  tickLumber() {
    for (const b of this.state.buildings) {
      if (b.type !== "lumber" || !this.finished(b)) continue;
      if(b.reclaimed){b.hp=0;if(this.state.selBld===b)this.clearSelect();this.workBoard.reset();continue;}
      let live = 0;
      for (const n of this.state.trees) {
        if (n.amount <= 0) continue;
        if (Math.hypot(n.x - b.x, n.z - b.z) <= LUMBER_R) live++;
      }
      if (live > 0) continue;
      b.reclaimed = true;b.hp=0;
      if(this.state.selBld===b)this.clearSelect();
      this.workBoard.reset();
      const back = Math.round((BUILDINGS.lumber.wood || 16) * 0.75);
      this.tribe(b.team).wood += back;
      if (b.team === 0) {
        this.addFloater(b.x, b.y + 3, b.z, "+" + back + " logs", "#c4e0a8");
        this.banner("The stand is spent — " + back + " logs return. Raise a new camp.", 2.4);
      }
    }
  }

  step(dt: number) {
    if (!this.started) return;
    const spd = this.state.speed >= 3 ? 4 : this.state.speed === 2 ? 2 : 1;
    const nightMul = 1;
    const sdt = this.state.paused || this.state.ended ? 0 : Math.min(dt * spd * nightMul, 0.34);
    if (this.state.walkDirty) this.rebuildWalk();

    if (sdt > 0) {
      this.navBudget = 4;
      try {
        this.state.time += sdt;
        for (const b of this.state.buildings)
          if (b.type === "farm" && this.finished(b)) {
            const c=crop(this,b);
            if(calendar(this).phase<2)c.water=Math.max(.35,Math.min(1,(c.water??1)+
              (this.state.weather==="drought" ? -(1-cropWater(this,b.x,b.z))*sdt/600 : sdt/(this.state.weather==="rain"?300:1800))));
          }
        for (const tr of this.state.tribes) {
          if (tr.tradeCd > 0) tr.tradeCd = Math.max(0, tr.tradeCd - sdt);
        }
        for (const u of this.state.units) {
          if (u.hp <= 0) continue;
          u.shelterId=undefined;
          u.vx = 0;
          u.vz = 0;
          try {
            if(u.recalled || (u.team!==3 && u.order==="return" && u.carry>0)){this.workerAI(u,sdt);continue;}
            if(raidLootAI(this,u,sdt))continue;
            if (emergencyResponse(this, u, sdt)) continue;
            if(expeditionAI(this,u,sdt))continue;
            if(routineRest(this,u,sdt))continue;
            if (u.team !== 0 && u.type === "worker") this.workerAI(u, sdt);
            else if (u.team !== 0) this.barbarianAI(u, sdt);
            else if (u.type === "worker") {
              if (u.order === "attack" || u.order === "attackmove") this.combatAI(u, sdt);
              else this.workerAI(u, sdt);
            } else this.combatAI(u, sdt);
          } catch {
            /* skip a bad unit rather than freeze the valley */
          }
        }
        this.separate(sdt);
        this.updateProjectiles(sdt);
        this.updateTraining(sdt);
        this.updateTowers(sdt);
        this.tickEvents(sdt);
        this.tickMarket(sdt);
        this.tickRaiders(sdt);
        this.tickSea(sdt);
        this.defendHome(0);
        if ((this.state.time | 0) % 2 === 0) {
          this.defendHome(1);
          this.defendHome(2);
        }
        this.tickWildlife(sdt);
        tickCommunities(this,sdt);
        tickScouts(this,sdt);
        fadeTrails(this,sdt);
        tickVisitors(this,sdt);
        this.tickRoutes(sdt);
        this.tickHarvest();
        this.tickRegions();
        this.tickLumber();
        this.tickYields(sdt);
        for (const b of this.state.buildings) {
          if (b.type === "townhall" && b.hp > 0 && b.hp < b.maxHp)
            b.hp = Math.min(b.maxHp, b.hp + 8 * sdt);
        }
        this.tickInfluence(sdt);
        this.tickRegen(sdt);
        this.tickPeople(sdt);
        this.updateVision(sdt);
        if (Math.floor(this.state.time) !== Math.floor(this.state.time - sdt)) recordDiscoveries(this);
        for (let i = 1; i < this.state.tribes.length; i++) this.rivalTick(i, sdt);

        for (const u of this.state.units) if (u.hp <= 0) this.paths.delete(u.id);
        this.state.units = this.state.units.filter((u) => u.hp > 0);
        this.checkVictory();
      } catch (err) {
        console.error(err);
      }
    }

    const vdt = Math.min(dt, 0.05);
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.life -= vdt;
      p.x += p.vx * vdt;
      p.y += p.vy * vdt;
      p.z += p.vz * vdt;
      p.vy -= 8 * vdt;
      if (p.life <= 0) this.state.particles.splice(i, 1);
    }
    for (let i = this.state.floaters.length - 1; i >= 0; i--) {
      const f = this.state.floaters[i];
      f.life -= vdt;
      f.y += 1.2 * vdt;
      if (f.life <= 0) this.state.floaters.splice(i, 1);
    }
    if (this.state.bannerT > 0) {
      this.state.bannerT -= vdt;
      if (this.state.bannerT <= 0) this.state.banner = "";
    }
  }

  entityAt(x: number, z: number): Unit | Building | null {
    let bestU: Unit | null = null;
    let bd = 2.0;
    for (const u of this.state.units) {
      if (u.hp <= 0 || u.shelterId || (u.team !== 0 && !this.visibleAt(u.x, u.z))) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d < bd) {
        bd = d;
        bestU = u;
      }
    }
    for (const b of this.state.buildings) {
      if (b.hp <= 0 || (b.team !== 0 && !this.visibleAt(b.x, b.z))) continue;
      if (Math.abs(b.x - x) < b.w * 0.55 && Math.abs(b.z - z) < b.d * 0.55)
        return bestU && bd < 1.2 ? bestU : b;
    }
    return bestU;
  }

  snapshot(): HudSnapshot {
    const t = this.tribe(0) || {
      food: 0,
      wood: 0,
      stone: 0,
      age: 0,
      name: "",
      color: "",
      alive: true,
      id: 0,
      short: "",
      aggro: 0,
      expand: 0,
      tech: 0,
      lastRaid: 0,
      thinkT: 0,
      hostile: false,
      tradeCd: 0,
    };
    const ck = this.clockState();
    const units = this.selectedUnits();
    let selection: HudSnapshot["selection"] = {
      name: "No selection",
      info: "C: people · B: buildings · H: controls",
      hp: 0,
      maxHp: 1,
      kind: "none",
    };
    if (units.length > 1) {
      selection = {
        name: units.length + " people",
        info: units.map((u) => UNITS[u.type]?.name || u.type).join(", "),
        hp: units.reduce((s, u) => s + u.hp, 0),
        maxHp: units.reduce((s, u) => s + u.maxHp, 0),
        kind: "units",
        type: units[0].type,
        team: 0,
        job:
          units.some((u) => u.drill != null)
            ? "drill"
            : units.find((u) => u.type === "worker")?.order === "hold"
              ? "hold"
              : (units.find((u) => u.type === "worker")?.job ?? null),
      };
    } else if (units.length === 1) {
      const u = units[0];
      const info = u.weaponWork || u.studyCrop || u.expedition || u.scout || u.foundingJourney || /^(Sleeping|Sheltering|Seeking shelter)/.test(u.workReason || "")
        ? u.workReason || "Traveling"
        : u.emergency
        ? u.workReason || "Responding to danger"
        : u.order === "idle" && u.type === "worker"
          ? u.workReason || "Looking for useful work"
          : u.order === "build"
            ? "Raising a building"
            : u.order === "gather"
              ? (u.workReason || "Gathering " + (u.job === "food" ? "food" : u.job || ""))
              : u.order === "return"
                ? "Returning"
                : u.order === "attack"
                  ? "Attacking"
                  : u.order === "move"
                    ? "Moving"
                    : u.order === "attackmove"
                      ? "Advance"
                      : u.order === "trade"
                        ? "Trading"
                        : u.order === "explore"
                          ? "Exploring"
                          : u.order === "hold"
                            ? "Resting"
                            : u.type === "worker"
                              ? "Working"
                              : "Ready — right-click to fight";
      const cap = u.carryType ? GATHER[u.carryType].carry : 8;
      selection = {
        name: (isDependent(this, u) ? "Young " : "") + personName(u),
        info: (u.expedition ? `${info} · journey food ${u.expedition.food.toFixed(1)}` : info) + ` · fatigue ${Math.round((u.fatigue||0)*100)}%`,
        hp: u.hp,
        maxHp: u.maxHp,
        kind: "unit",
        type: u.type,
        team: u.team,
        carry: u.carry > 0 && u.carryType ? (u.carryType==="food"?u.carryFood||"provisions":u.carryType) + " " + u.carry + "/" + cap : "",
        job: u.order === "hold" ? "hold" : u.job,
      };
    } else if (this.state.selBld && this.state.selBld.hp > 0) {
      const b = this.state.selBld;
      let info = b.raiderCamp ? "Local raider camp. Its finite band patrols nearby paths and steals supplies; destroy the camp to scatter survivors." : BUILDINGS[b.type]?.hint || "";
      if(b.type==="dock"&&this.finished(b))info+=" · "+fishingReport(this,b);
      if(b.type==="bridge"&&b.bridge)info+=` · ${Math.hypot(b.bridge.bx-b.bridge.ax,b.bridge.bz-b.bridge.az).toFixed(1)} m crossing · ${this.finished(b)?"open to people and cargo":"builders work from either reachable bank"}`;
      if(b.type==="quarry"&&this.finished(b))info+=" · "+quarryReport(this,b);
      if (b.build < 1)
        info = "Raising " + Math.floor(b.build * 100) + "% — gatherers must work the plot";
      if (b.queue.length) {
        const q = b.queue[0];
        info += " · " + (UNITS[q.unit]?.name || q.unit) + " " + Math.ceil(q.max - q.t) + "s";
        if (b.queue.length > 1) info += " (+" + (b.queue.length - 1) + ")";
      }
      selection = {
        name: b.raiderCamp ? "Raider camp" : BUILDINGS[b.type]?.name || b.type,
        info,
        hp: b.hp,
        maxHp: b.maxHp,
        kind: "building",
        type: b.type,
        team: b.team,
        buildingId: b.id,
        completed: this.finished(b),
        queue: b.queue.map((q) => UNITS[q.unit].name).join(", "),
        canRecycle: b.team === 0 && b.type !== "townhall",
      };
    } else {
      const enemy = this.state.units.find((u) => u.selected && u.team !== 0);
      if (enemy) {
        const tr = this.tribe(enemy.team);
        selection = {
          name: enemy.type === "leader" && tr ? tr.leader : tr?.name || "Rival",
          info:
            (enemy.type === "leader" && tr
              ? tr.leaderTitle + " of " + tr.name + " · " + tr.csType + " city-state"
              : enemy.team === 3
                ? "Sea raiders"
                : tr?.hostile
                  ? "Warring"
                  : tr?.ally
                    ? "Allied"
                    : "Peaceful") +
            " · " +
            (UNITS[enemy.type]?.name || enemy.type),
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          kind: "unit",
          type: enemy.type,
          team: enemy.team,
        };
      }
    }

    if(!units.length&&!this.state.selBld&&this.selectedResource){const n=this.selectedResource;selection={name:n.cropCandidate?CROP_NAMES[n.cropCandidate]:n.kind==="tree"?"Tree":n.kind,info:`Selected · ${Math.ceil(n.amount)} remaining${n.cropCandidate?" · gather to bring samples home":""}`,hp:n.amount,maxHp:Math.max(1,n.maxAmt),kind:"resource"};}
    const age = t.age;
    const next = AGE_COST[age + 1];
    const trainOptions: HudSnapshot["trainOptions"] = [];
    const hasBar = this.hasBld(0, "barracks");
    const hasSt = this.hasBld(0, "stables");
    if (hasBar) {
      trainOptions.push({
        type: "spearman",
        name: UNITS.spearman.name,
        cost: { food: UNITS.spearman.food, wood: UNITS.spearman.wood },
        age: 0,
      });
      trainOptions.push({
        type: "archer",
        name: UNITS.archer.name,
        cost: { food: UNITS.archer.food, wood: UNITS.archer.wood },
        age: 1,
      });
      trainOptions.push({
        type: "swordsman",
        name: UNITS.swordsman.name,
        cost: {
          food: UNITS.swordsman.food,
          wood: UNITS.swordsman.wood,
          copper: UNITS.swordsman.copper,
        },
        age: 1,
      });
    }
    if (hasSt)
      trainOptions.push({
        type: "cavalry",
        name: UNITS.cavalry.name,
        cost: { food: UNITS.cavalry.food, wood: UNITS.cavalry.wood, iron: UNITS.cavalry.iron },
        age: 4,
      });

    const buildOptions = BUILD_ORDER.filter((type) => BUILDINGS[type].age <= age).map((type) => ({
      type,
      name: BUILDINGS[type].name,
      cost: {
        wood: BUILDINGS[type].wood,
        stone: BUILDINGS[type].stone,
        food: BUILDINGS[type].food,
        copper: BUILDINGS[type].copper,
        iron: BUILDINGS[type].iron,
      },
      age: BUILDINGS[type].age,
      hint: type==="farm"?cultivationIssue(this)||BUILDINGS[type].hint:BUILDINGS[type].hint,
    }));

    return {
      food: Math.floor(t.food),
      foodLots: foodInventory(t),
      wood: Math.floor(t.wood),
      stone: Math.floor(t.stone),
      copper: Math.floor(t.copper || 0),
      iron: Math.floor(t.iron || 0),
      pop: this.popNow(0),
      popCap: this.popCap(0),
      age,
      ages: [...AGES],
      time: this.state.time,
      day: ck.day,
      clock: ck.time,
      period: ck.period,
      weather: ck.weather,
      season: ck.season,
      paused: this.state.paused,
      speed: this.state.speed >= 3 ? 4 : this.state.speed === 2 ? 2 : 1,
      ended: this.state.ended,
      endReason: this.state.endReason,
      objective: this.currentObjective(),
      placing: this.state.placing,
      placeIssue: this.state.placing ? this.state.placeIssue : null,
      banner: this.state.bannerT > 0 ? this.state.banner : null,
      selection,
      canAge: this.ageUpIssue(0) === null,
      ageIssue: this.ageUpIssue(0),
      ageCost: next,
      nextAge: age < 5 ? AGES[age + 1] : null,
      tribes: this.state.tribes
        .filter((tr) => tr.id !== 3 && (tr.id===0 || knownSettlement(this,tr.id)))
        .map((tr) => ({
          id: tr.id,
          name: tr.short,
          color: tr.color,
          age: tr.age,
          alive: tr.alive,
          hostile: tr.hostile,
          ally: tr.ally,
          spec: tr.spec,
          leader: tr.leader,
          csType: tr.csType,
          tension: tr.tension,
        })),
      trainOptions,
      buildOptions,
      fps: this.fps,
      started: this.started,
      awaitingStart: this.awaitingStart,
      founding: !!this.state.founding,
      cornerstoneCount: this.state.buildings.filter(b => b.team === 0 && b.hp > 0 && b.type === "cornerstone").length,
      muted: this.muted,
      quality: this.quality,
      workerSelected: units.filter((u) => u.type === "worker").length,
      militarySelected: units.filter((u) => u.type !== "worker" && u.type !== "leader").length,
      job:
        units.some((u) => u.type === "worker" && u.drill != null)
          ? "drill"
          : units.find((u) => u.type === "worker")?.order === "hold"
            ? "hold"
            : units.find((u) => u.type === "worker" && u.huntOnly)
              ? "hunt"
              : (units.find((u) => u.type === "worker")?.job ?? null),
      canRaid: this.state.units.some(
        (u) => u.team === 0 && u.type !== "worker" && u.type !== "leader" && u.hp > 0,
      ),
      trade: (() => {
        const rival = this.pickTradeRival();
        if (!rival) return null;
        const camp = this.campOf(rival.id);
        if (!this.exploredAt(camp.x, camp.z)) return null;
        return {
          rival: rival.name,
          hostile: rival.hostile,
          alive: rival.alive,
          cd: rival.tradeCd,
          offers: this.offersFor(rival.spec),
          canCycle: this.state.tribes.filter(
            (t) =>
              t.id !== 0 &&
              t.id !== 3 &&
              t.alive &&
              this.exploredAt(this.campOf(t.id).x, this.campOf(t.id).z),
          ).length > 1,
          ally: rival.ally,
          spec: rival.spec,
          canPact: !rival.hostile && !rival.ally && rival.alive,
          leader: rival.leader,
          leaderTitle: rival.leaderTitle,
          csType: rival.csType,
        };
      })(),
      rivalX: this.campOf(this.tradeTeam || 1).x,
      rivalZ: this.campOf(this.tradeTeam || 1).z,
      homeX: this.campOf(0).x,
      homeZ: this.campOf(0).z,
      camps: this.world.camps
        .filter((c) => c.team !== 0)
        .map((c) => {
          const tr = this.tribe(c.team);
          return {
            x: c.x,
            z: c.z,
            team: c.team,
            name: tr?.name || TEAM_NAMES[c.team] || "Rival",
            color: tr?.color || TEAM_COLORS[c.team] || "#8a3030",
            alive: tr?.alive ?? false,
            hostile: tr?.hostile ?? false,
            known: this.exploredAt(c.x, c.z),
          };
        }),
      raidName: this.pickRaidRival()?.name ?? null,
      idleWorkers: this.idleWorkers().length,
      pendingAge:
        this.state.pendingAge && age < 5
          ? { next: AGES[age + 1], econ: AGE_CHOICES[age].econ, army: AGE_CHOICES[age].army }
          : null,
      routeOffer: this.state.routeOffer,
      routes: this.state.routes.map((r) => ({
        rival: r.rival,
        give: r.give,
        giveAmt: r.giveAmt,
        get: r.get,
        getAmt: r.getAmt,
        t: r.t,
      })),
      event:
        this.state.weather === "storm"
          ? "Storm — building paused"
          : this.state.weather === "frost"
            ? "Frost — foraging slow"
            : this.state.weather === "rain"
              ? "Rain — berries swell, wood is wet"
              : this.state.weather === "mist"
                ? "Mist on the island"
                : this.state.weather === "golden"
                  ? "Golden light — work runs easy"
                  : this.state.weather === "flood"
                    ? "Flood — the river takes the banks"
                    : this.state.weather === "drought"
                      ? "Drought — yields run thin"
                      : null,
      regions: this.state.regions.map((r) => ({
        name: r.name,
        res: r.res,
        owner: r.owner,
        color: r.owner >= 0 ? this.tribe(r.owner)?.color || "#6a5a48" : "#6a5a48",
        x: r.x,
        z: r.z,
        r: r.r,
        cluster: r.clusterName,
      })),
      richRes: this.state.richRes,
      clusters: REGION_CLUSTERS.map((c) => ({
        name: c.name,
        bonus: c.hint,
        held: this.clusterHeld(c.id, 0),
      })),
      prestige: this.prestige(),
      stockCap: this.stockCap(0),
      port: this.hasBld(0, "dock"),
      night: this.isNight(),
      threat: this.raidThreat(),
      spears: t.spears || 0,
      bows: t.bows || 0,
      blades: t.blades || 0,
      armed: this.state.units.filter(
        (u) =>
          u.team === 0 && u.hp > 0 && (u.militia || (u.type !== "worker" && u.type !== "leader")),
      ).length,
      raidIn: Math.max(0, this.state.raidT),
    };
  }

  serialize() {
    const s = this.state;
    return {
      seed: s.seed,
      time: s.time,
      tribes: s.tribes,
      units: s.units.map((u) => ({
        ...u,
        node: null,
        target: null,
      })),
      buildings: s.buildings.map((b) => ({ ...b })),
      trees: s.trees,
      stones: s.stones,
      forage: s.forage,
      fish: s.fish,
      placing: null,
      nextId: s.nextId,
    };
  }
}

export function dist2(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx,
    dz = az - bz;
  return dx * dx + dz * dz;
}
