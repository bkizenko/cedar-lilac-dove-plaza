# Current rival incentives and proposed replacement — 2026-10-31

This is a code audit, not a claim that the replacement exists. Rivals use local programmed simulation AI, not language-model calls. The current system is a mix of reserve/threshold rules, random rolls, fixed faction branches and several newer physical economy modules. It does not optimize a coherent victory or personality objective.

## Audit snapshot before the territorial correction

| Current drive | Actual decision rules | Limitation the player is seeing |
| --- | --- | --- |
| Food/security of supply | Under240seconds of food, ordinary building/non-food workers are pulled toward food; fields and stores target annual needs plus a buffer. Resource access, forestry, farming, storage extensions and equipment use real workers/materials. | Many independent schedulers compete for the same workforce. These checks are not one economic plan with explicit opportunity costs. |
| Population growth | Shelter when fewer than3free places remain, at least450seconds of food and enough wood; prosperous villages can invest in another hut. | Most societies follow very similar thresholds. Settlement identity does not arise from distinct household/leader goals. |
| Age progression | Save the next age's physical materials; attempt advancement when shared population/infrastructure/reserve checks pass. | Protecting reserves can compete with useful construction. A high population gate can leave small rivals with small Stone Age armies for a long time. |
| Buildings and equipment | Modules secure food, timber/stone, crossings, coastal work, missing institutions and tools. Some older branches specifically favor team1quarries/cairns/wardens and team2farms/groves/rangers. | Labels and colors vary more than strategy; priorities still depend partly on fixed faction IDs. There is no general valuation of walls, route protection, prestige or knowledge adoption. |
| Army | Barracks investment needs over600seconds of food; equipping troops needs over700seconds,7people and an eligible stage. Ordinary military target is3+2×age, counting non-worker types including leaders in that limit. | Small early armies and competing reserves make credible raids rare. There is no operation plan balancing guards, a strike force and losses. |
| Raids | `neighborIntent` first honors recovery/compacts, then quiet-frontier/grace period/ally/trust gates. The grace period is600simseconds normally,300dangerous; trust above.35returns trade. A raid then requires hostility, tension above.65or scarce food plus aggression above.65; army must meet max(3,player defenders), and player food must exceed30. Dispatch has another random roll, needs at least2eligible fighters, and usually sends1–2at age0. Cooldown is360–540seconds. | A prosperous friendly neighbor has little path to opportunistic competition. An evenly defended player can block raids through hard thresholds. Passing several unrelated gates is not the same as deciding that a reachable exposed store is worth raiding. |
| Territory grievances | Gathering within45m of a rival hall raises tension/trust loss; influence overlap contributes a much smaller amount. Without those trespassers, decay is.032+distance-space×.055per second. Known player frontier posts within160m add a separate grievance based on land value, resource needs, expansion and trust. | At large distances the decay can erase pressure very quickly. A broad sphere of influence is not consistently used for every resource/settlement action; memory is mainly one tension number. |
| Expansion/fall | Communities review every30seconds. An empty hearth is abandoned after600seconds. Rival expansion needs12people,600seconds of food,100logs, fewer than5halls and an1800second settlement cooldown. Survivors may attempt a material-funded refounding. | These are partial lifecycle foundations. There is no verified full playthrough showing powerful societies, succession, splitting, collapse, refugees and meaningful new societies emerging. |
| Legacy/score | Player discoveries already record one-time points and support an age-filtered score and traditions. Ruins currently yield resources/material evidence. | Rival action selection does not pursue those scores. Monuments/artifacts are not yet a complete physical cultural-legacy system. |

Primary code: `src/game/sim.ts` (`rivalTick`, `tickInfluence`, `paintTerritory`, `travelSpeed`); `settlement.ts` (`neighborIntent`); `rivalDevelopment.ts`; `frontiers.ts`; `communities.ts`; `discovery.ts`.

Existing rival starts also provide300food/90logs versus the player's120food/58logs and some prebuilt facilities. These are initial provisions, not recurring income, but they do not prove strong economy/AI. Do not add more free catch-up resources as a substitute for a working decision system.

## Territorial correction delivered after this audit

Diplomatic influence now shares the map's finite radius and stable75%core/fading edge. Fixed team resource bonuses and infinite-distance influence are removed from that calculation. Unknown foreign home overlap cannot generate anger. Known resource incursions use the influence field, not only45m around the hall. Anger now cools slowly without distance erasing it; aggression/expansion affect sensitivity and aggression affects escalation threshold. Existing saved tension remains compatible. The colored wash is stronger and overlay geometry matches terrain resolution on larger maps; browser appearance is unverified. Full witnessed event histories, compensation, all settlement/fortification incidents, distinct leader ambition planning and rival operations remain open.

## Feasible operations delivered after the audit

