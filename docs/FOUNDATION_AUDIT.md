# Foundation audit, 2026-11-13: "all of yours are on stilts right now"

## BLUF

Buildings looked raised on legs because of three stacked defects, none of which was a post platform being chosen. Dry ground never chooses posts below 18 degrees (that rule was already correct and is now pinned by a test).

1. **The floor stood on the highest ground under the footprint** (`foundationLevel`: `highest + .03`) on every tier, including the "level" tier. At 3 degrees a hut floor floated 0.27 m above its downhill wall, at 6 degrees 0.52 m, at 12 degrees 1.0 m.
2. **The only thing filling that gap was the classic kit's bearing strips** (`buildingGroundSupports`: 0.18 m wide, 0.65 m long, one per slice of the *legacy* `buildingGeos()` wall lines). The game draws the *carved* model, whose walls are somewhere else, so the strips read as 40 to 136 separate thin stone legs per building (63 for a hut at 3 degrees) under a floating wall.
3. **Kerbs, terrace walls and posts were drawn for the plot rectangle** (`w x d`), not for the model that is drawn, so a round hut got a square kerb, posts stood outside its wall, and a staddle-stone granary hung its downhill stones in the air.

Fixed: foundations are now read from the real generated spec (`src/scene/groundPlan.ts`), the floor takes the mean ground (cut and fill), a small continuous footing follows the real wall outline down to the terrain, the door gets steps or is not buried, and post platforms are historical (squared timbers on stone pads, a ring beam and a joist) and only appear on steep ground or in flood country.

## Evidence (real code path, `scripts` run on the actual builders)

Plane terrain at the slope shown, real `assessSite` + `siteRecord`, real `foundationProfile`, real `buildingGroundSupports`, real carved spec. "floor above centre" and "floor above low wall" are metres of air between the floor and the terrain; "supports" counts boxes drawn under the building.

| slope | building | tier / foundation | BEFORE centre / low wall / supports | AFTER centre / low wall / supports |
|---|---|---|---|---|
| 0 | hut | level / none | 0.03 / 0.03 / 0 | 0.03 / 0.03 / 0 |
| 3 | hut | level / none | 0.13 / 0.27 / 63 thin strips | 0.03 / 0.17 / 8 (one continuous footing) |
| 6 | hut | moderate / pad | 0.23 / 0.52 / 99 (82 thin strips) | 0.03 / 0.31 / 8 (kerb) |
| 12 | hut | moderate / pad | 0.44 / 1.01 / 123 | 0.03 / 0.60 / 8 |
| 3 | house | level / none | 0.11 / 0.26 / 41 | 0.03 / 0.17 / 8 |
| 6 | house | moderate / pad | 0.20 / 0.48 / 71 | 0.03 / 0.31 / 8 |
| 3 | workshop | level / none | 0.10 / 0.25 / 40 | 0.03 / 0.17 / 9 |
| 6 | workshop | moderate / pad | 0.18 / 0.46 / 74 | 0.03 / 0.31 / 9 |
| 6 | granary | moderate / pad | 0.21 / 0.56 / 32 | 0.03 / 0.38 / 2 stone columns under the staddles |

Real-game renders (the actual `WorldView` + `Game` with a patch of terrain rewritten to the slope, default camera yaw 1.12 / pitch 0.38 / dist 58): `docs/renders/foundations/before/` and `docs/renders/foundations/after/`. Tool: `tools/render-preview/foundations.mjs` (`found-entry.ts`).

## What changed

| area | before | after |
|---|---|---|
| floor level, level / pad / terrace tiers | highest contact + 3 cm | mean ground under the real outline + 3 cm (uphill side cut into the earth, downhill side filled), raised only enough that an uphill door is not buried more than 10 cm |
| what meets the terrain | legacy kit bearing strips (not the drawn model) | one continuous ring under each real wall mass (`footing` 0.26 m, `kerb` 0.28 m on a levelled pad, `wall` 0.55 m on a terrace), sunk 0.18 m into the ground, mitred round the real outline; round huts get a polygon ring, not a square |
| wall that starts on a base course | gap under it | the footing rises to the course (`GroundPlan.lifts`) |
| legs the model itself stands on (staddle granary, open-shed posts) | downhill legs hung in the air | one stone column per leg, sunk to the terrain; no ring under a body the generator raised |
| doors | legacy entry, steps only above 24 cm | the carved model's real door; steps above 12 cm, longer for a taller rise; `foundationLevel` raises an uphill floor to the door |
| post platforms | rectangle lattice, 0.22 m posts, 0.18 m beam | squared 0.32 m posts on 0.56 m stone pads (staddles), ring beam 0.26 x 0.30 m, a cross joist, circular ring of posts for a round building |
| where posts appear | steep tier from 18 degrees (unchanged) | unchanged, plus **pile dwellings** for dwellings and light shelters on a marsh province or a bank within 3 m of the water and under 0.6 m above it (floor 0.9 m above the highest ground, steps up); never for kilns, ovens, forges, stores, civic halls. Granaries are raised only by their own staddle-stone model |
| ghost | rectangle footings | the same `buildingGroundSupports` path as the finished building (`carvedInputFor`/`carvedPlanFor`), so the preview matches |

Files: `src/scene/groundPlan.ts` (new, pure), `src/game/siteFoundation.ts`, `src/scene/foundations.ts`, `src/scene/buildingGrounding.ts`, `src/scene/world.ts` (plan provider, `carvedInputBase`), `src/game/slopeTiers.ts` (`flood`, `floodSite`, `pileDwellingClass`), `src/game/sim.ts` and `siteAssessmentV2.ts` (pass `flood`).

## Tests

* `scripts/slope-tiers.test.mjs`: no post platform below 18 degrees on dry ground for any class; pile dwellings only for dwellings and shelters in flood country; floor level rule (mean, door, pile lift); ground plan read from real specs for seven civs and three eras; footings sunk and below the floor; posts thick and on pads.
* `scripts/placement-fixes.test.mjs`: **no gap under the footprint on flat ground** using the real builder output (real carved spec, real `foundationProfile`, real supports): lowest part bottom within 6 cm of the terrain at the centre and every wall corner, at two yaws, for hut / house / workshop / granary; the same on 3, 6 and 10 degree slopes; doors at grade (steps present, reach the ground, stay below the floor); staddle columns sunk on a slope and absent on flat ground.

## Not changed on purpose

Terrace and post tiers for steep ground keep their costs; stilt posts never appear for fire work. Classic-kit buildings (anything not drawn by the carved layer) keep the legacy bearing strips. Two tests that were already red on `origin/main` before this work (`placement-fixes` heraldry marks and nilemark mid-distance door) are unrelated.
