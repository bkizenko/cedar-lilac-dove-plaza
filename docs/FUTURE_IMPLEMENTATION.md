# Hearthwild: canonical future execution handoff

You are the next implementation model. Inspect the repository, current Git state, AGENTS.md and relevant project skills first. Preserve working behavior, current saved villages and local changes. Implement, run, diagnose, test, balance and push the remaining accepted game autonomously in dependency order. Do not stop merely after planning. If blocked by a real execution limit, leave this file updated with the exact unfinished acceptance checks. Treat this file as the current remaining-work source; older handoffs are historical.

## Intended game

Dawn of Man survival/production, responsive Age of Empires RTS commands/combat, later Civilization regional scale. Begin sheltered in clear weather, discover resources through actual exploration, grow a recognizable community, create meaningful scarcity/productivity/trade/security choices, then expand through practical knowledge and institutions. Preserve current Three.js renderer; detailed 3D assets and first-person content are later projects, but controls/readability/performance belong here. All 120 human-development entries and former optional extensions are accepted. Do not equate a button or isolated stub with a complete system.

## Current working foundations

- Seeded versioned terrain preserves old landscape geometry when saves load; new games have more varied relief, lakes, rivers and habitats.
- Existing adult civilians gather, hunt, sow/tend/harvest, preserve food, construct, carry supplies, trade, explore and defend. No buying new people from queues.
- Stone spears and bows now require materials and a resident physically working at an outdoor hearth (3× slower), barracks (2× slower) or dedicated crafting shelter; blades require a Bronze Age forge. Progress survives interruption and saves. Selected empty-handed adults equip stored weapons near village buildings without healing or recruiting. Militia stand down at home. Barracks practice uses actual worker time and raises saved combat experience instead of creating a soldier or healing wounds.
- Raids recognize nearby rival structures, engage defenders before structures, and recover from destroyed targets. Melee and projectiles share damage, capture and destruction rules. Ruined stores hold finite reserved loot; raiders load it, physically return and deliver before it enters faction reserves. Remaining caches can be revisited through the ledger.
- Births, group migration and slow adult aging; childhood is compressed to six minutes, not sixteen thirty-minute years. Appetite/size/speed/strength/trade traits are stable; new given names depend on world seed and identity. Parent IDs/life notices are foundations, not a finished family simulator.
- Distinct provisions, berries, fish, meat, grain, pulses and tubers survive transport and saves. Outdoor harvests remain available beyond sheltered capacity; losses depend on food type, temperature, humidity and preservation.
- Wild crop samples must be gathered and delivered home, then an adult performs a saved, interruptible cultivation trial at a reachable hearth. Grain/pulses/tubers have different yields/soil effects. Existing farms keep their established grain knowledge. This is the first practical-development branch, not the complete technology system.
- Calm recorded piano continues during pause/planning; an explicit Enable music button retries browser-blocked playback. Only the active piece streams, with seasonal changes, fades and bounded quiet gaps.
- Material depletion/ore grades, wild-food pressure and regeneration, winter scarcity, farming seasons, field fertility/fallow and river/slope soil suitability. Rain-fed farming is valid; drought hurts fields far from rivers. Farm work has visible activity.
- Knowledge-gated player tasks, persistent search for timber/food/herds, repeated-traffic trails, militia response/recall, deliberate raid/pillage and traveled peace/trade/gift delegations.
- Traveling trade cargo and dated reports, custom offers with destination revalidation, recurring routes and actual rival visitors. Reports still need richer negotiation/personality/intelligence.
- Town halls/outposts, timber-and-labor secondary halls, preliminary homeHall/community records, real residents refounding after collapse and prosperous rivals expanding. These still use fixed faction slots and global faction inventories.
- Player supplies unload at reachable rectangle perimeter points; construction, preservation, combat and trade now also measure actual building footprints. New construction cannot overlap hidden rival buildings through the player’s fog. Physically clear blocked starting cells recover by walking, not teleportation; incomplete storage is excluded. Hungry returning expeditions keep moving at night. Do not regress these with center-target pathing, repeated camp loops or lost cargo.
- HUD only exposes known communities, resource selection has a yellow ground ring and details, left-click empty ground commands selected units, cycling uses arrow buttons, single Save/Load with file transfer tucked away, collapsible interface, intermittent winter snow even on low detail, territory interior color with edge fade.
- Save compatibility: optional new fields, validation before replacing the active Game, automatic backups and manual protection. The active village must never be reseeded/reset for testing. Use file export when transferring the actual saved village: Git contains the code, not browser storage.