`rivalOperations.ts` now evaluates known reachable player targets by separate reward, grievance, travel, observed local resistance, target resistance and night metrics. Targets are valued by building type; exact stockpiles remain uninspected. Squads use available healthy armed adults, preserve nearby guards and civilian labor, honor compacts and food readiness, and prioritize attacks at home. The former global player defender-count gate, unknown random target and second launch roll are removed. Existing contact logic changes relations on actual arrival. Stone Age weapon crafting and equipping now use real stock and working adults; the old retired Ranger/Warden/Bronze-spearman recruitment branch is removed. This is an operation/equipment decision module, not a complete utility planner for all building, culture, leadership, religion or science choices. Current war/peace relationships still focus on player-rival pairs; full rival-rival politics remains open.

## Target: one shared decision layer

Keep the physical simulation and job executors. Add a society decision layer that consumes knowledge available to that society, scores a bounded set of feasible actions, reserves finite labor/materials and commits to a plan long enough to execute it. Every decision should have a readable test-mode explanation, such as “winter deficit: secure fish and dry meat before another hall” or “exposed timber route: escort is cheaper than repeated losses.”

Use a shared value model:

**Expected benefit × priorities − material/labor cost − travel/risk cost − social consequences.**

Survival urgency can override ambition. Personality changes the weights and acceptable risks; success/failure, relations, geography and a new leader can change them over time. Separate long-term aspirations from temporary fear/anger. Do not make every society universally want conquest or every farmer permanently peaceful.

Possible priorities: subsistence/security, trade/wealth, expansion/dominance, exploration, practical learning, ritual/cultural prestige, family/legitimacy and community stability. Leaders/households/cultures can influence several simultaneously. Different continents should develop different material cultures, contact histories and attitudes, without treating geography as a deterministic real-world stereotype.

### Territory and antagonism

- Compute one consistent field of defended control and outer influence from settlements, posts, people and reach. A stable colored core fades through an outer sphere to zero. Overlap records claims/contestation instead of instantly erasing both identities.
- Gathering, hunting, mining, settling, fortifying or attacking inside another society's influence produces an event with severity, location, value and witnesses. Unknown actions need observation before diplomacy reacts.
- Grievance memory stores causes and decays on legible time scales. Withdrawal, compensation, repeated fair trade and agreements can reduce it. Leader sensitivity changes the threshold; military readiness and expected gain determine the response.
- Responses escalate: warning, demanded compensation, denied trade, escorted eviction, targeted theft, raid, territorial war. A threshold must not automatically summon resources or troops.
- Renderer currently already has a strength core/fade and a colored wash, but the player's screenshot shows that it is not legible enough. Verify actual rendering before calling the new territory presentation complete. Make the core and outer sphere clear across biomes/light conditions.

### Physical legacy plus score

The player explicitly likes Civilization-style victory types, era score and total score. Scores record achievements; the economy remains physical.

- Surviving hard winters, discovering new geography/people/materials, first successful voyages, protecting trade, liberation or conquest can create bounded historical moments. Prevent repetitive farming of the same action.
- Cultural artifacts are unique physical objects with origin, carrier, condition, research/display status and trade/theft history. Recover, haul, study, exchange or display them. Finding an object does not instantly grant its technology.
- Monuments and civic works consume actual materials and labor and require useful placement, upkeep and a living society. Cultural victory needs maintained legacy, not repeatedly placing cheap props.
- Each society gets era and total scores from the same rules. Private accomplishments are revealed only through contact/intelligence; a test-mode ledger may expose all for debugging.

Proposed selectable victories:

1. **Prosperity:** several functioning towns, meaningful population, shelter and repeated winter survival with actual reserves.
2. **Commerce:** sustained completed international deliveries, valuable diverse supply routes and protected logistics.
3. **Dominion:** durable control, conquest, tribute or alliances over contested regions, backed by real people.
4. **Knowledge:** complete demanding discovery/production chains and demonstrate adoption in real work and equipment.
5. **Cultural legacy:** create/maintain monuments and recover, study and display significant artifacts.

Targets must be tuned against a complete playthrough. Allow sandbox continuation after victory. Rival collapse alone never awards an automatic military victory. Scores and these victory modes are accepted design work, not implemented by the map/test-flow batches.

## Next implementation sequence

1. Shared observable-facts/feasible-actions contract and saved society ambitions; decision trace in test mode. Preserve real economy, routes, worker reservations and saves.
2. Replace food/build/defense/raid threshold clashes with a small coherent action scorer. Prove an actual operation reaches a valid target, loots/withdraws or fails for a legible reason. Maintain sufficient defenders at home.
3. Unified influence/grievance events and visible territory; add wall/gate investment when expected protection justifies cost.
4. Competitive development and observable settlement expansion/refounding; leader lifecycle and later succession/fission build on real households and grievances.
5. Physical artifacts/monuments, shared era/total score and selected victory checks. Balance one full survival-to-rival-conflict game before widening the chain catalogue again.

Forests: the play-flow batch now shortens natural stump recovery to600–1200simseconds and caps older depleted timers on the next growth tick. Weather/habitat and finite returns remain; planted saplings keep their faster120-second cycle. Wider forest recruitment/succession/ecology is still open. Old saved terrain/tree positions have not been replaced.
