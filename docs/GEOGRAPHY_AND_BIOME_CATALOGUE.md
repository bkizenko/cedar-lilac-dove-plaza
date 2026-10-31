# Hearthwild geography and biome catalogue

User direction, October 31, 2026: hills, valleys, rivers and lakes are mandatory, and every map needs many biomes. This is a concrete game-design catalogue, not a claim to enumerate every scientific landform on Earth or to have implemented these items.

## Every-map acceptance contract

- Every map contains the requested major terrain families: hills, valleys/basins, mountain ranges, plateaus, canyons/gorges, cliffs, terraces, rock pillars, dunes/dry channels, rivers/tributaries, lakes, waterfall/receiving pool and wetlands, with readable coastal terrain. These are physical terrain/water/vegetation requirements, not feature labels or random optional spawns.
- At least **eight substantial ecological regions** appear on each map: meadow/grassland, mixed woodland, cool conifer forest, montane/alpine, freshwater wetland/riparian, dry scrub/woodland, arid/badlands and warm coastal/woodland. Small maps compress geographic scale deliberately; avoid abrupt random checkerboards. Tiny islands do not each repeat the whole world catalogue.
- Biome regions have measurable area, vegetation composition/density, ground material, soil/moisture, available resources, seasonal behavior and route/settlement consequences. A recolored patch does not count as a biome. Require meaningful area and usable transitions; tiny token stamps do not satisfy the minimum.
- Keep ordinary flats and gentle slopes for living/farming among pronounced relief. The player's safe opening has above-average measured scenic quality, reachable freshwater and useful subsistence resources. Hills are distributed beyond one distant showcase; exploration reveals multiple distinct regions.
- Required families vary in arrangement, extent, shape and grandeur across seeds. Rarity controls exceptional scale and composition, not whether a required family exists. Generation may retry/repair before accepting a seed; it may not silently omit a family.

## Itemized landform catalogue

### Relief and exposed geology

1. Connected mountain ranges with several summits and unequal silhouettes.
2. Ridge spines, secondary spurs, saddles and passes with usable approaches.
3. Foothills and rolling hills across substantial districts.
4. Broad valleys, nested smaller valleys and inhabited basins.
5. Narrow ravines and gullies branching into larger valleys.
6. Plateaus and elevated shelves with distinct edges and access routes.
7. Mesas and isolated buttes as members of the plateau/erosion family.
8. Incised canyons/gorges with opposing walls, varying width, bends and real floors.
9. Cliffs/escarpments and exposed layered rock faces.
10. Natural benches and terraces with unequal width/riser patterns; constructed farm terraces are separate paid work.
11. Pillar/pinnacle districts with intervening wooded or rocky ravines.
12. Rock outcrops, boulder fields, talus/scree and weathered lower slopes.
13. Fertile plains, broad floodplains, meadows and clearings; these coexist with strong relief rather than replacing it.
14. Wind-shaped dunes, interdune hollows and exposed rocky desert surfaces.
15. Badlands, branching dry channels/wadis and seasonal washes.

### Freshwater and drainage

16. Headwaters/springs or upland source basins feeding actual drainage.
17. Main rivers with descending profiles and changing width.
18. Tributaries, confluences and connected catchments.
19. River bends/meanders with uneven banks and bars.
20. Lakes with irregular shorelines, inlets/outlets and usable banks; elevated lakes need their own actual water level.
21. Pools/backwaters and seasonal wet depressions associated with the drainage network.
22. Waterfalls with linked upper/lower water, a real bed drop and receiving pool.
23. Rapids/cascades and portage/crossing decisions where river grade changes.
24. Marshes, reed beds and riparian wet ground with actual moisture/water relationships.
25. Floodplain channels, bars, sediment margins and seasonal flood exposure.
26. River mouths, estuaries and delta-like depositional areas linked to the downstream river.

### Coast and land–water transitions

27. Irregular bays, coves and headlands.
28. Peninsulas, narrow land connections and meaningful natural crossings.
29. Beaches, shingle/rocky banks and coastal shelves.
30. Coastal cliffs, offshore outcrops/stacks and small islets where suitable.
31. Sheltered shallows/lagoons, deeper channels and safe/unsafe landing approaches.
32. Shore vegetation and wet/dry transition zones; foam/color alone do not establish physical shallows.

