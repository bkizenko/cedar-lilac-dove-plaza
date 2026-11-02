# Building and station visual audit — 37 registered roles

Source baseline `d048d1a`, checked against the current integration interfaces. This is a **visual source inventory**, not a functional catalogue, rendered acceptance result or release-gate completion count. Functional status remains in `BUILDING_AND_WORKPLACE_CATALOGUE.md`; production and ownership rules are unchanged. All37 roles have registered geometry. None is called visually finished merely because a mesh exists.

“Distinct base” means a role-specific silhouette or actual terrain structure exists in source. “Partial” means the present body is generic, visually misleading, excessively box-like or needs substantially clearer role cues. **Both categories still need shared surface treatment and desktop acceptance.**

| # | Role / ID | Current actual model | Visual status / remaining limit |
|---:|---|---|---|
| 1 | Cooking hearth `hearth` | Low open stone ring and crossed logs; fire follows actual paid fuel work | Distinct base; preserve original geometry, add surface treatment |
| 2 | Butcher / skin yard `butcher` | Open table, tall hanging gantry, small tool surfaces | Distinct base; preserve, no invented carcasses/hides |
| 3 | Smokehouse `smokehouse` | Enclosed louvered walls, pitched covering and smoke chamber | Distinct base; preserve, show no free meat or perpetual fire |
| 4 | Barracks `barracks` | Braced timber refuge, actual doorway and narrow loopholes | Distinct base; preserve its existing640HP functional shelter |
| 5 | Fibre shelter `fibreWorkshop` | Canted weaving frame, twisting bench and pegs; actual paid work layer | Distinct base; preserve empty frame until actual inputs arrive |
| 6 | Pottery shelter `potter` | Flat shade, shelves and paired work surfaces | Partial; shade/shelves resemble other stations at distance |
| 7 | Kiln `kiln` | Round open-front chamber with structural masonry | Distinct base; material detail still needed |
| 8 | Grinding stone `grindingStone` | Low quern/slab and handstone | Distinct base; no decorative flour or grain |
| 9 | Bread oven `oven` | Rectangular oven sides/lintel under flat shade | Partial; cavity and oven silhouette can read more clearly |
| 10 | Drying rack `dryrack` | Empty covered frame and crossbars | Partial; generic flat shade, preserved actual loaded-batch semantics |
| 11 | Tanning yard `tanner` | Tubs, scraping frame and work surface | Distinct base; preserve empty tubs, no free hides/leather |
| 12 | Tailor `tailor` | Flat shade and sewing bench | Partial; resembles general workshop/pottery shade |
| 13 | Town hall `townhall` | Solid cuboid, crossed roof slabs, doorway/window overlays | Partial; longhouse entrance and timber/wattle construction need readable structure |
| 14 | Frontier outpost `cornerstone` | Tall marker pole/flag and stone footing | Distinct base; no inventory implied by marker |
| 15 | Hut `hut` | Cuboid with stepped block roof | Partial; rounded/faceted wattle and sloped layered thatch proposed |
| 16 | Field `farm` | Actual contour soil, rows and crop silhouettes; one extra literal “shed” box | Partial; remove box, keep planted terrain and non-building boundary markers |
| 17 | Animal pen `pen` | Actual scalable terrain-following fences, small shelter/trough; actual livestock | Distinct base; maintain real size, animals and water/feed ownership |
| 18 | Lumber workplace `lumber` | Stump, solid small shed and permanently modeled stacked logs | Partial; open cutting support, remove misleading decorative stock |
| 19 | Quarry `quarry` | Stone blocks and decorative octagonal basin | Partial; real seam/outcrops are separate resources, not this basin |
| 20 | Dock `dock` | Planked deck, rack, posts and small solid shed | Partial; deck readable, shelter/material/stock detail still coarse |
| 21 | Bridge `bridge` | Span geometry follows actual aligned banks and length | Distinct base; no alignment or navigation jitter allowed |
| 22 | Storehouse `warehouse` | Closed cuboid, stepped roof and permanent crates | Partial; ventilated raised store/empty loading bays proposed |
| 23 | Craft shelter `workshop` | Flat shade over one broad bench | Partial; three real staffed slots need a readable three-bench yard |
| 24 | Forge `forge` | Closed cuboid with tall chimney | Partial; furnace/open hot-work area remains visually abstract |
| 25 | Watchtower `watchtower` | Square solid shaft/battlement; separate actual platform kit where used | Partial; ordinary shaft is generic, platform system must remain intact |
| 26 | Temple `temple` | Solid podium, columns and broad flat slab | Partial; later-era civic finish not in next six-model batch |
| 27 | Market `market` | Solid cuboid and two box stalls | Partial; empty accessible exchange space is not readable enough |
| 28 | Keep `keep` | Large block and four box towers | Partial; later fortified civic work remains |
| 29 | Stables `stables` | Solid cuboid obscures modeled partitions | Partial; readable stall openings/yard remain |
| 30 | University `university` | Large hall, central spindle and pointed cap | Partial; later-era institution, not an early-game crafting unlock |
| 31 | Cairn `cairn` | Stacked stone cylinders | Distinct base; irregular stone surface/form refinement remains |
| 32 | Sacred grove `grove` | Trunks and one cone canopy | Partial; biome-appropriate original trees/gathering space remain |
| 33 | Palisade `palisade` | Dense4×4 square of16 posts | Partial; texture can improve, connected footprint/alignment stays exact |
| 34 | Timber gate `gate` | Dedicated four-facing gate kit and real open/closed leaves | Distinct base; exclude from geometry jitter |
| 35 | Stone wall `stonewall` | Solid square masonry block and battlements | Partial; masonry surface needed, connected alignment stays exact |
| 36 | Trench `trench` | Actual adaptive excavation surface when completed, stake marker fallback | Distinct terrain base; no fake new hole or flattening |
| 37 | Moat `moat` | Blue flat tile/bank-trim fallback | Partial; not claiming functional excavated/flooded hydraulics from this model |

