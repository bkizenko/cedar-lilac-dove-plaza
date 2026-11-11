# Batch handoff — Claude Societies

## Backlog items (IDs from docs/parallel/FULL_GAME_BACKLOG.json; Codex flips statuses on merge)
| Item | Backlog ID | Status |
|---|---|---|
| NPC docked-hull sea exploration (no exact ID; advances the NPC side of these) | BOAT-SHARED (shared moored hull replaces canoe-equipment blocker for rival exploration), WORLD-ACTIVITY-LIVE (visible foreign explorers) | source pushed |
| Raiders physically returning / bounded pursuit recovering stolen cargo | 107 (with 97 for escorts/ambush) | queued |
| Need-based caravan trade with actually held goods | TRADE-NEEDS | queued |
| Chat-derived gaps from agents/claude-coordination handoff: G5 rise-and-fall, G6 culture naming, G11 village personalities | G5 / G6 / G11 (coordination IDs) | queued |

- Lane / task ID: A-Societies · NPC docked-hull sea exploration (deliverable 1).
- Owner / claimed files: Claude Societies. New `src/game/seaExploration.ts`, `scripts/rival-sea-exploration.test.mjs`; orchestration hooks in `coastalTrade.ts`, `coastalCommission.ts`, `rivalDevelopment.ts`, `scoutProvisions.ts`; registry line in `workCommitments.ts`.
- Shared-file edits needing Codex sign-off: `src/game/types.ts` only — two optional fields: `Unit.seaExplorationId?:number`, `GameState.seaExploration?:SeaExplorationState`. No edits to sim.ts/engine.ts/constants.ts/persistence.ts/boats.ts/boatSailing.ts. `scoutProvisions.ts` (two guard lines so a sea crew's pack is not refunded mid-voyage and a dead crewmate's pack is reconciled by the voyage) and `workCommitments.ts` (`seaExplorationId` registered as a committed task) are small shared seams — please confirm.
- Base main / branch / commit: base origin/main 8f635f6 · branch agents/claude-societies · head 3adc249 (WIP 4b2411b + merge bfd7865 + finish 3adc249).

## Before → after
Before: rivals funded a hull only after observing a foreign hall (coastalCommission), so a society with an unknown coast never went to sea; the old personal-canoe equipment path could be blocked by one injured canoe owner.
After: every 120 s each living rival reviews its OWN knowledge grid (`rivalKnowledge` cells + live own-unit/building cells). If unknown water adjoins known water on the same connected water body and no partner hall is yet known, it:
1. reuses an idle owned hull moored at a finished own dock, or pays dock (via `developRivalCoast`) and hull (via `beginRiverboat` → haulage bench) from actual stores; builder labor is real; no free hull, no carried boats;
2. musters 2–3 healthy free adults (≥60% hp, not thirsty, not injured/prisoner/dependent/militia/committed/carrying), keeping 3 adults home; the injured canoe owner is simply ineligible and blocks nothing;
3. each crew member walks to an actual cache and loads a finite `scoutProvisions` pack (420 s budget, keeps 450 s home meals/180 s water), walks to the hull and boards;
4. sails legs toward the nearest unknown frontier cell (`commandRiverboat`; sailing/rowing physics untouched), recording only cells within 40 m sight of the hull, coast cells, plausible landings and halls within the settlement witness radius;
5. turns home on: no frontier (`surveyed`), 6 legs, 420 s, provisions below return-time+60 s, foe within 24 m, blocked route, or owner recall;
6. lands at the recorded dry home landing, walks to the cache, refunds leftover pack food/water through `returnScoutPackAtCache`, and only then commits the report cells into that society's `rivalKnowledge`.
Rejection reasons are counted per society in `state.seaExploration.teams[].reasons` (partner-known, water-preparing, no-frontier, no-reachable-water, no-hull-materials, no-builder, hull-pending, no-crew, no-provisions, home-meals, hull-lost, crew-lost, route-blocked, hull-reassigned, cancelled) and mirrored to `recordCoastalReview(...,'sea-explore',...)`. Retry after 600 s on finish.

## Shared contracts
- IDs: voyage id from `g.id()`; `Unit.seaExplorationId` ↔ active voyage `crew` (minus `home`/`left`). One open voyage per team. Boat ownership never changes; `seaExplorationOwnsBoat` makes coastal trade refuse that hull; coastal commissioning waits while a sea hull is being paid.
- Crew death: dead member's pack moves to an adjacent living mate within pack limits; remainder booked `foodLost/waterLost`. Capture: pack handed to the prisoner via existing scoutProvisions captivity rule. All crew lost → `lost`, hull retained, report not committed.
- Hull loss: survivors try to wade to a connected dry shore; after 120 s without one they are released (recalled, pack kept) and the voyage is `lost` with failure `hull-lost`, report unconfirmed.
- Cancel: `cancelSeaExploration(g,id)` — commission/ready: paid dock/hull stay owned; mustering: land and unload packs; outbound: sail home (`recall`). Direct interrupt of an ashore member releases only that member (`pauseSeaExploration`).
- Conservation ledger per voyage: `foodLoaded = foodReturned + foodUsed + foodLost + foodWithPeople` (same for water), asserted in tests.

