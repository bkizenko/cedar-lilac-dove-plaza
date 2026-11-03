import { writeFileSync } from "node:fs";
import { initializeSurvival } from "../src/game/survivalNeeds.ts";
import { Game } from "../src/game/sim.ts";
import { SEGS } from "../src/game/constants.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { nativeBoatVillage } from "./helpers/native-boat-village.mjs";
import { beginRiverboat, boardRiverboat, commandRiverboat } from "../src/game/boats.ts";
import { integrateOccupiedVillage, CONFLICT_RULES } from "../src/game/conflictIntent.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
const reports = [];
test.after(() => {
  if (process.env.INTACT_BOAT_REPORT)
    writeFileSync(
      process.env.INTACT_BOAT_REPORT,
      JSON.stringify(
        { scope: "Controlled finite paid-hull/crew paused-save scenarios", cases: reports },
        null,
        2,
      ) + "\n",
    );
});
function drive(g, seconds, done, label) {
  const end = g.state.time + seconds;
  while (g.state.time < end && !done()) {
    g.state.paused = false;
    g.step(0.2);
    assert.deepEqual(g.simulationErrors, []);
  }
  assert.ok(
    done(),
    JSON.stringify({
      label,
      time: g.state.time,
      boats: g.state.boats,
      units: g.state.units.map((u) => ({
        id: u.id,
        order: u.order,
        boat: u.boat,
        x: u.x,
        z: u.z,
        work: u.workReason,
      })),
    }),
  );
}
function setup(omitLast = false) {
  const g = new Game();
  g.reset(345, 3);
  g.enterIsland();
  g.state.units = [];
  g.state.buildings = [];
  g.state.autoWorkEnabled = false;
  g.state.conflict = "quiet";
  g.state.weather = "clear";
  g.state.weatherT = 10000;
  g.state.raidT = 10000;
  g.state.visitorTimer = 900;
  g.state.birthT = 10000;
  g.calamityT = 10000;
  for (const t of g.state.tribes) t.thinkT = 10000;
  for (const k of ["trees", "stones", "forage", "copper", "iron", "fish", "wildlife"])
    g.state[k] = [];
  for (let z = 0; z <= SEGS; z++)
    for (let x = 0; x <= SEGS; x++) {
      const wz = (z / SEGS) * g.world.size - g.world.size / 2;
      g.world.heights[z * (SEGS + 1) + x] = Math.abs(wz) < 8 ? g.world.waterY - 1 : 4;
    }
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  const home = { x: 0, z: -24 },
    hall = g.makeBld("townhall", 0, -24, 0),
    dock = g.makeBld("dock", 0, -10, 0);
  g.state.buildings = [hall, dock];
  const people = [];
  for (let i = 0; i < 4; i++) {
    const u = g.spawnUnit("worker", 10 + 2 * i, -24, 0);
    u.homeHall = hall.id;
    u.order = "hold";
    people.push(u);
  }
  Object.assign(g.tribe(0), { wood: 600, stone: 100, food: 2000, foodLots: { provisions: 2000 } });
  initializeSurvival(g);
  g.tribe(0).survival.waterLiters = 200;
  people[1].carry = 5;
  people[1].carryType = "wood";
  g.tribe(0).wood -= 5;
  const guard = g.spawnUnit("spearman", home.x + 5, home.z + 5, 1);
  guard.order = "hold";
  guard.conflictIntent = "occupy";
  g.tribe(1).hostile = false;
  g.tribe(1).ally = false;
  const control = {
    id: g.id(),
    hallId: hall.id,
    formerTeam: 0,
    controllerTeam: 1,
    buildingIds: [hall.id, dock.id],
    residentIds: people.filter((u, i) => !omitLast || i !== people.length - 1).map((u) => u.id),
    guardIds: [guard.id],
    phase: "held",
    holdSeconds: CONFLICT_RULES.controlHoldSeconds,
    createdAt: g.state.time,
  };
  g.state.occupations = [control];
  g.state.contacts = [1];
  g.rebuildWalk();
  g.vision.fill(2);
  return { g, home, hall, dock, people, control };
}
test("local paid moored boat and complete resident crew surrender intact before immediate paused save", () => {
  const { g, dock, people, control } = setup(),
    wood = g.tribe(0).wood,
    stone = g.tribe(0).stone;
  assert.equal(beginRiverboat(g, dock.id, 0, people[2].id), true);
  assert.equal(g.tribe(0).wood, wood - 40);
  assert.equal(g.tribe(0).stone, stone - 4);
  drive(g, 220, () => !!g.state.boats?.length, "actual paid hull construction");
  const boat = g.state.boats[0],
    captain = people[1];
  g.clearSelect();
  g.selectEntity(captain);
  g.issueMove(dock.x, dock.z);
  drive(
    g,
    80,
    () => Math.hypot(captain.x - boat.x, captain.z - boat.z) < 24,
    "actual loaded resident approaches boat",
  );
  assert.equal(boardRiverboat(g, boat.id, [captain]), 1);
  drive(g, 60, () => captain.boat?.phase === "aboard", "actual boarding");
  const mooring = { x: boat.x, z: boat.z };
  assert.equal(commandRiverboat(g, boat.id, boat.x + 35, boat.z), true);
  drive(
    g,
    120,
    () => captain.order === "hold" && Math.hypot(boat.x - mooring.x, boat.z - mooring.z) > 25,
    "actual loaded water leg",
  );
  assert.equal(commandRiverboat(g, boat.id, mooring.x, mooring.z), true);
  drive(
    g,
    120,
    () => captain.order === "hold" && Math.hypot(boat.x - mooring.x, boat.z - mooring.z) < 3,
    "actual moored return",
  );
  assert.ok(captain.waterCargoEvidence?.waterMeters >= 25);
  assert.doesNotThrow(() => decodeGame(structuredClone(encodeGame(g))));
  const before = {
    boat: { ...boat },
    person: {
      id: captain.id,
      hp: captain.hp,
      x: captain.x,
      z: captain.z,
      carry: captain.carry,
      carryType: captain.carryType,
    },
    count: g.state.units.length,
  };
  g.state.paused = true;
  const result = integrateOccupiedVillage(g, control.id);
  assert.equal(result.accepted, true, result.reason);
  const currentBoat=g.state.boats.find(b=>b.id===boat.id),currentCaptain=g.state.units.find(u=>u.id===captain.id);
  assert.doesNotThrow(() => decodeGame(structuredClone(encodeGame(g))));
  assert.equal(currentBoat.team, 1);
  assert.equal(currentCaptain.team, 1);
  assert.equal(currentCaptain.boat.id, currentBoat.id);
  assert.equal(currentBoat.hp, before.boat.hp);
  assert.equal(currentBoat.x, before.boat.x);
  assert.equal(currentBoat.z, before.boat.z);
  assert.equal(currentCaptain.hp, before.person.hp);
  assert.equal(currentCaptain.carry, 5);
  assert.equal(currentCaptain.carryType, "wood");
  assert.equal(currentCaptain.waterCargoEvidence.team,1);assert.equal(currentCaptain.waterCargoEvidence.originTeam,0);assert.ok(currentCaptain.waterCargoEvidence.waterMeters>=25);
  assert.equal(g.tribe(1).boatPractice?.deliveredGoods ?? 0, 0);
  assert.equal(g.state.units.length, before.count);
  reports.push({
    case: "local complete moored crew",
    boatId: currentBoat.id,
    captainId: currentCaptain.id,
    paidWood: 40,
    paidStone: 4,
    hullHealthRetained: currentBoat.hp,
    cargoRetained: currentCaptain.carry,
    boatAndCrewTeam: currentBoat.team,
    actualWaterEvidenceRetained: currentCaptain.waterCargoEvidence.waterMeters,
    elapsedSeconds: g.state.time,
  });
  assert.doesNotThrow(() => decodeGame(structuredClone(encodeGame(g))));
});

