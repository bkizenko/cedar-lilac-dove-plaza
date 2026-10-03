> Continuation note (2026-10-03): the previously uncommitted handoff/checkpoint was pushed as `53bf156`. Implementation resumed afterward. Read the latest “Sol continuation” section in `ITERATION_BACKLOG.md` before interpreting the older status below: optional lumber camps, persistent manual orders, legacy traditions, stronger age benefits, conservation/willingness trade fixes and finite local raider camps have since been implemented. Browser access is restored. The original completion contract remains in force; these phases are not full completion.

# Execution prompt for GPT-6.1 Sol — Hearthwild non-visual completion

You are GPT-6.1 Sol, taking over implementation of Hearthwild. Inspect the repository and current working tree first. Preserve working systems and existing local changes. Then implement, integrate, test and balance the remaining work autonomously until the non-visual game defined below is feature-complete and playable. Do not stop merely after writing another plan or finishing a convenient subset. Work in tested phases. If a genuine blocker or execution limit prevents completion, leave a precise checkpoint, preserve all work, and state the remaining acceptance failures honestly.

This prompt is self-contained. Supporting documents give detail, but are not evidence that a feature works. The current code, tests, observed play and the user's latest requirements take precedence over older proposals.

## 1. Product intent and scope

Build a coherent settlement RTS: Dawn of Man-style survival and civilian production; Age of Empires-style responsive commands and tactical combat; Civilization-scale exploration, differentiated societies, discovery and later regional development. Begin with a small sheltered community. Progress from survival to surplus, specialization, settlement networks and organized conflict. Realism must create understandable choices, not arbitrary deaths or endless chores.

Include all non-visual systems below, including later political expansion. Exclude the visual/3D overhaul: no engine replacement, wholesale renderer replacement, detailed texture/model packs, new character rigs, elaborate animation/VFX or photorealistic art project. Reuse current geometry and simple render fallbacks for new gameplay objects. Functional UI, readable fog/territory, weather cues, item/building labels and selection feedback are still in scope. Audio is in scope, but preserve the already changed calm piano unless listening reveals a concrete problem. A Bethesda-style first-person RPG is not part of this completion target; retain existing camera capabilities and defer new first-person content with the visual/3D phase.

Non-negotiable user preferences:
- New game starts with a completed hut, clear weather and no precipitation during the opening.
- No spawning people from a training queue. People come from births, migration and surviving/captured people transferred between communities. Existing civilians hunt, build, gather and defend; permanent military specialization comes later.
- Growth should be achievable with food, shelter and safety. People should not die of old age after a few game years. Winter is a preparation challenge, not a scripted massacre.
- Discovery matters: workers cannot locate unseen food; remembered static resources remain actionable; exploration orders persist without button mashing.
- Biome and accessible materials change viable shelter, clothing, food, mobility and development choices. Small or timber-poor settlements must have viable alternatives.
- Rival settlements have needs, incentives, divergent fortunes and imperfect knowledge. Scarcity can drive exchange or conflict. Peace and withdrawal must work; perpetual automatic war is unacceptable.
- Exact rival inventories are private unless genuinely observed; even visible open stores should usually give an estimate, not omniscient totals.
- Geography is large enough for discovery and separate settlements. Territory derives from established buildings and occupation, not arbitrary full-map ownership.
- Calm, sparse, acoustic/piano music, preferably seasonally varied. No mandatory battle escalation for a remote war flag.
- Core game fully playable without a mouse, with usable touch and desktop UI.
- Only free assets/resources with clear distribution-compatible licenses. No purchases. Record external resources in THIRD_PARTY_ASSETS.md.

## 2. Exact handoff checkpoint — read before touching Git

Repository: https://github.com/bkizenko/cedar-lilac-dove-plaza

Verified active local checkout on the user's Mac:
`/Users/boriskizenko/Documents/Codex/2026-09-26/https-github-com-bkizenko-cedar-lilac-2/work/hearthwild.nosync`

Branch: `main`. Local HEAD and cached `origin/main`: `da99117` (Make exploration necessary and rebalance population and winter preparation). This commit was pushed previously. Inspect the remote before integrating with work from other models; the cached remote ref is not a fresh fetch.

