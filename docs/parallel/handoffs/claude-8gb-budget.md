# 8 GB M1 Air render budget — Claude Experience

BLUF: Our Option H geometry is small (about 1–2 MB and under 25k triangles for a 60-building village, estimated). The limits on an 8 GB M1 Air are pixels per frame, shadows, post-processing and JavaScript simulation time, not triangle count. Everything below is an ESTIMATE from code and the existing quality profiles; none of it is measured on a device. Measure before relying on it.

Sources: `src/game/graphics.ts` (GRAPHICS_RULES), `docs/parallel/handoffs/claude-experience.md` (Budget note, tree and unit budgets), `src/scene/carvedBudget.ts`.

## What the existing profiles allow
| Profile | Max pixels | Pixel ratio | Ground cover | Bloom | Shadows default |
|---|---|---|---|---|---|
| low | 0.8 M | 1.0 | off | off | off |
| med | 2.1 M | 1.25 | on | on | off |
| high | 3.2 M | 1.5 | on | on | off |

## Proposed H budget per profile (to be confirmed by measurement)
| Item | Low | Med | High |
|---|---|---|---|
| Triangles in view | 150k | 350k | 600k |
| Draw calls (opaque) | 150 | 300 | 450 |
| Shadows | none | one small camera-following map, near buildings and units only | same, larger |
| Textures | vertex colour + one 256² grain | + one 1024² atlas | + one 2048² atlas |
| Post-processing | none | bloom only | bloom + light AO |
| Trees (1,000 visible) | impostors beyond 40 m | 3 LOD tiers | 3 LOD tiers + more near |
| Animation | near units only (<35 m) | <35 m full, <70 m reduced | same, wider |

## Where the memory actually goes (rough)
- Geometry: about 1–2 MB for buildings, about 1 MB per 1,000 trees. Negligible.
- Textures: one 2048² RGBA with mips is about 22 MB. Keep to 2–3 atlases.
- Render targets (shadow map, bloom, MSAA): the largest GPU cost. A 2048² shadow map is about 16 MB; MSAA ×4 at 2 M pixels is about 32 MB.
- JavaScript heap: the simulation and saves. Not owned by this lane.
- Browser overhead: assume the tab should stay under 1.5 GB total.

## Techniques to use (all in our own files)
1. Shared vertex-colour material with one grain texture, so few shader programs.
2. Distance bands: near, mid, far, then a flat impostor card (already implemented for buildings and trees).
3. Instancing per species or variant and LOD, so draws scale with distinct kinds, not objects.
4. No shadows from mid and far objects, no shadows from trees.
5. Bake contour shading into vertex colours instead of extra lights.
6. Animation only within 35 m, effects from a capped pool (already implemented).
7. Merge static same-LOD buildings per terrain chunk (BatchedMesh): needs Codex's chunk and culling seam.

## What is NOT known
- Real frame time on the user's Mac for any of this. Codex's frame observability (`runtimeProfile.ts`, `PerformanceReadout.tsx`) is the tool to measure with.
- Cost of the grain shader patch and sRGB conversion (never executed).
- Whether CPU simulation, not rendering, is the actual bottleneck at 100+ residents.

## Measurement plan (for Codex or a session where three.js runs)
1. Fixed seed, fixed camera paths (close, mid, wide), 100 residents, Low/Med/High, `current` vs `optionH`.
2. Record median and 95th-percentile frame time, draw calls, triangles, JS heap, GPU memory estimate from `renderer.info`.
3. Accept a profile only if p95 frame time stays under 33 ms (30 fps floor) on Low and under 22 ms on Med.
