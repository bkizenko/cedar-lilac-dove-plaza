# Hearthwild: incentive-first development plan

## 1. Product decisions and diagnosis

Build an original **real-time survival-to-civilization game** in which a settlement becomes a city-state through useful work, difficult choices and interactions with other societies.

The first complete release covers **Stone, Bronze, Iron and Classical development**. Medieval, Renaissance, larger regional campaigns, global civilization and eventual space settlement remain explicit expansion scope. Existing later-era saves remain playable; this release boundary does not delete their content.

A normal-speed session should deliver a meaningful **30–60-minute chapter**: surviving winter, establishing a trade route, returning from an expedition, resolving a territorial dispute or winning a costly conflict. Advancing an age is a larger achievement, not a requirement for every session.

**What the conversation consistently asks for**

| Underlying goal | Design consequence |
|---|---|
| Reliable agency | Commands work without repeated clicking; blocked actions explain why |
| Difficult but rewarding survival | Scarcity creates choices, rather than unavoidable starvation or broken labor |
| Visible development | Better tools, transport and institutions visibly change what a society can do |
| An independent world | Rivals trade, fight, grow and decline without waiting for the player |
| Meaningful geography | Terrain and resources shape settlement, routes, conflict and culture |
| Attachment and identity | Families, leaders, buildings and histories distinguish societies |
| Beauty with readability | Coherent landscapes and recognizable buildings before decorative complexity |
| Faster delivery | Small integrated batches, clear ownership and fewer cross-system regressions |

Several apparent contradictions in earlier requests resolve cleanly:

- “More food” and “harder survival” mean **viable subsistence with consequential decisions**, not abundant automatic income.
- “More automation” and “less spectator sport” mean **automate repeated execution while retaining strategic choices**.
- “More realistic” and “shorter nights/faster work” mean **credible causes with compressed presentation and timescales**.
- “Creative agents” and “metrics everywhere” mean **freedom to propose mechanics, coupled with measurable results and compatible interfaces**.

**Verified architectural problems**

The repository has 80 game files, but its main simulation coordinator remains approximately 6,000 lines. Feature modules still compete over shared worker state. Task protection is partly a flag registry and partly duplicated eligibility checks.

Rival updates invoke eleven development routines before additional threshold, random and faction-specific rules. Raids currently target the player; diplomacy is substantially player–rival. This is not yet a general society strategy system.

New-game code still creates starting buildings. Society survival also remains tied too closely to town-hall existence. Current building variation primarily changes palettes and roof proportions; geography creates major features globally rather than coherent relief and drainage for every substantial landmass.

Existing boats, caravans, goat husbandry, terrain, saves and other systems contain reusable foundations. Their presence and focused tests do **not** establish complete gameplay acceptance.

**Decision:** retain the engine and working executors. Fix coordination and complete connected gameplay before expanding the catalogue again.

## 2. The incentive system

### One connected development loop

**Subsistence → surplus → growth → specialization → wider resource access → exposed routes and contested claims → diplomacy/defense → institutions → city-state achievements.**

Success creates new choices:

- More food supports newcomers, but increases demand for housing, materials and protection.
- Better tools release workers for exploration, construction and military service.
- Distant timber or ore makes transport, outposts, access agreements and escorts valuable.
- Wealth attracts opportunities and opportunists through information that actually travels.
- Walls protect assets but consume labor and can obstruct movement.
- Larger settlements create distribution and coordination problems that institutions can address.

No permanent rule should make theft, trade, farming or conquest universally optimal.

### Four scales of motivation

| Scale | Motivations | Authority |
|---|---|---|
| Individual | Food, safety, recovery, competence, belonging | Executes work and responds to immediate physical conditions |
| Household | Dependents, shelter, fair access, continuity | Requests support, chooses settlement allegiance and develops political interests |
| Leader/institution | Legitimacy, continuity, influence, personal ambitions | Proposes public projects, agreements and military commitments |
| Society | Survival, security, prosperity, access and legacy | Chooses sustained strategic plans using available knowledge |

