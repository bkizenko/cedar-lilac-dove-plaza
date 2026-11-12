# AUTOPILOT.md — Hearthwild exhaustive execution plan

_Single source of truth. Agents re-read this file from `origin/main` at the start of every loop and after every reset. Update only the Status and Evidence cells of the row you finished (one line). Add new audit items as new rows; do not silently drop rows._

Paste-ready operating system and three agent prompts covering every outstanding feature in the completion plan, Astra backlog 01–25, the 120-item catalogue, 98 frozen gates, geography/biomes, QA and request-audit rows, chat/board gaps, World GW items, wiring queue, and later additions. Frozen acceptance stays **34/98** until native-terrain or built-UI evidence says otherwise. Single-owner file rule is lifted (`origin/main` `9bd490b` plus Boris). Codex and Claude sessions may reset; this file on main is how they resume.

Sources: `origin/main` COMPLETION_PLAN.md, FULL_GAME_BACKLOG.json, TASK_LANES.json, CURRENT_STATUS.md, GROK_CLAUDE_MERGE_HANDOFF_2026-11-11.md, ASTRA_BACKLOG.md, docs/ASTRA_PLANNING_HANDOFF.md, docs/INCENTIVE_FIRST_MASTER_PLAN.md, docs/FUTURE_IMPLEMENTATION.md; `origin/agents/grok-world` grok-world.md (W7 `c0b54fa`); `origin/agents/claude-coordination` claude-coordination.md; Societies and Experience handoffs; `codex-platform.md`.

---


## How to use this file (reset-proof)