## Architecture and files to retain

- src/game/warfare.ts: civilian weapon recipes/work, saved combat experience bonuses and physical ruin-loot recovery. Keep these using the shared navigation and carrier delivery systems.
- src/game/sim.ts: Game facade, fixed-step systems, commands, combat, construction, ages, movement/navigation and HUD snapshot. Extend modules without wholesale replacement.
- src/game/types.ts/constants.ts: schemas, finite resource/unit/building types and balance tables.
- src/game/settlement.ts: seasonal crop labor, WorkBoard job slots/priorities/connected-component navigation, needs and emergency response.
- src/game/transport.ts: short bridge span planning, reachable bank work and physical deck heights.
- src/game/navigation.ts: bounded A*. Game.steer/interactionSpot handle physical routes and blocked building footprints. Cargo conservation is mandatory.
- src/game/journeys.ts, trails.ts, scouting.ts, communities.ts: provisions/rest, shared paths, rival geographic memory and settlement histories/refounding. Save optional fields rigorously.
- src/game/cultivation.ts: transported wild crop samples, actual worker trials, adopted crop varieties and legacy field migration.
- src/game/music.ts/audio.ts: acoustic track lifecycle, browser gesture retries, visibility/mute/seasonal transitions.
- src/game/fishing.ts/mining.ts: finite dock grounds, bank approaches, two-fisher reports and saved mountain excavations.
- src/game/ecology.ts, pantry.ts, people.ts: biome/soil/water influences, storage/preservation, identities/traits.
- src/game/barter.ts, delegations.ts, visitors.ts, raiders.ts, discovery.ts: physical trade/information, visitor encounters, finite camps and chronicle.
- src/game/persistence.ts/save.ts: validated reconstruction, primary/rolling/protected copies and import/export. Terrain versions and identity survive saves.
- src/game/engine.ts/keyboard.ts: rendering/input bridge, pointer and keyboard controls, canvas focus, saving.
- src/scene/world.ts: instanced meshes, resources/selection/cargo, fog/territory, weather, trails. Decorative waving grass was removed for an 8 GB M1 machine; do not add expensive individual meshes.
- src/ui: HUD, village ledger, trade proposal/visitor dialogs, help. Preserve independent camera control with selection and keyboard operation.
- scripts/*.test.mjs: simulation/save/navigation/economy/controls/system regressions; carrier-recovery.test.mjs specifically checks reported hauling/search bugs.
- Existing TanStack/React/Three.js/auth/PWA shell, dependency lockfile and deployment scaffolding stay intact. Do not introduce new dependencies or migrations without an actual need. THIRD_PARTY_ASSETS.md records every external asset's license/use.

## Build, run and test

npm test; npm run typecheck; npm run build. The separate reproducible three-year rival audit is `node --import ./scripts/game-loader.mjs scripts/rival-economy-audit.mjs`; it exercises isolated test worlds and never touches browser saves. Build may skip database migration when DATABASE_URL is absent; local PGLite handles itself. Use Node >=22 (bundled Node24 ARM64 on this machine) rather than its old system Node. Port 8086 is the stable play origin. Build/typecheck/test first, then `npm run play:publish` copies an immutable release and `npm run play` starts it detached. `npm run play:service` installs the macOS user service (requires permission to write its one LaunchAgent); it restarts at login and after crashes. Keep dev on 8080 or another separate port. Do not use the watched development server on 8086. Publishing a new snapshot does not reload the active page; restart the stable server only after preserving the running village. Never kill an unrelated port owner. Browser interaction must use the available computer-use tools, never scrape application internals/localStorage. Keep the server running and the user's village safe. Do not commit generated .vercel/output churn. Push explicit source/docs/test changes to origin/main after verification, as authorized.

## Ordered execution and acceptance

1. Validate the current recovery phase against the actual saved village and multi-seed long runs. Test group recalls, center/corner/crowded-store delivery, river/steep-route failures, interrupted scouting, starvation, storage saturation and a full survival year. People must move, replan, signal a genuinely inaccessible destination or suffer normal survival consequences; never be silently idle forever. Routes must not teleport people or mint cargo. Confirm tree clicks and left-click move, hunting search, arrow cycling, keyboard panning, snow, farm work and minimized HUD in the browser.
2. Build sustained rival economies before more conquest content. Diagnose fields/workforce/output/reserve/growth bottlenecks; all factions obey labor/material rules. Some thrive and become threatening, some stagnate or fail. Unforced collapse keeps the world running. Natural collapse and prosperity no longer end the world. Keep deliberate final military elimination as the conquest ending, including dynamically added factions when those exist. Replace fixed slots with stable faction/community identities through a compatible save migration; multiple dynamic societies, refugees and new foundations, meaningful inter-village migration and later breakaways.
3. Practical development: experiments consume delivered samples, actual worker time and fuel, produce evidence, then adopted techniques improve real production. Linked food/textile/tool/metallurgy/transport/construction/governance branches; no arbitrary points spending, free treasure technology or circular ore/age gates. Ages require useful adopted techniques and sustainable population/surplus. Show exact missing conditions and progress. The current cost/pop/building ages are transitional; the Bronze threshold is now 220 food/150 timber/60 stone/10 people. Crop experimentation is working; metallurgy and age recognition still need this framework.
4. Real physical economy: shared finite storage for every supply, local capacity/overflow/hauling with understandable full-store behavior, durable tools/weapons, fiber/clay/hides/bone/copper/tin/bronze/iron/fuel recipes, actual workshops and meaningful building variety. Freshwater collection/access/storage is required; contamination/drainage/waste and maintenance provide decisions. Brewing is an optional fermentation/nutrition/cultural production chain, never universally required for human survival. Visible cargo and worker actions accompany every production chain.
5. Geographic subsistence and animal systems: forest/grassland/desert/valley/upland differences; new-map versioning only; viable shelters, clothing, hunting/tracking, nomadic herds, fishing/wetlands. Forest expansion/fire, sustainable hunting/carcasses/hides, domestication, pens/fodder/milk/wool/traction, plows and irrigation. Ground-following fields, shore structures and terracing; upright buildings use proper foundations. Players can exhaust local land and must adapt/trade/explore/move. Regions receive names through exploration/community use.
6. Better information and diplomacy: rival scouts/traders discover the player rather than knowing coordinates by magic; reports brought home, trader skill gives uncertain population/resource estimates, voluntary disclosure/reputation, multi-resource offers/counteroffers, repeat agreements, access/grazing/transit rights, peace withdrawal and locally recognized hostilities. Wealth attracts attention through observable stores/trade/exploration; knowledge and incentives determine raid risk rather than omniscient inventory checks. Rival parties form paths and compete for resources/spheres of influence.
7. Combat progression: early spears remain civilian equipment, barracks train skill/damage at a labor opportunity cost; individual experience levels from actual work/practice. Gear, attack/defense/counters, responsive pursuit/retreat/attack-move, congestion, morale, escorts/night raids, prisoners/surrender/release/integration, pillage/fire/destruction, walls/palisades/gates. Later professional soldiers, commanders/formations/siege/naval combat depend on the civilian economy. Preserve shared movement/damage APIs for future first-person combat.
8. Community life and institutions: small settlements use given names, later families/clans based on relationships rather than repetitive fixed surnames. Support/dependents, morale, household histories, disease/exposure/injury/treatment/sanitation, culture/artifacts/oral knowledge/later writing; administrators with competence/scope/reports, local autonomy/tax/public works/law, federation/vassalage/alliance alternatives. Do not impose a single deterministic historical path or claim geography forces one political structure.
9. Challenge and balance: replace spectator autoplay with preparation and opportunity costs, discovery goals with practical rewards, expedition/survival/production/security choices and readable forecasts. Avoid arbitrary disasters or death spirals. Test years across harsh/rich starts, new and legacy saves, low-end performance, complete material/technology paths and dynamic rival turnover. Maintain this file and cross out catalogue entries only after acceptance tests and observed play.

## Known remaining limitations

Global faction stores bypass regional logistics; water/clothing/equipment/health/culture branches incomplete; grain/pulses/tuber trials exist, but linked material experiments/organic ages remain incomplete; scout memory currently updates collective knowledge while away; incoming visitors know the player through a legacy shortcut; fixed major faction slots limit independent rise/fall; boats/walls/domestication/commanders absent; prisoners exist only as primitive capture conversion; training/skills incomplete; paths now use smaller feathered marks centered on actual traffic; connected spline routes, boats and expanded crossing engineering remain open; short timber bridges now work. Current new-map biomes are plains/forest/hills, not full desert/valley climate simulation. The renderer remains provisional; never confuse a visual feature with gameplay completion.

## Latest verified phase and next unresolved checks — 2026-10-03

Desktop and 390-pixel built-release rendering were checked with no captured console errors and no horizontal overflow. The saved browser village resumed paused with 80 food, 39 timber, 16 stone and five residents. Its two established grain fields retained planting progress. The music panel reported Playing during pause and after Enable music, with no captured browser errors. Audio lifecycle regressions cover mute, backgrounding, failed autoplay, seasonal transitions and quiet intervals. The complete suite passed 386 tests (354 game/tooling and 32 app/auth tests); typecheck and production build passed. The separate final three-seed rival audit passed. Automated tests cover cultivation labor/cargo/save compatibility, climate losses, storm shelter, carrier recovery, hunting/search, corner interactions, finite pillage and growth forecasting.

Rival starvation had several concrete causes: player-fog collision checks allowed unseen buildings to overlap, circular interaction ranges rejected reachable corners, and storms halted all work for 160–300 seconds (more than a month). These are repaired. Severe storms last 20–50 seconds and consecutive severe storms ease into rain/frost. Rival births now reserve meals for children maturing before the next harvest; shortage no longer randomly destroys huts. Continue multi-seed years of real labor, harvest, depletion and trade: the final seeded three-year audit passed with all six societies surviving at 7–11 residents. All remained in Stone and several had no spare timber: resource bottlenecks and advancing into later ages are not complete. Do not mark goal-driven rival economies or dynamic faction turnover finished.

Next inspect surviving rival timber acquisition, sustainable fertility/rotation, winter alternatives, travel loops and field/warehouse staffing. Existing faction-wide storage and fixed identity slots still constrain these systems. Raw fishing nodes are not yet WorkBoard tasks and docks now consume finite known nearby grounds with two labor slots and report rates before hauling; complete broader fishing tools/traps/boats and seasonal population ecology. Incoming traders/scouts still need journey provisions and information delivered home. Loot is now conserved across victim stores, ruin caches, carried goods and home delivery, with one claim per destroyed structure. Full prisoners remain open; the current capture conversion is still a temporary foundation. Ruin caches do not yet decay, have a detailed resource mesh, or participate in regional storage. The legacy building arming queue still reserves no particular trainee and needs physical participation, equipment reconciliation and later professional requirements; do not confuse this with the new physical civilian crafting/practice work. The day/night cycle and annual month calendar use distinct compressed scales: harmonize deliberately without corrupting saved timers.

## Historical interpretation boundaries

Farming has seasonal labor peaks, plus livestock, repairs and storage; it does not require endless daily tilling. Rain-fed agriculture is valid where rainfall supports it. Separate soil potential from depletion and drought damage. Vitruvius can inspire measurable exposure, drainage, smoke and water quality; ancient unhealthy-air theories are not modern medicine. Fertile corridors and rugged terrain alter transport/coordination incentives, not deterministic political systems. Sheltered valleys are not universally warm: inversions and drainage matter. Brewing can serve nutrition, preservation and culture, but is not universally necessary for survival.

## All open catalogue entries (partial counts as open)

1. Seeded starting habitats and seasonal climate profiles.
2. Regional soils, fertility, slopes, exposure and water access.
4. Local shortages that encourage exploration, exchange or migration.
5. Forest recruitment, succession, clearing and regrowth.
6. Grassland grazing, woodland wild food and upland extraction strategies.
7. Rivers, lakes, wetlands, fishing grounds and navigable channels.
8. Flood, drought, wildfire and storm risks with warning and recovery.
9. Carrying capacity and depleted hunting/gathering grounds.
10. **Accepted extension:** longer climate shifts and settlement adaptation.
11. Hunger, diet and physically available food.
13. Shelter capacity, warmth, fuel and storm refuge.
14. Clothing suited to cold, heat and wet conditions.
15. Injury, illness, care, recovery and readable death causes.
17. Expedition provisions, camping and return decisions.
18. Shelter/tool degradation, repair and replacement.
19. **Accepted extension:** water quality, sanitation and waste.
20. **Accepted extension:** morale from safety, family, food variety and community events.
23. Household/family links and support of dependents.
25. Refugees, rescue encounters and former settlement histories.
26. Captives, surrender, release and gradual integration.
27. Departure when settlement life is unsafe or unsustainable.
28. Seasonal nomadic camps and following herds.
30. **Accepted extension:** traditions transmitted through families and apprentices.
32. Tracks/signs and locating moving herds.
33. Civilian hunting with primitive equipment, risk and group coordination.
34. Fleeing/aggressive wildlife and sustainable reproduction.
35. Carcass transport, butchery and useful hides/bone.
36. Seasonal wild foods, fishing and traps.
37. Animal capture/taming and species-specific domestic uses.
38. Pens, fodder, pasture, veterinary care and breeding.
39. Milk, meat, wool, transport and animal traction where species permit.
40. **Accepted extension:** selective breeding, pack dogs and working horses.
41. Land clearing and viable low-timber fields.
43. Seeds, soil exhaustion, fallow, manure and crop rotation.
44. Drying, smoking, salting and grain storage where inputs exist.
45. Mortars/querns, mills and other actual processing jobs.
46. Irrigation/drainage with terrain and maintenance constraints.
47. Animal-drawn plows and later plow improvements.
48. Tools and processing that free people for other work.
49. **Accepted extension:** crop diversity, orchards and managed wild plants.
50. **Accepted extension:** pests and crop disease with mitigation.
51. Wood, stone/flint, fiber, hides, bone and clay with actual uses.
52. Knapping, woodworking and hide-working.
53. Warm/light garments through tanning and weaving.
54. Pottery/containers and improved storage.
55. Charcoal/fuel and kiln/smelting inputs.
56. Copper/tin/bronze/iron material chains without circular age gates.
57. Tool/weapon recipes, durability and outfitting priorities.
59. Useful workshops and upgrade branches, each with real worker tasks.
60. **Accepted extension:** glass, specialty stone, dyes and luxury craft goods.
61. Portable shelters, seasonal huts and durable houses suited to materials.
62. Hearths, fuel stores, granaries and preservation areas.
63. Workshops, animal pens and production yards.
64. Meeting/community centers, healing, ritual and learning spaces.
65. Palisades, gates, watchposts and later towers.
66. Construction labor, local input delivery, repair and fire/destruction.
67. Relocating the community center through labor and reconstruction.
68. Multiple settlements with home/work/storage assignments.
70. **Accepted extension:** public spaces, monuments and settlement identity.
71. Evidence-led experiments with new materials and techniques.
72. Time, labor, fuel and uncertain results that produce useful evidence.
73. Bring samples and recovered artifacts home before studying them.
74. Workshops/learning buildings supporting experimentation and adoption.
75. Apprentices, outside exchange and cumulative practical knowledge.
76. Discoveries about habitats/routes/peoples recorded in a chronicle.
77. Age recognition based on adopted practices and a sustainable community.
78. Linked food, textile, metallurgy, construction, transport and governance branches.
79. Cultural artifacts valued differently by different societies.
80. **Accepted extension:** oral histories, later writing and libraries with distinct information effects.
83. Selective disclosure, boasting, concealment and reputation.
84. Needs-based willingness, counteroffers and multi-item deals.
85. Physical gifts, cargo, recurring routes and delivery failures.
86. Peace delegations, withdrawal and locally recognized agreements.
87. Resource/grazing/transit rights and disputed frontiers.
88. Scarcity competition without mandatory constant war.
89. Trade contacts teaching techniques and supplying unavailable goods.
90. **Accepted extension:** interpreters, measures, markets and later monetary institutions.
92. Later engineered roads with real labor/material/upkeep costs.
93. River boats, launch sites, ports and land/water transfer.
94. Pack animals, sledges/carts and capacity/speed tradeoffs.
95. Local stores, carriers, hauling priorities and route reliability.
96. Bridges/fords/choke points as strategic constraints.
97. Expedition escorts and raider ambush risk.
98. Sea arrivals and raids grounded in actual movement.
99. **Accepted extension:** navigation knowledge and seasonal sailing conditions.
100. **Accepted extension:** warehouses serving regional supply networks.
101. Stone-age clubs, spears and bows; civilians can hunt/defend.
103. Shared militia stores, alarms and recall horn.
104. Responsive selected-unit raids, attack-move, retreat and hold.
105. Distinct counters, armor, ranges, projectiles and collision/spacing.
106. Separate gatherer slots from guards/escorts and patrols.
107. Night raids, finite raider camps, stolen cargo and safe trade routes.
108. Pillage, building fire, civilian flight, surrender and conquest aftermath.
109. Later trained specialization, commanders and formations supported by civilian economy.
110. **Accepted extension:** siege, fortified towns and naval combat after core transport/combat work.
111. Varied names/colors, preferences, strengths, risks and settlement strategies.
112. Goal-driven rival economies that obey the same human/material constraints.
113. Rival scouting, defense, cooperation, aggression and recovery.
114. New settlements, collapse and survivors founding elsewhere.
115. Expansion constrained by resources, transport and local population support.
116. Appointed administrators with competence, policy scope and reports.
117. Regional logistics and local autonomy.
118. Breakaway settlements and nontrivial reintegration/conflict choices.
119. **Accepted extension:** obligations, taxation, public works and later legal institutions.
120. **Accepted extension:** federations, vassalage and alliances as alternatives to conquest.
## How to report a checkpoint

State the commit/push, exact tested outcomes, failures or unverified play checks, compatibility decisions and remaining acceptance gaps. Do not invent a percentage. A feature is complete only when its inputs/labor/information, player decision, AI behavior, saves, observable output and meaningful acceptance tests work together. Use one next dependency block, and keep going while execution budget permits.

## Weapons and raids phase — 2026-10-04

Priority requested by the user: restore the preview, then weapons/raids, then continue the broader overhaul. Keep the player's browser village untouched while testing combat on a separate origin. The preview startup now launches the existing npm development script as a detached process with a disk log; foreground mode is retained. Generated build and QA files are excluded from the development watcher to prevent unwanted village reloads. A temporary detached preview remained healthy after the launching shell exited. Local network probes must run outside the restricted shell network sandbox; a sandbox connection failure is not evidence the server stopped.

The civilian weapon/raid controls are exposed in Village (L) and selected-unit actions. In the separate built game, crafting reserved four logs and one stone, took a resident away from food work, increased stored spears from three to four after actual work, and arming consumed those four weapons while preserving the same five people. Narrow-screen rendering had no document overflow; no captured console errors. Automated regressions cover saved/interrupted crafting, Stone Age bows/forge requirements, selection and no healing, barracks practice, local hostility, raid movement, defender prioritization, finite ruin cargo, physical delivery and save/load during return.

Verification: the complete suite passed 395 tests (363 game/tooling plus 32 app/auth), followed by all 10 final warfare tests after adding guards against experience from friendly/dead targets. Final typecheck and production build passed. The earlier three-year rival audit remains the baseline; it was not repeated for this combat phase.

Immediate next combat work: bind legacy building arming queues to real residents and workplaces; reconcile all equipment paths with the armory; replace instant captive conversion with surrender/escort/holding/release/integration decisions; add defensive equipment/counters, palisades/gates and morale/escorts. Then resume sustained rival timber acquisition and age advancement, followed by the remaining dependency-ordered phases above. Raiders returning with loot stay armed and await orders on delivery; user move/horn commands withdraw them. Do not mark the full war branch or the entire nonvisual overhaul complete.


## Controls, carrier recovery and production phase — 2026-10-04

The user released the requirement to preserve the particular five-resident browser village; ordinary save compatibility remains mandatory. Controls/save now fold to a small header, Stores reveals provisions/berries/fish/meat/grain/pulses/tubers, and the selected building offers its own weapon recipes. The ledger links to the actual crafting building rather than offering duplicate remote production buttons. A crafting shelter costs 18 timber/2 stone. Hearth spear/bow work takes three times the base labor; barracks take twice, dedicated shelters use base labor. Crafting progress is explicitly paused by direct commands, retained through saves and resumed deliberately. Clicking a different building cannot silently assign production to a nearer hall. Loaded adults accept move/raid commands while conserving cargo and packed food. Early arming never requires free population slots.

Summer hard frost has zero probability and loaded summer frost clears immediately. Carrier recovery probes the physical slope segment before connected-component delivery checks; supplies are neither teleported nor deleted. New starts reposition residents after all generated rival structures are assembled, avoiding inhabitants enclosed by later-added stores. This repaired the distant-raid defender regression. Scouts resting at night now have small visible campfires, and additional/new town halls receive refreshed hearth markers. Truly isolated islands/cliff pockets still require transport/rescue; do not promise all possible navigation obstructions are eliminated.

Lumber camps cost 16 timber. Exhausted stands automatically remove the camp and refund 12 timber once, including previously reclaimed legacy camps. Dock catches now deduct actual finite nearby known fish stocks, require labor, carry distinct fish home and stop when grounds are exhausted. A dock reports 0–2 assigned fishers, remaining known stock and a base maximum of 37 fish/fisher/min before hauling, winter and other modifiers. Direct shore fishing approaches a reachable dry bank. Mountain quarries can be placed on accessible slopes above elevation 10 without a loose surface stone node. Their seed-dependent 320–1200 stone seam is finite, has variable extraction yield, advances excavation depth through labor and survives saves. Precious ores/deeper stratigraphy/prospecting, mine supports and transport are still open.

Terrain colour transitions blend neighbouring samples, and explored fog no longer recolours a coarse terrain grid white. Territory opacity varies continuously. Footpath marks are smaller, fainter, feathered and positioned along actual walking traffic; optional positions preserve old saves. Building roofs no longer request nonexistent vertex colours (which made roofs black). Seed-specific village palettes and age-related wall/roof colour and roof-profile changes are a first visual pass, not the detailed cultural building/texture overhaul. Keep this cheap on the 8 GB M1; decorative waving grass remains disabled.

Next ordered production/transport block: model stone/flint and shaft/fiber/hide inputs with useful tool recipes and durable equipment; prospect mountains through working time, discover finite graded copper/tin/iron seams at depth and study materials before adopting metallurgy. Add supported mine entrances and reliable mountain approach paths. Extend the working short timber bridges with fords, rival crossing decisions and longer engineered crossings. Implement civilian boats with physical embarking/cargo/routes and rescue, then seasonal fishing and boat-assisted trade. Follow with regional warehouses/freshwater and the existing organic-development/rival-economy phases. Full cultural models at every age are explicitly requested and remain in the visual backlog. Continue the broader combat/prisoner/defense queue; the new production foundations do not complete it.

Local Civilization VII files were read only as a reference for separate ownership overlays and zoom-stable city UI. No proprietary code, models or textures were copied into this project. Test concurrency is capped at two game/tooling processes to reduce memory pressure. Final validation: all 407 tests passed (375 game/tooling plus 32 app/auth); typecheck and production build passed. The built game was checked at desktop and 390 × 844 viewports: keyboard start/pause/building selection, selected-building commands surviving canvas zoom, actual spear-material reservation, separate food rows and collapsible controls worked. Narrow-screen document width matched the viewport, with no horizontal overflow. No captured console warnings/errors. The final fog mesh matches terrain resolution, preventing coarse fog facets from exposing undiscovered mountain patches. The temporary built preview was closed; the development preview remains on port 8086, paused and ready to play. These are bounded checks, not a claim that every long-running world or the whole overhaul is complete.


## Short river crossings and fallback routes — 2026-10-04

Timber bridges are buildable in the Stone Age for 32 timber/4 stone and 40 seconds of base construction labor. Placement automatically aligns to two explored, clear, gentle banks, over a shallow channel no wider than 28 meters. Builders approach either reachable dry bank. An unfinished bridge does not change navigation; a completed one opens a deck in the existing navigation grid and physical movement checks. Residents carry cargo across without converting or teleporting it. Bank work, bridge dimensions, slope, selection report and preview orientation use the same saved span. Recycling a bridge is blocked while any living resident stands on it; once empty, recycling closes the route. Saves reject missing, oversized and displaced bridge spans. Decorative grass remains disabled.

The physical deck edge may occupy a grid cell whose center is water; deck points now remain walkable. A separate movement defect affected any blocked destination: caching a route under its fallback dry-ground destination caused the next frame to discard and rebuild it. Routes now retain the requested destination as their cache key and finish at the chosen reachable point. This preserves actual walking and cargo while preventing endless restart at the first waypoint. Quarry placement/completion guidance also explains bare mountain seams rather than only loose stone outcrops.

Do not mark transport item 96 fully complete: broad strategic ford/crossing decisions, rival bridge construction and long engineered crossings remain. Boats, sea transport/raids, pack animals, regional supply networks and rescuing truly isolated islands are still open. Destruction of an occupied crossing needs an explicit fall/swim/rescue policy before naval combat; voluntary recycling already refuses an occupied bridge. The existing save format is retained with validated optional span data.

Crossing validation: the full 411-test suite passed before the final fallback-route correction; all 85 final navigation/carrier/journey/warfare/production regressions then passed, including five crossing tests. Final typecheck and production build passed. An isolated imported village on a naturally generated river displayed a selected 15-meter bridge and carried cargo; no captured browser warnings/errors. Browser interaction used public game controls and file import, never private state injection. The full nonvisual overhaul remains incomplete.


## Save recovery, recall, river health and contact — 2026-10-04

Implemented in this phase: primary saves are written before optional backup copies, so a backup quota failure no longer blocks saving. Dated copies choose the latest deliberate save; legacy undated copies choose the furthest simulation time within the active seed. Stale same-village autosaves cannot roll back the primary. Pause (keyboard and toolbar), opening the ledger, page exit and engine disposal save progress. The initial engine resumes the newest compatible saved village paused instead of presenting a new village. Imported deliberate rewinds become the primary save. This prevents future losses; it cannot reconstruct progress absent from every stored copy. Never overwrite or reset a user's browser world for QA.

Recall now cancels scouting, visiting, founding, studying and emergency overrides; interrupted crafting retains progress but pauses. Every living own resident, including militia and children, walks to a reachable completed hearth entrance. Cargo and packed journey meals are deposited only after physically reaching it. A disconnected river/island keeps the cargo and reports the missing route rather than teleporting or pretending to unload.

Completed docks reveal their nearby water, get a higher food assignment priority than berries, and expose an explicit two-fisher assignment button. Catches consume finite local fish stock and arrive as fish cargo. River sections carry saved pressure/health; rested stocks recover gradually, depleted sections have a delay, and drought/winter slow recovery. Catch pressure scales to ground capacity. Winter dock labor is slower but more productive than before. Wider fishing tools/traps/boats and wildlife ecology remain open.

The enthusiastic welcome setting permits groups with four minutes of meal reserves and earlier arrival opportunities. Attraction follows food reserves, spare housing, health, fatigue, peaceful safety and neighbour trust. New wanderers begin on reachable dry approaches and physically walk home. Existing donor migration remains a limited legacy system: refugee identity, faction autonomy, actual departing families and information-spread routes are not complete. Exploration focus sends at most three adults (roughly a quarter), reserving journey meals and leaving others working; low food prevents sending another explorer. The priority does not secretly reveal resources. Crop gathering now gets a small priority boost before cultivation is known; the ledger and placement messages explain the sixteen gathered food/four delivered samples and hearth trial prerequisite.

Actual close visible encounters with unknown foreign people pause for a first-contact choice: greet, continue, or recall the meeting explorer. Greetings do not disclose remote inventories. Known settlements link to the existing traveled trade/delegation screen; a locally waiting trader can exchange their actual carried goods. Incoming traders can choose a real surplus when their preferred metal is unavailable, instead of never leaving home. They still use the legacy shortcut to the player's coordinates and need independent knowledge/provisions. Field barter, interpreters and richer negotiations remain open.

Latest new requests accepted and still to implement: search/rescue/captive expeditions, guarded physical prisoner escort, custody, release/integration, coerced labor with rest/health costs, guard opportunity costs and escaped/revolting captives. Keep food and fatigue real; forcing work must not make a person physiologically immune to exhaustion. More hunting/tracking and varied huntable herds, raw shore fishing tasks, detailed fishery condition/upkeep, material experiments and stronger differentiated rival economies are next. These foundations do not complete the accepted human-development catalogue.

The stable play server serves copied production output and recorded audio without Vite or a source watcher. Its health route identifies its own release. Source editing and builds run in a separate checkout; port 8086 retains the same browser storage origin. Keep `.play` releases/logs/PIDs ignored and keep all generated `.vercel/output` changes out of commits. This phase's browser verification is blocked by the browser security policy; do not claim a new observed UI check or work around that block via another browser, private state access or shell browsing. Continue source-level tests and build checks and record their exact result below.

Phase validation: the full suite passed 427 tests (395 game/tooling and 32 app/auth), followed by the added production-adapter regression passing with the server path/MIME test. Typecheck passed. The production build passed before the final save-copy timestamp refinement; the final production rebuild is required before publishing that refinement. Two obsolete recall tests simulated arrival with a movement stub without moving a person; they now position the fixture at a real reachable entrance, while the separate physical walk tests cover the complete journey. No private browser state was read or changed.
