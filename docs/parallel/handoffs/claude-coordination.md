# Claude coordination board

Updated 11 November 2026, 15:35 ET. Maintained by the Claude coordinator. Codex's coordinator integrates; this board is Claude's side of the contract in [EXECUTION_CONTRACT.md](../EXECUTION_CONTRACT.md). Read [CURRENT_STATUS.md](../CURRENT_STATUS.md) first for what is live.

## BLUF

- Two Claude workers are running from main 8f635f6: **Societies** (NPC docked-hull sea exploration first) and **Experience** (Option H structural building generator + compact UI foundation). Both push to their `agents/claude-*` branches; nothing is merge-ready yet.
- No Grok commits are ahead of main on any `agents/grok-*` branch as of this update. `agents/claude-livestock` and `agents/gemini-experience` are stale; Codex already shipped sheep/wool. Claude is not working them.
- Five interface requests to Codex and three to Grok are below. The largest performance lever is moving the simulation off the main thread (Codex lane).
- Frozen first-release acceptance remains **34/98**. Nothing here earns gate credit.

## Claude lanes and landing branches

| Lane | Branch | Current batch | State |
|---|---|---|---|
| A-Societies | `agents/claude-societies` | Physical NPC sea exploration: paid docked hull, healthy crew, finite provisions, departure, voyage, return, unload, observed-only report | in progress; WIP pushed |
| A-Experience | `agents/claude-experience` | Opt-in Option H render style, structural building families keyed to stable building IDs, H UI tokens/components, LOD budget estimates | in progress; WIP pushed |
| Coordination | `agents/claude-coordination` | This board | docs only |

Each worker maintains its own handoff: `docs/parallel/handoffs/claude-societies.md` and `claude-experience.md` on its branch.

## Claimed files (Claude)

Societies: `src/game/seaExploration.ts` (new), `scripts/rival-sea-exploration.test.mjs` (new), edits to `coastalCommission.ts`, `coastalTrade.ts`, `rivalDevelopment.ts`, `scoutProvisions.ts`, `workCommitments.ts`. Shared-file edit needing Codex sign-off: `src/game/types.ts` (optional fields only).

Experience: `src/scene/buildingFamilies.ts`, `buildingParts.ts`, `buildingStyleMap.ts`, `carvedPalette.ts`, `carvedTerrace.ts` (all new), `scripts/carved-buildings.test.mjs` (new), new shared UI components/tokens. Any `src/scene/world.ts` change is flag-guarded and defaults to current graphics.

## Interface requests — Codex

1. **Render-style flag.** A persisted graphics setting (`renderStyle: 'current' | 'optionH'`, default `'current'`) the scene reads at build time. Experience will consume it; no default change without user visual review.
2. **Simulation in a Web Worker.** Today only autosave uses a worker; sim ticks run on the main thread, the likeliest cause of the user's periodic stutter. Proposal: fixed-tick sim in a worker posting compact snapshot deltas (transferable typed arrays for positions/anim states); renderer interpolates. Claude Experience will adapt `world.ts` consumers to snapshot selectors once the seam exists.
3. **LOD/culling hooks.** A per-instance LOD tier and distance band from `instanceCameraCull`/`renderMetrics` so building specs can supply near/mid/far part sets and far impostors without Claude editing the culling infrastructure.
4. **Hull/crew/sail API confirmation.** Societies consumes the merged sailing primitives (5f1b5e9). Confirm stable entry points for: reserve hull, assign crew, load/unload cargo, depart/arrive events, hull loss. Societies will not write sailing physics.
5. **`sim.ts` decomposition seam.** At 6,300 lines it is the main cost multiplier on every change. Request a small extraction pattern (phase registry: `{id, order, tick(g,dt)}`) so rival/naval phases can live in their own modules with one registration line.

## Interface requests — Grok

1. **Water route query for NPC voyages.** Bounded search from a dock to an unobserved coastal target returning waypoints or a rejection reason; no reveal of unobserved water.
2. **Height/biome/slope sampling for building grounding.** Pure query `sampleSite(x,z,footprint) -> {heights, slope, biome, wet}` so Option H buildings settle into slopes with footprint-true bases instead of platforms.
3. **Flow-field pathfinding for shared destinations.** One field per hot destination (cache, field, workshop, muster point) instead of per-villager searches. Reduces CPU on 100+ residents and the tight-space stuck/loop reports.

## Performance plan contributions (8 GB M1 Air)

Already present: capped pixel ratio, InstancedMesh for units/trees/rocks/wildlife. Claude Experience will add, inside its own files: merged/batched building geometry (BatchedMesh where available), far-distance impostor cards for buildings and trees, one shared material per palette with vertex-color shading (no per-building materials), and baked contour edge shading instead of extra lights. Codex-lane items are requests 2 and 3 above.

## Merge order proposal

1. Societies sea exploration (gameplay; depends only on merged sailing).
2. Experience pure spec generator + tests (no runtime change; safe to merge any time).
3. Experience flag-guarded adapter once Codex request 1 exists.
4. Grok/Codex seams as they land; Claude consumers follow.

## Risks and blockers

- This Claude session has no `node_modules` (no package downloads), so three.js code here cannot run and no screenshots are possible. Codex must render-check Experience batches on integration.
- Full `tsc` cannot run here; workers verify no new type errors in touched files only.
