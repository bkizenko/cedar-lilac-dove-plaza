# Animal behaviour audit and overhaul

**BLUF.** Before this work animals did not move like animals: wild ungulates re-rolled a uniformly random heading every 2.5-7.5 s (`Math.random`, so not even deterministic), birds were teleported along a parametric circle, pen stock spun by 1.4 rad in one frame, there were no groups, no daily rhythm, no predators, no gaits, and the merged instance meshes were drawn rotated 90 degrees from their direction of travel (animals crab-walked sideways). New games now use an activity-based, deterministic behaviour model (`src/game/animalBehaviour.ts`); old saves keep the legacy tick untouched. Near the camera, a presentation-only rig (`src/scene/animalRigLayer.ts`) adds jointed gaits, head and body poses; far away animals keep the cheap merged instances. Fishing grounds near the camera show swimming schools instead of flat markers.

## 1. How animals moved before (audit, origin/main 5e06abf4)

| Species / group | Movement today (legacy) | Gaps |
|---|---|---|
| Wild deer, boar, goat (also wild sheep, horse, cattle once released/spawned) | `Game.tickWildlife`: every `wanderT` 2.5-7.5 s pick a uniformly random heading and a fixed speed (deer 3.4, boar 2.4, goat 2.1, horse 3.6, cattle 2.4 m/s); velocity decays 0.6/s; if beyond 32 m of `grazing` anchor aim home. Flee: any unit within 7 m adds 8 m/s^2 away from it, capped by `wildlifeFleeSpeed`. `moveGroundWildlife` rotates the velocity vector 60-180 degrees instantly when blocked. | No herds, leaders, spacing or sentinels. No daily rhythm. No habitat goals (grass, browse, water, shade, shelter). No drinking, resting, wallowing, rut, nursing. Flee is a fixed 7 m for everyone, away from the unit only, no cover, no stamina, no group alarm. Instant heading changes, no turn limit or acceleration. Non-deterministic (`Math.random` in the tick and in recruitment). |
| Wild birds | Position written every frame from `sin/cos` of `c.fly` around a centre derived from `id` (teleport-style parametric orbit). | No flight dynamics, no flocks, no perching/roosting, ignore people and carcasses. |
| Wounded boar | `tickHuntingHazard`: charges the attacker at 4.2 m/s, bounded by sight and expiry. | Fine; kept as is and runs before the new model. |
| Predators | None in the game. | No wolves, no predation, no scavengers. |
| Pen livestock (goat, sheep, horse, cattle) | `tickHusbandry`: 0.35 m/s forward, `facing += 1.4` every 3-7 s, `facing += PI` when the next step leaves the pen. | Instant 80 degree spin and 180 degree flips, no grazing/resting, young do not follow dams. |
| Led / pack stock | `g.steer` along real routes (no teleporting). | Fine. |
| Rendering | One merged static `InstancedMesh` per species; `rotation.y = facing`. Models point along local +x while velocity is `(sin f, cos f)`: **drawn 90 degrees off their travel direction**. No leg/neck/head animation, no head-down/head-up poses, no foot placement. | Sideways travel, sliding, one rigid pose. |
| Fish | Flat wedge marker on the water, bobbing and yawing around a fixed point. | No swimming, schooling, depth or wake. |

Evidence for the orientation bug: `docs/renders/animals/legacy-orientation-bug.png` (left: old transform, middle: corrected, right: new rig; all moving toward +z).

## 2. What changed

Switch: `GameState.animalBehaviourVersion?: 1`, set by `spawnWildlife` for new games. Without it `tickWildlife` runs the old code path unchanged (tests below). The optional `beh` record on `Critter` has a validator in `persistence.ts` and is rejected if the flag is absent.

