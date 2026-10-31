# Rival activity audit: exploration, boats and independent societies

Audit date: 2026-10-31. This is a source-path audit, not an observed frequency benchmark. No NPC behavior, resources, boats, relationships or knowledge were fabricated to make activity appear. The current renderer and shared simulation coordinator were not changed by this audit. One separately authorized fix extends scout return to existing CampAnchor supply approaches.

## Findings that are hard restrictions, not tuning guesses

| Surface | Existing restriction | Consequence |
| --- | --- | --- |
| `sim.ts:isFoe` (around 1882) | Different settled non-player societies always return `false`; hostility/trust/alliance fields are player-relative. | Rival–rival warfare cannot arise through the normal hostility relation. More aggression or faster raid timers cannot fix this. |
| `rivalOperations.ts:planRivalRaid` (41–65) | Candidate targets, observed defenders and defenses are hard-coded to `team===0`; a completed home hall is required. | Strategic raids are player-targeted. There is no general society-pair raid target selection or camp-target raid plan. |
| `boats.ts:boardRiverboat` (30–36) | Only `b.team===0` can board, even when supplied a non-player actor list. | Existing multi-seat boat construction and travel executors are not a usable rival naval mission path. |
| Boat call-site search | No rival planner calls `beginRiverboat`, `boardRiverboat`, `commandRiverboat` or `landRiverboat`. Existing calls are player controls/commands. | A dock or a personal canoe is not evidence of autonomous fleet exploration, transport or raiding. Such missions need planning, funding, boarding, destination and landing phases. |
| `rivalTrade.ts:dispatchRivalBarter` (33–64) | Wants explicitly exclude food, and dispatch needs at least 600 seconds of food. Only other rival completed halls are candidate destinations. | Food shortage cannot choose buying grain through this planner. It cannot trade with an unbuilt camp or directly use the player as one ordinary partner. |
| `visitors.ts:tickVisitors` (9–30) | Separate player-only visitor routine requires a completed player hall and permits one generic visitor globally. | This is not all-pairs diplomacy/trade. Tribe iteration order can dominate which society supplies the single visitor slot. |
| `peace.ts` | Terms, tribute and puppet relations are player-relative. | Existing peace/annexation foundations do not establish autonomous rival–rival treaties and their continuing obligations. |

## Conditions that can make available activity rarely execute

These are concrete gates; their actual blockage frequency still needs measurement.

### Scouting

- A shared review runs first around 120 seconds and then every 180 seconds. A society must be alive, have at least five people, hold at least 450 seconds of food, have no existing scout, and offer an empty-handed eligible worker (`scouting.ts:41–73`). A single busy/committed workforce can miss that review window.
- Targets are unknown **32×32 cell centers** that are dry and connected using the candidate's current traversal capability (`scouting.ts:23–39`). The initial 3×3 remembered cells can cover most of a small island. A nearby reachable bank or an irregular island tip may have no unknown dry cell center, so no target is proposed.
- There is no persistent “unknown shore across water” opportunity that commissions missing transport. A pedestrian with no connected cell simply fails selection. A personal-canoe owner can use existing connected traversal, but first acquiring that canoe is gated below.
- The original return path searched completed town halls only. An unbuilt camp could dispatch a scout and later fall into recalled-return behavior despite having a valid communal supply anchor. The authorized narrow fix now uses `supplyDrops`, `supplyApproach` and `supplyReached`. It does not reveal new places, relax dispatch viability or invent a hall.
- Scouting writes the society's own knowledge cells during travel. This should not be described as a separately implemented physical report-delivery system; cross-society information transfer remains different work.

### Coastal development and personal equipment

- `developRivalCoast` requires population ≥8, food reserve ≥600 seconds, stock for a dock **plus** canoe and 16 logs, no more than one existing pending construction, a known site within 100 m, and a physically connected valid dock position. Any existing positive-HP dock suppresses further coastal planning, including an unfinished or unproductive one (`rivalDevelopment.ts:236–261`).
- `developRivalEquipment` requires eight adult non-militia workers, ≥600 seconds of food, and no adult already making weapons, haulage, tools or animal equipment. It considers farm tools and pack taming before canoe/cart/sled work, returning after the first accepted project (`rivalDevelopment.ts:195–229`). A steady succession of higher-priority projects can postpone canoe work.
- Only one personal canoe is targeted. No measured sea-frontier value or shared crew/cargo mission is passed into that equipment decision. A made canoe is not a completed crossing, discovery or successful maritime delivery.
- Bridge planning looks for known feasible crossings over bounded distances; it is useful local infrastructure, not an overseas-transport alternative (`crossings.ts:11–19`, `developRivalCrossings`).

### Raids and strategic intent