### Additional families to track explicitly, without claiming existing support

33. Caves, rock shelters, natural arches and overhangs: require real mesh/access treatment beyond a single-valued heightfield.
34. Sinkholes/karst depressions and their drainage behavior.
35. Glacial cirques, U-shaped upper valleys, snowfields and morainic/boulder terrain.
36. Volcanic cones/craters and old lava/rock fields.

The additional families are explicit catalogue scope to assess during implementation; they must not be represented by misleading feature tags or claimed delivered with the current generator. The immediate every-map contract above preserves every major family expressly requested so far. Broader scientific edge cases are not silently invented as already implemented requirements.

## What distinguishes the eight biome regions

| Region | Ground and landforms | Vegetation/dressing | Physical opportunities and pressures |
|---|---|---|---|
| Meadow/grassland | Fertile plains, rolling hills, broad river margins | Multiple grass heights, flowers, berry patches, scattered shade trees | Fields/pasture, visible wildlife, exposed routes; soil and seasonal water affect output |
| Mixed woodland | Low hills, clearings, gullies and forest streams | Broadleaf/conifer mix, understory, fallen wood, leaf litter and rocks | Timber, forage, sheltered work; denser routes and local depletion/regrowth |
| Cool conifer forest | Cooler uplands, rocky streambeds, lake margins | Needleleaf stands, mossy ground, deadfall and patchy clearings | Timber and cold-season fuel; shorter growth window, snow/cold and access costs |
| Montane/alpine | Ranges, passes, cliffs, scree and upper basins | Sparse/stunted trees below treeline, alpine grass, exposed stone and snow pockets | Prospecting, stone/ore and viewpoints; grade, exposure, limited building/farming area |
| Freshwater wetland/riparian | Marshes, floodplains, reed beds, pools and backwaters | Reeds/rushes, bank shrubs, willow-like growth and wet soil | Fishing, reeds, water access, moist fertile margins; flood and footing constraints |
| Dry scrub/woodland | Stony terraces, dry hills, ravines and intermittent channels | Low scrub, drought-tolerant trees/herbs and open dry ground | Tough grazing/forage and stone; seasonal water, sparse timber, lower soil cover |
| Arid/badlands | Dunes, rocky plateaus, mesas, buttes, canyons and washes | Sparse thorny scrub, isolated vegetated water pockets, exposed layers | Ore/stone and defensible routes; heat, scarce water/wood, long supply trips |
| Warm coastal/woodland | Bays, shelves, estuaries, lowland streams and sheltered coast | Warm-climate broadleaf/palm-like forms, grass/savanna pockets, coastal reeds/mangrove-like transition where justified | Fish, waterways and coastal exchange; storms, wet ground, seasonality and landing access |

Resources, wildlife and building materials must exist as actual discoverable, usable state when presented as functional. New species/material industries need their own implementation and acceptance; decorative plants must not pretend to produce inventory. Building practice can respond to material and climate without assigning fixed personalities to real cultures.

## Farms fit the topography

- Sample the full footprint: slope, height range, moisture, soil, dry area and reachable approaches.
- Soil, crop rows and workers follow the actual surface; rows favor contours on slopes.
- Expand into workable patches/benches rather than forcing the world into a flat rectangle.
- Terrain too steep for ordinary cultivation offers a clear reason and a real terrace/access project, with measured digging/labor/material costs.
- Preserve broad naturally flat fertile areas as valuable geography. Do not smooth an entire region just to make placement convenient.

## Evidence required before a map is accepted

Record actual final geometry measurements, drainage and wet connectivity, biome area/composition, dry/connected starts, safe freshwater access, walkable upland approaches, farm conformity, old-save reconstruction and render cost. Review desktop close/middle/wide and overcast captures of ordinary as well as exceptional regions. Missing geometry, token biomes, labels-only coverage and repetitive artificial stamps fail acceptance even when a typecheck/build passes.
