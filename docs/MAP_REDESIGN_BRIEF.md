# Map redesign: required diversity, coherent landforms, verified geometry

Status: research and acceptance proposal, 2026-10-31. Generator implementation is intentionally pending the integrator's current verified-batch commit. This brief supersedes the earlier assumption that whole geological families could be absent on ordinary seeds.

## What the images actually ask for

All three newly attached Dawn of Man images were inspected directly.

1. The river/lake village image contains a broad inhabited basin, curved water with a readable near bank, farmland in the foreground, rocky mid-distance shoulders, multiple separating valleys and a varied mountain skyline. The settlement occupies a useful shelf within an enclosing landscape. Terrain composition remains legible without a political overlay.
2. The close village image shows foreground soil, stones, vegetation and buildings, a separate band of wooded foothills, then several irregular ridge silhouettes receding into haze. A giant smooth slope behind the houses would miss its central quality.
3. The fortification image shows uneven walkable foreground ground, a winding stone boundary and a low, irregular hill skyline. Interesting relief must work at resident scale as well as in an aerial panorama. It does not require a cliff beside every house.

The requirement is desktop presentation. Review close, middle and wide desktop views; mobile testing is outside this task.

## Candid diagnosis of the current generator

The prior work was insufficient. Measurable beauty and per-landmass drainage were useful foundations, but passing those checks did not establish a beautiful world or the requested feature coverage.

- `regionalGeography.ts` creates a ridge, a heavily smoothed valley and an optional lake. It contains no canyon, terrace, cliff, plateau, pillar, waterfall or dune construction. Labels or rock tint cannot supply their absent geometry.
- Lakes are currently probabilistic (55% per qualifying region), so a one-region map can have no lake at all. Required family coverage must be deterministic across seeds.
- Ordinary ridge contribution is only about 24 m before envelope and coastal attenuation. Up to 85% of elevation is blended toward a low valley surface. Broad, smooth noise and one Gaussian ridge dominate the result. Their addition is not a hierarchy of peaks, gullies, foothills and saddles.
- The old geography branch retained an explicit elevated shelf and stronger ridges. The new branch removed that shelf. Older single-island layouts also kept more of the usable world in one connected composition rather than dividing it into small landmasses separated by broad water.
- A high gentle-ground fraction was accepted as success. It proves accessibility but can reward visual blandness. A map needs both usable routes and distinct, measurable rugged districts.
- Safe-start selection favors local gentle clearings; the beauty sample radius is 120 m. A far mountain skyline may contribute nothing, while open flat views still receive outlook points. Score definition needs a near/middle/distant landscape breakdown.
- All current water shares a global level. Rivers are cut to that level, so the implementation cannot truthfully claim elevated lakes, descending streams or waterfalls. A waterfall requires a real upper/lower water-height relationship, not white particles on dry rock.

## Geological research translated into design

