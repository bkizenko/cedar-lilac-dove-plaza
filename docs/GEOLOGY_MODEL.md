# Geology model (mapgen v2, worldgenVersion 21 with geologyVersion 1)

**BLUF.** Maps now carry a geology layer in which the rock decides the shape. Seven lithologies set how fast terrain erodes. Beds of hard rock over soft rock produce cliffs, mesas, buttes, hogbacks and stepped canyons only where that pairing exists. Tectonics, rivers, ice, waves and wind add their own landforms, each gated by the cause that makes it. Every cell has a readable record (rock, under-rock, strata band, soil depth, landform tag) at `world.mapgen.geology` / `geologyAt(world, x, z)`. The layer is opt-in: a world requested without `geologyVersion: 1` is byte-identical to the pre-geology v21 generator, and old saves and v20 maps are untouched. New worlds started through `configureNewWorld` set the flag.

Not modelled and not claimed: true overhangs and sea arches (the terrain is a height field), glacial timing, absolute elevations, climate history. Where a statement below is a judgement about real-world geology that this repo cannot verify, it is marked **(unverified)**.

## Contract

- Gate: `geologyVersion: 1`, valid only with `worldgenVersion: 21` (checked in `persistence.ts`; `configureNewWorld` in `engine.ts` passes it). Without the flag nothing in `src/game/mapgen/geology/` runs.
- Pure and seeded: geology draws from its own mulberry32 streams (seed xor fixed constants). The base generator's random stream is not consumed, so the unflagged terrain does not move. No `Math.random`, no `Date.now`.
- Read: `world.mapgen.geology` holds typed arrays on the same lattice as `world.heights`:
  - `rock` and `under`: rock id at the surface and of the bed directly beneath it
  - `strata`: bed index in the local stack, 255 where the rock is not layered
  - `soil`: depth in 2 cm units (255 = 5.1 m); 0 is bare rock
  - `landform`: tag id (0 = ordinary ground)
  - `landmarks`, `lakes` (each with an origin), `counts`, `rockCounts`, `provinceAt`
- Stable ids live in `src/game/mapgen/geology/rocks.ts`. Add new ids at the end; never renumber.

### Rock ids (hardness, erodibility, residual soil in metres)

| id | rock | hardness | erodibility | soil |
|---|---|---|---|---|
| 1 | granite / gneiss | 0.95 | 0.30 | 0.55 |
| 2 | basalt | 0.90 | 0.34 | 0.90 |
| 3 | sandstone | 0.70 | 0.60 | 0.50 |
| 4 | limestone | 0.65 | 0.55 | 0.35 |
| 5 | shale / clay | 0.18 | 1.90 | 1.30 |
| 6 | volcanic ash / tuff / scoria | 0.30 | 1.40 | 1.70 |
| 7 | sediment (alluvium, loess, till, sand) | 0.06 | 2.30 | 2.80 |

"Hard" means hardness >= 0.6, "soft" means <= 0.45. The values are game tuning chosen for ordering (granite and basalt resist, shale and alluvium yield), not measurements **(unverified as absolute numbers)**.

### Landform tags

54 tags (ids 0-53) are listed in `LANDFORMS` in `rocks.ts` with a group and a note. Each cell carries the single tag with the highest priority. Groups: structural (cliff, mesa, butte, hogback, cuesta, escarpment, fault-scarp, rift-valley, crag, inselberg, tor), igneous (volcanic-cone, caldera, lava-field, basalt-columns), karst (sinkhole, karst-tower, limestone-pavement), glacial (cirque, u-valley, fjord, moraine, drumlin, kettle), fluvial (gorge, canyon, waterfall, knickpoint, braided-reach, river-terrace, meander-belt, floodplain, oxbow, alluvial-fan), coastal (sea-cliff, sea-stack, sea-arch, beach, spit, barrier bar, lagoon, estuary, tidal-flat) and aeolian (dune, wadi, yardang, badlands, desert-pavement, playa), plus surface cover (scree, boulder-field, exposed-strata).

## Pipeline order

1. Base terrain (uplift ranges, coastline) as before.
2. Lithology provinces and tectonic plan: sedimentary provinces, granite cores and plutons, basalt plateaus, coastal sediment, range-parallel dip, rift and fault parameters.
3. Faults and rift valley imposed on the surface.
4. Erosion with per-cell erodibility: the same stream-power and diffusion loop, scaled by the rock at each cell, so hard rock holds relief and soft rock is stripped.
5. Stratigraphic relief: each hard bed becomes a cliff band with a flat tread, each soft bed a plain slope. Gain scales with slope and with dip, so plains stay smooth and dipping beds become hogbacks. One light smoothing pass removes cell-sized stair edges.
6. Inselbergs, volcanoes (cones, calderas, lava flows) and rift features.
7. Sub-cell coast, then climate.
8. Surface processes: alluvial fans, glaciation, aeolian, humid karst, coasts. Craters, cirques, scour and kettles are dug as bowls so the ordinary hydrology flood fill turns them into lakes.
9. Hydrology, then river shaping: waterfalls, gorges, braided reaches, terraces, oxbow lakes.
10. Height field, final features (sinkholes, tors, playa flats), bank terrain, geology read, biomes, placement.

