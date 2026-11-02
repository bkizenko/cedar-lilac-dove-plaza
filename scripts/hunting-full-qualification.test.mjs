import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { beginWeaponWork } from "../src/game/warfare.ts";
import { beginProduction, productionIssue } from "../src/game/production.ts";
import { buildingCost } from "../src/game/construction.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const method = "bow";
test(`${method}: finite camp turns a paid owned-weapon hunt into meaningful cooked food and station-dried hide with measured risk and conservation`, () => {
  const random = Math.random;
  let rng = 40110;
  Math.random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  try {
    let g = new Game();
    g.reset(1, 14, { size: 1040, layout: "pangaea" });
    g.enterIsland();
    g.state.autoWorkEnabled = false;
    g.state.conflict = "quiet";
    g.state.weather = "clear";
    g.state.weatherT = 10000;
    g.state.raidT = 10000;
    g.state.visitorTimer = 900;
    g.state.birthT = 10000;
    g.calamityT = 10000;
    for (const t of g.state.tribes) t.thinkT = 10000;
    const initial = { wood: 100, stone: 50, food: 90, water: 200 };
    Object.assign(g.tribe(0), {
      ...initial,
      foodLots: { provisions: initial.food },
      bows: 0,
      spears: 0,
      blades: 0,
      items: {},
    });
    g.tribe(0).survival.waterLiters = initial.water;
    for (const u of g.state.units.filter((u) => u.team === 0)) u.order = "hold";
    const home = { ...g.campOf(0) },
      ids = g.state.units.filter((u) => u.team === 0).map((u) => u.id),
      terrain = hash(Buffer.from(g.world.heights.buffer)),
      builderId = g.state.units.find((u) => u.team === 0 && u.type === "worker").id,
      commands = [],
      snapshots = [];
    let launchedShots = 0;
    g.onSfx = (kind) => {
      if (kind === "bow") launchedShots++;
    };
    let ticks = 0,
      shots = 0,
      maxFlight = 0,
      movedPrey = 0,
      minHP = Infinity,
      gut = false,
      skin = false,
      rawCarried = false,
      flightSaved = false,
      trackSeen = false,
      hazardSeen = false,
      hazardPursuitMeters = 0,
      minimumHazardRange = Infinity;
    const body = () => g.state.units.find((u) => u.id === builderId),
      prey = () => g.state.wildlife.find((c) => c.id === preyId);
    let huntingStart, preyId;
    function select(id) {
      g.clearSelect();
      g.selectEntity(g.state.units.find((u) => u.id === id));
    }
    function command(name, args, fn) {
      commands.push({ time: g.state.time, name, args });
      return fn();
    }
    function step() {
      const prior = prey()
        ? { x: prey().x, z: prey().z, hp: prey().hp, hazard: !!prey().huntDefense }
        : null;
      const before = g.state.time;
      const old = new Set(g.state.projectiles);
      g.step(0.1);
      assert.ok(g.state.time > before || g.state.ended, "paused clock must not spin");
      ticks++;
      assert.deepEqual(g.simulationErrors, []);
      assert.ok(!g.state.ended);
      for (const id of ids) assert.ok(g.state.units.some((u) => u.id === id && u.hp > 0));
      minHP = Math.min(minHP, body().hp);
      shots += g.state.projectiles.filter(
        (p) => !old.has(p) && p.wildlifeTargetId === preyId,
      ).length;
      maxFlight = Math.max(
        maxFlight,
        g.state.projectiles.filter((p) => p.wildlifeTargetId === preyId).length,
      );
      if (prey() && huntingStart)
        movedPrey = Math.max(
          movedPrey,
          Math.hypot(prey().x - huntingStart.x, prey().z - huntingStart.z),
        );
      gut ||= body().workReason === "Gutting boar";
      skin ||= body().workReason === "Skinning boar";
      rawCarried ||= !!body().rawHuntMeat && body().carry > 0;
      trackSeen ||= body().workReason === "Tracking last-seen prey";
      hazardSeen ||= !!prey()?.huntDefense;
      if (prior?.hp > 0 && prior.hazard) {
        hazardPursuitMeters += Math.hypot(prey().x - prior.x, prey().z - prior.z);
        minimumHazardRange = Math.min(
          minimumHazardRange,
          Math.hypot(prey().x - body().x, prey().z - body().z),
        );
      }
    }
    function drive(seconds, done, label) {
      const end = g.state.time + seconds;
      while (g.state.time < end && !done()) step();
      assert.ok(
        done(),
        JSON.stringify({
          label,
          time: g.state.time,
          u: {
            x: body().x,
            z: body().z,
            hp: body().hp,
            order: body().order,
            node: body().node?.id,
            reason: body().workReason,
            weapon: body().weaponWork,
            carry: body().carry,
            items: body().itemCargo,
          },
          prey: prey(),
          items: g.tribe(0).items,
          projectiles: g.state.projectiles,
          errors: g.simulationErrors,
        }),
      );
    }
    let site;
    for (let r = 10; r <= 36 && !site; r += 3)
      for (let i = 0; i < 32 && !site; i++) {
        const x = home.x + Math.cos((i * Math.PI) / 16) * r,
          z = home.z + Math.sin((i * Math.PI) / 16) * r;
        if (g.exploredAt(x, z) && !g.placementIssue("hearth", x, z)) site = { x, z };
      }
    assert.ok(site, "actual natural hearth footprint");
    let ground;
    for (let r = 24; r <= 38 && !ground; r += 2)
      for (let i = 0; i < 48 && !ground; i++) {
        const x = home.x + Math.cos((i * Math.PI) / 24) * r,
          z = home.z + Math.sin((i * Math.PI) / 24) * r;
        if (
          !g.walkable(x, z) ||
          Math.hypot(x - site.x, z - site.z) < 16 ||
          g.state.units.some((u) => Math.hypot(u.x - x, u.z - z) < 14) ||
          g.state.trees.some((n) => n.amount > 0 && Math.hypot(n.x - x, n.z - z) < 7)
        )
          continue;
        if (!g.workBoard.connected(g, body().x, body().z, x, z)) continue;
        ground = { x, z };
      }
    assert.ok(ground, "clear natural hunting ground");
    const c = {
      id: g.id(),
      species: "boar",
      x: ground.x,
      z: ground.z,
      y: g.height(ground.x, ground.z),
      hp: 4,
      maxHp: 4,
      facing: 0,
      vx: 0,
      vz: 0,
      wanderT: 10000,
      fly: 0,
      scale: 1,
      grazing: { ...ground },
    };
    preyId = c.id;
    g.state.wildlife = [c];
    const cost = buildingCost("hearth", g);
    assert.equal(
      command("placeHearth", site, () => g.placeBuilding("hearth", site.x, site.z)),
      true,
    );
    const hearth = g.state.buildings.at(-1),
      hearthId = hearth.id;
    select(builderId);
    command("buildHearth", { hearthId }, () => g.orderConstruction(hearth));
    drive(140, () => g.finished(hearth), "real hearth construction");
    assert.equal(g.tribe(0).wood, initial.wood - cost.wood);
    assert.equal(g.tribe(0).stone, initial.stone - cost.stone);
    assert.equal(
      command("craftBow", { hearthId }, () => beginWeaponWork(g, "bow", 0, hearthId)),
      true,
      g.state.banner,
    );
    const maker = g.state.units.find((u) => u.weaponWork?.kind === "bow");
    assert.equal(maker.id, builderId);
    drive(240, () => g.tribe(0).bows === 1, "physically craft bow at actual hearth");
    assert.equal(body().weaponWork, undefined);
    assert.equal(g.tribe(0).wood, initial.wood - cost.wood - 3);
    assert.equal(g.tribe(0).stone, initial.stone - cost.stone - 1);
    command("recallForEquipment", {}, () => g.soundRecall());
    drive(120, () => !body().recalled, "physical equipment return");
    select(builderId);
    assert.equal(
      command("equipActualBow", {}, () => g.callToArms()),
      1,
    );
    assert.equal(body().type, "archer");
    assert.equal(g.tribe(0).bows, 0);
    const hpBeforeHunt = body().hp;
    select(builderId);
    command("walkToAuthoredHuntingGround", ground, () => g.issueMove(ground.x, ground.z));
    drive(90, () => g.visibleAt(prey().x, prey().z), "actual local observation");
    huntingStart = { x: prey().x, z: prey().z };
    select(builderId);
    command("publicHunt", { actualObservedAnimalId: preyId }, () => g.issueGather(prey()));
    assert.equal(body().node, prey());
    drive(
      90,
      () => g.state.projectiles.some((p) => p.wildlifeTargetId === preyId),
      "actual bow projectile launched",
    );
    const flightRaw = encodeGame(g),
      copy = decodeGame(flightRaw);
    assert.deepEqual(
      copy.state.projectiles.find((p) => p.wildlifeTargetId === preyId).huntingVelocity,
      g.state.projectiles.find((p) => p.wildlifeTargetId === preyId).huntingVelocity,
    );
    const savedRng = rng,
      hpBeforeLoadedFlight = copy.state.wildlife.find((c) => c.id === preyId).hp;
    copy.state.paused = false;
    for (
      let i = 0;
      i < 12 && copy.state.wildlife.find((c) => c.id === preyId).hp === hpBeforeLoadedFlight;
      i++
    ) {
      const time = copy.state.time;
      copy.step(0.1);
      assert.ok(copy.state.time > time || copy.state.ended);
    }
    assert.ok(
      copy.state.wildlife.find((c) => c.id === preyId).hp < hpBeforeLoadedFlight,
      "loaded fixed-flight bow shot hits in ordinary simulation",
    );
    assert.deepEqual(copy.simulationErrors, []);
    rng = savedRng;
    flightSaved = true;
    snapshots.push({
      stage: "actual hunting shot in flight",
      sha256: hash(JSON.stringify(flightRaw)),
    });
    drive(90, () => prey().hp === 0, "physical kill");
    assert.equal(prey().carcass.meat, 32);
    assert.equal(prey().carcass.hides, 1);
    assert.equal(prey().carcass.bones, 3);
    const diedAt = prey().carcass.diedAt;
    assert.ok(movedPrey > 1, "prey actually moved");
    assert.ok(
      hazardSeen,
      "actual wounded-boar defensive pursuit occurred; ranged kill may prevent contact",
    );
    assert.ok(
      hazardPursuitMeters > 1,
      "the wounded boar actually moved during its defensive pursuit, not just a hazard label",
    );
    drive(
      140,
      () => !!body().rawHuntMeat && body().carry > 0,
      "actual raw catch load before delivery",
    );
    const rawParcel = body().carry,
      remainingMeat = prey().carcass.meat;
    command("pauseWithRawCatch", {}, () => {
      g.state.paused = true;
    });
    const parcelSave = encodeGame(g);
    g = decodeGame(parcelSave);
    assert.equal(body().carry, rawParcel);
    assert.equal(prey().carcass.meat, remainingMeat);
    assert.equal(hash(Buffer.from(g.world.heights.buffer)), terrain);
    assert.ok(body().rawHuntMeat);
    g.state.paused = false;
    snapshots.push({
      stage: "paused actual raw catch parcel",
      sha256: hash(JSON.stringify(parcelSave)),
      carriedRawMeat: rawParcel,
      remainingCarcass: remainingMeat,
    });
    drive(
      140,
      () => (g.tribe(0).items?.rawMeat || 0) > 0,
      "gut skin carry and physically deliver raw meat",
    );
    assert.ok(gut && skin && rawCarried);
    assert.equal(prey().carcass.prepared, true);
    assert.equal(prey().carcass.skinningWork, 3);
    assert.equal(g.tribe(0).items.rawHide, 1);
    assert.equal(g.tribe(0).items.bone, 3);
    const rawDelivered = g.tribe(0).items.rawMeat;
    assert.equal(rawDelivered + (body().rawHuntMeat ? body().carry : 0) + prey().carcass.meat, 32);
    assert.equal(g.state.production.metrics.edibleFoodProduced, 0, "uncooked hunt not edible");
    assert.equal(prey().carcass.diedAt, diedAt);
    command("recallBeforeCooking", {}, () => g.soundRecall());
    drive(
      120,
      () => g.state.units.filter((u) => u.team === 0).every((u) => !u.recalled),
      "physical return",
    );
    assert.equal(
      command("cookFiniteRawMeat", { hearthId }, () => beginProduction(g, "cookMeat", hearthId)),
      true,
      productionIssue(g, "cookMeat", hearthId),
    );
    const p = g.state.production.projects.at(-1);
    drive(180, () => p.phase === "complete", "fuel-paid physical cook and food delivery");
    assert.equal(g.state.production.metrics.consumed.rawMeat, 4);
    assert.equal(g.state.production.metrics.logsUsed, 1);
    assert.equal(g.state.production.metrics.edibleFoodProduced, 4);
    while ((g.tribe(0).items?.rawMeat || 0) >= 4) {
      const before = g.state.production.metrics.edibleFoodProduced;
      assert.equal(
        command("cookAdditionalFiniteRawMeat", { hearthId }, () =>
          beginProduction(g, "cookMeat", hearthId),
        ),
        true,
        productionIssue(g, "cookMeat", hearthId),
      );
      const next = g.state.production.projects.at(-1);
      drive(180, () => next.phase === "complete", "additional real fuel-paid cook and delivery");
      assert.equal(g.state.production.metrics.edibleFoodProduced, before + 4);
    }
    let stationWood = 0,
      stationStone = 0;
    function paidStation(type) {
      let point;
      for (let r = 10; r <= 60 && !point; r += 3)
        for (let i = 0; i < 48 && !point; i++) {
          const x = home.x + Math.cos((i * Math.PI) / 24) * r,
            z = home.z + Math.sin((i * Math.PI) / 24) * r;
          if (g.exploredAt(x, z) && !g.placementIssue(type, x, z)) point = { x, z };
        }
      assert.ok(point, `real ${type} footprint`);
      const cost = buildingCost(type, g);
      assert.equal(
        command("placePaidStation", { type, ...point }, () =>
          g.placeBuilding(type, point.x, point.z),
        ),
        true,
        g.state.banner,
      );
      stationWood += cost.wood || 0;
      stationStone += cost.stone || 0;
      const b = g.state.buildings.at(-1),
        worker = g.state.units.find((u) => u.team === 0 && u.type === "worker");
      assert.ok(worker);
      select(worker.id);
      command("constructPaidStation", { type, id: b.id }, () => g.orderConstruction(b));
      drive(180, () => g.finished(b), `real ${type} construction`);
      return b;
    }
    const butcher = paidStation("butcher");
    assert.equal(
      command("fleshActualHuntedHide", { butcherId: butcher.id }, () =>
        beginProduction(g, "fleshHide", butcher.id),
      ),
      true,
      productionIssue(g, "fleshHide", butcher.id),
    );
    const clean = g.state.production.projects.at(-1);
    drive(180, () => clean.phase === "complete", "actual hide cleaning and delivery");
    assert.equal(g.tribe(0).items.cleanHide, 1);
    assert.equal(g.tribe(0).items.rawHide, 0);
    const rack = paidStation("dryrack");
    assert.equal(
      command("dryActualCleanedHide", { rackId: rack.id }, () =>
        beginProduction(g, "drySkin", rack.id),
      ),
      true,
      productionIssue(g, "drySkin", rack.id),
    );
    const drying = g.state.production.projects.at(-1);
    drive(240, () => drying.phase === "complete", "actual rack drying and delivery");
    assert.equal(g.tribe(0).items.driedSkin, 1);
    assert.equal(g.tribe(0).items.cleanHide, 0);
    const metrics = structuredClone(g.state.production.metrics),
      tr = g.tribe(0),
      events = g.state.simulationEvents.totals;
    assert.ok(
      Math.abs(
        (tr.items.rawMeat || 0) +
          (body().rawHuntMeat ? body().carry : 0) +
          prey().carcass.meat +
          metrics.consumed.rawMeat +
          (metrics.spoiled.rawMeat || 0) -
          32,
      ) < 1e-6,
    );
    assert.ok(
      Math.abs(
        tr.food -
          (initial.food +
            (events["food_received:0:food"] || 0) -
            (events["food_consumed:0:food"] || 0) -
            (events["food_spoiled:0:food"] || 0)),
      ) < 1e-6,
    );
    assert.ok(
      Math.abs(
        tr.wood -
          (initial.wood -
            cost.wood -
            3 -
            stationWood -
            metrics.logsUsed -
            tr.survival.fuelBurnedWood),
      ) < 1e-6,
    );
    assert.equal(tr.stone, initial.stone - cost.stone - 1 - stationStone);
    assert.ok(
      Math.abs(
        tr.survival.waterLiters -
          (initial.water +
            tr.survival.waterDeliveredLiters -
            tr.survival.waterConsumedLiters -
            tr.survival.waterLostLiters -
            metrics.waterUsedLiters),
      ) < 1e-6,
    );
    assert.equal(hash(Buffer.from(g.world.heights.buffer)), terrain);
    assert.ok(flightSaved && maxFlight > 0 && shots > 0);
    assert.ok(
      metrics.edibleFoodProduced >= 24,
      "a substantial finite share of the actual catch becomes edible",
    );
    assert.ok(
      metrics.edibleFoodProduced / (events["food_consumed:0:food"] || Infinity) >= 0.25,
      "report measures meaningful demand relief against actual concurrent upkeep",
    );
    const final = encodeGame(g),
      loaded = decodeGame(final);
    assert.equal(
      loaded.state.wildlife.find((c) => c.id === preyId).carcass.meat,
      prey().carcass.meat,
    );
    snapshots.push({ stage: "cooked finite catch delivered", sha256: hash(JSON.stringify(final)) });
    const report = {
      scenario: `${method}: meaningful finite wildlife subsistence and hide processing`,
      baseline:
        "frozen boat/diplomacy/frame integration cohort with isolated intact-boat handover fix",
      seed: 1,
      worldgenVersion: 14,
      layout: "pangaea",
      size: 1040,
      controlledEndowment: {
        ...initial,
        wildlife:
          "one authored baseline4HP boar on unchanged clear natural dry ground; all weapon stores initially zero",
      },
      setup:
        "Quiet/clear, external timers deferred, resident needs retained. No terrain/position/stock corrections after initial setup.",
      commands,
      terrainSha256: terrain,
      terrainUnchanged: true,
      elapsedSeconds: g.state.time,
      ticks,
      originalPeople: ids,
      actualHunterId: builderId,
      actualPreyId: preyId,
      preyMovementMeters: movedPrey,
      launchedBowShots: launchedShots,
      observedShots: shots,
      maxConcurrentHuntingFlight: maxFlight,
      hunterHpBefore: hpBeforeHunt,
      minimumHunterHp: minHP,
      woundedBoarDefenseObserved: hazardSeen,
      hazardPursuitMeters,
      minimumHazardRange,
      flightSaved,
      trackingObserved: trackSeen,
      guttingObserved: gut,
      skinningObserved: skin,
      rawMeatCarried: rawCarried,
      capital: { hearth: cost, weapon: { kind: method, wood: 3, stone: 1 } },
      final: {
        wood: tr.wood,
        stone: tr.stone,
        food: tr.food,
        rawMeat: tr.items.rawMeat,
        remainingCarcass: prey().carcass.meat,
        survival: tr.survival,
        production: metrics,
        events,
      },
      snapshots,
      errors: g.simulationErrors,
      meaningfulSupply: {
        edibleFood: metrics.edibleFoodProduced,
        consumed: events["food_consumed:0:food"],
        fractionOfConcurrentConsumption:
          metrics.edibleFoodProduced / events["food_consumed:0:food"],
        noCatchFoodCounterfactual: tr.food - metrics.edibleFoodProduced,
        initialFood: initial.food,
      },
      hide: {
        butcherId: butcher.id,
        rackId: rack.id,
        driedSkin: tr.items.driedSkin,
        stationWood,
        stationStone,
      },
      limits: [
        "Controlled finite initial endowment and authored actual wildlife; not untouched normal-campaign balance.",
        "Loose stones/arrows follow existing non-inventoried ammunition assumption; no finite-ammo claim.",
        "No target-hardware performance or full M1-10 acceptance claimed by this report.",
      ],
    };
    console.log(JSON.stringify(report));
    if (process.env.HEARTHWILD_FULL_HUNT_REPORT)
      writeFileSync(
        process.env.HEARTHWILD_FULL_HUNT_REPORT.replace(".json", `-${method}.json`),
        JSON.stringify(report, null, 2) + "\n",
      );
  } finally {
    Math.random = random;
  }
});