IMPORTANT: the last implementation block is UNCOMMITTED and UNPUSHED. The user explicitly stopped implementation to request this handoff. Do not reset, clean, discard or overwrite it. A fresh GitHub clone will not include these changes. If working on another machine, bring over the local source patch/new files first or have the integration owner checkpoint them. The handoff itself is also a local untracked document until committed.

Local modified source:
- `scripts/game.test.mjs`
- `src/game/engine.ts`, `keyboard.ts`, `persistence.ts`, `sim.ts`, `types.ts`
- `src/scene/world.ts`
- `src/ui/Hud.tsx`, `SettlementLedger.tsx`

Local new files:
- `src/game/discovery.ts`
- `docs/OVERHAUL_HANDOFF.md` (detailed coordinated phase plan)
- `docs/SOL_EXECUTION_HANDOFF.md` (this prompt)

There is extensive tracked/untracked generated churn under `.vercel/output/` from builds. Do not confuse it with source work; stage explicit source/docs/tests only. Do not run `git add .` indiscriminately. Do not delete other models' work or force-push.

Latest verification, before the handoff-only request:
- `npm test`: **292 passing tests**, comprising 260 script/game tests and 32 application/auth tests; zero failures.
- `npm run typecheck`: passed.
- `npm run build`: passed. Migration script reported DATABASE_URL absent and skipped, as expected for this game.
- Local logs: `.preview/chronicle-tests.log`, `.preview/chronicle-build.log` (ignored, not guaranteed available on another machine).
- No current visual/interactive browser verification for this block. Do not infer it from the build or HTTP success.
- The preview has used port 8086. Its last successful restart was in the prior turn; verify the server rather than assume it is still running.

Browser limitation: a cached browser error page previously triggered a Browser Use URL-policy block; automatic approval also rejected opening alternate tabs as a workaround. The user subsequently approved opening a preview tab. In the latest attempt, binding the existing HTTP preview tab returned “Tab not found in browser 2,” despite ambient context listing that URL. No latest browser QA succeeded. Respect the current tool's restrictions; do not use alternate automation or raw browser connections to evade a block. Report the exact unresolved acceptance gap if access remains unavailable.

Filesystem history: temporary checkouts were cleaned up, and normal Documents directories had files offloaded by iCloud. The `.nosync` checkout above is intentional. Do not revive `/private/tmp/dawn-publish`, `/private/tmp/dawn-rework`, `work/game`, `work/game-execution` or `work/hearthwild-current` as the authoritative source.

## 3. Architecture to preserve

The stack is TypeScript, React 19, TanStack Start/Router, Vite 8, Three.js and a custom simulation. It is not Phaser, Unity, Godot or a new greenfield project. Retain the simulation/render boundary:
- `Game` is the simulation facade and command authority.
- `Engine` owns input, lifecycle, fixed-step scheduling, saving, HUD snapshots and music integration.
- `WorldView` renders the simulation and handles scene picking/camera.
- React displays snapshots/ledger state and calls commands. Avoid new per-frame React state.

Keep the 30 Hz accumulated simulation loop, bounded catch-up, visibility lifecycle and current speed semantics unless a measured bug requires changing them. Gameplay time and music time are different clocks. Keep bounded obstacle routing, entity identity, work reservations, save validation, keyboard focus rules and established UI styling.

Refactor at exercised seams. Extract economy, technology, AI and combat modules as needed while retaining the facade; do not replace the whole monolithic simulation before delivering gameplay. Centralize definitions and balance; do not duplicate prices/rules in UI.

Do not put Three/DOM objects in saved state. Saves resolve entity references through IDs, validate before installing state, and preserve a backup. Save envelope is currently version 17. New optional demographic/discovery fields have compatibility handling. Future required schema changes need explicit migration fixtures; never silently erase a village.

Keep the platform app shell, PreviewHostBridge, auth/data helpers, PWA/branding integration and startup contract. Auth/database are not new game requirements. Do not enable accounts/database or rewrite server scaffolding simply because those dependencies exist. Preserve assets/licenses and the working soundtrack.

### File map

