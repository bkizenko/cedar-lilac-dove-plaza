# 3D asset and animation manifest

Universal contract: GLB for imported models, meters, +Y up/+Z forward, base-center pivots, shared rough palette materials; optional original .blend sources outside runtime. LOD budgets below are triangles. Static colliders are simplified primitives; no triangle mesh collisions for crowds. Render pipeline must retain procedural fallback. Asset count is per modular family, not per job.

| Category | Models | Variants | Triangle budget LOD0/1/2 | Materials | Scale/pivot/collision | Animation | Acquisition |
|---|---|---|---|---|---|---|---|
| Ground | grass/dirt/rock/water/cliff | 3 ground blends, shore, 2 cliffs | terrain tiles <=8k; cliffs 400 | terrain materials, water shader | existing heightfield; cliff convex | none | Reuse world.ts |
| Trees | pine/oak | 3 each + stump/log | 350/180/60 | shared leaf/bark palette | 2–8m; trunk capsule | wind sway | Reuse existing; Nature Kit candidate |
| Ground clutter | bush/grass/stone/boulder | 3 each | 40–300/50%/25% | shared palette | 0.1–3m; only large rocks collide | none | Reuse existing |
| Deposits | stone/flint/copper/iron/berries | 2 each; depletion stage | 300/150/60 | palette, ore accents | 2–4m sphere proxy | gather feedback | Reuse nodes and meshes |
| Housing | primitive hut | 2 straw/hide roof kits | 1200/600/200 | timber/straw/hide atlas | existing footprint; doorway +Z | construction stages | Reuse hut, author modular improvements |
| Storage | warehouse/granary/lumberyard/stone workplace | 1 each | 1500/700/250 | shared building atlas | existing 4–10m footprint rectangle | construction | Reuse warehouse/lumber/quarry; granary new |
| Production | farm/workshop/barracks/range/forge | 1 each + crop 3 stages | 2000/900/300 | same building atlas | existing definition footprint | crop growth, forge glow | Reuse farm/barracks/forge; workshop/range new |
| Defense | wall/gate/tower | straight/corner/gate/tower | 800/400/150 | same building atlas | 2m segment; gate aperture | gate open/close, damage | Reuse watchtower; wall/gate new |
| Settlement | townhall/market/temple/cairn/grove | 1 each | 2500/1200/400 | same building atlas | existing footprints | construction | Reuse; prehistoric art pass |
| People | modular gatherer/builder/hunter/farmer/warrior/spear/archer/advanced | one rig, 4 hair/cloth choices | 1800/900/450 | skin/cloth palette 512² | 1.7m height, feet origin, capsule | shared clips below | Reuse procedural body pending rig |
| Equipment | spear/bow/arrow/axe/club/knife/shield/tool/bundle | 1 each, 2 material tiers | 30–180; no distant LOD | shared metal/wood/cloth | hand socket; no collision except projectile logic | attached to shared rig | Reuse weapons; add job bundles |
| Animals | deer/boar/goat/bird/wolf | 1 rig each, tint variation | 1200/600/200; bird 250 | shared natural palette | species-scale base origin capsule | idle/walk/run/flee/hit/death; graze | Reuse four species; wolf later |
| VFX | dust/splinter/impact/fire/arrow/corpse | pooled instances | 6–40 per mesh | small shared atlas/blended color | world-space event origin; no collision | 0.2–1.4s event lifetime | Reuse effects; death pose new |

## Shared animation manifest
| Clip | Length | Loop | Implementation/acceptance |
|---|---|---|---|
| idle | 3s | yes | subtle breathing, feet fixed |
| walk | 0.9s | yes | stride synchronized with actual distance |
| run | 0.65s | yes | faster gait, no sliding |
| gather | 1.5s | yes | bend/reach, tool socket stable |
| chop | 1.2s | yes | axe contact emits work event |
| mine | 1.3s | yes | pick contact and chips |
| build | 1.1s | yes | hammer contact |
| farm | 1.6s | yes | hoe/sow alternating |
| carry | 0.95s | yes | upper body holds bundle, lower body locomotion |
| hunt | 1.4s | yes | ready/track weapon |
| melee_attack | 0.8s | no | impact at normalized 0.45 |
| spear_attack | 0.9s | no | thrust at 0.4, recover |
| bow_attack | 1.2s | no | draw/release at 0.65 |
| hit_reaction | 0.25s | no | additive torso impulse |
| death | 1.2s | no | noncolliding immediately, settle then fade |

Import validation: clips have exact names, one skeleton hierarchy, feet at ground, no root-motion translation (simulation owns movement), attachments visible from RTS zoom, bounds recomputed. Blend 0.1–0.2s. Prefer authoring missing clips on the shared rig over independent job models. Existing procedural stride/arm motion is retained until replacement passes these tests.