- Raids require a completed home hall, ≥180 seconds of food, enough healthy/free armed residents to leave local guards, at least two available raiders, a known reachable player building and positive bounded utility. Five-person camps generally cannot both retain the required producer/guard floor and dispatch a two-person party. That is a viability tradeoff, not a reason to spawn free soldiers.
- Intent prefers recovery/compact/alliance and applies 300/600-second opening protection. Opportunism also requires aggression >0.65 and trust <0.35 unless already hostile or carrying sufficient grievance. Quiet conflict blocks neutral early raiding (`rivalOperations.ts:74–85`).
- Dispatch immediately sets `recoveryUntil` for 360–540 seconds. A later snapshot may therefore say “recover” while the actual previously dispatched force is still walking or fighting. **Intent snapshots are not executed activity counters.**
- Cooldown decrements by a fixed two units per roughly 1.6–2.6-second thought review rather than the exact elapsed simulation time (`sim.ts:rivalTick`, around 5254). This is a minor timing drift, not the structural cause of absent all-pairs conflict.

### Trade and actor coordination

- Rival barter requires population ≥6, food reserve ≥600 seconds, a shortage of a non-food good, at least 12 offered units above protected reserves, four simultaneously eligible empty-handed workers, a known reachable completed partner hall and no remembered rejection for the offer pair. It reviews every 120 seconds. These are several separate failure reasons currently collapsed into `false`.
- Early outposts/camps are not destinations. Visit execution and refusal reporting also use completed halls. After hall destruction, existing camp cargo adapters do not automatically migrate these social journeys (`visitors.ts:36–64`, `rivalTrade.ts:reportRivalRefusal`).
- `rivalTick` runs eleven development routines before further threshold/random/faction-specific logic. Different routines still use duplicated eligibility checks and mutate worker/project state directly. This can consume actor time or resources before a strategic opportunity is reconsidered. It needs measured ownership/outcome traces, not an assumption that any one routine is the only bottleneck.
- Eligibility checks are not uniformly registered through the shared commitment contract. For example paused water cargo can live outside `u.carry`, while several scout/trade filters only check ordinary cargo and activity-specific flags. Audit interruption/escrow conservation before expanding planners to more actor types.

## Required activity funnel and outcome counters

Record a bounded event stream and persistent aggregate totals **per society, activity and directed partner pair**. Events need simulation time, plan/mission ID, real actor IDs, known target, phase and one blocked/invalidated reason. Proposed stages:

`reviewed → feasible → proposed → reserved → departed → arrived/contact → resolved → returned/completed`

Keep failures/cancellations and physical losses explicit. Never infer past executions from a current `intent` string, a boat count or a town's stock.

| Domain | Proposal/blocking measurements | Actual execution/outcome measurements |
| --- | --- | --- |
| Scouting | Reviews; food/population threshold failures; workers excluded by reason; unknown cells/bank-frontier candidates; path/capability failures | Departures; metres traveled; legs reached; new cells observed; stranded/returned scouts; report arrival if implemented |
| Transport | Known inaccessible opportunities; land/bridge/personal-canoe/boat alternatives; required materials, bench, crew and provisions; reservation failures | Materials paid; construction completed; real boarding; embarked persons/cargo; route traversed; landing; unloading; return/loss |
| Trade | Shortage/offer combinations considered; partners known; same-pair refusal memory; worker/stock/route/landing failures | Actual outbound goods, arrival/refusal/exchange, delivered return goods, profit/loss and complete round trips |
| Conflict | Known targets; desired remedy; local observed force/defense cost; guard/cargo/provision commitments; failed utility/route/custody feasibility | Real departures/contact; casualties; surrendered people; goods loaded/delivered/lost; occupied/contested time; guard cost; withdrawal and negotiated aftermath |
| Institutions/diplomacy | Directed incidents known, agreements proposed and messenger feasibility | Envoy arrival, witnessed agreement, physical tribute/delivery, breach knowledge and recovery |

Useful ratios have explicit denominators: departures/accepted reservations, arrivals/departures, completed returns/departures, and successes/arrivals. “Plans per minute” or raid frequency alone must not become optimization goals. Rival stock is inspectable only at permitted local contact/owned stores; diagnostics do not grant agents remote inventory knowledge.

## Next executable batch

1. Retain the narrow camp-aware scout-return correction and its real walking/save/cargo-conservation regression. Do not call this a completed rival exploration system.
2. Add reasoned diagnostic returns at the existing planner exits and phase counters at real executor transitions. First measure two ordinary seeds and one island-heavy map without gifts or map/visibility edits. Distinguish survival-limited, actor-limited, knowledge-limited, path-limited and missing-capability failures.
3. Introduce the directed relationship/incident ledger and replace hard-coded player-only target/hostility queries through adapters. Preserve player command reliability and old saves. Do not manufacture a war by setting every rival hostile.
4. Link a known maritime opportunity to a funded transport plan: dock/workplace → paid vessel/personal equipment → crew/provisions → physical boarding/travel/landing → new observation or delivery → return. Generalize boarding ownership before any rival multi-seat-boat mission.
5. Test genuine rival–rival trade, contested access, treaty and recovery using actual goods/people and disclosed knowledge. Keep emergencies physically feasible even when an ideal food-buffer preference is unmet. Do not remove all reserve safeguards simply to make units appear busier.

No broad M2/M3 acceptance or new progress credit is earned by this audit, an activity report helper, a visible animation or the presence of the existing modules.
