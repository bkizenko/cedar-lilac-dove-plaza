# Hearthwild: coordinated overhaul plan

Updated 2026-10-03. Read this with ITERATION_BACKLOG.md; that file records verified deliveries. This is the forward implementation contract. The target is a playable settlement RTS with demographic growth, environmental constraints, readable tactical combat and a later empire layer. Reference games define the desired experience, not assets or code to copy.

## What exists, and what is still shallow

Terrain, remembered/visible fog, civilian work reservations, seasonal fields, storage preparation, migration/births, militia, physical trade carriers, raids and territory are implemented. They are foundations, not proof that the complete survival loop is fun or balanced. Three habitat profiles exist, but the player always starts in grassland; they currently change a few yields rather than everyday life. Age progression is still a resource/population/building check. Rival motives and production are incomplete. There is no full equipment, clothing or experimentation economy.

The October 3 follow-up adds the first exploration chronicle, continuous exploration, remembered-tree orders, a village-focus button and hidden rival stock totals. Chronicle points currently record achievements; no era bonus or research unlock is claimed. The hard rectangular grass concentration is replaced with a tapered scatter, not a complete vegetation renderer.

Do not report a single overall completion percentage: the target has expanded and most systems need integration/playtesting. Track each phase's acceptance checks as passed/total; a phase is complete only when all pass. Existing implementations are marked partial below.

## Recommended order and independent work packages

| Phase | Status | Deliverable | Depends on | Suggested ownership |
| --- | --- | --- | --- | --- |
| P0 | Partial | Reliable orders, camera, targeting, saves and visible feedback | None | Controls/integration |
| P1 | Partial | Readable terrain, true biome distribution, seasonal weather | P0 | World/environment |
| P2 | Planned | Shared items, local stores, hauling and equipment contracts | P0 | Economy/integration |
| P3 | Partial | Viable biome-specific survival, shelters and clothing | P1, P2 | Settlement/economy |
| P4 | Partial | Useful building families and progression paths | P2, P3 | Economy |
| P5 | Initial chronicle | Exploration, experiments, cumulative knowledge and age transitions | P2, P4 | Progression |
| P6 | Partial | Rival settlements with real budgets, incentives and migration | P2, P3 | Society/AI |
| P7 | Partial | Negotiated trade, imperfect intelligence and diplomacy | P2, P6 | Society/AI |
| P8 | Partial | Legible RTS raids, defense, destruction and survivors | P0, P2, P6 | Combat |
| P9 | Planned | Regional settlement networks and political change | P4–P8 | Society/integration |
| P10 | Partial | Cohesive visuals, seasonal audio and performance | Stable contracts | Presentation |
| P11 | Planned | Optional grounded character view and interactions | P0, P8, P10 | Presentation |
| Q | Ongoing | Multi-year balance, accessibility, saves, performance | Every phase | Independent QA |

First playable milestone: finish P0–P3 for woodland, grassland and uplands. A three-year village should grow, face understandable seasonal choices and sustain one scouting expedition plus one trade journey. Do this before implementing a whole imperial simulation. Improve incrementally in the current engine; extracting modules is preferable to replacing everything at once.

## P0 — Commands and trust in the interface

- Keep explicit exploration active until cancellation, exhaustion of reachable frontiers, or a clearly reported safety event. Remove the five-destination cutoff. Later add waypoint queues, expedition provisions and return/resume decisions.
- Remembered static resources accept direct and box-designated orders; hidden living targets require current sight. Never reveal an unknown resource through picking, keyboard cycling or tooltips.
- Separate a player's manual move from automatic hauling: after arriving, an explicitly stationed scout should not be silently reclaimed for village labor. This remains after the continuous Explore fix.
- Add a visible Focus village button sharing F's action. Preserve selected units and allow camera movement during selection.
- Show why work is blocked, who reserved it, travel distance, required tools and current capacity. No silent command failure.
- Audit troop equipping, town defense, raid cancellation, building selection and placement. Keyboard equivalents for every core action; mobile controls must not cover the map.