The [National Park Service explanation of river systems](https://www.nps.gov/subjects/geology/fluvial-landforms.htm) places the watershed at the center of landscape organization: divides, headwaters, trunk rivers, tributaries and lower depositional ground belong together. Its floodplain discussion distinguishes flat land adjacent to a channel from terraces and other river features. **Design inference:** organize a map around connected basins; reserve flat floodplain for settlement and farming while placing incision and exposed strata in selected higher reaches.

The [USGS Rivers and the Landscape page](https://www.usgs.gov/water-science-school/science/rivers-and-landscape) explains tributaries merging downhill, ridge divides, incision and sediment movement. **Design inference:** a river should have an upstream-to-downstream profile, branching catchment and wider lower reaches; canyon depth should relate to an elevated surrounding surface. A narrow wet cut across unrelated flat terrain is not enough.

The [Utah Geological Survey landform guide](https://geology.utah.gov/popular/utah-landforms/) distinguishes mountains, basins, plateaus, mesas, buttes and pinnacles, and connects the Colorado Plateau's layered terrain to uplift and erosion. **Design inference:** canyon walls, terraces and pillars can share a geological province and materials while retaining different measurable shapes. Combining families into one connected region is preferable to scattering unrelated decorative stamps.

These are game-scale approximations, not simulated millions of years of geology. Thresholds below are proposed design targets, not geological definitions.

## Corrected generation contract

**Every map** must include rivers, a lake, hills, mountains, valleys, a canyon, cliffs, terraces, a plateau, a pillar district, a waterfall and a dune/dry-channel district. Seed variation changes their arrangement, extent, profile, color and grandeur; it does not remove required families. Tiny islands do not each repeat the catalogue.

Reserve a sufficiently large connected primary landmass before placing features. The default should return to a deliberate, substantial single-landmass experience rather than a random layout that can emphasize small islands. Keep alternative layout choices; their primary landmass must still have enough area for the complete family set. Topology must validate the capacity before placing camps.

Order: primary/secondary landmass topology → basin divides and ridge skeleton → basin floors and elevated shelves → descending drainage and lakes → localized incision/terraces/cliffs → pillar and dune provinces → soil/moisture/vegetation/resources → route validation → safe, scenic starting sites → dressing.

Use three linked provinces rather than twelve disconnected stamps:

- **Inhabited basin:** a lake/river junction, ordinary rolling foreground, dry settlement shelves, wooded foothills, multiple summit silhouettes and a reachable saddle.
- **Incised uplands:** an elevated plateau cut by a river canyon, exposed cliffs and benches, a waterfall at an actual water-height drop, and a neighboring pillar/ravine district sharing the strata.
- **Dry district:** dunes on sheltered low-relief ground, rocky outcrops and a branching dry channel. It must not be indistinguishable from the map's beach band.

Retain ordinary and exceptional districts on the same map. The player's home should exceed the average of safe comparable camp sites. It must not consume the map's only interesting landscape or place every rival on barren, inaccessible terrain.

## Proposed acceptance: inspect finished geometry

Every major metric must sample the final heightfield/water bodies after all carving, smoothing, camp preparation and route repairs. Feature metadata alone never passes a geometry gate.

| Family | Proposed minimum physical evidence on each map |
|---|---|
| Mountains | Connected ridge at least 120 m long; three separated local summit silhouettes; at least 30 m local prominence above its surrounding basin. Ordinary and grand amplitudes differ. |
| Hills | A distinct district with 4–12 m local relief over 50–140 m wavelengths, including dry traversable slopes. |
| Valley | At least 150 m connected floor route, 24–60 m usable floor width, and flanks at least 10 m higher in measured transverse sections. |
| River | A connected wet course at least 150 m long, tributary connection, ordered non-increasing water-height profile and physically connected mouth/outlet. |
| Lake | A distinct inland connected wet component of at least 700 m², measurable shoreline and a usable dry bank. Record whether it drains through an outlet. |
| Canyon | At least 80 m of incision, 18 m minimum median rim-to-floor relief, and opposing steep walls in multiple transverse samples. Preserve an approach or a crossing route. |
| Cliffs | At least 24 m of contiguous exposed edge with 12 m vertical change within 8–16 m horizontal distance; collision/navigation follows that edge. |
| Terraces | At least three measured elevation benches, each 8–18 m wide, separated by 3–6 m risers; at least one usable bench approach. |
| Plateau | Elevated surface at least 1,500 m², relatively low interior slope, and at least 15 m elevation above adjacent lowland, with a usable access route. |
| Pillars | A compact district with at least five separated columns, height at least 12–15 m and intervening lower ravines. Their footprint affects navigation. Keep enough terrain samples across each column to resolve its form. |
| Waterfall | Actual linked upper/lower water surfaces with at least an 8 m drop, a continuous visible fall path and a lower receiving pool; dry decorative particles do not count. |
| Dunes/dry channels | A distinct inland dry district with repeated 2–5 m relief at 18–40 m spacing plus a connected branching lower channel. Beach coloring does not count. |

Record feature area, elevation extrema, local prominence, cross-section depth/width, route length/grade, wet connectivity and feature-specific pass/fail reasons. Track safe-start score components at roughly 40 m foreground, 120 m middle ground and 300 m backdrop, together with the distribution over comparable camps.

Use fixed regression seeds plus at least 20 rotating holdouts spanning all supported sizes/layouts. Assert complete required-family geometry on every tested seed, dry foundations, reachable freshwater, access to uplands, connected ordinary routes, and old-save terrain hashes. Keep coverage and grandeur metrics separate: minimum guaranteed diversity must not force identical dramatic vistas.

## Rendered and playable completion gate

For representative ordinary and dramatic seeds, capture desktop **close, middle and wide** views from the actual game camera. Include the home basin, canyon/terrace cross-section, pillar district, waterfall and dune district. At close range, compare rock/ground scale against a resident and a hut. At middle range, inspect overlapping ridge silhouettes, riverbanks and walkable shoulders. At wide range, inspect connected landmass composition and distinct provinces.

Review actual lit geometry with shadows and water visible; repeat one representative view in overcast light so the design does not depend on one flattering sunset. Confirm that the same cliff shown on screen blocks movement and that the visible route is traversable. Run first-winter and save/load checks after placement changes.

Release evidence must state which geometric families passed, which views were inspected, and any remaining limits. A green build, a high scenic score, a feature tag or a list of designed amplitudes cannot substitute for that evidence.