Player orders remain dependable. Politics affects loyalty, obligations, migration, negotiation and organized resistance. It does not cause arbitrary command refusal.

A five-person camp has personal needs and relationships, not bureaucracy. Political complexity grows with **household diversity, unequal burdens, population, distance and concentrated power**. Difficulty modifies pressure and tolerance. Large-scale unrest must have visible causes and warning stages.

### Strategic decision model

Societies compare a bounded set of feasible alternatives:

> Expected need relief + strategic opportunity + legitimacy/legacy benefit − labor/material cost − travel/loss risk − diplomatic/social consequences.

Separate physical feasibility and immediate emergencies from preference weights. A society under attack can defend or evacuate without satisfying an ideal food-buffer threshold.

For a grain shortage, alternatives include harvesting, substitution, purchase, migration, tribute demands or theft. For an exposed route, alternatives include escorts, another route, a bridge, negotiated transit or abandoning the venture.

Plans reserve real resources and remain committed until completed, invalidated or interrupted by a sufficiently important event. Reconsideration uses hysteresis so societies do not switch projects constantly.

Use local programmed AI, not runtime language-model calls. Provide Test Lab explanations such as:

> “Copper surplus; grain shortage; protected river exchange is cheaper than expanding into contested farmland.”

### Relationships, conflict and collapse

Replace player-centric relationship fields with a **directed society-pair ledger** containing observed incidents, trust, grievances, agreements, dependencies and claims.

- Unknown actions do not instantly generate diplomatic knowledge.
- Control has a defended core and fading outer influence.
- Resource extraction, settlement, fortification, theft and attacks create witnessed incidents.
- Responses include warnings, compensation, access denial, embargoes, eviction, raids and war.
- Personality affects sensitivity and risk tolerance; resources and routes constrain action.
- Rival–rival trade, warfare, treaties and recovery use the same systems as player interactions.

**Updated user direction:** Distinguish loot, prisoner capture, conquest and domination through natural contextual actions and evolving circumstances, **not a mandatory pre-departure objective picker**. Taking goods and withdrawing produces a raid; deliberate capture/surrender creates prisoners needing escort; maintaining local control and accepting a village's surrender produces intact occupation; sustained leverage enables tribute, autonomy or vassalage. Surface these actions when physically and politically relevant, show consequences before committing them, and let orders change in the field. Optional standing policies may guide automation without locking the expedition into an upfront category. Occupation must never silently turn into burning the settlement.

- Loot: seize finite actual goods, physically withdraw and return them.
- Take prisoners: capture actual people, preserve bodily needs and identity, escort them into guarded custody, then support ransom/exchange/release/integration or forced-work consequences. Capturing a person is not the same outcome as carrying loot.
- Occupy village: secure surrender or defended control, retain surviving structures, stores and residents, transfer/control them through explicit ownership and obligations, and handle resistance, garrison costs, integration or autonomy. Burning a hall does not constitute taking over a functioning village.
- Record intent inferred from actual orders and any explicit policy, changes of orders, buildings retained/destroyed, captives captured/escaped/delivered, goods returned, occupation stability and civilian consequences. Test each objective independently, including interrupted journeys and save/load.

Raids have preparation, approach, contact, fighting/looting and withdrawal phases. Loot must return physically. Strengthening defenses can redirect or deter a raid; it must not merely trigger a larger spawned army.

Collapse is a process: shortages, failed obligations, departures, loss of authority, abandonment, refugees and possible refounding. Losing a hall does not erase a society. Leaders change while agreements, grievances and community histories persist.

Captives retain normal bodily needs. Forced work can demand longer hours but brings injury, resistance, guard costs and escape risk. Include capture, escort, custody, work, ransom/exchange, release, integration and organized revolt.

### Functional institutions

