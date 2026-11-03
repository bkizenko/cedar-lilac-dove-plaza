# V17 integration on302e25a — desktop acceptance pending

The exact-surface candidate, intentional-ground routing correction and route evidence are integrated into `.play/v17-integration-302e25a` from immutable HEAD302e25a1b6e87af06ce44a06e2a9935df7d85cf8. The only manual conflict was the new difficulty import at the top of sim.ts; all latest difficulty/codec behavior is preserved. Canonical source/index and user live servers8086/8101 were not modified.

## Verified in this cohort

- Production build and TypeScript pass.
- Combined geography/navigation/route suite:45/45pass, zero skips. This includes20complete legacy world fingerprints, eight exact-surface/triangle/invalidation tests, three intentional-ground checks, five joined native routes and nine prior local-water/cooperative-navigation checks.
- Latest codec/Engine guard/import lifecycle suite:15pass, zero failures, one optional previously captured own-QA3MB fixture skipped because its environment path was not supplied. This skip is not credited.
- Three actual V17 public save payloads pass current storage-codec lossless roundtrip plus strict validation. Whole JSON values and hashes remain identical. Stored character ratios: archipelago12.05%, continents14.03%, pangaea13.74%.
- Three new native QA exports use this integrated source and pass strict save/decode complete-world equality, structuredClone, actual MessageChannel serialization and actual rendered-geometry oracle. Normal opening difficulty changes resource multipliers by1, preserving native maps. Fixtures reveal chart buffers only, with native initial people/resources and paused time0.
- The current-source five joined route scenarios pass, including both holdouts, exactly-once stone unloading after loaded save and the continental ordinary second outbound trip. All10substantial landmasses in these five maps pass local upland route admission and real worker-radius half-metre probes. See native route report for actual measurements.

All terrain/renderer implementation modules are the same qualified V17 surface source; the earlier ten-map physical survey remains separately labeled by its original source fingerprint. It is not misrepresented as a new ten-map current-build run. No rendering or FPS result follows from Node checks or a successful build.

## Desktop review blocker

A separate normal Chrome window was created for the review, without changing the live game page. Before navigation/import, CUA returned: “The Mac is locked and automatic unlock could not unlock it.” Its official in-app-browser fallback then returned “transport closed before response.” No hidden-engine calls, localStorage injection, CDP or alternative computer-control scripts were used. No screenshots or GPU acceptance are claimed.

The isolated production server is running at127.0.0.1:8127. Once the Mac is manually unlocked, use the normal Menu → Transfer village file → Import file flow with:

- `/tmp/hearthwild-v17-native-archipelago.json` (seed7,1040)
- `/tmp/hearthwild-v17-native-continents.json` (seed0,1040)
- `/tmp/hearthwild-v17-native-pangaea.json` (seed1,1040)

Each has `.meta.json` with exact home/feature coordinates, camera distances45/95/210m, pitch/yaw and minimap coordinates. Inspect close/mid/wide, ordinary and dramatic regions, lake/tributary/canyon/fall junctions, roots and coast silhouettes on Medium with shadows/circles off. Chart reveal is disclosed visual QA, not discovery evidence. Do not use actual user saves for this gallery.

## Default and gate decision

Default remains16. The prepared `/tmp/hearthwild-v17-promotion-PENDING-GALLERY.patch` changes exactly three locations: Game.reset's seedless default, and the two Engine.restart reset calls (primary/fallback). It preserves explicit legacy version requests, restored worlds and the latest selected difficulty. This promotion patch is not applied or accepted.

M1-15/M1-18 have bounded quantitative/physical evidence ready for integrated review and publication, but no gate status/credit is changed here. M1-16 still needs honest close/mid/wide perceptual review of organic forms/prominence. No claim of50%/75% delivery follows from the automated-check count; the fixed98-gate denominator remains unchanged.