| Path | Responsibility |
| --- | --- |
| `src/game/sim.ts` | Main Game facade; commands, resources, movement, work, demographics, combat, trade, rivals, weather, vision, age transitions, victory, snapshots. Large integration hotspot. |
| `src/game/types.ts` | Shared state, entity, tribe, order and HUD types. |
| `src/game/constants.ts` | Authoritative unit/building costs/stats, age costs/choices, gather rates and world constants. |
| `src/game/worldgen.ts`, `rng.ts` | Seeded terrain, camps, rivers/fords, biome centers, resource placement, RNG/noise helpers. Simulation is not yet fully seeded. |
| `src/game/navigation.ts` | Bounded A* and navigation support. |
| `src/game/settlement.ts` | Calendar, food demand/reserves, crop labor, work board/reservations, dependence, emergency response and neighbor intent. |
| `src/game/pantry.ts` | Spoilage, storehouse shelter/preparation, winter food forecast. |
| `src/game/ecology.ts` | Grassland/woodland/upland profiles and nearest-biome lookup. |
| `src/game/barter.ts` | Known-settlement gating, offer calculation, adult carrier selection and shipment proposal. |
| `src/game/discovery.ts` | Uncommitted first exploration chronicle and one-time scoring. |
| `src/game/persistence.ts`, `save.ts` | Encode/decode, validation, entity-reference restoration, localStorage primary/backup. |
| `src/game/engine.ts`, `keyboard.ts` | Runtime/input, command routing, camera/HUD lifecycle, keyboard selection/groups/orders. |
| `src/game/music.ts`, `audio.ts` | Recorded score, transitions/rests and other sound. |
| `src/scene/world.ts`, `meshes.ts` | Three.js terrain, entities, fog, vegetation, weather, camera/picking and procedural geometry. Preserve rendering; only functional adapters in this task. |
| `src/ui/GameApp.tsx`, `Hud.tsx` | Game shell, opening, HUD, production/selection/trade controls. |
| `src/ui/SettlementLedger.tsx`, `TradeProposal.tsx`, `PlayTools.tsx` | Planning ledger, negotiated shipments, help/settings and controls. |
| `scripts/game.test.mjs`, `scripts/game-loader.mjs` | Game regressions and TS import loader. |
| `scripts/diagnostics/settlement-run.mjs`, `performance.mjs` | Simulation scenarios and profiling. Current scenarios are not complete deterministic balance tests. |
| `src/styles.css`, `src/routes`, `src/lib`, `server` | Styling and app/platform shell; avoid unrelated changes. |
| `public/audio`, `public/licenses`, `THIRD_PARTY_ASSETS.md` | Existing recordings and provenance. |
| `docs/ITERATION_BACKLOG.md` | Recent verified delivery history and known limitations. |
| `docs/OVERHAUL_HANDOFF.md` | Detailed phase design, dependencies and suggested ownership. |
| `GAME_DESIGN.md`, `ARCHITECTURE.md`, `GAME_DATA_SPEC.md`, `REWORK_DIRECTION.md`, `ASTRA_BACKLOG.md` | Earlier design/architecture plans; reconcile with this newer scope. |
| `DEVELOPMENT_STATUS.md`, `REPOSITORY_AUDIT.md`, `PERFORMANCE_REPORT.md` | Historical evidence; some descriptions are outdated. |

Old documents still describe trained gatherers, faster child maturation, stable growth defaults and older music. Those have been superseded. Do not restore them because an old checklist says they worked.

## 4. Completed foundations versus partial systems

“Implemented/tested” below means the bounded behavior has code and regression evidence; it does not certify every interactive edge case or the whole game.

Implemented/tested in pushed commits:
- Larger 1,040-unit world, terrain/camps, river fords and obstacle routing; no teleport-based unsticking contract.
- Fixed simulation scheduling, save/load with reference restoration and corruption rejection, backup behavior.
- Keyboard selection/cycling, control groups, contextual orders, camera focus handling, selected-building movement/zoom fixes, drag selection and tree designations.
- Selected-squad raids, retained attack-move destinations, hold behavior, visibility gating, truce/withdrawal and recovery interval.
- Starting hut, settlement entry and 300-second clear opening.
- Civilian hunting, initial civilian settlements, stored-weapon militia response and later permanent specialization gates.
- Seasonal farm work: spring sowing, summer tending, autumn collection, uncollected crop loss in winter; soil depletion and fallow recovery.
- Work reservations/fallbacks, food-storage capacity, prepared stores/spoilage and explanatory ledger forecasts.
- Discovered-node requirements for player work; current-sight requirement for wildlife; finite minerals, slower multi-year tree regeneration, limited habitat-dependent wildlife recovery.
- Revised adult ages/lifespans, 16-game-year maturation, reserve/housing-gated birth/migration, welcome-growth default, recoverable fever and old-save demographic adjustment.
- Worker creation from training disabled; obsolete worker queues refund.
- Physical single/regular trade carriers, route pausing, trust/tension effects and negotiated single shipments.
- Calm recorded piano with reduced volume, fades and rests; battle orchestration opt-in.

