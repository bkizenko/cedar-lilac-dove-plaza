# Detail audit: why huts, lots and buildings looked low-detail

Branch `agents/claude-detail-audit`. Every number below is from code (`tools/render-preview/detail-measure.mjs`, pure Node, real generators) or from the real-game SwiftShader harness (`tools/render-preview/map.mjs` / `map-entry.ts`, which runs the real `Game` + `WorldView`). Anything else is marked [UNVERIFIED].

## BLUF

**Partly yes, but not mainly "captured outside the render distance".**

1. At the old default zoom (orbit 58 m, pitch .38, so 53.9 m eye-to-focus horizontally) buildings, people, items and trees were drawn at the MID and FAR tiers, not the near tier. Old switch distances were buildings 30/70/120 m, people 35/70 m, items 14/40 m, trees 28/75/115 m by graphics quality (baseline.json, six zoom stops: at 58 m the carved buildings were tier 1-2, people tier 1-2, trees tier 1-2; at 14 m buildings and people were tier 0). So the harness shots and the shipped default both hid the good models. Boris was right about that.
2. The near tier itself was thin. A near-tier hut averaged 281 triangles (buildings era 2: 958). A close-zoom "before" render (26 m) still looks flat. So even the best the game could show was low detail. Boris's "some of the 3D modeling looked good" fits the item and tree sheets (items near 1.5k-6k tris, trees near 2.7k mean), which are rendered at the near tier by their own harnesses.
3. Shadows were off in the map harness and by default, so the shipped look had no depth cues beyond painterly contact shadows.

Fix shipped: a new Detail option (Standard/High/Ultra) in `src/game/detailLevel.ts` that scales every LOD switch distance; Standard now shows the NEAR tier for the whole normal zoom range (14 to ~90 m orbit, default 58 m); a near-tier geometry pass for buildings (`src/scene/nearDetail.ts`); nearest-first caps so the near tier cannot blow the budget; High/Ultra add sun shadow maps, AgX grade, bump and 4x MSAA. Draw distance (Low/Medium/High/Ultra bands) is untouched.

What is NOT done [honest limits]: people and item geometry were not enriched (only shown at their existing near tier more often); trees likewise. Wall/thatch textures remain a 256 px tiling grain plus vertex colour; no per-material photographic textures. Real GPU speed, M1 behaviour and the real look under a GPU were not measurable here.

## What SwiftShader cannot show

- Real GPU timing: SwiftShader is a CPU rasteriser. Frame times in these logs (1-12 s per frame) say nothing about M1 [UNVERIFIED]. Only triangle, draw-call and instance counts are trusted.
- Real GPU look: tone-mapping/AgX output, MSAA quality, anisotropic filtering, shadow-map filtering, precision and driver differences. SwiftShader implements the same GLSL, so renders are close but not proof [UNVERIFIED].
- `three/examples/jsm` is not installed in this sandbox, so the harness uses a shim (`post.js`): bloom is simplified and there is no real GTAO. The hut/building sheets use `render-three.mjs` (three-lite) with real shadow maps. High/Ultra AO and the true bloom look are therefore unseen here.
- Memory: texture memory is computed from known texture sizes, not read from a GPU.

## Harness audit (distance and tier at the time of the original shots)

| Harness | Camera / distance | Tier shown (before) | Shadows | Notes |
|---|---|---|---|---|
| map-entry (`map.mjs`) | spec `dist` (default 58) | mid/far for buildings, people, items, trees | OFF (`shadowMapEnabled:false`) | real Game + WorldView; I added `detail`, `shadows`, `routes`, `age` fields and render stats |
| building-sheet / hut-sheet | fixed close camera, ~near | near (tier 0) | on (three-lite) | looked "good" because near tier; not what the game showed |
| people.mjs | `distance-near/mid/far` sheets | near by default | off | now has mid vs near pairs |
| items.mjs | atlas, fixed near | lod 0 | off | `lod` mode added: far/mid/near pair |
| trees.mjs | sheet distances | near | off | |
| fp (first person) | eye height, <10 m | near | off | always near |
| ui-hud-shot | HUD over map | the map's default | off | |

## Per object class: tier at harness vs shipped default zoom

Horizontal eye-to-focus at default = 58 x cos(.38) = 53.9 m; max zoom-in 14 -> 13.0 m. 3-D (people, items) 58 m and 14.5 m. Tier 0 = near.

| Class | Old switch (m) | Old tier at default 54 m | New Standard switch (m) | New tier at default | New tier at max zoom-in | High / Ultra |
|---|---|---|---|---|---|---|
| Buildings (carved) | 30 / 70 / 120 | 1 (mid) | 110 / 190 / 300 | 0 (near) | 0 | x1.4 / x2 |
| People (rig) | 35 / 70 | 1 (mid) | 100 / 180 | 0, nearest 140 only | 0 | x1.4 / x2; cap 220 / 350 |
| Trees | near radius 28 / 75 / 115 by Low/Med/High graphics | 1 (mid) on Low/Med | 70 / 170 / 230 | 0, nearest 900 full trees | 0 | x1.4 / x2; cap 1400 / 2200 |
| Ground items | 14 / 40 (x .5/.7/1 by graphics) | 2 (far) on Med | 100 / 220 (same factors) | 0 up to 70 m on Med | 0 | x1.4 / x2 |
| Fields | no LOD tier (flat patch) | n/a | n/a | n/a | n/a | n/a |