Acceptance: one Explore command lasts past twelve destinations; remembered-tree click and box marking work; unknown targets remain hidden; stop/recall works; manual movement cannot get reassigned without an explanation; selected-building camera movement works; old saves and command states round-trip.

## P1 — Geography, biomes, seasons and resources in the world

- Replace camp-index-assigned biomes with seeded climate/elevation/moisture regions and blended boundaries. Offer random or selected starting habitat; disclose local conditions before starting.
- A forest must read as a forest: contiguous tree cover, understory, leaf litter, clearings and credible tree density. Grassland can have riverine woodland/scrub instead of absolutely no timber. Uplands expose rock and ore. Coast/wetland are later additions.
- Vegetation detail follows terrain and camera distance, not one village rectangle. Use instancing/chunks, culling, LOD and a measured instance budget. No visible square edges when panning.
- Winter alternates clear days and snow events where climate permits; seasonal snow cover is distinct from falling snow. Cold should not imply perpetual precipitation. First arrival remains clear. Low graphics quality needs an inexpensive visible weather cue (current particle precipitation is disabled there).
- Survey deposits through observation. Show estimated quality/quantity only when examined; later excavation improves confidence. Finite ore, renewable woodland over long periods, seasonal forage and migrating wildlife.

Acceptance: ten seeds cover all starting habitats; no start is unwinnable from absent mandatory materials; forest is visually identifiable without labels; no grassy-square boundary; winter has both clear and snowy periods; first 300 seconds stay clear; no hidden deposits disclosed by UI; target hardware performance measured before/after.

## P2 — Items, inventory and real work

Agree the shared schema before other models implement new systems. Suggested contracts: ItemDefinition, Inventory/StockLot, Recipe, WorkOrder, EquipmentSlot, Observation, SettlementId. Keep current aggregate food/wood fields as adapters during migration, then remove duplication when consumers are converted. One integrator owns types.ts, persistence.ts and sim.ts wiring.

- Begin with a small useful set: edible plants, meat/fish, grain; timber; stone/flint; hides; plant fiber; clay; charcoal; copper ore; tin ore; iron ore. Add salt, wool/flax, finished textiles and valuable goods only when a working recipe or trade use exists.
- Give quality a concrete effect: ore grade changes yield/fuel, tool material affects durability/work rate, food preservation affects shelf life, clothing affects insulation/breathability. Avoid dozens of interchangeable inventory icons.
- Assign stores and workshops local inventories/capacities. Every transfer uses a carrier or a explicitly modeled transport system. Distinguish village total, immediately available stock and reserved goods.
- Recipes consume physical inputs and adult work, create outputs and carry waste/failure where useful. Construction and workshops cannot spend the same reserved lot twice.
- Equipment is made, issued, repaired, worn and recovered. Hunting stays civilian work using equipment; professional service arrives later.

Acceptance: conservation tests for production/trade/theft; two jobs cannot double-spend; canceled jobs return reservations; haulers recover from blocked routes; equipment wear is explainable; save migration preserves all existing wealth.

## P3 — Different ways to live, with a viable growth loop

Build from environmental affordances, not fixed ethnic stereotypes. A portable hide shelter fits mobile pastoral/hunting play; a timber dwelling fits accessible woodland; reed/thatch and earth/stone variants use their own supply chains. Techniques can spread through contact. No biome permanently locks out development.