Local uncommitted block, 292-test/build/typecheck validation but no browser QA:
- Explore no longer stops after five targets. It continues; holds when no target or route blocked. Excludes children/emergency/carriers and clears stale combat intent.
- Removed unexplored megalith fallback from exploration targeting.
- Remembered static resources can be found by resource picking, keyboard cycling, direct gathering and tree marking. UI click path now uses explored rather than currently visible ground.
- Focus village button shares a new engine action with F.
- Exact rival stock totals removed from HUD snapshot/type/trade panel.
- Grass concentration changed from a rectangular patch to a tapered circular scatter. This is not the visual overhaul or a world-density solution.
- Exploration chronicle: habitat visits, copper/iron discoveries, first settlement contact, standing stones; one-time lifetime awards with age/time and save validation. Home habitat can count. Points currently have **no research, reward or age effect**; UI states that explicitly.

Partial: economy/item depth, household realism, biome survival, AI competence, technology, diplomacy, combat depth, regional growth and overall balance. Prior one-year diagnostic runs survived, but some started with extra timber and one terrain was reused under different habitat profiles. They are not evidence of natural-start multi-year balance.

## 5. Confirmed problems and technical debt

Fix these deliberately; distinguish source-confirmed issues from user-reported symptoms needing reproduction.

1. Manual move arrival becomes idle and can be reclaimed by the work board. Continuous Explore now persists, but manually scouting by right-click still needs explicit order ownership/arrival semantics.
2. Emergency defense interrupts scouts and later restores work, not the original expedition. Add visible reason and appropriate resume/recall rules without disabling legitimate protection.
3. Exploration target selection tests walkability rather than complete reachability; blocked exploration now holds, but reachable-frontier selection/replanning remains weak. Test disconnected areas and chokepoints.
4. Static remembered-node commands now work, but remembered objects can change unseen. Define stale knowledge and feedback, rather than magically knowing live quantities. Audit every designation/picking path.
5. Biomes are assigned to camp index: player grassland, first rival uplands, second rival forest. Existing profiles affect yields but not construction/clothing/food strategies.
6. Winter precipitation already turns rainy/stormy events into snow when cold enough, but clear/mist/frost are labeled “Snow” based on ground snow and low graphics disables precipitation particles. Audit weather semantics and provide readable occasional snow without restoring precipitation at startup.
7. `rivalTick` still calls `enqueueTrain(..., "worker")`, which now always rejects. Rival growth strategy must use the real demographic/migration systems.
8. Rival scarcity handling can directly kill a worker or damage a hall through random rolls. Replace with common understandable survival/migration rules. Rival behavior remains heavily team-ID-specific.
9. `lootBuilding` immediately transfers a fraction of faction-wide stock into the attacker's faction-wide stock. It is not local storehouse looting with carried cargo.
10. `bankTrade` instantly converts goods at 3:1 or 4:1 without a partner or journey, undermining scarcity and physical commerce. Replace or explicitly constrain it within the new economy; do not leave an unlimited bypass.
11. `quoteShipment` uses live rival balances and trust/tension but has no forecast reserve protection, strategic willingness or persistent negotiated terms. Repeated quotes may reveal hidden inventories indirectly.
12. Copper/iron gathering is age-locked. Organic discovery must permit sampling/experimentation before unlocking full production; otherwise age and material prerequisites become circular.
13. `tryAgeUp`, `commitAge` and HUD `canAge` do not share one full requirement function. HUD omits building diversity; commit checks affordability but not every initial gate. Centralize validation and prevent bypass through alternate entry points.
14. `checkVictory` treats loss of the player's hall as immediate defeat and checks only rivals 1/2 for conquest. This conflicts with survivors, relocation, multiple settlements, later tribes and breakaways. Add explicit scenario/sandbox win/loss and continue-after-victory.
15. Dynamic tribes are constrained by hard-coded IDs (0 player, 1/2 major rivals, 3 raiders); some UI filters exclude higher IDs. Separate settlement from faction identity before refugee camps and secession.
16. Global inventories, scattered direct mutations, global scanning and the large sim.ts limit economic conservation and empire-scale AI. Extract incremental modules with tested interfaces; no speculative total rewrite.
17. Gameplay still calls Math.random extensively. Seeded terrain does not make replay or balance runs deterministic. Introduce serialized simulation RNG and migrate saves explicitly before relying on reproducible campaign results.
18. Some per-unit exceptions are swallowed in the simulation loop. Add useful diagnostics/repro capture without freezing the game or flooding logs; tests should surface unexpected failures.
19. Performance evidence is simulation-only and historical; navigation rebuild spikes remain. Re-measure target populations after new systems.
20. Older documentation/tests of trained gatherers can mislead. Reconcile status and preserve meaningful regression coverage rather than blindly satisfying obsolete expectations.

