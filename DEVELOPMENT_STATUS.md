# Rework checkpoint — 27 September 2026

This is a playable mechanics checkpoint, not the completed game described in GAME_DESIGN.md and REWORK_DIRECTION.md.

## Implemented
- Building selection raycasts the actual 3D walls and roofs. A selected production building exposes training buttons and its queue. Training can be queued while paused.
- Camera keys continue working after clicking HUD buttons. Wheel zoom works over the HUD as well as the world; dialogs retain normal scrolling. Building selection remains intact.
- Raid orders retain a destination across fog-of-war, rather than repeatedly reacquiring an unseen building. Home defense does not override an explicit raid. River fords now provide usable crossings.
- A visible “Agree truce & withdraw” action appears during war, both in the trade panel and village ledger. It clears combat targets, raid orders and projectiles between the two sides, orders armies home, and gives ten minutes of recovery.
- World width doubled to 1,040 units (four times the area), with distant rival starts. Terrain and navigation resolution scale with it. New save version 17 starts this larger world; previous saves retain their old storage key and are not overwritten.
- Calm soundtrack enabled by default, music volume 20%. Calm mode keeps acoustic village/adventure music through combat; the stronger battle track is opt-in through Controls & music. Existing licensed recordings and credits retained.
- Thirty-minute seasonal year: sow in spring, tend in summer, collect harvest in autumn, lose uncollected crops in winter. Farm output depends on completed labor. Stored food supports population; storage reduces spoilage.
- Central work board reserves useful tasks and switches blocked workers to alternatives. Nearby basic timber/stone can be gathered before building dedicated workplaces, at reduced efficiency. The village ledger (L) reports reserves, field progress, work reasons, priorities, and neighbor relations.
- Nearby threats trigger civilian shelter or stored-weapon militia defense, followed by return to civilian jobs.
- Neighbors consider grace periods, reserves, army strength, trust and tension before raids. Border-pressure choices include a quiet frontier. Trade prices vary with stock and trust; goods actually change hands.
- Existing keyboard-only commands, full save restoration and backup, fixed simulation step, navigation, persistent exploration and hold/attack-move behavior retained.

## Settlement and trade continuation
- Automatic two-adult arrivals no longer bypass player choice. The default growth policy consolidates the village; welcoming settlers requires spare housing and ten minutes of food. Births require twelve minutes of reserves, and children consume half an adult ration before joining work after one season. This is an initial dependent/adult model, not full simulated households.
- Storehouses are available in the first age, so the storage objective is actionable before Bronze. Wild food stops regenerating in winter.
- Food storage capacity is functional. Over-capacity food decays rapidly; automatic gathering waits at capacity while field preparation remains eligible. Storehouses increase capacity and lower spoilage. HUD and ledger now show food-specific capacity.
- Cultivated fields gradually lose fertility. Resting a field for a year restores fertility, trading current harvest for future productivity. The ledger allows resting/cultivating during spring.
- Workers abandon work surfaces they cannot reach after arriving at the nearest valid position. Dependents are excluded from ordinary work, idle-worker lists and militia conscription.
- Regular and one-off trade physically allocate an adult and carry outbound/return cargo. Stock changes only on exchange and home delivery. Conflict cancels the outward exchange and cargo returns; dead carriers lose their cargo. Routes can pause new departures and report their current status.
- Regular route offers require trust or Bronze age and appear as non-blocking notices. They no longer cover the whole map. Random settlement events occur less often, and no longer automatically spend the player’s timber on new huts.

## Verification
- Production build and TypeScript check pass. Full test suite passes: 257 tests, including 30 gameplay regressions. The route pause check also passed separately after its addition.
- Gameplay regression coverage includes building selection/training, HUD keyboard focus, raids through fog, long-distance raid arrival and projectile damage, truce withdrawal, seasonal labor, work allocation, emergency defense and persistence.
- Fixed-step thirty-minute scenario probes completed. The old automatic-influx baseline reached 23 people; after growth/storage changes, a quiet-frontier run ended with 9 people and 267 food, and a measured-rivalry run with 8 people and 288 food, with no wars in either sample. A final measured-rivalry run including winter forage limits finished at 8 people and 212 food, also at peace. These are diagnostic samples with stochastic events, not a balance guarantee. The scenario script and logs are retained.
- Additional routing probe checked both rival settlements across five seeds; all were connected.
- Interactive development preview: clicked a town-hall roof, queued a gatherer, verified population increased, zoomed/panned with the building still selected, and inspected calm soundtrack enabled at 20% volume.
- Development and built-output browser checks cover 1280×800 and 390×844. Both render the village ledger without horizontal overflow, console errors, page errors, branding warnings or auth warnings. Screenshots were visually inspected. Live-game baseline text differs because food counters, worker states and randomly generated IDs advance; this is recorded in the verdict rather than hidden.
- Interactive continuation: restored a saved village in year five, observed soil depletion and peaceful neighbors, advanced to spring, and used “Rest field this year” to cancel partial sowing. Compact HUD controls were checked in the narrow preview pane; selecting an entity opens its controls.
- Simulation profiling at 50/150/300 player residents is recorded in PERFORMANCE_REPORT.md. Population-count batching, shared job occupancy and staggered worker retries reduced the measured 300-resident average from 2.95 to 1.45 ms per step. Navigation-rebuild spikes remain; rendering was not measured by this probe.
- Source execution moved out of iCloud’s offloaded checkout to a fully local directory with fresh dependencies. The previous development transport failure no longer reproduces there. Source is copied back to the project, with a separate source archive.

## Remaining work
- Detailed cohesive 3D environment/character packs, animation and renderer profiling remain undone. Existing procedural visuals are placeholders. This is not a visual-quality milestone.
- Seasonal population/food balancing needs longer multi-year campaigns. Full household demographics, advanced agricultural technology, formation combat and evolving diplomatic institutions are still backlog work.
- Keyboard paths are implemented but not every advanced-age campaign branch has been exercised. Mobile checks cover layout, not a touch-only campaign.
- No deployment, GitHub push or pull request has been performed.