## Material and variation findings

`makeMaterials` currently creates flat-colour standard materials. Its canvas helper is unused; architectural materials have no authored albedo/roughness/bump maps. Existing era/local architecture changes colours and roof scale across six eras and three coarse habitats, not eight fully realized ecological construction families. Existing per-ID craftsmanship changes non-timber height±2% and tint±3%; it is not structural handmade variation.

## Approved bounded next batch

1. Shared original128² construction surfaces: timber grain, layered thatch/reed, wattle/earth and irregular masonry. At most12 shared maps (albedo/roughness/height); metre-scaled factory UVs, no per-building texture allocation. Materials preserve existing village palette. Fields/pen/earthwork surface shaders are excluded.
2. Replace only six weak civilian roles: `hut`, `townhall`, `warehouse`, `workshop`, `lumber`, `quarry`. Readable doors/open bays/benches and irregular roof edges; permanent surfaces and empty supports only. No decorative stock or fabricated seams.
3. Add bounded deterministic seed+ID roof/upper-brace variation through one instanced art attribute. Foundations and world positions stay fixed. Gates, walls, bridges, fields and pens receive no geometry jitter.
4. Remove the literal field-shed box; existing planted contour ground and short perimeter markers remain. No new building, free lumber, capacity, tools or storage.
5. Keep the existing hearth, butcher, smokehouse, barracks and fibre models; surface treatment only. No shadows added. No full37-role, eight-biome-family, draw-time or campaign acceptance claim from source tests.

Qualification must assert actual128² texture allocation/data variation, deterministic bounded geometry/instance variation, no displacement at foundation level, excluded aligned types, finite geometry bounds and draw-family counts. Parent owns before/after desktop captures and integration qualification.

## Candidate implementation and measured source bounds

The isolated candidate now implements the six scoped factory replacements and shared materials. New source triangles: hut500, townhall552, storehouse632, workshop592, lumber308, quarry268 (2,852 total). Their existing per-type instancing uses18 part families versus16 formerly, so at most two additional visible geometry submissions when all six types are present; this is not measured frame time or a scene-wide draw-call claim. Maps are exactly12×128² RGBA (786,432 base bytes;a1MiB texel-data budget including mip chains; driver overhead excluded), shared by material clones. Each same-type variation is deterministic from seed+actual building ID: roof lean≤45mm/axis, upper brace bend≤25mm, upper lift≤35mm. The bottom250mm remain fixed; geometry is conservatively fitted against all existing society transforms and remains within the real navigation rectangle. Existing aligned construction is excluded. New factory meshes dispose the replaced geometry, cloned instance/depth materials and unique shared maps. No animation, light, shader-time loop, per-building texture, new shadow enablement or game-state field is added.

37/37 focused and legacy checks pass in the isolated candidate: seven new art checks plus original special-model, architecture, fibre, four-facing gate/Engine/save and contour-plot checks. Two stale renderer test mocks were supplied with the already-required ground/camera/state methods; field assertions now require no shed mesh. Typecheck passes. Parent production build and actual desktop GPU shader/render checks now pass. Close/middle gallery views were inspected; formal before/after wide-distance readability and target-hardware cost remain pending. The basic material palette still represents three coarse habitats; eight distinct ecological construction families and all later civic silhouettes remain unqualified.