User-reported issues still requiring observed play: overly idle workers; repeated failure to raid/defend; selection/camera friction; huts/buildings feeling too expensive; over-easy winter food or excessive death; unintelligent rivals; insufficient activities. Earlier fixes exist for some. Reproduce on current source before declaring any resolved or rewriting it again.

## 6. Remaining feature scope and exact execution order

Use the following numbered order. Make a checklist with acceptance evidence for each. Do not expand scope with unrequested systems. All gameplay items here are required for the non-visual target; art-only work remains deferred.

### 0 — Secure and validate the checkpoint
Inspect Git, instructions, local changes and tests. Preserve the uncommitted block above, review it and checkpoint it separately from generated output. Reconcile the current docs. Verify startup and current browser capabilities. Establish baseline save fixtures and at least one played opening; report browser limits truthfully. Coordinate with other models before shared-file edits.

### 1 — Reliable commands and information
Finish manual order ownership, exploration/waypoints/stop/recall, visible interruption reasons, remembered-resource commands, selection/camera independence, resource/building targeting, keyboard and touch controls. Complete a fog/knowledge audit across HUD, minimap, selection, targeting, AI and diplomacy. Keep known terrain lightly veiled and unknown terrain obscured. Add an operational objective/notification list so important commands and warnings do not disappear behind a transient banner.

### 2 — Shared economic and settlement contracts
Introduce item/recipe/inventory/stock-lot/work-order/equipment/observation contracts. Separate faction and settlement identity. Provide adapters to current aggregates while consumers migrate; avoid two competing authorities. Add serialized gameplay RNG and conservation diagnostics. Move UI balance mutations behind validated commands. Support capacity, reservations, hauling, cancellation and local stores. This is the dependency for detailed survival, discovery, rivals and raids.

### 3 — Biome-driven survival and population
Seed variable starting habitat and resource geography; offer random or selected habitat. Start with grassland, woodland and uplands, then add coast/wetland and an arid survival variant using existing art. Do not make grassland universally treeless or bind strategies to ethnic stereotypes.

Add alternative shelter recipes sharing shelter functionality: portable hides/poles, timber/thatch, reeds where available, earth/stone. Vary warmth, capacity, maintenance, durability, portability and labor. Allow settlement packing/relocation and herd-following as viable strategies.

Model useful raw goods and quality: food categories, grain, timber, stone/flint, hides/leather, bone where a recipe uses it, fiber/textiles, clay, charcoal, copper/tin/iron ores and finished metal. Add salt/wool/flax only with actual functions. Ore grade affects yield/fuel; tools have durability/work effects; preserved food has shelf-life; clothing has insulation/breathability/wetness. Avoid inventory clutter without decisions.

Provide warm and light clothing, shelter/fuel/exposure, food variety/storage and clear seasonal warnings. Wildlife has sustainable habitat reproduction, migration, flee/aggression and signaled predator risks. Winter should occasionally snow in suitable climates and also have clear periods; summer heat/drought should matter where appropriate.