Selection is tested in `scripts/detail-level.test.mjs` (default, max-in and 90 m normal-max distances show tier 0 for every class on Standard).

## Measured triangles

Near / mid / far tier triangles per object (`detail-measure.mjs`, 45 building types, 8 civ huts x 3 eras):

| Class | Before near/mid/far | After near/mid/far |
|---|---|---|
| Huts (8 civs, 3 eras, mean) | 281 / 207 / 90 | 1170 / 271 / 90 |
| Buildings (45 types, era 2, mean) | 958 / 342 / 112 | 1230 / 363 / 112 |
| Person (worker/soldier/archer/leader) | 768 / 986 / 852 / 1074 near; mid 452-746; far 228-422 | unchanged |
| Tree (mean over species, lod0 / lod1) | 2714 / 539 | unchanged |
| Items, near (lod 0), e.g. spear 3.7k, handAxe 4.5k, shield 1.8k, bow 2.8k | lod 1: 2.1k / 2.7k / 0.9k / 1.6k; lod 2: 275 / 584 / 352 / 224 | unchanged |

The near pass (`withNearDetail`) adds thatch strands, timber end-grain, stone courses, door frames and wall relief up to a cap (`maxAdded` 1250, skipped on specs already above 2000 near triangles). Mid is barely changed so far tiers stay cheap.

In-game village shot (SwiftShader, same seed, 960x540, Medium graphics, default zoom):

| | Draw calls | Triangles | Shadow map |
|---|---|---|---|
| Before (Standard, old LOD) | 115 | 1,105,716 | off |
| After Standard | 172 | 1,349,240 (+22%) | off (cheap contact shadows only) |
| After High | 326 | 2,310,316 | 2048 px depth, zoom-following box |

Texture memory (computed, not measured): carved grain 256 px RGBA with mips about 0.35 MB; item atlas 192 px about 0.2 MB; 34 textures total in the scene (baseline.json). High/Ultra add one 2048 px shadow depth map, about 16.8 MB, and the MSAA composer target (4 samples at 1x pixel ratio, 1280x720: about 15 MB colour + depth) [computed]. M1 safety: Standard stays near 1.35M triangles / 172 calls at default zoom with MSAA 2x; real frame time [UNVERIFIED].

## Detail option and fidelity features

| Feature | Standard | High | Ultra |
|---|---|---|---|
| LOD distance scale | x1 | x1.4 | x2 |
| Sun shadow map | off | 2048, half-extent <=90 m | 2048, <=110 m |
| Tone mapping | neutral | AgX | AgX |
| Bump (carved grain) | off | on | on |
| MSAA on composer | 2 | 4 | 4 |
| Max near people / full trees | 140 / 900 | 220 / 1400 | 350 / 2200 |

Already existing and left as is: draw-distance bands and governor (`drawDistance.ts`), painterly bloom+grade pass, painterFog/painterContact style contact shadows, graphics Low/Med/High. Not added: SSAO (no GTAO in the sandbox [UNVERIFIED]), film grain, water upgrade.

## Render evidence (`docs/renders/detail-audit/`)

All checked for brightness (mean 73-160 of 255, none near-black).

- Huts and houses: `huts-a-before.png`, `huts-a-after.png` (the 6-civ sheet also needs the three-lite sheet runs; the A set is the only hut pair committed).
- In-game village: `village-default-{before,after,after-high}.png`, `village-close-{before,after,after-high}.png`. High has real shadows.
- People: `people-near-before.png`, `people-near-after.png`, `people-mid-default-zoom-before.png` (what the old default showed vs near).
- Trees: `trees-mid-before.png`, `trees-near-after.png`.
- Items: `items-mid-before-near-after.png` (far / mid before / near after).
- Fields: `fields-before.png`, `fields-after.png` (near-identical by design, fields have no LOD tier).
- Path decay: `route-decay-strip.png`.

Gaps: per-civ hut pairs for all 6 civs, three people roles as separate pairs and six tree species as separate pairs were not produced individually; the sheets contain several of each. Shadowed near renders exist only for the in-game village (High) [shadow maps work in SwiftShader].

## Paths decay with disuse: confirmed, visibly

Route wear is `1 - exp(-(trips-1)/6)` with trips decaying by a 540 s half-life, and a path disappears below `faint` 0.1. Measured with a 24-trip route idled in the real game: wear 0.978 at t=0, 0.84 at 540 s, 0.565 at 1080 s, 0.283 at 1620 s, 0.08 at 2160 s (gone). `route-decay-strip.png` shows the trail on the left fading from clear to invisible across the five frames (about 4% of pixels differ between first and last frame). The decay is subtle at this camera distance because the path is a thin dirt line.

## [UNVERIFIED]

- Real GPU frame time, M1 behaviour, thermal limits.
- AgX/tone-map look, MSAA quality and cost, shadow filtering on a real GPU.
- Bloom/AO under the true post stack (shimmed here).
- Texture memory on device.
- Whether Boris judges 1170-triangle huts "high detail" (they are 4x denser, still stylised low-poly); people and item/tree geometry detail was not raised.