## Processes and the real-world analogues they stand for

| Process | What the code does | Analogue |
|---|---|---|
| Cap-rock over soft rock | Repeating hard-over-soft stacks; stairs where slope or dip is present; mesa and butte by connected-area size; hogback from tilt gradient | Colorado Plateau, Grand Canyon strata; Monument Valley buttes; Dakota hogback |
| Flood-basalt plateau | Basalt flows as a hard bed over ash; columns where basalt is steep | Deccan Traps, Columbia River basalts, Giant's Causeway |
| Range uplift with dip away from axes | Beds tilt away from range spines | Sedimentary foreland of the Rockies **(simplified)** |
| Rift valley and fault scarps | Graben floor between shoulders; throw along a fault line | East African Rift, Rhine graben, Basin and Range |
| Rain shadow and orographic rain | Climate step feeds river density | Sierra Nevada / Great Basin |
| Granite domes and tors | Domes where granite is deep; tors on granite ridges | Yosemite domes, Dartmoor tors, Ayers Rock-type inselbergs **(scale not matched)** |
| Volcanoes | Cone, caldera with crater lake, lava field | Crater Lake, Hawaiian shields **(shape simplified)** |
| Karst | Sinkholes and pavement on limestone; towers in humid warm climates | Yucatan cenotes, Halong Bay, Guilin |
| Fluvial | Gorges and waterfalls on hard rock steps; terraces and meander belts on soft low-gradient reaches; braided reaches on fans; oxbow lakes from cut-off bends | Mississippi meanders and oxbows, Platte braided gravel, Niagara-type falls **(scale not matched)** |
| Glacial and periglacial | Cirques with tarns, U-valleys, terminal moraines, kettles beyond them, fjords on cold coasts, drift lowlands with drumlins | Alpine cirques, Norwegian fjords, Wisconsin drift and kettles |
| Coast | Cliffs on hard rock facing open water, beaches where soft or sheltered; stacks; spits; barrier bars with lagoons; estuaries and tidal flats | Dorset coast, Cape Cod spit, Outer Banks |
| Aeolian and arid | Wind-oriented dunes; wadis; yardangs and badlands on soft rock; desert pavement on stable flats; playas in closed basins | Sahara dunes, Lut yardangs, Wadi Rum, Death Valley playas |

Fertility is not an input to any of these. Beauty (relief, stratification, rare vistas) is produced independently of the economy.

## Presets

Each preset has a weight vector (`geo` in `presets.ts`) that shifts what dominates: river-valley (terraces, oxbows, floodplain, gorge steps), highland (cirques, U-valleys, crags, fjords), steppe (wadis, yardangs, badlands, pavement, playas), lakeland (drumlins, kettles, moraine, scour lakes), archipelago (cones, calderas, lava, sea stacks, spits, lagoons). Other presets blend the same weights.

## Verification

`scripts/mapgen-geology.test.mjs` checks: signature landforms per preset, determinism, no NaN or out-of-range ids, camps on passable soil-covered ground, cap-rock tags only where hard rock lies over soft rock, sea cliffs on hard rock, the CPU budget (12 s) with at most two placement attempts, and that the unflagged path carries no geology. The existing mapgen tests all still pass.

Renders are in `docs/renders/geology/`, produced with `scripts/mapgen-preview.mjs`. Modes: `biome`, `height`, `geology` (tag overlay with legend) and `rock`. Environment: `ZOOM=cx,cz,span`, `VIEW=x,z,yawDeg,pitchDeg,fovDeg,eyeH[,name]`, `GEO=0`, `V=20`, `PX`, `VW`, `VH`, `VD`, `COVER=0`.

## Known limits

- Sea arches are a tag and a landmark only; a height field cannot hold an opening.
- Soil and tags are on the game lattice, so edges are a cell wide at close range; previews blend them.
- Placement (trees, stones) does not yet read the geology grid; economy hooks for scree and thin soil are not wired.
- Some steppe peaks read as sharp pyramids from ground level; the stratigraphic gain on steep slopes needs a softer cap.
- Cirque and stratum stair edges can read as nested rings from above on high-relief granite and basalt terrain.
