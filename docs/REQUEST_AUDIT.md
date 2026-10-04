> Current remaining-work source: [FUTURE_IMPLEMENTATION.md](FUTURE_IMPLEMENTATION.md). The chronology below is historical; newer requirements and verified fixes supersede its older missing-feature descriptions.

> Continuation phase: versioned richer terrain for new games; physical foreign trader visits; larger territorial colour contours; village-wide work resets; all-villager cycling; hidden undiscovered settlement counts; clearer backup labels; gradual hunger weakness; slower walking couriers and improved local terms. Village rise/collapse, foreign explorers, navigable river transport and local valley climate are still outstanding. See `ITERATION_BACKLOG.md` for verification and limits.

> Latest scope correction (2026-10-03): all 120 catalogue items, including previously optional extensions, are requested. See the catalogue's consolidated execution order for overlap, new requests and historical interpretation. Trade reports now appear at the destination meeting, superseding return-only reports. This is committed scope, not a completion claim.

> Latest continuation: see `ITERATION_BACKLOG.md` for protected checkpoints/export/import, timber-search orders, seasonal field priorities, group arrivals, recall, traveling trade/peace/gift delegations and dated trade reports. The itemized broader feature catalogue is [HUMAN_DEVELOPMENT_CATALOGUE.md](HUMAN_DEVELOPMENT_CATALOGUE.md). Older status rows below are the audited baseline and must be read with this update.

# Hearthwild: consolidated request audit

Audited 2026-10-03 against the original pasted master planning prompt, the user-authored requests in this chat, the Sol handoff, current code, and the latest screenshots. This document is the requirements index; `SOL_EXECUTION_HANDOFF.md` remains the architecture/execution contract. Latest user corrections override earlier design choices. Entries marked partial are not completed promises. Tests establish specific behavior, not overall fun, balance or reference-game parity.

## Updated design contract

Start with a small community surviving its actual landscape. Learn locations by scouting and learn neighbors' intentions through people traveling and reporting back. People, animals, labor, materials, tools, shelter, food and knowledge have physical causes. Progress emerges from experiments, repeated practice, adoption, exchange and a sustainable community. Larger settlements eventually need military organization and administration. Preserve working systems; do not replace the whole engine merely because the current content is shallow.

Dawn of Man provides the survival/settlement reference, Age of Empires the responsive combat reference, Civ the growing regional scope. These are references for an original game, not permission to copy their protected assets. The Bethesda-inspired personal/first-person layer is later and must not undermine the RTS controls. Fun and village growth with adequate reserves take precedence over punitive pseudo-realism.

The later request for **natural development supersedes spending exploration points for development bonuses**. Keep a chronicle and meaningful expeditions/challenges, but make practical rewards follow from returned objects, information, tools or adopted practices. Existing version-17 legacy fields/bonuses remain compatible; their spending UI has been removed. This is not yet the complete experimentation system.

Conflict must arise from observed actions, incentives, scarcity and history. A live village-management selector should not control other societies' aggression. Removed the Border pressure selector; older saved difficulty preferences still exist internally for compatibility and must be deliberately migrated rather than suddenly making peaceful saves violent.

## Immediate corrections and status

| Request | Current state | Remaining acceptance |
|---|---|---|
| Stop waving grass on this computer | Decorative grass allocation and wind shader removed this phase | Profile the remaining renderer/simulation; no promise that grass was the only bottleneck |
| Computer-appropriate performance | Hardware verified: M1 MacBook Air, 8 GB shared RAM, 7-core GPU | Profile live CPU/frame/memory; constrain shadows, postprocessing and per-frame uploads, measured quality presets |
| Cut trees without lumber mill | Implemented; local camp improves cutting efficiency | Explain camp use and support explicit remote work-area staffing/safe supply support |
| Maximum two woodcutters per tree | Shared WorkBoard already did this; direct group and clicked resource commands now use capacity reservations | Test all paths, retries, deliveries and group orders; escorts should be separate from cutter slots |
| Far lumber camp unused | Trees around a finished lumber camp can now be considered beyond the usual local-work limit | Distant sites may still lose to nearby work; explicit workplace assignment, rations and route safety are needed |
| Priorities for wood, stone, hunting | Added alongside balanced, food, construction | Trading priority must allocate actual agreed transport/jobs; do not add a cosmetic option with no effect |
| Harvesting in another village provokes anger | Added warnings, lost trust and eventual defensive hostility for sustained taking beside a rival hall | Replace provisional hall-radius claims with shared influence/access rules; rival perception, negotiated rights, uncertain frontier disputes |
| Soft territory tint rather than defined borders | Existing building-projected territory now has fading tint strength | Shared claim model, disputed influence, visibility-safe map presentation and all settlement factions |
| Actual carried food/materials | Simulation already holds and delivers real cargo; added cheap instanced colored bundles | Recognizable logs, baskets, ores, tools and animal loads; theft/drop/death cargo recovery and local inventories |
| Month within winter | Ledger now displays named months in its seasonal calendar | Consistent month/day/weather labels in main HUD and biome-specific calendars where useful |
| Farms use too many logs | Field cost reduced from 50 to 20 timber | Natural-seed multi-year balance; later field clearing, tools, seed, irrigation, fences and labor costs |
| No mystery drops | Removed standing-stone caches, favorable event windfalls and daily region payouts | Ruin loot is different: must be finite, physically located, recovered, transported and subject to spoilage/study |
| Bigger age bonuses/challenges | Last phase strengthened several bonuses and added chronicle milestones | Migrate menu choices to practical discoveries/adoption; richer age-specific challenges without a points progression economy |

