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
