# Proposed rework direction

This document supersedes the old backlog's feature-expansion order as a design proposal following the user's September 26 feedback. It is not a claim that these mechanics are implemented. Preserve the existing playable checkpoint and music. Prove the new simulation before replacing art or expanding eras.

## Core identity
A settlement strategy game about creating enough dependable surplus to support an increasingly complex society, and protecting the people and networks that make it possible. Settlement simulation is the foundation; regional strategy supplies scale; direct RTS combat supplies tactical agency.

## Audit findings behind the change
The existing workerAI attempts construction before choosing a resource job and can remain idle if that chosen job has no viable node. Work selection does not provide a robust task-reservation/fallback contract. Rival raid logic becomes eligible after 80 simulation seconds, using repeated random rolls based on aggression, growth and player threat. callToArms manually converts workers using stockpiled weapons; civilian emergency behavior is not a complete automatic defense system. Keyboard input currently suppresses world keys whenever a button has focus, explaining a camera-control failure after HUD use. These are separate from the larger game-design deficiencies.

## Design pillars
1. Seasonal labor and food security determine the available surplus.
2. Population consists of households with dependents and skilled workers, not a food purchase at a hall.
3. The player sets priorities and constraints; capable villagers execute them and explain failures.
4. Technology changes labor, land and logistics, rather than only increasing gather speed.
5. Conflict has causes, warnings, objectives and recovery periods.
6. Scale comes from settlements, supply networks and regional interests, with detailed local battles.
7. Camera and command responsiveness are independent of selection and ordinary HUD focus.

## Economic model
Model food supply in stores, expected harvest, consumption, spoilage and days of reserve. Show labor-days committed to sowing, harvest, herding, hauling, building and crafting. Starting agrarian communities should spend most useful labor on subsistence; calibrate this from production and consumption, not an immutable 85% assignment. Population growth consumes surplus unless land, yields, storage, transport or institutions improve.

Initial chains: seasonal grain -> storage -> milling/cooking; pasture -> animals -> traction/manure/meat; forestry -> fuel/timber -> construction/tools. Hunting, fishing and gathering remain complementary. Avoid dozens of currencies in the prototype. Household needs initially include food, shelter, fuel and rest; distinguish resting from unexplained idleness.

Technologies require inputs and supporting infrastructure. Proposed heavy-plow mechanics: improve suitability for selected heavy soils, require draft animals, skilled maintenance and metal parts. Breeding/traction improvements need fodder, land and time. Crop rotation, storage, mills, roads, barges and trade should release labor in different circumstances. Adoption spreads through contact and practice as well as deliberate investment. Regional differences emerge from geography and institutions, not fixed civilization superiority bonuses.

## Labor AI contract
Central task board with eligibility, reachability, safety, materials, work slots, storage capacity, deadlines and reservations. Routine tasks scored by urgency, skill and travel cost; avoid reassignment oscillation. Seasonal peak work recruits flexible workers. Direct player orders temporarily override work policy, then resume it. Unreachable work releases reservations, receives a retry delay and triggers an actionable explanation. UI categories: resting, no materials, no safe route, no storage, awaiting tool, no eligible work.

## Civilian and combat behavior
Automatic local alarm: vulnerable/unarmed civilians retreat to shelter; designated armed residents muster at a rally area; hunters and guards respond within a defend radius. Preserve civilian jobs for stand-down. Emergency self-defense is available at close range, with retreat preferred when outmatched. Do not make all townspeople perfect soldiers.

Military has militia and increasingly costly professionals. Campaigning consumes food and removes labor from the economy. Combat prioritizes responsive movement, formation frontage, terrain, weapon reach, projectile readability, fatigue, morale, retreat and regrouping. Tactical counters matter without making equipment the only determinant. Raids seek livestock, stores, tribute or territory; armies can withdraw after success or resistance instead of always fighting to extinction.

## Neighbors and diplomacy
Each neighbor tracks food security, trade dependency, trust, grievances, expansion pressure, strength, losses and leader disposition. Evaluate defend, trade, negotiate, migrate, raid and expand against actual needs. Randomness varies opportunity and personality; it does not substitute for motives. Failed raids incur recovery costs. Threat settings configure frequency/intensity independently of survival pressure.

Early relations use repeated barter, gifts, safe passage, shared hunting/grazing rights and retaliation/compensation. Later settlements unlock continuing trade agreements, tribute, borders, alliances, collective defense and formal war goals. Traders have cargo, travel time, local demand, seasonal availability and risk. An importing neighbor is less willing to destroy its own dependable food route, unless other pressures overwhelm that interest.

## Scale and pacing
Keep one fully simulated starting valley. Design a regional layer early, but add off-screen settlement aggregates only after the local loop works. Zoomed-out views show routes, districts, borders and pressures; local view shows households, work and battle. Never promise thousands of fully detailed agents before profiling. Initial targets for validation: 30 residents, then 100 residents with 40 combatants; larger counts are targets, not verified capacity.

Suggested first scenario: one village, one neighbor, a river/valley bottleneck, one growing year, one external pressure that may resolve through trade or combat. A session should tell a comprehensible story: prepare food, choose investment, meet a neighbor, handle a labor shock, protect the harvest, emerge with a better or worse foundation. Advance by sustainable capacity and institutions rather than a single resource-payment button.

## Acceptance gates before new eras or an art overhaul
- A 30–45 minute keyboard-only scenario can be completed without clicking individual workers to rescue routine labor.
- Every idle adult has an inspectable reason; eligible urgent tasks are claimed within a defined scheduler interval.
- Selecting units, opening a non-modal HUD control and issuing orders never disables camera movement; text fields/modal menus remain protected.
- Unarmed civilians react to nearby attack; assigned militia muster, defend, stand down and resume work.
- Scarcity can produce both peaceful and hostile neighbor behavior; diplomacy can prevent a specific conflict.
- Different farm/storage/trade/defense investments produce materially different seasonal outcomes.
- Save/reload preserves tasks, reservations, household state, season and neighbor intent.
- Navigation and frame-time budgets are measured at the target population; no teleport recovery.
- Full completion requires observed playthrough evidence, not merely automated unit-test passes.

## Implementation order
1. Preserve checkpoint; fix input focus and specify command ownership.
2. Replace worker job guessing with task board, reservations and visible reasons.
3. Add alarm, shelter, militia muster and safe return to work.
4. Build seasonal food/labor/storage loop and household consumption.
5. Replace timer-driven raid pressure with neighbor needs and intent.
6. Add physical trade routes, terms and early relational diplomacy.
7. Add meaningful technology dependencies and first specialization paths.
8. Integrate a single scenario; tune using actual play sessions.
9. Profile, then decide whether the current renderer is adequate.
10. Replace art coherently and expand regions/eras only after the scenario is enjoyable.

## Art and engine decision
The revised preference is detailed, naturalistic 3D terrain/materials/buildings with readable silhouettes, rather than the original moderately low-poly direction. Textures alone cannot correct terrain shapes, building proportions, animation, lighting, shadows and clutter. Use a cohesive free, redistribution-compatible asset family; keep attribution and source evidence. No commercial game's assets or music should be copied.

Do not choose an engine solely because this prototype looks poor. Keep simulation independent of rendering. A native engine becomes a serious option for a PC-first game requiring richer skeletal animation, terrain authoring and large battles; evaluate a representative animated scene and measured frame times before committing to migration. Reuse functioning save concepts, input contracts, audio, useful definitions and test cases, while allowing replacement of the monolithic economy/AI design.