## Survival, people and ecology

| Request from this chat/master prompt | Status and required work |
|---|---|
| Completed hut and no precipitation at start | Implemented new-game opening; preserve it |
| Seasons and survivability, occasional winter snow, calm score that changes with seasons | Seasonal fields/forage/fishing/spoilage and snow conditions exist; validate each biome's full natural survival year. Music was changed to calmer piano; listening/mix/seasonal acoustic variety remain |
| Population born, migrates, or comes from captured survivors; no buying/training new people | Civilian spawning through training disabled, births/migration implemented. Captivity, surrender, release/integration and scattered survivors remain |
| Reserves permit village growth; stop rapid winter elder deaths | Age scale corrected, fever damage/recovery and reserve/housing growth implemented. Still need multi-year balance and clear individual causes of death, disease, exposure, injury and old age |
| Night sleeping and shelter in storms | Missing coherent rest/exposure schedule. Add needs, accessible beds/shelter, night shifts and interrupted-order resumption; explorers use temporary camps |
| Shelter degradation, repairs, fuel and meaningful weather consequences | Repairs exist in part; deterioration/material durability, upkeep labor, leaks/exposure and storm shelter capacity remain |
| Named villagers, personality, life updates, personal connection | Units have age/body variation; fitting randomized names, traits, family links and concise birth/migration/marriage/injury/death notices remain |
| Warm/light clothing | Missing item recipes, wetness/insulation/heat effects, wear and outfitting priorities |
| Hunting remembered and useful, no dedicated early hunter unit | Civilian hunt orders/visible wildlife implemented. Preserve. Add tracking/signs, sustainable herds, carcass transport, butchering, hides/bone and risk |
| Domesticated animals matter | Missing capture/taming/breeding, pens, fodder, milk/meat/wool, traction, carrying and herd care; biomes/species must constrain possibilities |
| Prehistoric nomadic hunting age; follow herds where advantageous | Missing movable camp, seasonal migration, portable shelters/containers, food preservation and tradeoffs versus fields; no universal forced sedentary ladder |
| Biome determines viable shelters/resources/lifeways, plains alternatives to timber houses | Existing three habitat yield profiles are partial. Randomize starting habitat, distinct resource/animal/climate/shelter options; avoid copying one culture onto every landscape |
| Forest biome, forests spread, occasional fires | Woodland profile and tree regrowth exist. Forest succession/recruitment/spread, fire weather/ignition/spread, recovery and management remain |
| Resources vary in type and quality, scarcity drives exchange/conflict | Existing deposits/yields vary but scarcity is not systematic. Persistent grades, local material availability and finite ores; remove random rapid grade rerolls and balance viable openings |
| Better tools; stone-age weapons | Some spear/bow stock/militia exists. Add flint/bone/wood tools and primitive weapons, workshops/durability/equipment, civilian defense; no premature professional army |
| Plagues, realistic causes, fun rather than frequent arbitrary death | Fever is partial. Crowd/water/food/exposure causes, care, recovery, immunity and warnings remain |
| Subsistence labor, productivity breakthroughs | Seasonal labor partly exists. Storage, animal traction, plows, breeding, soil/rotation, milling/processing and specialization should reduce labor pressures. Do not enforce a fixed historical farming percentage or one-cause account of societal development |