1. `git fetch origin` and read `docs/parallel/AUTOPILOT.md` on `origin/main`, plus `docs/parallel/handoffs/claude-coordination.md` (the board) and your lane handoff.
2. Find your next unfinished item: walk your queue in this file in order (Tonight → This week → Then → Later). Skip `done/live`, skip `gated on Boris` unless the decision card already approved it, and skip `explicitly later/out of scope` until your Then queue is empty (Later items say when they may start). Confirm against `git log origin/main` and the board so you do not redo landed work.
3. Run the operating-system loop: build, focused test, `tsc`, normal merge to main, one board line with the SHA, update this table's Status/Evidence for that row, next item.
4. Never ask Boris for anything except by logging a block on the daily decision card. If a session reset, start again at step 1 with the same starter prompt — this file and git history are the memory.
5. Grok posts the daily merge and the short summary (what's newly playable, decisions needed).

## Operating system (shared — Boris sends this once)

Boris's goal: send these prompts once and the whole game gets built over several days with no babysitting.

**Roles**
- **Grok** is execution PM: sequencing, assignment, unblocking, the board, and the daily merge to main. Grok also builds the World lane (terrain, navigation, placement, civil engineering, water, territory) end to end, including wiring.
- **Claude** is architect: owns system design, interfaces and cross-lane contracts, and resolves design disputes. Claude also leads merge-conflict resolution when the dispute is about design, and builds diplomacy, leaders, succession, international systems, the visual overhaul, and the Worker/curd UI conflict.
- **Codex** is the platform, economy, saves, integration, and knowledge/tech builder (knowledge/tech stays with Codex until Boris decides otherwise). Codex parks the sim Worker until the speed/wiring work in its queue says otherwise.

**Anyone may read, edit, commit, push and normally merge any repository file**, including core source, saves, backlog and coordination documents. No Codex approval is required. GitHub authentication in each external session is separate from these project permissions. **Anyone may edit or wire any file.** The agent that owns a feature builds it end to end, including parts outside its lane. Others only review. Every shared-file edit gets a one-line board entry (file, hunk intent, SHA).

**Continuous loop** (every agent, all day): pull `origin/main` → take the next queue item → build it → one focused test + `tsc` → merge to main (normal merge) → post one board line with the SHA → repeat. Never stop to wait for Boris. If blocked more than 15 minutes, skip, pick the next item, and log the block on the daily decision card. Ship behind a switch if unsure. Target 45–90 minutes per item. Features turned on in the built game are the only progress that counts. No evidence novels.

**Conflicts:** whoever hits a merge conflict resolves it immediately, keeping both sides' behavior. Claude resolves design-level conflicts. Never force-push or rebase pushed work. Restore green tests before moving on.

**Self-improvement:** when a queue empties, audit the game in your lane (play the built game headless, check performance, bugs, UX gaps, missing feedback, balance), add new items to your queue and the traceability table, and continue. Grok re-audits the whole plan for gaps every day.

**Stop:** run until Boris says stop, or until two consecutive full audits by all three agents find no meaningful issues. Then post a final report: what's live, what's gated, remaining later/out-of-scope items, and SHAs.

**Guardrails:** preserve the live deployment and Boris's village/saves; old saves must keep loading. Visuals are pre-approved by Boris (2026-11-11 20:40 ET): Claude ships visual work without waiting for review; keep screenshots small and only where useful. Gated decisions (shored cuts, knowledge/tech ownership, and any new ones) go on a single daily decision card; work everything else in the meantime. Desktop only; no mobile scope. Do not migrate engines. Do not invent free goods, teleport, shrink collision, or flatten terrain indiscriminately.

**Daily (Grok posts):** one merge to main, and one short summary for Boris — what's newly playable, and decisions needed. Judge agents by features on in the game.

**Velocity rules (every item):** normal merge from main; one focused test; `tsc`; push; merge to main daily; 45–90 min; 15-minute block rule; ship behind a switch; one board line with the SHA; no rebase/force-push; native-terrain evidence is one short note, not a report.

---

## Codex queue

```
Codex: operating mode until Boris says stop, or until two consecutive full audits by all three agents find no meaningful issues.

GOAL: features turned on in the built game. Docs and evidence write-ups are not wanted unless asked. Frozen acceptance stays 34/98 until native/built evidence says otherwise.

ROLE: platform, economy, saves, integration, and knowledge/tech builder. You merge integration work to main (normal merges). You do not take World core wiring — Grok is doing W7, the canal-breach fix, validators, canal commission, water-works buildings, the flow-field switch, the sea-tide mesh, driftAt and scenicStartReport. Claude is architect (contracts, design disputes, conflict-resolution lead) and owns diplomacy/leaders/succession/visuals and the curd UI conflict.

LOOP: pull origin/main → next item → build → focused test + tsc → merge to main → one board line (what's live, SHA) → repeat. Never wait for Boris. Blocked >15 min: skip, log it on the daily decision card, continue. Ship behind a switch if unsure. 45–90 min per item. Anyone may edit any file; list shared-file edits on the board. Conflicts: resolve immediately, keep both sides' behavior; Claude decides design disputes. No rebase/force-push. Restore green tests before moving on. Preserve the live deployment and Boris's villages/saves; old saves must load. When your queue empties, audit platform/economy (headless play, perf, bugs, balance), add items to your queue and the traceability table, and continue.

WORK QUEUE — do in order, one at a time. Done = merged to main, on in the built game (or behind a named switch), one focused test, tsc clean. Do not re-do items marked done/live.

TONIGHT
B1 (PM bug 2026-11-11 21:40 ET, player-facing saves, do first). scripts/play-flow.test.mjs regressed at T1 integration d657e26: Engine.beginLifecycle calls this.autosave.invalidate() (engine.ts:63, from Worker lifecycle 27dafd9) and startTestSession is now async, so 'a failed durable save never creates a disposable copy or reports test entry success' fails (pass at de24669). Confirm a failed durable save still refuses test entry in the built game, then fix code or fixture. Done: play-flow green.
T1. Integration: review and merge PR #1 (https://github.com/bkizenko/cedar-lilac-dove-plaza/pull/1, head integration/2026-11-11) and LAND the whole agents/claude-societies branch after Claude finishes the curd UI conflict and the fixed-camera world.ts review. Normal merge, no partial hunks. Restore green tests (canal-breach fix is Grok's). Done: those branches are on main without dropping naming, storms, conquest, World W7, or Worker/curd behavior.
T2. WQ-14 Societies primitives in types/persistence/production/husbandry/workCommitments: do not wipe itemCargo on trade carriers (or call dropTradeCargoItems); moveArmorAsset; weapon body-bundle holder; transferable farm-tool record with condition; Livestock.ledBy honoured by husbandry/pens; Unit.cargoRecoveryId + COMMITTED_TASKS. Done: armor/weapons/tools/animals can be traded without ghost inventory.
T3. C6: real wade/swim-to-shore after hull loss (steer/deep water), not a 120s release. Coastal trade must not pause forever. Done: stranded crew reach a connected shore or another hull on a native water test.
T4. C11: publish hull length/beam from boatClasses; confirm wonder-kit preset save location. Done: Experience can size hull meshes; presets round-trip.
T5. WQ-7 eraMode rebuild/extend: gameplay benefits hook (health and/or production capacity/durability, not looks only) + optional save field and validator for built era/extensions. Wire extensionFootprints.ts / extensionTerrainCheck. Done: a rebuild/extension changes stats; old saves load; Experience can flip DEFAULT_ERA_MODE.
T6. Prestige/score formula (INC-SCORE, BOARD-G1 Codex side, GW-09 score): versioned components (usable area, resources/chokepoints, healthy population, food-security days, adopted practices, useful trade, defended war aims, civic works). Caps and diminishing returns; no infinite flags or spoiled-food hoards. Known-vs-unknown rivals; no private-stock leak. Done: a breakdown is visible and tunably weighted.
T7. Land work/codex-curd-2026-11-11 (be54590) once Claude T1 is in; then remaining dairy/cheese (catalogue 39 remainder). Done: cultured curd is in the built game with vessel conservation.

THIS WEEK
W1. Horses, pack transport, traction, goat-find order reliability, broader species (CAT-37–40 remainder, M3-06, QA-043, INC-GOAT-FIND, INC-HORSES except chariots). Done: find-goat search/capture/escort/pen works with bounded failure reasons; pack capacity scales with real animals; no invented herds.
W2. Knowledge/tech redesign (ORGANIC-KNOWLEDGE, CAT-71–80, M4-03, REQ-36/37, ASTRA-17 superseded): visible provenance observed/taught/traded/captured; known/partly/unknown; experiments cost time/labor/fuel; samples come home first. Keep building — the ownership card does not pause this. Done: a demonstrated technique spreads only through learning/trade/migration, never a silent age button.
W3. Food taste table G7 (CHAT-G7); clothing balance CAT-14 remainder (heat/wet/repair/dyes); brewing INC-BREWING (grain/malt/water/fuel/vessel/labor, fermentation, spoilage, optional morale; not a water sterilizer). Done: taste affects morale measurably; beer exists as a real chain.
W4. Crafting and metallurgy (M4-10, CAT-51–60, 57 tool recipes, QA-023, QA-037, INC tool durability): garments, pottery, charcoal, copper/tin/bronze/iron, wear, workplaces. Done: each material chain has paid work, finite inputs, and a used output.
W5. CONTAINER-IDENTITY / QA-029/030 (liters, tare, seal, condition, maker, one owner/location); RESOURCE-VOLUME (driver, including HUD: seeds off compact HUD, per-item volume/weight); CEREAL-BYPRODUCTS (driver: chaff/straw outlets, no jammed food workers). Done: inventories are physical volumes; byproducts have uses or disposal.
W6. Armor follow-ups A2–A4 after live padded vest 9c81021: condition through death/theft/save; combat protection and burden; hide armor, shields, helmets after their inputs exist (metal helmets need W4). Repair. Done: owned armor assets never reset wear or duplicate on reload.
W7. Economy side of markets/prices (M3-03, CHAT-G15 prices). Claude drives offers/frequency/UI. Done: known offers and handling cost are measurable.
W8. Finish M0-07/08 atomic reservations for remaining executors (crafting, husbandry, expeditions, captivity); M0-09 + ASTRA-23 versioned sim RNG and timestamped replay; M0-10 command latency/steal/reservation metrics; M1-05 six difficulty profiles; M1-14 food attention and local depletion. Done: each has a focused test on a live path, not a fixture-only claim.
W9. INC-PERSONAL-ABILITIES (compact stats, practice, teaching); WORKLOAD-CONSEQUENCES (real queues, no fake failures). INC-QUARRY reachable deposit area/capacity. Building-wear remainder QA-009. Shelter/fuel/sanitation leftovers CAT-13, 18, 19.
W10. Graphics quality memory (Low/Medium/High remembered; no pipeline color shift) INC-GRAPHICS-QUALITY. C5 phase-registry only if it unblocks a hook — do not expand the parked Worker.
W11. Disable-to-migrate food-custody prototype (26fe69b) only after every transport consumer has moved. Clay → mud-brick chain if still open.

THEN
N1. Victory scenarios M4-16..20 (prosperity, commerce, dominion without compulsory extinction, knowledge, legacy) plus continuation; run with Claude's AI goals already hooked to T6.
N2. CAT-116 administrators (competence, policy scope, reports). M4-04/05 Bronze/Iron/Classical population + sustainable reserves and small specialized societies.
N3. Release acceptance you own: M5-01 full campaign; M5-06 8GB median≤33ms / p95≤50ms at 100 visible residents (after this queue; then unpark Worker); M5-08 named parameters/metrics; M5-09 holdouts; M5-10 + ASTRA-25 packaging. Codex maintains FULL_GAME_BACKLOG.json / COMPLETION_LOG; Claude and Grok may also update them under Grok sequencing, using matching native/built evidence (CP-7). This assignment is not an exclusive write permission. M5-02/03/07 are already verified — do not re-queue.
N4. ASTRA-04/05 save/cadence gaps if any remain vs acceptance; ASTRA-09 spatial query budget; ASTRA-08 vertical-slice gate (desktop; mobile is out); ASTRA-11 survival leftovers; ASTRA-24 perf/balance soak.
N5. Remaining hull classes, sail repair, naval-warfare economy (CAT-93/99 remainder). CAT-100 warehouses.
N6. MS-2/MS-4 integrated scenarios (priority override during paid work; boat/caravan delivery + interception + save). You run the connected scenario; Claude owns raid/treaty scenarios.

LATER (do not start until Then is empty, except as noted)
L1. Parked sim Worker (C2 / work/sim-worker-2026-11-11, p95 67.74ms missed 33ms). Revisit only after N3 speed work.
L2. FIRST-PERSON-LATER (optional; share movement/damage APIs, keep RTS).
L3. Isolated engine evaluation (INC-ENGINE-EVAL). No wholesale migration.
L4. 1700s / firearms / mounted armies / chariots — retained, not first-release critical path (GOV-ENGINE-LATER-AGES).
L5. GOLD-SILVER-EXCHANGE (later monetary media). Optional AGENTS.md trim.

DONE — do not re-queue: cultured-curd scoped flow41f5870 (native/built vessel conservation; full integration PR remains open); padded armor 9c81021; sheep/wool/sail 5f1b5e9; dairy vessel recovery + NPC sea integration f09578d; G10 fog persist 39115987; renderStyle 860863a; instance LOD d4d3cba; quiet NPC toggleSail 1a6e71e; perf scan batch d86d7da; verified gates M0-01..06,11,12; M1-01..04,06..13,15,17..20; M2-04; M3-01,10,11; M4-01,02; M5-02,03,07. CHAT-G9 lab flow is live-partial — only remaining lab actions, not a rewrite.
```

---

## Claude queue

```
Claude: operating mode until Boris says stop, or until two consecutive full audits by all three agents find no meaningful issues.

GOAL: features turned on in the built game. Docs and render reports are not wanted unless asked. Frozen acceptance stays 34/98 until native/built evidence says otherwise.

ROLE: architect — you own system design, interfaces and cross-lane contracts, and you resolve design disputes. You also lead conflict resolution, and you build diplomacy, leaders, succession, international systems, the visual overhaul, and the Worker/curd UI conflict. Grok is PM and World (and is wiring World core). Codex is platform/economy/integration. Knowledge/tech stays Codex until Boris decides.

LOOP: pull origin/main → next item → build → focused test + tsc → merge to main → one board line (what's live, SHA) → repeat. Never wait for Boris. Blocked >15 min: skip, log it on the daily decision card, continue. Ship behind a switch if unsure. 45–90 min per item. Anyone may edit any file; list shared-file edits on the board. Conflicts: resolve immediately, keep both sides' behavior; you decide design disputes. No rebase/force-push. Restore green tests before moving on. Preserve the live deployment and Boris's villages/saves; old saves must load. Visuals are pre-approved: ship them. When your queue empties, audit societies + visuals (headless + real three.js when the desktop is linked), add items to your queue and the traceability table, and continue.

WORK QUEUE — do in order. Done = merged to main, on in the built game (or behind a named switch), one focused test, tsc clean.

TONIGHT
B0 (PM suite 2026-11-11 22:47 ET, do first). tsc error in src/game/rulersRuntime.ts:80 from expansion drivers 72cf269: `b.type==='tower'` is not a BldType (the sim type is `watchtower`; also keep/palisade/stonewall). Integration tsc is not clean. Done: tsc clean; fortified-neighbour detection uses real defensive types.
T1. Resolve Worker vs curd in src/ui/CraftSiteQueue.tsx and ProductionControls.tsx. Keep both curd/food mechanics and async typed owner commands/read-model queries. Do not restore main-thread mutation or route/eligibility helpers against the readonly projection. Merge onto integration/2026-11-11 (cbffbc8 or later), not the stale integration/claude-resolve-2026-11-11 tip 58e57f6. Done: curd can land; production UI works with and without the Worker.
T2. Review Codex fixed-camera 13-line edit to src/scene/world.ts (b86507f, already in PR #1). One-line yes or fix on the board before the PR merges.
T3. Flip DEFAULT_ERA_MODE to 'fixed' in src/scene/civBuildings.ts. Consume Codex's rebuild/extend benefits hook when it exists (looks change only with a rebuild/extension that has real health and/or production value).
T4. Draw Grok's smoothRivers(g) and trailRibbons(g) in world.ts (GW-12, QA-013). Optional current arrows from riverCurrentProfile.
T5. WQ-9 / IFACE-G8 / GW-04 visual: mesh yaw = buildingQuarterTurns(b)*π/2; draw river section.corners and show fishRecoveryPerMinute (QA-048 panel with Grok data).
T6. WQ-13 / E1 / G4: capitulation terms picker, domination status, captive panel, trade dialog (proposePlayerTrade / tradeAnswerBlocker / observedPartnerStock), dropped-parcel visual, LeaderPortrait beside LeaderConversation with actual relations and observed goods only.
T7. WQ-12 / C13: CarvedBuildingLayer lifetime bucket eviction so near buildings are not stuck as impostors.
T8. WQ-11 / C10 Option H adapter in world.ts: call site, light-rig swap/restore, H-only golden-hour daylight lerp (CHAT-G2); default renderStyle stays 'current'. Wire C12 lit from survivalNeeds.hearthHeating. Fix Experience tsc errors on the integration branch.
T9. Architect: publish any missing contracts Codex/Grok need tonight (eraMode benefits shape, trade-holder fields, water-works admission UI). Do not block them — they wire end to end.

THIS WEEK
W1. Visual overhaul live behind Option H (CP-5, CP-3, ASTRA-18, M4-11/12/13): wire biomeTerrain, civBuildings/civShowcase, civPeople, wonderKit (unique per game, presets). Postfx: baked AO, haze/fog, bloom, grade. Ground buildings with sampleSite — no generic platforms (QA-006, QA-017). House/workshop variation and original cultural identities (INC-HOUSE-VARIATION, INC-CULTURAL-IDENTITIES, QA-007, QA-050 wonders). Check it in real three.js against the concept art yourself, then turn Option H on by default once performance holds, keeping the current style as a settings fallback. Blender only for hero assets later. Visuals are pre-approved by Boris; no review wait.
W2. Diplomacy, leaders, succession, international — playable in the built game (M2-01..03, 05..16; CAT-25–27, 81–90, 97–98, 101–110, 111–115, 117–118, 120; CONTEXTUAL-CONFLICT). After societies lands: turn on G6 names, G11 personalities, G16 storms (use Grok deepWater, not an ad-hoc 2.5m test), stolen cargo (C14 conservation), armed caravans, market-driven trade frequency (CHAT-G15), siege (S1/S3, rivalSiege.ts), annex escalation, captive revolt (M3-16), raider camps that can settle (INC-RAIDER, QA-010, CAT-107). Call planObservedWaterRoute for NPC voyages. G5 rise and fall (collapse, refound, game continues with zero rivals). VILLAGE-REQUESTS. TRADE-NEEDS, TRADE-LABOR. Defense horn, militia stand-down (INC-MILITIA). Player-initiated and NPC↔NPC alliances, treaties, war/recovery. Succession keeps agreements (M2-13).
W3. Audio: ASTRA-03 adaptive score, ASTRA-22 natural SFX, M4-15, Experience ambientMix. Licensed credits; no oscillator music; mute/dispose clean.
W4. Consume Grok site facts (IFACE-G6 tides/exposure/flow/width/banks/harbour levels) in harbour/market/wonder grounding.
W5. Crop identity on terrain (INC-CROP-IDENTITY): distinct grain/pulse/tuber silhouettes, contour-true.
W6. Player tribe name, symbol, flag, palette persist on diplomacy, flags, ships, armor, civic buildings (INC-TRIBE-FLAG).
W7. Review 14-civ bible against SIX-CULTURE / QA-063 inspirations (original cultures, not 1:1 modern presets).
W8. WORLD-ACTIVITY-LIVE: foreign explorers, traders and raids must appear on the reported saved village (driver, including any sim dispatch bugs).
W9. Confirm C15 scout-food custody consumers; typed loads stay off until you and Codex agree.
W10. ASTRA-07 RTS selection/combat leftovers if any (drag select, attack-move, hold). INC-MINIMAP-SQUARE (thin muted square). Start M4-14 compact desktop controls.
W11. Incidental: raiders retreat to a real camp (not idle at shore); NPC villages clear forest for building.

THEN
N1. HUD/teaching ASTRA-21; SEASONAL-REPORT-UX (you drive the UI; Codex supplies numbers). M4-14 finished.
N2. Death/job animation ASTRA-12; shared character rig ASTRA-13 (licensed, recorded provenance).
N3. Soft counters and formations ASTRA-15; commanders/formations CAT-109; shooting towers INC-TOWERS (paid height, real projectile release, unfinished towers do not shoot).
N4. Strategic tribe director ASTRA-16 remainder; regional logistics CAT-117; breakaways CAT-118; federations/vassalage CAT-120.
N5. RUIN-EXPLORATION (driver, including knowledge-grant rules: discoveries must not silently grant unrelated tech). REQ-34 find people/ruins.
N6. Naval combat presentation and sea-raid visuals (CAT-98, INC-NAVAL remainder). Armor readable equipment A4 visuals.
N7. M5-04 new map gallery (you drive desktop visual review with Grok's terrain). MS-3/5/6 connected society scenarios (treaty/recovery; raid aftermath; hall-loss refound already partly live as M1-03).

LATER
L1. Blender hero assets (wonders, ships, portraits) and baked detail only after the overhaul is approved.
L2. BOARD-G12 fun-loop metric — only if Boris approves it on the decision card. Until then, skip.
L3. QA-025: discard temporary review screenshots once fixes are verified.

DONE — do not re-queue: NPC docked-hull sea exploration live at f09578d / 01e6f66; C1 renderStyle live 860863a; C3 LOD live d4d3cba; C4/C7/C8 sail/hull seams live. Experience batches 1–8 and Societies conquest/names/storms/trade are source-pushed (9992fe9, e69b8f8) — turn them on in W1–W2, do not rewrite them.
```

---

## Grok queue

```
Grok: operating mode until Boris says stop, or until two consecutive full audits by all three agents find no meaningful issues. You are World lane and execution PM.

GOAL: features turned on in the built game. Docs and extra coordination files are not wanted unless asked. Frozen acceptance stays 34/98 until native/built evidence says otherwise. One board, one line per item.

ROLE (PM): sequencing, assignment, unblocking, the board, the daily merge to main, and one short daily summary for Boris (what's newly playable, decisions needed). Re-audit this whole plan for gaps every day. Collect one decision card per day (open now: shored cuts; knowledge/tech ownership; G12 fun-loop only if someone asks). Do not wait on those cards — agents work everything else.
ROLE (World): terrain, navigation, placement, civil engineering, water, territory — and you wire your features end to end, including persistence, UI, buildings and scene hooks. Tonight you own W7 plus the canal-breach integration fix and World core wiring (validators, canal commission, water-works buildings, flow-field switch for new games, sea-tide mesh, driftAt, scenicStartReport). Claude is architect. Codex is platform/economy/integration.

LOOP: pull origin/main → next item → build → focused test + tsc → merge to main → one board line (what's live, SHA) → repeat. Never wait for Boris. Blocked >15 min: skip, log it on the daily decision card, continue. Ship behind a switch if unsure. 45–90 min per item. Anyone may edit any file; list shared-file edits on the board. Conflicts: resolve immediately, keep both sides' behavior; Claude decides design disputes. No rebase/force-push. Restore green tests before moving on. Preserve the live deployment and Boris's villages/saves; old saves must load. No camera code (cameraClearance.ts included) — Codex's fixed-angle collision (b86507f / 3ec1beb) is the decided approach. When World queue empties, audit terrain/nav/placement/water in the built game, add items, and continue. World status lives only in docs/parallel/handoffs/grok-world.md; the board stays short.

WORK QUEUE — do in order. Done = merged to main, on in the built game (or behind a named switch), one focused test, tsc clean.

TONIGHT
B2 (PM suite 2026-11-11 22:47 ET, do first). 6b63db5 cools tribal tension while influence fields recompute, so scripts/witnessed-frontier-claims.test.mjs fails: "known old claim remains a grievance" (tension drops during 4.4s away). Isolation: pass on main 02eca7b, fail on integration. Done: a witnessed claim's grievance does not fall just because fields are unready.
B3 (PM suite 2026-11-11 22:47 ET). Extra historical worldgen byte-identity failures on integration vs main 02eca7b isolation: v14-map-reliability 1/1040/random; v16-coasts V15 42/continents; v17-legacy V15 42/continents and V16 1/pangaea; v18-legacy V17 1/pangaea; v19-legacy V18C4b 0/continents and 1/pangaea. Many sibling hashes already failed on both trees. Done: the new-title hashes match, or the generator change is explained and fixtures updated deliberately.
B1 (PM 2026-11-11 21:40 ET). Reconcile Codex's World handoff work/shipping-waiting-hooks-2026-11-11 9e4a145 with agents/grok-world: normal merge conflicts in src/game/{engine,persistence,sim}.ts, src/scene/ruins.ts, src/ui/{Hud,WorldSetup}.tsx; keep both behaviours, then land on main. Done: draft wiring is live or explicitly superseded on the board.
T1. Land World W7 (agents/grok-world c0b54fa, already in PR #1) and fix the merge-induced canal-breach failure (scripts/canal-breach.test.mjs on integration cbffbc8: breach.length actual 8, expected 9). Done: canal-breach 3/3 on the landed tree; a finished channel can breach, an unfinished one cannot.
T2. WQ-1..3 validators in persistence.ts: optional worldOptions.riverProfileVersion===2, tideVersion===1|2, landformLabelVersion===2; absent = historic. Done: old saves load; flagged worlds persist.
T3. Canal/aqueduct commission UI: planAqueductWorks/planCanalWorks, same plan for preview and commit; validCanalWorks in persistence (INC-CANALS, GW-06 jobs). Done: the player can commit a line as ordinary digs in the built game.
T4. Water-works buildings end to end — well, cistern, watermill, windmill, aqueduct, canal (WQ-4, GW-05/06, QA-031/032): types, recipes, placement, labour, admission from waterWorks.ts / waterLineWorks.ts / canalBreach.ts. Hook currentPowerKw to mill rates; wells in survivalNeeds.sourceFor (auto water). Done: placeable and productive in the live game.
T5. WQ-5: review flowFields.ts / sim.ts seam, then turn the per-game switch ON for new games (historic A* when off). Done: 100+ residents path via fields in a native run when the switch is on.
T6. WQ-6: sea plane and minimap shoreline y = world.waterY + (world.seaTideY ?? 0); rivers and lakes stay at the weather level.
T7. driftAt on boats; scenicStartReport feeds new-game town-hall pick (GW-15, M1-17 hook). currentPowerKw if not already in T4.
T8. WQ-8 / GW-08 control: R-key or ghost button in engine.ts passes quarterTurn to both preview and commit. Mesh yaw is Claude T5.
T9. WQ-10 / GW-02 / GW-10 / IFACE-G9: wire planFieldArea and fertilityPreview in the placement UI; optional per-section fish cap (GW-04 stock). Preview verdict equals commit.
T10. PM: post board lines, keep the decision card current, land today's merge to main, write the short summary for Boris.

THIS WEEK
W1. Hook dominatedTerritory.ts so influence follows the overlord while occupation.phase==='dominated' and reverts on lapse/rebellion (IFACE-G4, GW-09 remainder).
W2. Engineered roads (CAT-92) and bridges/fords (CAT-96) as real labour, materials, upkeep and navigation updates (M3-05 remainder).
W3. Irrigation/drainage (CAT-46, INC-IRRIGATION) from real connected channels; finite throughput; no universal fertility bonus.
W4. Finish mechanical-milling site/flow facts if anything in T4 is still abstract (GAP-MECHANICAL-MILLING, QA-031 millrace intake/outfall/head).
W5. M1-16 organic landscape families with varied prominence (prior ellipse/teeth gallery rejected). GOV-MAP-VARIETY and V13 topology (2–5 substantial landmasses, not one showcase mainland). MAP-CONTRACT-1..5.
W6. M1-21 moisture/soil/climate transitions and per-region resources. Biome dressing data for all 8 biomes (distinct grass/forest/reeds/scrub/alpine forms, dry placement, detail tiers). Data only — Claude draws (M1-22).
W7. Remaining ecology: forest succession CAT-5 / REQ-26, grazing/upland CAT-6, flood/drought/wildfire warning and recovery CAT-8, carrying capacity CAT-9, climate shifts CAT-10, soils/fertility/exposure CAT-2 if not already in sampleSite.
W8. FARM-LABOR-CALIBRATION / QA-051: explicit area, seed, net edible yield, person-hours, loss, soil, moisture. Abstract 260 yield is not kilograms.
W9. Automatic site preparation (INC-SITE-PREP, QA-020): accepted placement queues tree/loose-stone clearing, keeps paid materials, does not trap workers.
W10. Deep-water port and draft admission (CHAT-G14, IFACE-G14). M5-05: physical geometry agrees with depicted surfaces, farms, water, dry placement and navigation (you drive).
W11. Remaining GEO-1..32 defects (dead-end uphill rivers, distribution/cluster GW-11, waterfalls/rapids/estuaries quality). landformLabelVersion 2 already exists — turn it on for new worlds with T2/T5 style options.
W12. ASTRA-14 / CAT-65 remainder: army passes an open gate and routes around a closed one without teleport. Towers' combat use is Claude's.
W13. CHAT-G10 remainder: exact-radius observer attribution. Fog overlay is already live at 39115987 — do not revive the excluded provenance tracer.
W14. INC-TRENCHES leftover (smooth cut/fill, drainage, saved edits). INC-GEO-INFLUENCE: influence decays along real routes; mountains/seas block until transport exists.
W15. Wire wonder earthworks (wonderEarthworks.ts, already source-pushed) into live wonder jobs when Claude's wonder kit is on.

THEN
N1. WOODLAND-RESIDENTS (driver, including contextual conversations; Claude reviews dialog).
N2. Physical street/site/clearing labour for RIVAL-CITY-PLANNING (Claude reviews layout).
N3. L-wing extension shapes only if eraMode needs them.
N4. GEO-33..36 caves, karst, glacial, volcanic — assess and implement without fake heightfield tags; not every-map required.
N5. ASTRA-19 wildlife/habitat leftovers (bounded offscreen herds, signaled predators). Hunting economy is Codex.
N6. Turn on GW-14 townCapacity in settlement planning if multiple towns per landmass are still blocked in UI/rules.
N7. Headwaters/springs, elevated lakes, seasonal washes — remaining hydrology quality (GEO-16, 20, 21, 15).

LATER
L1. Shored cuts — only if Boris approves (optional shoring field + validator, timber/stone cost, steeper/deeper than 0.24 bank / 2 m). Until then leave the trench rule alone.
L2. Larger maps and nav at hundreds of residents (CP-6 world side), after Codex scale/LOD is in.
L3. Standing: daily whole-plan gap audit; add missing rows to the traceability table.

DONE — do not re-queue as new design: GW-01 tight-space nav (2a9fa79 / 5f2b1b2); GW-07 unseen moves 403f506; GW-04 sections cfcf3a8; GW-08 footprints 346faad; GW-09 land-value 10d6d81; GW-13 hikeable mountains 1b7cade; GW-14 townCapacity 70ed21c; flow fields source d2929b5; tides/deepWater/sampleSite/planObservedWaterRoute/dominatedTerritory source on agents/grok-world c0b54fa; G10 overlay live 39115987 + f41f395. These still need tonight's wiring/landing where noted (T1–T9), not a rewrite. GW-03 camera proposal is withdrawn.
```

---

## Daily rhythm for Boris

1. Play the live/published build for 10 minutes; send one list of what feels wrong if you want to steer. If you send nothing, agents keep going.
2. Answer the one decision card when you can (open now: shored cuts; knowledge/tech ownership; G12 fun-loop only if raised). Everything else proceeds without you.
3. Expect one merge to main per day and one short summary: what's newly playable, and any decisions needed.
4. (Removed: visuals are pre-approved; no review step.)
5. Target: about 15 minutes a day, or zero. Agents stop only when you say stop, or when two consecutive full audits by all three find no meaningful issues.

---

## Decisions Boris must make (daily card)

These are queued, not blockers. Agents work everything else.

1. **Shored cuts** — allow optional shored/revetted cuts (timber/stone cost, steeper and deeper than the current 0.24 bank / 2 m cap)? Default until answered: no, leave the trench rule.
2. **Knowledge/tech ownership** — keep with Codex, or move the redesign to Claude? Default until answered: Codex keeps building it.
3. **BOARD-G12 fun-loop metric** — adopt Claude's threat/decision/payoff session measure? Default until answered: no, not in any queue except Claude L2.

Already decided, do not re-ask: eraMode default is `fixed`, and a rebuild/extension must have tangible gameplay value; canal breach is allowed at the end of a finished channel only; camera is Codex's fixed-angle collision (Grok dolly-before-lift withdrawn); anyone may edit any file (`9bd490b`).

---

## Traceability table

Every source item is assigned to exactly one owner. The named owner builds the feature end to end, including parts outside their lane; others only review. Status vocabulary: `done/live` · `source-pushed-not-live` · `not started` · `gated on Boris` · `explicitly later/out of scope`. Agents update Status and Evidence in place, one line, when they finish or land an item. Frozen gates with credit 1 are `done/live` and must not be re-queued.

| ID | Source | Title | Owner | Queue | Status | Evidence |
|---|---|---|---|---|---|---|
| M0-01 | gate | Gather/job-assignment physical actor eligibility gives one rejection reason and bounded actor assessments | Codex | — (done) | done/live | batch1 |
| M0-02 | gate | Direct gather/drill interruption preserves already-paid transport progress and material charges | Codex | — (done) | done/live | batch1; batch4 |
| M0-03 | gate | Atomic reservation contract rejects partial claims and competing migrated actor ownership | Codex | — (done) | done/live | batch2 |
| M0-04 | gate | Migrated tree workers share physical workplace slots and reconstruct ownership after save/load | Codex | — (done) | done/live | batch2 |
| M0-05 | gate | Paid transport projects survive maker reassignment/death and resume on a replacement without repayment | Codex | — (done) | done/live | batch4 |
| M0-06 | gate | Construction interruption and paid-work resumption use a single actor/project owner | Codex | — (done) | done/live | preservationOwnershipPerformance |
| M0-07 | gate | Gathering, construction, hauling and all crafting executors use coordinated atomic goods/capacity reservations | Codex | Codex W8 | not started | Tree/paid-haulage migrations are partial; other direct-mutation executors remain. |
| M0-08 | gate | Transport journeys, husbandry, expeditions and captivity migrate through the shared ownership contract | Codex | Codex W8 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M0-09 | gate | Versioned simulation RNG and timestamped commands reproduce new-game outcomes across replay/save | Codex | Codex W8 | not started | Seeded world generation is not serialized simulation RNG or full deterministic replay. |
| M0-10 | gate | Command execution latency, blocked time, stealing and reservation failures are measured beyond eligibility | Codex | Codex W8 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M0-11 | gate | Priority and recall changes conserve full-handed cargo, escrow and paid construction across interruption | Codex | — (done) | done/live | m0Integrated20261102 |
| M0-12 | gate | Full M0 integrated scenario passes direct override/recall/construction/paid-work resumption without repair | Codex | — (done) | done/live | m0Integrated20261102 |
| M1-01 | gate | Default player and rivals start as unbuilt camps with finite possessions and no automatic pen | Codex | — (done) | done/live | batch2 |
| M1-02 | gate | Goods physically reach a reachable camp before credit; recall/save never duplicates cargo | Codex | — (done) | done/live | batch2 |
| M1-03 | gate | Losing a hall preserves a living society and its usable supply anchor | Claude | — (done) | done/live | batch2 |
| M1-04 | gate | Emergency occupants reach real entrances, respect capacity and become exposed when shelter is destroyed | Codex | — (done) | done/live | batch3 |
| M1-05 | gate | All six difficulty profiles centrally control abundance/climate/provisions/pressure with explicit advantages | Codex | Codex W8 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-06 | gate | Water collection traverses a discovered physical bank and returns finite cargo through interruption/save | Codex | — (done) | done/live | batch4 |
| M1-07 | gate | Cold consumes real stored fuel and shelter/fire benefits affect measured gradual exposure | Codex | — (done) | done/live | batch4 |
| M1-08 | gate | Desktop needs panel/ledger show actual reserves, physical-action availability and one disabled reason | Codex | — (done) | done/live | batch4 |
| M1-09 | gate | Rest, shelter, clothing, tool wear and repair form a viable survival production loop | Codex | — (done) | done/live | survivalMaintenance20261102; sheepWoolSailingNov11 |
| M1-10 | gate | Tracking, hunting, carcass handling and wildlife hazards provide meaningful finite food | Codex | — (done) | done/live | expandedPlayableNov2 |
| M1-11 | gate | Fishing uses actual reachable freshwater/coastal banks with physically returned catches | Codex | — (done) | done/live | bankFishing20261102 |
| M1-12 | gate | Early animals require real capture, food and care rather than automatic initial gifts | Codex | — (done) | done/live | materialsPastureDefense; sheepWoolSailingNov11 |
| M1-13 | gate | Seed-funded expandable farms follow contours and support soil/fallow/preservation/milling decisions | Codex | — (done) | done/live | contourFood20261102 |
| M1-14 | gate | Food attention, local depletion/regrowth and warned hazards produce choices without broken labor | Codex | Codex W8 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-15 | gate | Every map has mandatory hills/valleys/rivers/lakes; substantial landmasses have coherent drainage and reachable uplands | Grok | — (done) | done/live | v18c4b-published |
| M1-16 | gate | Every map contains all required landscape families with organic forms and varied prominence | Grok | Grok W5 | not started | Organic v11 forms/material/water fixes are under desktop review; prior ellipse/teeth/striped fall gallery was rejected. |
| M1-17 | gate | Scenic scores expose geographic components and choose an above-average viable start when feasible | Grok | — (done) | done/live | batch1 |
| M1-18 | gate | New terrain supports dry roots/foundations, freshwater access and prospectable mountain approaches | Grok | — (done) | done/live | v18c4b-published |
| M1-19 | gate | Water/cold neglect produces visible warnings and grace before gradual harm; legacy needs rules persist | Codex | — (done) | done/live | batch4 |
| M1-20 | gate | Current Normal default-conflict unbuilt-camp scenario survives first winter with water/fuel/food/defense and no repair | Codex | — (done) | done/live | v14winter |
| M1-21 | gate | Every map contains at least eight substantial ecological regions with measured coverage, coherent moisture/soil/climate transitions and m… | Grok | Grok W6 | source-pushed-not-live | eight connected biomes area-qualified on V14; transition-gradient and per-region resources unverified |
| M1-22 | gate | Biome presentation uses distinct grass/forest forms, wetland reeds, desert scrub and alpine vegetation with dry placement and bounded det… | Claude | Claude W1 | not started | Distinct biome vegetation families/ground structure are not completed by recoloring the same trees or grass. |
| M2-01 | gate | Societies compare feasible bounded local-AI alternatives using explicit needs/costs/risks and reasons | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-02 | gate | Committed strategic plans reserve resources and use hysteresis/interruption rules | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-03 | gate | Rivals develop from finite camps, scout and specialize without recurring resource gifts | Claude | Claude W2 | source-pushed-not-live | societies source on agents/claude-societies e69b8f8; not live as a whole |
| M2-04 | gate | Two rivals independently complete profitable physical trade through shared rules | Claude | — (done) | done/live | autonomousUsefulTradeNov1 |
| M2-05 | gate | Two rivals compete/fight, negotiate a treaty and recover through the same society systems | Claude | Claude W2 | source-pushed-not-live | conquest/alliances source-pushed e69b8f8 |
| M2-06 | gate | Directed society-pair ledger stores incidents/trust/grievances/agreements/dependencies/claims | Claude | Claude W2 | source-pushed-not-live | societyRelations source-pushed e69b8f8 |
| M2-07 | gate | Information travels through observation/envoys/routes; unknown actions do not generate remote knowledge | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-08 | gate | Claims have defended cores/fading influence and witnessed extraction/settlement incidents | Grok | Grok W1 | source-pushed-not-live | landValue/claims source 10d6d81; domination hook not live |
| M2-09 | gate | Warnings/compensation/transit denial/embargo/eviction precede proportionate escalation when appropriate | Claude | Claude W2 | source-pushed-not-live | escalation source-pushed e69b8f8 |
| M2-10 | gate | Wealth creates learned opportunities/risks while safer geography and defense can deter or redirect attacks | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-11 | gate | Arrivals, refugees, departures, aging, families and leadership preserve community identity | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-12 | gate | Shortages and failed obligations cause warned gradual collapse, abandonment and possible refounding | Claude | Claude W2 | source-pushed-not-live | refounding/collapse partial on societies branch |
| M2-13 | gate | Leadership succession retains agreements, grievances and community histories | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-14 | gate | Inhabited-world start runs bounded recorded prehistory and discloses asymmetry | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-15 | gate | Rival growth/investment/plan completion/recovery outcomes are measured on fixed and holdout worlds | Claude | Claude N7 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-16 | gate | Full M2 chapter links surplus, wider access, exposed routes and independent society decisions | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-01 | gate | Boat/port deliveries carry actual people/cargo through boarding, travel, unloading and save/load | Codex | — (done) | done/live | coastalDeliveryNov1; sheepWoolSailingNov11 |
| M3-02 | gate | Caravan/depot/pack-animal routes scale capacity with actual equipment and escort obligations | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-03 | gate | Markets consolidate known offers/contracts/cargo/storage with measurable handling/search benefit | Codex | Codex W7 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-04 | gate | Shipment interruption and interception conserve cargo/equipment and measure profitability/reliability/loss | Claude | Claude W2 | source-pushed-not-live | stolen cargo / interception source-pushed; conservation re-review open |
| M3-05 | gate | Roads/bridges/canals/trenches require real work and bounded terrain/navigation updates | Grok | Grok T3 | source-pushed-not-live | canals/aqueducts/trenches source-pushed on agents/grok-world c0b54fa; roads/bridges remain Grok W2; wiring is Grok T3–T4 |
| M3-06 | gate | Husbandry breeding/feed/products and pack transport connect to real expedition/trade needs | Codex | Codex W1 | source-pushed-not-live | sheep/wool slice live 5f1b5e9; horses/pack/traction open |
| M3-07 | gate | Contested access and extraction support physical transit agreements, escorts or route abandonment | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-08 | gate | Raids prepare/approach/contact/loot/withdraw; defense can deter them without automatic larger spawns | Claude | Claude W2 | source-pushed-not-live | raid AI source-pushed; not campaign-accepted |
| M3-09 | gate | Finite looting can succeed without compulsory burning and counts only physically returned goods | Claude | Claude W2 | source-pushed-not-live | non-destructive loot unpublished on main |
| M3-10 | gate | Contextual capture/surrender preserves existing people and requires physical escort, custody and needs | Claude | — (done) | done/live | oct31gateaudit |
| M3-11 | gate | Intact local occupation requires present control/garrison and preserves building/person/project identities | Claude | — (done) | done/live | oct31gateaudit; occupationProductionRegressionNov2; atomicCommunityHandoverNov3 |
| M3-12 | gate | Domination/vassalage uses local leverage and real continuing obligations rather than remote instant transfers | Claude | Claude W2 | source-pushed-not-live | domination/puppet/tribute source-pushed e69b8f8 |
| M3-13 | gate | Withdrawal/release returns surviving actors and possessions and updates local control/custody | Claude | Claude W2 | source-pushed-not-live | withdrawal/custody source-pushed, not native-accepted |
| M3-14 | gate | Negotiated aftermath preserves incidents, compensation, agreements and witnessed conflict knowledge | Claude | Claude W2 | source-pushed-not-live | aftermath source-pushed, not full shared-rule |
| M3-15 | gate | Raids report actual casualties/loot/retreat and residents resume appropriate civilian work | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-16 | gate | Captivity includes guard cost, injury/resistance/escape, ransom/exchange, integration and organized revolt | Claude | Claude W2 | source-pushed-not-live | captive revolt source-pushed 18d89d2 |
| M3-17 | gate | Militia/formations/basic siege and staffed maintained walls protect actual approaches with era-correct gear | Claude | Claude N3 | source-pushed-not-live | staffed ram source-pushed rivalSiege.ts 0d1713a; NPC/engines leftover |
| M3-18 | gate | Full M3 delivery/interception/defense/loot-withdrawal/negotiated-aftermath scenario passes with saves | Claude | Claude N7 | not started | Current Natural-conflict integrated operation remains unpublished and unaccepted. |
| M4-01 | gate | Need-driven discoveries show observation/sample, performed experiment, demonstrated production and adoption | Codex | — (done) | done/live | oct31gateaudit |
| M4-02 | gate | Residents/players prioritize meaningful practical experiments with evidence and readable blocked reasons | Codex | — (done) | done/live | oct31gateaudit |
| M4-03 | gate | Teaching/successors/artifacts/records spread demonstrated techniques through learning/trade/migration | Codex | Codex W2 | not started | 38b4103 supplies narrower native crop/teaching and built provenance evidence; actual trade/artifact/records spread and complete gate acceptance remain missing; no gate credit. |
| M4-04 | gate | Bronze/Iron/Classical advancement keeps 50/75/100 population plus practices/institutions/sustainable unspent reserves | Codex | Codex N2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-05 | gate | Small specialized societies remain competitive through trade and techniques without matching every population threshold | Codex | Codex N2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-06 | gate | Households request support and respond to needs/unequal burdens/allegiance without arbitrary order refusal | Codex | Codex W9 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-07 | gate | Political complexity grows with population/diversity/distance/power and has warned negotiation/unrest stages | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-08 | gate | Leaders propose projects/agreements/commitments with legitimacy and continuity consequences | Claude | Claude W2 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-09 | gate | Council/ritual/learning/administrative institutions perform actual coordination/participation/training/delegation | Claude | Claude N4 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-10 | gate | Practical metallurgy/material production covers garments/pottery/charcoal/copper/tin/bronze/iron with wear/workplaces | Codex | Codex W4 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-11 | gate | Four construction families have distinct homes/stores/workshops/civic/defense silhouettes and learned diffusion | Claude | Claude W1 | source-pushed-not-live | civBuildings 14-civ grammar source-pushed 9992fe9; not wired |
| M4-12 | gate | Player sandstone/plaster/courtyard/waterworks city develops maintained prosperity before selective ornament | Claude | Claude W1 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-13 | gate | Dense neighborhoods/work yards/cargo/construction and era-appropriate residents visibly reflect real activity | Claude | Claude W1 | source-pushed-not-live | civPeople/activity specs source-pushed; not rendered |
| M4-14 | gate | Compact desktop controls expose all buildable structures and knowledge-accurate political/resource/logistics minimap layers | Claude | Claude W10 | source-pushed-not-live | compact H UI source-pushed; not wired |
| M4-15 | gate | Instrumental activity/culture/era music and spatial rate-limited work/combat sounds remain readable | Claude | Claude W3 | source-pushed-not-live | ambientMix source-pushed; not heard in game |
| M4-16 | gate | Prosperity victory completes in a dedicated connected scenario and offers continuation | Codex | Codex N1 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-17 | gate | Commerce victory completes in a dedicated connected scenario and offers continuation | Codex | Codex N1 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-18 | gate | Dominion victory completes in a dedicated connected scenario without compulsory extinction/destruction | Codex | Codex N1 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-19 | gate | Knowledge victory completes through demonstrated techniques and a dedicated connected scenario | Codex | Codex N1 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-20 | gate | Legacy victory completes with bounded nonrepeatable era achievements, identity/history and continuation | Codex | Codex N1 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-01 | gate | Complete current Stone-through-Classical campaign passes all required release scenarios without command repair | Codex | Codex N3 | not started | All required current release scenarios must pass together; currently incomplete. |
| M5-02 | gate | Published baseline migration checks preserve historical terrain hashes and camp/needs/paid-project saves | Codex | — (done) | done/live | batch1; batch2; batch4 |
| M5-03 | gate | Latest release candidate passes typecheck/build and clean development/production desktop interactions | Codex | — (done) | done/live | expandedPlayableNov2 |
| M5-04 | gate | New map gallery passes close/middle/wide same-landscape, overcast, water/fall/cliff/dune/route/contour-farm review | Claude | Claude N7 | not started | Root owns the next actual desktop gallery; raw GL cleanliness alone is not visual acceptance. |
| M5-05 | gate | Actual physical geometry agrees with depicted surfaces, farms, water, dry placement and navigation | Grok | Grok W10 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-06 | gate | M1 MacBook Air 8GB desktop target meets median <=33ms and p95 <=50ms at 100 visible residents/60 buildings | Codex | Codex N3 | not started | Target hardware figures are proposed targets, not achieved measurements. |
| M5-07 | gate | Separate 240-300-total-resident stress profile reports CPU/navigation/render/memory and full-pipeline costs | Codex | — (done) | done/live | finalMatureProfileNov2 |
| M5-08 | gate | Major mechanics expose named parameters/units/reasons/outcomes and meaningful-decision/chapter metrics | Codex | Codex N3 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-09 | gate | Fixed regression and rotating holdout scenarios improve intended outcomes without conservation/save regressions | Codex | Codex N3 | not started | Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-10 | gate | Packaged published first release preserves saves/preview/later-era content and records exact evidence/remaining expansion scope | Codex | Codex N3 | not started | A maintained preview/batch push is not the completed first release. |
| ASTRA-01 | astra | Audit and freeze contracts | Grok | Grok T10 | not started | contracts freeze maintained in AUTOPILOT.md once this lands on main |
| ASTRA-02 | astra | Keyboard world commands | Codex | — (done) | done/live | keyboard world commands exist in engine.ts / GameApp / Hud on main; patch leftovers on audit (Codex W10 / Claude W10) |
| ASTRA-03 | astra | Acoustic adaptive score | Claude | Claude W3 | not started |  |
| ASTRA-04 | astra | Reliable save and resume | Codex | Codex N4 | source-pushed-not-live | saves are live; remaining acceptance is corrupt-save / full-state restore vs ASTRA criteria |
| ASTRA-05 | astra | Fixed simulation cadence | Codex | Codex N4 | source-pushed-not-live | fixed tick exists; confirm 30Hz equal-elapsed and hidden-tab catchup |
| ASTRA-06 | astra | Route around obstacles | Grok | — (done) | done/live | bounded A* plus tight-space work GW-01 2a9fa79 / 5f2b1b2; no teleport unsticking — already a hard rule |
| ASTRA-07 | astra | RTS selection and combat orders | Claude | Claude W10 | source-pushed-not-live | selection/combat orders exist; leftover acceptance (rotated box, hold never chases) checked this week |
| ASTRA-08 | astra | Vertical slice integration gate | Codex | Codex N4 | not started | desktop-only (GOV-DESKTOP); mobile render dropped from this gate |
| ASTRA-09 | astra | Spatial query budget | Codex | Codex N4 | not started | p95 <8ms target is historical; current speed work is M5-06 / Worker parked |
| ASTRA-10 | astra | Construction and repair refinement | Codex | — (done) | done/live | construction reservation / cancel / repair paths are in the live game (M0 construction gates verified); patch on audit |
| ASTRA-11 | astra | Survival economy and priorities | Codex | Codex N4 | source-pushed-not-live | survival loop partly live (M1 verified); remaining winter-warning/priority leftovers |
| ASTRA-12 | astra | Death and job animation | Claude | Claude N2 | not started |  |
| ASTRA-13 | astra | Shared character rig | Claude | Claude N2 | not started |  |
| ASTRA-14 | astra | Defenses and gate navigation | Grok | Grok W12 | source-pushed-not-live | palisades/gates historically implemented (CAT-65 struck); open-gate / closed-gate routing still to prove |
| ASTRA-15 | astra | Soft counters and formations | Claude | Claude N3 | not started |  |
| ASTRA-16 | astra | Strategic tribe director | Claude | Claude N4 | source-pushed-not-live | rival director exists in part; 30-minute seeded defend/recover/raid without cheats still open |
| ASTRA-17 | astra | Prehistoric technology graph | Codex | Codex W2 | live-partial | 38b4103: compact states/sources, actual paid teaching+crop receipts and free-owned resident method migration;26/26scoped checks, tsc/buildPASS; traded/captured techniques and wider institutions remain open; docs/metrics/knowledge-provenance-release-2026-11-12.json |
| ASTRA-18 | astra | Cohesive environment pack pass | Claude | Claude W1 | source-pushed-not-live | Option H / biomeTerrain / civ packs source-pushed 9992fe9; not live |
| ASTRA-19 | astra | Wildlife and seasonal habitat | Grok | Grok N5 | source-pushed-not-live | hunting/wildlife live (M1-10); habitat/offscreen bounds leftovers |
| ASTRA-20 | astra | Fog and scouting audit | Grok | Grok W13 | source-pushed-not-live | G10 overlay live 39115987; exact-radius attribution still open |
| ASTRA-21 | astra | HUD and teaching pass | Claude | Claude N1 | source-pushed-not-live | compact H UI source-pushed; teaching pass not live |
| ASTRA-22 | astra | Natural SFX and environment mix | Claude | Claude W3 | not started |  |
| ASTRA-23 | astra | Save migration and deterministic replay | Codex | Codex W8 | not started | same work as M0-09 |
| ASTRA-24 | astra | Performance and balance gate | Codex | Codex N4 | not started |  |
| ASTRA-25 | astra | Playable alpha packaging | Codex | Codex N3 | not started | same work as M5-10 |
| CAT-1 | catalogue | Seeded starting habitats and seasonal climate profiles. | Grok | Grok W7 | not started |  |
| CAT-10 | catalogue | **Accepted extension:** longer climate shifts and settlement adaptation. | Grok | Grok W7 | not started |  |
| CAT-100 | catalogue | **Accepted extension:** warehouses serving regional supply networks. | Codex | Codex N5 | not started | warehouses |
| CAT-101 | catalogue | Stone-age clubs, spears and bows; civilians can hunt/defend. | Claude | Claude W2 | source-pushed-not-live | stone-age weapons exist in part |
| CAT-102 | catalogue | Observe an armed raid or attack before relations turn hostile. | Claude | — (done) | done/live | historical source-struck: observe raid before hostility |
| CAT-103 | catalogue | Shared militia stores, alarms and recall horn. | Claude | Claude W2 | source-pushed-not-live | militia stores / horn — INC-DEFENSE-HORN this week |
| CAT-104 | catalogue | Responsive selected-unit raids, attack-move, retreat and hold. | Claude | Claude W10 | source-pushed-not-live | selected-unit raids exist; leftovers with ASTRA-07 |
| CAT-105 | catalogue | Distinct counters, armor, ranges, projectiles and collision/spacing. | Claude | Claude N3 | not started | counters / armor / projectiles |
| CAT-106 | catalogue | Separate gatherer slots from guards/escorts and patrols. | Claude | Claude W2 | not started | separate gatherer slots from guards |
| CAT-107 | catalogue | Night raids, finite raider camps, stolen cargo and safe trade routes. | Claude | Claude W2 | source-pushed-not-live | raider camps / stolen cargo source-pushed |
| CAT-108 | catalogue | Pillage, building fire, civilian flight, surrender and conquest aftermath. | Claude | Claude W2 | source-pushed-not-live | pillage / conquest aftermath source-pushed |
| CAT-109 | catalogue | Later trained specialization, commanders and formations supported by civilian economy. | Claude | Claude N3 | not started |  |
| CAT-11 | catalogue | Hunger, diet and physically available food. | Codex | Codex N4 | source-pushed-not-live | hunger/diet partly live (M1); remaining balance |
| CAT-110 | catalogue | **Accepted extension:** siege, fortified towns and naval combat after core transport/combat work. | Claude | Claude W2 | source-pushed-not-live | siege source-pushed; naval combat later in N6 |
| CAT-111 | catalogue | Varied names/colors, preferences, strengths, risks and settlement strategies. | Claude | Claude W2 | source-pushed-not-live | personalities/goals/recovery source-pushed in part (G11, G5) |
| CAT-112 | catalogue | Goal-driven rival economies that obey the same human/material constraints. | Claude | Claude W2 | source-pushed-not-live | personalities/goals/recovery source-pushed in part (G11, G5) |
| CAT-113 | catalogue | Rival scouting, defense, cooperation, aggression and recovery. | Claude | Claude W2 | source-pushed-not-live | personalities/goals/recovery source-pushed in part (G11, G5) |
| CAT-114 | catalogue | New settlements, collapse and survivors founding elsewhere. | Claude | Claude W2 | source-pushed-not-live | personalities/goals/recovery source-pushed in part (G11, G5) |
| CAT-115 | catalogue | Expansion constrained by resources, transport and local population support. | Claude | Claude W2 | source-pushed-not-live | personalities/goals/recovery source-pushed in part (G11, G5) |
| CAT-116 | catalogue | Appointed administrators with competence, policy scope and reports. | Codex | Codex N2 | not started |  |
| CAT-117 | catalogue | Regional logistics and local autonomy. | Claude | Claude N4 | not started |  |
| CAT-118 | catalogue | Breakaway settlements and nontrivial reintegration/conflict choices. | Claude | Claude N4 | not started |  |
| CAT-119 | catalogue | **Accepted extension:** obligations, taxation, public works and later legal institutions. | Codex | Codex N2 | not started | obligations / taxation / public works |
| CAT-12 | catalogue | Sleep/rest with chosen night shifts and fatigue. | Codex | — (done) | done/live | historical source-struck: seasonal work windows / fatigue |
| CAT-120 | catalogue | **Accepted extension:** federations, vassalage and alliances as alternatives to conquest. | Claude | Claude W2 | source-pushed-not-live | vassalage/alliances source-pushed e69b8f8 |
| CAT-13 | catalogue | Shelter capacity, warmth, fuel and storm refuge. | Codex | Codex W9 | source-pushed-not-live | shelter/fuel partly live M1-07/09 |
| CAT-14 | catalogue | Clothing suited to cold, heat and wet conditions. | Codex | Codex W3 | source-pushed-not-live | wool coats live 5f1b5e9; heat/wet/repair/dyes remain |
| CAT-15 | catalogue | Injury, illness, care, recovery and readable death causes. | Codex | Codex W9 | not started | injury/illness/care |
| CAT-16 | catalogue | Seasonal food reserve forecasts and preservation losses. | Codex | — (done) | done/live | historical source-struck: seasonal reserves / preservation |
| CAT-17 | catalogue | Expedition provisions, camping and return decisions. | Codex | Codex W9 | source-pushed-not-live | scout provisions exist; expedition leftovers |
| CAT-18 | catalogue | Shelter/tool degradation, repair and replacement. | Codex | Codex W9 | not started | shelter/tool degradation |
| CAT-19 | catalogue | **Accepted extension:** water quality, sanitation and waste. | Codex | Codex W9 | not started | water quality / sanitation |
| CAT-2 | catalogue | Regional soils, fertility, slopes, exposure and water access. | Grok | Grok W7 | not started |  |
| CAT-20 | catalogue | **Accepted extension:** morale from safety, family, food variety and community events. | Codex | Codex W3 | not started | morale from safety/family/food variety |
| CAT-21 | catalogue | Fitting generated names and distinct personal traits. | Claude | Claude W2 | source-pushed-not-live | historical names struck; G6 culture naming is source-pushed e69b8f8, not live |
| CAT-22 | catalogue | Birth, childhood, adult work and old age on a playable timescale. | Codex | — (done) | done/live | historical source-struck: birth/childhood/old age |
| CAT-23 | catalogue | Household/family links and support of dependents. | Codex | Codex W9 | not started | household/family support |
| CAT-24 | catalogue | Arrivals of families or groups, not only isolated migrants. | Codex | — (done) | done/live | historical source-struck: family/group arrivals |
| CAT-25 | catalogue | Refugees, rescue encounters and former settlement histories. | Claude | Claude W2 | not started | refugees / former settlement histories |
| CAT-26 | catalogue | Captives, surrender, release and gradual integration. | Claude | Claude W2 | source-pushed-not-live | captives source-pushed e69b8f8 |
| CAT-27 | catalogue | Departure when settlement life is unsafe or unsustainable. | Claude | Claude W2 | source-pushed-not-live | departure / collapse |
| CAT-28 | catalogue | Seasonal nomadic camps and following herds. | Codex | Codex W1 | not started | seasonal nomadic camps |
| CAT-29 | catalogue | Individual life notices and a durable community history. | Claude | — (done) | done/live | historical source-struck: life notices / community history |
| CAT-3 | catalogue | Uneven finite mineral deposits and persistent ore grade. | Grok | — (done) | done/live | historical source-struck: implemented and regression-tested; not extra 98-gate credit |
| CAT-30 | catalogue | **Accepted extension:** traditions transmitted through families and apprentices. | Codex | Codex W2 | not started | traditions / apprentices |
| CAT-31 | catalogue | Unknown resource locations revealed through actual scouting. | Codex | — (done) | done/live | historical source-struck: scouting reveals resources |
| CAT-32 | catalogue | Tracks/signs and locating moving herds. | Codex | — (done) | done/live | hunting/carcass/fishing covered by verified M1-10/11; leftovers on audit |
| CAT-33 | catalogue | Civilian hunting with primitive equipment, risk and group coordination. | Codex | — (done) | done/live | hunting/carcass/fishing covered by verified M1-10/11; leftovers on audit |
| CAT-34 | catalogue | Fleeing/aggressive wildlife and sustainable reproduction. | Codex | — (done) | done/live | hunting/carcass/fishing covered by verified M1-10/11; leftovers on audit |
| CAT-35 | catalogue | Carcass transport, butchery and useful hides/bone. | Codex | — (done) | done/live | hunting/carcass/fishing covered by verified M1-10/11; leftovers on audit |
| CAT-36 | catalogue | Seasonal wild foods, fishing and traps. | Codex | — (done) | done/live | hunting/carcass/fishing covered by verified M1-10/11; leftovers on audit |
| CAT-37 | catalogue | Animal capture/taming and species-specific domestic uses. | Codex | Codex W1 | live-partial | 0106f88 actual cattle capture/physical pen-stable training,4× care/places,same-species births,cared mothers milk/local keeper delivery;37/37scoped. Sheep/goat/horse slices retained; broader stock/temperament/veterinary/grazing remainder open; no98gatecredit |
| CAT-38 | catalogue | Pens, fodder, pasture, veterinary care and breeding. | Codex | Codex W1 | live-partial | 0106f88 actual cattle capture/physical pen-stable training,4× care/places,same-species births,cared mothers milk/local keeper delivery;37/37scoped. Sheep/goat/horse slices retained; broader stock/temperament/veterinary/grazing remainder open; no98gatecredit |
| CAT-39 | catalogue | Milk, meat, wool, transport and animal traction where species permit. | Codex | Codex T7 | live-partial | wool/dairy vessel live; cultured curd confirmed41f5870 with7native/focused+1built flow, same2pots/cloth return; meat/transport/traction remain W1 |
| CAT-4 | catalogue | Local shortages that encourage exploration, exchange or migration. | Grok | Grok W7 | not started | local shortages encouraging migration |
| CAT-40 | catalogue | **Accepted extension:** selective breeding, pack dogs and working horses. | Codex | Codex W1 | live-partial | 455cd37 actual native horses→paid capture→pen→stable→same-ID pack;3× care/places,3.5× healthy capacity,25/25scoped; riding/traction/broader species remain open; no98gatecredit |
| CAT-41 | catalogue | Land clearing and viable low-timber fields. | Grok | Grok W9 | not started | land clearing / site prep |
| CAT-42 | catalogue | Sowing, tending and time-limited harvest labor. | Codex | — (done) | done/live | historical source-struck: sowing/tending/harvest labor |
| CAT-43 | catalogue | Seeds, soil exhaustion, fallow, manure and crop rotation. | Codex | Codex W8 | not started | soil exhaustion / fallow / manure / rotation |
| CAT-44 | catalogue | Drying, smoking, salting and grain storage where inputs exist. | Codex | Codex W3 | source-pushed-not-live | preservation partly live; drying/smoking/salting leftovers |
| CAT-45 | catalogue | Mortars/querns, mills and other actual processing jobs. | Grok | Grok T4 | source-pushed-not-live | querns exist; mechanical mills are water-works T4 |
| CAT-46 | catalogue | Irrigation/drainage with terrain and maintenance constraints. | Grok | Grok W3 | not started |  |
| CAT-47 | catalogue | Animal-drawn plows and later plow improvements. | Codex | Codex W1 | not started | animal-drawn plows |
| CAT-48 | catalogue | Tools and processing that free people for other work. | Codex | Codex W4 | not started | tools that free labor |
| CAT-49 | catalogue | **Accepted extension:** crop diversity, orchards and managed wild plants. | Codex | Codex W4 | not started | crop diversity / orchards |
| CAT-5 | catalogue | Forest recruitment, succession, clearing and regrowth. | Grok | Grok W7 | not started | REQ-26 forest succession |
| CAT-50 | catalogue | **Accepted extension:** pests and crop disease with mitigation. | Codex | Codex W8 | not started | pests / crop disease |
| CAT-51 | catalogue | Wood, stone/flint, fiber, hides, bone and clay with actual uses. | Codex | Codex W4 | not started |  |
| CAT-52 | catalogue | Knapping, woodworking and hide-working. | Codex | Codex W4 | not started |  |
| CAT-53 | catalogue | Warm/light garments through tanning and weaving. | Codex | Codex W4 | not started |  |
| CAT-54 | catalogue | Pottery/containers and improved storage. | Codex | Codex W4 | not started |  |
| CAT-55 | catalogue | Charcoal/fuel and kiln/smelting inputs. | Codex | Codex W4 | not started |  |
| CAT-56 | catalogue | Copper/tin/bronze/iron material chains without circular age gates. | Codex | Codex W4 | not started |  |
| CAT-57 | catalogue | Tool/weapon recipes, durability and outfitting priorities. | Codex | Codex W4 | not started |  |
| CAT-58 | catalogue | Resource quality influencing yield, labor or equipment performance. | Codex | — (done) | done/live | historical source-struck: resource quality |
| CAT-59 | catalogue | Useful workshops and upgrade branches, each with real worker tasks. | Codex | Codex W4 | not started | workshops / upgrade branches |
| CAT-6 | catalogue | Grassland grazing, woodland wild food and upland extraction strategies. | Grok | Grok W7 | not started |  |
| CAT-60 | catalogue | **Accepted extension:** glass, specialty stone, dyes and luxury craft goods. | Codex | Codex W4 | not started | glass / dyes / luxury |
| CAT-61 | catalogue | Portable shelters, seasonal huts and durable houses suited to materials. | Claude | Claude W1 | source-pushed-not-live | portable/durable houses — Experience generator source-pushed, not live |
| CAT-62 | catalogue | Hearths, fuel stores, granaries and preservation areas. | Codex | Codex W9 | source-pushed-not-live | hearths/fuel/granaries partly live |
| CAT-63 | catalogue | Workshops, animal pens and production yards. | Codex | Codex W4 | not started | workshops / pens / yards |
| CAT-64 | catalogue | Meeting/community centers, healing, ritual and learning spaces. | Claude | Claude W1 | source-pushed-not-live | civic / healing / ritual / learning spaces in civ bible, not live |
| CAT-65 | catalogue | Palisades and gates | Grok | Grok W12 | source-pushed-not-live | historical palisades/gates struck; watchposts/tower progression and closed-gate routing remain |
| CAT-66 | catalogue | Construction labor, local input delivery, repair and fire/destruction. | Codex | Codex W9 | source-pushed-not-live | construction labor exists; fire/destruction leftovers |
| CAT-67 | catalogue | Relocating the community center through labor and reconstruction. | Codex | Codex W9 | not started | relocating community center |
| CAT-68 | catalogue | Multiple settlements with home/work/storage assignments. | Grok | Grok N6 | source-pushed-not-live | GW-14 townCapacity source 70ed21c; planning/UI not live |
| CAT-69 | catalogue | Dismantling/salvage that conserves materials. | Codex | — (done) | done/live | historical source-struck: dismantle/salvage |
| CAT-7 | catalogue | Rivers, lakes, wetlands, fishing grounds and navigable channels. | Grok | Grok T4 | source-pushed-not-live | rivers/lakes exist; fishing grounds/navigable channels remaining quality + water-works |
| CAT-70 | catalogue | **Accepted extension:** public spaces, monuments and settlement identity. | Claude | Claude W1 | source-pushed-not-live | monuments / wonderKit 9992fe9 |
| CAT-71 | catalogue | Evidence-led experiments with new materials and techniques. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-72 | catalogue | Time, labor, fuel and uncertain results that produce useful evidence. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-73 | catalogue | Bring samples and recovered artifacts home before studying them. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-74 | catalogue | Workshops/learning buildings supporting experimentation and adoption. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-75 | catalogue | Apprentices, outside exchange and cumulative practical knowledge. | Codex | Codex W2 | live-partial | 38b4103: compact states/sources, actual paid teaching+crop receipts and free-owned resident method migration;26/26scoped checks, tsc/buildPASS; traded/captured techniques and wider institutions remain open; docs/metrics/knowledge-provenance-release-2026-11-12.json |
| CAT-76 | catalogue | Discoveries about habitats/routes/peoples recorded in a chronicle. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-77 | catalogue | Age recognition based on adopted practices and a sustainable community. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-78 | catalogue | Linked food, textile, metallurgy, construction, transport and governance branches. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-79 | catalogue | Cultural artifacts valued differently by different societies. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-8 | catalogue | Flood, drought, wildfire and storm risks with warning and recovery. | Grok | Grok W7 | not started | includes INC-WILDFIRE |
| CAT-80 | catalogue | **Accepted extension:** oral histories, later writing and libraries with distinct information effects. | Codex | Codex W2 | not started | organic knowledge redesign; M4-01/02 discovery gates already live |
| CAT-81 | catalogue | Envoys travel and meet; dated meeting reports appear on arrival, while people and cargo return physically. | Claude | — (done) | done/live | historical source-struck: envoys travel and report on arrival |
| CAT-82 | catalogue | No live remote view of inventories or intentions. | Claude | — (done) | done/live | historical source-struck: no live remote inventories |
| CAT-83 | catalogue | Selective disclosure, boasting, concealment and reputation. | Claude | Claude W2 | not started | disclosure / reputation |
| CAT-84 | catalogue | Needs-based willingness, counteroffers and multi-item deals; procurement requests with material/quantity targets and spending limits, aff… | Claude | Claude W2 | source-pushed-not-live | needs-based deals source-pushed |
| CAT-85 | catalogue | Physical gifts, cargo, recurring routes and delivery failures; a trading labor priority and real procurement expeditions with cargo/retur… | Claude | Claude W2 | source-pushed-not-live | physical gifts / routes / armed caravans source-pushed |
| CAT-86 | catalogue | Peace delegations, withdrawal and locally recognized agreements. | Claude | Claude W2 | source-pushed-not-live | peace delegations source-pushed |
| CAT-87 | catalogue | Resource/grazing/transit rights and disputed frontiers. | Claude | Claude W2 | not started | rights and disputed frontiers |
| CAT-88 | catalogue | Scarcity competition without mandatory constant war. | Claude | Claude W2 | not started | scarcity without mandatory war |
| CAT-89 | catalogue | Trade contacts teaching techniques and supplying unavailable goods. | Codex | Codex W2 | not started | trade teaching techniques — knowledge side |
| CAT-9 | catalogue | Carrying capacity and depleted hunting/gathering grounds. | Grok | Grok W7 | not started |  |
| CAT-90 | catalogue | **Accepted extension:** interpreters, measures, markets and later monetary institutions. | Codex | Codex L5 | explicitly later/out of scope | later monetary institutions; gold/silver is Codex L5 |
| CAT-91 | catalogue | Trails develop through repeated passage; unused paths fade. | Grok | — (done) | done/live | historical source-struck: trails from repeated passage; GW-12 display still Claude T4 |
| CAT-92 | catalogue | Later engineered roads with real labor/material/upkeep costs. | Grok | Grok W2 | not started |  |
| CAT-93 | catalogue | River boats, launch sites, ports and land/water transfer. | Codex | Codex N5 | source-pushed-not-live | sail rig live 5f1b5e9; broader ports/hull classes remain |
| CAT-94 | catalogue | Pack animals, sledges/carts and capacity/speed tradeoffs. | Codex | Codex W1 | live-partial | 46217d4: real horse + paid ard for spring traction;1.4→2.2 practice/welfare/condition labor rate,wear/paid repair/cargo conservation;28/28scoped. Pack goats/horses live455cd37. Draft carts/riding remain open; no98gatecredit |
| CAT-95 | catalogue | Local stores, carriers, hauling priorities and route reliability. | Codex | Codex W9 | not started | local stores / hauling priorities |
| CAT-96 | catalogue | Bridges/fords/choke points as strategic constraints. | Grok | Grok W2 | not started |  |
| CAT-97 | catalogue | Expedition escorts and raider ambush risk. | Claude | Claude W2 | not started | expedition escorts / ambush |
| CAT-98 | catalogue | Sea arrivals and raids grounded in actual movement. | Claude | Claude N6 | source-pushed-not-live | sea arrivals/raids; presentation leftovers |
| CAT-99 | catalogue | **Accepted extension:** navigation knowledge and seasonal sailing conditions. | Codex | Codex N5 | source-pushed-not-live | sailing demo live; tacking/offshore/repair remain |
| GEO-1 | geography | Connected mountain ranges with several summits and unequal silhouettes. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-10 | geography | Natural benches and terraces with unequal width/riser patterns; constructed farm terraces are separate paid work. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-11 | geography | Pillar/pinnacle districts with intervening wooded or rocky ravines. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-12 | geography | Rock outcrops, boulder fields, talus/scree and weathered lower slopes. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-13 | geography | Fertile plains, broad floodplains, meadows and clearings; these coexist with strong relief rather than replacing it. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-14 | geography | Wind-shaped dunes, interdune hollows and exposed rocky desert surfaces. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-15 | geography | Badlands, branching dry channels/wadis and seasonal washes. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-16 | geography | Headwaters/springs or upland source basins feeding actual drainage. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-17 | geography | Main rivers with descending profiles and changing width. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-18 | geography | Tributaries, confluences and connected catchments. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-19 | geography | River bends/meanders with uneven banks and bars. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-2 | geography | Ridge spines, secondary spurs, saddles and passes with usable approaches. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-20 | geography | Lakes with irregular shorelines, inlets/outlets and usable banks; elevated lakes need their own actual water level. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-21 | geography | Pools/backwaters and seasonal wet depressions associated with the drainage network. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-22 | geography | Waterfalls with linked upper/lower water, a real bed drop and receiving pool. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-23 | geography | Rapids/cascades and portage/crossing decisions where river grade changes. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-24 | geography | Marshes, reed beds and riparian wet ground with actual moisture/water relationships. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-25 | geography | Floodplain channels, bars, sediment margins and seasonal flood exposure. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-26 | geography | River mouths, estuaries and delta-like depositional areas linked to the downstream river. | Grok | Grok N7 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-27 | geography | Irregular bays, coves and headlands. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-28 | geography | Peninsulas, narrow land connections and meaningful natural crossings. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-29 | geography | Beaches, shingle/rocky banks and coastal shelves. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-3 | geography | Foothills and rolling hills across substantial districts. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-30 | geography | Coastal cliffs, offshore outcrops/stacks and small islets where suitable. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-31 | geography | Sheltered shallows/lagoons, deeper channels and safe/unsafe landing approaches. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-32 | geography | Shore vegetation and wet/dry transition zones; foam/color alone do not establish physical shallows. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-33 | geography | Caves, rock shelters, natural arches and overhangs: require real mesh/access treatment beyond a single-valued heightfield. | Grok | Grok N4 | not started | additional family to assess; not every-map required; no fake heightfield tags |
| GEO-34 | geography | Sinkholes/karst depressions and their drainage behavior. | Grok | Grok N4 | not started | additional family to assess; not every-map required; no fake heightfield tags |
| GEO-35 | geography | Glacial cirques, U-shaped upper valleys, snowfields and morainic/boulder terrain. | Grok | Grok N4 | not started | additional family to assess; not every-map required; no fake heightfield tags |
| GEO-36 | geography | Volcanic cones/craters and old lava/rock fields. | Grok | Grok N4 | not started | additional family to assess; not every-map required; no fake heightfield tags |
| GEO-4 | geography | Broad valleys, nested smaller valleys and inhabited basins. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-5 | geography | Narrow ravines and gullies branching into larger valleys. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-6 | geography | Plateaus and elevated shelves with distinct edges and access routes. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-7 | geography | Mesas and isolated buttes as members of the plateau/erosion family. | Grok | Grok W11 | not started | every-map family; measure and fix remaining defects (dead-end rivers, clustering) |
| GEO-8 | geography | Incised canyons/gorges with opposing walls, varying width, bends and real floors. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| GEO-9 | geography | Cliffs/escarpments and exposed layered rock faces. | Grok | Grok W5 | not started | partially present in current generator; remaining organic form and prominence is Grok W5/W11 |
| BIOME-1 | biome | Meadow/grassland | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-2 | biome | Mixed woodland | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-3 | biome | Cool conifer forest | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-4 | biome | Montane/alpine | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-5 | biome | Freshwater wetland/riparian | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-6 | biome | Dry scrub/woodland | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-7 | biome | Arid/badlands | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| BIOME-8 | biome | Warm coastal/woodland | Grok | Grok W6 | source-pushed-not-live | eight regions area-qualified (M1-21 notes); dressing data and transitions still Grok W6; Claude draws M1-22 |
| MAP-CONTRACT-1 | map-contract | - Every map contains the requested major terrain families: hills, valleys/basins, mountain ranges, plateaus, canyons/gorges, cliffs, terr… | Grok | Grok W5 | not started | every-map contract from GEOGRAPHY_AND_BIOME_CATALOGUE; organic forms still under desktop review |
| MAP-CONTRACT-2 | map-contract | - At least **eight substantial ecological regions** appear on each map: meadow/grassland, mixed woodland, cool conifer forest, montane/al… | Grok | Grok W5 | not started | every-map contract from GEOGRAPHY_AND_BIOME_CATALOGUE; organic forms still under desktop review |
| MAP-CONTRACT-3 | map-contract | - Biome regions have measurable area, vegetation composition/density, ground material, soil/moisture, available resources, seasonal behav… | Grok | Grok W5 | not started | every-map contract from GEOGRAPHY_AND_BIOME_CATALOGUE; organic forms still under desktop review |
| MAP-CONTRACT-4 | map-contract | - Keep ordinary flats and gentle slopes for living/farming among pronounced relief. The player's safe opening has above-average measured … | Grok | Grok W5 | not started | every-map contract from GEOGRAPHY_AND_BIOME_CATALOGUE; organic forms still under desktop review |
| MAP-CONTRACT-5 | map-contract | - Required families vary in arrangement, extent, shape and grandeur across seeds. Rarity controls exceptional scale and composition, not … | Grok | Grok W5 | not started | every-map contract from GEOGRAPHY_AND_BIOME_CATALOGUE; organic forms still under desktop review |
| BOAT-SHARED | qa | - [ ] **BOAT-SHARED: remove permanently equipped canoe behavior.** Source currently has two contracts: completed legacy canoe work sets `… | Codex | Codex N5 | source-pushed-not-live | remove legacy equipped-canoe contract; paid hulls live |
| QA-005 | qa | - Distribute interesting terrain across separate regions, with ordinary rolling/flat areas between them; see MAP_REDESIGN_BRIEF.md for sp… | Grok | Grok W5 | not started | terrain spacing / clustering |
| QA-006 | qa | - Remove generic raised rectangular building platforms. Ground walls, floors and entrances in actual terrain; reserve real foundations, r… | Claude | Claude W1 | source-pushed-not-live | siteGrounding source-pushed; no generic platforms — wire in overhaul |
| QA-007 | qa | - Research real historic building references before revising markets, temples, universities and other classes. Provide recognizable funct… | Claude | Claude W1 | source-pushed-not-live | historic building references / civ bible |
| QA-008 | qa | - Keep huts appropriate to early ages, add clearly available advanced housing to the build menu, and let selected homes upgrade through e… | Codex | Codex T5 | not started | home upgrades through paid rebuild/extend; eraMode hook |
| QA-009 | qa | - Basic material/weather/use building wear and finite paid material-hauling/repair labor are now implemented and qualified in the Novembe… | Codex | Codex W9 | source-pushed-not-live | Nov 3 maintenance batch qualified; post-grace wear remains |
| QA-010 | qa | - Give raiders measured intent/severity, from theft and captives through destructive or annihilating attacks; tune probabilities, risk/re… | Claude | Claude W2 | source-pushed-not-live | raider intent/severity |
| QA-011 | qa | - A controlled river-edge objective oscillation is reproduced and repaired in the November3 loop batch; exact screenshot-save reconstruct… | Grok | Grok W12 | source-pushed-not-live | river-edge oscillation repaired Nov 3; screenshot-save reconstruction open |
| QA-013 | qa | - Screenshot07:53: smooth river bends, continuous width, tributary joins and natural banks; remove staircase/sawtooth grid edges. Measure… | Claude | Claude T4 | source-pushed-not-live | bank ribbons drawn (integration); ribbons are display-only over raw water mesh, true smooth water edge needs Grok water shader/mesh |
| QA-017 | qa | - Shape the building itself to follow downhill terrain. Step walls, floors and entrances where the grade changes. Use terrain contact and… | Claude | Claude W1 | source-pushed-not-live | buildings follow downhill terrain |
| QA-018 | qa | - Make dry riverbanks the strongest crop sites where soil and moisture support it. Use the same measured fertility for visible green grou… | Grok | Grok T9 | source-pushed-not-live | fertilityPreview source b789597; must be wired in placement UI |
| QA-019 | qa | - Generate varied stone and ore clusters with visible differences in size, shape, grade and amount. Require an actual deposit of sufficie… | Grok | Grok W11 | not started | varied stone/ore clusters |
| QA-020 | qa | - Accept blueprints and field markers over removable trees, brush and surface rocks. Display the clearing steps, dispatch workers to clea… | Grok | Grok W9 | not started | clearing queued under placement |
| QA-021 | qa | - Continue the finite raider fleet lifecycle and reproduce reported trader/raider disappearances using the original unit ID, cargo and ro… | Claude | Claude W2 | not started | raider/trader disappearance / fleet lifecycle |
| QA-022 | qa | - Reproduce residents oscillating beside crowded workstations. Inspect the selected residents' order, physical path, inventory and blocki… | Codex | Codex W8 | not started | workstation oscillation / blocked residents |
| QA-023 | qa | - Expand farm tools and weapons through the ages with distinct uses and real material, fuel, labor and maintenance costs. Audit current p… | Codex | Codex W4 | not started | farm tools and weapons through ages |
| QA-024 | qa | - Inspect river-edge borders and overlays at bends, junctions and lakes. Separate territory lines from visible terrain seams, align both … | Grok | Grok W1 | source-pushed-not-live | territory at river bends; claims source 10d6d81 |
| QA-025 | qa | - Discard generated review screenshots and shut down temporary previews once fixes are verified. Keep reproducible source and test results. | Claude | Claude L3 | not started | discard temporary screenshots after fixes are verified |
| LANE-C-1 | visuals | People headwear detail by era (wrap folds/knot, cap band/bead, hood edge, brim band/feather, band pin, braid ties); near-LOD only, cut from owned garment, no free gear | Claude | Claude lane C | source-pushed-not-live | unitAppearance.ts; unit/civ/culture tests 36/36, tsc no new errors. Next: banners/insignia, unique wonders, vegetation |
| LANE-C-2 | visuals | People insignia by role (worker sash, shoulder cloth, chest patch) and leader standard; cut from owned garment cloth, near LOD only, no free gear, 800-tri budget held | Claude | Claude lane C | source-pushed-not-live | unitAppearance.ts (1d96b5b); unit/civ-people 14/14; civ-temperate-forest render checked (SwiftShader), leader standard visible. Next: unique wonders, vegetation, Mekhari/Sandrill, Tigrane vault |
| LANE-C-3 | visuals | Per-civ signature landmark on every wonder (14 distinct civ pieces: sun-disc gate, obelisk, winged pillar, bell tower, lotus, laurel column, beam tower, stela, tiered stela, lantern tower, standing stones, onion tower, horsetail standard, prow pillar); footprint-true, LOD-capped | Claude | Claude lane C | source-pushed-not-live | wonderKit.ts; wonder-kit 10/10; SwiftShader sheet checked. Next: vegetation, less-blocky Mekhari/Sandrill, Tigrane vault |
| LANE-C-4 | visuals | Less-blocky Sandrill house: wind-worn 10-sided strata drums, talus skirt, domed cap (original grammar only; legacy kept) | Claude | Claude lane C | source-pushed-not-live | civBuildings.ts (d20bac1); civ-architecture/people/era-mode/wonder-kit 35/35; tsc 5 baseline errors only; SwiftShader render checked. Next: Mekhari round-up, Sandrill civic, vegetation, Tigrane vault |
| QA-029 | qa | - Preserve the existing finite clay survey, hauling, forming, drying and firing chain. Extend it with individual filled containers alongs… | Codex | Codex W5 | not started | clay chain + individual containers |
| QA-030 | qa | - Track container form, liters of usable volume, tare mass, contents, seal, condition and maker provenance. Each vessel has one owner and… | Codex | Codex W5 | not started | container identity |
| QA-031 | qa | - Build mechanical milling on the existing grain-to-flour chain. Prototype a current-driven wheel using a connected river reach, then a m… | Grok | Grok T4 | source-pushed-not-live | mechanical milling site/current; wire as water-works buildings |
| QA-032 | qa | - Add windmills as a distinct later engineering practice. Use exposed terrain, wind direction and strength to set output, with no generat… | Grok | Grok T4 | source-pushed-not-live | windmills; site rules source-pushed in waterWorks.ts |
| QA-036 | qa | - Test portable dugouts and passenger hulls separately. Dugouts are paddled, while built ferries and punts use oars. Sailing requires a l… | Codex | Codex N5 | source-pushed-not-live | dugout vs ferry vs sail; sail demo live |
| QA-037 | qa | - Extend existing hands-on crafting time and delivered-batch practice to distinct work families such as toolmaking, metalworking, hull bu… | Codex | Codex W4 | not started | crafting work families |
| QA-041 | qa | - Reproduce the reported 31-person post-raid refusal loop. The material cache can reject a real load indefinitely, blocking queued explor… | Codex | Codex W8 | not started | post-raid cache refusal loop |
| QA-042 | qa | - Building commands should show a specific blocker where the order is given or queue valid work until a worker can start. Verify unloaded… | Claude | Claude W10 | not started | building-command blockers |
| QA-043 | qa | - Add region-appropriate wild stock for domestic and draft animals, with species-specific temperament, feed, social needs, breeding and u… | Codex | Codex W1 | live-partial | 0106f88 actual cattle capture/physical pen-stable training,4× care/places,same-species births,cared mothers milk/local keeper delivery;37/37scoped. Sheep/goat/horse slices retained; broader stock/temperament/veterinary/grazing remainder open; no98gatecredit |
| QA-047 | qa | - Replace wearable dugouts with persistent hulls built and launched at a finished fishing dock. Use explicit approach, board, paddle and … | Codex | Codex N5 | source-pushed-not-live | persistent hulls vs wearable dugouts; paid hulls live, legacy canoe leftover |
| QA-048 | qa | - Make connected river reaches directly inspectable. Show local fish stock and recovery, visible clay reserves and usable dry-bank access… | Claude | Claude T5 | source-pushed-not-live | panel shows fish stock, recovery/min, section size; clay/dry-bank access already present |
| QA-049 | qa | - Generalize tight placement using each building's actual, rotated footprint and accessible entrances. Pay for stone upgrades and added f… | Grok | Grok T8 | source-pushed-not-live | rotated footprints 346faad; R-key wiring tonight |
| QA-050 | qa | - Generate culture-specific monument projects from the settlement's terrain, materials, and recorded achievements. Start with a river sta… | Claude | Claude W1 | source-pushed-not-live | wonderKit / wonder plans source-pushed 9992fe9 |
| QA-051 | qa | - Calibrate farming by cropped area, crop-specific seed and net yield, person-hours by operation, soil depth and texture, moisture and fl… | Grok | Grok W8 | not started | farm labor calibration |
| QA-057 | qa | - Give local defenders a bounded incentive to intercept a witnessed raider carrying actual village goods. Scale pursuit with the value of… | Claude | Claude W2 | source-pushed-not-live | pursuit of stolen goods |
| QA-058 | qa | - Keep every paid crafting or processing job in an individual queue box with a labeled progress bar. Use hands-on seconds for crafting, d… | Codex | Codex W4 | source-pushed-not-live | individual craft queue boxes; curd UI depends on Claude T1 |
| QA-062 | qa | - Add larger threshing yards, mill houses and bakeries with visible staffed work positions. Measure input queue, paid batch size, labor, … | Codex | Codex W4 | not started | threshing / mill houses / bakeries throughput |
| QA-063 | qa | - Develop Egyptian river-valley, Nabataean-inspired desert, French-inspired temperate, Chinese-inspired, Pacific Islander-inspired, and I… | Claude | Claude W7 | source-pushed-not-live | six culture inspirations vs 14-civ bible |
| TRADE-LABOR | qa | - [ ] **TRADE-LABOR: negotiate finite work arrangements.** Propose visiting craftspeople, temporary hired crews, reciprocal seasonal work… | Claude | Claude W2 | not started |  |
| TRADE-NEEDS | qa | - [ ] **TRADE-NEEDS: requests based on real scarcity and productive use.** `rivalTrade.ts` already ranks deficits/surpluses for food, log… | Claude | Claude W2 | source-pushed-not-live | source-pushed on societies; not live |
| WORKLOAD-CONSEQUENCES | qa | - [ ] **WORKLOAD-CONSEQUENCES: real queues before artificial mistakes.** Existing `villageWorkload.ts` estimates person-seconds/available… | Codex | Codex W9 | source-pushed-not-live | villageWorkload.ts estimates exist; real queue consequences remain |
| WORLD-ACTIVITY-LIVE | qa | - [ ] **WORLD-ACTIVITY-LIVE: audit the actual reported saved village.** The user reports no visible foreign explorers, traders or raids. … | Claude | Claude W8 | not started | user reported no visible foreign explorers/traders/raids |
| REQ-01 | request-audit | Stop waving grass on this computer | Codex | — (done) | done/live | waving grass removed this phase (historical request-audit) |
| REQ-02 | request-audit | Computer-appropriate performance | Codex | Codex N3 | not started | 8GB M1 performance is M5-06; not yet met |
| REQ-03 | request-audit | Cut trees without lumber mill | Grok | — (done) | done/live | cut trees without lumber mill — implemented (historical) |
| REQ-04 | request-audit | Maximum two woodcutters per tree | Codex | — (done) | done/live | max two woodcutters per tree — Shared WorkBoard |
| REQ-05 | request-audit | Far lumber camp unused | Codex | — (done) | done/live | far lumber camp unused — implemented |
| REQ-06 | request-audit | Priorities for wood, stone, hunting | Codex | — (done) | done/live | priorities added |
| REQ-07 | request-audit | Harvesting in another village provokes anger | Claude | — (done) | done/live | harvesting in another village provokes anger — implemented |
| REQ-08 | request-audit | Soft territory tint rather than defined borders | Grok | Grok W1 | source-pushed-not-live | soft territory tint exists; river-border leftovers in W1 |
| REQ-09 | request-audit | Actual carried food/materials | Codex | — (done) | done/live | actual carried food/materials — implemented |
| REQ-10 | request-audit | Month within winter | Codex | — (done) | done/live | month within winter — ledger months |
| REQ-11 | request-audit | Farms use too many logs | Codex | — (done) | done/live | field log cost reduced; further balance on audit |
| REQ-12 | request-audit | No mystery drops | Codex | — (done) | done/live | no mystery drops — windfalls removed |
| REQ-13 | request-audit | Bigger age bonuses/challenges | Codex | Codex N2 | source-pushed-not-live | age bonuses partial; organic advancement is W2/N2 |
| REQ-14 | request-audit | Completed hut and no precipitation at start | Codex | — (done) | done/live | unbuilt camp start preserved (M1-01) |
| REQ-15 | request-audit | Seasons and survivability, occasional winter snow, calm score that changes with seasons | Codex | Codex N4 | source-pushed-not-live | seasons exist; survivability validation leftover |
| REQ-16 | request-audit | Population born, migrates, or comes from captured survivors; no buying/training new people | Claude | — (done) | done/live | no buy/train people; births/migration implemented |
| REQ-17 | request-audit | Reserves permit village growth; stop rapid winter elder deaths | Codex | Codex N4 | source-pushed-not-live | reserves/growth implemented; elder-death balance leftover |
| REQ-18 | request-audit | Night sleeping and shelter in storms | Codex | Codex W9 | not started | night sleeping and storm shelter — status said missing coherent schedule |
| REQ-19 | request-audit | Shelter degradation, repairs, fuel and meaningful weather consequences | Codex | Codex W9 | source-pushed-not-live | repairs exist in part |
| REQ-20 | request-audit | Named villagers, personality, life updates, personal connection | Claude | Claude W2 | source-pushed-not-live | names/traits exist; G6 naming source-pushed |
| REQ-21 | request-audit | Warm/light clothing | Codex | Codex W3 | not started | warm/light clothing leftovers (audit said missing item recipes) |
| REQ-22 | request-audit | Hunting remembered and useful, no dedicated early hunter unit | Codex | — (done) | done/live | civilian hunting implemented (M1-10) |
| REQ-23 | request-audit | Domesticated animals matter | Codex | Codex W1 | source-pushed-not-live | sheep live; broader domestication remains |
| REQ-24 | request-audit | Prehistoric nomadic hunting age; follow herds where advantageous | Codex | Codex W1 | not started | nomadic hunting age |
| REQ-25 | request-audit | Biome determines viable shelters/resources/lifeways, plains alternatives to timber houses | Grok | Grok W6 | not started | biome determines shelters/lifeways |
| REQ-26 | request-audit | Forest biome, forests spread, occasional fires | Grok | Grok W7 | not started | forest spread / occasional fires |
| REQ-27 | request-audit | Resources vary in type and quality, scarcity drives exchange/conflict | Grok | Grok W11 | source-pushed-not-live | deposits exist; systematic scarcity leftover |
| REQ-28 | request-audit | Better tools; stone-age weapons | Claude | Claude W2 | source-pushed-not-live | stone-age weapons partial |
| REQ-29 | request-audit | Plagues, realistic causes, fun rather than frequent arbitrary death | Codex | Codex W9 | not started | plagues / realistic causes |
| REQ-30 | request-audit | Subsistence labor, productivity breakthroughs | Codex | Codex W4 | not started | subsistence labor / productivity breakthroughs |
| REQ-31 | request-audit | True exploration: don't know food before finding it; explored fog thinner | Grok | Grok W13 | source-pushed-not-live | fog/exploration live in part (G10); true hidden food leftover |
| REQ-32 | request-audit | Persistent explore without button mashing; focus village | Codex | — (done) | done/live | persistent explore / F focus |
| REQ-33 | request-audit | Scouts carry food based on journey | Codex | — (done) | done/live | scouts carry food — implemented |
| REQ-34 | request-audit | Find people, living/new villages, old ruins | Claude | Claude N5 | not started | find people / living villages / ruins |
| REQ-35 | request-audit | Return cultural artifacts/hidden knowledge and study at home | Codex | Codex W2 | not started | artifacts / hidden knowledge studied at home |
| REQ-36 | request-audit | Organic technologies depend on material experimentation and community capacity | Codex | Codex W2 | not started | organic technologies |
| REQ-37 | request-audit | Robust tech tree, natural age advancement, more later Civ elements | Codex | Codex W2 | not started | robust tech / age advancement |
| REQ-38 | request-audit | Era challenges especially exploration | Codex | Codex N1 | not started | era challenges / chronicle discoveries |
| REQ-39 | request-audit | Learn trade wants by sending a trader, not omniscient live quotes | Claude | Claude W2 | source-pushed-not-live | learn trade wants by sending a trader — envoy flow exists; full omniscience removal leftover |
| REQ-40 | request-audit | Rivals may disclose reserves, boast or conceal, never constant exact stock UI | Claude | — (done) | done/live | exact stock snapshots removed |
| REQ-41 | request-audit | Thoughtful deals based on needs/goals/personality, Civ-like negotiation screen | Claude | Claude W2 | source-pushed-not-live | thoughtful deals / negotiation screen — E1/WQ-13 tonight + W2 |
| REQ-42 | request-audit | Dirt paths develop with repeated trade routes | Grok | — (done) | done/live | trails from traffic — CAT-91 struck; smoother display is Claude T4 |
| REQ-43 | request-audit | Navigable rivers, boats | Codex | Codex N5 | source-pushed-not-live | navigable rivers/boats partial (sail live) |
| REQ-44 | request-audit | Larger world, more distant peoples, randomized names/colors/abilities | Claude | Claude W2 | not started | larger world / distant peoples / randomized identities |
| REQ-45 | request-audit | Other villages intelligent, different, able to grow/succeed/fail | Claude | Claude W2 | source-pushed-not-live | other villages intelligent / rise and fall |
| REQ-46 | request-audit | New villages rise and collapse, survivors scatter/re-settle | Claude | Claude W2 | source-pushed-not-live | villages rise and collapse — G5 |
| REQ-47 | request-audit | Movable townhall and multiple townhalls/settlements | Grok | Grok N6 | source-pushed-not-live | movable townhall / multiple settlements — GW-14 source |
| REQ-48 | request-audit | Pillage, burn, eliminate village, sneaky/night/sea raids | Claude | Claude W2 | source-pushed-not-live | pillage / night / sea raids |
| REQ-49 | request-audit | Townspeople defend; raids obey orders; can leave war | Claude | Claude W2 | source-pushed-not-live | townspeople defend; can leave war |
| REQ-50 | request-audit | Raider camps steal/attack trade | Claude | Claude W2 | source-pushed-not-live | raider camps steal/attack trade |
| REQ-51 | request-audit | Units don't all crowd one resource, security when afraid | Claude | Claude W2 | source-pushed-not-live | units don't all crowd one resource; security when afraid |
| REQ-52 | request-audit | AoE responsive combat: counters, armor, ranges, projectiles, spacing, building attacks | Claude | Claude N3 | not started | AoE responsive combat |
| REQ-53 | request-audit | Later commanders/formations/professional army | Claude | Claude N3 | not started | commanders / formations / professional army |
| REQ-54 | request-audit | Civ empire scale, later diplomacy/secession | Claude | Claude N4 | not started | empire scale / secession |
| REQ-55 | request-audit | Civil administrators automate as settlement scales | Codex | Codex N2 | not started | civil administrators |
| REQ-56 | request-audit | More useful buildings, Dawn of Man breadth | Claude | Claude W1 | source-pushed-not-live | more useful buildings / Dawn of Man breadth — Experience families source-pushed |
| GAP-CEREAL-BYPRODUCTS | master-gap | Chaff/straw need bounded handling and useful historically grounded outlets (fodder where suitable, bedding, compost, fuel/building mix); … | Codex | Codex W5 | not started | driver including outlets and disposal |
| GAP-CONTAINER-IDENTITY | master-gap | Individual jars/amphorae/pithoi: liters, tare, content weight, seal, condition, maker, one owner/location and finite transfer. | Codex | Codex W5 | not started |  |
| GAP-FARM-LABOR-CALIBRATION | master-gap | Explicit area/seed/net edible yield/person-hours/loss/soil/moisture scale; abstract260 yield is not automatically kilograms. | Grok | Grok W8 | not started |  |
| GAP-FIRST-PERSON-LATER | master-gap | Later optional first-person management/combat shares movement/damage APIs and preserves RTS controls/performance. | Codex | Codex L2 | explicitly later/out of scope | optional later; not first-release critical path |
| GAP-GOLD-SILVER-EXCHANGE | master-gap | Later gold/silver exchange media with actual extraction, weights/measures, trust and finite transactions; monetary institutions remain ac… | Codex | Codex L5 | explicitly later/out of scope | later monetary media |
| GAP-MECHANICAL-MILLING | master-gap | Current-driven wheels, millrace intake/outfall head/flow, cascades and windmills; real seasonal staff/maintenance/throughput. | Grok | Grok T4 | source-pushed-not-live | site/current source-pushed; buildings wired tonight |
| GAP-RESOURCE-VOLUME | master-gap | Remove seeds from the compact main HUD; retain measurable planting reserve in farm/storage detail. Replace equal-count storage with expli… | Codex | Codex W5 | not started | driver including HUD |
| GAP-RIVAL-CITY-PLANNING | master-gap | Some growing villages develop organized streets, civic cores, markets and production districts. Others remain organically irregular. Seed… | Grok | Grok N2 | not started | Grok drives physical streets/clearing; Claude reviews layout |
| GAP-RUIN-EXPLORATION | master-gap | Distinct visibly ruined ancient sites with explorable artifacts and occasional recoverable ancient knowledge. Generate coherent culture/s… | Claude | Claude N5 | not started | driver including knowledge-grant rules |
| GAP-SEASONAL-REPORT-UX | master-gap | Report appears at season end only; live and historical production/food/weapons/major-resource comparisons and graphs accessible in ledger. | Claude | Claude N1 | not started | Claude drives UI; Codex supplies numbers |
| GAP-SIX-CULTURE-INSPIRATIONS | master-gap | Egyptian river valley, Nabataean desert, French temperate, Chinese, Pacific Islander and Indigenous North American inspirations with spec… | Claude | Claude W7 | source-pushed-not-live | 14-civ bible source-pushed 9992fe9 |
| GAP-VILLAGE-REQUESTS | master-gap | Neighboring villages offer need-based quests/requests with actual goods, relationships and consequences, not repeatable free rewards. | Claude | Claude W2 | not started |  |
| GAP-WOODLAND-RESIDENTS | master-gap | Scattered independent woodland inhabitants with homes, inventories and contextual conversations. | Grok | Grok N1 | not started | driver including conversations; Claude reviews dialog |
| CHAT-G10-FOG-PROVENANCE | chat |  | Grok | Grok W13 | source-pushed-not-live | overlay live 39115987; exact-radius attribution open |
| CHAT-G13-BOAT-DIMENSIONS | chat |  | Codex | Codex T4 | done/live | 687e82a advisory class metre dimensions match measured mesh envelopes;1focusedPASS; no collision/seat changes |
| CHAT-G14-DEEPWATER-PORTS | chat |  | Grok | Grok W10 | not started | Grok drives depth/admission; Codex hulls already in T4/N5 |
| CHAT-G15-TRADE-DIVERSITY | chat |  | Claude | Claude W2 | source-pushed-not-live | Claude drives offers/frequency/UI; Codex W7 prices |
| CHAT-G16-DEEPWATER-STORMS | chat |  | Claude | Claude W2 | source-pushed-not-live | storms source-pushed; consume Grok deepWater; Codex weather/hull effects if needed |
| CHAT-G2-GOLDEN-HOUR | chat | Preserve explicit time/weather exceptions and daylight behavior while reviewing warm low-angle grading. | Claude | Claude T8 | source-pushed-not-live | grade function source-pushed; daylight lerp not wired |
| CHAT-G4-LEADER-PRESENTATION | chat | Track era availability and actual leader presentation separately from contextual dialog contents. | Claude | Claude T6 | source-pushed-not-live | LeaderPortrait wired in EncounterDialog beside LeaderConversation (council/EncounterPortrait.tsx; real flag colours, recorded relation only) 1d87743 |
| CHAT-G6-CULTURAL-NAMES | chat |  | Claude | Claude W2 | source-pushed-not-live | source-pushed 103f41f / e69b8f8 |
| CHAT-G7-FOOD-TASTE | chat | Document tunable taste/enjoyment units and test morale/benefit versus preparation labor; treat supplied ranking as tentative, no new unsa… | Codex | Codex W3 | not started | accepted-pending |
| CHAT-G9-LAB-FLOW | chat | Track these three separate UI actions and acceptance; native lab scenario only, no private village overwrite. | Codex | — (done) | done/live | live-partial: lab enter/restart/save exists at 39115987; only remaining actions on audit |
| BOARD-G1 | board-gap | Era score and victory conditions that give AI societies something to strive for | Codex | Codex T6 | live-partial | a6e8cbd: all eight formula components wired, including weighted settled political outcomes and player defense-only fronts;37/37scoped native/built checks, tsc/buildPASS. Raider-goal scoring, broader trade/AI/victory remain open; docs/metrics/war-prestige-release-2026-11-12.json |
| BOARD-G10 | board-gap | Map auto-explored without the player sending anyone | Grok | Grok W13 | source-pushed-not-live | same as CHAT-G10 |
| BOARD-G11 | board-gap | Village personalities with different incentives | Claude | Claude W2 | source-pushed-not-live | village personalities source-pushed |
| BOARD-G12 | board-gap | Fun-loop measure: threat, decision and payoff in a short session | Claude | Claude L2 | gated on Boris | fun-loop metric; default no until the decision card says yes |
| BOARD-G2 | board-gap | Golden-hour light dominant during play | Claude | Claude T8 | source-pushed-not-live | same as CHAT-G2 |
| BOARD-G3 | board-gap | Buildings visibly change on rebuild/extension and with wealth; per-village style | Claude | Claude W1 | source-pushed-not-live | buildings change with era/wealth; eraMode fixed + civ variants source-pushed |
| BOARD-G4 | board-gap | Leader encounter shown as an on-screen portrait from the Stone Age on | Claude | Claude T6 | source-pushed-not-live | same as CHAT-G4 |
| BOARD-G5 | board-gap | Rise and fall: some villages become powerful, others collapse; game continues | Claude | Claude W2 | source-pushed-not-live | rise and fall / refound |
| BOARD-G6 | board-gap | Culture naming: strange ancient-sounding names, no stock repeats | Claude | Claude W2 | source-pushed-not-live | same as CHAT-G6 |
| BOARD-G7 | board-gap | Food taste/enjoyment ranking separate from calories | Codex | Codex W3 | not started | same as CHAT-G7 |
| BOARD-G8 | board-gap | Periodic stutter / lag at 30+ people | Codex | Codex L1 | explicitly later/out of scope | periodic stutter; sim Worker parked until Codex N3; do not start L1 early |
| BOARD-G9 | board-gap | Test lab: one click to enter, restart without leaving, save inside it | Codex | — (done) | done/live | same as CHAT-G9 lab flow |
| WQ-1 | wiring-queue | Validator for optional worldOptions.riverProfileVersion === 2 | Grok | Grok T2 | not started | riverProfileVersion validator — moved to Grok |
| WQ-10 | wiring-queue | Wire planFieldArea / fertilityPreview; optional per-section fish cap | Grok | Grok T9 | source-pushed-not-live | planFieldArea / fertilityPreview source-pushed; not in placement UI |
| WQ-11 | wiring-queue | Option H world.ts call site, light-rig, H-only daylight lerp; default renderStyle current | Claude | Claude T8 | source-pushed-not-live | Option H adapter; Claude drives including world.ts |
| WQ-12 | wiring-queue | CarvedBuildingLayer lifetime bucket eviction | Claude | Claude T7 | not started | CarvedBuildingLayer bucket eviction |
| WQ-13 | wiring-queue | Capitulation / domination / captive / trade UI and dropped-parcel visual | Claude | Claude T6 | source-pushed-not-live | conquest/trade/captive UI; specs exist, not wired |
| WQ-14 | wiring-queue | Six Societies primitives that block armor/weapons/tools/animal trade | Codex | Codex T2 | live-partial | Six backend primitives livebd1667a;56/56focused+1/1built native53 import/render/save/restore;tsc/buildPASS. Physical tradeNeeds gear/animal consumer journeys remain off/pending; no gate credit |
| WQ-2 | wiring-queue | Validator for optional worldOptions.tideVersion === 1\|2 | Grok | Grok T2 | not started | tideVersion validator — moved to Grok |
| WQ-3 | wiring-queue | Validator for optional worldOptions.landformLabelVersion === 2 | Grok | Grok T2 | not started | landformLabelVersion validator — moved to Grok |
| WQ-4 | wiring-queue | Water-works as real building types: well, cistern, watermill, windmill, aqueduct, canal | Grok | Grok T4 | source-pushed-not-live | site rules source-pushed; buildings/recipes not live — Grok wires end to end |
| WQ-5 | wiring-queue | Flow fields: enable existing per-game switch for new games | Grok | Grok T5 | source-pushed-not-live | flowFields.ts source-pushed, switch default off; turn ON for new games |
| WQ-6 | wiring-queue | Sea mesh raised by runtime world.seaTideY (rivers/lakes stay) | Grok | Grok T6 | source-pushed-not-live | seaTideY runtime exists; sea mesh not raised — Grok wires world.ts |
| WQ-7 | wiring-queue | eraMode rebuild/extend gameplay benefits + save field/validator | Codex | Codex T5 | done/live | 5ba10a1 on8086/8101: paid cache/body/site work, bounded repairable durability without healing, shifted extension reservations, strict saves, owner commands and compact controls; native56.2s carrying-reload/work and actualbuilt Extend/save passed. Experience fixed-era visual consumer remains Claude T3 |
| WQ-8 | wiring-queue | Placement rotate: R-key/ghost passes quarterTurn to preview and commit | Grok | Grok T8 | source-pushed-not-live | quarter-turn footprints 346faad; R-key control not wired |
| WQ-9 | wiring-queue | Mesh yaw = buildingQuarterTurns * π/2; draw river section.corners and fishRecoveryPerMinute | Claude | Claude T5 | source-pushed-not-live | mesh yaw + river section draw + fish remaining |
| GW-01 | grok-world | Tight-space stuck/loop navigation | Grok | Grok T1 | source-pushed-not-live | tight-space nav 2a9fa79 / 5f2b1b2 on agents/grok-world; land with T1 |
| GW-02 | grok-world | Whole drawn area plants as one field; fields roll over hills | Grok | Grok T9 | source-pushed-not-live | planFieldArea b789597; engine/UI wiring tonight |
| GW-03 | grok-world | Stable camera over mountains and while zooming | Codex | Claude T2 | source-pushed-not-live | dolly-before-lift withdrawn; fixed-angle collision b86507f in PR #1, needs Claude review; flat zoom already live 3ec1beb |
| GW-04 | grok-world | River fish/clay finite per clickable rectangular reach section | Grok | Grok T9 | source-pushed-not-live | sections/rates cfcf3a8; optional stock cap + Claude T5 draw/panel |
| GW-05 | grok-world | Wells as a building; automatic water collection from wells and freshwater | Grok | Grok T4 | source-pushed-not-live | well site rules source-pushed; building not live |
| GW-06 | grok-world | River currents drive mills; aqueducts, cisterns, canals as real works | Grok | Grok T4 | source-pushed-not-live | currents 7e74ddf, canal/aqueduct jobs d99698e; mill/boat/UI hooks tonight (currentPowerKw, commission UI) |
| GW-07 | grok-world | Moves to unseen ground go, or go as close as possible, without hinting | Grok | Grok T1 | source-pushed-not-live | unseen moves 403f506; land with T1 |
| GW-08 | grok-world | Buildings fit tighter gaps and can rotate during construction | Grok | Grok T8 | source-pushed-not-live | footprints 346faad; R-key not wired; mesh yaw is Claude T5 |
| GW-09 | grok-world | Territory borders at rivers; contested flag claims; valuable land scores more | Grok | Grok W1 | source-pushed-not-live | landValue 10d6d81; domination hook W1; score formula is Codex T6 |
| GW-10 | grok-world | Fertility visible and water-proximate in placement | Grok | Grok T9 | source-pushed-not-live | fertilityPreview b789597; wire in placement UI |
| GW-11 | grok-world | Landforms distributed, never clustered; no gentle-land bias | Grok | Grok W11 | source-pushed-not-live | measured; landformLabelVersion 2 source-pushed; turn on with T2 and finish distribution defects |
| GW-12 | grok-world | Smooth non-blocky rivers and smoother, less pronounced trails | Claude | Claude T4 | source-pushed-not-live | profile v2 e158781 + display polylines ee34c8c; Claude must draw; physics unchanged |
| GW-13 | grok-world | Mountains are hikeable; assign people to prospect | Grok | — (done) | done/live | hikeable mountains 1b7cade; mining economy leftovers are Codex W4 |
| GW-14 | grok-world | Multiple towns per large island | Grok | Grok N6 | source-pushed-not-live | townCapacity 70ed21c; settlement planning/UI not live |
| GW-15 | grok-world | Scenic beauty measured; above-average viable starts | Grok | Grok T7 | source-pushed-not-live | scenicBeauty.ts 59f0e24; scenicStartReport new-game hook not live (M1-17 scores already verified) |
| E1 | interface | Capitulation terms, domination status, captive panel, trade dialog, dropped-parcel visual | Claude | Claude T6 | source-pushed-not-live | same as WQ-13 |
| IFACE-C1 | interface | Persist renderStyle current \| optionH | Codex | — (done) | done/live | graphics.ts renderStyle live 860863a |
| IFACE-C10 | interface | world.ts Option H adapter, light-rig, H-only daylight lerp, render-check | Claude | Claude T8 | not started | Option H world.ts adapter — Claude drives |
| IFACE-C11 | interface | Hull length/beam per class; h-good icons; wonder-kit preset save location | Codex | Codex T4 | live-partial | 687e82a dimensions and bounded injected wonder preset store5/5focused; Experience mesh/preset UI consumers and icons still require own wiring |
| IFACE-C12 | interface | Wire lit from real fire | Claude | Claude T8 | source-pushed-not-live | lit input is survivalNeeds.hearthHeating; H adapter not wired |
| IFACE-C13 | interface | CarvedBuildingLayer lifetime bucket eviction | Claude | Claude T7 | not started | CarvedBuildingLayer eviction |
| IFACE-C14 | interface | Repair stolen-cargo conservation / custody | Claude | Claude W2 | source-pushed-not-live | stolen-cargo conservation; last review 9a40164 blocked, P1 fixes claimed b4386e8 / 1f77972 |
| IFACE-C15 | interface | Confirm scout-food custody consumers; typed loads stay disabled | Claude | Claude W9 | not started | confirm scout-food custody consumers |
| IFACE-C2 | interface | Sim in a Web Worker; p95 <33 ms Low @ 100 residents | Codex | Codex L1 | explicitly later/out of scope | Worker parked; p95 67.74ms missed 33ms; revisit after Codex N3 |
| IFACE-C3 | interface | LOD / frustum hooks | Codex | — (done) | done/live | InstanceCameraCull.query live d4d3cba |
| IFACE-C4 | interface | Hull / crew / sail API confirmation | Codex | — (done) | done/live | hull/crew/sail seams confirmed; sea exploration live f09578d |
| IFACE-C5 | interface | sim.ts phase-registry decomposition | Codex | Codex W10 | source-pushed-not-live | small hooks yes, no generic phase registry; only if it unblocks a hook |
| IFACE-C6 | interface | Real stranded-crew rescue after hull loss | Codex | Codex T3 | done/live | 687e82a on8086/8101; native original survivor swims107m, strict midwater reload, physical cache cargo delivery; bounded planner; offshore captive rescue remains unsupported |
| IFACE-C7 | interface | Quiet NPC toggleSail | Codex | — (done) | done/live | quiet NPC toggleSail 1a6e71e |
| IFACE-C8 | interface | Sail-rig / hull-service eligibility during sea muster | Codex | — (done) | done/live | sail-rig / hull-service eligibility during sea muster f09578d / 01e6f66 |
| IFACE-C9 | interface | Sign-off optional types.ts trade/cargo/storm fields and conquest wiring | Codex | Codex T2 | not started | optional types.ts trade/cargo/storm fields; single-owner rule lifted — still implement/wire with T2 |
| IFACE-G1 | interface | Water-route query, observed water only | Grok | — (done) | source-pushed-not-live | planObservedWaterRoute 26bd1c8; land with T1; Claude must consume in W2 |
| IFACE-G10 | interface | G10 fog overlay + persist observed vision | Grok | — (done) | done/live | G10 overlay + persist live 39115987 + sight-radii f41f395; attribution leftover is W13 |
| IFACE-G10a | interface | G10 fog overlay + persist observed vision (board G10a) | Grok | — (done) | done/live | 39115987 + f41f395; same as IFACE-G10 |
| IFACE-G11 | interface | Camera dolly-before-lift vs fixed-angle collision (decided: fixed-angle) | Codex | Claude T2 | source-pushed-not-live | camera decision: use Codex fixed-angle; b86507f in PR #1 awaiting Claude review |
| IFACE-G14 | interface | Deep-water port and draft admission for larger hulls | Grok | Grok W10 | not started | same as CHAT-G14 |
| IFACE-G2 | interface | sampleSite height/biome/slope | Grok | — (done) | source-pushed-not-live | sampleSite W1; Experience siteGrounding adapted; land with T1 |
| IFACE-G3 | interface | Flow fields for busy goals | Grok | Grok T5 | source-pushed-not-live | flow fields source-pushed, switch off; enable tonight |
| IFACE-G4 | interface | Territory / influence while occupation.phase==='dominated' | Grok | Grok W1 | source-pushed-not-live | dominatedTerritory.ts source-pushed; hook after societies lands |
| IFACE-G5 | interface | Canonical deep-water extents for G16 | Grok | — (done) | source-pushed-not-live | deepWater.ts b7bb032; Claude consumes for G16 |
| IFACE-G6 | interface | Tide range, exposure, flow, river width, bank height, harbour/market terrain levels | Claude | Claude W4 | source-pushed-not-live | Grok delivered wonderSites/tides/width/banks; Claude must consume |
| IFACE-G7 | interface | engine.ts R-key / rotate ghost passing quarterTurn | Grok | Grok T8 | not started | R-key rotate — same as WQ-8 |
| IFACE-G8 | interface | Mesh yaw; draw river section.corners and fishRecoveryPerMinute | Claude | Claude T5 | not started | mesh yaw + river corners + fish — same as WQ-9 |
| IFACE-G9 | interface | Wire planFieldArea / fertilityPreview; optional per-section fish cap | Grok | Grok T9 | not started | planFieldArea / fertility / fish cap — same as WQ-10 |
| GOV-ART-HOLD | governing | H/E are proposals; preserve current art and original references. New runtime overhaul needs approval/performance proof. | Claude | Claude W1 | done/live | superseded 2026-11-11: Boris pre-approved visuals; Option H ships default-on once performance holds, current style kept as fallback |
| GOV-CONTEXTUAL-CONFLICT | governing | Raid/capture/intact occupation/tribute emerge contextually; no compulsory predeparture wizard. | Claude | Claude W2 | source-pushed-not-live | no compulsory pre-raid wizard |
| GOV-DESKTOP | governing | Desktop only supersedes Astra08 mobile rendering; preserve keyboard accessibility. | Claude | Claude W10 | done/live | desktop-only supersedes Astra-08 mobile; keep keyboard access (Claude W10 / Codex audit) |
| GOV-ENGINE-LATER-AGES | governing | Godot/custom-engine migration and1700s/firearms/mounted armies deferred, not deleted; current game keeps shipping. | Codex | Codex L3 | explicitly later/out of scope | no engine migration now; 1700s/firearms/mounted deferred to L4 |
| GOV-EXTERNAL-OWNER-AUTHORITY | governing | Latest parent/user allocation grants Claude/Grok/Gemini full implementation authority within owned stream; earlier Grok text-only restric… | Grok | Grok T10 | done/live | superseded by main 9bd490b: anyone may edit any file |
| GOV-MAP-VARIETY | governing | Mostly-land edge/corner continents, divided continents, archipelagos and rare dominant-island maps are valid; no universal strict island … | Grok | Grok W5 | not started |  |
| GOV-MODEST-MAC | governing | 8GB M1 Mac: one heavy build/browser/simulation process at a time; no retained review screenshots/previews after verified fixes. | Codex | Codex W10 | done/live | 8GB M1: one heavy build/browser/sim at a time; standing constraint |
| GOV-ORGANIC-KNOWLEDGE | governing | Needs/observations/samples→paid experiments→demonstration→adoption supersedes Astra17 timed points/exclusive tree; save migrations qualif… | Codex | Codex W2 | live-partial | 38b4103: compact states/sources, actual paid teaching+crop receipts and free-owned resident method migration;26/26scoped checks, tsc/buildPASS; traded/captured techniques and wider institutions remain open; docs/metrics/knowledge-provenance-release-2026-11-12.json |
| GOV-PROGRESS | governing | Frozen hearthwild-first-release-gates-v1 denominator98. Source/component tests and this audit award no gate credit; verify published nume… | Codex | Codex N3 | done/live | frozen 34/98 until Codex flips gates from native/built evidence only |
| GOV-RETAIN-SCOPE | governing | All120 including former optional extensions and all25 original tasks remain; no acceptance upgrades from source. | Grok | Grok L3 | done/live | AUTOPILOT retains all 120 catalogue items and 25 Astra tasks; Grok re-audits daily |
| GOV-SAVE-PHYSICAL-ECONOMY | governing | Preserve saved villages, actors, finite goods, knowledge and origin; explicit compatible migrations; assets need verified redistribution … | Codex | Codex T1 | done/live | standing guardrail: old saves and Boris's villages must load; enforce on every merge |
| GOV-USER-UPDATE-POLICY | governing | User canceled hourly updates. Batch/push status must stay truthful. | Grok | Grok T10 | done/live | no hourly pings; daily short summary only |
| AGENTS-MD-TRIM | incentive | Optional trim of AGENTS.md / AGENTS.project.md | Codex | Codex L5 | explicitly later/out of scope | Codex owns the files; not decided, not blocking |
| ARMOR-A1 | incentive | Padded torso armor: paid tailor batch, unique owned asset | Codex | — (done) | done/live | runtime 9c81021, acceptance 86/86 bounded batch |
| ARMOR-A2 | incentive | Armor ownership/condition through cache, equip, death, theft, save | Codex | Codex W6 | not started |  |
| ARMOR-A3 | incentive | Combat protection and movement burden; no hunger/cold reduction | Codex | Codex W6 | not started |  |
| ARMOR-A4 | incentive | Readable equipment UI and visible torso/helmet/shield geometry | Codex | Codex W6 | not started | Codex drives including UI; Claude reviews look |
| ARMOR-HIDE-SHIELD-HELM | incentive | Hide armor, shields, helmets after their inputs exist | Codex | Codex W6 | not started | metal helmets after Codex W4 |
| CANAL-BREACH-FIX | incentive | Merge-induced canal-breach test failure on integration cbffbc8 | Grok | Grok T1 | not started | scripts/canal-breach.test.mjs: breach.length actual 8 expected 9 |
| CURD-UI-CONFLICT | incentive | Worker vs curd conflicts in CraftSiteQueue.tsx and ProductionControls.tsx | Claude | Claude T1 | done: merged on integration/2026-11-11 64f1af0 | curd + async dispatch both kept; tsc 0 new real errors; curd/dairy/canal-breach/rulers 45/45; UI worker tests need real deps (native check by Codex) |
| CURRENT-POWER-HOOK | incentive | currentPowerKw drives mill rates | Grok | Grok T4 | source-pushed-not-live | query exists in riverCurrents.ts; not hooked to recipes |
| DRIFT-AT-HOOK | incentive | driftAt applies to boats | Grok | Grok T7 | source-pushed-not-live |  |
| ERA-DEFAULT-FIXED | incentive | Flip DEFAULT_ERA_MODE to fixed | Claude | Claude T3 | not started | decided 11 Nov 18:08 ET |
| FIXED-CAMERA-REVIEW | incentive | Review 13-line fixed-camera edit to src/scene/world.ts | Claude | Claude T2 | source-pushed-not-live | b86507f already in PR #1 |
| FOOD-CUSTODY-PROTO | incentive | Disabled food-custody prototype; migrate all consumers before activation | Codex | Codex W11 | source-pushed-not-live | work/codex-food-custody-prototype-2026-11-11 26fe69b |
| GRAPHIFY-WORKFLOW | incentive | Use Graphify to navigate the repo and save tokens | Grok | Grok T10 | done/live | docs/parallel/GRAPHIFY_WORKFLOW.md on main c619d08; standing practice |
| INC-ARCH-REFERENCES | incentive | Each production family has a cited historic structure/photo reference | Claude | Claude W7 | not started |  |
| INC-AUTO-WORK | incentive | Manual opening vs Auto work; drinking water stays automatic | Codex | — (done) | done/live | Auto work toggle and automatic water exist on main; re-check on audit |
| INC-BREWING | incentive | Beer with real grain/malt/water/fuel/vessel/labor; not a water sterilizer | Codex | Codex W3 | not started |  |
| INC-BUILDING-FIRE | incentive | Building fire, repair, recoverable loss | Codex | Codex W9 | not started |  |
| INC-CANALS | incentive | Drag route/width/depth; real excavation; finished channel carries water | Grok | Grok T3 | source-pushed-not-live | W7 jobs + approved breach; commission UI tonight; integration test fix T1 |
| INC-CLAIM-CONTROL | incentive | Flags claim; control from settlement/fort/garrison; contested incompatible claims | Grok | Grok W1 | source-pushed-not-live | landValue source; hook domination W1 |
| INC-CLAY-MUDBRICK | incentive | Clay to mud-brick chain | Codex | Codex W11 | not started | Grok supplies finite reach clay in GW-04 |
| INC-COMMAND | incentive | Commanders organizing actual forces | Claude | Claude N3 | not started |  |
| INC-CROP-IDENTITY | incentive | Grain, pulses, tubers have distinct contour-true silhouettes | Claude | Claude W5 | not started |  |
| INC-CULTURAL-IDENTITIES | incentive | Original cultures from geography and practice, not 1:1 modern presets | Claude | Claude W1 | source-pushed-not-live |  |
| INC-DAYLIGHT-PACING | incentive | Daytime game: 88–94% daylight share, 24x clock slowdown | Codex | — (done) | done/live | DAYLIGHT_PACING_RULES on main |
| INC-DEFENSE-HORN | incentive | Defense horn calls nearby adults with real stored weapons; then stand down | Claude | Claude W2 | not started |  |
| INC-ENGINE-EVAL | incentive | Isolated later engine prototype; do not migrate now | Codex | Codex L3 | explicitly later/out of scope |  |
| INC-GEO-INFLUENCE | incentive | Influence decays along real routes; mountains/seas block until transport | Grok | Grok W14 | not started |  |
| INC-GOAT-FIND | incentive | Find-goat is a persistent order: search, capture, escort, pen, bounded failures | Codex | Codex W1 | not started | diagnose existing path; no invented animals |
| INC-GRAPHICS-QUALITY | incentive | Low/Medium/High remembered; no color shift from pipeline swaps | Codex | Codex W10 | source-pushed-not-live | settings exist; remember/pipeline leftovers |
| INC-HORSES | incentive | Stables, horses, burden animals, riding; chariots later | Codex | Codex W1 | live-partial | 455cd37 actual native horses→paid capture→pen→stable→same-ID pack;3× care/places,3.5× healthy capacity,25/25scoped; riding/traction/broader species remain open; no98gatecredit |
| INC-HOUSE-VARIATION | incentive | Valid footprint/frame/roof variation fitted to terrain; identity saved | Claude | Claude W1 | source-pushed-not-live |  |
| INC-HUNT-PREP | incentive | Hunting with real weapons; carcass transport, butchery, hide curing | Codex | — (done) | done/live | covered by verified M1-10 |
| INC-IRRIGATION | incentive | Crops/cisterns from real channels; finite throughput; no universal bonus | Grok | Grok W3 | not started |  |
| INC-MILITIA-BARRACKS | incentive | Militia stand down to civilian work; barracks are real infrastructure | Claude | Claude W2 | source-pushed-not-live |  |
| INC-MINIMAP-SQUARE | incentive | Replace irregular minimap camera outline with a thin muted square | Claude | Claude W10 | not started |  |
| INC-NAVAL | incentive | Ports, vessel roles, naval combat, supplies, repair | Codex | Codex N5 | source-pushed-not-live | sail/sea exploration live; combat leftover |
| INC-PERISH-CLOTHES | incentive | Perishable food and distinct hot/cold clothing | Codex | Codex W3 | source-pushed-not-live | preservation and wool coats partial |
| INC-PERSONAL-ABILITIES | incentive | Compact resident stats, practice, teaching, bounded specialization | Codex | Codex W9 | not started |  |
| INC-QUARRY | incentive | Lower quarry startup cost; show reachable deposit area/capacity | Codex | Codex W9 | not started |  |
| INC-RAIDER-INCENTIVES | incentive | Wealth tempts; defense deters; raiders have camps and can settle | Claude | Claude W2 | source-pushed-not-live |  |
| INC-SCORE | incentive | Versioned prestige/score components with caps; no infinite flags | Codex | Codex T6 | live-partial | a6e8cbd: all eight formula components wired, including weighted settled political outcomes and player defense-only fronts;37/37scoped native/built checks, tsc/buildPASS. Raider-goal scoring, broader trade/AI/victory remain open; docs/metrics/war-prestige-release-2026-11-12.json |
| INC-SIEGE | incentive | Siege deployment, crew, ammunition, no remote damage | Claude | Claude W2 | source-pushed-not-live | staffed ram source-pushed |
| INC-SITE-PREP | incentive | Placement queues tree/stone clearing; paid materials; no trapped workers | Grok | Grok W9 | not started |  |
| INC-TOWERS | incentive | Paid material-dependent tower height; unfinished towers do not shoot | Claude | Claude N3 | not started |  |
| INC-TRADE-PARTIAL | incentive | Partial trade offers keep unit price; transport only the quoted payment | Claude | Claude W2 | not started |  |
| INC-TRENCHES | incentive | Smooth excavation with depth, grades, drainage, saved edits | Grok | Grok W14 | source-pushed-not-live | trench buildings exist; smoothness/drainage leftovers |
| INC-TRIBE-FLAG | incentive | Player names tribe, symbol, flag, palette; persist on diplomacy and gear | Claude | Claude W6 | not started |  |
| INC-UNBUILT-CAMP | incentive | Fresh society starts with people and supplies, no completed structures | Codex | — (done) | done/live | M1-01 verified |
| INC-WATER-HEARTH | incentive | Collected water; hearths consume real fuel; cooking/curing fuel | Codex | Codex W9 | source-pushed-not-live | M1-06/07 live; cooking/curing chain leftovers |
| INC-WILD-DOMESTIC | incentive | Find, capture, tame, drive, house wild animals; pen area sets capacity | Codex | Codex W1 | live-partial | 455cd37 actual native horses→paid capture→pen→stable→same-ID pack;3× care/places,3.5× healthy capacity,25/25scoped; riding/traction/broader species remain open; no98gatecredit |
| INC-WILDFIRE | incentive | Player and rival fires/disasters with causes, mitigation, recoverable loss | Grok | Grok W7 | not started | wildfire/flood; building fire is INC-BUILDING-FIRE |
| INC-WONDERS | incentive | Six wonder grammars as seeded 3D paid construction with function/prestige | Claude | Claude W1 | source-pushed-not-live | wonderKit 9992fe9; earthworks labour is Grok W15 |
| PR-1-INTEGRATION | incentive | Normal-merge PR #1: World W7, Societies, Experience, clean Codex branches | Codex | Codex T1 | done/live | Normal whole-branch merges landed339d9b8; release2026-11-12T01-58-40-150Z-339d9b8 on8086/8101;24/24focused+1/1built native53save/queue/restore;tsc+buildPASS; no gate credit |
| SCENIC-START-HOOK | incentive | scenicStartReport feeds new-game town-hall pick | Grok | Grok T7 | source-pushed-not-live | 59f0e24 |
| SIEGE-S1 | incentive | Staffed timber ram: paid build, crew, reachable gate/wall, recovery | Claude | Claude W2 | source-pushed-not-live | rivalSiege.ts 0d1713a |
| SIEGE-S2 | incentive | Projectile siege engine: ammo, crew, reload, range, collision | Claude | Claude N3 | not started | after S1 is live |
| SIEGE-S3 | incentive | Societies choose siege from observed defenses; surrender/occupation alternatives | Claude | Claude W2 | source-pushed-not-live |  |
| WONDER-EARTHWORKS | incentive | Wonder cuts as ordinary excavation labour | Grok | Grok W15 | source-pushed-not-live | wonderEarthworks.ts on agents/grok-world; wire into live wonder jobs |
| CP-1 | completion-plan | Phase 1 Speed: profile hot paths, Worker, p95 <33ms Low @ 100 residents | Codex | Codex N3 | not started | Worker parked (C2); unpark after N3 |
| CP-2 | completion-plan | Phase 2 Integrate behind switches: societies, experience, world, hooks | Codex | Codex T1 | live-partial | Whole Societies/Experience/World +curd landed/live339d9b8; remaining named hook rows stay open;25/25batch checks, tsc+buildPASS |
| CP-3 | completion-plan | Phase 3 See the real game: desktop three.js screenshots vs concept art | Claude | Claude W1 | not started | Claude self-reviews against concept art; pre-approved |
| CP-4 | completion-plan | Phase 4 Systems fill in parallel lanes | Grok | Grok L3 | not started | work is the three queues; Grok tracks fill as PM |
| CP-5 | completion-plan | Phase 5 Visual overhaul: biomeTerrain, civ packs, wonderKit, postfx | Claude | Claude W1 | source-pushed-not-live |  |
| CP-6 | completion-plan | Phase 6 Scale: hundreds of residents, LOD, BatchedMesh, per-chunk sim, 8GB | Codex | Codex N3 | not started | world-side scale is Grok L2 after this |
| CP-7 | completion-plan | Phase 7 Acceptance: re-run frozen checklist; Codex reconciles backlog/log | Codex | Codex N3 | not started | Any provider may reconcile verified native/built acceptance under Grok sequencing; frozen denominator 98, no unsupported credit |
| AUDIT-CAPTURE-CONSTRUCTION-INTENT | audit | Captured/released builders retain paid materials but clear former-owner construction intent; player release remains saveable | Codex | Codex T5 | done/live | 5ba10a1; actual surrender, physical paid carrier, release and strict reload passed; replacement builder may legitimately resume |
| AUDIT-HANDOVER-CONSTRUCTION-INTENT | audit | Verify former player construction intent when an entire community transfers to a rival, preserving whole-project paid custody | Codex | Codex W4 | done/live | 1422a78 clears only unpaid player queue intent after existing paid settlement; actual paid cook batch/third-party prisoner/guard transfer, state purity/conservation and strict reload passed; no interruptMission shortcut |
| AUDIT-GOAT-RESERVED-HOME-PLACES | audit | Queued goat searches share the capture system’s home-place reservations for escorted animals | Codex | Codex W1 | done/live | 1422a78 same occupied-place predicate; full pen waits without journey-food spending, away/reserved UI count, native generated-goat queued capture/escort/pen and strict paid-progress reload passed |
| MS-1 | milestone | Unbuilt camp → first winter → sustainable surplus | Codex | — (done) | done/live | M1-20 verified |
| MS-2 | milestone | Priority change/direct override during hauling and paid work | Codex | Codex N6 | source-pushed-not-live | M0 construction gates live; connected scenario still to re-run |
| MS-3 | milestone | Rival–rival trade, conflict, treaty and recovery | Claude | Claude N7 | not started |  |
| MS-4 | milestone | Boat/caravan delivery, interception and save/load | Codex | Codex N6 | source-pushed-not-live | boats M3-01 live; caravan interception leftover |
| MS-5 | milestone | Raid arrival, local defense, loot/retreat and aftermath | Claude | Claude N7 | not started |  |
| MS-6 | milestone | Society loses its hall, survives and refounds | Claude | Claude N7 | source-pushed-not-live | M1-03 hall-loss survival verified; refound leftover |
| MS-7 | milestone | Classical advancement and all five victory paths | Codex | Codex N1 | not started |  |
| MS-8 | milestone | Large-world terrain, dry placement and mountain-route checks | Grok | Grok W10 | not started | gallery review is Claude N7 (M5-04) |
| DECISION-KNOWLEDGE-OWNERSHIP | decision | Keep knowledge/tech redesign with Codex, or move it to Claude? | Codex | Codex W2 | gated on Boris | Default until answered: Codex keeps building it (ORGANIC-KNOWLEDGE / Codex W2 does not pause). |
| DECISION-SHORED-CUTS | decision | Allow optional shored/revetted cuts (timber/stone cost, steeper/deeper than 0.24 bank / 2 m cap)? | Grok | Grok L1 | gated on Boris | Default until answered: no, leave the trench rule. Grok L1 only if approved. |

## Coverage counts

- **Total rows: 569. Unassigned: 0.** Duplicate IDs: 0.

### Per source

| Source | Rows |
|---|---|
| gate | 98 |
| astra | 25 |
| catalogue | 120 |
| geography | 36 |
| biome | 8 |
| map-contract | 5 |
| qa | 40 |
| request-audit | 56 |
| master-gap | 13 |
| chat | 10 |
| board-gap | 12 |
| wiring-queue | 14 |
| grok-world | 15 |
| interface | 29 |
| governing | 12 |
| incentive | 59 |
| completion-plan | 7 |
| milestone | 8 |
| decision | 2 |

### Per owner

| Owner | Rows | done/live | source-pushed-not-live | not started | gated on Boris | later/out of scope |
|---|---|---|---|---|---|---|
| Grok | 156 | 15 | 60 | 80 | 1 | 0 |
| Claude | 176 | 13 | 96 | 66 | 1 | 0 |
| Codex | 237 | 70 | 40 | 118 | 1 | 8 |
| **Total** | **569** | 98 | 196 | 264 | 3 | 8 |

Generated 11 November 2026, America/New_York, from origin/main `9bd490b` plus the cited agent-branch handoffs. This document does not change frozen 34/98 gate credit.
| RULERS-LANE | societies | Rulers/dynasty/houses/ties/eras/glory/fame/unrest/civ+faith generator, pure modules (agents/claude-rulers) | Claude | Claude W2 | wired behind worldOptions.rulersVersion | Game.step advanceRulers; new games carry rulersVersion:1; persistence validates; UI panels still to do |
| RULERS-WARDS | societies | Fosterage and hostage exchange commands (foster-houses, exchange-hostages) via engineDispatch; wards persist in rulers.wards, end at 16/8y/war | Claude | Claude A | done: rulers 33/33 on integration/2026-11-11 | next: NPC marriages/alliances, expansion parties, casus belli |
| RULERS-FAMILY-SCALE | societies | Ruling family importance scales with population; every civ has a ruling house | Claude | Claude W2 | done (source+wired) | familyScale.ts gates heirs/claims/great persons by population; rulers-runtime tests 3/3 |

## Roles update — 2026-11-11 20:51 ET (Boris)
- **Grok = PM of everything.** Owns triage and coordination of all fixes, bugs and improvements across every lane. Grok files each bug or fix as an AUTOPILOT row with one owner, and fixes World/nav/placement/water bugs itself.
- **Claude = UI/UX** (all screens, HUD, controls, feedback, onboarding, readability) plus its current systems (diplomacy, leaders, succession, international, visual overhaul) and architecture/conflict lead.
- **Codex** = platform, economy, saves, integration, knowledge/tech, performance.
- **Full utilization rule:** each agent always keeps at least 5 unstarted items in its queue. If an agent's queue drops below 5, it immediately audits its lane and adds items; Grok also tops it up every hour. If an agent has no commits for 3+ hours while work is queued, Grok reassigns its next items to whoever is active. No agent ever waits idle on another; take the next independent item.
- **Bug intake:** any agent that finds a bug outside its lane adds a row (owner by lane, bugs before new features in that queue if they affect players) and keeps going.
| RULERS-MARRIAGE | Claude | done | marryHouses applies signed kinship ties to society relations, population-gated | tests in rulers-runtime |
| EXPANSION-DRIVERS | Claude | done | push/pull/enable/brake model (crowding, hunger, climate memory, cadet kin, open land, weak/rich neighbours, boats, faith, ruler drive, cohesion) drives NPC settlement odds behind rulersVersion; expansionOf() gives stated reasons for UI | tests in rulers-runtime |
| RULERS-UI-COUNCIL | Claude | done | Council and house panel (ruler, family, factions, expansion why, renown, neighbours) via read model 'rulers-council'; 'marry-houses' command validated and gated by house size | tests in rulers-runtime; mounted in Hud tech panel |


## Suite triage — 2026-11-11 21:10 ET (Grok PM)

Full game suites were started on `integration/2026-11-11` `a7c343d` and `origin/main` `4aa1cfd` (still running when these rows were filed). World-caused failures found so far were fixed on `agents/grok-world` (not yet on main): geographic influence flush `6b63db5`, water-works scene/carved registry `b89a5bb`, grain-preview + farm-slope tests `c4a2fa1`, wells/cisterns in `sourceFor` `880c848`. Integration tip after those merges: `8820693`. T1–T7 remain **not** done/live on main until PR #1 lands.

Other-lane failures below are player-facing or suite-blocking; owners should take them **before new features**. Bugs first, then keep at least 5 unstarted items.

| ID | Track | Summary | Owner | Queue | Status | Evidence |
|---|---|---|---|---|---|---|
| BUG-ANNEX-HULL | suite-triage | Native paid hull with afloat loaded crew and a second paid hull must transfer intact, save, and physically return after annexation | Claude | Claude Tonight (bugs first) | not started | `scripts/annexation-transport-culture.test.mjs` fails on main `4aa1cfd` and integration `a7c343d` |
| BUG-ERA-DETAILS | suite-triage | Era details must appear only on completed discovered buildings, stay bounded, and not change the simulation footprint | Claude | Claude Tonight (bugs first) | not started | `scripts/architecture.test.mjs` (`syncEraDetails` count 0 !== 4 on a mock that always reports unexplored); Experience/visuals |
| BUG-ARMOR-UI | suite-triage | Compact selected-resident armor controls must render real condition and local action without mutating stock | Codex | Codex Tonight (bugs first) | done/verified | bd1667a: stale SSR expectation corrected; real ReactDOM owner-query/equip/90percent wear/putaway and read-only projection passed; complete armor suite10/10 |
| BUG-WORKER-CLONE | suite-triage | Off-main-thread module must process its immutable clone without DOM, terrain reconstruction, or random draws | Codex | Codex Tonight (bugs first) | triaged/awaiting original failure stack | bd1667a actual autosaveWorker clone6/6 plus bounded response lifecycle8/8; no runtime failure reproduced or speculative runtime patch; see board decision card |
| BUG-LEGACY-HUNT | suite-triage | Legacy absent-rule keeps historical fresh-kill mode; prepared cargo is never reclassified. Own paid station completion adopts raw rules without undoing via another society or station destruction | Codex | Codex Tonight (bugs first) | done/live | bd1667a removes only redundant terrain-version fallback;6/6camp-animal-processing including fresh/legacy/adoption/strict load and real hide chain |
| BUG-CLIMATE-FUEL | suite-triage | Local climate temperatures are correct, but `survivalStatus.fuelDemandWoodPerSecond` is 0.003 not 0 in the climate exposure case | Codex | Codex Tonight (bugs first) | done/test contract corrected | bd1667a: local exposed resident correctly demands0.003wood/s; test checks zero burn without fuel and finite0.03wood/10s; no runtime cost rebalance |
| BUG-CARAVAN-TRADE | suite-triage | Visiting traders, planned convoys, multi-carrier delivery, capacity/guard waits, pause-and-return, and armed carriers vs away-from-home workforce limits | Codex | Codex Tonight (bugs first) | verified/test contract corrected | 14/14caravan cases pass: actual witness/frontage/loading/payment, finite guards/stock/away cap; runtime unchanged from livebd1667a; broader carrierfile has one unrelated knownWorldsurvey fixture failure |
| BUG-HUNT-PREY | suite-triage | Hunters must take moving prey and bring actual food home (prey HP stayed 2, expected 0) | Codex | Codex Tonight (bugs first) | verified/test contract corrected | Moving prey receives actual hunting projectiles and finite raw meat returns; fresh raw/cooking rules retained. Target2/2 with barter, full carrierfile31/32; remaining failure is Worldsurvey fixture |
| BUG-BARTER-SURPLUS | suite-triage | A local trader must negotiate a small surplus without exporting winter necessities (`quoteShipment` returned no deal) | Codex | Codex Tonight (bugs first) | verified/test contract corrected | Actual local carrier/contact; four wood quoted from28 with24reserve retained; unit price and pure-query stock checks pass; no runtime pricing change |
| BUG-CEREAL-CYCLE | suite-triage | A three-adult grain/pulse holding must complete marked cereal harvest, paid processing/bread, and a second contour crop cycle | Codex | Codex Tonight (bugs first) | verified/test contract corrected | Two full contour crop cycles pass with actual automatic paid work:1172sheaves/220bread, finite input/food/water/fuel ledgers, paid pause/save/resume and actual direct orders; controlled authored terrain, no gate credit |
| B1-PLAY-FLOW-SAVE | suite-triage | Failed durable save refuses disposable Test Lab entry and preserves main village | Codex | Codex B1 | done/verified | 4/4actual lifecycle tests +1/1built failed-write case: actual dawn-of-empire storage write blocked, no Lab/owner replacement or gameplay/durable-slot changes; tscPASS; runtimebd1667a already correct, async fixture repaired |
| BUG-TSC-TOWER | suite-triage | Expansion drivers 72cf269 compare `b.type==='tower'`, which is not a BldType; tsc fails at rulersRuntime.ts:80. Use `watchtower` (and keep/palisade/stonewall as appropriate) | Claude | Claude Tonight (bugs first) | done | Grok fixed on integration `d5591c2`: `b.type==='watchtower'` (only typo in rulersRuntime); `tsc --noEmit` clean. Claude: this is fixed. |
| BUG-INFLUENCE-COOL | suite-triage | 6b63db5 cools tribal tension while geographic influence fields recompute, so a witnessed claim's grievance falls | Grok | Grok Tonight (bugs first) | done | `0b3b0cf` on `agents/grok-world` and integration: unready fields still invent no overlap anger, but an active observed claim holds tension. `witnessed-frontier-claims` 'known old claim remains a grievance' passes; pre-existing paid-legacy-carrier fail on both trees is unchanged. |
| BUG-WORLDGEN-HASH | suite-triage | Additional historical worldgen byte-identity failures on integration vs main 02eca7b isolation (V14/V15/V16/V17/V18C4b cases listed in Grok B3). Many sibling hashes already failed on both trees | Grok | Grok Tonight | done | `74ef18f` on `agents/grok-world` and integration: `worldVariety` no longer stamps `rulersVersion` onto generateWorld options (sim-lane flag stays on `state.worldOptions` via Game.reset). Unintended leak; river/tide/landform remain opt-in. Extra hashes vs main `02eca7b` restored; pre-existing sibling hash failures left as-is. |

## Hourly status rule — 2026-11-11 21:56 ET (Boris)
Every agent (Codex, Claude, Grok) posts one status line at least hourly on docs/parallel/handoffs/claude-coordination.md: `HH:MM ET <agent>: shipped <what> (SHA) / now on <item> / blocked: <none|what>`. Grok rolls these into an hourly update for Boris. An agent that misses two hourly lines in a row is treated as stalled and its next items get reassigned.

## Save-compatibility relaxed — 2026-11-11 22:09 ET (Boris)
Boris has no past villages he cares about. Old-save compatibility is no longer a guardrail: agents may change save formats freely, with no migrations, historic-mode switches, or "old saves load unchanged" tests required. New games must still save and load correctly, and the live deployment must keep running. Features previously hidden behind switches only to protect old saves can be turned on by default once tested.

## Claude status — 22:09 ET
Claude is active: marriage alliances (marryHouses) and expansion drivers (expansionDrivers.ts: push/pull/enablers/brakes feeding NPC settle/migrate/conquer/trade/explore modes with plain-language reasons) are pushed to integration (72cf269). Next: UI panels (council dossier, handover card, factions strip, diplomacy sheet, expansion "why"), then a player marriage button. Codex: run the full suite natively on the merged integration tree (Claude's sandbox lacks node_modules). The reassignment of Claude's river/trail drawing is cancelled.
| UI-COUNCIL-LANE-B | Claude | in progress | handover card, factions strip, glory bars, chronicle done (60c7bd1); diplomacy sheet + LeaderPortrait done (1d87743); capitulation terms picker + Field/Classic palette switch done; trade dialog exchange summary + captive panel restyle done (631d7ba); next hierarchy polish across HUD panels, theme token audit | council/CouncilParts.tsx, councilLayout.ts ; HUD hierarchy pass on Field palette (9b60f0e) |

| AUD-RIVER-DRAW | Claude D audit | smoothRivers(g) (channelSmoothness.ts) is not yet drawn: world.ts still shows raw heightmap water edges. Needs a bank-ribbon mesh pass plus optional current arrows from riverCurrentProfile | Claude | Claude D T4 remainder | source-pushed-not-live | bank ribbons drawn from smoothRivers (world.ts buildBankRibbons, display only, capped); optional current arrows still open; needs native visual shot |
| AUD-FISH-PANEL | Claude D audit | fishRecoveryPerMinute (QA-048) has no panel and mesh yaw ignores buildingQuarterTurns | Claude | Claude D T5 | source-pushed-not-live | yaw=buildingQuarterTurns*pi/2 in syncBuildings; WaterReachPanel shows recovery/min + section size; footprint-plot draw of section corners still open |
| AUD-SOC-RIVALS | Claude D audit | `scripts/expanded-rivals.test.mjs` cases 2-3 fail identically on main and integration (g.territory lacks faction 4; quoteShipment(g,5,...) has no deal): later-faction IDs are not wired into territory/trade | Codex/Claude Societies | Societies | not started | pass 2/fail 2 on main 4c7b472 |
| AUD-PRESTIGE-TESTS | Claude D audit | prestige-game.test.mjs case 2 (territoryMeasuredAt null after bounded ticks) and prestige-bounded-sampler.test.mjs case 3 (equal soil/freshwater across resolutions) fail on Codex's own branch work/prestige-bounded-sampler-2026-11-12 | Codex | Codex T6 | not started | merged into integration as-is; not a merge regression |
| AUD-PRESTIGE-TESTS | Claude D audit | prestige-game.test.mjs case 2 (territoryMeasuredAt null after bounded ticks) and prestige-bounded-sampler.test.mjs case 3 (equal soil/freshwater across resolutions) fail on Codex's own branch work/prestige-bounded-sampler-2026-11-12 | Codex | Codex T6 | done/live | Superseded by qualified live41f5870: indexing participates in bounded completion; capped-soil quadrature checked against analytical integral.20/20focused+2built ledger/curd evidence; docs/metrics/prestige-curd-release-2026-11-12.json. Do not re-run stale leaf assertions. |
| AUD-SOC-VISUAL | Claude D audit | society legibility: neighbours' banner/insignia and ruling-family dress should be readable at LOD1; hostage/foster arrivals need a visible escort; marriage alliance should show a procession | Claude | Claude C | not started | |
| AUD-UI-FEEL | Claude D audit | game feel: council/handover/diplomacy actions need toast + chronicle line + sound cue on success/refusal; no silent state changes | Claude | Claude B | not started | |
| AUD-NATIVE-CARVED | Claude D audit | CarvedBuildingLayer LRU bucket eviction (C13) is now unit-tested by carved-layer-eviction.test.mjs (cap reached, near building gets a real bucket, same-sync buckets never evicted) plus carved-buildings 26/26; needs a native long-session pass to confirm near buildings leave impostor mode | Codex | Codex native run | source-pushed-not-live | |
| AUD-SOC-SUCCESSION-FEEL | Claude D audit | societies: a succession/regency should produce a visible handover (new leader standard raised, old leader dress change, chronicle line) and a faction mood shift; today state changes without any in-world cue | Claude | Claude A+C | not started | |
| AUD-SOC-TRIBUTE-LEDGER | Claude D audit | societies: tribute, hostage ransom and dowry flows must move real goods through custody (no free goods); add a conservation test across marriage/foster/hostage/capitulation commands | Claude | Claude A | not started | |
| AUD-SOC-SAVE-ROUNDTRIP | Claude D audit | societies: rulers.wards, marriages, claims, casus belli and expansion parties need an old-save load test and a mid-expedition reload test (no teleport, no duplicate party units) | Claude | Claude A | partial | wards now validated in validRulersState (malformed wards reject the save like claims); old-save + ward round-trip test in rulers-runtime.test.mjs. Still open: mid-expedition reload with real party units (no teleport/duplicates) needs a native run |
| AUD-VIS-CURRENT-ARROWS | Claude D audit | visuals: faint current arrows or drift streaks on rivers from riverCurrentProfile so boat drift and mill sites are legible | Claude | Claude C | not started | |
| AUD-VIS-BUILDING-YAW-VERIFY | Claude D audit | visuals: quarter-turn yaw sign/entrance side (door faces the right way after R-key turn) must be checked in a native render with a rotated granary/workshop; sandbox only proved tsc and unit tests | Codex native | Codex native run | not started | |
| AUD-UI-RIVER-HOVER | Claude D audit | UI: hovering a river section should outline its corners and show fish/clay in a tooltip before a click opens WaterReachPanel | Claude | Claude B | not started | |
| AUD-FEEL-WEATHER-AUDIO | Claude D audit | game feel: weather/season/time-of-day should drive ambience (wind, rain, river, night insects) and hearth-light flicker; check existing audio hooks before adding | Claude | Claude B/C | not started | |
| AUD-INTEG-SHIPPING-HOOKS | Claude D audit | work/shipping-waiting-hooks-2026-11-11 (9e4a145) conflicts with integration in engine.ts, persistence.ts, sim.ts, types.ts, worldOptions.ts, worldVariety.ts, ruins.ts, Hud.tsx, WorldSetup.tsx (17 hunks, Grok World wiring); not merged by integrator | Grok/Codex | Grok T-wiring | not started | Grok to merge integration into the branch or the reverse, keeping both sides |
| RULERS-LANE-A-CLAIMS | Claude A | done (source, tests) | settleWards/npcMarriages now run in the yearly step; expansionParty() (settle/migrate only, crew 2-4, cooldown from drive, real units + deducted timber via communities.ts) behind rulersVersion; claims/casus belli (grantClaim/citeClaim/expireClaims, era+scale gated, saved in rulers.claims) and unrestOf(); fixed advanceRulers catch-up loop overshoot | rulers 35/35; tsc diff clean | journeyPermit(): explore lowers scout reserve, trade quickens barter review, state-tier raids need a 'raid' claim (granted first, cited on strike); reuses real scouts/caravans/raid forces, rulers-runtime 37 ok | next: UI hook for claims/unrest, per-era machinery gating, mid-expedition reload test, long-run stylized-facts test |

| AUD-PLAYER-DEFENSE-PRESTIGE | audit | Player townhall defense records formally held objectives without automatic surrender | Codex | Codex T6 | done/live | a6e8cbd; native actual physical departure/relief/reload and overwhelming-pressure no-yield;37/37batch scoped; docs/metrics/war-prestige-release-2026-11-12.json |
| AUD-RAID-OUTCOME-PRESTIGE | audit | Record actual theft/captive/destruction raid outcomes before scoring band defense; retaining a hall alone proves no theft defeat | Codex/Claude | Codex T6 / Claude raid intent contract | not started | Band3 remains excluded; need retained actual objective/ownership/witness results, not kill/retreat totals |
| AUD-VIS-OPTION-H-ADAPTER | Claude D | Option H adapter now in world.ts (634b7c5): opt-in `?renderStyle=carved` / `setRenderStyle`, default stays current; eligible buildings route through CarvedBuildingLayer with quarter-turn yaw, build progress, hearth lit from survivalNeeds.hearthHeating, picking via carvedOwners; farm/pen/fort/dock/bridge/modular keep the current renderer | Claude | Claude C | source-pushed-not-live | needs native render of a village in both styles |
| AUD-VIS-OPTION-H-LIGHT | Claude D audit | the per-frame atmosphere in world.ts rewrites hemi/sun/fog every frame, so applyCarvedLightRig cannot be swapped once; H needs a golden-hour blend inside the atmosphere pass (CHAT-G2) gated on renderStyle==='carved' | Claude | Claude C | source (partial) | per-frame sun colour now lerps to carvedDaylightGrade when renderStyle==carved, not at night; winter/storm damp it. Intensity/hemi/fog blend and native look check still open |
| AUD-VIS-OPTION-H-HABITAT | Claude D audit | carved adapter passes no habitat (defaults plains); map biome at the building point to Habitat so forest/desert/tundra villages get their own materials | Claude | Claude C | not started | |
| AUD-UI-RENDER-STYLE-TOGGLE | Claude D audit | no in-game control for renderStyle (URL param only); add a Settings switch next to Field/Classic palette, default Current, persisted per player | Claude | Claude B | not started | |
| AUD-SOC-HORSE-MOUNTS | Claude D audit | Codex horses/stables landed: leaders and envoys on real horses should show mounted at LOD1 with the owner's standard, and caravans with horses should read as faster only by real traction | Claude/Codex | Claude C + Codex W2 | not started | no free speed; tied to actual horse custody |
| AUD-SOC-TRADE-HOLDER-FIELDS | Claude D audit | trade dialog shows the stock shortfall but there is no contract naming which holder (leader, hall, caravan) owns the goods offered in marriage/dowry/tribute | Claude | Claude A | not started | publish docs/parallel/contracts/trade-holder-v1.md before Codex wires it |
| AUD-FEEL-HOVER-BUILDING | Claude D audit | game feel: hovering a building should show its era, upkeep/repair state and who works there (fabric + maintenance read models exist) before a click | Claude | Claude B | not started | |
| AUD-TEST-BASELINE-3 | Claude D audit | sandbox sweep on integration (unmodified origin tip too): architecture.test.mjs "era details appear only on completed discovered buildings" (syncEraDetails now filters to forge/stables/keep so the hut case expects 4, gets 0), barracks-shelter.test.mjs cases 6 and 8. Stale expectations or real regressions; owner decides which | Codex/Grok | whoever last touched syncEraDetails / barracks shelter | not started | full 538-file sweep needs >15 min here; native run should confirm |
| AUD-HORSE-SPRING-TRACTION | audit | Crafted ard uses a real trained horse; only productive spring work earns practice/wear, with paid repairs and conserved saves | Codex | Codex W1 | done/live | 46217d4,28/28scoped,tsc/buildPASS,native originalterrain+2built traction checks+existing-village regression; docs/metrics/horse-traction-release-2026-11-12.json |
| AUD-WORKING-HERD-RETURN | audit | Return an actual working pack/draft animal to a physical pen without losing identity, harness, condition or reproductive reserves | Codex | Codex W1 | done/live | da3f0ed,45/45scoped,tsc/buildPASS,native cargo→cache→physicalpen→same-ID refit; actual built controls/strict saves + existing53-person regression. docs/metrics/pack-pasture-release-2026-11-12.json |
| AUD-PACK-MESH-INDIVIDUAL-SCALE | audit | Preserve actual individual animal size in working meshes and fitting harness/ard transforms | Claude | Claude W1 | not started | Wild/domestic size varies and identity retains scale; current working vehicle meshes normalize scale. Coordinate clearance and visual identity; no gameplay collision shrink. |

## Throughput (Grok PM, hourly)

| Hour ending (ET) | Agent | Commits (all branches) | Commits on main | Features live on main | Note |
|---|---|---|---|---|---|
| 11-12 00:00 | Codex | 20 (prev 39) | 20 | 3 (goat reservations/handover, real pack-animal care, knowledge provenance) | steady; on target (target 3/h) |
| 11-12 00:00 | Claude | 24 (prev 26) | 5 (board/docs only) | 0 on main (~10 features waiting on integration) | shipping, but not landing — target 2 live/h |
| 11-12 00:00 | Grok | 0 (prev 11) | 0 | 0 | idle — no World batch running |
| 11-12 00:00 | Total | 44 | 25 | 3 | integration 67 commits ahead of main |
| 11-12 01:00 | Codex | 16 (prev 20) | 16 | 2 (real horse herds/pasture/stable pack training; settled-war prestige + player townhall defense) | on target (3/h target, 2 big items) |
| 11-12 01:00 | Claude | 16 on integration (prev 24) | 4 (board/docs only) | 0 on main (lanes A/B/C shipped to integration) | shipping, still not landing |
| 11-12 01:00 | Grok | 0 (prev 0) | 0 | 0 | idle 2nd hour — 00:05 landing never ran |
| 11-12 01:00 | Total | 36 | 20 | 2 (prev 3) | integration 77 ahead of main (prev 67); 247 rows open, 107 done |

## Process improvements

- 11-12 00:05 ET — Bottleneck: Claude's and Grok's work piles up on integration/2026-11-11 (67 commits not on main) because Claude can't run tests and Grok was idle. Fix: Grok PM now verifies (tsc + full suite vs main baseline) and lands integration on main every run, and restarted a Grok World batch (landing first, then B3 and T-items). Expected: Claude features-live/h goes from 0 to 2+, integration lag under 15 commits by 01:00. Check next run; if lag persists, have Claude commit directly to short work branches that I land each hour.
- 11-12 01:05 ET — Check of 00:05 fix: FAILED (integration lag 67→77, Claude live/h still 0, Grok still idle) because the landing was attempted inside the hourly PM run and died with it. Fix: landing now runs as a dedicated background Grok executor (merge integration→main, tsc + full suite vs main baseline, push, then merge main back into integration), followed by a World batch in the same executor. Expected: lag <10 and Claude features-live ≥3 by 02:00. If it fails again: Claude switches to per-lane short work branches that I land each hour.
| AUD-SOC-SUCCESSION-WAR | Claude D audit | societies: a ruler death during an active front or captive exchange must not reset pressed/relieved state or free wards; add a test that succession mid-war keeps fronts, claims and wards | Claude | Claude A | not started | |
| AUD-SOC-ENVOY-SAFE-CONDUCT | Claude D audit | societies: envoys and marriage/foster parties crossing a rival's land should carry a visible safe-conduct and be refusable by real relations; no teleporting delivery | Claude | Claude A | not started | |
| AUD-VIS-LEADER-HORSE-LOD | Claude D audit | visuals: horse stock mesh at LOD2 draws as a single instanced silhouette; check leader+horse draw-call count in the 100-resident fixture before adding mounted leaders | Claude | Claude C | not started | |
| AUD-VIS-RIVER-BANK-SEAM | Claude D audit | visuals: river bank ribbons vs shoreline foam at confluences and mouths; check no z-fight or gap where smoothRivers meets sea mesh (native render shot needed) | Claude | Claude C | not started | |
| AUD-UI-WARDS-LEDGER | Claude D audit | UI: diplomacy sheet lists who holds whose ward, since when and when it ends, with the real tie effect of recalling them | Claude | Claude B | not started | |
| AUD-UI-SAVE-LOAD-NOTICE | Claude D audit | UI: when a save fails rulers/wards validation the player gets a plain-language reason instead of a silent fallback | Claude | Claude B | not started | |
| AUD-FEEL-SEASON-LIGHT | Claude D audit | game feel: season change should shift light/colour tint and foliage turn together; check against CHAT-G2 golden-hour blend so they do not fight | Claude | Claude C | not started | |
| AUD-FEEL-DEATH-OF-RULER | Claude D audit | game feel: ruler death/succession should read as an event (toast with portrait, mourning banner on the hall) not only a handover card | Claude | Claude B/C | not started | |
