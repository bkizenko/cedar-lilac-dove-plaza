# V14 world variation

This version follows the revised requirement: several major islands are usual, a large mainland with smaller islands is rare, and some maps are mostly land continuing through the map edges and corners. A universal island count is no longer the product rule. Versions 1–13 keep their exact generation.

## Measurable families

`VARIETY_RULES` in `src/game/worldVariety.ts` sets random family weights: 55% major islands, 20% edge-connected continent, 18% continents divided by a meandering sea strait, and 7% large mainland with smaller islands. Explicit pangaea chooses edge-connected land, continents chooses the divided-continent family, and archipelago chooses major islands with an 8% chance of the rare mainland family. These are distinct physical land masks, not names on one topology.

Measured dry-fraction acceptance ranges are 18–50%, 52–88%, 65–94% and 25–56% respectively. Continental modes must have at least 200 m of real dry edge contact and two dry corners. Divided continents require two substantial connected landmasses. The rare family requires a mainland with at least 65% of dry terrain and additional islands. Usual island maps retain multiple substantial components and a largest share no greater than 62%.

All geographic family measurements and eight connected ecological province gates remain in force. Continental catchments are anchored in bounded interior geological provinces while their actual physical coasts remain open at the map edges. Rivers drain toward a real sea, and ordinary foreland has independent rolling/folded relief. The full landscape is not smoothed into a plain.

Large maps sometimes need more physically eligible riparian land to meet the existing 3%-of-land connected wetland criterion. `continentalRiparian.ts` builds a real lowland tributary with a carved bed and dry gentle banks, connected to an existing downstream river. Its route avoids protected geological features and initial camp sites. It records actual cut volume, maximum cut, altered area and river length. No habitat thresholds are reduced, and relabeling dry uplands cannot pass the gate.

The V14 ecology coast scan visits each cell once. The historical Float32 relaxation path can repeatedly enqueue values that round back to the same value on broad continents. Versions 1–13 keep their old path for exact compatibility.

## Towns by usable land

A 20 m survey reserves actual flat, dry, well-approached settlement footprints. Candidate coverage estimates usable area; it is not gross island area. The default is one potential town per 70,000 m² of sampled usable ground, capped at three per landmass and separated by at least 100 m. A map always needs physically spaced room for the player and two neighbors. Initial camps are distributed by usable area divided by existing local town count, respecting the measured local capacity. They are not limited to one per island. Metrics record potential sites and actual starting counts for every connected landmass.

Examples from actual generated maps: seed 42 small edge continent is 71.2% land with two dry corners and three towns on one mainland. Seed 42 small divided continents is 84.6% land with four dry corners. Seed 42 huge rare-mainland map offers three sites on its large mainland and one on each smaller island; huge divided continents offer three on each mainland.

## Border rendering

Continental worlds derive a 160 m band of terrain outside playable bounds. Its inner vertices match the authoritative terrain edge, and its outer relief continues the same geology. A soft outside-only fog sheet obscures distant sea beneath the continental border. Both meshes are bounded scenery with raycasts disabled; no terrain cells, resources, housing, navigation or player actions are added outside the map. Renderer hooks are conditional on V14 derived continuation data. Desktop GPU acceptance remains separate from generator tests.

## Validation

`scripts/world-variety.test.mjs` exercises all four real families across all three sizes, strict actual geology, eight connected biome areas, dry camps/tree roots, settlement separation, edge/corner land, inner-edge terrain continuity and measured random-family frequencies over 2,000 seeds. It compares complete generated worlds against captured SHA-256 baselines for every historical version 1–13. `scripts/land-continuation.test.mjs` checks bounded geometry, noninteraction and material/geometry ownership. These tests do not establish final desktop visual acceptance or qualify every possible seed.

The integrated decoder accepts explicitly saved V14 worlds. New worlds use V14 after the desktop map review, physical opening-water checks and save acceptance. Restoring any existing map uses its saved generation version; old V14 saves without the seasonal plant marker keep their legacy forage.

## Initial drinking water

V14 camps now require a physically connected freshwater bank within 22 m of the initial hearth, inside its normal 26 m explored radius. The generation survey uses the live collector's actual river/lake samples, 5 m collection reach, and the same 520-cell dry-footprint navigation limits. Water geometry and explored radius are unchanged. The derived `world.openingWater` records the source, bank, distance and surveyed cell count.

Waterfront candidates use a 12×12 m dry apron for a 10 m hall plus access space, at most 3 m relief, and actual dry resource approaches in at least six nearby and four outer bearings. They still require above-average measured beauty and separation from other towns. The older broad village-clearing heuristic cannot alone supply a valid start beside narrow natural banks. All these parameters live in `OPENING_WATER_RULES`; older generation versions retain their exact opening selection.