Preserve long natural lifespans and civilian jobs. Add sufficient household/dependent support, health/injury/recovery, sanitation/crowding-related occasional disease and treatment to explain outcomes. Capacity/surplus/safety allow growth; no arbitrary mass deaths. Tune early costs through measured labor/hauling, not intuition alone.

### 4 — Useful production and building families
Implement an explicit catalog of playable buildings, each with input cost, labor, worker slots, outputs, upkeep, unlock and upgrade/alternative. No hollow menu entries. Include hearth/shelters/houses; stores/granary/drying/smoking; work areas/fields/fishing/animal pens; knapping/hide-working/weaving/pottery/charcoal/smelting/smithing; paths/crossings/transport/market; meeting/healing/ritual/learning/administration; watch posts/palisades/gates/towers/equipment store/later barracks. Later food processing, mills, traction, carts and regional storage must improve productivity.

Farming starts labor intensive and gains through storage, rotation, domestication, fodder, selective breeding, animal traction, plows and processing. Do not enforce a fixed historical percentage of farm workers. Make repair, construction cancellation, upgrade inputs and demolition salvage conserve resources. Finish production/hauling work rather than merely adding buildings.

### 5 — Exploration, experimentation and age recognition
Expand the existing chronicle with map-appropriate achievements: locate a pass, return with a novel material, identify winter food, connect communities, establish a viable outpost. Award once; no farming points by rebuilding or revisiting. Add modest meaningful tradition choices tied to achievements, without punitive era deadlines.

Separate achievement score, knowledge and age adoption. Knowledge pipeline: observation → sample → workbench/furnace trials → reproducible technique → adoption. Experiments use actual adults, inputs, fuel and time. Failed valid attempts retain experience and eventual guaranteed progress; show why progress is blocked. Persist progress/RNG to prevent reload rerolls. Native copper working differs from smelting; bronze needs access to tin/alloy practice; iron needs appropriate heat/fuel/process knowledge. Materials can come through exchange.

Population, local contact density, surplus, specialists/apprentices and outside exchange support knowledge transmission. Use capped contextual bonuses, not a universal density threshold or free random unlock. Small connected settlements can progress. Age recognition requires adopted technology and sustainable supporting population/production, not a pile of money. Keep all existing six age labels/IDs compatible unless explicitly migrated; supply non-visual progression through the late regional phase rather than stopping at Bronze. Branches include food/domestication, storage/ceramics, textiles, metallurgy, construction, transport/navigation and governance. Apply effects idempotently; graph must be acyclic and all ages reachable without circular material gates.

### 6 — Viable and distinct rival societies
Use shared population, economy, crafting and military budgets. Seed differing identity, priorities and geography. Strategic AI chooses food security, housing, equipment, scouting, defense, trade, expansion or migration from needs and forecasts. Individual units execute ordinary orders. Remove obsolete trained-person requests and artificial collapse rolls.

Maintain each faction's knowledge rather than granting omniscience. Rivals scout, defend, recover, exchange knowledge, specialize and choose limited war when it helps a goal. Different seeds should produce different successful societies; success cannot be guaranteed by hidden free resources. Refugees carry real people/belongings and can join others or found viable settlements. Coastal arrivals/raids need plausible origins and limits, not infinite army spawns.

### 7 — Lifelike exchange and diplomacy
Replace unrestricted instant conversion. Negotiations include quantities, delivery time, recurring duration and cancellation. Partners accept/refuse/counteroffer based on forecast reserves, current goals, scarcity, relationship, threat and alternatives. Protect winter food and strategic equipment. Explain intentions without leaking exact stocks. Offers expire or reserve stock; changing circumstances have explicit outcomes.

Physical carriers/carts/boats convey goods, with losses, safe passage, delays, escort, interruption and return behavior. Record agreement/delivery history and breach. Add nonaggression/truce, grazing/access rights, alliances, tribute and knowledge/artisan exchange in appropriate developmental stages. Trade should sometimes be preferable to conquest, while refusal can create a strategic conflict choice.

### 8 — Tactical combat, raids and outcomes
Military consists of actual existing people with produced equipment. Militia and professionals have different opportunity costs. Implement readable melee/ranged roles, armor and soft counters, target priorities, projectiles, limited friendly congestion, retreat/morale, patrol/queued orders and stable group behavior. Add later commanders/formations after basic combat passes; no formation requirement for the starting villagers.

