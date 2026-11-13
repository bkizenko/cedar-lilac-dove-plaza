# Future systems audit: real-Earth map, people, animals, goods, trade, ruins and wonders

Read-only audit of `origin/main` at `e2faa77`. No game code was changed. Owner asked for six areas (A to F) "for later"; each has current state with file paths, gaps, and a build order by dependency (no durations).

## BLUF

1. **Real-Earth map is feasible and cheap if it is a window, not a globe.** Using the game's own walk constants (gatherer 5.4 m/s, loaded factor 0.8, 56.25 s simulation day = **243 m per game day**, `src/game/routeWear.ts:36`, `src/game/calendarPacing.ts`), a real traveller's day (24 to 32 km sourced; 25 km used) means **1 game metre is about 103 real metres** ("pace-true"). A 1040 m world is then a 107 km window, a 2080 m world a 214 km window. At that scale one mapgen cell (4.06 m) is about 418 real metres, almost exactly one sample of GEBCO/ETOPO at 15 arc-seconds (about 463 m), so **no heavy downsampling is needed: crop, scale heights by 1/103 (keeps true slopes; Everest-size relief becomes 86 m, under the 144 m clamp), feed the result into the existing `Terrain` contract and let hydrology, biomes and placement run unchanged.** Both ETOPO 2022 (CC0) and GEBCO (public domain, credit required) are usable and can be baked as small Int16 window files. Crossing the whole planet at 1:1 would take 14.6 days of non-stop 1x play for an Atlantic-to-Pacific US route (table in A4), so continents are not walkable at honest scale; that is a finding, not a bug.
2. **Individuals: practice exists but is linear-and-capped, not diminishing-returns, and it is fragmented** (production recipes, toolmaking, crafting XP, combat XP, draft, domestication, housing). There is no shared skill model, no per-person farming/hunting/fishing/sailing skill (sailing and haulage are per-tribe), and **no city-level specialisation mechanic** (only three seeded multipliers in `villagePersonality.ts`).
3. **Animals: goat, sheep, cattle (draft/ox role) and horse are real; donkey, mule, camel, dog, chariot, wagon and caravan animals other than goat/horse/cattle do not exist** (donkey/mule appear only as a render reference string). Handcart and animal-drawn cart exist; chariot does not.
4. **Goods: pottery carries a per-village style string and origin, but trade items are not distinguished by civ**, there are no liquids (oil, wine) and no cash crops (crops are only grain, pulses, tubers). Containers are modelled as packed-litre volumes plus a basket food bonus and a 32 L water jar; no amphora/barrel/sack logic.
5. **Trade today is need-driven barter of five resources plus ten bulk items** (`tradeNeeds.ts`). The research (E) shows the real drivers were scarce inputs (tin, copper, salt, obsidian), state demand (Roman annona), taxes/tolls, and monopoly. The game has no tin, salt or obsidian resource and no per-civ comparative advantage, so each civ is not yet economically unique. A "specialty good plus a scarce input" layer on top of the existing `civGenerator` ecology (`trade`, `surplus`, `pastoral`, `sacred`) is the smallest change that makes civs trade-worthy.
6. **Wonders: a modular kit already exists** (`src/scene/wonderKit.ts`: 19 kit pieces, 6 function cores, civ signatures, seeded axis/crown/flank grammar, JSON presets) but the **game side founds only 4 of 6 families, has no player UI for founding, and a finished wonder has no gameplay effect beyond a ruler-ledger event**. Ruins have a pure generator (`src/scene/ruins.ts`) that is not wired to anything. Section F proposes a data-driven `WonderDefinition` registry, 26 concepts, and a suggest mode.

## How claims are marked

- Game claims cite file paths (line numbers where useful) and were read from the source at `e2faa77`.
- Real-world claims cite a link I fetched in this session. Anything else is tagged **[UNVERIFIED]**. Pages I could not fetch are listed in section H.
- "Game metre" means one world metre in `src/game` (world size 1040, 1560 or 2080 m: `src/game/worldOptions.ts:5`).

---

## A. Real-Earth map and scale model

### A1. Current state

| Item | Where | Fact |
|---|---|---|
| Generator | `src/game/mapgen/index.ts` | `generateMapWorld(seed, request)`; `buildOnce` runs `buildTerrain` -> `buildClimate` -> `buildHydrology` -> `HeightField` -> biomes -> `placeWorld`. `MAPGEN_VERSION = 1`. |
| Working grid | `index.ts` `WORKING_CELLS = 256` | Terrain is always 257 x 257 vertices regardless of world size; cell = size / 256 (4.06 m at 1040). Final heights grid is `segs+1` (257 for 1040, 513 for 2080), sampled from `HeightField.at()`, clamped `Math.min(144, ...)`. |
| Terrain contract | `mapgen/terrain.ts:8` | `Terrain = {n, size, cell, h (m above coast, sea floor negative), sea mask, signed (distance to shore), ranges, uplift 0..1, axis, landFraction, geo?}`. Anything that fills this object can replace `buildTerrain`. |
| Presets | `mapgen/presets.ts` | 8 presets (`archipelago, island, continents, pangaea, river-valley, highland, steppe, lakeland`); `PresetSpec` feeds climate (`temp`, `wet`), hydrology and placement (`land`, `landmasses`). |
| Climate | `mapgen/climate.ts` | Temperature from a random "pole" vector, `seaTemp`, `span`, and a lapse of 0.058 degrees C per game metre of elevation. Wind from the tectonic axis. |
| Frozen old generator | `src/game/mapgenV20/README.md` | Published V20 is immutable; new work goes in `mapgen/` behind a new generation number. A real-earth mode must follow this rule. |
| Scale constants | `src/game/constants.ts` `UNITS.worker.speed = 5.4`; `routeWear.ts:36` `dayWalkMetres = speed * 0.8 * simulationDaySeconds`; `calendarPacing.ts` `yearSeconds 1800, daysPerYear 32` | Sim day = 56.25 s, **243 m loaded day walk** (304 m unloaded). Waystation spacing is 0.85 of that (`waystations.ts` `spacingFraction`). |
| Time controls | `sim.ts:5866` | 1x/2x/4x multiplier; `sim.ts:5867` runs night at 1.6x sim speed, so a sim day takes slightly less than 56.25 real seconds at 1x. |
| Real-world data in repo | none | No DEM, coastline or country data exists. |

### A2. Datasets (fetched)

