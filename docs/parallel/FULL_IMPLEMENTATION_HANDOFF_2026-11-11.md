# Hearthwild — full implementation and cross-model handoff

> Live status and pending batches: [CURRENT_STATUS.md](CURRENT_STATUS.md). Historical snapshots below do not override it.

Snapshot: 11 November 2026. Read current origin/main before work. This is the whole game programme, not a promise to finish it in one day. The latest user requests override contradictory historical proposals. All owners have full trust and end-to-end responsibility for design, implementation, tests and reviewable deliverables within their domains.

## Active coordination override

Gemini is not participating. Read [EXECUTION_CONTRACT.md](EXECUTION_CONTRACT.md): Claude takes the visual/architecture/cultural-content/UI-design scope, Codex takes render-performance engineering and technical UI behavior, Grok takes biome dressing/site/grounding data. All original requirements below remain. Persistent file ownership and frequent serial merges supersede earlier unrestricted shared-file wording.

## Truthful current state

Published gameplay commit **c4e6060**, release **2026-11-11T19-47-17-122Z-c4e6060**, last verified on ports8086 and8101. Planning HEAD at this inventory: ce3932d. The unchanged release checklist records **34/98 (34.69%)**. It has not been redefined as a count of code files, tests or backlog bullets. The latest published batch passed94/94 executed checks, with a documented nondeterministic native-goat test failure subsequently corrected in test seeding and rechecked. These checks do not establish that the whole game is complete.

Working published slices: food scheduler and short precise route repairs; real cache-loaded trade payment; compact workshop and knowledge flows; bridge dry-bank approaches; timber homes without fibre prerequisite; physical padded torso armor; staffed beam ram; purpose-specific goat search; paid automatic site clearing for new sites; saved goat-search queues; player name, emblem and flag pattern. Each is partial relative to the full domain. Read docs/metrics for assumptions and limits.

Pending, NOT live: sailing candidate (30 distinct checks, typecheck; needs current-base integration/build/native UI acceptance); sheep/wool candidate (36/36 focused checks plus final legacy-resume regression and typecheck; needs integrated build/native acceptance). Codex owns these candidates. Do not duplicate their work or imply horses/dairy already exist. Many older uncommitted canonical edits remain held and are not automatically published.

## Ownership of the complete programme

| Owner | Full responsibility | First integrated milestone |
|---|---|---|
| Codex | Economy, labor, survival, agriculture, livestock, crafting, skills/discovery, prestige, persistence and release integration | Finish sheep/wool and sailing integration; reliable food/labor and measured historical profiles |
| Claude | Independent societies, international AI, trade, diplomacy, conflict, conquest, armies and naval operations | Actual NPC docked-boat exploration with cargo, return and observed reports |
| Grok | World generation, ecology, hydrology, navigation, placement, territory and civil engineering | Tight-space navigation plus terrain/river/field reliability and varied regional worlds |
| Claude Experience + Codex Platform + Grok World | Former Gemini scope: Claude art/design/content; Codex runtime performance/technical UI; Grok biome/site data | H3D/UI review plus measured render budgets |

Every owner has full implementation responsibility in a persistent domain. Shared-file changes follow explicit ownership and small reviewable integration patches in EXECUTION_CONTRACT.md. This is coordination, not a prohibition on substantial work. Codex integrates into main and the running game. Branches alone do not mean external agents have started. No direct provider chat connection is currently established.

## Governing product decisions

- Desktop only; target an8GB Mac. Keep current graphics available. Do not migrate the whole game to Godot during reliability work; an isolated engine benchmark can inform a later decision.
- Incentives and physical actions drive behavior: finite owned inventories, real movement/work, observed knowledge, needs, risk and opportunity cost. No invisible goods, free technologies, omniscient AI or UI-only simulated completion.
- Starts are nomadic with no automatic permanent buildings; camps and their actual supplies can move. Manual gathering starts coexist with village Auto Work. Drinking water and existing food processing continue automatically even when Auto Work is off.
- Days have slow visible minutes; nights advance faster while the displayed day remains coherent. Preserve seasonal proportionality and bright playable daytime.
- No rigid island rule: archipelagos are common; divided continents and mostly-land edge-connected worlds are valid; a dominant island with satellites is rarer. World and region character can be flat, hilly, mountainous or mixed. Required features are spread across the map, not copied onto every island. No universal majority-gentle bias.
- User approved H is the **bottom-middle warm honey-orange carved-wood diorama** in the saved D–I board. E is the **top-middle painterly landscape**. D is contour cartography. Do not swap these labels. Broad live art replacement remains subject to visual review; build genuine3D prototypes and keep the previous graphics.
- No hourly updates. Report completed batches and decisions honestly. Do not claim overnight progress without an actual running task and results. Retain approved concept art; remove disposable screenshots/previews after use.

## C — Codex economy, people and progression

1. **Labor reliability:** precise worker state metadata (task, phase, target, cargo, reservation, blocking reason, active time, travel time); queued tasks on busy workers; deterministic priorities; recovery after death, interruptions and raids; food role includes processing. Workload includes planned construction and processing, with transport included in its parent job rather than double-counted. Overwork modestly reduces efficiency, never randomly disables survival indefinitely. Scale job admission and assignment fairly beyond100 residents.
2. **Food chains:** crops → sheaves → thresh → grain/chaff → winnow → clean grain → grind → flour → bake bread or cook porridge. Physical per-workshop input/output buffers, finite batches, visible queues and progress, real fuel/water where needed. Harvest goes to a suitable station/cache; no one-grain courier loop. Auto processing runs with Auto Work off; time-sensitive ripe harvest and perishables have urgency. Meat requires hunting, carcass transport, gutting/skinning then cooking/drying/smoking; fish cooking/smoking also automatic. Raw emergency consumption has reduced value and probabilistic illness for meat/fish. Taste, variety and nutrition are separately tunable.
3. **Storage:** per-resource volume/weight, local inventory and capacity, outside overflow near the actual store when full, weather/spoilage risk, no material disappearance. Seeds are planting reserve in detail rather than misleading main food HUD; chaff/straw have bounded uses/disposal, not endless valuable stock. Pottery has form, liters, tare, contents, seal, condition and provenance; baskets/sacks/barrels supplement it. Maintain one owner and real carried load.
4. **Historical farming:** calibrate gross/net yield, retained seed, fertility, crop rotation, seasonal work and storage losses against sourced ranges. Current rendered field area is economically compressed; do not claim it is literal acreage. Existing farmCalibration calculator has no live callers. Version new profiles or opt-in migrations; preserve current harvest inventories. Current model overweights postharvest work, and annual seed withdrawal is missing. Explain changed food/worker-year outputs before rebalance.
5. **Livestock:** actual wild goats, sheep, cattle, pigs, poultry, horses, donkeys/oxen and appropriate regional species; discoverable habitat, real capture/taming trials with failure, feed/water, pasture, keepers, breeding and disease. Pen search queues do real scouting, not hidden-target teleporting. Sheep fleece→wash→spin→weave/felt→warm clothes. Dairy→milk/cheese/fermented milk. Stables, grazing, mobile herding starts, pack animals, traction and cavalry/chariot equipment. Capture success and time depend on distance, species, handling and access.
6. **Materials and craft:** clay extraction→prepare→pottery/kiln or mud brick/fired brick; stone, timber, fibre, hides/leather, wool, copper/bronze/iron, tools, fuel and charcoal. Distinct per-workshop instances and queues; task pickup without selecting an arbitrary empty-handed adult. Repair/condition/replacement and tool progression, adjustable prices. Armor progression beyond current padded torso: shields/headgear/leather/mail/plate as era permits, cultural visual variation via Claude Experience, physical combat effects via Claude.
7. **People/discovery:** modest innate aptitudes, size/speed variation; task-specific practice/time history, teaching, specialist productivity and diminishing team returns. Needs and experiments unlock practical methods and building/boat classes; no mandatory abstract tech tree. Knowledge interface uses short method cards and evidence, not essays.
8. **Survival:** automatic water; fuel-consuming fires/hearths, shelter and wool/hide clothing; nearby huddling and recovery, heat burdens in deserts, seasonal food availability. Beer is fermented grain with strength and vessels, not the only historical safe water or automatic sterilization. Critical needs visible without spam.
9. **Prestige:** transparent weighted score from sustained population/security, actual trade, discoveries, civic works, wonders and meaningful controlled land/resources. Separate prestige from physical territory and influence. Diminishing returns and anti-farming rules; awareness travels through contacts. Prestige affects settlers/delegations, limited morale/productivity effects and raider interest. Known-village rankings retain unknowns without leaking hidden statistics. Expansion is motivated by resource access, crowding, soil, strategic position, local specialization and logistics, not free global buffs.

Acceptance: finite-input end-to-end scenarios with ordinary actors; bounded job time and sensible nourishment/worker-time; full stores and lost workers recover; current saves strictly reload;100+resident workload scenarios remain responsive. Source/component checks alone do not earn published gates.

## A — Claude independent societies and international systems