- Universal function: shelter. Alternative recipes provide differing warmth, capacity, portability, durability and maintenance. Players can choose mixed strategies rather than receive a reskinned identical hut.
- Woodland: seasonal nuts/fruit, animals, timber and patch cultivation. Grassland: herd movement, hides, fiber, fertile river corridors, fuel/timber scarcity, mobility and exchange. Uplands: short growing season, grazing/forage, stone/ore, insulation and trade. Coast/wetland later: fishing, reeds, boats, preservation.
- Portable camps can pack stores/equipment and follow seasonal opportunities. Moving incurs hauling and lost work time, not instant teleportation. Teach seasonal routes through observed animal tracks, scouting and experience.
- Clothing: hide/fur/wool for warmth; breathable plant-fiber garments for heat; wear, wetness, repair, outfit priorities and clear exposure warnings. Preparation buys safety; lack of one item should not instantly kill a healthy village.
- Household support, births, migrants, aging, injury, illness and recovery need observable causes. Plenty of food alone is not everything, but reserves, shelter and safety should allow reliable growth. Natural lifespan must not compress to a few winters.
- Rebalance construction prices against actual adult labor/travel, not just abstract resource numbers. Show estimated work and unavailable inputs. An opening shelter is already provided.
- Agriculture should begin labor intensive; storage, rotation, livestock, fodder, traction, plows and breeding progressively improve output per worker. Do not hard-code a universal 85% farming quota.

Acceptance: three natural-seed runs per habitat through three years; at least two viable food strategies per habitat; an ordinary player can prepare for winter; safe surplus settlements can grow; a portable camp can relocate without duplicating stock or losing people; clothing changes survival outcomes without random unavoidable mass deaths.

## P4 — Buildings that earn their place

Functional families, introduced only with their associated work:
- Shelter/camp: hearth, hide shelter, timber/thatch home, earth/stone home, later dense housing.
- Storage/preservation: covered piles, storehouse, drying rack, smokehouse, granary.
- Food/animals: work areas, seasonal fields, pens, fishing landing, later mill/bakery and managed grazing.
- Craft: knapping area, hide-working bench, weaving area, pottery kiln, charcoal pit, smelting furnace, smithy.
- Movement/exchange: paths, crossings, pack/carts infrastructure, landing, market/caravan station.
- Collective life: meeting place, healing/herbal work, shrine/cemetery, later learning/administration.
- Defense: watch post, palisade/gate, rally/equipment store, barracks for later professional service.

Publish a building matrix with input costs, worker slots, recipes, upkeep, capacity, unlock and upgrade route. Alternatives should coexist; avoid a single strictly better building in every context. Do not add shells without functioning utility.

Acceptance: each new building changes a measured outcome; no orphan item or useless upgrade; placement/selection/repair/demolition work; prices fit tested opening labor budgets.

## P5 — Exploration and organic discovery

The first chronicle records habitat visits, ore discoveries, first contact and standing stones. Follow with geographically meaningful challenges: chart a pass, locate a winter food source, return with a novel material, connect two settlements, establish a viable outpost. Show progress and record the era/year once; revisiting or rebuilding cannot farm points. Tailor optional challenges to the map's opportunities.

Keep three separate concepts:
1. Legacy/era score records achievements and unlocks a modest choice of settlement traditions. It never replaces food, materials or practical knowledge. No arbitrary era deadline or punishment for a slow peaceful settlement.
2. Knowledge progresses through observation → material sample → practical trials → repeatable technique → broad adoption.
3. Age recognition follows a package of adopted capabilities, sustainable population and supporting production. Keep legacy age names provisionally, but allow distinct routes and asynchronous ages among settlements.

Example: find copper-bearing stone → carry a sample → work native metal/test ores at an appropriate hearth/workshop → accumulate firing/fuel/ore experience → reproduce extraction → produce enough useful tools for adoption. Native copper working and ore smelting are separate techniques. Tin/alloy experiments require access through mining OR exchange. Do not age-lock sampling of a material needed to discover that age; current copper/iron gathering locks must be replaced when this phase lands.