| Dataset | Resolution | Format and size | Licence | Fit |
|---|---|---|---|---|
| **ETOPO 2022** (NOAA NCEI) | 15, 30 and 60 arc-second; Ice Surface and Bedrock variants; topography + bathymetry + shoreline ([NCEI product page](https://www.ncei.noaa.gov/products/etopo-global-relief-model)) | GeoTIFF and NetCDF; 15" is tiled; page gives no file sizes ([data.gov record](https://catalog.data.gov/dataset/etopo-2022-15-arc-second-global-relief-model)) | **CC0 1.0** per the data.gov record (the NCEI page itself states no licence) | Best primary source: one file family covers land and sea, a customised-download grid extract exists. |
| **GEBCO 2025 grid** | 15 arc-second, 43,200 x 86,400 | NetCDF 4, Int16 metres; **7.5 GB** global, area downloads offered ([GEBCO](https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2025-grid)) | Public domain, commercial use allowed, **credit required**, no implied endorsement, not for navigation | Equal quality alternative. Its land elevation outside polar zones is SRTM15+ V2.7; north of 60N mostly GMTED2010. |
| **AWS Terrain Tiles** (Mapzen) | Zooms 0 to 15; sources: 3DEP 3 and 10 m (US), SRTM 30 m, GMTED, ETOPO1 for bathymetry ([FME doc](https://docs.safe.com/fme/html/FME-Form-Documentation/FME-ReadersWriters/terraintilesaws/terraintilesaws.htm), [Mapzen](https://mapzen.com/blog/terrain-tile-service/)) | Terrarium PNG decode `(R*256 + G + B/256) - 32768`; also GeoTIFF and Skadi HGT | Free; **attribution required**; oversampled where source is coarse | Good for a runtime fetch of a chosen window; overkill (30 m) for this scale; bathymetry only ETOPO1 (1 arc-minute). |
| **SRTM** (30 m land) | 1 arc-second | via Terrain Tiles above | licence not verified: **[UNVERIFIED]** | Not needed: at 418 m per cell its detail is thrown away. |
| **Natural Earth** | 1:10m, 1:50m, 1:110m raster + vector ([Natural Earth](https://www.naturalearthdata.com/about/)) | not fetched | "All versions ... are in the public domain" | Coastlines, rivers, lakes, country names as optional overlays. That it ships rivers/lakes vectors and a usable heightmap is **[UNVERIFIED]**; it is not a heightmap source. |

Recommendation: **ETOPO 2022 15" (CC0) as the single baked source**, GEBCO as fallback. Do not fetch at runtime; bake.

### A3. Conversion to a mapgen v2 world (design)

1. **Curated window catalogue (build-time tool, `tools/`).** For each chosen window (lat, lon, span = `size * k` metres) extract the ETOPO grid, resample with an area-average to 257 x 257 (box filter; at k = 103 it is about 1:1), quantise to Int16 decimetres, deflate. Size arithmetic: 257 x 257 x 2 B = 132 KB raw, 513 x 513 x 2 B = 526 KB raw, before compression. A 30-window catalogue is a few MB. Store under `public/` with a manifest `{id, lat, lon, spanKm, k, source: "ETOPO 2022", licence: "CC0", attribution}`.
2. **New terrain builder `terrainFromDem(window) : Terrain`** next to `buildTerrain`, same return shape: `h = real / k` (slope-preserving; see A4), `sea = h <= 0`, `signed` by distance transform from the shore, `uplift` from normalised slope and elevation (it drives `HeightField.rough` detail), `ranges` from ridge extraction (they feed `features` and `placement.mountain()`), `axis` from the principal ridge direction, `landFraction` measured. Skip the stream-power erosion and layout stages (DEM is already eroded); do not skip `priorityFlood` pit filling inside hydrology.
3. **Rivers and lakes.** Let `buildHydrology` route flow on the DEM. At 418 m per cell major drainage will be plausible but will not reproduce real river courses; to pin real rivers, rasterise a river vector (Natural Earth is a candidate, **[UNVERIFIED]** for river layers) into a flow bias. Keep `bankTileKeys` budget (<= 1850) and 120 water-body cap in `index.ts` in mind: dense DEM drainage can exceed them and prune tributaries.
4. **Climate.** Add a `latitude` input: temperature from real latitude of the window centre, wind from a prevailing-wind table by latitude band (**[UNVERIFIED]** table, would need a cited source), and a **per-world lapse coefficient**: the current 0.058 per game metre assumes 30 to 120 m relief; with 1/k vertical scaling the coefficient must be scaled up by k or mountains will not be cold.
5. **Preset.** Add `real-earth` to `MAP_PRESETS` with a `PresetSpec` synthesised from the window (land fraction, relief, rivers). `isMapPreset`, `PRESETS` and `WorldRequest.preset` all key off the union, so the type change ripples to `worldOptions.ts`, `landforms.ts` validation and the world-setup UI.
6. **Fairness and starts.** `placeWorld` needs enough fair starts, copper/iron clusters and water (`index.ts` retries 9 times, then falls back to `river-valley`). A real window may fail; curate windows by running them through the generator and storing only those that pass, and store the passing `terrainSeed`.
7. **Versioning.** New generation number; manifest hash stored in `world.options` so a save regenerates from the same baked bytes. `mapgenV20` stays untouched.
8. **Names.** Optional overlay of real place names from Natural Earth is **[UNVERIFIED]** as a data source; if used, civ-name invention in `cultureNaming.ts` should stay the default for cultures.

### A4. Scale model

**Real walking, fetched figures.** Roman army: 15 to 20 miles per day on a seven-hour march ([Army Heritage Center, Marching Rates](https://www.armyheritage.org/wp-content/uploads/ref-bibs/subjects/Marching/Marching%20Rates.pdf)); Vegetius: 20 Roman miles, about 29.5 km, as the standard march and 24 Roman miles, about 36 km, forced ([imperiumromanum.pl](https://imperiumromanum.pl/en/article/how-did-the-romans-march/)); modern doctrine 20 to 32 km normal foot march (Army Heritage page, uncited there). **Assumption used here: a travelling person with a load covers 25 km per day** (inside the sourced 24 to 32 km band). A sedentary "average person" figure for non-travel walking was not fetched: **[UNVERIFIED]**; it is not what a journey model needs.

**Game walk.** 243 m per loaded game day (A1). Unloaded 304 m. Actual in-game journey time also includes terrain pace, fatigue and burden (`sim.ts:4156` multiplies many factors), so these are best-case.

**Pace-true compression.** k = 25,000 m / 243 m = **103** (82 at 20 km/day, 121 at Vegetius's 29.5 km). Consequences at k = 103:

- 1040 m world = **107 km**; 1560 m = 160 km; 2080 m = 214 km across.
- Game cell 4.06 m = 418 real metres (about 0.9 GEBCO/ETOPO 15" cell).
- Waystation spacing (0.85 day) = about 207 game metres = 21 real km.
- Vertical scaling 1/k keeps true slope angles; Everest-size 8,849 m becomes 86 m (clamp is 144 m). Shelf depth of 200 m becomes about 2 m, which suits the game's `harbourDeepMetres` 2.5 (`wonderSites.ts`) only loosely: needs playtest.

**Crossing times.** Distances: Lincoln Highway original length 3,389 miles = 5,454 km New York to San Francisco ([Wikipedia](https://en.wikipedia.org/wiki/Lincoln_Highway)); Trans-Siberian Moscow to Vladivostok 9,289 km ([Wikipedia](https://en.wikipedia.org/wiki/Trans-Siberian_Railway)); Silk Road about 6,000 km across Eurasia ([The Collector](https://thecollector.com/what-was-the-silk-road)); equator 40,075 km and meridional circumference 40,008 km ([Space.com](https://www.space.com/17638-how-big-is-earth.html)), so **pole to pole along a meridian = 20,004 km** (half the meridional circumference, my arithmetic). Roads are not walking routes; they stand in for "known routes", which are longer than straight lines. Rows give game days at 243 m/day (game year = 32 days) and non-stop sim time at 1x (56.25 s per day; divide by 4 for the 4x button).

`k` = real metres per game metre.

| Route (real km) | Real days at 25 km/day | k = 1 (game days / years / hours at 1x) | k = 10 | k = 100 | k = 103 (pace-true) | k = 1000 |
|---|---|---|---|---|---|---|
| US coast to coast, Lincoln Hwy (5,454) | 218 | 22,444 d / 701 y / 351 h (14.6 days) | 2,244 d / 70 y / 35 h | 224 d / 7.0 y / 3.5 h | 218 d / 6.8 y / 3.4 h | 22 d / 0.7 y / 0.4 h |
| Trans-Siberian line (9,289) | 372 | 38,226 d / 1,195 y / 597 h (24.9 days) | 3,823 d / 119 y / 60 h | 382 d / 12 y / 6.0 h | 372 d / 11.6 y / 5.8 h | 38 d / 1.2 y / 0.6 h |
| Silk Road, Eurasia (about 6,000) | 240 | 24,691 d / 772 y / 386 h (16.1 days) | 2,469 d / 77 y / 39 h | 247 d / 7.7 y / 3.9 h | 240 d / 7.5 y / 3.8 h | 25 d / 0.8 y / 0.4 h |
| Pole to pole, meridian (20,004) | 800 | 82,321 d / 2,573 y / 1,286 h (53.6 days) | 8,232 d / 257 y / 129 h | 823 d / 26 y / 13 h | 800 d / 25 y / 12.5 h | 82 d / 2.6 y / 1.3 h |
| Equator once round (40,075) | 1,603 | 164,918 d / 5,154 y / 2,577 h (107 days) | 16,492 d / 515 y / 258 h | 1,649 d / 52 y / 26 h | 1,603 d / 50 y / 25 h | 165 d / 5.2 y / 2.6 h |

Reading the table: **at 1:1 a continent takes days of uninterrupted play; at pace-true scale the same walk takes a handful of play hours and years of game calendar, which is what the sim is calibrated for. At k = 1000 a crossing is a few game weeks, but then a game day walk would be 243 real km, so walking realism is lost.** Fitting the whole equator into a 2080 m map needs k = 19,267 (a game day would span 4,682 real km), so **whole-planet maps are not walkable and, if wanted, need a separate abstract journey layer (ship and caravan legs with real-speed tables), not the unit-walk sim.** Sea speeds were not sourced: **[UNVERIFIED]**.

### A5. Gaps

- No `terrainFromDem`, window tool, manifest, `real-earth` preset, latitude-aware climate, or lapse scaling.
- Hydrology and placement have not been exercised on real-relief inputs (pit filling, bank-tile budget, fairness).
- Vertical scale policy (1/k for macro relief, native metres for micro features) needs playtesting against gameplay thresholds that are in game metres (flood clearance, river depth, `harbourDeepMetres`, bridge span 28 m in `transit.ts`).
- Polar windows: ETOPO has Ice Surface vs Bedrock variants; policy needed.
- Attribution UI (GEBCO requires credit; Terrain Tiles require attribution).

### A6. Build order (dependency)

1. A single exported scale module (`REAL_WORLD_SCALE`: day-walk metres, pace-true k, cell metres) so waystations, trade and this feature share one constant.
2. Window tool + manifest + licence/attribution record (no game dependency).
3. `terrainFromDem` returning `Terrain`, with a unit test comparing against a synthetic DEM.
4. Latitude-aware climate and lapse coefficient (needs 3).
5. `real-earth` preset and generation number, with a passing-window curation script (needs 3 and 4).
6. Optional river/lake vector bias and real-name overlay (needs 5).
7. World-setup UI: window picker, attribution, scale readout (needs 5).
8. Only then consider a separate abstract planet layer.

---

## B. Individuals: abilities and skill growth

### B1. Current state

| Mechanism | File | What it does | Shape of growth |
|---|---|---|---|
| Innate predisposition | `src/game/people.ts` | Per-person stable hash: `size` 0.88 to 1.12, `strength`, `speed`, `fighting` 0.85 to 1.15, `trading` 0.8 to 1.2 (bell of three samples from `u.id`). Used in speed (`sim.ts:4156`), damage (`sim.ts:4920`), barter (`barter.ts:65,88,163`), appetite (`settlement.ts:58`). | Fixed at birth; no aptitude per craft. |
| Production practice | `productionPractice.ts` | `PRODUCTION_PRACTICE_RULES`: +0.025 per own successful batch, +0.0125 per taught batch, **hard cap +0.20**; mentor after 3 successes; apprenticeship by watching; per-person `u.productionSkills[recipe]`, per-tribe demonstrations `productionPractice`. | **Linear, then flat cap** (about 8 batches to cap). |
| Toolmaking | `crafting.ts:33-41` | `toolmakingPracticeRate` up to +20% over 1200 s; general `craftingXP` gives up to +30% at 1200 s, XP capped 36,000. | Linear to cap. |
| Combat | `sim.ts:4921,5003,5338`; `combatCounters.ts` | `combatXP` +0.2 per hit, +6 per drill, **capped 150**; veteran threshold `FORMATION_RULES.veteranXp`. | Linear to cap. |
| Domestication handling | `domestication.ts` | `practicePerCompleted` 0.005, `maximumPracticeBonus` 0.10, plus per-animal familiarity. | Linear to cap. |
| Draft work | `draftTraction.ts`, `farmTools.ts:169` | `draftPracticeSeconds` normalised to `DRAFT_TRACTION_RULES.practiceSeconds`. | Linear to cap. |
| Housing | `housingTypes.ts` `HousingSkill` | Provenance record (source house, origin team), not a rate. | n/a |
| Sailing, hauling | `boatPractice.ts`, `haulage.ts:129` | `BoatPractice`, `SailingPractice`, `haulagePractice` live on the **tribe**, not the person. | Counters that unlock options (e.g. `WHEEL_PRACTICE = 60` deliveries). |
| Village personality | `villagePersonality.ts` | Three multipliers per society (sociability, boldness, caution) from seed and team. | Fixed. |
| Rulers | `rulerGenome.ts` | 13 traits, 5 competences (martial, statecraft, diplomacy, stewardship, learning), ambitions, life-event drift (`evolve`). Great persons (`greatPersons.ts`) shift these. | Event-driven; only for rulers. |
| Labour policy | `labor.ts`, `types.ts:611` | Society-level priority (`balanced/food/build/wood/stone/hunt/explore/trade`), not a specialisation. | Switch. |
| Catalogue promise | `productionCatalog.ts` stations 63, 96, 98 | "Specialist toolmaker", "Specialist guild", "University" are `planned`/`partial`. | n/a |

Design intent exists in `docs/UNIQUE_GOODS_AND_POTTERY.md`: specialisation is an emergent outcome of land and practice, never a permanent bonus.

### B2. Gaps

- No **diminishing-returns** curve anywhere: every rate is `1 + min(cap, n * step)`. Returns are constant until a hard wall.
- No shared skill store: seven unrelated fields on `Unit`/`Tribe`. No decay, no forgetting, no ageing, no teaching beyond production recipes.
- No per-person skills for farming, hunting, fishing, building, sailing, trading, healing, leading. No per-person aptitude per skill (only five generic predispositions).
- No **city-level specialisation**: nothing aggregates a settlement's practice into an identity (renowned potters, shipwrights), and nothing makes that identity affect trade, prestige or recruitment.
- Rulers have rich competences, ordinary residents do not; the two systems share nothing.

### B3. Proposal

- One module `skills.ts`: `SkillId` (a closed list tied to existing recipes/jobs), per-unit `skills: Partial<Record<SkillId,{xp:number; last:number}>>`, and one curve `skillLevel(xp, aptitude) = aptitude * (1 - exp(-xp / tau))` (saturating exponential; `tau` per skill) or a power law; rate effect `1 + maxBonus * level`. This reproduces today's caps as a special case, so existing tests can be kept by choosing `tau` that matches the first few batches.
- Aptitude per skill from the existing hash (`people.ts` pattern), a hidden 0.8 to 1.2 multiplier on gain rate, plus a small heritable component from parents (`kinshipBridge.ts` exists).
- Optional slow decay when unpracticed, and teacher bonus (existing `taughtRatePerBatch` generalised).
- **City specialisation** = derived read model: for each community (`communities.ts`), sum member skill levels per `SkillId` and per produced good over a trailing window; the top one or two become a named reputation ("river potters"). Effects through existing hooks only: barter terms (`tradePricing.ts`), trader visits (`traderInteraction.ts`), recruitment of apprentices from other societies (`tradedTeaching.ts`), prestige (`prestigeScore.ts`). Nothing stored besides the skill XP.

### B4. Build order

1. Skill curve and store (pure, tested).
2. Migrate production practice, toolmaking, crafting XP behind the new curve (keeps saves by reading old fields).
3. Add skills for jobs that have none (farming, hunting, fishing, building, sailing per person).
4. Teaching/apprenticeship generalised beyond recipes.
5. Community specialisation read model.
6. Hooks into trade pricing, visitors, prestige (needs D and E systems for meaningful effects).

---

## C. Animals

### C1. Current state

| Species | State | Where |
|---|---|---|
| **Goat** | Wild -> taming (bait 10 food + 2 wood) -> pen -> milk, breeding, **pack goat** (carry multiplier 2). | `domestication.ts`, `packAnimals.ts`, `animalSpecies.ts` `SMALL_HERD_RULES`, `husbandry.ts` |
| **Sheep** | Domesticated, wool chain, no milk, no pack role. | `sheep.ts`, `animalSpecies.ts`, `fibre.ts`, `textiles.ts` |
| **Cattle (ox role)** | Tamed (base chance 0.48), penned, milk (capacity 12), trained at a **stable** for draft/pack (multiplier 3), draw carts. Called "cattle", not "oxen". | `cattle.ts`, `domestication.ts:5`, `husbandry.ts:85-91` |
| **Horse** | Finite wild stock, up to 12 map-wide, 3 per camp (`horses.ts` `HORSE_RULES`); tamed (base 0.58), penned, stable-trained for pack (3.5) and draft. Speed coefficient 3.4. A `cavalry` unit type exists (`constants.ts`, speed 7.2) but the stable hint says "cavalry needs its later equipment": **no mounted-riding simulation** was found. | `horses.ts`, `animalSpecies.ts` `HORSE_HERD_RULES` |
| **Donkey, mule** | **Absent** from the simulation. Appears only as `reference:'Donkey/mule pack train'` text in `src/scene/caravanModels.ts:46`. | grep |
| **Camel, llama** | **Absent** (0 files). | grep |
| **Dog** | **Absent** as an entity. `'dog-drive'` is a hunt-method label and icon only (`wildCraft.ts:47-48`). | grep |
| **Chariot, wagon** | **Absent** (0 files). | grep |
| **Sled / travois** | Sled (`HAULAGE.sled`, capacity 2) -> after 60 delivered goods `WHEEL_PRACTICE` -> **wheeled handcart** (capacity 3). Render model mentions travois. | `haulage.ts:21-28`, `caravanModels.ts` |
| **Draft cart** | Handcart hitched to a trained horse or cattle at a crafting shelter (`DRAFT_CART_RULES`: 4 wood + 2 cordage, 30 s fitting, capacity 6, loaded speed 0.9, `draftCart.ts`). | `draftCart.ts`, `draftTraction.ts` |
| **Caravan** | A trade journey by people (optionally pack-animal-assisted) with a borrowed weapon for escort; up to 8 routes. Not an animal-train entity. | `caravans.ts`, `caravanRoutes.ts` |
| **Pack welfare** | Hunger, thirst, harness, capacity falls with condition. | `packAnimalState.ts`, `packJourneyCare.ts` |
| **Boats** | Riverboat, scout canoe, freight punt, sailing rig. | `boatClasses.ts`, `boatSailing.ts` |

`DomesticationSpecies = 'goat'|'sheep'|'horse'|'cattle'` and `isDraftSpecies = horse|cattle` hard-code the list (`domestication.ts:5`, `animalSpecies.ts:11`); `PackAnimal.species` validation allows only `goat|horse|cattle` (`packAnimalState.ts`).

### C2. Real-world anchors (fetched)

- Horse: domestication disputed, about 4000 BC favoured by that source, skeletal change 2500 to 2000 BC; first clear transport evidence chariot burials about 2000 BC (Sintashta/Petrovka graves 2100 to 1700 BC); riding possibly 3500 to 3000 BC ([Bionity mirror of the Wikipedia article](https://www.bionity.com/en/encyclopedia/Domestication_of_the_horse.html)).
- Donkey: domesticated about 3000 BC, probably Egypt or Mesopotamia; pack animal in early Egypt; "vital in the development of long-distance trade across Egypt" ([Wikipedia snapshot](https://webcf.waybackmachine.org/web/20211006200158/https://en.wikipedia.org/wiki/Donkey)). Old Assyrian trade ran on donkey caravans, conservatively 1,500 donkey-loads per year, 1895 to 1865 BCE ([Wikipedia: Karum](https://en.wikipedia.org/wiki/Karum_(trade_post))).
- Camel: domesticated camels in Mesopotamia by the mid-2nd millennium BCE; likely first domesticated in south-east Arabia; in the southern Levant not until the late 10th century BCE; frankincense and myrrh trade depended on camel caravans ([Biblical Archaeology Society](https://www.biblicalarchaeology.org/daily/news/camel-domestication-history-challenges-biblical-narrative/)). Silk Road caravans used camels, horses moved east ([The Collector](https://thecollector.com/what-was-the-silk-road)).
- Dogs, oxen as plough animals, llama: **[UNVERIFIED]** (not fetched).

### C3. Gaps

- Species list is closed; adding donkey/camel/dog means touching `domestication.ts`, `animalSpecies.ts`, `packAnimalState.ts`, spawn code (`horses.ts` pattern), `husbandry.ts`, saves and renderers.
- No regional fauna: horses spawn everywhere there is land; there is no wild ass, wild camelid or wolf, so "which animals this region can domesticate" is not a per-map variable.
- No chariot (needs spoked-wheel knowledge and light horses) and no riding.
- No era gating: the stable needs only the hall-adjacent building; domestication has no `age` gate comparable to the real order (dogs first, then goat/sheep/cattle, then donkey and horse, then camel).
- Caravans are people and goods, not animal trains with per-animal load and care in the route UI (the care code exists per unit).

### C4. Build order

1. Make species data-driven: one `ANIMAL_SPECIES` table (rules, domestication base chance, roles pack/draft/ride/guard/milk/wool, region predicate, era gate) replacing the three hard-coded unions.
2. Regional fauna in mapgen (`mapgen/wildlife.ts` already has `planWildlife`): wild populations per biome so the domesticable set differs per map and per civ.
3. Donkey and camel as pack species through the existing pack-care code (`packAnimalState.ts`), then caravan animal trains.
4. Dog (hunting assist and guard) via the existing hunt-method slot.
5. Chariot, then riding/cavalry link, only after 3 (needs draft cart rules generalised).

---

## D. Goods, containers, cash crops

### D1. Current state

**Item catalogue.** `ITEM_KINDS` (`production.ts:47`) includes plant fibre, cordage, basket, clay, greenware, dried ware, **pottery**, potsherds, flour, rawMeat, rawHide, bone, cleanHide, driedSkin, tannin, leather, skin/leather/hide clothing, yarn, cloth, light clothes, grain sheaves, rough grain, straw, chaff, padded armor, wool chain (rawWool, cleanWool, woolYarn, woolCloth, felt, woolCoat), greenMalt, charcoal, copper and iron ore/bloom/metal. `ResKind` is only `food|wood|stone|copper|iron` (`types.ts:39`). `FoodKind` (`types.ts:40`) has 24 kinds including bread, beer, smallBeer, fermented milk, curds, whey, jam, tallow, dried/smoked meat and fish.

**Unique pottery and goods per village/civ.**
- Per-village pottery style: `potteryOrigin()` (`pottery.ts`) assigns `Village N · <one of 8 incised/impressed styles>` from a hash of (team, site). The origin travels with vessels in `team.potteryOrigins` (cap 256 per workshop, 4096 per tribe, `production.ts:229`, validated `pottery.ts:40`) and survives handover (`communityHandover.ts:41`). Baskets have `basketOrigins` likewise.
- Per-civ **visual** pottery: `src/scene/cultureGrammar.ts:45` defines 12 forms (amphora, jar, bowl, ewer, bottle, beaker, tripod, plate, pithos, spouted, lidded, krater) and `itemStyle.ts` gives each of the 14 civs a `potForm` and decor. This is render-only.
- **Trade does not distinguish origin**: `TRADE_GOODS` (`tradeNeeds.ts`) has one `pottery` kind (worth 2.5), one `cloth`, etc.; no good is "from" a civ, and no civ is better at one (`tradePricing.ts` worth table is global).
- Methods can be taught or captured across civs (`tradedTeaching.ts`, `capturedKnowledge.ts`, `methodRecordTrade.ts`), which is the right substrate for "this civ's specialty spreads".

**Containers.** Modelled as volume, not as vessels:
- `ITEM_PACKED_LITERS` and `FOOD_PACKED_LITERS` (`inventoryVolume.ts:8-9`): pottery 20 L, basket 20 L, flour 2 L, etc.
- `CARRIED_LOAD_RULES` (`carriedLoad.ts`): abstract load units, water 24 L per unit, boat 5 cargo units per seat.
- **Basket** gives a food capacity multiplier (`fibre.ts:23`); **water jar** raises carried water to 32 L for 10 trips (`pottery.ts` `jarLiters`, `jarTrips`).
- Pottery used for brewing, curds and dairy as a reserved vessel (`production.ts:260-261`, `brewing.ts`, `curds.ts`).
- Boats: `BOAT_CLASSES` seats and `deliveredGoods` counters; cargo is the same abstract load units.
- **Not modelled**: sacks, amphorae-as-shipping-unit, barrels, dolia, wagons-as-containers, liquid cargo (oil, wine), stacking/ballast, leakage or spoilage by container type.

**Real-world anchors (fetched).** Late Bronze Age Uluburun ship (about 1320 BC): about 10 tons of copper in 354 ingots, about 1 ton of tin, over 150 Canaanite jars (terebinth resin, olives, one with glass beads), 175 glass ingots, ivory, ebony, Cypriot tableware, 155 pieces ([Wikipedia](https://en.wikipedia.org/wiki/Uluburun_shipwreck)). Amphorae carried wine, oil, honey, olives, dried fish, grain, water; typical 20 to 25 L so one or two people can carry one ([World History Encyclopedia](https://www.worldhistory.org/Amphora/.md)); Monte Testaccio holds about 53 million amphorae shards; Celts/Gauls invented wooden barrels and Romans adopted them after Caesar, widespread by early 1st century AD, shift "virtually complete" by the 3rd century AD; dolia cemented into ship floors by the 1st century BC with up to 9,500 gallons; Mesopotamian palm-wood barrels per Herodotus ([VinePair](https://vinepair.com/wine-blog/history-wine-transport-8000-years)). Roman grain moved in **sacks** on privately owned hired ships, about 70,000 kg average cargo, 2,000 to 3,000 voyages per year ([Wikipedia: Cura annonae](https://en.wikipedia.org/wiki/Cura_annonae)). Hanseatic goods: herring, salt, cloth, flax, leather, fur, wax ([The Collector](https://www.thecollector.com/hanseatic-league-medieval-economic-superpower/)). Indian Ocean: black pepper about three-quarters of westbound cargo bulk at Muziris, plus ivory, pearls, silks; Egyptian linen, glass, wine going east ([Periplus summary](https://www.worldhistory.org/Periplus_of_the_Erythraean_Sea/)). "Land goods in baskets and sacks, sea goods in amphorae then barrels" is consistent with those sources but the land-side generalisation (baskets, sacks, wagons) is **[UNVERIFIED]** as a blanket claim.

**Cash crops.** Game crops are only `CROPS = ['grain','pulses','tubers']` (`cultivation.ts:13`); flax appears only in `textiles.ts` (bast fibre, no field crop); `salt` exists as a wild-craft good (`wildCraft.ts:31`, never traded); butter, cheese, olive, wine, dye, spice, tin, obsidian, amber, silk, incense: **absent** from `src/game` (grep). Scene code has obsidian and amber as render materials only.

### D2. Gaps

- No liquid goods, so no oil/wine/amphora-barrel logic; no cash crops; no region-specific crops (olive and vine need climate; the game has `climateAt`/`habitatAt` to gate them).
- Item identity: a pottery vessel has an origin record but trade treats all pottery the same.
- Container as a first-class object (capacity, material, reuse, breakage) is absent; only baskets and one water jar behave like containers.
- No raw-resource scarcity beyond copper/iron (no tin, salt, obsidian), see E.

### D3. Proposal (modular)

- `GoodDef` registry: `{id, kind: resource|crop|processed|container, perishability, litres, container: [sack|basket|amphora|barrel|bale|ingot], inputs, climate gate, civ affinity}`. Existing `ITEM_KINDS`, `FoodKind` rows become entries; new rows: olive oil, wine, flax/linen, dye, honey, butter, cheese, salt, tin, obsidian, spice, incense.
- **Container rule** (data, not code per container): each good has allowed containers; each container has capacity litres, tare, breakage per trip, reuse count, and who can build it (basket: fibre; sack: cloth; amphora/jar: pottery, already modelled as a vessel with trips; barrel: wood + cooper skill, gated behind a knowledge topic like other methods). Sea trade prefers amphora/barrel, land prefers sack/basket/cart; the choice is an input to trade lots in `tradeNeeds.ts`.
- **Unique goods per civ**: each `CivSeed` (`civGenerator.ts`, 14 presets + remix + free) gets `signatureGood` and `style` derived from its `ecology` and materials, stamped on items it makes (extend the origin record with `civ`, `style` and a quality tier); trade pricing adds a provenance premium and teaching a "heard of the style" hook.
- Cash crops enter as ordinary `CropKind` rows with climate gates and field yields (reusing `farmCalibration.ts`, `fieldTerrain.ts`).

### D4. Build order

1. `GoodDef` registry mirroring today's goods (no behaviour change, tests prove equivalence).
2. Origin/provenance stamp on items (civ, style, quality) using the existing `potteryOrigins` pattern.
3. Container table and capacity/breakage rules; route pottery jar and basket through it.
4. New crops with climate gates (needs 1 and region data from A/C).
5. Liquid goods (oil, wine) and processing chains (needs 3 and 4).
6. Scarce raw materials (tin, salt, obsidian) in mapgen placement (needs 1; see E).
7. Trade pricing by provenance and scarcity (needs 2 and 6).

---

## E. Trade history and what to model

### E1. What drove historical trade systems (all fetched unless tagged)

| System | Drivers evidenced | Source |
|---|---|---|
| **Late Bronze Age Mediterranean** | A ship carried about 10 t copper and about 1 t tin (ingredients of bronze) plus glass, ivory, ebony, resin, oil, tableware: scarce inputs moved long distances; cargo ownership ambiguous between **royal/elite patron, diplomatic gift and merchant firm**; "trade and diplomacy closely intertwined". | [Uluburun](https://en.wikipedia.org/wiki/Uluburun_shipwreck) |
| **Mesopotamian merchants, karum** | Assyrian merchants in Anatolia (20th to 18th c. BC), about 20 trade posts; bought **tin** from the Iranian plateau and textiles from Babylonia, sold for **silver and gold**; donkey caravans; "largely profit-driven rather than state-sponsored"; **taxes** paid to the host Anatolian rulers; 22,400+ tablets record it. | [Karum](https://en.wikipedia.org/wiki/Karum_(trade_post)) |
| **Phoenician colonisation** | Cyprus timber and copper, Spain silver exchanged for glass, oil, pottery; **trade stations and way-stations**; homeland squeezed by neighbours, commerce the main driver; full colonies 8th to 6th c. BCE. | [World History Encyclopedia](https://worldhistory.org/Phoenician_Colonization) |
| **Greek colonisation** | From about 800 BCE city-states sought land and resources; "trade was usually the first step"; **emporia** (trade centres); colony list with dates. Overpopulation and exile motives: page did not state them, so **[UNVERIFIED]** here. | [World History Encyclopedia](https://worldhistory.org/timeline/Greek_Colonization) |
| **Roman annona** | Capital imported all grain; state dole for about 200,000 men; **state demand** met mostly by private ships hired by the state, which gave **subsidies, tax exemptions, insurance for winter voyages, citizenship and duty exemptions** to shipowners; state-owned horrea (290 granaries by the 4th c.); grain in sacks. | [Cura annonae](https://en.wikipedia.org/wiki/Cura_annonae) |
| **Silk Road** | Silk west, horses east; relay trade by middlemen (Sogdians, Kushan), few traveled the whole way; **state interests**: Han guarded silk with a death penalty for exporting eggs or seeds and sent an army for Fergana horses; Mongol unification made routes safe; Buddhism spread along them. | [The Collector](https://thecollector.com/what-was-the-silk-road) |
| **Indian Ocean** | Monsoon timing (Red Sea departures July to September), Greek-speaking Egyptian merchants, Roman demand after 30 BCE, Indian dynasties as partners; 120 ships a year per Strabo; pepper dominates bulk. | [Periplus](https://www.worldhistory.org/Periplus_of_the_Erythraean_Sea/) |
| **Hanseatic** | Towns allied against pirates and local lords; **monopoly leverage over herring and salt** ("white gold", needed to preserve herring); kontors (Bruges, London, Bergen, Novgorod, Antwerp); cogs over 200 t; peak nearly 200 towns. | [The Collector](https://www.thecollector.com/hanseatic-league-medieval-economic-superpower/) |
| **Neolithic obsidian** | Obsidian from a few fingerprinted sources (Melos, Cappadocia, Armenia, Pantelleria, Lipari, Sardinia, Palmarola) circulated regularly from as early as 8000 BCE; near a source (about 240 to 320 km) about 80% of chipped tools were obsidian, falling off exponentially with distance. | [EBSCO research starter](https://ebsco.com/research-starters/history/renfrew-dixon-and-cann-reconstruct-ancient-near-eastern-trade-routes) |
| **Polynesian voyaging** | Deliberate double-canoe voyages carrying crops and animals (80 to 100 people on a Tongan double canoe); star, swell and bird navigation taught within navigator families. The page gives no inter-island goods exchange, so trade drivers there are **[UNVERIFIED]**; the evidenced driver is settlement. | [World History Encyclopedia](https://www.worldhistory.org/article/1586/polynesian-navigation--settlement-of-the-pacific/) |
| **Religion / pilgrimage as a driver** | Buddhism travelled with Silk Road trade (above); pilgrimage as a trade engine itself **[UNVERIFIED]**. | n/a |

### E2. Incentives we can model, ranked by how much each makes civs unique

1. **Scarce input** (tin, copper, salt, obsidian): Uluburun, karum, Hanse, obsidian all turn on a scarce input in one place and demand elsewhere. In game: place each strategic resource in only some regions per map, so every civ lacks something (the opposite of today's `placement.ts`, where copper/iron are generated per land area near every start).
2. **Comparative advantage in a finished good** (textiles from Babylonia, glass, pottery, oil): driven by region, skill and civ ecology; lines up with section B (specialisation) and D (provenance).
3. **State demand** (annona, palace/temple patrons, Han horses): a society's `polity.fiscal` and `ecology.surplus` create standing demand that rivals can serve; already half-modelled by `tradeNeeds.ts` need-based offers.
4. **Taxes and tolls**: karum paid host rulers; the game already has a food toll at waystations (`waystations.ts` `tollFood`). Generalise to a trade-post toll set by `polity.fiscal.tax/trade`.
5. **Monopoly / control of a chokepoint** (Hanse salt and herring; Phoenician way-stations): ports and passes (`navalPorts.ts`, blockade code exists) as places a polity can tax.
6. **Safety and infrastructure** (Mongol peace, cogs, caravanserai): link to `routeWear.ts`, `waystations.ts`, escorts (`caravans.ts`).
7. **Religion and pilgrimage**: `civGenerator.ts` `Faith` already has `focus: 'trade'`, `pilgrimage` doctrine and `clergy`; effects are not in `src/game`.
8. **Seasonal windows** (monsoon): the game has weather and `seaStorms.ts`; a wind-season rule for voyage start.

### E3. What the game has to build on

| Need | Existing hook |
|---|---|
| Need-driven offers, escrow, receipts, carriers | `tradeNeeds.ts` (`TRADE_GOODS`, `TRADE_NEEDS_RULES`), `barter.ts`, `rivalTrade.ts`, `coastalTrade.ts`, `playerTrade.ts` |
| Pricing | `tradePricing.ts` (global `worth`: food 1, wood 1.2, stone 2.2, copper 4.5, iron 6.5; scarcity clamp 0.65 to 1.8) |
| Per-society temperament | `villagePersonality.ts` (sociability scales trade review rate) |
| Civ definition and modularity | `civGenerator.ts` (10 presets + 4 more skins, `generateCiv` modes `preset|remix|free`, `generateCast` unique per game), `skinState.ts` (`SkinsState` per society slot, stored in save, player slot chosen at world setup), `polityModel.ts` (`Ecology {surplus, threat, trade, pastoral, sacred, scale}`, fiscal sources, tier), `eras.ts` (stage machinery), `expansionDrivers.ts` (push/pull/enable/brake, includes `tradePull`) |
| Information | `tradeIntel.ts`, `observedSettlements`, knowledge/provenance (`knowledgeEvidence.ts`) |

Important: **civs are skins plus ruler/polity genomes; no civ has distinct economy rules today.** `ecology.trade` and `pastoral` exist but are not consumed by `tradeNeeds.ts` beyond `villagePersonality`. That is the smallest, most game-modular lever: map each `CivSeed.ecology` to a *specialty good set* and a *scarcity set* per game (the cast is already regenerated per seed), so no two civs in one game share both.

### E4. Gaps

- No scarce regional resources (only copper/iron per land area; tin, salt, obsidian absent).
- No finished-good specialty per civ; no provenance in pricing.
- No tolls other than waystation food; no chokepoint taxation; no state-demand sink beyond own needs.
- Pilgrimage and faith do not touch the economy in `src/game`.
- Navigation seasons absent.

### E5. Build order

1. Resource scarcity: region-limited placement of tin, salt, obsidian (and copper/iron by region) in mapgen with a per-world "who lacks what" report.
2. `GoodDef` and provenance (D4 steps 1 and 2), then price by provenance and scarcity.
3. Civ economic profile derived from `CivSeed.ecology` (specialty good, scarce need, fiscal style).
4. Trade offers consume the profile (`tradeNeeds.ts` reads needs from scarcity, offers from specialty).
5. Tolls and chokepoint tax by polity fiscal profile.
6. State demand sinks (annona-like stockpiling) and patron buyers.
7. Faith and pilgrimage flows; seasonal sailing windows.

---

## F. Ruins and wonders

### F1. Ruins: current state

| Piece | Where | State |
|---|---|---|
| Ruin geometry generator | `src/scene/ruins.ts` (`ruinSpec`) | Pure function: any building/wonder spec -> aged variant with decay 0..1, overgrowth, climate (arid/temperate/cold/wet), rubble, collapse, and **artifact slots** (hearth, threshold, rubble, roofFall, floorPit, wallNiche, foundation) with depth and rarity. Tested by `scripts/ruins.test.mjs`. **Imported by nothing in `src` other than itself**: not wired to the renderer or sim. |
| Destroyed buildings | `sim.ts`, `warfare.ts:74-96`, `raiders.ts:339` | A destroyed building is `hp <= 0` with `raidLoot`; raiders haul finite loot from it; `spoilRuinSupplies` decays it. No render as ruin was found (grep of `src/scene`). |
| Abandoned villages | `communities.ts:93-108` | Community `status` `growing|thriving|struggling|abandoned` (`persistence.ts:238`); a hall with no residents for 600 s is set to `hp = 0` and "was abandoned". Becomes a hp-0 building; no ruin object, no archaeology. |
| Ancient sites | `mapgen/placement.ts:450-454`, `sim.ts:2975-3000`, `discovery.ts:81` | 5 to 8 hilltop **megalith cairns** per map; first worker to arrive loots one of three fixed rewards (18 stone, 8 copper, 8 grain + 4 seeds) once, per `ancientSiteYield`. Visual cairn family exists (`buildingFamiliesExtra.ts`). |
| Excavation | `excavation.ts` | Terrain cuts for buildings and wonder sites, not archaeology. |

### F2. Wonders: current state

- **Founding** (`src/game/wonderFounding.ts`): requires Iron age (`minAge: 2`), 30 working adults, a finished town hall, 3 free crew, cost base 70 wood + 110 stone + 120 food + 1500 labour seconds, per-family extra; reserve 40 wood, 20 stone, 150 food; `maxPerTeam 3`, `maxTotal 12`, cooldown 540 s; ring search around the hall (`ringsMetres` 45 to 300). Rivals found automatically on a seeded stagger; the **player's path is only the command `found-wonder`** (`engineDispatch.ts:192`); **no UI references wonders** (grep of `src/ui`, `src/routes`, `src/components`).
- **Families**: `WONDER_RULES.families` = observatory, terraceGarden, harbor, millMarket. `cistern` and `assembly` types, site rules and terrain cuts exist (`wonderSites.ts`, `wonderEarthworks.ts`) but are refused: "needs earthworks that are not yet commissioned".
- **Effects**: completing a wonder only calls `onGameEvent(ledger, 'wonder.complete')` (`wonderFounding.ts:168`, `kinshipBridge.ts:19`). No yield, trade, defence or knowledge effect, so **a wonder is prestige-only**. Cost, site and label tables are hard-coded in four maps (`WONDER_RULES.extra`, `SITE_FAMILY`, `wonderLabel`, `WONDER_FAMILIES` in `wonderRecords.ts`).
- **Site rules** (`wonderSites.ts`): per-family predicates over `SiteSample` facts (grade, wet fraction, height range, prominence, river distance and width, deep water at face, catchment share, flood clearance). This is already the "site requirement" half of a registry.
- **Kit** (`src/scene/wonderKit.ts`, 149 lines): `KitId` 19 pieces (baseTerrace, plinth, causeway, colonnade, tholos, arch, dome, spire, pylonPair, zigguratTiers, pagodaTiers, statue, gate, wall, brazier, relief, waterFeature, bannerPair, signature), 6 cores (`sightRing, cascadeTerraces, basinQuay, millRace, cisternPit, bemaTiers`), 3 variants each at sizes S/M/L/XL; per-civ `CROWN_BIAS` (5 of 14 listed per civ), civ `SIGNATURE` landmark, seeded `Axis` (processional, cross, radial, linear, spiral), enclosure, water, relief, banners; adapts to site grade and wetness; `WonderPreset` JSON (`serializePreset/deserializePreset`). `wonderPlans.ts` (415 lines) is a separate older plan generator with physical volumes per stage. `wonderLayer.ts` draws records through the owner's `CivSkin` (`civSkin.ts` has a `signature` field).
- **Civ modularity**: 14 skins; per game each society slot has one skin (`skinState.ts`), so kit output already differs per civ per game. What differs per civ is look only.

### F3. Gaps

- 2 of 6 families unfounded; no player UI; no effects.
- Families are an enum and four scattered tables: adding a wonder means editing 5 files.
- Kit has 6 function cores; more wonders need more cores and a few more ornament pieces.
- No wonder-specific ruin (ruins generator exists and even has a `foundation` slot "under a wonder's foundation").
- No suggest mode.

### F4. Proposal: composable wonder definitions

`WonderDefinition` (data), one row per wonder, in `src/game/wonderDefs.ts` (sim facts) with a scene-side recipe in `src/scene/wonderKit.ts`:

```
id            'lighthouse'
label         per-civ naming handled by cultureNaming
site          { family: 'headland', rules: SiteRule[] }   // predicates over SiteSample + water facts, replacing the switch in wonderSiteRules
cost          { wood, stone, food, labour, plus: {goodId: n} }  // plus real goods from section D (tin, salt, lamp oil)
minAge        0..5, gates: knowledge topics needed
effect        EffectId + params                           // from the effect library below
kit           { base: KitId, core: CoreId, crown: KitId | 'civ', ornaments: KitId[], axisBias?: Axis, enclosure?: ..., water?: bool, signature: bool }
affinity      { ecology: Partial<Ecology>, ambitions: Ambition[], faithFocus?: Faith['focus'][], polityForms?: Form[] }   // for suggest mode
```

**Parts of a recipe** map one to one onto the owner's list: *base* (`baseTerrace|plinth|causeway`, extend with `terraceBench`, `podium`, `quayWall`), *mass* (function core, extend), *crown*, *ornament* (flank/relief/banner/brazier/statue/waterFeature), *site requirement* (`SiteRule[]`), *effect* (library below), *civ style* (existing `CROWN_BIAS`, `SIGNATURE`, `CivSkin` palette and grammar). New cores to add: `beaconTower, granaryRow, aqueductSpan, stepwell, stoneAvenue, archiveHall, caravanCourt, wallCircuit, shipSlips, saltPans, terraceFields, bathHall, hippodromeOval, mausoleumMound, shrineStair, arcadeBridge, quarryCut, voyagingPlatform`.

**Effect library** (each implemented once, parameterised; all use existing systems so nothing is invented):

| Effect id | Existing system it plugs into | Param |
|---|---|---|
| `prestige` | `kinshipBridge` ledger, `prestigeScore.ts`, `civicPrestige.ts` | glory per era |
| `yieldBoost` (food, wood, stone, fibre) in radius | `settlement.ts` gather rates, `fieldTerrain.ts` | radius, multiplier |
| `storage` (stock cap, spoilage reduction) | `pantry.ts`, `foodPreservation.ts` | caps |
| `waterReach` | `waterWorks.ts`, `waterReach.ts` | carry reduction |
| `routeSafety / toll` | `routeWear.ts`, `waystations.ts` | toll, rest |
| `portCapacity / voyageSafety` | `navalPorts.ts`, `seaStorms.ts`, `coastalTrade.ts` | berths, turnback chance |
| `watch` (sight radius, raid warning) | `sightRadii.ts`, `guardDuty.ts`, `defense.ts` | radius |
| `defense` (damage reduction in radius) | `defense.ts`, `fortifications.ts` | factor |
| `knowledge` (method retention, teach speed) | `methodRecords.ts`, `tradedTeaching.ts` | multiplier |
| `fiscal` (tax or trade income) | `polityModel.ts` fiscal, `tradePricing.ts` | share |
| `concord` (unrest down, legitimacy) | `unrest.ts`, `societyCivic*.ts`, `rulersState.ts` | amount |
| `craftBoost` | `crafting.ts`, `production.ts` rate | recipe set, multiplier |

### F5. Wonder concepts (26)

Real-world analogues are named from general knowledge and are **[UNVERIFIED]** (not fetched) except where a section E source is cited. Cost has `plus` goods from section D. "Cores" listed as existing (E) or new (N).

| # | Concept (analogue [UNVERIFIED]) | Site requirement | Effect | Kit recipe (base / core / crown / ornament) |
|---|---|---|---|---|
| 1 | Ring observatory (existing, "stone circles, Jantar Mantar") | prominence >= 6 m, grade <= 0.35, open sky | `knowledge` + calendar events | E: causeway / sightRing / spire / braziers |
| 2 | Terrace garden (existing, "hanging gardens") | drop >= 3 m, river within 40 m | `yieldBoost` fibre/food, `prestige` | E: baseTerrace / cascadeTerraces / arch / waterFeature |
| 3 | Great harbour (existing) | deep water 2.5 m at face, shore | `portCapacity` | E: causeway / basinQuay / statue / bannerPair |
| 4 | Mill market (existing) | river >= 6 m wide within 25 m | `craftBoost` grain + `fiscal` | E: plinth / millRace / gate / relief |
| 5 | Cistern (types exist) | catchment >= 40% slope | `waterReach`, drought buffer | E: plinth / cisternPit / colonnade / waterFeature |
| 6 | Assembly court (types exist, "Pnyx, bouleuterion") | grade 0.12 to 0.5, open ground ahead | `concord` | E: baseTerrace / bemaTiers / colonnade / bannerPair |
| 7 | Lighthouse (Pharos) | headland, deep water within 100 m, high ground | `voyageSafety`, `watch` over sea | N: plinth / beaconTower / dome or spire / brazier |
| 8 | Great granary / horreum (state horrea, [Cura annonae](https://en.wikipedia.org/wiki/Cura_annonae)) | dry, flat, near hall and port or road | `storage` | N: plinth / granaryRow / gate / wall |
| 9 | Aqueduct span (Roman aqueducts) | source higher than hall by drop, 400 m run, valley crossing | `waterReach` | N: causeway / aqueductSpan / arch / waterFeature |
| 10 | Stepwell (Indian stepwells) | arid/low rainfall, water table below ground (needs hydrology depth) | `waterReach`, `concord` | N: baseTerrace / stepwell / pagodaTiers / relief |
| 11 | Ziggurat or temple mound (Mesopotamia) | flat alluvial ground, river within 100 m | `concord`, faith `prestige` | E: baseTerrace / zigguratTiers (existing piece as core) / dome / bannerPair |
| 12 | Standing-stone avenue (megalithic alignments; links to existing cairns) | hilltop, stone nearby | `knowledge` calendar, `prestige` | N: causeway / stoneAvenue / statue |
| 13 | Library or archive (Alexandria-type) | in town, stone plus fibre/paper goods | `knowledge` | N: plinth / archiveHall / colonnade / relief |
| 14 | Caravanserai complex / karum (Old Assyrian karum, [Karum](https://en.wikipedia.org/wiki/Karum_(trade_post))) | on a worn corridor, `waystations.ts` stage 3 present | `routeSafety`, `fiscal` toll | N: plinth / caravanCourt / gate / brazier |
| 15 | Frontier wall circuit (limes, Great Wall) | ridge or river line on a border | `defense` | N: wall / wallCircuit / gate / bannerPair |
| 16 | Beacon-chain tower | high ground with line of sight to hall | `watch` raid warning | N: plinth / beaconTower / spire / brazier |
| 17 | Naval arsenal / ship slips (Venice Arsenal [UNVERIFIED]; hull classes in `boatClasses.ts`) | sheltered shore, timber stock | `craftBoost` hulls | N: causeway / shipSlips / gate |
| 18 | Salt works (Hanse salt, [The Collector](https://www.thecollector.com/hanseatic-league-medieval-economic-superpower/)) | tidal flat or salt spring | produces `salt` good (D6), `storage` for fish | N: baseTerrace / saltPans / waterFeature |
| 19 | Agricultural terraces (Andean/Asian terrace fields) | slope 0.12 to 0.35 with water | `yieldBoost` food on slopes | N: baseTerrace / terraceFields / waterFeature |
| 20 | Public baths (thermae) | water source, flat | `concord`, health | N: plinth / bathHall / dome / colonnade |
| 21 | Hippodrome or stadium | open flat ground | `concord`, `prestige` | N: baseTerrace / hippodromeOval / pylonPair / bannerPair |
| 22 | Mausoleum or great tomb (pyramid, tholos) | high or dry rise, dynastic ruler | dynasty legitimacy (`rulersState`), `prestige` | E: zigguratTiers / mausoleumMound / statue / relief |
| 23 | Pilgrim shrine stair | remote high point, spring | pilgrim visitors, `fiscal` gifts (faith `pilgrimage` doctrine in `civGenerator.ts`) | N: baseTerrace / shrineStair / pagodaTiers / brazier |
| 24 | Great arch bridge | river 12 to 28 m wide, firm banks (`transit.ts` limit 28 m today) | crossing capacity, `routeSafety` | N: causeway / arcadeBridge / pylonPair |
| 25 | Quarry monument or mine-city | quarry/ore seam (`mining.ts`) | `yieldBoost` stone/ore, `craftBoost` | N: baseTerrace / quarryCut / statue |
| 26 | Voyaging marae and canoe platform (Polynesian double canoes, [source](https://www.worldhistory.org/article/1586/polynesian-navigation--settlement-of-the-pacific/); marae specifics [UNVERIFIED]) | shore, reef or beach landing | `voyageSafety`, navigator `knowledge` | N: plinth / voyagingPlatform / statue / bannerPair |

All 26 reuse the existing `civ` style layer (palette, grammar, signature), so each civ renders each wonder in its own look and per game the seed picks axis, crown and flanks.

### F6. Suggest mode

`suggestWonders(g, team): {id, score, reasons[], site?}[]`, pure and read-only, called from a UI panel and from the rival planner (replacing today's seeded pick in `wonderFounding.ts` `plan()`):

1. **Feasible**: for each `WonderDefinition`, run its site rules via `findWonderSite` (ring search already cached by `noGround`), era, population, crew, goods (existing `wonderFoundingIssue`), returning the blocking reason when infeasible so the UI can say "needs a river within 40 m".
2. **Need fit**: score the effect against measured deficits already available: water-carry time and drought (`waterReach`), spoilage and winter food reserve (`reserveSeconds`), raid losses (`raidReports.ts`), port traffic and unreachable partners (`coastalStrategy.ts`), idle trade routes (`routeWear`), knowledge records lost, unrest (`unrest.ts`).
3. **Civ fit**: affinity from `CivSeed.ecology` (e.g. `trade` high favours harbour, caravanserai, arsenal; `sacred` high favours ziggurat, shrine, mausoleum; `pastoral` favours granary; `threat` favours wall and beacon), polity form, ruler ambitions (`legacyBuilding, knowledge, faith, wealth, security, conquest`), and faith focus.
4. **Terrain and resource fit**: from terrain facts at the best site and nearby finite resources (river width, deep water, stone and ore, climate).
5. Score = feasibility gate x (0.4 need + 0.3 civ + 0.3 terrain), top 3 returned with reasons; player can accept (issues the existing `found-wonder` command extended with a family id) or pin a different one. Rivals use the same list with seeded tie-breaks, so there is no randomness and saves stay deterministic.

### F7. Ruins plan

- Wire `ruinSpec` to hp-0 buildings and abandoned halls (decay from time since fall, climate from `climateAt`), then to completed wonders left without an owner society.
- Make artifact slots real: replace the single-reward `ancientSiteYield` with slot-driven finds (items, method records, potsherds with provenance, which feeds D2 and B), with excavation work from the existing crew and finite-dig rules.
- Ancient sites at world generation: seeded ruin sites of "earlier peoples" per map using `placement.ts` megalith logic.

### F8. Build order (dependency)

1. `WonderDefinition` registry replacing the four hard-coded tables; keep behaviour identical for the 4 founded families (test equivalence, plus saves keep `family` ids).
2. Effect library with `prestige` and one real effect, wired to existing systems; effect state is derived from `state.wonders` so no new save fields.
3. Player UI for wonders (list, cost, issues, found button) calling `found-wonder`.
4. Found cistern and assembly (earthworks hook already exists).
5. New cores and recipes for the 20 new concepts, grouped by which prerequisite systems exist: first those needing nothing new (8 granary, 15 wall, 16 beacon, 14 caravanserai on existing waystations), then those needing section D goods (18 salt, 7 lighthouse oil), then those needing new terrain facts (10 stepwell, 19 terraces).
6. Suggest mode (needs 1, 2, 3).
7. Ruin integration for destroyed buildings, abandoned halls, derelict wonders; slot-based finds.
8. Civ ecology to wonder affinity tuning per game cast.

---

## G. Cross-section build order

Dependencies, not durations. Earlier items unblock later ones.

1. **Constants and registries (no behaviour change)**: `REAL_WORLD_SCALE` (A6.1), `GoodDef` registry (D4.1), `ANIMAL_SPECIES` table (C4.1), `WonderDefinition` registry (F8.1), skill curve (B4.1).
2. **Provenance and containers**: item origin stamp (D4.2), container table (D4.3).
3. **Region data in mapgen**: region-limited scarce resources (E5.1), regional fauna (C4.2), climate-gated crops (D4.4).
4. **Economy**: civ economic profile (E5.3), provenance pricing (D4.7), trade reading profiles (E5.4), tolls (E5.5).
5. **People**: per-person skills (B4.2-3), city specialisation (B4.5) feeding trade (B4.6).
6. **Animals and transport**: donkey, camel, dog species (C4.3-4), caravan animal trains, chariot later (C4.5).
7. **Wonders**: effects, UI, new concepts, suggest mode, ruins (F8.2 to 8.8); concept groups wait on 2 to 4 as listed.
8. **Real-earth map** (A6): independent of 2 to 7 technically, but its value rises once region data (3) exists, because real latitude and climate then select crops, fauna and resources per window.

## H. Could not verify

- **Blocked fetches** (permission request timed out, not retried): `https://en.wikipedia.com/wiki/Walking_pace` and its redirect `https://en.wikipedia.org/wiki/Walking_pace` (average walking speed), `https://en.wikipedia.org/wiki/Indian_Ocean_trade` (and its redirect), `https://en.wikipedia.org/wiki/Horse_domestication` (the Bionity mirror was used instead), the first attempts at `https://www.ncei.noaa.gov/products/etopo-global-relief-model` variants, `https://www.gebco.net/data-products-gridded-bathymetry-data`, `https://www.naturalearthdata.com/about/terms-of-use/`, `https://registry.opendata.aws/terrain-tiles/` (the same content was later fetched from the NCEI product page, GEBCO 2025 page, Natural Earth about page and the FME/Mapzen pages).
- `https://pmc.ncbi.nlm.nih.gov/articles/PMC8550961` returned a CAPTCHA page.
- `https://www.worldhistory.org/phoenician-colonization/` failed; `https://worldhistory.org/Phoenician_Colonization` worked.
- ORBIS paper had no per-day speed figures (`ORBIS-Scheidel2015.pdf`), so ancient travel speeds rely on the army-march sources.
- ETOPO file sizes, NCEI licence text on the product page, SRTM licence, Natural Earth rivers/lakes and heightmap availability, real-world lapse rate and prevailing-wind tables, sea speeds, a sedentary daily-walking figure.
- Domestication dates for dogs and oxen, llama; Greek colonisation motives beyond land and trade; Polynesian inter-island exchange goods; pilgrimage as a trade driver; all analogue names in the F5 table except those with links.
- In-game behaviour was audited by reading code, not by running the game; no claim here was tested at runtime, including the 243 m figure (derived from constants) and that cavalry has no mounted simulation (grep found none).
- The brief mentioned the "waystation work found about 243 m"; I confirmed that number from `routeWear.ts` and `docs/parallel/AUTOPILOT.md:1323`; there is no standalone waystation doc.