### Simulation (authoritative, camera-independent, deterministic)
- **Streams.** Every random choice is `animalRand(seed, id, counter)`; the counter lives in `beh.n`. No `Math.random`/`Date.now` in the new path (the dead-animal recruitment also uses it when the flag is on).
- **Activity model.** States: graze, walk, rest, ruminate, sleep, drink, wallow, groom/dust, alert, flee, rut, nurse, stalk, chase, feed, fly, perch, scav. A foraging drive from rhythm (`diurnal`, `crepuscular`, `nocturnal`) and local solar time (`activityLevel`) chooses between foraging, resting and sleeping; thirst forces drinking at the nearest shore point; boar/cattle wallow in summer midday; goat/horse dust-bathe; rut season per species (deer autumn, goat/boar winter, cattle summer, horse spring).
- **Goals by habitat.** Patch scoring (`habitatScore`) uses biome, tree density, slope, water, camps, weather and season: grass for grazers, browse for deer/goat/boar, shade when hot, tree shelter when wet/cold, steep ground for goats; large grazers reject dense forest.
- **Herds.** Group sizes per species (deer 3-6, boar 4-8, goat 6-12, sheep 8-15, horse 4-9, cattle 10-24, wolf 3-6, birds 6-12). Leader election, formation slots with minimum spacing, followers copy the leader's activity with an individual lag, sentinels (one head-up member rotates every 25-45 s, larger detection radius), juveniles follow a dam and nurse. Seasonal home range is the `h0` anchor plus habitat weighting.
- **Predator and prey.** Vigilance radius and flight initiation distance (FID) per species, increased with group size (many eyes), reduced by habituation and for a stalking hunter (`huntFidScale`); a hit or kill resets habituation and alarms the herd (`noteAttack`, called from `damagePrey`). Flee runs away from the threat bent toward cover, with a gallop stamina budget; after fleeing the herd stands alert. Wolves (new species `wolf`, 3-6 per pack, territory = home anchor) track scent to the nearest prey herd, stalk to 12 m, chase with stamina, select weak/young/isolated prey, kill into a normal finite carcass, then feed from it (never below 45 % of the carcass, so no meat is created and players can still butcher it).
- **Gaits and movement.** Walk/trot/canter/gallop speeds per species, accel 1.6 m/s^2, decel 3 m/s^2, gait-dependent turn rate (bounded; pivot in place only at 1.1 rad/s), speed scaled by heading error so animals do not spin, look-ahead avoidance for footprints, water, slope and forest, speed never above the species gallop, step never farther than speed x dt. Facing follows heading with a 6 rad/s smoothing limit. Birds use bounded-turn flight with altitude smoothing, perching at night and circling carcasses.
- **People.** Wild animals flee at species/group/habituation-dependent FID (a worker walking at a deer herd; a stalking hunter can approach much closer, which keeps bow and spear hunting playable). Pen stock ignores people and now grazes/rests/walks inside the pen at walking pace (`penStep`), young stay by an adult.
- **Performance.** Update LOD by distance to the player's people/camp: near every tick, mid 0.2 s, far 1 s with accumulated dt; at most 90 animal steps per tick (most overdue first); tree density grid rebuilt every 10 s.

### Presentation (owned by the animal-models work, `docs/ANIMAL_MODELS*`; sim hooks only)
The jointed rig, fish shoals and world wiring are the animal-models agent's (`animalRigLayer.ts`, `animalAdapter.ts`, `animalLife.ts`). Its adapter already applies `FACING_OFFSET = -PI/2` to the sim facing `atan2(vx,vz)`, so the sideways-travel bug in the old merged-mesh path is handled there; this branch adds no second rotation fix. Two small hooks connect it to the behaviour sim: `MotionTracker.step` takes the sim state (`graze`, `drink`, `alert`/`stalk`/`flee`, `feed`, rest) so the rig shows exactly what the animal is doing, and the sim velocity as the starting speed so an animal entering the near zone starts in its true gait (no pop). The rig derives speed and stride phase from real displacement, so stance feet do not slide, and it never writes sim state.

## 3. Files
`src/game/animalTraits.ts`, `src/game/animalBehaviour.ts`, hooks in `sim.ts`, `hunting.ts`, `husbandry.ts`, `persistence.ts`, `wildlifeMovement.ts`, `types.ts`; small rig hooks in `src/scene/animalLife.ts` and `animalAdapter.ts`.

## 4. Tests and renders
`scripts/animal-behaviour.test.mjs`: determinism, speed/turn limits and no teleport, daily rhythm, herd cohesion and spacing, FID and flee, wolf stalk/chase/kill/feed, obstacle and water safety, legacy-save compat, near-zone handoff without pop.
Renders in `docs/renders/animals/`: `trace-herd-day.png`, `trace-predator-chase.png`, `trace-drinking.png` (real sim traces), `gait-strip-{deer,horse,cattle,wolf}.png`.

## 5. Known gaps (not done / not verified)
- Rabbits/warrens are not a species in this game; the trait table and herd code take them when added. Sheep, horse, cattle wild herds only exist once other systems create them; they get groups on first tick.
- Seasonal migration is a home-range anchor with habitat weighting, not long-distance migration.
- Rig appearance, pen/pack stock meshes and picking belong to the animal-models work; no live-GPU check was done here.