1. NPC households and villages build, clear actual trees, specialize, grow and sometimes plan streets; use their own knowledge, stock, risk and relationships. Multiple villages per society and island. Exploit resources without infinite free production.
2. Explore land and sea using actual healthy crews, paid docked hulls, provisions and physical return/report. Current audited rival has provisions and healthy adults but no registered hull; one injured personal canoe owner blocks the old equipment path. Do not fix it with more boats carried on heads. Separate hull commissioning from prior foreign-hall discovery.
3. Need-based trade with goods actually held: food, minerals, tools, animals, artifacts and voluntary labor arrangements. Actual caravans/pack animals/sleds/boats, escorts based on trust/risk; finite inventories and payment/loading/delivery receipts. Declined offers cool down/change. Select another village or encountered visitor to propose exchange and hold an interesting contextual conversation in a dialog. Cultural artifacts have provenance and an inspection presentation. Later gold/silver exchange preserves physical value and units.
4. Relationships, diplomacy, leaders, promises, alliances, delegations, requests/quests and information propagation between NPCs as well as player. Procedural authored conversation can work locally; a live LLM must remain optional, not required for core game reliability.
5. Raider camps, material needs, recruitment and severity policy. Wealth attracts attacks; arms, successful defense and escorts deter. Some raids loot and retreat, others take captives or attempt destruction, scaled by difficulty. Different actual approaches/directions; no automatic landing notification, only observed threat detection. Raiders return physically to camp or valid map exit, by boats when needed; no shore huddle or timer vanish. Bounded pursuit recovers dropped stolen cargo.
6. Defense horn, local able-adult arming, standing guard/patrol/garrison, automatic militia stand-down and Town Hall stand-down. Maintain civilian task/cargo after defense. Real target selection for units/groups, combat spacing, commanders and later professional formations. Coordinate navigation with Grok.
7. Staffed siege beyond existing beam ram: attackable/repairable engines, projectiles, ammo, crew and target geometry; naval battles and ports/shipyards with physical crews, cargo and docking.
8. Natural surrender/capitulation after actual pressure; capture, escort, custody, interrogation, release/ransom/exchange and integration. Conquer intact villages: annexation, puppet/autonomy, tribute, looting, forced labor and destructive outcomes with real population/stock/ownership consequences, resistance and upkeep. Never equate conquest to automatic burning or a free dialog reward. Surviving societies can refound.

Acceptance: two independent societies actually scout/trade/raid/conquer each other on native terrain; failed admission reasons recorded; every cargo/captive/hull has conserved ownership; retreat reaches a real destination; player military returns to useful work. Save/reload at each transaction phase.

## W — Grok world, movement and civil engineering

1. Full seeded landmass and regional generation: varied coves, peninsulas, straits, edge-connected continents, irregular islands without duplicate template pairs. Large-scale climate/ecology, at least eight meaningful regions with transitions; regional flora/fauna/resources and seasons. Score terrain diversity, spacing/clustering, beauty and viable starts. Same saved seed reproduces; fresh games vary. Do not promise mathematical impossibility of any similar coastline.
2. Required geography: hills, valleys, connected ranges/passes, plateaus, canyons, cliffs, terraces, pillars, dune/wadi districts, river networks, lakes, waterfalls/receiving pools, wetlands and readable coasts. See all36 entries below; physical features and drainage, not decorative labels. Advanced caves/karst/glacial/volcanic families remain explicit follow-up where the catalogue calls for assessment.
3. Smooth channels/banks and coherent confluences; wet/dry ground matches visuals. Finite reach-scale fish/clay stocks with recovery and seasonal ecology, no independent overlapping circles multiplying one river's fish capacity. Rectangular river/shore selections with inspectable quantities. Water flow/head/current exposes data for mills, boats and irrigation. Fertility/moisture visibly affect vegetation/ground color.
4. Precise tight-space movement and collision, stable camera over mountains, zoom without unexpected angle changes. Bounded route search, reservations and anti-loop recovery; no teleport or radius cheat through solid buildings. Fog orders move toward an unobserved destination until physically constrained without revealing water in advance.
5. Whole-area fields over reasonable rolling slopes, planted coverage matches paid usable area. Automatic physical clearing of obstructing trees/brush/loose stone. Rigid building geometry/entrances fit real footprints; rotation, tighter gaps and truthful preview/commit equivalence. Extend latest new-site clearing to expansions safely. Bridges start from reachable dry-bank work positions. Multiple/bigger markets and settlement plots.
6. Roads, bridges, traversable graded trenches with selectable depth, canals with excavation and actual water grade, wells, irrigation, watermills/windmills, aqueducts/cisterns, terraces and drainage. Per-material height/strength/maintenance; functional building geometry settles into slopes without universal oversized foundation blocks. Coordinate structural appearance with Claude Experience and economic recipes with Codex.
7. Physical flags/claims, contested ownership and forts; separate geological barriers and capability-based reach from prestige. Mountains/seas inhibit influence absent real routes/ships. Expansion radius is a gradient beyond strong local reach, not a hard initial ring. City planning can be organized or organic based on actual society choices.

Acceptance: seed suites measure distinct regions, landmass families, drainage and route/start safety; no universal gentle-land bias. Native placement preview equals commit; congested routes recover; river stocks shared by reach area. Every earthwork paid, reachable and persistent.

## V — Visual experience: Claude design/content, Codex runtime, Grok world data

1. Preserve original H/E boards in docs/art-reference. Build actual3D H sample (warm orange wood, layered carved contours, natural lighting, blue river, richer detail) and E sample; show real models, not claims based on generated images. Preserve current graphics as fallback. Obtain visual review before replacing the live game wholesale.
2. Every building family has a sourced real structural reference and functional silhouette, era/material/wealth variants, procedural bays/roof pitch/additions/doors/wear and imperfections. Avoid twelve cookie-cutter huts as the final variation system. Early huts, timber homes and masonry upgrades; multi-storey limits by material. Small hearths are stones/fire, most buildings have no base larger than actual footprint. Markets, temples, workshops, fortified barracks, archives and universities must read as their functions.
3. New cultures emerge from climate, material, craft history, symbols and relationships, with many plausible original combinations. Inspiration includes Nile/desert-canyon/European/Chinese/Pacific/Indigenous traditions without mapping every original culture to one modern ethnicity. Flags, palettes, armor, clothing and pottery styles have consistent but varied grammar. Clothing responds to season; equipment/armor must be visible actual assets.
4. Six approved wonder families: ring observatory, crescent harbor, cascade garden, canyon cistern, assembly court, mill market. Generate structurally plausible, seed/culture/site-specific3D plans with functional stages, circulation and variants. No identical named wonder every game. Codex owns scoring, Grok site/flow constraints, Claude political effects. Ruins look broken/aged with actual discoverable artifacts and remnants, not clean new buildings with a ruin label.
5. UI overhaul: compact icons/quantities, contextual tooltip purpose/cost, queue boxes/progress, one concise blocking reason and actionable remedy. Separate ledger tabs with live history/production and seasonal comparisons; report only at season end. Minimalist knowledge and crafting, simple inventory and capacity, trade dialog with actual goods/leader context. Desktop RTS patterns from studied Civ7/Dawn of Man screenshots; preserve keyboard/pause controls, no text dashboard.
6. Animate actual actions: walking/carrying/rowing/fighting/threshing/winnowing/grinding/baking/tending, finite effect emitters, correct cut-tree visibility at distance and LOD. Individual modest variation without expensive unique meshes for everyone. Audio has calm/attack/defense states and skip music, with no false attack state for nonexistent raids.
7. Measure CPU simulation, pathfinding, draw calls, triangles, GPU, memory and allocation spikes separately on8GB Mac. Frustum/distance culling, chunk residency, instancing, shared materials/atlases, LOD, bounded far simulation, low-shadow option and static selection rings. Low/Medium/High must have explicit budgets and useful comparable measurements; do not claim hundreds of citizens smooth from a single model preview.
8. Later isolated first-person management/combat prototype and engine comparison; no forced migration or proprietary reverse-engineering prerequisite. Preserve deterministic simulation and saves. Licensed asset/tool options and local procedural generation are welcome; do not require paid generation APIs or distribute unclear assets.

Acceptance: reviewed playable3D samples and real in-game interactions, not concept art alone; distinct buildings at normal camera distance, readable controls, Low fallback, measured native-world performance and old-save compatibility.

## Delivery order and cross-owner contracts

Wave1: close physical failures (food/labor, goat/sheep, placement/nav, NPC sea scouting) and create reviewed visual/UI vertical slice. Wave2: material/container economy, skills, fleets/caravans, organized settlements and cultural architecture. Wave3: diplomacy, conquest, prestige/expansion, cavalry/siege/naval warfare, wonders/ruins/quests. Wave4: integrated100+population performance, difficulty, campaigns, onboarding, save migration and full98-gate acceptance. Later eras through muskets/1700s and previously requested future extensions remain in the backlog; the user explicitly deferred them relative to core reliability and classical gameplay.

Shared contracts: resource identity/cargo containers (Codex); hull/crew/mission state (Codex physics, Claude mission orchestration); navigation/usable work positions (Grok); building definitions/sites (Codex economy, Grok placement, Claude geometry); society knowledge/diplomacy (Claude); culture visual grammar (Claude Experience); prestige formula (Codex). Publish interface changes in the branch notes and provide migration rules. Resolve overlapping ownership explicitly rather than deleting a feature.

Use isolated branches/cloud checkouts; never external-edit the dirty canonical worktree. One heavy local build/browser/simulation at a time on this8GB Mac. Cloud source work can proceed concurrently. Code inspection and short deterministic scenarios first; native UI acceptance at integration boundaries, not long repeated playthroughs. Preserve saved villages and approved art. No force-push over another owner's work. Never change ports8086/8101 or main directly from an external branch. Each deliverable includes base/head, exact files, migration impact, tests with fixtures/assumptions, remaining defects and proposed gate evidence. Codex publishes a single qualified frozen artifact with rollback.