- Allocate actual adults, workshop time, samples and fuel to trials. Free random research ticks are not experiments.
- Settlement density and connections influence how often people share knowledge; food surplus supports specialists; mentor/apprentice ties preserve practice. Use capped bonuses and prerequisites, not a universal density threshold or a global head-count lottery. A small well-connected settlement can learn through trade.
- Failed trials accumulate relevant experience; repeated valid experiments eventually succeed. Show known inputs, progress and what is missing. Save progress so reloading cannot reroll success.
- Distinguish a discovery from adoption: a single prototype does not arm an entire civilization. Technology improves specific recipes, equipment and institutions, not a blanket stat multiplier alone.
- Later branches: cultivation/domestication, storage/ceramics, textiles, traction/transport, metallurgy, construction, navigation and administration. Spread knowledge through migrants, artisans, exchange and observation.

Acceptance: scouting unlocks a real opportunity; a wrong material/furnace combination explains its limit; valid repeated trials cannot fail forever; stockpiling money alone cannot advance; tiny isolated camps do not accidentally skip ages; connected small communities can progress; at least two advancement paths tested; no circular age/material dependency; save/reload retains trials and awards exactly once.

Historical grounding (design inspiration, not claims of a single universal sequence):
- Penn Museum, The Innovation of Iron: https://www.penn.museum/sites/expedition/the-innovation-of-iron/ — practical heat-working skills and social adoption matter.
- UCL, Demography and cultural innovation: https://discovery.ucl.ac.uk/id/eprint/11423/ — a model of population and cultural transmission, not proof of a fixed minimum density.
- Penn Museum archaeology laboratory: https://www.penn.museum/sites/caam/labs/archaeometallurgy-laboratory/ — material evidence for production processes.

## P6 — Other settlements as societies

- Separate settlement identity from faction identity before multiple settlements/refugees. Audit hard-coded team IDs: 0 player, 1/2 major rivals, 3 raiders; UI currently filters some neighbors to IDs below 3. This is a structural dependency, not a naming change.
- Seed names, colors, starting resources, environment and temperament. Derive priorities from food security, shelter, available workforce, seasons and neighbors.
- Rivals use actual stock, labor, recipes and hauling. Expose their intentions only through observed activity, diplomacy or later intelligence. Test for economic cheating.
- Goals: secure winter food, obtain missing tools/fuel, support population, expand grazing, defend routes, resettle after disaster. Personality changes how they pursue needs; no universal high aggression setting.
- Success/failure changes growth, specialization, alliances and migration. Refugees can join, flee to relatives or found a viable new camp if land/resources allow.

Acceptance: over five years at least three seeds produce different winners without scripted outcomes; enemies cannot raid infinitely without people/equipment; shortages influence decisions; population and goods are conserved through migration; no instant replacement settlements.

## P7 — Trade and imperfect information

- Keep exact rival stocks private. Visible open piles can reveal an estimate with observation date; closed stores stay unknown. Tooltips, HUD summaries and negotiation screens must obey the same knowledge model.
- Proposals include quantities, delivery, duration and reciprocal commitments. Partners can accept, refuse or counteroffer based on forecast needs, reservations, goals, travel risk, relationship and alternatives.
- Protect survival reserves: do not sell the last winter food merely because a price formula accepts it. An arms supplier may refuse a threatening neighbor.
- Show intelligible statements such as "We need this grain for winter" or "Bring hides instead" without revealing internal totals. Give useful choices, not opaque random rejection.
- Offers have a validity window; reserve agreed goods and specify what happens if circumstances change. Caravans physically move and can be delayed, turned back or raided. Recurring agreements track deliveries, breach and cancellation.
- Later diplomacy: safe passage, grazing rights, nonaggression, alliance, tribute and knowledge exchange. Sophistication grows with institutions/contact, rather than every prehistoric camp opening a modern foreign ministry.

Acceptance: a food-short village refuses grain exports but offers something else; spring and winter terms differ for a reason; trust is not the only variable; losses/refunds conserve cargo; UI never leaks hidden totals; repeated slider changes do not reveal exact reserves trivially.

## P8 — Combat and meaningful scarcity-driven conflict

