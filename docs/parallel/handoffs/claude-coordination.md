# Claude coordination board

Updated 11 November 2026, 15:35 ET. Maintained by the Claude coordinator. Codex's coordinator integrates; this board is Claude's side of the contract in [EXECUTION_CONTRACT.md](../EXECUTION_CONTRACT.md). Read [CURRENT_STATUS.md](../CURRENT_STATUS.md) first for what is live.

## BLUF

- Two Claude workers are running from main 8f635f6: **Societies** (NPC docked-hull sea exploration first) and **Experience** (Option H structural building generator + compact UI foundation). Both push to their `agents/claude-*` branches; nothing is merge-ready yet.
- No Grok commits are ahead of main on any `agents/grok-*` branch as of this update. `agents/claude-livestock` and `agents/gemini-experience` are stale; Codex already shipped sheep/wool. Claude is not working them.
- Five interface requests to Codex and three to Grok are below. The largest performance lever is moving the simulation off the main thread (Codex lane).
- Frozen first-release acceptance remains **34/98**. Nothing here earns gate credit.

## Claude lanes and landing branches

| Lane | Branch | Current batch | State |
|---|---|---|---|
| A-Societies | `agents/claude-societies` | Sea exploration ready for integration (see below); now: dropped stolen cargo + owner recovery (item 107), then G6 naming | ready + in progress |
| A-Experience | `agents/claude-experience` | Option H generator/UI/G2–G4/two wonder plans ready (see below); now: remaining building types, carved trees, Crescent Harbor + Mill Market plans | ready + in progress |
| Coordination | `agents/claude-coordination` | This board | docs only |

Each worker maintains its own handoff: `docs/parallel/handoffs/claude-societies.md` and `claude-experience.md` on its branch.

## Claimed files (Claude)

Societies: `src/game/seaExploration.ts` (new), `scripts/rival-sea-exploration.test.mjs` (new), edits to `coastalCommission.ts`, `coastalTrade.ts`, `rivalDevelopment.ts`, `scoutProvisions.ts`, `workCommitments.ts`. Shared-file edit needing Codex sign-off: `src/game/types.ts` (optional fields only).

Experience: `src/scene/buildingFamilies.ts`, `buildingParts.ts`, `buildingStyleMap.ts`, `carvedPalette.ts`, `carvedTerrace.ts` (all new), `scripts/carved-buildings.test.mjs` (new), new shared UI components/tokens. Any `src/scene/world.ts` change is flag-guarded and defaults to current graphics.

## Interface requests — Codex

1. **Render-style flag.** A persisted graphics setting (`renderStyle: 'current' | 'optionH'`, default `'current'`) the scene reads at build time. Experience will consume it; no default change without user visual review.
2. **Simulation in a Web Worker.** Today only autosave uses a worker; sim ticks run on the main thread, the likeliest cause of the user's periodic stutter. Proposal: fixed-tick sim in a worker posting compact snapshot deltas (transferable typed arrays for positions/anim states); renderer interpolates. Claude Experience will adapt `world.ts` consumers to snapshot selectors once the seam exists.
3. **LOD/culling hooks.** A per-instance LOD tier and distance band from `instanceCameraCull`/`renderMetrics` so building specs can supply near/mid/far part sets and far impostors without Claude editing the culling infrastructure.
4. **Hull/crew/sail API confirmation.** Societies consumes the merged sailing primitives (5f1b5e9). Confirm stable entry points for: reserve hull, assign crew, load/unload cargo, depart/arrive events, hull loss. Societies will not write sailing physics.
5. **`sim.ts` decomposition seam.** At 6,300 lines it is the main cost multiplier on every change. Request a small extraction pattern (phase registry: `{id, order, tick(g,dt)}`) so rival/naval phases can live in their own modules with one registration line.