## Source inventory and exact coverage

The machine-readable FULL_GAME_BACKLOG.json preserves source lines, status annotations, IDs, source hashes, historical crosswalks and proposed owners. The lists overlap: **do not add them into a new completion denominator**. All25 original tasks,120 human-development items,36 geographical entries,8 biomes,40 QA bullets,56 request-audit rows,6 explicit new requests and13 master detail gaps are retained. The98 release gates below remain the only frozen first-release percentage. A crossed-out historical catalogue line is not full gate acceptance.

## Original25 tasks

ID | Task | Owners | Source
--- | --- | --- | ---
01 | Audit and freeze contracts | C,A,W,V | ASTRA_BACKLOG.md:7
02 | Keyboard world commands | V | ASTRA_BACKLOG.md:18
03 | Acoustic adaptive score | V | ASTRA_BACKLOG.md:29
04 | Reliable save and resume | C | ASTRA_BACKLOG.md:40
05 | Fixed simulation cadence | C,V | ASTRA_BACKLOG.md:51
06 | Route around obstacles | W | ASTRA_BACKLOG.md:62
07 | RTS selection and combat orders | A,V | ASTRA_BACKLOG.md:73
08 | Vertical slice integration gate | C,V | ASTRA_BACKLOG.md:84
09 | Spatial query budget | C,V | ASTRA_BACKLOG.md:95
10 | Construction and repair refinement | W,C | ASTRA_BACKLOG.md:106
11 | Survival economy and priorities | C | ASTRA_BACKLOG.md:117
12 | Death and job animation | V | ASTRA_BACKLOG.md:128
13 | Shared character rig | V | ASTRA_BACKLOG.md:139
14 | Defenses and gate navigation | W,A | ASTRA_BACKLOG.md:150
15 | Soft counters and formations | A | ASTRA_BACKLOG.md:161
16 | Strategic tribe director | A | ASTRA_BACKLOG.md:172
17 | Prehistoric technology graph | C | ASTRA_BACKLOG.md:183
18 | Cohesive environment pack pass | V,W | ASTRA_BACKLOG.md:194
19 | Wildlife and seasonal habitat | W,C | ASTRA_BACKLOG.md:205
20 | Fog and scouting audit | W,A,V | ASTRA_BACKLOG.md:216
21 | HUD and teaching pass | V | ASTRA_BACKLOG.md:227
22 | Natural SFX and environment mix | V | ASTRA_BACKLOG.md:238
23 | Save migration and deterministic replay | C | ASTRA_BACKLOG.md:249
24 | Performance and balance gate | C,V,A,W | ASTRA_BACKLOG.md:260
25 | Playable alpha packaging | C | ASTRA_BACKLOG.md:271

## Full120-item civilization catalogue

ID | Requirement | Owners | Source status
--- | --- | --- | ---
1 | Seeded starting habitats and seasonal climate profiles. | W,C | Open/partial source marking
2 | Regional soils, fertility, slopes, exposure and water access. | W,C | Open/partial source marking
3 | Uneven finite mineral deposits and persistent ore grade. | W,C | Historical strike; recheck scope
4 | Local shortages that encourage exploration, exchange or migration. | W,C | Open/partial source marking
5 | Forest recruitment, succession, clearing and regrowth. | W,C | Open/partial source marking
6 | Grassland grazing, woodland wild food and upland extraction strategies. | W,C | Open/partial source marking
7 | Rivers, lakes, wetlands, fishing grounds and navigable channels. | W,C | Open/partial source marking
8 | Flood, drought, wildfire and storm risks with warning and recovery. | W,C | Open/partial source marking
9 | Carrying capacity and depleted hunting/gathering grounds. | W,C | Open/partial source marking
10 | **Accepted extension:** longer climate shifts and settlement adaptation. | W,C | Open/partial source marking
11 | Hunger, diet and physically available food. | C | Open/partial source marking
12 | Sleep/rest with chosen night shifts and fatigue. | C | Historical strike; recheck scope
13 | Shelter capacity, warmth, fuel and storm refuge. | C | Open/partial source marking
14 | Clothing suited to cold, heat and wet conditions. | C | Open/partial source marking
15 | Injury, illness, care, recovery and readable death causes. | C | Open/partial source marking
16 | Seasonal food reserve forecasts and preservation losses. | C | Historical strike; recheck scope
17 | Expedition provisions, camping and return decisions. | C | Open/partial source marking
18 | Shelter/tool degradation, repair and replacement. | C | Open/partial source marking
19 | **Accepted extension:** water quality, sanitation and waste. | C | Open/partial source marking
20 | **Accepted extension:** morale from safety, family, food variety and community events. | C,V | Open/partial source marking
21 | Fitting generated names and distinct personal traits. | C,V | Historical strike; recheck scope
22 | Birth, childhood, adult work and old age on a playable timescale. | C | Historical strike; recheck scope
23 | Household/family links and support of dependents. | C | Open/partial source marking
24 | Arrivals of families or groups, not only isolated migrants. | C | Historical strike; recheck scope
25 | Refugees, rescue encounters and former settlement histories. | A,C | Open/partial source marking
26 | Captives, surrender, release and gradual integration. | A,C | Open/partial source marking
27 | Departure when settlement life is unsafe or unsustainable. | A,C | Open/partial source marking
28 | Seasonal nomadic camps and following herds. | C | Open/partial source marking
29 | Individual life notices and a durable community history. | C,V | Historical strike; recheck scope
30 | **Accepted extension:** traditions transmitted through families and apprentices. | C,V | Open/partial source marking
31 | Unknown resource locations revealed through actual scouting. | C,W | Historical strike; recheck scope
32 | Tracks/signs and locating moving herds. | C,W | Open/partial source marking
33 | Civilian hunting with primitive equipment, risk and group coordination. | C,W | Open/partial source marking
34 | Fleeing/aggressive wildlife and sustainable reproduction. | C,W | Open/partial source marking
35 | Carcass transport, butchery and useful hides/bone. | C,W | Open/partial source marking
36 | Seasonal wild foods, fishing and traps. | C,W | Open/partial source marking
37 | Animal capture/taming and species-specific domestic uses. | C,W | Open/partial source marking
38 | Pens, fodder, pasture, veterinary care and breeding. | C,W | Open/partial source marking
39 | Milk, meat, wool, transport and animal traction where species permit. | C,W | Open/partial source marking
40 | **Accepted extension:** selective breeding, pack dogs and working horses. | C,W | Open/partial source marking
41 | Land clearing and viable low-timber fields. | C,W | Open/partial source marking
42 | Sowing, tending and time-limited harvest labor. | C,W | Historical strike; recheck scope
43 | Seeds, soil exhaustion, fallow, manure and crop rotation. | C,W | Open/partial source marking
44 | Drying, smoking, salting and grain storage where inputs exist. | C,W | Open/partial source marking
45 | Mortars/querns, mills and other actual processing jobs. | C,W | Open/partial source marking
46 | Irrigation/drainage with terrain and maintenance constraints. | C,W | Open/partial source marking
47 | Animal-drawn plows and later plow improvements. | C,W | Open/partial source marking
48 | Tools and processing that free people for other work. | C,W | Open/partial source marking
49 | **Accepted extension:** crop diversity, orchards and managed wild plants. | C,W | Open/partial source marking
50 | **Accepted extension:** pests and crop disease with mitigation. | C,W | Open/partial source marking
51 | Wood, stone/flint, fiber, hides, bone and clay with actual uses. | C | Open/partial source marking
52 | Knapping, woodworking and hide-working. | C | Open/partial source marking
53 | Warm/light garments through tanning and weaving. | C | Open/partial source marking
54 | Pottery/containers and improved storage. | C | Open/partial source marking
55 | Charcoal/fuel and kiln/smelting inputs. | C | Open/partial source marking
56 | Copper/tin/bronze/iron material chains without circular age gates. | C | Open/partial source marking
57 | Tool/weapon recipes, durability and outfitting priorities. | C | Open/partial source marking
58 | Resource quality influencing yield, labor or equipment performance. | C | Historical strike; recheck scope
59 | Useful workshops and upgrade branches, each with real worker tasks. | C | Open/partial source marking
60 | **Accepted extension:** glass, specialty stone, dyes and luxury craft goods. | C,V | Open/partial source marking
61 | Portable shelters, seasonal huts and durable houses suited to materials. | W,C,V | Open/partial source marking
62 | Hearths, fuel stores, granaries and preservation areas. | W,C | Open/partial source marking
63 | Workshops, animal pens and production yards. | W,C | Open/partial source marking
64 | Meeting/community centers, healing, ritual and learning spaces. | W,C,V | Open/partial source marking
65 | Palisades and gates | W,C | Historical strike; recheck scope
66 | Construction labor, local input delivery, repair and fire/destruction. | W,C | Open/partial source marking
67 | Relocating the community center through labor and reconstruction. | W,C | Open/partial source marking
68 | Multiple settlements with home/work/storage assignments. | W,C,V | Open/partial source marking
69 | Dismantling/salvage that conserves materials. | W,C | Historical strike; recheck scope
70 | **Accepted extension:** public spaces, monuments and settlement identity. | W,C,V | Open/partial source marking
71 | Evidence-led experiments with new materials and techniques. | C,V | Open/partial source marking
72 | Time, labor, fuel and uncertain results that produce useful evidence. | C,V | Open/partial source marking
73 | Bring samples and recovered artifacts home before studying them. | C,V | Open/partial source marking
74 | Workshops/learning buildings supporting experimentation and adoption. | C,V | Open/partial source marking
75 | Apprentices, outside exchange and cumulative practical knowledge. | C,V | Open/partial source marking
76 | Discoveries about habitats/routes/peoples recorded in a chronicle. | C,V | Open/partial source marking
77 | Age recognition based on adopted practices and a sustainable community. | C,V | Open/partial source marking
78 | Linked food, textile, metallurgy, construction, transport and governance branches. | C,V | Open/partial source marking
79 | Cultural artifacts valued differently by different societies. | C,V | Open/partial source marking
80 | **Accepted extension:** oral histories, later writing and libraries with distinct information effects. | C,V | Open/partial source marking
81 | Envoys travel and meet; dated meeting reports appear on arrival, while people and cargo return physically. | A,C | Historical strike; recheck scope
82 | No live remote view of inventories or intentions. | A,C | Historical strike; recheck scope
83 | Selective disclosure, boasting, concealment and reputation. | A,C | Open/partial source marking
84 | Needs-based willingness, counteroffers and multi-item deals; procurement requests with material/quantity targets and spending limits, affected by trader skill and counterpart needs/friendliness. | A,C | Open/partial source marking
85 | Physical gifts, cargo, recurring routes and delivery failures; a trading labor priority and real procurement expeditions with cargo/return limits and escort choices. | A,C | Open/partial source marking
86 | Peace delegations, withdrawal and locally recognized agreements. | A,C | Open/partial source marking
87 | Resource/grazing/transit rights and disputed frontiers. | A,C | Open/partial source marking
88 | Scarcity competition without mandatory constant war. | A,C | Open/partial source marking
89 | Trade contacts teaching techniques and supplying unavailable goods. | A,C | Open/partial source marking
90 | **Accepted extension:** interpreters, measures, markets and later monetary institutions. | A,C | Open/partial source marking
91 | Trails develop through repeated passage; unused paths fade. | W,C | Historical strike; recheck scope
92 | Later engineered roads with real labor/material/upkeep costs. | W,C | Open/partial source marking
93 | River boats, launch sites, ports and land/water transfer. | W,C | Open/partial source marking
94 | Pack animals, sledges/carts and capacity/speed tradeoffs. | W,C | Open/partial source marking
95 | Local stores, carriers, hauling priorities and route reliability. | W,C | Open/partial source marking
96 | Bridges/fords/choke points as strategic constraints. | W,C | Open/partial source marking
97 | Expedition escorts and raider ambush risk. | A,W | Open/partial source marking
98 | Sea arrivals and raids grounded in actual movement. | A,W | Open/partial source marking
99 | **Accepted extension:** navigation knowledge and seasonal sailing conditions. | W,C | Open/partial source marking
100 | **Accepted extension:** warehouses serving regional supply networks. | W,C | Open/partial source marking
101 | Stone-age clubs, spears and bows; civilians can hunt/defend. | A,C | Open/partial source marking
102 | Observe an armed raid or attack before relations turn hostile. | A,C | Historical strike; recheck scope
103 | Shared militia stores, alarms and recall horn. | A,C | Open/partial source marking
104 | Responsive selected-unit raids, attack-move, retreat and hold. | A,C | Open/partial source marking
105 | Distinct counters, armor, ranges, projectiles and collision/spacing. | A,C | Open/partial source marking
106 | Separate gatherer slots from guards/escorts and patrols. | A,W | Open/partial source marking
107 | Night raids, finite raider camps, stolen cargo and safe trade routes. | A,C | Open/partial source marking
108 | Pillage, building fire, civilian flight, surrender and conquest aftermath. | A,C | Open/partial source marking
109 | Later trained specialization, commanders and formations supported by civilian economy. | A,C | Open/partial source marking
110 | **Accepted extension:** siege, fortified towns and naval combat after core transport/combat work. | A,W | Open/partial source marking
111 | Varied names/colors, preferences, strengths, risks and settlement strategies. | A,C,W | Open/partial source marking
112 | Goal-driven rival economies that obey the same human/material constraints. | A,C,W | Open/partial source marking
113 | Rival scouting, defense, cooperation, aggression and recovery. | A,C,W | Open/partial source marking
114 | New settlements, collapse and survivors founding elsewhere. | A,C,W | Open/partial source marking
115 | Expansion constrained by resources, transport and local population support. | A,C,W | Open/partial source marking
116 | Appointed administrators with competence, policy scope and reports. | A,C,W | Open/partial source marking
117 | Regional logistics and local autonomy. | A,C,W | Open/partial source marking
118 | Breakaway settlements and nontrivial reintegration/conflict choices. | A,C,W | Open/partial source marking
119 | **Accepted extension:** obligations, taxation, public works and later legal institutions. | A,C,W | Open/partial source marking
120 | **Accepted extension:** federations, vassalage and alliances as alternatives to conquest. | A,C,W | Open/partial source marking

