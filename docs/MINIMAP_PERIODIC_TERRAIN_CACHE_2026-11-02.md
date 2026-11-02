# Exact-input minimap terrain reuse

The existing minimap refresh interval is 500 ms. Its terrain cache previously expired at the same 500 ms interval, so the ordinary timer almost always resampled 25,600 height/water/biome pixels and allocated new buffers, even with a paused unchanged world. This is a concrete periodic work mechanism; historical browser map peaks are not attributed solely to it.

Only static terrain preparation changes. Display drawing, fog/visibility, camps, home marker and camera rectangle keep their existing 500 ms cadence. No simulation, terrain, resources, UI commands, tree richness or frame scheduling changes.

For the exact frozen production `Game.height`, `waterAt` and `terrainRevision` implementations, every expiry validates actual input snapshots before reusing prepared pixels. Inputs include world/state identity, navigation revision, size/segments, source heights, sea/base levels, water grids and body descriptors, ecology kind grids/size, biome descriptors and actual permanent excavation records. Full typed-array copies detect in-place edits without lossy hashes or a long TTL. Custom/overridden samplers retain the old 500 ms bounded-resampling fallback. Original sampler references are captured at module load, so modifying a prototype cannot silently expand the trusted contract. Clock rollback and changed resolution force fresh data.

Height/water/ecology snapshots consume about 2.1 MiB additional typed data at the supported 2080m/4m-grid maximum when all three arrays exist, excluding small descriptor strings and object overhead. They live in the existing weak per-game cache. There are no new timers or GPU resources. The recorded `sampledAtMilliseconds` remains the actual terrain-sampling time; an internal validation timestamp controls input checks.

## Evidence

Fifteen focused checks pass: seven new static-input/cache cases and eight existing coordinate, water/fog, camera footprint and pixel-equivalence cases. They exercise in-place terrain/water/ecology changes, mutable lake/biome data, actual refined trench insertion/equal-count replacement/deletion, restored state/world, source overrides, resolution, time rollback and a newly generated public native V16 world. Fog still changes while terrain buffers are reused. Cached height/water/color bytes are compared with forced fresh sampling. The actual native world also retains the entire encoded save unchanged.

A single cleared CPU window ran actual minimap preparation on public seed 7, V16, archipelago, 1040m. Each A–B–B–A branch warmed one full map, then called the actual model 20 times with timestamps separated by the ordinary 500 ms interval. This is component callback timing with synthetic timer timestamps, not a real-time browser run. No `Game.step`, resources, positions or terrain were altered. The full encoded game and external diagnostic RNG remained unchanged; every height/water/color byte matched on every callback.

| Branch | Mean callback ms | p95 ms | Full resamples / 20 |
|---|---:|---:|---:|
| A1 | 2.051 | 2.652 | 20 |
| B1 | 0.305 | 0.332 | 0 |
| B2 | 0.305 | 0.329 | 0 |
| A2 | 1.823 | 1.832 | 20 |

Observed stable-terrain preparation mean: 1.937 → 0.305 ms (84.3% lower). The small-world trial did not reproduce the historical 48 ms map peak and does not prove it eliminated all periodic stalls. Cold/changed terrain still requires full preparation. Fog painting and canvas presentation are outside these timings; no GPU/FPS or whole-campaign claim follows. Root owns combined type/build and actual browser review. Seasonal terrain repaint and vegetation LOD work remain unchanged.

The aggregate report is `docs/metrics/minimap-static-periodic-2026-11-02.json`. Reproduce the public component comparison with `scripts/diagnostics/minimap-periodic.mjs`, passing baseline root, candidate root and aggregate output path. No private save is required or included. No acceptance gate is added.