## Exploration, knowledge and diplomacy

| Request | Status and required work |
|---|---|
| True exploration: don't know food before finding it; explored fog thinner | Knowledge gates and explored/current/unknown fog implemented. Keep hidden enemy units invisible; validate visuals and knowledge across saves |
| Persistent explore without button mashing; focus village | Persistent explore/manual destination hold, F focus and provision-driven return implemented and tested. More route planning and journey encounters remain |
| Scouts carry food based on journey | Player scouting now packs actual food, consumes it, camps at night, forages nearby finite patches and returns leftovers. Duration estimates, burden, all other journey types and broader wilderness decisions remain |
| Find people, living/new villages, old ruins | Current discovery of existing villages/landmarks is partial. Add procedural encounters, migration decisions, finite ruins, survivor histories and safe refusal/rescue choices |
| Return cultural artifacts/hidden knowledge and study at home | Missing object inventory/transport provenance, rarity/cultural demand, spoilage, study labor/time/materials and uncertain evidence-led discovery. Finding an object must not instantly unlock its tech |
| Organic technologies depend on material experimentation and community capacity | Missing full linked graph and experimentation/adoption. Density/surplus/contact can help but must not arbitrarily prevent small connected groups learning |
| Robust tech tree, natural age advancement, more later Civ elements | Current six cost/population/building-variety ages are partial and should migrate to learned/adopted practices plus sustainable community. Finish food/textiles/metallurgy/transport/governance branches |
| Era challenges especially exploration | Chronicle exists; no new point spending UI. Add meaningful discoveries and practical consequences across all ages, avoiding score farming |
| Learn trade wants by sending a trader, not omniscient live quotes | Implemented first traveling report flow: outbound envoy, local meeting, return delivery, dated offers and refusal/revalidation on arrival. Reported offers are limited to simple pairs; negotiation depth, optional disclosures and broader counteroffers remain |
| Rivals may disclose reserves, boast or conceal, never constant exact stock UI | Exact stock snapshots removed. Optional communicated estimates/claims, deliberate opacity, trust and imperfect information remain; reports must be dated |
| Thoughtful deals based on needs/goals/personality, Civ-like negotiation screen | Reserve-aware willingness and physical cargo implemented. Counteroffers, multi-item/ongoing terms, gifts delivered physically, access/security/nonaggression, memory and personality remain |
| Dirt paths develop with repeated trade routes | Missing shared traffic heat, persistent compacted trails and modest movement effects; decay, terrain/weather and later engineered roads |
| Navigable rivers, boats | Missing navigable hydrology, launch/landing/ports, capacity, land/water routes and transport transitions. Preserve current land navigation while adding separate water graph |

## Tribes, war, settlement scale and administration

| Request | Status and required work |
|---|---|
| Larger world, more distant peoples, randomized names/colors/abilities | World size/separation increased in prior work; current identities/IDs remain constrained. Seeded varied starts/cultures/strengths, personalities and geography are unfinished |
| Other villages intelligent, different, able to grow/succeed/fail | Current workers/building AI partial; remove broken population-training assumptions, support all human needs, goal-directed economy/scouting/diplomacy/defense and recovery |
| New villages rise and collapse, survivors scatter/re-settle | Missing dynamic settlements/factions/refugee founders and carrying-capacity migration; separate settlement identity from hard-coded team IDs first |
| Movable townhall and multiple townhalls/settlements | Partial founding/outposts exist; explicit relocate/community-center dismantle/rebuild, home assignment, local stores and multiple settlement governance remain. No free teleporting a built hall |
| Pillage, burn, eliminate village, sneaky/night/sea raids | Selected raids and some sea/land raids exist. Physical stolen cargo, building fires, civilian escape/surrender, stealth perception, retaliation/truce and conquest outcomes remain |
| Townspeople defend; raids obey orders; can leave war | Militia/selected raid/truce fixes partly implemented and tested. Longer combat play, withdrawal, victory/defeat and prevention of perpetual wars remain |
| Raider camps steal/attack trade | Finite remote camp bands/theft implemented. Escorts, ambushes, cargo drops, survivors and believable camp lifecycle remain |
| Units don't all crowd one resource, security when afraid | Cutter capacity fixed this phase; separate escort tasks, fear/route risk and patrol protection remain |
| AoE responsive combat: counters, armor, ranges, projectiles, spacing, building attacks | Several basics exist; full unit counters, armor/accuracy, command responsiveness, readable weapon equipment and large-battle/choke checks remain |
| Later commanders/formations/professional army | Queued after equipment/militia works; officer assignment, formations/stance, logistics, army support and civilian opportunity costs |
| Civ empire scale, later diplomacy/secession | Missing regional transport/administration, autonomy pressures, breakaway settlements and later diplomacy unlocked by real contact/organization |
| Civil administrators automate as settlement scales | Missing named appointments, competence, jurisdiction, explicit policy scope/reporting, costs and autonomy. Build on high-level priorities; do not hide broken work allocation behind automation |
| More useful buildings, Dawn of Man breadth | Current ~18 types partial. Build functional catalog: seasonal/portable homes, hearth, stores/granary, drying/smoking, knapping, hide-working, weaving, pottery, charcoal/smelting/smithing, pens, food processing, bridges/landings/market, healing/ritual/study/administration, palisades/gates/towers/equipment stores and later military buildings. Every type needs actual inputs/labor/output/upkeep/unlock |