function paidBoarding(f, crew) {
  const { g, dock, people } = f;
  assert.equal(beginRiverboat(g, dock.id, 0, people[2].id), true);
  drive(g, 220, () => !!g.state.boats?.length, "paid original hull");
  const boat = g.state.boats[0];
  for (const u of crew) {
    g.clearSelect();
    g.selectEntity(u);
    g.issueMove(dock.x, dock.z);
    drive(g, 80, () => Math.hypot(u.x - boat.x, u.z - boat.z) < 24, "actual approach");
    assert.equal(boardRiverboat(g, boat.id, [u]), 1);
    drive(g, 60, () => u.boat?.phase === "aboard", "actual boarding");
  }
  return boat;
}
test("a real crew sailing away stays with its original paid hull when its home village surrenders", () => {
  const f = setup(),
    { g, people, control } = f,
    captain = people[1],
    boat = paidBoarding(f, [captain]);
  assert.equal(commandRiverboat(g, boat.id, 90, boat.z), true);
  drive(g, 120, () => boat.x > 70, "actual distant sailing");
  const before = {
    x: boat.x,
    z: boat.z,
    hp: boat.hp,
    carry: captain.carry,
    meters: captain.waterCargoEvidence.waterMeters,
  };
  g.state.paused = true;
  assert.equal(integrateOccupiedVillage(g, control.id).accepted, true);
  assert.equal(boat.team, 0);
  assert.equal(captain.team, 0);
  assert.equal(captain.boat.id, boat.id);
  assert.equal(boat.x, before.x);
  assert.equal(boat.z, before.z);
  assert.equal(boat.hp, before.hp);
  assert.equal(captain.carry, before.carry);
  assert.equal(captain.waterCargoEvidence.waterMeters, before.meters);
  assert.equal(g.state.units.find(u=>u.id===people[3].id).team, 1, "actual ashore residents joined locally");
  reports.push({case:"distant sailing crew",boatId:boat.id,captainId:captain.id,retainedOriginalTeam:boat.team,cargoRetained:captain.carry,actualWaterMeters:captain.waterCargoEvidence.waterMeters,elapsedSeconds:g.state.time});
  assert.doesNotThrow(() => decodeGame(structuredClone(encodeGame(g))));
});
test("a local moored mixed surrender cohort retains the complete original hull and both attached people", () => {
  const f = setup(true),
    { g, people, control } = f,
    boat = paidBoarding(f, [people[1], people[3]]),
    ids = [people[1].id, people[3].id];
  g.state.paused = true;
  assert.equal(integrateOccupiedVillage(g, control.id).accepted, true);
  assert.equal(boat.team, 0);
  for (const id of ids) {
    const u = g.state.units.find((p) => p.id === id);
    assert.equal(u.team, 0);
    assert.equal(u.boat.id, boat.id);
  }
  assert.equal(g.state.units.find(u=>u.id===people[2].id).team, 1);
  assert.equal(people[1].carry, 5);
  reports.push({
    case: "mixed local crew",
    boatId: boat.id,
    crewIds: ids,
    retainedOriginalTeam: boat.team,
    cargoRetained: people[1].carry,
    elapsedSeconds: g.state.time,
  });
  assert.doesNotThrow(() => decodeGame(structuredClone(encodeGame(g))));
});
