# Wonders registry

**BLUF.** Wonders are now data rows in `src/game/wonderDefs.ts` (26 rows: the 4 original foundable families, 2 original earthworks families that are listed but not foundable, and 20 new families). Each row carries site rules, a real goods and labour cost paid over four stages, an era gate, civ-trait affinity, effects from a small effect library tied to existing systems, and a kit recipe. Players found them from the Wonders panel (Hearth dock, "Wonders") with a site picker and a "Suggest a wonder" ranking; rival civs found them from the same registry; ruins and ancient sites are wired into the world. Saves are backward compatible (all new fields optional). Historical analogues are labelled [UNVERIFIED] unless a source URL is set (only granary and caravanserai have one).

## Adding a wonder
1. Add a `D({...})` row in `wonderDefs.ts` (id must be a `WonderKind`).
2. Add a recipe row in `src/scene/wonderRecipes.ts` (core, base pool, crown pool, ornaments, axis, enclosure) and, if it needs a new silhouette, a core in `wonderKit.ts`.
3. `validRegistry()` and `scripts/wonder-registry.test.mjs` check ids, costs, stage sums, site fields, effect ids and recipes.

## Construction
Four stages (foundation, raising, crowning, finishing) take 25/35/25/15 % of labour and 30/35/20/15 % of goods (last stage takes the remainder so the totals are exact). Founding spends stage-one goods from the town stock; each later stage is delivered when the crew reaches it and the wonder waits (visible scaffolding, stage shown in the panel) if goods are short. Crew are real workers; labour is capped by delivered stages. The kit renders scaffolding and partial masses per stage (`WonderOptions.stage`).

## Effects (library: `wonderEffects.ts`, capped by `EFFECT_CAPS`)
prestige (civicPrestige), knowledge (production craft progress), storage (pantry loss rates), concord (rulersRuntime.unrestOf legitimacy), defence (sim.applyCombatDamage near the wonder), portCapacity (navalPorts.stowCapacity). Effects are derived from finished `state.wonders` records, so they need no extra save fields. Wonders whose real function needs a system the game lacks carry prestige plus a hook list (column "Hooks").

## Suggest mode
`wonderSuggest.ts`: score = 0.4 needs + 0.3 civ affinity (ecology, faith, ambitions) + 0.3 terrain; unaffordable x0.85; no feasible site = 0 with the blocker shown; ties broken by `hash32('wonder-tie',seed,team,id)` so it is deterministic. Reasons are shown on each card.

## Rivals and fame
NPC tribes choose via `rivalChoice` from the same registry and found with the same stage rules. A completed wonder emits a fame pulse; societies that do not know the owner get a vague notice through `fame.ts`.

## Ruins
`ruinsWorld.ts` + `scene/ruinLayer.ts`. Abandoned or destroyed villages and fallen wonders become ruins; decay is derived from game time (collapse stages, overgrowth by climate, looted goods in loot slots). Ancient sites (4 to 7 per world) are hashed from the world seed at world generation, in the civ style, with finite loot and knowledge (the deepest slot is always lore; lore feeds a new 'lore' discovery). They are placed outside the mapgen random stream so old map seeds are unchanged.

## Saves
`state.wonders` records gain optional `look`, `fallen`, `project.delivered`; `state.ruins?` is optional with `validRuins`. Old saves load unchanged (no ruins until enabled, projects without `delivered` are treated as fully delivered). No `Math.random` or `Date.now` anywhere in the new code.