Defenses include functional gates, walls/towers, watches and local alarms. Raid/scout/seize/destroy are distinguishable orders. Night affects observation/detection: stealth is approaching unseen, not invisible magical attackers. A patrol/watch must be able to discover a raid. Storehouse pillage takes local goods into limited loot capacity, which must be delivered. Burning/destruction takes time and removes actual buildings/stock.

Civilian survivors flee/shelter/surrender; preserve people through refugee/captive/release/ransom/coercive-labor states with appropriate escape/resentment consequences. Capturing must transfer people, not create new units. Eliminated settlements cannot continue producing armies. Withdrawal and negotiated peace stop relevant targets/projectiles and have reliable recovery periods.

### 9 — Regional scale, rise/fall and endgame
Multiple settlements per faction, outposts, roads/travel/transport, local storage and development, delegation and allegiance. Expansion needs resources/workers and carrying capacity. Later distant/deprived settlements can seek autonomy or break away through visible conditions, warnings and counterplay. Survivors can resettle after defeat. Distinguish loss of one hall from annihilation or unrecoverable failure.

Provide an explained peaceful development/regional-control victory and conquest victory, robust defeat conditions, and continue-after-victory/sandbox play. Update objectives to reflect actual available actions at each age; avoid stale “train villagers” guidance. Define a finite endgame campaign while allowing continued society simulation.

### 10 — Integrated usability/audio/balance/performance gate
Finish a readable keyboard-accessible technology interface, production/hauling views, trade negotiation screens, alerts, costs/work estimates, actionable idle/block reasons, village focus and contextual tutorial. Existing art is sufficient; use concise functional labels and the existing style. Verify desktop, narrow/mobile and mouse-free play.

Listen to the current piano in actual play. Preserve rests/calm default and clear volume/mute/hidden-tab lifecycle. Add seasonally appropriate acoustic variation or natural SFX only when useful, licensed and verified; do not replace it with harsh synth or incessant combat music.

Profile at increasing populations, optimize only measured bottlenecks and keep path/AI budgets bounded. Finish save migrations and replay checks. Run complete campaigns; fix gameplay failures and rebalance before declaring completion.

## 7. Build, run and test

Use the repository package-lock; do not perform unrelated upgrades. This machine requires the bundled ARM64 Node 24 runtime, rather than the old system Node 21/x64:

```sh
cd /Users/boriskizenko/Documents/Codex/2026-09-26/https-github-com-bkizenko-cedar-lilac-2/work/hearthwild.nosync
export PATH="/Users/boriskizenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
node --version
npm run typecheck
npm test
npm run build
```

If dependencies are missing, use `npm ci --ignore-scripts --no-audit --no-fund` with the compatible runtime. On other machines use a Vite-compatible Node release/architecture and the checked-in lockfile.

Preview:
```sh
DAWN_PORT=8086 sh startup.sh
# Foreground, when the tool can keep a long-running session:
DAWN_PORT=8086 DAWN_FOREGROUND=1 sh startup.sh
```

`startup.sh` defaults to 8080, accepts DAWN_PORT, uses strictPort and delegates to `npm run dev` through the app environment wrapper. Preserve an already-running preview; don't restart on every source edit. Never silently switch away from the active checkout/port. Local network/listening permission may be needed under the host sandbox.

Useful targeted checks:
```sh
npm run test:game
node --import ./scripts/game-loader.mjs scripts/diagnostics/settlement-run.mjs
node --import ./scripts/game-loader.mjs scripts/diagnostics/performance.mjs
npm run check:auth
```

`npm run preview:restart` starts the production preview managed by the repository, normally on 8081; inspect `scripts/preview.mjs` before using it. `scripts/browser-smoke.mjs` contains desktop/mobile checks but must only be used if the current environment permits that browser mechanism. In Codex, obey the current browser tool instructions and any existing access denial; never use a smoke script as a bypass. Build success/HTTP 200 is not rendered or interactive success. Capture screenshots, console errors and actual command behavior when permitted.

Relevant dependencies: Three.js rendering; React/TanStack UI; TypeScript; Vite/Nitro production build; node:test; Playwright installed for repository browser tooling. Database/auth libraries belong to the platform shell and are not required new gameplay infrastructure.

## 8. Completion acceptance — every gate must pass

