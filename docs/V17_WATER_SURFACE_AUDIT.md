# V17 surface audit — candidate, not published acceptance

Baseline: `37d183e` (game/scene source unchanged through `dee7005`). Work remains isolated in `.play/geography-v17-37d183e`; default world version remains16. No old saved terrain is migrated.

The V16 physical survey found dry river-bed gaps and tree corners below local raised water. V17 uses a bounded body/segment spatial index and a final union river-bed carve. The provisional ten-map physical survey passed all existing numerical geometry/root/start/water checks before the additional triangle-alignment work. That survey is superseded for final qualification until rerun against the final source.

## Authoritative consumers

- `Game.waterAt` → `waterSurfaceAt`: V17 exact analytic local-body query; old versions retain their raster interpretation.
- Navigation, placement, water collection, resource/root eligibility and minimap physical colors use `Game.waterAt` or the explicit V17 generation callback. `waterNavigation` still snapshots height/water arrays for invalidation; the raster is not its actual V17 local-water oracle.
- The minimap cache copies the water raster as one dirty input; rendered colors use physical samplers. Its V17 flag also invalidates terrain caches.
- `coastFingerprint` reads height nodes against sea level, deliberately preserving enclosed freshwater inside an ocean coastline silhouette. The optional waterHeights type member is unused.
- `depthWater` samples **terrain heights**, not waterHeights. Both water depth/discard and `FieldSurface` interpolate the actual triangle diagonal. `addLocalWaters` renders lake polygons and stitched river ribbons directly from descriptors. WorldView water picking raycasts those meshes. No GPU local-water surface is generated from the coarse water raster.
- `continentalRiparian`/`riparianRepair` update terrain and raster at generation time. V17 refreshes its derived exact index immediately after the actual continental-body append. Published body descriptors become owned frozen plain data; explicit replacement rebuilds the raster and notifies current navigation. No Proxy, index, listener or WeakMap is serialized.
- `structuredClone(world)`, full strict save/decode reconstruction, a Node MessageChannel autosave payload and actual water geometry generated from owned versus ordinary JSON descriptors all passed the preliminary three-native-map pipeline probe. Re-export is required after final geometry changes.

## Triangle interpolation findings

Three actual native1040 maps: seed7 archipelago, seed0 continents, seed1 pangaea. CPU bilinear versus actual terrain triangles:

| Sample | 95th percentile absolute difference | Worst absolute difference |
| --- | --- | --- |
| River courses | 0.013–0.016m | 0.323m |
| Tree centers | 0.036–0.068m | 1.545m |
| Founding people | ≤0.017m | 0.017m |

No sampled tree corner crossed actual water/flood clearance. No sampled CPU-wet river interior became GPU-dry. Tree center outliers are nevertheless visibly material: seed7 `(-50.281711,-258.703663)`, bilinear38.44817m versus triangle36.90353m. V17 now explicitly selects shared triangle sampling for generation/resources, ecology physical classification, Game.height and refined excavation base samples. Legacy bilinear sampler is untouched. Actual indexed THREE.PlaneGeometry and refined-cut focused tests pass. Final ten-map native survey passes after this change:68,125 resource positions match physical triangle height exactly;59,383 trees satisfy center/corner flood clearance.

The refined excavation layer and Game.height read the same Float32 local tile and triangle interpolation; paid cut shape is sampled at the existing local refinement resolution. It remains a discrete approximation of an analytic rounded cut, not an infinitely continuous surface. This change aligns its base terrain without globally increasing resolution.

## Endpoint and falling-water counterexamples, corrected in final candidate

Actual raycasts showed physical round river caps with no matching local surface beyond butt-ended ribbons. Example seed7 tributary head `(-97.419658,-104.475585)`: ground9.31967m, physical water10.62m, no water mesh hit. Ordinary-brook head `(233.364745,226.744995)`: ground2.44249m, water3.14m, no local water mesh. Ocean-covered mouths are excluded from this defect classification.

Seed1 pangaea waterfall at75% flow `(-46.621152,73.477012)`: actual visual falling-water3.0275m, ground1.7275m, physical water0.67m, Game.walkable=true. Upstream segment roundcaps also falsely extend high water through the fall. Final V17 uses the same Float32 stitched triangle data for indexed physical water and rendered rivers. Source caps are merged into existing meshes; river ends at falls are butt-ended. The exact indexed falling strip matches the rendered profile. Final three-map ray survey has zero raised-water endcap misses and zero walkable falling-water center samples; maximum surface difference0.000013m. The .42m global ocean covers river mouths outside local ribbons and is recorded separately.

## Limits

The preliminary inside-world render check sampled four barycentric points per water triangle:51,641 samples, zero visible surface outside the CPU footprint. It does not prove complete CPU-to-render coverage at all edges. Continental off-map decorative continuation is outside the playable index bounds;475 sampled points were outside the map and excluded, explicitly recorded rather than counted as agreement. Root owns actual desktop gallery and final default promotion. Five native ordinary Game.step upland/prospecting/carry/save/home-delivery scenarios now pass; see V17_NATIVE_ROUTE_QUALIFICATION.md. No gate credit follows from this document.

## Final bounded evidence

- Ten native cases across1040/1560/2080, all supported layout families, including two held-out seeds:10/10 physical survey passes;40river courses pass, no changed thresholds.
- Three native1040 QA saves: strict save/decode complete-world hashes, structuredClone, actual MessageChannel serialization and owned/plain render-buffer equality pass. Actual rendered-geometry oracle67,861queries/map: zero ocean false positives, maximum water-surface difference0.00000025m.
- Legacy frozen full-world hashes: versions1–13 existing13fixtures, threeV15fixtures, native three-layout V16baseline comparison, and V14seed42/1560/random baseline comparison all pass. These are20 bounded preservation cases, not every possible historic seed.
- Eight focused index/actual-geometry/triangle/cache tests pass. TypeScript passes. This standalone cohort did not include a production build. The later302e25a integration build/typecheck passes; actual desktop gallery is blocked by the locked Mac.
- Pending: actual desktop close/mid/wide gallery and final default decision. Native physical walking/prospecting/carry/save/home delivery is separately qualified. No full geography or campaign gate credit is asserted.
