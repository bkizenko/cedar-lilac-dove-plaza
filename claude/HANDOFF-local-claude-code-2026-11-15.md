# Handoff: Hearthwild lanes (cloud helpers and the local Claude Code session)

**BLUF:** A cloud Claude session runs helpers and pushes to `main` of `bkizenko/cedar-lilac-dove-plaza`. The local Claude Code session on Boris's Mac takes ONLY the unclaimed lanes below, and is the one that publishes to the game at `127.0.0.1:8086`. The status list is `claude/MASTER-checklist-2026-11-15.md` in this same folder. Claims are recorded here; the cloud session updates this file on `main` whenever a lane changes, so `git pull` before choosing work.

## Lanes owned by the cloud session (do not touch these features or files)
- P5 ships, expeditions, harbors: water-only ships and classes, trade capacity, harbors with boat slots, fishing docks, cisterns, beasts of burden, barter.
- P7 health and clothing: naked in heat, clothing wear, simplified clothing chain, disease and crowding, pregnancy, Vitruvius.
- P8 UI fixes: panel scroll in Craft and building panels, direct actions in the building panel, remove Rest job, actionable notifications, war popup, one-time raid ping, "No ruling house yet", boats not equippable, mill ages (Classical and Medieval), "At odds" text.
- P9 animals and domestication: herd selection, species variety, mountain and valley fauna, flee and ambush, donkeys/oxen/horses as working animals, windmill roof white patches, season music cue.
- P10 food follow-up: carriers stuck on "No reachable cache", starvation guard pulling people off crafting jobs, workload meter mismatch.
- Done and on main: P1 orders win (63019b2), P3 farms and terrain (2cf9d69), P4 combat and conquest (2356605), P2 food partial (102bb2a), P6 seasons/trees/mills/camera (aa247fd, 91b2336, 81a12de, 666a591).

## Lanes for the local session (take in this order, claim by committing a line to this file on main first)
1. Military: easier call to arms, men on walls and patrols, guards in towers, spearmen drilling and patrol rotation, groups of 5/10/25/50/100, commanders, weapon stock display in barracks/townhall/storehouse, weapons per age and material, fighting skill that improves with use, lighting (torches, charcoal, later oil), crafting and war town focus modes.
2. Governance and rivals: governors, policies, government types from Bronze by population, strong rival civs and difficulty, building look from primitive to wealthy, build time scaling with complexity, people standing inside buildings while working, click person then building to work there, timber-home refusal, bridges crossing, steep-hill pathing.
3. Last on the list: first-person mode, tutorial mode, future eras (discuss with Boris first).
Note: an older coordination setup exists on branch `agents/claude-coordination` (docs/parallel/TASK_LANES.json). This file is the current source of truth for lanes; ignore stale lanes there.

## Rules
- Never use `git stash` (the stash list is shared across worktrees).
- Push: commit with trailers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Y7uzF6KumhgyBFEA6fbyCE`; then `git fetch -q origin main && git rebase -q origin/main && git -c push.negotiate=true push -q origin HEAD:main`. Re-run tsc after the final rebase.
- Tests: `node --import ./scripts/game-loader.mjs --test scripts/<file>.test.mjs`, relevant files only. Typecheck: `npx tsc --noEmit -p .`.
- Failing before this work (ignore): carrier-recovery test 16, survival-winter, camera-clearance (2), fixed-camera-collision, cereal, compact-hud, hud-minimise, hearth-size-floor, coastal-trade (5), antagonism, building-maintenance, botanical-stand, cold-paid-recovery, textile-production, m1 qualification, priority-defense (2), mass-raid (2), raid-outcome-prestige-native (2), workload-production #5, workload-ready-food-deficit #3, rival-tool-upkeep #3, production-work (1), automatic-food-recovery (1), cereal-contour-cycle, placement-fixes #7, field-area-placement-control, draw-distance, water-works-buildings #3, food-preservation #9.
- Publish to the game (local Mac): `git pull`, `npm run build:dev` (output `.vercel/output`), copy it to `.play/releases/<UTC timestamp like 2026-11-15T06-00-00-000Z>/`, run `node -e "import('../scripts/retain-release-assets.mjs').then(m=>m.retainReleaseAssets('current','releases/<timestamp>'))"` from the `.play` folder, then repoint the `current` symlink to the new release (`ln -sfn <abs path> next && mv -f next current`). Keep only the last two release folders. Check `http://127.0.0.1:8086/__hearthwild_health` shows the new release name. The cloud session also publishes; each build starts from the latest `main`, so the later release contains the earlier work.
- Log each new request from Boris in a `claude/requests-<date>-<part>.md` file and update the MASTER checklist after each publish.
- Boris's rules: verify claims only from primary sources and flag [UNVERIFIED]; documents start with a BLUF; no durations in project phases.
- If you run low on usage: write a very detailed handoff file here (lane status, what is done, what is left, exact commands) so a fresh model can continue without guessing.

## Claims (local Claude Code session, 2026-11-15). The claim line decides ownership if sessions overlap.
Boris re-scoped the local session to take ALL lanes below, run as parallel helpers (one worktree each). The cloud session keeps P5 ships/harbors, P7, P8 UI fixes, P9 animals, P10 food follow-up.
- CLAIM L1 Military: call to arms, walls/patrols/towers, groups 5/10/25/50/100, commanders, weapon stock display, weapons per age/material, fighting skill, lighting, crafting/war focus modes. Branch `local/military`.
- CLAIM L2a Governance: governors, policies, government types by population from Bronze. Branch `local/governance`.
- CLAIM L2b Rivals: strong rival civs and difficulty. Branch `local/rivals`.
- CLAIM L3 Building behaviour: stand at/inside buildings while working, no leg sliding at workstations, ceiling vs person height, click person then building to work there, timber-home refusal, bridges people cross, steep-hill pathing, building look primitive to wealthy, build time scaling with complexity. Branch `local/building-behaviour`.
- CLAIM L4 Trade and expeditions UI (after checking P5 on main to avoid duplication): encounter dialog (Trade, Chat, Send away, Capture, Kill and rob), map trade proposals, trading people, coins, send-expedition panel, baskets/clay containers, regional goods (olive oil, wine). Branch `local/trade-ui`.
- CLAIM L5 Save error "Save is damaged or incompatible": round-trip test with trade/raid/conquest state, find the validation that rejects. Branch `local/save-roundtrip`.
- CLAIM L6 Leftovers: storage caps for non-food resources, near/mid tree LOD radii, longer seasons (plan first; 1800 s year is hard-coded; saves must load). Branch `local/leftovers`.
- Last, not started: first-person mode, tutorial, future eras.

## Claims (cloud session, 2026-11-15, after Boris asked to keep going)
- CLAIM P11 Animals leftovers: donkey and ox domestication, group capture, snares, livestock crowding into health, actionable "people will hear you out" notification.
- CLAIM P12 Cisterns (finite stored fresh water, drought) and bigger harbour building tiers with boat slots.
- CLAIM P13 Clothing: simplified chain and tailor hints, hide-use rules, starting clothes, pregnancy effect on work.
- CLAIM P14 Smoke test: a headless seeded run of the real sim that exercises the new systems and fails on exceptions or NaN (scripts/smoke-sim.test.mjs); reports crashes to the session, fixes only trivial ones.