## Save
`state.seaExploration` optional; absent = no voyages (old saves load; any `seaExplorationId` without the root is rejected). Validator `validSeaExplorationState` runs inside `validCoastalTradeState` (existing persistence path): versions, phases, reasons, ids < nextId, cell indices, bounded arrays, points in world, unique crew across voyages, unit↔voyage back-references, outbound/returning require departure and a living owned hull.

## Checks (exact commands)
- `node --import ./scripts/game-loader.mjs --test scripts/rival-sea-exploration.test.mjs` → 7/7 pass: full lifecycle with food+water conservation and save→strict reload at every phase (commission, ready, mustering, outbound, returning, landing, unloading, complete); no hull → paid commission (40 logs/4 stone exactly once, no free hull); injured canoe owner neither crew nor blocker; unseen inland hall stays unknown and absent from memory; crew death mid-voyage with pack transfer then total crew loss (hull retained); provision exhaustion → early return, leftovers refunded; rejection reasons + cancel before departure; old save loads / dangling refs and bad phases rejected; hull loss in open water.
- Regression set: `node --import ./scripts/game-loader.mjs --test --test-concurrency=4 $(ls scripts/*.test.mjs | grep -E "rival|scout|boat|sail|save|coastal|persist" | grep -v -E "food-search-arrival|hunting-route-arrival|rival-sea-exploration")` → head 139/160; identical command on a `git archive 8f635f6` copy of base → 139/160 with the exact same 21 failing cases (diff of failing names is empty). Of those, 7 files fail at import here (`three`/`typescript` packages absent: autosave-*×5, boat-class-components, boat-selection) and 14 cases fail identically at base in this container (e.g. float-tolerance 27.979≠28, 475.61650734376104≠…611, riverboats strict save, coastal-autonomous-profit:56, expanded-rivals, rival-tool-upkeep, sailing-rig). No new regression; the base failures are environment/pre-existing and were not investigated further.
- Typecheck: global tsc 7.0.2 with repo tsconfig aborts on missing `node`/`vite/client` types and removed `baseUrl`; with a scratch config (types:[], baseUrl unset, include src/game) there are 0 errors in any touched file (remaining errors are missing `three`/vite module types in src/scene and storageCodec, unrelated and pre-existing).

## Fixture vs native evidence
Fixture only: authored flat world with one straight water channel (|z|<8), a finished dock beside team 1's hall, partner hall inland at (150,150), `rivalKnowledge` emptied, weather/raids/calamities/sea events suppressed, `scoutTimer=1000` (validator max), water navigation primed synchronously (`waterNavigation(g,true)`) because the NPC request path prepares it in wall-clock slices. No native-terrain, browser or built-UI acceptance was possible here. Overall acceptance stays 34/98.

## Remaining defects / interface requests
- Codex: (1) people left in deep water after any hull loss cannot move (`steer` escape radius ≤8 m and `canStep` refuses deep water) — sea exploration bounds this at 120 s, but coastal trade voyages stay paused forever; needs a swim/drift-to-shore rule. (2) `toggleSail` banners for every team, so NPC crews do not raise a fitted rig; please add a quiet path (e.g. team≠0 suppresses banner) and sea exploration will call it. (3) `sailRigPhysicalIssue`/`hullServicePhysicalIssue` check `coastalVoyages` and `b.exploration` but not sea exploration; covered while crew are aboard (committed task) but not during mustering.
- Grok: route attempts into unknown cells use `commandRiverboat`/`riverboatDestination`, which consult true terrain to decide reachability (the attempt fails rather than revealing terrain, and failed cells are only marked probed). A knowledge-limited water planner would remove this residual.
- Water-navigation readiness is wall-clock sliced (existing pattern shared with coastal trade), so exact review timing is not bit-deterministic across machines.
- Policy: a society that already knows a partner hall does not explore (trade gets the hull). Revisit if exploration for resources/expansion is wanted.
- Not covered by tests: crew capture mid-voyage, foe-proximity return, owner recall at sea.

## Rollback / next batch
Rollback: revert the sea-exploration commits. Saves written mid-voyage by this build carry `seaExploration`/`seaExplorationId`; whether an older build accepts those extra fields was not verified.
Next: backlog 107 audit result — raiders already return physically (`seaRaiderReturn.ts` boat/overland return, `campRaidAI` carries stolen goods to camp). The missing piece is recovery: there is no ground-cargo entity, so a raider killed while carrying stolen goods has nowhere to drop them. Proposed batch: a new `stolenCargo.ts` (societies) holding finite dropped parcels `{id,team(owner),kind,amount,x,z,droppedAt,fromRaidId}` in optional `state.droppedCargo`, created at the death reconciliation of a team-3 carrier, recovered by the original owner's nearest free adult within a bounded pursuit radius/time, otherwise reclaimed by raiders; needs Codex sign-off for one death-hook line in sim.ts and Claude Experience for a parcel mesh. Then TRADE-NEEDS caravans, then G5/G6/G11.

State: source pushed to agents/claude-societies; ready for Codex review; not merged/published.