## All36 geography entries

ID | Requirement | Owners
--- | --- | ---
1 | Connected mountain ranges with several summits and unequal silhouettes. | W,V
2 | Ridge spines, secondary spurs, saddles and passes with usable approaches. | W,V
3 | Foothills and rolling hills across substantial districts. | W,V
4 | Broad valleys, nested smaller valleys and inhabited basins. | W,V
5 | Narrow ravines and gullies branching into larger valleys. | W,V
6 | Plateaus and elevated shelves with distinct edges and access routes. | W,V
7 | Mesas and isolated buttes as members of the plateau/erosion family. | W,V
8 | Incised canyons/gorges with opposing walls, varying width, bends and real floors. | W,V
9 | Cliffs/escarpments and exposed layered rock faces. | W,V
10 | Natural benches and terraces with unequal width/riser patterns; constructed farm terraces are separate paid work. | W,V
11 | Pillar/pinnacle districts with intervening wooded or rocky ravines. | W,V
12 | Rock outcrops, boulder fields, talus/scree and weathered lower slopes. | W,V
13 | Fertile plains, broad floodplains, meadows and clearings; these coexist with strong relief rather than replacing it. | W,V
14 | Wind-shaped dunes, interdune hollows and exposed rocky desert surfaces. | W,V
15 | Badlands, branching dry channels/wadis and seasonal washes. | W,V
16 | Headwaters/springs or upland source basins feeding actual drainage. | W,V
17 | Main rivers with descending profiles and changing width. | W,V
18 | Tributaries, confluences and connected catchments. | W,V
19 | River bends/meanders with uneven banks and bars. | W,V
20 | Lakes with irregular shorelines, inlets/outlets and usable banks; elevated lakes need their own actual water level. | W,V
21 | Pools/backwaters and seasonal wet depressions associated with the drainage network. | W,V
22 | Waterfalls with linked upper/lower water, a real bed drop and receiving pool. | W,V
23 | Rapids/cascades and portage/crossing decisions where river grade changes. | W,V
24 | Marshes, reed beds and riparian wet ground with actual moisture/water relationships. | W,V
25 | Floodplain channels, bars, sediment margins and seasonal flood exposure. | W,V
26 | River mouths, estuaries and delta-like depositional areas linked to the downstream river. | W,V
27 | Irregular bays, coves and headlands. | W,V
28 | Peninsulas, narrow land connections and meaningful natural crossings. | W,V
29 | Beaches, shingle/rocky banks and coastal shelves. | W,V
30 | Coastal cliffs, offshore outcrops/stacks and small islets where suitable. | W,V
31 | Sheltered shallows/lagoons, deeper channels and safe/unsafe landing approaches. | W,V
32 | Shore vegetation and wet/dry transition zones; foam/color alone do not establish physical shallows. | W,V
33 | Caves, rock shelters, natural arches and overhangs: require real mesh/access treatment beyond a single-valued heightfield. | W,V
34 | Sinkholes/karst depressions and their drainage behavior. | W,V
35 | Glacial cirques, U-shaped upper valleys, snowfields and morainic/boulder terrain. | W,V
36 | Volcanic cones/craters and old lava/rock fields. | W,V

## All8 biomes

Biome | Landforms | Vegetation | Mechanics
--- | --- | --- | ---
Meadow/grassland | Fertile plains, rolling hills, broad river margins | Multiple grass heights, flowers, berry patches, scattered shade trees | Fields/pasture, visible wildlife, exposed routes; soil and seasonal water affect output
Mixed woodland | Low hills, clearings, gullies and forest streams | Broadleaf/conifer mix, understory, fallen wood, leaf litter and rocks | Timber, forage, sheltered work; denser routes and local depletion/regrowth
Cool conifer forest | Cooler uplands, rocky streambeds, lake margins | Needleleaf stands, mossy ground, deadfall and patchy clearings | Timber and cold-season fuel; shorter growth window, snow/cold and access costs
Montane/alpine | Ranges, passes, cliffs, scree and upper basins | Sparse/stunted trees below treeline, alpine grass, exposed stone and snow pockets | Prospecting, stone/ore and viewpoints; grade, exposure, limited building/farming area
Freshwater wetland/riparian | Marshes, floodplains, reed beds, pools and backwaters | Reeds/rushes, bank shrubs, willow-like growth and wet soil | Fishing, reeds, water access, moist fertile margins; flood and footing constraints
Dry scrub/woodland | Stony terraces, dry hills, ravines and intermittent channels | Low scrub, drought-tolerant trees/herbs and open dry ground | Tough grazing/forage and stone; seasonal water, sparse timber, lower soil cover
Arid/badlands | Dunes, rocky plateaus, mesas, buttes, canyons and washes | Sparse thorny scrub, isolated vegetated water pockets, exposed layers | Ore/stone and defensible routes; heat, scarce water/wood, long supply trips
Warm coastal/woodland | Bays, shelves, estuaries, lowland streams and sheltered coast | Warm-climate broadleaf/palm-like forms, grass/savanna pockets, coastal reeds/mangrove-like transition where justified | Fish, waterways and coastal exchange; storms, wet ground, seasonality and landing access

