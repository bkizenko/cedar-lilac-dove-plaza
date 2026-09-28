# Repository audit — 26 September 2026

Baseline: bkizenko/cedar-lilac-dove-plaza. This audit precedes implementation. Runtime claims are provisional until the checks in DEVELOPMENT_STATUS.md pass.

## Preserve the stack
React 19 + TanStack Start/Router + TypeScript + Vite 8; Three.js 0.185 renders real geometry. Tailwind supplies bronze/parchment UI. No new engine, framework, database, account system or multiplayer server is needed. Preserve platform routing, preview bridge, PWA middleware and existing branding. Node 22.12+ is required by the locked build chain; the initial shell Node 21 is unsuitable.

## Inventory and disposition
| Area | Existing implementation | Classification and action |
|---|---|---|
| World | game/worldgen.ts: seeded heightfield, island, water, resources, camps, rocks | EXISTS AND WORKS at code level; preserve generation; test seed stability and navigable starts |
| Rendering | scene/world.ts: Three scene, camera, fog texture, lighting, seasons, instanced scenery, effects | EXISTS BUT NEEDS IMPROVEMENT; profile GPU calls and disposal, retain implementation |
| Units | game/types.ts + constants.ts: worker, spear, archer, sword, cavalry, leader, warden, ranger | EXISTS BUT NEEDS IMPROVEMENT; shared procedural geometry and articulated motion are genuine 3D, not final authored animation |
| Buildings | 17 types, placement ghost, cost checks, terrain rules, builders, queues, rally points | EXISTS BUT NEEDS IMPROVEMENT; keep definitions and build AI; add walls/gates later |
| Economy | Food/wood/stone/copper/iron, carrying, dropoff, jobs, farms, hunt, fishing, crafting | EXISTS BUT NEEDS IMPROVEMENT; preserve, rebalance survival and visibility of priorities |
| Combat | Melee, arrows, damage, towers, militia, raids and pillage | EXISTS BUT NEEDS IMPROVEMENT; attack-move loses route after engagement; hold suppresses attacks |
| Strategic AI | rivalTick builds, trains, expands, trades, raids; individual worker/combat controllers | EXISTS BUT NEEDS IMPROVEMENT; stagger and budget decisions; test recovery |
| Navigation | 112×112 walk grid, steering and local obstacle probing | SHOULD BE REPLACED selectively; no complete route search, stuck recovery teleports units |
| Selection/input | Click, ground-space rectangle, camera keys, build shortcuts | EXISTS BUT NEEDS IMPROVEMENT; screen rectangle selection wrong under camera rotation; no full keyboard targeting/groups |
| HUD | Stores, population, selection, jobs, buildings, diplomacy, minimap, alerts, age dialogs | EXISTS BUT NEEDS IMPROVEMENT; accessible focus and command guide needed |
| Save | save.ts writes small partial snapshot; loadRaw exists but no game restoration path | PLACEHOLDER; replace persistence envelope, reference restoration and load UI |
| Music | audio.ts oscillator imitation instruments and mood schedule | SHOULD BE REPLACED; use licensed recorded/sample-based acoustic score |
| SFX | Oscillator/noise clicks, work, combat, thunder | PLACEHOLDER sound design; keep working fallback until coherent free SFX pack verified |
| Wildlife | Deer, boar, goat, bird; wandering, fleeing and hunting | EXISTS BUT NEEDS IMPROVEMENT; predators/migration absent |
| Progression | Six ages Stone through Renaissance, costs and branch picks | EXISTS BUT NEEDS IMPROVEMENT; retain compatibility, curate prehistoric campaign through Iron |
| Fog | Vision/visibility-age arrays and rendered fog | EXISTS BUT NEEDS IMPROVEMENT; audit every selection, target and minimap path for information leaks |
| Timing | Variable capped delta, accelerated nights | SHOULD BE REPLACED with fixed simulation cadence; keep speed controls |
| Death animation | Removal + particles | PLACEHOLDER; staged death pose/corpse fade needed |
| Tests | Platform tests + browser smoke, no dedicated gameplay invariants | MISSING game regression coverage |
| Walls/gates, armor classes, tech graph, patrol, queue orders | Not implemented as complete systems | MISSING; dependency-ordered backlog |

## Asset audit
All playable meshes are in src/scene/meshes.ts and world.ts; inspect and reuse their materials, tree/rock instancing, modular bodies, equipment, huts and particle pools. No GLB/FBX rigged character library or recorded soundtrack is present at baseline. public contains favicon.svg, og.jpg, x-banner.jpg and platform install art; these are branding, not playable models. attachments contains the enhancement prompt; artifacts/screenshots contain reference captures, not a licensed external asset pack. Existing artwork provenance is inherited from the project and must not be represented as newly CC0 licensed. Do not discard it.

## Principal risks
sim.ts (~4,290 lines) mixes many systems, O(n²) separation and frequent global scans limit large battles, Math.random prevents replay determinism even though terrain is seeded, silent catch blocks hide unit faults, saves omit references/weather/AI/vision, distant raiders trigger music, and late-era art conflicts with prehistoric scope. Extract at tested seams; avoid a blanket rewrite.