## Registry table
| id | min age | site | cost | effects | hooks (not yet real) | historical analogue |
|---|---|---|---|---|---|---|
| observatory | 2 | dry: a high point with open sky | 70 wood, 140 stone, 120 food; 1500 s | prestige 30, knowledge 0.1 | calendar events (sowing, flood and frost warnings) | Stone circles and Jantar Mantar [UNVERIFIED] |
| terraceGarden | 2 | bank ≤40m river: a slope with a drop of 3 m and a river within 40 m | 70 wood, 110 stone, 160 food; 1500 s | prestige 34, storage 0.12 | fibre and food yield in radius (settlement gather rates) | Hanging gardens [UNVERIFIED] |
| harbor | 2 | deepShore: a shore with water 2.5 m deep at the face | 110 wood, 110 stone, 120 food; 1500 s | prestige 30, portCapacity 0.3 | berths and docking queue (navalPorts) | Great harbours of the ancient Mediterranean [UNVERIFIED] |
| millMarket | 2 | bank ≤25m river: a river at least 6 m wide within 25 m | 100 wood, 110 stone, 120 food; 1500 s | prestige 28 | craft speed for grain and fibre (production rate); market tax (polityModel fiscal) | River mills and market halls [UNVERIFIED] |
| cistern | 2 | dry: a catchment slope draining toward the pit | 70 wood, 110 stone, 120 food; 1500 s | - | carry-time reduction and drought buffer (waterReach) | Cisterns of dry coasts [UNVERIFIED] | listed only (earthworks) |
| assembly | 2 | dry: a hillside facing open ground | 70 wood, 110 stone, 120 food; 1500 s | - | unrest and legitimacy (concord) | Hillside assemblies of the ancient Greek world [UNVERIFIED] | listed only (earthworks) |
| ziggurat | 1 | bank ≤100m river: flat ground within 100 m of a river | 70 wood, 150 stone, 150 food; 1800 s | prestige 36, concord 6 | priesthood offices (clergy) | Mesopotamian ziggurats [UNVERIFIED] |
| library | 3 | dry: level ground in the town | 90 wood, 130 stone, 120 food, 6 copper; 1700 s | prestige 32, knowledge 0.15 | method records kept safe from loss (methodRecords) | Alexandria-type libraries [UNVERIFIED] |
| lighthouse | 3 | deepShore: a headland with deep water within reach | 80 wood, 140 stone, 120 food, 12 copper; 1500 s | prestige 30, portCapacity 0.2 | sea-storm turnback chance (seaStorms); sight radius over water (sightRadii) | The Pharos of Alexandria [UNVERIFIED] |
| aqueduct | 3 | bank ≤60m river: a valley with a river and a real drop | 60 wood, 180 stone, 120 food; 2000 s | prestige 34 | water carry reduction across the town (waterReach, waterWorks) | Roman aqueducts [UNVERIFIED] |
| greatWall | 2 | dry: a ridge or rise away from the hall | 50 wood, 200 stone, 120 food; 1900 s | prestige 28, defence 0.22 | border markers and toll (polityModel fiscal) | Frontier walls such as the limes and the Great Wall [UNVERIFIED] |
| mausoleum | 2 | dry: a high dry rise | 70 wood, 190 stone, 100 food; 2000 s | prestige 38, concord 8 | dynastic legitimacy per heir (rulersState) | Pyramids and tholos tombs [UNVERIFIED] |
| colossus | 3 | bank ≤120m river: level ground near water | 60 wood, 160 stone, 120 food, 20 copper; 1900 s | prestige 50 | visibility from far away (sightRadii) | Colossus of Rhodes [UNVERIFIED] |
| stoneCircle | 1 | dry: a hilltop of hard rock | 30 wood, 160 stone, 100 food; 1600 s | prestige 26, knowledge 0.08 | calendar events (seasonal markers) | Megalithic stone circles [UNVERIFIED] |
| causeway | 2 | dry: firm ground away from the hall | 50 wood, 170 stone, 120 food; 1700 s | prestige 30 | route wear and travel speed (routeWear); toll income (fiscal) | Imperial paved roads [UNVERIFIED] |
| amphitheatre | 3 | dry: a hillside facing open ground | 70 wood, 170 stone, 120 food; 1800 s | prestige 30, concord 6 | festival events (gatherings) | Roman amphitheatres and hippodromes [UNVERIFIED] |
| iceHouse | 1 | bank ≤90m river: shaded rock ground near water | 60 wood, 90 stone, 60 food; 1100 s | prestige 14, storage 0.18 | ice trade good (goods) | Yakhchal and ice houses [UNVERIFIED] |
| citadel | 3 | dry: a defensible height | 80 wood, 190 stone, 120 food, 10 iron; 1900 s | prestige 30, defence 0.3 | garrison and siege rules (fortifications) | Hill-fort citadels [UNVERIFIED] |
| pilgrimShrine | 2 | dry: a remote high point | 50 wood, 150 stone, 140 food; 1700 s | prestige 32, concord 6 | pilgrim visitors and gifts (faith pilgrimage doctrine) | Mountain pilgrimage shrines [UNVERIFIED] |
| granary | 1 | dry: dry flat ground close to the hall | 140 wood, 90 stone, 120 food; 1300 s | prestige 16, storage 0.25 | stock cap (pantry capacity) | State horrea and the Cura annonae (https://en.wikipedia.org/wiki/Cura_annonae) |
| harbourMole | 3 | deepShore: a shore with deep water at the face | 90 wood, 170 stone, 120 food; 1800 s | prestige 26, portCapacity 0.25 | storm shelter for moored hulls (seaStorms) | Breakwater moles [UNVERIFIED] |
| caravanserai | 2 | dry: flat ground a walk from the hall | 110 wood, 110 stone, 120 food; 1400 s | prestige 24 | route safety and rest (waystations stage 3); toll income (fiscal) | Old Assyrian karum trade posts (https://en.wikipedia.org/wiki/Karum_(trade_post)) |
| bathhouse | 3 | bank ≤80m river: flat ground within 80 m of a river | 100 wood, 130 stone, 120 food; 1500 s | prestige 22, concord 5 | illness recovery (health) | Roman thermae [UNVERIFIED] |
| stepwell | 2 | dry: a catchment slope on porous rock | 40 wood, 150 stone, 120 food; 1700 s | prestige 26 | dry-season water source (waterReach, hydrology depth) | Indian stepwells [UNVERIFIED] |
| beaconTower | 1 | dry: a high point with a long view | 80 wood, 90 stone, 120 food; 1000 s | prestige 14, defence 0.12 | raid warning radius (guardDuty, sightRadii) | Beacon chains [UNVERIFIED] |
| arsenal | 3 | deepShore: a sheltered shore with deep water | 180 wood, 120 stone, 120 food, 8 iron; 1700 s | prestige 26, portCapacity 0.15 | hull build speed (boatClasses, crafting) | The Venice Arsenal [UNVERIFIED] |

## Renders
`docs/renders/wonders/`: `wonders-finished-<civ>.png` (all foundable-kit wonders, three civ styles), `wonders-building-<civ>.png` (stage 2 and 3 mid-construction), `wonders-ruins.png` (decay strip 0 to 100 %), `wonders-panel.png` (Wonders panel). Regenerate with `tools/render-preview/wonders-sheet.mjs <out> --mode=finished|building|ruins --civ=<id>`.

## Unverified
All analogue names except granary and caravanserai. Costs, ruin years and fame magnitudes are tuning guesses, not historical figures.