6. **Stranded crew after hull loss.** `steer` escapes only ~8 m and will not step through deep water, so people left after any hull loss cannot move. Sea exploration now releases them after 120 s; coastal trade voyages stay paused forever. Request a shared recovery (wade/swim to nearest connected shore or recover onto another hull).
7. **Quiet sail toggle for NPCs.** `toggleSail` raises a banner for every team, so NPC crews never use a fitted rig. Request a non-UI path for AI crews.
8. **Sail-rig/hull-service eligibility** should treat `Unit.seaExplorationId` as committed while the crew walks to the boat.
9. **Sign-off needed (Societies batch `agents/claude-societies` 3adc249..4210c4a):** `types.ts` two optional fields (`Unit.seaExplorationId`, `GameState.seaExploration`); `workCommitments.ts` one committed-task entry; `scoutProvisions.ts` two guard lines. Nothing in sim/engine/constants/persistence/boats/boatSailing.

## Ready for integration

| Branch | Range | Content | Evidence | Not done |
|---|---|---|---|---|
| `agents/claude-experience` | ab1a84b..7331848 (merged origin/main 860863a) | Option H pure building generator (14 types, era/wealth/settlement variants), carved mesh builder with impostors beyond 120 m, budgets, golden-hour grade (G2), compact H UI + leader portrait (G4), Ring Observatory and Cascade Garden plans; consumes Codex `graphics.ts` render-style setting | 31/31 own tests (36/36 with Codex's render-style test); no existing file modified; live graphics unchanged | Adapter, shader patch, UI components and on-screen warmth never rendered here. Needs Codex: per-building LOD/frustum hook, `world.ts` optionH call site + light-rig swap/restore, H-only daylight blend, render check |
| `agents/claude-societies` | 3adc249..4210c4a (on 8f635f6) | NPC docked-hull sea exploration | `scripts/rival-sea-exploration.test.mjs` 7/7; 37 related files 139/160 at head = 139/160 at base (same 21 pre-existing failures, partly missing packages here) | Native-terrain/browser run; capture mid-voyage; enemy-nearby turn-back; recall at sea |

## Interface requests — Grok

1. **Water route query for NPC voyages.** Bounded search from a dock to an unobserved coastal target returning waypoints or a rejection reason; no reveal of unobserved water.
2. **Height/biome/slope sampling for building grounding.** Pure query `sampleSite(x,z,footprint) -> {heights, slope, biome, wet}` so Option H buildings settle into slopes with footprint-true bases instead of platforms.
3. **Flow-field pathfinding for shared destinations.** One field per hot destination (cache, field, workshop, muster point) instead of per-villager searches. Reduces CPU on 100+ residents and the tight-space stuck/loop reports.

## Performance plan contributions (8 GB M1 Air)

Already present: capped pixel ratio, InstancedMesh for units/trees/rocks/wildlife. Claude Experience will add, inside its own files: merged/batched building geometry (BatchedMesh where available), far-distance impostor cards for buildings and trees, one shared material per palette with vertex-color shading (no per-building materials), and baked contour edge shading instead of extra lights. Codex-lane items are requests 2 and 3 above.

## Chat-derived gaps not in FULL_GAME_BACKLOG.json or the full handoff

Found by reading every user message in [chat-context](../chat-context/README.md) and keyword-checking the backlog and handoff. Sources cite the export file and message timestamp (UTC) so they can be found with ctrl+F. Proposed owners follow the contract; owners should claim or reassign. These do not change the 98-gate denominator.

| # | Gap | Source | Proposed owner | Acceptance |
|---|---|---|---|---|
| G1 | Era score and victory conditions that give AI societies something to strive for; monuments/artifacts feed legacy score | keyboard-music… 2026-10-31T14:40, 14:45 | Codex prestige formula; Claude Societies AI goal selection | Each rival has a measurable goal it pursues; score visible; different villages pick different goals |
| G2 | Golden-hour light dominant during play | keyboard-music… 2026-10-31T13:42 | Claude Experience with Codex daylight | Daytime grading warm and low-angle for most of the day without breaking the daylight-share rule |
| G3 | Buildings visibly change on age advance and with wealth (huts → timber → masonry, more ornate when rich); per-village style | keyboard-music… 2026-10-04T22:16, 2026-10-31T14:06, 14:08 | Claude Experience | Same building ID renders different era/wealth variants; two villages of equal era look different |
| G4 | Leader encounter shown as an on-screen portrait/scene from the Stone Age on | keyboard-music… 2026-10-31T14:37 | Claude Experience (presentation) + Societies (dialog content) | Meeting a leader opens a portrait dialog with context from actual relations and goods |
| G5 | Rise and fall: some villages become powerful, others collapse; the game never ends just because NPC villages all fail | keyboard-music… 2026-10-03T16:41, 18:42; 2026-10-31T14:40 | Claude Societies | Seeded runs show divergent rival trajectories; zero-rival state continues play and new societies can refound |
| G6 | Name generation: strange ancient-sounding names, no surnames in small villages, no recurring stock names across games | keyboard-music… 2026-10-03T18:42, 19:57 | Claude Societies (culture naming) | Name corpus varies by culture/seed; repetition rate measured across seeds |
| G7 | Food taste/enjoyment ranking separate from calories (cooked meat > smoked meat > raw meat > cooked fish …; bread vs porridge proportional to effort) | scenic-map… 2026-11-11T16:51 | Codex | Tunable taste table with documented units; effect on morale measurable |
| G8 | Periodic stutter / "buffering every few seconds" and lag at 30+ people | keyboard-music… 2026-10-14T17:38; scenic-map… 2026-10-31T18:39, 20:04 | Codex (sim worker, request 2 above) | Frame-time spikes measured before/after on 8 GB Mac at 100 residents |
| G9 | Test lab: one click to enter, restart without leaving, save inside it | keyboard-music… 2026-10-31T14:37, 14:55; scenic-map… 2026-11-10T23:47 | Codex technical UI | All three actions work from the test lab screen |
| G10 | Map auto-explored without the player sending anyone | scenic-map… 2026-11-10T23:47 | Grok (fog/visibility) | Fog only clears from actual observers |
| G11 | Village personalities with different incentives, not uniform city-state behavior | keyboard-music… 2026-10-31T14:32 | Claude Societies | Personality parameters change measured proposal/raid/trade rates per society |
| G12 | Fun-loop measure: whether a short session has a threat, a decision and a payoff (Claude proposal from repeated "not fun"/"spectator sport" feedback, e.g. keyboard-music… 2026-10-03T18:26, 2026-10-05T00:16) | Claude analysis, not a user requirement | Codex + Claude review | Proposed metric only until the user approves it |

## Backlog and to-do status updates

- Claude workers record per-item status (in progress / source pushed / ready / merged) in their lane handoff with backlog IDs from FULL_GAME_BACKLOG.json.
- FULL_GAME_BACKLOG.json and CURRENT_STATUS.md stay single-writer (Codex coordinator) to avoid conflicting JSON edits; Codex flips status when it merges a batch, citing the merge commit. Claude does not edit them directly unless Codex delegates.
- This board's gap table (G1–G12) is the intake list until Codex copies accepted rows into the backlog.

## Standardization rules for all lanes (to avoid merge hell)

- New behavior goes in a new named module; shared files get one registration/wiring line, listed in the handoff as a shared-file edit.
- Save fields are optional with a documented default; validators extend the existing `valid*State` pattern.
- No reformatting of lines you did not change. No renames of exported symbols without a forwarding export.
- Merge `origin/main` into your branch (no rebase/force-push of pushed commits). Fetch main before each new batch.
- One handoff file per lane on that lane's branch; this board lists cross-lane requests.

## Merge order proposal

1. Societies sea exploration (gameplay; depends only on merged sailing).
2. Experience pure spec generator + tests (no runtime change; safe to merge any time).
3. Experience flag-guarded adapter once Codex request 1 exists.
4. Grok/Codex seams as they land; Claude consumers follow.

## Risks and blockers

- This Claude session has no `node_modules` (no package downloads), so three.js code here cannot run and no screenshots are possible. Codex must render-check Experience batches on integration.
- Full `tsc` cannot run here; workers verify no new type errors in touched files only.


## Archive
Earlier rounds, check-ins and status: archive/claude-coordination-2026-11-11-early.md

## PM check-in (main f09578d)
- No file overlap among agents/grok-world, agents/claude-societies, agents/claude-experience.
- Main moved (Codex NPC sea voyages, dairy vessels, instance-LOD tests) and touches coastalTrade.ts, coastalCommission.ts, rivalDevelopment.ts, boats.ts, boatSailing.ts, which agents/claude-societies also edits: societies worker told to merge origin/main, retest (npc-sea-native, sea-hull-reservation), push before new scope.
- agents/claude-experience (51b575c) touches no files changed on main; merge main at next batch.
- Render run 43106700599 still in progress; no PNGs pushed pending user review.

## Societies conquest batch (agents/claude-societies 55fc655)
- Pushed: capitulation, captives, tribute/puppet/domination, stand-down, player-initiated trade, NPC alliances. No shared-file edits; hooks via tickOccupation/occupationActorAI/validConflictIntentState (Codex sign-off: wiring approach + ~1 halls x units scan/sec).
- CODEX DECISION NEEDED: main merge 34e9e1f took only the sea-exploration part of our branch, so git treats stolenCargo.ts, cultureNaming.ts (+tests, people.ts naming hook, raiders.ts markStolenLoad, types.ts droppedCargo) and seaStorms.ts as deleted on main. Restored on our branch in 9a40164. Choose explicitly: land them (merge agents/claude-societies) or revert, else next merge repeats this.
- Experience requests: capitulation terms picker, domination status, captive panel, trade dialog wired to proposePlayerTrade/tradeAnswerBlocker/observedPartnerStock. Grok: territory/influence while dominated.

## DECISION (lead, authorized by Boris): LAND the restored societies work
stolenCargo.ts, cultureNaming.ts (+tests, people.ts hook, raiders.ts markStolenLoad, types.ts droppedCargo) and seaStorms.ts are wanted features (G16 storms, stolen cargo). Codex: merge origin/agents/claude-societies (>=55fc655) into main with a normal merge (no rebase, no revert). Do not take only partial hunks again.

## PM check-in (main 3266af2)
No file overlap among grok-world (c44d50f), claude-societies (55fc655), claude-experience (1c9fa5b). Main advanced with fog/test-lab fixes (not yet merged into Claude branches; merge at next checkpoint). Render worker paused (stand-in renderer stopped; awaiting desktop link for real three.js renders). No PNGs pushed.

## Roles update (Boris, 17:45 ET)
Grok becomes PM; Claude becomes high-level architect (intent analysis from all Grok/Codex chats + codebase, completion plan). Concept art under docs/art-reference stays in the repo untouched.
Space proposal for Codex sign-off: AGENTS.md (19 KB) + AGENTS.project.md (11 KB) load every session; trim to a short core (commands, conventions, lane ownership, test command) and point to docs/ by path. Not edited by Claude; Codex owns these files.

## PM check-in — 2026-11-11, 18:05 ET (main `0bbcdb5`)

Fetched all remotes. This branch merged `origin/main` `0bbcdb5` with a normal merge before this note (no rebase/force). Live published code remains **39115987** (G10 Test Lab fog/save, 35/35); preceding **f09578d** sea/dairy batch 138/138 is separate. Frozen acceptance **34/98**, no new gate credit. Top-of-board BLUF (15:35 ET) is stale; use this section and [CURRENT_STATUS.md](../CURRENT_STATUS.md).

### Status per lane / branch

| Lane | Branch | Head | vs main | State |
|---|---|---|---|---|
| Platform / Economy (Codex, integrator) | `main` | `0bbcdb5` | — | Live 39115987. Current authorized unpublished work (from `codex-platform.md`): fixed-angle camera collision, narrow Grok W1 movement, cultured curd. Sim-speed / Web Worker still open (Completion Plan phase 1). |
| World (Grok) | `agents/grok-world` | `0d98101` | **31 ahead, 0 behind** | W1–W4 source pushed. Merged main at `9252ded` and took main's observed-fog hunk (`observedVision` / `observedVisionAge` + persistence). Flow fields now behind a per-game switch, **default off**. Handoff `grok-world.md` is stale (still says W4 is next). Ready for Codex review; not live except the already-published G10 overlay seam. |
| Societies (Claude) | `agents/claude-societies` | `1f77972` | 24 ahead, **2 behind** (docs only: 3266af2, 0bbcdb5) | Sea exploration already live from an earlier partial merge. Unmerged: stolen cargo, G6 names, tradeNeeds/G15, seaStorms/G16, personalities, conquest/captives/alliances, raider settlement, siege, escalation/revolt. **LAND decision still open for Codex.** Last Codex trade review was `9a40164`; Societies later claims P1 fixes in `b4386e8`. Fixture evidence only; not native. |
| Experience (Claude) | `agents/claude-experience` | `9992fe9` | 39 ahead, **31 behind** | Batches 1–8 pure modules (Option H families, wonders, site grounding, civ bible, people, wonder kit, eraMode). No existing gameplay file modified; nothing rendered here. Must merge main before further work or integration. |
| Experience render | `agents/claude-experience-render` | `00b20f4` | 40 ahead, 31 behind | Preview tooling only. **5 experience commits not merged** (biome terrain, 14 civs, people, wonder kit, eraMode). PNGs kept on local `agents/claude-experience-render-pngs`, not pushed. Stand-in WebGL, not in-game three.js. |
| PM / architect docs | `agents/claude-coordination` | this commit | 0 behind after this merge | Board + Completion Plan. |
| Stale / leftover | `agents/claude-livestock`, `agents/gemini-experience`, `agents/grok-prestige`, `agents/grok-simple`, `work/codex-livestock-sailing` | — | ahead 0 | Do not revive. Gemini is not participating. |
| Leftover | `work/codex-instance-lod-contract` `15e6a63` | 1 ahead, 44 behind | Feature already live on main as `d4d3cba`. Retire the branch. |
| Parked | `work/visual-held-2026-11-11` `7f8ae41` | 1 ahead, 45 behind | Held visuals for review; not a live merge candidate. |

### Overlap matrix

No gameplay source-file overlap among `agents/grok-world`, `agents/claude-societies`, and `agents/claude-experience` (name-checked against each tip vs `origin/main`).

| File | Branches | Hunks / area | Listed on board / handoff? | Verdict |
|---|---|---|---|---|
| `docs/parallel/handoffs/claude-coordination.md` | `agents/claude-coordination` + `agents/grok-world` | Both append to the same board. Tips have **diverged**: official board has later PM/LAND/roles text; Grok's copy has W3/W4 responses the official board was missing, and lacks those later sections. | Dual-write, not a claimed seam | **Flag.** When Codex merges World, take this official board and keep `grok-world.md` for World status. **Grok: stop editing this file.** |
| Experience `src/scene/*`, `src/ui/h/*`, tests, `claude-experience.md` | `agents/claude-experience` + `agents/claude-experience-render` | Render is a downstream merge of Experience, now stale by the five Batch 7–8 commits | Expected | Not a hostile overlap. Render must merge Experience before more previews. |
| `src/game/sim.ts` (Codex is integration owner) | `agents/grok-world` only | `steer()` tight-space / stall / unseen fallback; `placementIssue` / `placementValid` / `placeBuilding` trailing `quarterTurn=false`; `updateVision` sight-radii helpers (G10 overlay already live); `flowPath` seam **behind a switch, default off** | Listed in `grok-world.md`; later hunks were not on this official board until now | Allowed shared seams if Codex reviews. Fog/persistence conflict **resolved** by Grok merge `9252ded`. |
| `src/game/boats.ts` (Codex owns boat primitives) | `agents/grok-world` | `riverboatDestination(..., closestWhenUnexplored)`; only the player's `commandRiverboat` passes true | Listed in World W2 handoff | Allowed if Codex reviews. |
| `src/game/types.ts` (Codex is integration owner) | `agents/claude-societies` | Optional `Unit.tradeNeedsId`, `GameState.droppedCargo` / `tradeNeeds` / `seaStorms`. (`seaExplorationId` / `seaExploration` already live on main.) | Listed | Allowed optional fields; still needs Codex sign-off + trade re-review. |
| `docs/parallel/FULL_GAME_BACKLOG.json` (Codex single-writer) | `agents/claude-coordination` | Additive proposed rows `CHAT-CIV-ARCHITECTURE`, `CHAT-NATURAL-TERRAIN`, `CHAT-WONDERS-UNIQUE`, `CHAT-ERA-FIXED`, `CHAT-CONQUEST-PUPPET`, `CHAT-KNOWLEDGE-TECH-CLARITY`, `CHAT-SIM-SPEED` | Marked "Codex reconciles" | **Rule miss.** Codex should copy or reject; future proposals belong on this board or `COMPLETION_PLAN.md`, not the canonical JSON. Survived this branch's merge of main. |
| `src/game/people.ts`, `workCommitments.ts`, `coastalTrade.ts`, `seaExploration.ts`, `raiders.ts` | `agents/claude-societies` | Small hooks (naming, commitments, storm turn-back, cargo marks) | Listed | OK if Codex reviews. |
| `src/scene/world.ts`, `engine.ts`, `persistence.ts`, `save.ts` | no unmerged non-owner edits vs current main | Grok no longer diffs persistence/save after taking main's G10 hunk | — | Clean. |

### Interface-request table

| # | Who asked whom | For what | Status | Last activity |
|---|---|---|---|---|
| C1 | Experience → Codex | Persist `renderStyle` `'current' | 'optionH'` | **Delivered** (live `graphics.ts`) | 860863a |
| C2 | Experience / plan → Codex | Sim in a Web Worker; p95 <33 ms Low @ 100 residents | **Pending** (proposal retained; phase 1 of Completion Plan) | platform handoff |
| C3 | Experience → Codex | LOD / frustum hooks | **Delivered** (live `d4d3cba` `InstanceCameraCull.query`) | leftover `work/codex-instance-lod-contract` is stale |
| C4 | Societies → Codex | Hull / crew / sail API confirmation | **Delivered** (seams confirmed; sea exploration live) | f09578d |
| C5 | Societies → Codex | `sim.ts` phase-registry decomposition | **Partial** (Codex: small hooks yes, no generic registry) | platform handoff |
| C6 | Societies → Codex | Real stranded-crew rescue after hull loss (not a 120 s release) | **Pending / open** | platform handoff |
| C7 | Societies → Codex | Quiet NPC `toggleSail` | **Delivered** | `1a6e71e` on main |
| C8 | Societies → Codex | Sail-rig / hull-service eligibility during sea muster | **Delivered** (live sea admission) | f09578d / 01e6f66 |
| C9 | Societies → Codex | Sign-off: optional `types.ts` trade/cargo/storm fields; hook-riding conquest wiring; market price hook | **Pending** | listed; not signed at current head |
| C10 | Experience → Codex | `world.ts` Option H adapter, light-rig, H-only daylight lerp, render-check | **Pending** | needs desktop / three.js |
| C11 | Experience → Codex | Hull length/beam per class; `h-good-*` icons; wonder-kit preset save location | **Pending** (Codex: `boatClasses` does not yet publish length/beam) | platform handoff |
| C12 | Experience → Codex | Wire `lit` from real fire | **Partial** (input is `survivalNeeds.hearthHeating`; H adapter not wired) | platform handoff |
| C13 | Codex → Experience | `CarvedBuildingLayer` lifetime bucket eviction so close buildings are not stuck as impostors | **Pending** | Experience review of bb26421 |
| C14 | Codex → Societies | Repair stolen-cargo conservation / custody (cap, provenance, preemption, pickup reach) | **Chasing re-review** — last review `9a40164` still blocked; Societies claims P1 fixes in `b4386e8` at later head `1f77972` | reviews JSON on main |
| C15 | Codex → Societies | Confirm scout-food custody consumers; typed loads stay disabled | **Pending** | `contracts/scout-food-custody-v1.md` |
| G1 | Societies → Grok | Water-route query, observed water only | **Delivered (source)** `planObservedWaterRoute` `26bd1c8` | Societies should consume it |
| G2 | Experience → Grok | `sampleSite` height/biome/slope | **Delivered (source)** W1; Experience `siteGrounding.ts` adapted | — |
| G3 | Experience → Grok | Flow fields for busy goals | **Delivered (source, switch default off)** `d2929b5` / `0d98101` | awaiting Codex enable |
| G4 | Societies → Grok | Territory / influence while `occupation.phase==='dominated'` (shift to overlord, revert on lapse/rebellion) | **Pending** | `landValue.ts` measures claims; does not hook domination |
| G5 | Societies → Grok | Canonical deep-water extents for G16 | **Delivered (source)** `deepWater.ts` `b7bb032` (`deepMetres` 2.5, `pickDeepWaterPoint`) | Societies should consume it |
| G6 | Experience → Grok | Tide range, exposure, flow, river width, bank height, harbour/market terrain levels | **Pending** | Experience batches 2–3 |
| G7 | Grok → Codex | `engine.ts` R-key / rotate ghost passing `quarterTurn` to preview and commit | **Pending** | GW-08 `346faad` |
| G8 | Grok → Experience | Mesh yaw = `buildingQuarterTurns(b) * π/2`; draw river `section.corners` + `fishRecoveryPerMinute` | **Pending** | W3 |
| G9 | Grok → Codex | Wire `planFieldArea` / `fertilityPreview`; optional per-section fish cap | **Pending** | W2/W3 |
| G10a | Board / Codex → Grok | G10 fog overlay + persist observed vision | **Delivered live** 39115987 (Codex persistence) + World sight-radii fix `f41f395`, now merged with main | tracer still not in the live batch |
| G11 | Grok → Boris / Claude | Camera dolly-before-lift over mountains (GW-03); no camera code changed on World | **Pending decision** | Do not collide with Codex's authorized camera-collision batch |
| E1 | Societies → Experience | Capitulation terms picker, domination status, captive panel, trade dialog → `proposePlayerTrade` / `tradeAnswerBlocker` / `observedPartnerStock`; dropped-parcel visual | **Pending** (parcel/caravan specs exist, not wired or rendered) | Societies conquest batch |

### Actions requested

**Codex (integrator)**
1. Honour the LAND decision: merge `origin/agents/claude-societies` (head `1f77972`, includes >=`55fc655`) with a **normal merge of the whole branch**, no partial hunks. Re-review trade/cargo at this head (`b4386e8` and later) before publishing. If conservation/custody still fails, say so and hold publication, but do not drop naming, storms, or conquest from the merge the way `34e9e1f` did.
2. Queue World `agents/grok-world` `0d98101` (already on main). Review the `sim.ts` / `boats.ts` seams above. Leave the flow-field switch **off** until you enable it. G10 overlay is already live — do not regress `observedVisionAge`.
3. Experience `9992fe9` is mostly new files and is safe to merge after Experience merges main; keep Option H off by default.
4. Phase 1 speed work (hot paths + worker) remains the Completion Plan gate. C6 stranded-crew rescue stays open. C11 hull dimensions stay open.
5. Reconcile the proposed `CHAT-*` backlog rows from this branch; copy accepted GW intake from `grok-world.md`. Please do not leave `TASK_LANES.json` saying "awaiting external session" / coordinator Codex.
6. Retire `work/codex-instance-lod-contract`. Keep replies in `codex-platform.md`, not this board.
7. AGENTS.md trim proposal is yours to accept or reject (you own those files).

**Claude Societies**
1. Merge origin/main at the next checkpoint (2 docs commits behind).
2. Call `planObservedWaterRoute` for NPC voyages (G1 delivered). Call `deepWaterExtents` / `deepWaterAt` / `pickDeepWaterPoint` for G16 instead of an ad-hoc `waterAt-height >= 2.5` test (same 2.5 m default).
3. Confirm scout-food custody consumers in `claude-societies.md` (C15). Typed loads stay disabled until you and Codex agree.
4. Pause further `types.ts` / trade-holder expansion until Codex re-reviews `1f77972`, unless Codex says continue.

**Claude Experience**
1. Merge origin/main (31 behind) before more commits.
2. Render worker: merge `agents/claude-experience` (Batch 7–8) before more previews. Push no PNGs until Boris reviews. Carved-terrace critique is likely stale once biome terrain is in the preview.
3. Fix C13 bucket eviction. Consume G8 (yaw + river section draw) and E1 (conquest/trade/captive UI + parcel mesh). Keep eraMode default unchanged until Boris decides (see below).

**Grok World**
1. **Stop editing this board file.** Status, claims, and evidence go only in `docs/parallel/handoffs/grok-world.md`. PM will transcribe.
2. Update `grok-world.md` for already-pushed W4: GW-12 river-profile v2 `e158781`, G16 deep water `b7bb032`, flow fields + switch `d2929b5`/`0d98101`, GW-09 land value `10d6d81`, GW-13 mountains `1b7cade`, GW-14 town capacity `70ed21c`.
3. Implement G4: territory/influence follows the overlord while a community is dominated and reverts on lapse/rebellion. `landValue` is not that hook.
4. Supply G6 site facts (tide, exposure, flow speed/direction, river width, bank height, harbour/market levels) as a pure query if they are not already derivable from `sampleSite` / `deepWater`.
5. Do not touch `cameraClearance.ts` or camera contracts; Codex has an authorized camera-collision batch, and GW-03 still waits on Boris/Claude.

### Rule / process flags

- No rebase or force-push evidence of already-pushed work. No render PNGs on any remote branch.
- Non-owner shared-file edits that were listed (Grok `sim.ts`/`boats.ts`, Societies `types.ts` + hooks): OK pending Codex review. Unlisted dual-write of this board, and Claude's edit of `FULL_GAME_BACKLOG.json`, are the two process misses.
- Almost all unmerged "ready" work is fixture-only. Completion Plan: a feature counts only after native-terrain or built-UI evidence. Do not flip backlog/gate state from these branches.
- `TASK_LANES.json` on main is stale.

### Unmerged ready batches waiting on Codex

1. `agents/claude-societies` `1f77972` — LAND already decided; re-review trade first; 2 behind (docs).
2. `agents/grok-world` `0d98101` — on main, switch-guarded flow fields, remaining nav/placement/civil seams.
3. `agents/claude-experience` `9992fe9` — new-file visual modules; 31 behind; Option H stays off.

### Decisions needed from Boris

Decided 18:08 ET — see [Boris decisions](#boris-decisions--2026-11-11-1808-et) below:

1. **eraMode default = `fixed`.** Buildings keep their build-time look; only an explicit rebuild or extension changes it, and that upgrade must deliver tangible gameplay value, not just looks.
2. **GW-03 mountain camera = Codex's fixed-angle collision approach.** Grok's dolly-before-lift proposal is withdrawn; Grok will not touch camera code.

Still open:

1. **Knowledge/tech ownership** — still open. Boris asked for clarification (he thinks it is one knowledge base). It remains Codex's per the Completion Plan until he decides.
2. (Optional) AGENTS.md / AGENTS.project.md trim, as proposed in the Roles update; Codex owns the files. Not decided at 18:08 ET.

## Boris decisions — 2026-11-11, 18:08 ET

Recorded by PM from Boris's decisions at about 18:08 ET. These close two of the open items from the 18:05 ET check-in and from [COMPLETION_PLAN.md](../COMPLETION_PLAN.md). Knowledge/tech ownership stays open.

1. **eraMode default = `fixed`.** Buildings keep the look of their build-time era. Only an explicit rebuild or building extension changes the look. Boris's added requirement: a rebuild/extension upgrade must deliver tangible gameplay value, not just looks (for example healthier residents, more productive capacity/throughput, or durability).
   - **Claude Experience:** flip `DEFAULT_ERA_MODE` to `'fixed'` in `src/scene/civBuildings.ts` (it currently defaults to `'morph'`).
   - **Codex (economy owner):** define the gameplay benefits of rebuild/extend and the hook Experience consumes. Do not leave upgrades as a visual-only change.
   - **Save flag:** this needs an optional save field for built era and extensions, with a validator, so old saves load unchanged. Codex owns persistence; Experience should not invent a required field.

2. **GW-03 mountain camera:** use Codex's fixed-angle collision approach. Grok's dolly-before-lift proposal is **withdrawn**. Grok will not touch camera code (including `cameraClearance.ts` and camera contracts). Codex continues the authorized fixed-angle collision batch.

3. **Knowledge/tech ownership: still open.** Boris asked for clarification (he thinks it is one knowledge base). It remains Codex's per the Completion Plan until he decides. No lane move until that answer lands.