## Original prompt/platform obligations still active

Preserve the working React/TanStack/Three.js shell, fixed simulation/input separation, existing terrain/navigation/fog/save identity, platform authentication and free asset license registry. Keyboard-only core includes selection/groups, contextual orders, camera, building placement/selection, research/trade menus, save/load and focus. Verify rally/attack-move/stop/hold/shift/box selection rather than assuming support from UI labels. Keep build, type checks, meaningful simulation tests, browser checks, natural multi-year balance and performance evidence. Commit/push verified source changes; never stage generated `.vercel/output` churn as source.

Visual/3D overhaul remains a separate later phase: cohesive licensed detailed models/textures, readable resources/clothing/weapons, animations, terrain/water/forest polish and efficient LOD. The original prompt's moderate stylization and later detailed Dawn-of-Man/AoE preference must be reconciled within this 8-GB machine's budget. Music is acoustic/chill now; later dramatic conquest music was superseded by the calmer request. Do not buy assets or use unclear redistribution rights. Maintain `THIRD_PARTY_ASSETS.md`.

## Recommended phase order (no promise of a fictitious completion percentage)

1. Stabilize inputs/resource assignment, low-memory rendering, clear costs/food/months and natural multi-year opening. This phase implements the immediate corrections above; measure and validate.
2. Physical local stores, death/theft cargo, expedition provisions; sleeping/storm shelter/degradation. Add names/individual life events early so people matter.
3. Traveling trader/envoy reports and imperfect information, physical gifts/negotiations, local access/trespass and reliable withdrawal/defense. Remove remote omniscience before adding more diplomacy options.
4. Wildlife/hunting/domestication and biome lifeways, portable shelters/nomadic choices, sustainable forest ecology/fire and systematic regional scarcity.
5. Useful item/tool/clothing/production buildings and material quality. Then evidence-led experiments/artifact study and organic age recognition; no points economy.
6. Distinct rival goals, settlement/faction separation, founding/collapse/refugees, multiple community centers and trade paths/water transport.
7. Combat equipment/counters/escorts, night/sea raids, pillage/fire/surrender and later officers/formations. Test large battles and ceasefire recovery.
8. Regional storage/governance/administrators, empire logistics/autonomy/secession and full late-game loop. Complete handoff acceptance end to end.
9. Visual asset overhaul only after mechanics are stable; preserve measured performance and accessibility.

A row leaves partial/missing only when its acceptance is implemented, saved, reachable through the UI, tested and exercised in play. Update this index at each phase instead of shrinking the queue to whichever features were just built. Do the user's later historical feature inventory only when requested; it should refine this index rather than silently replace it.


### Verified phase: journeys and community records (2026-10-03)

Civilian rest/storm shelter and night-work fatigue, journey meals/camping/refund, shared traffic paths, independent rival geographic scouting, secondary halls costing 20 timber plus labor, physical resident-led expansion/refounding, abandonment, stable names/traits/parent IDs and village life history are implemented. Mineral grade is persistent. These are bounded foundations: faction stores are still global, scouts share knowledge before arriving home, traders still use legacy contact knowledge, and family/social simulation is incomplete. The full 120-item human-development overhaul remains open. See the catalogue execution table for remaining dependencies.

Validation: 311 script/game checks and 32 application/auth checks passed; after the final mission/urgent-food guards, 20 relevant checks passed. Final typecheck and production build are recorded with this delivery. The old saved village was resumed paused in the browser with its original population and supplies.