Publish an evidence checklist, not an invented overall percentage. A failed or unverified gate stays open.

A. Opening/controls: clear sheltered start; immediate understandable tasks; building selection and camera coexist; a complete opening, build, gather, scout, defend, trade, save/load and age transition works using keyboard only. Orders persist/cancel as described; unreachable tasks explain themselves.

B. Survival: at least three natural seeds per supported biome survive three game years under sensible ordinary play, without extra starting stock or hidden cheats. At least two viable food/development strategies per biome. Surplus plus adequate shelter produces growth. Scarcity/cold/disease have warnings and effective preparation/recovery; no unexplained mass death.

C. Economy/content: every exposed resource/building/recipe/upgrade has a tested purpose and acquisition path. Local stock, reservations, work, hauling, equipment wear, production, repair, cancellation, trade and theft obey conservation. Scarcity creates decisions without impossible starts or unlimited bypasses.

D. Discovery/progression: all age paths reachable; practical sampling/trials/adoption matter; density/contact/surplus influence but do not arbitrarily hard-lock innovation. Valid trials cannot fail forever. Chronicle awards once, rewards are functional and saves retain exact progress. Full early-to-late campaign progression is played, not merely force-set in a test.

E. Rivals/trade: at least three five-year scenarios show distinct viable AI outcomes, recovery and materially different priorities. No unlimited people/resources; refusal/counteroffers/seasonal reserve protection demonstrated. Cargo journeys, losses, recurring agreements and peace are tested. No exact hidden rival-stock leaks.

F. Conflict/regional outcomes: tested militia defense, raid/withdrawal, night detection, counters, gate/choke behavior, looting delivery, destruction, fleeing/capture and resettlement. Multi-settlement growth and later autonomy/secession work with warnings. Conquest and peaceful victory, recoverable loss and continued play are demonstrated. Dead factions cannot spawn limitless forces.

G. Persistence/determinism: supported old saves migrate without losing people/wealth; corrupt saves do not replace valid state. Mid-work/trade/battle/experiment/migration saves restore entity references, orders, cargo, reservations, knowledge, diplomacy and RNG. Deterministic replay/state hashes agree across supported frame cadences after RNG migration.

H. Performance: document hardware and population composition. Use the existing initial target of 240 active people total, 40 animals, 100 buildings and roughly 2,000 resource instances; measure simulation p95 under 8 ms and responsive input. Test a 60-unit choke battle and 300-person stress case. Report long-run memory growth and navigation spikes; no unbounded per-frame work or teleport recovery. Existing renderer limits are reported separately rather than used to claim new art was completed.

I. Interface/audio: development and production both render without app errors, desktop and approximately 390×844 layouts remain usable, core actions have keyboard equivalents, and instructions match real mechanics. Listen to music transitions/rests/mute; no autoplay or hidden-tab leaks. Functional existing visuals are enough for this milestone.

J. Delivery: all automated suites/typecheck/build pass, complete-play evidence recorded, source committed and pushed to the authorized repository, no generated-output accidents, third-party licenses documented, current status identifies deferred visual/3D/first-person work. The user previously authorized pushing all changes; perform ordinary verified pushes when safe, never overwrite other models' changes. Do not claim feature-complete if any gate remains unverified.

## 9. Autonomous work and coordination

Start with a brief repository audit and the first executable slice; do not spend the turn re-planning everything. Keep a living task checklist/status log, use small tested commits, and continue in the exact dependency order. Reasonable implementation choices are yours; ask only for a genuinely missing requirement or irreversible action not already authorized. Do not ask permission again for ordinary code fixes or tests.

If other models are active, agree file ownership and contracts first. One integrator owns sim.ts/types.ts/persistence.ts changes; separate worktrees/branches for simultaneous editing. Pure economy/AI/progression modules may be developed against agreed interfaces. Do not create new chats or delegate unless the user or current environment instructions permit it. Review other models' patches before integration; a model saying “done” is not acceptance evidence.

Whenever an execution limit interrupts progress, record: current branch/commit, dirty/new source files, exact tests run, last played scenario, acceptance failures, next smallest action, preview startup and any genuine blocker. Leave the game recoverable. This task ends only at the non-visual completion gate or a clearly documented external blocker/limit—not at the end of another planning document.