- Existing adults equip for militia; professional armies require surplus and institutions. Clear roles/counters, target priorities, range/armor, congestion, retreat and morale before commanders/formations.
- Commands distinguish scout, raid for goods, seize a site and destroy a settlement. Show likely consequences and give cancel/withdraw controls.
- Storehouse pillage removes actual accessible stock into limited carried loot; burning destroys structures/stores over time. Do not instantly teleport loot home.
- Night changes observation and detection. Sneak raids require approaching unseen, scouts/watch posts and alarm propagation; defenders must not know all attackers globally.
- Noncombatants flee, shelter or surrender. Survivors retain identity, belongings and relatives where feasible; captives, release, ransom and coercive labor require explicit state and escape/resentment consequences, not free spawned workers.
- Settlement destruction is possible, but survivors may resettle. Stop spawning raids from eliminated factions. Coastal raids require plausible origins and landing routes.

Acceptance: one defensive alarm can save civilians; raid loot is conserved; a night patrol can detect infiltration; retreat works; factions without manpower cannot field armies; destruction/refugee flows round-trip through saves; combat remains readable at expected population scale.

## P9–P11 — Later scope

- P9: outposts, village networks, roads, regional storage, travel time, local administrators, allegiance, autonomy and eventually breakaway settlements when distance, deprivation or political grievances justify them. Warn the player and offer remedies; no random instant rebellion.
- P10: cohesive free distributable terrain/building/character assets, readable materials, season/clothing variations, population LOD, draw-call/memory budgets. Sparse calm acoustic/piano music with long rests and seasonal variation. Real listening tests; no soundtrack escalation forced merely by a distant war flag. Record every external asset in THIRD_PARTY_ASSETS.md.
- P11: optional walk-through camera and limited inspect/interact actions using the same world/simulation. Do not create a second RPG before the RTS loop works.

## Coordination between models

Use separate Git branches/worktrees per implementer and one integration owner. No simultaneous changes to sim.ts, types.ts or persistence.ts until contracts are agreed. A model's "done" is a tested commit plus a limitations note, not a plan or screenshot alone. Never force-push another model's work.

Recommended parallel assignments after P0:
- World model: P1, owns world generation/rendering/ecology and its tests. Coordinate biome/item IDs before committing.
- Economy model: P2 then P3/P4, owns item/recipe/inventory modules. Integrator wires simulation and migrations.
- Society model: write/test pure decision functions for P6/P7 against agreed economy interfaces; do not invent a separate resource model.
- Progression model: P5 after item/work-order contracts; legacy chronicle can be extended independently, but material/age rules require integration.
- QA/research model: read-only source audit, reference mechanics matrix, seeded scenario definitions and independent playtest reports. Can work immediately.

Combat should wait for inventory/settlement identity contracts. A graphics model can audit existing assets/licensing/performance now but should not replace all world rendering concurrently with biome generation.

## Copyable assignment prompt

Implement phase [P#] from docs/OVERHAUL_HANDOFF.md in this repository. Start by reading AGENTS.md, docs/ITERATION_BACKLOG.md and the current code; confirm which parts already exist. Work only on [owned files/modules] on branch [branch]. Coordinate changes to shared simulation/types/save interfaces before editing them. Preserve existing saves, keyboard access, the clear opening, demographic growth and the running preview. Deliver working gameplay, not only UI or a plan. Do not purchase assets; record compatible free licenses. Add tests for meaningful failure cases, run type checks and the relevant suite, build, and visually verify changed interactions when browser access permits. Report commit, tests, acceptance checks passed/total, known gaps and next dependency. Do not claim another phase is complete. Do not merge or push over another model's changes.

A useful bug report: "In seed/save X, select Y, issue Z; expected A, actual B. Keep C unchanged." For design work: specify the experience, the current pain, the next bounded slice and its acceptance checks. Keep the broad vision in this document rather than repasting all features on every turn.