## Additional QA requests

- QA-005 - Distribute interesting terrain across separate regions, with ordinary rolling/flat areas between them; see MAP_REDESIGN_BRIEF.md for spacing, coverage and clustering measurements.
- QA-006 - Remove generic raised rectangular building platforms. Ground walls, floors and entrances in actual terrain; reserve real foundations, retaining works or stilts for buildings whose construction needs them.
- QA-007 - Research real historic building references before revising markets, temples, universities and other classes. Provide recognizable functions, period/material structure and bounded individual variations rather than shared generic house forms. Keep can remain provisionally.
- QA-008 - Keep huts appropriate to early ages, add clearly available advanced housing to the build menu, and let selected homes upgrade through explicit paid resources and actual labor. Show requirements, progress, capacity, insulation and material changes.
- QA-009 - Basic material/weather/use building wear and finite paid material-hauling/repair labor are now implemented and qualified in the November3 maintenance batch. Continue post-grace multi-year upkeep balance, dedicated yards, bridges and disconnected-claim recovery; do not count those remaining functions as delivered.
- QA-010 - Give raiders measured intent/severity, from theft and captives through destructive or annihilating attacks; tune probabilities, risk/reward, force and withdrawal decisions with difficulty.
- QA-011 - A controlled river-edge objective oscillation is reproduced and repaired in the November3 loop batch; exact screenshot-save reconstruction remains unavailable. Raiders retain valid observed objectives through a real detour, without despawning, teleporting or ignoring intercepting defenders. Continue other stuck/blocked/retreat case coverage.
- QA-013 - Screenshot07:53: smooth river bends, continuous width, tributary joins and natural banks; remove staircase/sawtooth grid edges. Measure centreline curvature, width continuity and bank-edge deviation at close/middle/wide views. Keep visible water and actual wet/dry/pathing surfaces consistent; avoid a global detail increase that harms frame time. Pending until implemented and visually/physically checked.
- QA-017 - Shape the building itself to follow downhill terrain. Step walls, floors and entrances where the grade changes. Use terrain contact and accessible doorways across the footprint. Keep substantial foundations for structures that need them.
- QA-018 - Make dry riverbanks the strongest crop sites where soil and moisture support it. Use the same measured fertility for visible green ground and harvest forecasts. Keep wet plots unplantable and account for habitat, slope and drought.
- QA-019 - Generate varied stone and ore clusters with visible differences in size, shape, grade and amount. Require an actual deposit of sufficient scale for a quarry. A lone surface rock stays a gathering target.
- QA-020 - Accept blueprints and field markers over removable trees, brush and surface rocks. Display the clearing steps, dispatch workers to clear them, account for the removed material, and only then start construction or sowing. Preserve non-removable terrain and protected sites.
- QA-021 - Continue the finite raider fleet lifecycle and reproduce reported trader/raider disappearances using the original unit ID, cargo and route. Qualify physical boarding, travel, landing and home delivery with saves in transit.
- QA-022 - Reproduce residents oscillating beside crowded workstations. Inspect the selected residents' order, physical path, inventory and blocking geometry from a save at the affected moment. Qualify walking into and out of crowded entrances with the same workers and cargo.
- QA-023 - Expand farm tools and weapons through the ages with distinct uses and real material, fuel, labor and maintenance costs. Audit current prices against the output and time each item saves, then rebalance the expensive outliers.
- QA-024 - Inspect river-edge borders and overlays at bends, junctions and lakes. Separate territory lines from visible terrain seams, align both with the actual land/water boundary and preserve shore routes.
- QA-025 - Discard generated review screenshots and shut down temporary previews once fixes are verified. Keep reproducible source and test results.
- QA-029 - Preserve the existing finite clay survey, hauling, forming, drying and firing chain. Extend it with individual filled containers alongside bulk stock. Use portable water jars for supplies, lidded dry jars for grain and seed, and sealed amphorae for suitable trade liquids and preserved goods. Large pithoi belong at stationary stores. Historical references: [Mycenaean transport jar](https://www.metmuseum.org/art/collection/search/910531), [Roman amphora cargoes](https://www.metmuseum.org/zh/-/media/files/learn/for-educators/publications-for-educators/roman.pdf), and [Knossos storage pithoi](https://ashmolean.org/article/dining-with-the-minoans).
- QA-030 - Track container form, liters of usable volume, tare mass, contents, seal, condition and maker provenance. Each vessel has one owner and physical location. Filling transfers finite stock into the vessel once. Unloading transfers it back once. Show packed volume and loaded weight independently at storage, on a carrier, and in trade. Condition and spills affect contents, while food continues to age. Preserve existing water vessels and bulk-stock saves through explicit migration.
- QA-031 - Build mechanical milling on the existing grain-to-flour chain. Prototype a current-driven wheel using a connected river reach, then a millrace with a measured intake and downstream outfall. Estimate flow from upstream drainage and season, and hydraulic head from intake and outfall water levels. Limit the flow allocated to each branch and permit the same downstream water to drive a cascade at successive elevation drops. Expose seasonal throughput, staffing, grain input, flour output and wear. The second-century [Barbegal complex](https://www.nature.com/articles/s41598-020-74900-5) gives a model for aqueduct-fed mill cascades.
- QA-032 - Add windmills as a distinct later engineering practice. Use exposed terrain, wind direction and strength to set output, with no generation when calm. Keep hand grinding useful at small settlements. Use the [Historic England mills survey](https://historicengland.org.uk/images-books/publications/iha-mills/) for forms and sequencing.
- QA-036 - Test portable dugouts and passenger hulls separately. Dugouts are paddled, while built ferries and punts use oars. Sailing requires a later demonstrated rigging trial, with mast, sailcloth, cordage, a trained crew and a hull fit for the rig. Track wind heading and usable points of sail, calm-water oar fallback, real cargo delivery and worn parts. Keep the existing practical prototype and loaded-voyage proof. The Viking Ship Museum's [crew and sea-trial method](https://www.vikingeskibsmuseet.dk/en/professions/education/method/the-archaeological-experiment) and [oar and sail trials](https://www.vikingeskibsmuseet.dk/en/calendar/events/extracts-from-the-log-book-august-5th-2007) give a model for repeatable trials. Crew count is a source of power with diminishing speed gains, a relationship also found in [modern rowing models](https://www.sciencedirect.com/science/article/pii/S0021929014003765). Tune game curves separately by hull and keep weight and hull condition independently measurable.
- QA-037 - Extend existing hands-on crafting time and delivered-batch practice to distinct work families such as toolmaking, metalworking, hull building, farming and masonry. Count useful active seconds and meaningful delivered work separately. Save both per resident. Show natural aptitudes alongside earned practice, reward related experience at reduced rates, and qualify advanced methods through paid prototypes and demonstrations. Let a working expert teach an observer. Preserve current resident identities and recorded experience.
- QA-041 - Reproduce the reported 31-person post-raid refusal loop. The material cache can reject a real load indefinitely, blocking queued exploration and militia stand-down. Implement saved, finite outdoor overflow piles at reachable store frontage. Separate exposed from protected goods in inventory, track spoilage and physical retrieval, and preserve cargo through save, loss and consumption without duplication. Verify a loaded militia member can unload and return to work while storage is full.
- QA-042 - Building commands should show a specific blocker where the order is given or queue valid work until a worker can start. Verify unloaded candidates and viable routes at the chosen building. Keep explicit orders, occupied garrisons and prisoner escorts distinct from temporary militia.
- QA-043 - Add region-appropriate wild stock for domestic and draft animals, with species-specific temperament, feed, social needs, breeding and useful roles. Taming attempts use real time, feed and handling practice and can fail, with observable causes and retry conditions. Verify that failed attempts preserve the actual wild animal and account for feed and time.
- QA-047 - Replace wearable dugouts with persistent hulls built and launched at a finished fishing dock. Use explicit approach, board, paddle and dock orders, seated paddling animation, and a dock berth for routine embarkation and disembarkation. Keep the same hull, crew, cargo and paid materials across saves. For a saved portable canoe, allow a real conversion at a reachable dock and retain a safe legacy route until conversion, including for a resident already on the water. Verify AI hauling and raider return with the same rules.
- QA-048 - Make connected river reaches directly inspectable. Show local fish stock and recovery, visible clay reserves and usable dry-bank access from one contextual panel. Fish recover under local conditions. Clay is a finite sediment deposit and should only refill where a separately simulated deposition process supports it. Give adjacent reaches different capacities and keep undiscovered resources private.
- QA-049 - Generalize tight placement using each building's actual, rotated footprint and accessible entrances. Pay for stone upgrades and added floors through real labor and delivered materials. Preserve capacity and contents during renovation, tune weather wear and health by material, and set maximum floors from foundation, material and access. Stone walls gain height and durability with paid improvements.
- QA-050 - Generate culture-specific monument projects from the settlement's terrain, materials, and recorded achievements. Start with a river stair and flood marker for a community sustained by irrigation, a pass sanctuary and terraced assembly court for upland stone builders, a harbor beacon with a breakwater for long-distance traders, or an observatory and calendar court for farming communities. Let actual builders complete stages and require maintenance. Measure practical effects such as flood protection, safe berthing, shared storage or route access, along with influence and beauty. Use a seeded recipe per culture and map.
- QA-051 - Calibrate farming by cropped area, crop-specific seed and net yield, person-hours by operation, soil depth and texture, moisture and flood exposure, and edible output after processing and storage losses. A default 8.2 × 8.2 m field is 67.24 m², about 0.0166 modern acres. On the Winchester sample's 385 kg/ha net wheat benchmark that area yields about 2.6 kg before post-harvest losses. At 3,320 kcal/kg and an illustrative 2,300 kcal/day, one cropped acre provides about 225 person-days of wheat energy, with no allowance for spoilage, fallow or a varied diet. Walter of Henley gives a benchmark of 2.5 person-days per acre to reap and bind, separate from land preparation, sowing, weeding, threshing and hauling. Retain a declared simulation scale for game units rather than interpreting 260 abstract yield units as kilograms. References: [Winchester manorial yield study](https://www.bahs.org.uk/AGHR/VOLUMES/AGHR38.pdf), [Walter of Henley](https://medieval.ucdavis.edu/120D/Walter.html), [FAO grain energy conversion](https://www.fao.org/4/y9422e/y9422e04.htm), [NIST area conversion](https://pages.nist.gov/fipy/en/4.0/generated/fipy.tools.dimensions.physicalField.html).
- QA-057 - Give local defenders a bounded incentive to intercept a witnessed raider carrying actual village goods. Scale pursuit with the value of the stolen load, distance from home, safety, guard duties, and active player orders. Retain source ownership for stolen quantities. When the carrier dies, drop the actual goods at their position, including aboard or afloat where appropriate. A reachable carrier must pick up and deliver the load before it becomes village stock. Make ground piles inspectable and preserve cargo, claim ownership, decay and collection reservations across saves.
- QA-058 - Keep every paid crafting or processing job in an individual queue box with a labeled progress bar. Use hands-on seconds for crafting, dry-equivalent seconds for passive drying, and separate delivery or blocker states. Include paused jobs whose original workshop or worker is gone without duplicating paid inputs.
- QA-062 - Add larger threshing yards, mill houses and bakeries with visible staffed work positions. Measure input queue, paid batch size, labor, fuel, flour and edible throughput per minute. Use wheat and flour demand, storage and real hauling to size throughput. Preserve hand processing as the early option and unlock larger sites through delivered practice. Do not require milling or baking before clean grain can feed the village.
- QA-063 - Develop Egyptian river-valley, Nabataean-inspired desert, French-inspired temperate, Chinese-inspired, Pacific Islander-inspired, and Indigenous North American-inspired cultures. Tie construction, food, transport and civic projects to local terrain and demonstrated practice. Choose specific places, periods and communities for research before modeling the Pacific and Indigenous North American inspirations. Give each culture room to develop its own identity through the seed and the village's history.
- BOAT-SHARED - [ ] **BOAT-SHARED: remove permanently equipped canoe behavior.** Source currently has two contracts: completed legacy canoe work sets `u.haulage='canoe'` (`haulage.ts`), while `boats.ts` already has shared hull IDs, dock ownership, boarding and real disembarkation that clears boat/haulage state. Reconcile these into a physical hull left moored at a dock/valid landing and reusable by another crew. A person ashore must regain ordinary walking/work without a canoe attached. Any portage is a separate explicit task with hull weight and carriers. Migrate old equipped canoes once without duplicating paid hulls, refunding their materials, moving residents, dropping cargo or leaving an afloat resident stranded. Verify dock→board→sail→land→ordinary work→different crew→same hull, including save/reload and a missing dock.
- TRADE-NEEDS - [ ] **TRADE-NEEDS: requests based on real scarcity and productive use.** `rivalTrade.ts` already ranks deficits/surpluses for food, logs, stone, copper and iron, reserves home stocks, and physically dispatches finite barter; `coastalTrade.ts` has paid shared-hull voyages. This does not establish user-visible mineral/tool exchange in the current campaign. Audit why the player's village cannot obtain missing minerals/tools, then extend goods/quotes/reservations to real equipment, wear/quality and owned transport capacity. Offers must respond to observed demand, usable knowledge, competing local needs, delivery risk and remembered refusals. No remote stock creation or omniscient live quotes.
- TRADE-LABOR - [ ] **TRADE-LABOR: negotiate finite work arrangements.** Propose visiting craftspeople, temporary hired crews, reciprocal seasonal work and voluntary resettlement as different contracts. Specify which existing named people agree, their home/host, task, term, compensation, tools, meals, shelter, safety, travel and return/integration conditions. Conserve identities and exclude unavailable committed people. Do not sell a resource labeled “people,” spawn free workers, silently transfer a whole population, or equate a labor contract with existing captivity mechanics. Detailed mechanics remain planned.
- WORLD-ACTIVITY-LIVE - [ ] **WORLD-ACTIVITY-LIVE: audit the actual reported saved village.** The user reports no visible foreign explorers, traders or raids. Source contains `rivalActivity.ts` proposal/dispatch/contact/return journals, `rivalTrade.ts`, coastal voyages and raider executors; their presence and isolated tests do not prove activity in this save. Preserve its seed, difficulty, time, societies, knowledge and inventories. Per society/directed pair, trace proposals, exact refusal/blocker, admitted actors, provisions/hull ownership, departure, actual movement, encounter, exchange/damage and physical return. Explain whether the obstacle is a real economic/route constraint, failed scheduling, stalled navigation, obsolete save state or merely an unseen journey. Verify one representative actual journey of each feasible kind, then broader campaign cadence; do not manufacture visits, teleport boats/people or add arrival alarms. Player-facing information remains limited to witnessed events and returned reports.
- WORKLOAD-CONSEQUENCES - [ ] **WORKLOAD-CONSEQUENCES: real queues before artificial mistakes.** Existing `villageWorkload.ts` estimates person-seconds/available capacity and identifies blocked/paused work; actual bench limits, hauling, rest and commitments already constrain execution. Qualify that overload causes visible waiting, longer completion times, reduced buffer and real fatigue/rest consequences while food/water/warmth priorities and direct commands remain reliable. No threshold that randomly stops all work, second universal slowdown, dropped inventories or arbitrary task failure. Default to deterministic priority handling. If a small overload-related priority imperfection is later desired, bound it to lower-priority ties, disclose its maximum delay and keep urgent survival and explicit player orders exempt; it is not a substitute for fixing dispatch bugs.

## Request audit including late additions

-  Stop waving grass on this computer
-  Computer-appropriate performance
-  Cut trees without lumber mill
-  Maximum two woodcutters per tree
-  Far lumber camp unused
-  Priorities for wood, stone, hunting
-  Harvesting in another village provokes anger
-  Soft territory tint rather than defined borders
-  Actual carried food/materials
-  Month within winter
-  Farms use too many logs
-  No mystery drops
-  Bigger age bonuses/challenges
-  Completed hut and no precipitation at start
-  Seasons and survivability, occasional winter snow, calm score that changes with seasons
-  Population born, migrates, or comes from captured survivors; no buying/training new people
-  Reserves permit village growth; stop rapid winter elder deaths
-  Night sleeping and shelter in storms
-  Shelter degradation, repairs, fuel and meaningful weather consequences
-  Named villagers, personality, life updates, personal connection
-  Warm/light clothing
-  Hunting remembered and useful, no dedicated early hunter unit
-  Domesticated animals matter
-  Prehistoric nomadic hunting age; follow herds where advantageous
-  Biome determines viable shelters/resources/lifeways, plains alternatives to timber houses
-  Forest biome, forests spread, occasional fires
-  Resources vary in type and quality, scarcity drives exchange/conflict
-  Better tools; stone-age weapons
-  Plagues, realistic causes, fun rather than frequent arbitrary death
-  Subsistence labor, productivity breakthroughs
-  True exploration: don't know food before finding it; explored fog thinner
-  Persistent explore without button mashing; focus village
-  Scouts carry food based on journey
-  Find people, living/new villages, old ruins
-  Return cultural artifacts/hidden knowledge and study at home
-  Organic technologies depend on material experimentation and community capacity
-  Robust tech tree, natural age advancement, more later Civ elements
-  Era challenges especially exploration
-  Learn trade wants by sending a trader, not omniscient live quotes
-  Rivals may disclose reserves, boast or conceal, never constant exact stock UI
-  Thoughtful deals based on needs/goals/personality, Civ-like negotiation screen
-  Dirt paths develop with repeated trade routes
-  Navigable rivers, boats
-  Larger world, more distant peoples, randomized names/colors/abilities
-  Other villages intelligent, different, able to grow/succeed/fail
-  New villages rise and collapse, survivors scatter/re-settle
-  Movable townhall and multiple townhalls/settlements
-  Pillage, burn, eliminate village, sneaky/night/sea raids
-  Townspeople defend; raids obey orders; can leave war
-  Raider camps steal/attack trade
-  Units don't all crowd one resource, security when afraid
-  AoE responsive combat: counters, armor, ranges, projectiles, spacing, building attacks
-  Later commanders/formations/professional army
-  Civ empire scale, later diplomacy/secession
-  Civil administrators automate as settlement scales
-  More useful buildings, Dawn of Man breadth

## Explicit master-plan gaps

- RESOURCE-VOLUME Remove seeds from the compact main HUD; retain measurable planting reserve in farm/storage detail. Replace equal-count storage with explicit per-item volume/weight (seed portions, sheaves, chaff, tools and weapons differ). Do not erase existing inventories or equate displayed seeds with edible grain.
- CEREAL-BYPRODUCTS Chaff/straw need bounded handling and useful historically grounded outlets (fodder where suitable, bedding, compost, fuel/building mix); do not let unwanted byproducts immobilize food workers. Distinguish useful stores, exposed piles and disposal; no unlimited protected storage.
- RIVAL-CITY-PLANNING Some growing villages develop organized streets, civic cores, markets and production districts. Others remain organically irregular. Seed/culture/site-driven planning, terrain access and clearing labor must remain physical.
- VILLAGE-REQUESTS Neighboring villages offer need-based quests/requests with actual goods, relationships and consequences, not repeatable free rewards.
- WOODLAND-RESIDENTS Scattered independent woodland inhabitants with homes, inventories and contextual conversations.
- RUIN-EXPLORATION Distinct visibly ruined ancient sites with explorable artifacts and occasional recoverable ancient knowledge. Generate coherent culture/site histories; discoveries must not silently grant unrelated technology.
- MECHANICAL-MILLING 
- CONTAINER-IDENTITY 
- FARM-LABOR-CALIBRATION 
- SIX-CULTURE-INSPIRATIONS 
- FIRST-PERSON-LATER 
- SEASONAL-REPORT-UX 
- GOLD-SILVER-EXCHANGE 

## Frozen98 release gates — recorded evidence snapshot

Gate | Acceptance | Recorded status | Credit | Remaining notes
--- | --- | --- | --- | ---
M0-01 | Gather/job-assignment physical actor eligibility gives one rejection reason and bounded actor assessments | verified | 1 | Physical eligibility only; eventual order success/latency remains M0-10/12.
M0-02 | Direct gather/drill interruption preserves already-paid transport progress and material charges | verified | 1 | Direct gather/drill paid interruption and saved progress explicitly verified.
M0-03 | Atomic reservation contract rejects partial claims and competing migrated actor ownership | verified | 1 | Atomic contract plus migrated actor ownership checked; all-executor goods migration remains pending.
M0-04 | Migrated tree workers share physical workplace slots and reconstruct ownership after save/load | verified | 1 | Tree-slot reconciliation, physical work/delivery and save ownership checked.
M0-05 | Paid transport projects survive maker reassignment/death and resume on a replacement without repayment | verified | 1 | Replacement/original maker, death/workplace loss, cart input and legacy duration checks recorded.
M0-06 | Construction interruption and paid-work resumption use a single actor/project owner | verified | 1 | Actual paid native-terrain construction, interruption/death, strict save/load and replacement completion preserve one actor/project owner without repayment. Queued future tasks remain distinct from instantaneous execution; all-executor goods migration stays M0-07.
M0-07 | Gathering, construction, hauling and all crafting executors use coordinated atomic goods/capacity reservations | pending | 0 | Tree/paid-haulage migrations are partial; other direct-mutation executors remain.
M0-08 | Transport journeys, husbandry, expeditions and captivity migrate through the shared ownership contract | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M0-09 | Versioned simulation RNG and timestamped commands reproduce new-game outcomes across replay/save | pending | 0 | Seeded world generation is not serialized simulation RNG or full deterministic replay.
M0-10 | Command execution latency, blocked time, stealing and reservation failures are measured beyond eligibility | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M0-11 | Priority and recall changes conserve full-handed cargo, escrow and paid construction across interruption | verified | 1 | Recorded full gate scenario on published c66304c; controlled initial endowment/quiet conditions do not imply completion of other campaign, RNG, ownership-migration or balance gates.
M0-12 | Full M0 integrated scenario passes direct override/recall/construction/paid-work resumption without repair | verified | 1 | Recorded full gate scenario on published c66304c; controlled initial endowment/quiet conditions do not imply completion of other campaign, RNG, ownership-migration or balance gates.
M1-01 | Default player and rivals start as unbuilt camps with finite possessions and no automatic pen | verified | 1 | v10 finite unbuilt camp opening is verified; inhabited prehistory remains M2-14.
M1-02 | Goods physically reach a reachable camp before credit; recall/save never duplicates cargo | verified | 1 | Camp approach, real walking/credit and save/recall conservation recorded.
M1-03 | Losing a hall preserves a living society and its usable supply anchor | verified | 1 | Living people retain society and camp supply after hall loss; full collapse/refounding still M2-12.
M1-04 | Emergency occupants reach real entrances, respect capacity and become exposed when shelter is destroyed | verified | 1 | 20 actual Game.step frames, real shelter destruction and target reacquisition passed.
M1-05 | All six difficulty profiles centrally control abundance/climate/provisions/pressure with explicit advantages | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M1-06 | Water collection traverses a discovered physical bank and returns finite cargo through interruption/save | verified | 1 | Discovered bank collection, physical return and reassignment/recall/save conservation recorded.
M1-07 | Cold consumes real stored fuel and shelter/fire benefits affect measured gradual exposure | verified | 1 | Actual wood use and measured shelter/cold effects checked; no clothing completion implied.
M1-08 | Desktop needs panel/ledger show actual reserves, physical-action availability and one disabled reason | verified | 1 | Real desktop development/built-output controls opened and used with zero page errors.
M1-09 | Rest, shelter, clothing, tool wear and repair form a viable survival production loop | verified | 1 | Whole-gate connected scenario passed on combined candidate; exact provenance/controlled fixture limits recorded. Does not credit full campaign balance or unrelated performance/visual gates.
M1-10 | Tracking, hunting, carcass handling and wildlife hazards provide meaningful finite food | verified | 1 | Connected finite native camp hunts/cooks28 food (36.8% concurrent consumption), pays for hide cleaning/drying and conserves raw cargo across pause/save. Brief actual FOW tracking is complemented by actual injury and geometry/expiry checks. No finite ammunition or full campaign claim.
M1-11 | Fishing uses actual reachable freshwater/coastal banks with physically returned catches | verified | 1 | Recorded full gate scenario on published c66304c; controlled initial endowment/quiet conditions do not imply completion of other campaign, RNG, ownership-migration or balance gates.
M1-12 | Early animals require real capture, food and care rather than automatic initial gifts | verified | 1 | Natural current V14 actual paid pen, native wild goat ID captured/returned, real care and finite grazing. Controlled winter plant-food delivery/conservation checks pass. No initial livestock gifts; broader species and full winter campaign remain separate.
M1-13 | Seed-funded expandable farms follow contours and support soil/fallow/preservation/milling decisions | verified | 1 | Whole-gate connected scenario passed on combined candidate; exact provenance/controlled fixture limits recorded. Does not credit full campaign balance or unrelated performance/visual gates.
M1-14 | Food attention, local depletion/regrowth and warned hazards produce choices without broken labor | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M1-15 | Every map has mandatory hills/valleys/rivers/lakes; substantial landmasses have coherent drainage and reachable uplands | verified | 1 | PublishedV18 enforces measured mandatory hills/valley/river/lake and other family geometry; native routes/drainage and distributed physical districts pass fixed/holdout checks. Per the user clarification, required families occur once per map; genuinely flat ordinary islands are not forced to gain an arbitrary4m hill. Real upland approaches are checked where relief exists, including four actual founder ascent/quarry journeys. Original20-map relative-area screen remains19/20; separate flatter-world review passes12 actual family gates and useful travel. Organic channel/bank presentation remainsM1-16/M5-04, not credited here.
M1-16 | Every map contains all required landscape families with organic forms and varied prominence | pending | 0 | Organic v11 forms/material/water fixes are under desktop review; prior ellipse/teeth/striped fall gallery was rejected.
M1-17 | Scenic scores expose geographic components and choose an above-average viable start when feasible | verified | 1 | Numeric geographic score components and above-average candidate selection verified. User rejects broader art; M1-16/M5-04 remain pending.
M1-18 | New terrain supports dry roots/foundations, freshwater access and prospectable mountain approaches | verified | 1 | PublishedC4b: dry nine-point tree roots, safe nondepressed native founders/foundations, actual freshwater and useful civilization networks; four paid native mountain-quarry construction/mining/carry/reload/home-credit journeys across four relief characters. CurrentNormalV18 winter passes physical water, fuel, shelter, defense and strict continuation. Version1–17 whole-world fingerprints preserved. This is not an FPS or full biome-transition/gallery claim.
M1-19 | Water/cold neglect produces visible warnings and grace before gradual harm; legacy needs rules persist | verified | 1 | Needs warnings/grace/neglect and legacy opt-in compatibility checked, not all survival pressures.
M1-20 | Current Normal default-conflict unbuilt-camp scenario survives first winter with water/fuel/food/defense and no repair | verified | 1 | Current combined-index scenario passes with five founders surviving, actual automatic water deliveries, real fuel, food reserves, defense and strict save; no grants/terrain edits/repairs. Wider campaign and holdout balance remain open.
M1-21 | Every map contains at least eight substantial ecological regions with measured coverage, coherent moisture/soil/climate transitions and matching resources | pending | 0 | Eight substantial connected biomes are implemented and area-qualified across current V14 cases. Full current transition-gradient and per-region resource-distribution acceptance remains unverified.
M1-22 | Biome presentation uses distinct grass/forest forms, wetland reeds, desert scrub and alpine vegetation with dry placement and bounded detail tiers | pending | 0 | Distinct biome vegetation families/ground structure are not completed by recoloring the same trees or grass.
M2-01 | Societies compare feasible bounded local-AI alternatives using explicit needs/costs/risks and reasons | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-02 | Committed strategic plans reserve resources and use hysteresis/interruption rules | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-03 | Rivals develop from finite camps, scout and specialize without recurring resource gifts | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-04 | Two rivals independently complete profitable physical trade through shared rules | verified | 1 | Two ordinary NPC reviews independently fund actual hulls and complete useful physical round trips with strict in-transit/incoming saves and exact inventory/water accounting. Positive operating useful-need value after food under existing local scarcity factors; capital separately disclosed, not recovered. Controlled shores/endowments and two paid construction orders; not natural frequency, fleet combat or whole-campaign qualification.
M2-05 | Two rivals compete/fight, negotiate a treaty and recover through the same society systems | pending | 0 | General directed multi-society war/treaty/recovery acceptance remains open.
M2-06 | Directed society-pair ledger stores incidents/trust/grievances/agreements/dependencies/claims | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-07 | Information travels through observation/envoys/routes; unknown actions do not generate remote knowledge | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-08 | Claims have defended cores/fading influence and witnessed extraction/settlement incidents | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-09 | Warnings/compensation/transit denial/embargo/eviction precede proportionate escalation when appropriate | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-10 | Wealth creates learned opportunities/risks while safer geography and defense can deter or redirect attacks | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-11 | Arrivals, refugees, departures, aging, families and leadership preserve community identity | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-12 | Shortages and failed obligations cause warned gradual collapse, abandonment and possible refounding | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-13 | Leadership succession retains agreements, grievances and community histories | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-14 | Inhabited-world start runs bounded recorded prehistory and discloses asymmetry | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-15 | Rival growth/investment/plan completion/recovery outcomes are measured on fixed and holdout worlds | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M2-16 | Full M2 chapter links surplus, wider access, exposed routes and independent society decisions | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-01 | Boat/port deliveries carry actual people/cargo through boarding, travel, unloading and save/load | verified | 1 | Current combined-index paid dock/hull, same-body cargo boarding/sailing/foreign exchange/home unload, at-sea and incoming-uncredited save/restore, strict ownership and exactly-once inventory conservation qualified. Controlled declared shore fixtures; natural profitable independent trade remains M2-04.
M3-02 | Caravan/depot/pack-animal routes scale capacity with actual equipment and escort obligations | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-03 | Markets consolidate known offers/contracts/cargo/storage with measurable handling/search benefit | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-04 | Shipment interruption and interception conserve cargo/equipment and measure profitability/reliability/loss | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-05 | Roads/bridges/canals/trenches require real work and bounded terrain/navigation updates | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-06 | Husbandry breeding/feed/products and pack transport connect to real expedition/trade needs | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-07 | Contested access and extraction support physical transit agreements, escorts or route abandonment | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-08 | Raids prepare/approach/contact/loot/withdraw; defense can deter them without automatic larger spawns | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-09 | Finite looting can succeed without compulsory burning and counts only physically returned goods | pending | 0 | Natural non-destructive loot integration unpublished; ordinary destruction-linked loot is not this gate.
M3-10 | Contextual capture/surrender preserves existing people and requires physical escort, custody and needs | verified | 1 | Live approach, surrender, guard capacity, finite food/water provisioning, escort/custody and strict-save scenarios passed. Broader ransom/integration/revolt remains in M3-16.
M3-11 | Intact local occupation requires present control/garrison and preserves building/person/project identities | verified | 1 | Earlier production-owner regression repaired by atomic scoped handover. Final merged-source actual occupation and native paid-method/boat/water/save continuation passed; local parcels remain at real sites or with carriers, unrelated society stocks stay separate.
M3-12 | Domination/vassalage uses local leverage and real continuing obligations rather than remote instant transfers | pending | 0 | Remote strength-ratio treaty acceptance is not actual local sustained domination.
M3-13 | Withdrawal/release returns surviving actors and possessions and updates local control/custody | pending | 0 | Natural withdrawal/custody/control integration unpublished; zero credit.
M3-14 | Negotiated aftermath preserves incidents, compensation, agreements and witnessed conflict knowledge | pending | 0 | Player-centric peace foundations do not establish full shared-rule aftermath.
M3-15 | Raids report actual casualties/loot/retreat and residents resume appropriate civilian work | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-16 | Captivity includes guard cost, injury/resistance/escape, ransom/exchange, integration and organized revolt | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-17 | Militia/formations/basic siege and staffed maintained walls protect actual approaches with era-correct gear | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M3-18 | Full M3 delivery/interception/defense/loot-withdrawal/negotiated-aftermath scenario passes with saves | pending | 0 | Current Natural-conflict integrated operation remains unpublished and unaccepted.
M4-01 | Need-driven discoveries show observation/sample, performed experiment, demonstrated production and adoption | verified | 1 | Delivered crop samples, performed trials, actual sowing; copper prototype/tools; sled delivery practice and material-paid cart production are measured in live scenarios. Teaching is separately pending in M4-03.
M4-02 | Residents/players prioritize meaningful practical experiments with evidence and readable blocked reasons | verified | 1 | Player practical priorities validate actual people, materials, reachable workplaces and reserve blockers; real desktop Knowledge panel reviewed. No passive science queue.
M4-03 | Teaching/successors/artifacts/records spread demonstrated techniques through learning/trade/migration | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-04 | Bronze/Iron/Classical advancement keeps 50/75/100 population plus practices/institutions/sustainable unspent reserves | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-05 | Small specialized societies remain competitive through trade and techniques without matching every population threshold | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-06 | Households request support and respond to needs/unequal burdens/allegiance without arbitrary order refusal | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-07 | Political complexity grows with population/diversity/distance/power and has warned negotiation/unrest stages | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-08 | Leaders propose projects/agreements/commitments with legitimacy and continuity consequences | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-09 | Council/ritual/learning/administrative institutions perform actual coordination/participation/training/delegation | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-10 | Practical metallurgy/material production covers garments/pottery/charcoal/copper/tin/bronze/iron with wear/workplaces | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-11 | Four construction families have distinct homes/stores/workshops/civic/defense silhouettes and learned diffusion | pending | 0 | Palette/roof variants do not complete four functional architectural families.
M4-12 | Player sandstone/plaster/courtyard/waterworks city develops maintained prosperity before selective ornament | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-13 | Dense neighborhoods/work yards/cargo/construction and era-appropriate residents visibly reflect real activity | pending | 0 | New appearance reference studies are requirements; no source implementation/acceptance credit.
M4-14 | Compact desktop controls expose all buildable structures and knowledge-accurate political/resource/logistics minimap layers | pending | 0 | Desktop-only acceptance; no mobile denominator or mobile work is counted.
M4-15 | Instrumental activity/culture/era music and spatial rate-limited work/combat sounds remain readable | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-16 | Prosperity victory completes in a dedicated connected scenario and offers continuation | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-17 | Commerce victory completes in a dedicated connected scenario and offers continuation | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-18 | Dominion victory completes in a dedicated connected scenario without compulsory extinction/destruction | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-19 | Knowledge victory completes through demonstrated techniques and a dedicated connected scenario | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M4-20 | Legacy victory completes with bounded nonrepeatable era achievements, identity/history and continuation | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M5-01 | Complete current Stone-through-Classical campaign passes all required release scenarios without command repair | pending | 0 | All required current release scenarios must pass together; currently incomplete.
M5-02 | Published baseline migration checks preserve historical terrain hashes and camp/needs/paid-project saves | verified | 1 | Recorded historical generation hashes/roundtrips plus old-needs behavior and transferable project compatibility. New v11 qualification remains M5-01/03/09.
M5-03 | Latest release candidate passes typecheck/build and clean development/production desktop interactions | verified | 1 | Current integrated source typecheck and production build pass; actual development Auto work and compact/expanded pause controls, actual production gallery/tooltips/save worker and final reload are clean. This gate does not imply campaign or frame-rate acceptance.
M5-04 | New map gallery passes close/middle/wide same-landscape, overcast, water/fall/cliff/dune/route/contour-farm review | pending | 0 | Root owns the next actual desktop gallery; raw GL cleanliness alone is not visual acceptance.
M5-05 | Actual physical geometry agrees with depicted surfaces, farms, water, dry placement and navigation | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M5-06 | M1 MacBook Air 8GB desktop target meets median <=33ms and p95 <=50ms at 100 visible residents/60 buildings | pending | 0 | Target hardware figures are proposed targets, not achieved measurements.
M5-07 | Separate 240-300-total-resident stress profile reports CPU/navigation/render/memory and full-pipeline costs | verified | 1 | Actual final-source M1/8GiB foreground browser profile with245→273 people reports full-frame gaps, CPU stages including navigation, whole-render counts, JS memory and background-save CPU/latency. LegacyV7 world, short growing cohort, no GPU timing or fast-forward target claim.
M5-08 | Major mechanics expose named parameters/units/reasons/outcomes and meaningful-decision/chapter metrics | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M5-09 | Fixed regression and rotating holdout scenarios improve intended outcomes without conservation/save regressions | pending | 0 | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit.
M5-10 | Packaged published first release preserves saves/preview/later-era content and records exact evidence/remaining expansion scope | pending | 0 | A maintained preview/batch push is not the completed first release.