| Institution | Actual purpose |
|---|---|
| Market | Consolidates offers, contracts, cargo and storage; reduces search/handling costs |
| Council/meeting hall | Coordinates public work and negotiates obligations |
| Ritual site/temple | Supports gatherings, shared identity and commitments through participation |
| Learning workshop/archive | Holds evidence, trains successors and spreads demonstrated techniques |
| Administration | Delegates bounded responsibilities and reports outcomes |
| Walls/gates/watchposts | Protect particular approaches and assets when staffed and maintained |

These are playable abstractions, not claims that all historical societies followed one path. Research on collective governance supports allowing alternatives to centralized rule. [Ostrom’s institutional research](https://dlc.dlib.indiana.edu/dlc/items/8d0e56e2-6c3e-4075-a1d9-431c85702402/full)

## 3. Progression, world and presentation

### Campaign rules

- Default new game: player and rivals begin as small **unbuilt camps**, with finite starting possessions and no automatic husbandry pen.
- Offer an **inhabited-world** start using a bounded, recorded prehistory simulation. Existing settlements must have actual development histories; disclose scenario asymmetry.
- Preserve current population thresholds initially: **50 for Bronze, 75 for Iron, 100 for Classical**.
- Advancement also requires demonstrated practices, functioning institutions and sustainable reserves. Reserves remain in storage; advancement does not consume them.
- Practical discovery follows observation/sample → experiment → production → adoption. Automatic cultivation can handle routine trials after discovery; the player can prioritize them.
- Allow smaller societies to specialize, trade for techniques and remain competitive without matching every large society’s population.
- Maintain five victory families: **Prosperity, Commerce, Dominion, Knowledge and Legacy**.
- Era/total scores record bounded achievements. They do not replace physical goods or reward repetitive cheap actions.
- Victory offers continuation. Rival extinction alone does not end the world.

Difficulty profiles remain Super Easy, Easy, Normal, Hard, Survival and Apocalypse. Central profiles control resource abundance, climate severity, spoilage, starting provisions, rival decision capability, conflict tolerance and political pressure. Any resource or combat advantages must be explicit. Difficulty must not weaken command reliability.

### Geography and ecology

Generate in this order:

**Landmass topology → regional relief → drainage/spill paths → moisture/soil → vegetation/resources → routes and settlement viability.**

Use generation-time approximations, not expensive continuous erosion simulation.

**Updated user requirement, October 31:** Every generated map must contain the full requested geological catalogue: rivers and tributaries, lakes, connected mountain ranges, foothills and rolling hills, valleys and basins, incised canyons/gorges, cliffs and terraces, plateaus, waterfall/river-barrier terrain, pillar formations, dry channels and dune/rocky-desert regions, plus readable shorelines/bays where the topology supports them. Distribute these coherently across the world rather than repeating the catalogue on every tiny island. Vary their location, prominence, scale and beauty; rarity may govern exceptional grandeur, not the absence of an expressly required feature family. Keep playable plains and usable approaches among strong relief. The earlier optional-feature interpretation is superseded.

Substantial landmasses receive coherent relief and drainage. World generation must pass both measured feature coverage and rendered exploration acceptance; metadata labels or a high fraction of gentle slopes are insufficient. The user reports that the older single-island terrain was more interesting: compare against that baseline instead of assuming multiple landmasses are an improvement. Preserve a single-island option if needed; layout variety must not dilute terrain variety.

- Dolomites: connected ridges, pale cliffs, foothills and usable valley routes.
- Zhangjiajie: regional pillar formations within wooded ravines.
- Victoria Falls: a river barrier that creates portage and crossing decisions.
- Arizona: layered cliffs, terraces and branching drainage.
- Sahara: rocky plateaus, dry channels and dunes—not uniform sand.

These references support connected landscape families rather than scattered decorative shapes. [Dolomites](https://whc.unesco.org/en/list/1237/), [Wulingyuan](https://whc.unesco.org/en/list/640/), [Victoria Falls](https://whc.unesco.org/en/list/509/), [Grand Canyon geology](https://www.nps.gov/grca/learn/nature/geologicformations.htm), [Tassili n’Ajjer](https://whc.unesco.org/en/list/179)

Trees, terrestrial buildings and approaches must pass dry-ground checks. Farms follow terrain. Mountains provide walkable approaches, prospecting evidence and deposits whose depth/quality affect excavation. Canals and trenches require physical digging and update terrain/navigation through bounded patches.

### Visual direction

| Reference | Incorporation |
|---|---|
| [Dawn of Man fortifications](https://www.madrugaworks.com/dawnofman/images/fortifications.png) | Useful outdoor compounds, work yards and believable survival activity |
| [AoE III waterfront](https://www.windowscentral.com/age-empires-iii-definitive-edition-beginner-strategy) | Readable ports, ships, streets, people and cargo |
| [AoE IV settlement](https://forums.ageofempires.com/t/my-best-looking-screenshots-of-aoe4/181538) | Distinct functional silhouettes and rural/civic contrast |
| [Civ VII city composition](https://www.forbes.com/sites/barrycollins/2025/02/28/civilization-vii-updates-to-bring-big-changes-in-march/) | Connected dense neighborhoods, varied heights and selective landmarks |
| [Polytopia](https://polytopia.io/) and [Crossy Road](https://www.crossyroad.com/) | Readable block volumes and restrained palettes, with greater material and activity detail |

No HOI4 art influence. The minimap uses accurate terrain and knowledge, with political, resource and logistics layers.

Architecture follows:

**Function × material × learned building practice × era × prosperity × stable building variation.**

First-release construction families:

1. Earthen courtyards.
2. Timber halls and work yards.
3. Stone terraces.
4. Reed/coastal structures.

Each needs recognizable homes, stores, workshops, civic buildings and defenses. Trade and migration introduce techniques and motifs gradually. Real-world references inform architecture without assigning deterministic personalities to ethnic groups.

The player’s preferred Nabataean-inspired city develops sandstone, plaster, courtyards, waterworks and selective blended ornament. Prosperity first improves maintenance and construction, then adds galleries, carving and exceptional monuments. [Petra reference](https://whc.unesco.org/en/list/326/)

Borrow layered landscape composition from [Bierstadt](https://collectionapi.metmuseum.org/api/collection/v1/iiif/10154/34358/main-image) and [Cole](https://collectionapi.metmuseum.org/api/collection/v1/iiif/10497/1655152/main-image): framing vegetation, illuminated valleys, winding waterways and atmospheric distance. Warm daylight contrasts with cool shadows; winter, storms and night retain their identity.

### Advanced material and scene treatment — updated user references

The four new Civ reference images emphasize varied terrain materials, textured rock and soil, shallow turquoise water grading into deep blue, readable banks and foam, dense layered vegetation, coherent biome transitions, integrated settlement density and strong light/shadow at desktop camera distances. Build original game materials/geometry from these principles, not copied screenshot textures. Flat vertex-color changes alone are insufficient. Combine macro regional composition, middle-scale rock faces/strata/banks/ground cover, and restrained small-scale albedo/normal/roughness variation. Use shared materials, instancing and distance detail to control cost. Measure texture/memory/draw calls, terrain material coverage and desktop frame time; validate close/middle/wide gameplay views. Rivers, elevated lakes and waterfalls must have physical local-water surfaces consistent with terrain and navigation, not a painted seam on a global ocean plane.

### Bierstadt and Cole landscape generation — requested direction, October 31, 2026

Use Albert Bierstadt and Thomas Cole as explicit influences on the generated world itself, as well as its lighting. Translate their landscape composition into Hearthwild’s original stylized 3D terrain: grand mountain backdrops, luminous open valleys, winding rivers and reflective lakes, wooded foreground framing, waterfalls or ravines as occasional focal points, and layered distant ridges softened by atmosphere. Compose these elements into connected regions and views that reward exploration.

Allow some spectacular places to be difficult or impractical to settle: steep cliffs, remote lakes, narrow gorges and rugged mountain amphitheaters can exist for their beauty and sense of scale. Keep scenic appeal separate from fertility, buildability, accessibility and resource value; the most beautiful place need not be the strongest economic opening. Preserve viable routes and subsistence at the player’s above-average scenic starting site. Ordinary landscapes must remain common, with attractive regions and rare exceptional vistas providing contrast; do not turn every island into the same showcase.

Centralize and measure landmark rarity (per land area), relief and ridge continuity (metres), valley openness, water curvature and visible water fraction, foreground framing, number of depth layers, focal-point prominence and atmospheric falloff (distance). Record regional beauty distributions and start-site percentiles separately from settlement viability. New composition metrics extend the current water/relief/outlook/contrast score; they are proposed work, not implemented measurements. Keep terrain composition independent of camera position, with view-dependent lighting/framing diagnostics as a separate layer. Tune daylight for warm illuminated land and cool shadows while keeping weather, seasons and nights distinct and readable.

Acceptance: inspect representative ordinary, attractive and exceptional views across fixed and holdout seeds; verify coherent regional composition rather than scattered decorative stamps, measurable variation, safe player starts and bounded generation/render costs. This is artistic influence, not a promise of photorealism or a copy of a particular painting.

**Platform: desktop only.** Drop mobile layout/touch implementation and mobile acceptance work. Optimize desktop controls, camera, readable terrain and panels.

UI uses one compact resource/status bar, one contextual selection panel and a collapsible minimap. Primary actions use short verbs; disabled actions give one reason. Building menus expose every buildable structure. Work, cargo, storage and construction visuals reflect actual state.

Music remains instrumental, with restrained transitions by activity, culture and era. Work/combat sounds are spatially limited and rate-limited to prevent repetitive clicking.

## 4. Architecture and delivery speed

### Minimum shared contracts

Keep `Game` as a compatibility façade while introducing:

| Contract | Responsibility |
|---|---|
| `CommandGateway` | Validate direct orders, policies and AI requests; return accepted jobs or a readable reason |
| `JobCoordinator` | Sole owner of active worker assignments and interruption/resumption |
| `ReservationLedger` | Atomically reserve actors, workplace slots, goods and destination capacity |
| `Settlement/CampAnchor` | Society/location identity independent of a town hall |
| `SocietyPlanner` | Select feasible sustained plans from known facts |
| `RelationshipLedger` | Pairwise incidents, agreements, dependencies and claims |
| `RulesProfile` | Versioned domain parameters, units and difficulty modifiers |
| `SimulationEvents` | Record deliveries, losses, discoveries, attacks and job outcomes |

Jobs have an ID, kind, owner, actors, target, phase, reservations, progress and blocked reason. Phases are proposed, reserved, traveling, working, returning, suspended, completed or canceled.

One resident has one active job. Paid suspended work belongs to the project, not permanently to its former worker.

Order precedence:

1. Incapacity or physical impossibility.
2. Explicit player command.
3. Local emergency response for residents without an overriding explicit order.
4. Committed project or journey.
5. Persistent assignment.
6. Automatic labor proposal.

Cancellation preserves consumed work and accounts for remaining goods/cargo. Existing trade escrow and paid projects migrate through adapters; they must not be charged twice.

Introduce serialized simulation RNG and timestamped commands for reproducible new-format games. Keep cosmetic randomness separate. Old world-generation versions and saves remain supported.

### Refactor only what unlocks the next batch

1. Instrument command outcomes and ownership conflicts.
2. Route direct orders and priority changes through the gateway.
3. Migrate gathering, construction, hauling and crafting.
4. Migrate transport, husbandry, expeditions and captivity.
5. Convert rival development routines from direct mutations into proposals.
6. Extract further coordinator code only when needed.

Do not make an engine migration, ECS conversion or complete file reorganization a prerequisite.

### Parallel implementation

Use specialist roles across successive waves, with **three active workers plus one integrator** on the current machine.

| Wave | Worker A | Worker B | Worker C |
|---|---|---|---|
| A | Jobs/reservations | Replay/diagnostics | Command UI |
| B | Survival/production | Geography/ecology | Early settlement art |
| C | Rival strategy/diplomacy | Transport/trade/husbandry | Combat/captivity |
| D | Discovery/adoption | Households/institutions | Culture/city art/victory |

The integrator exclusively owns shared schemas, dispatcher integration, migrations and release assembly. Workers own separate modules and propose shared changes. One process owns the final build/browser review.

Agents may challenge design assumptions. Every proposal must explain the player decision, consequences, dependencies and implementation cost. More agents become useful when independent work exists—not merely because the backlog is large.

Track delivery lead time, integration failures, repeated checks, shared files touched and regressions. Architectural success means fewer repairs per playable improvement, not fewer lines.

## 5. Executable milestone sequence

| Milestone | Playable outcome | Completion gate |
|---|---|---|
| **M0 — Reliable command foundation** | Priorities, direct orders and interrupted projects behave consistently | Full-handed reassignment, recall, construction and paid-work resumption conserve goods and never silently lose ownership |
| **M1 — A satisfying first winter** | Start without buildings; hunt/gather/fish, obtain water, shelter, fuel and clothing; explore and prepare | A competent Normal plan survives without command repair; neglect has understandable warnings and consequences |
| **M2 — Surplus creates an outside world** | Rivals develop from camps, scout, specialize and pursue shared-rule plans | Two rivals independently trade or compete; stronger opportunities change decisions; no recurring resource gifts |
| **M3 — Transport, trade and conflict matter** | Boats, ports, caravans, animals, claims, defenses, raids and captivity form one loop | Complete delivery, interruption, interception, defense, loot withdrawal and negotiated aftermath |
| **M4 — A distinctive Classical city-state** | Practical technology, institutions, households, density, culture and victories work together | Reach Classical through demonstrated capabilities and complete each victory family in a dedicated scenario |
| **M5 — First release** | Cohesive campaign, saves, controls, audio and performance | Full campaign playthrough, migration checks, target-hardware acceptance and packaged playable build |

Art and UI accompany every milestone. They are not postponed to a final cosmetic phase.

### Coverage of the entire retained backlog

Each catalogue item has one primary domain; dependencies do not create duplicate ownership.

| Human-development IDs | First-release coverage | Explicit later expansion |
|---|---|---|
| 1–10: landscape/ecology | M1–M3: climate, soils, resources, regrowth, waterways, local depletion and warned hazards | Long climate shifts and deeper ecological succession |
| 11–20: needs | M1: food, water, rest, shelter, clothing, fuel, care, expeditions and repair | Detailed sanitation, epidemiology and complex community events |
| 21–30: people | M1–M4: names, families, aging, arrivals, refugees, departures, captivity and leadership | Broader nomadic lifeways and multigenerational cultural transmission |
| 31–40: wildlife/husbandry | M1–M3: tracking, hunting, carcasses, fishing, capture, feeding, breeding and useful products | Selective breeding depth, pack dogs and expanded species |
| 41–50: cultivation | M1–M4: seed-funded expandable plots, soil/fallow, preservation, milling, basic irrigation and traction | Expanded orchards, pests, crop disease and advanced rotations |
| 51–60: materials | M1–M4: practical tools, garments, pottery, charcoal, copper/tin/bronze/iron, wear and workshops | Broad luxury/glass/dye industries |
| 61–70: construction | M1–M4: shelters, storage, yards, institutions, walls, repair, relocation, towns and monuments | Later dense urban housing and advanced civic infrastructure |
| 71–80: knowledge | M2–M4: evidence, experiments, adoption, teaching, artifacts, chronicle and basic records | Extensive libraries and knowledge institutions |
| 81–90: diplomacy | M2–M4: physical envoys/trade, disclosure, agreements, transit, conflict and diffusion | Complex monetary and diplomatic institutions |
| 91–100: transport | M1–M3: paths, roads, bridges, scalable vessels, ports, hauling, escorts and depots | Advanced navigation and regional shipping networks |
| 101–110: warfare | M2–M4: equipment, militia, local alarms, formations, raiding, surrender and basic siege | Advanced siege and full naval warfare |
| 111–120: societies | M2–M4: distinct goals, growth/fall, expansion, basic administrators, obligations and alliances | Regional autonomy, federations, legal depth and advanced statecraft |

Original Astra tasks remain mapped:

- **01, 04, 05, 06, 09, 23:** M0 foundation and M5 compatibility/performance.
- **02, 07, 12, 13, 20, 21:** interaction and presentation across M0–M4.
- **03, 18, 22:** art/audio throughout M1–M5.
- **08, 11, 19:** M1 survival and integrated gameplay.
- **10, 14, 15:** M1 construction through M3 conflict.
- **16:** M2–M4 society strategy.
- **17:** M1–M4 practical progression.
- **24, 25:** M5 release acceptance.

Later expansions proceed through regional/Medieval government, Renaissance cities, global exploration and industry, then space. Larger-map transitions preserve society identity, history and possessions through explicit regional summaries; distant regions eventually use lower-detail simulation. Do not enlarge every region at full simulation detail now.

## 6. Measurement, verification and handoff

Every major mechanic has named parameters with units, a diagnostic explanation and outcome metrics. Do not maximize worker busyness or raid frequency alone.

Measure:

- Food/material output, consumption, spoilage and delivery.
- Productive, travel, rest and blocked time.
- Command latency, job stealing and reservation failures.
- Rival growth, investment, plan completion and recovery.
- Trade profitability, losses and route reliability.
- Raid preparation, contact, casualties, loot and withdrawal.
- Household grievances, negotiation, migration and unrest.
- Time between meaningful decisions and accomplishments.

Use fixed regression seeds plus rotating holdout seeds. A change is retained only if it improves the intended scenario without breaking conservation, saves or the broader scenario set.

Per feature, run focused checks and its integrated scenario. Per integrated batch, run typecheck/build, relevant save checks and a rendered review. Broaden testing when risk or failures justify it; do not repeatedly run everything after every small edit.

Required release scenarios:

1. Unbuilt camp → first winter → sustainable surplus.
2. Priority change/direct override during hauling and paid work.
3. Rival–rival trade, conflict, treaty and recovery.
4. Boat/caravan delivery, interception and save/load.
5. Raid arrival, local defense, loot/retreat and aftermath.
6. Society loses its hall, survives and refounds.
7. Classical advancement and all five victory paths.
8. Large-world terrain, dry placement and mountain-route checks.

Proposed hardware acceptance: M1 MacBook Air, 8 GB, 1440×900 at the selected quality profile; 100 visible residents and 60 buildings, with all rival populations included in simulation. Target median frame time ≤33 ms and p95 ≤50 ms after warm-up. Separately stress 240–300 total residents. These are targets, not achieved measurements.

Use shared meshes, material atlases, spatial batches and distance detail levels. Profile CPU simulation, navigation, rendering and memory separately before considering an engine move.

Research supports competence, autonomy and clear feedback as foundations for enjoyment; it does not guarantee that adding rewards makes a game fun. Validate the actual play experience. [Motivational model](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf), [GameFlow](https://doi.org/10.1145/1077246.1077253)

**Execution handoff**

> Implement this master plan in the existing Hearthwild repository. Start with M0 and deliver the first reliable command/survival improvement before widening scope. Preserve saved villages and the permanent preview. Keep existing physical executors where useful; introduce shared command, job and reservation ownership through adapters. Use three non-overlapping workers plus one integrator after contracts are established. Centralize tuning and expose decision reasons. Ship complete gameplay batches with their UI/art feedback, verify relevant scenarios and save compatibility, then commit and push each finished batch. Record exact evidence and remaining gaps; never equate a button, passing unit test or shipped foundation with completion of its whole catalogue item. Continue through the Classical release milestones; preserve all deferred catalogue work in the expansion roadmap.

This plan replaces conflicting execution ordering in older documents while retaining their requested scope. It is a planning deliverable only: no game files, saves or deployments have been changed.
