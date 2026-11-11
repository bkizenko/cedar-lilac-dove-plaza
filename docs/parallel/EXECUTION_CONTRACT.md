# Three-provider execution contract — 11 November 2026

## Leadership change — latest user instruction

Grok is the execution project manager. Claude leads high-level design and systems thinking. Codex implements, debugs, tests and provides technical integration/release support; it does not set programme priorities over Grok.

Grok owns task sequencing, assignments, execution coordination and backlog reconciliation. Claude supplies design decisions and acceptance intent. Existing exact file claims stay in effect until Grok explicitly reassigns them, preventing concurrent edits. Gemini is not participating. Preserve the complete original plan, all later requirements, saved villages and the frozen98-gate denominator.

This supersedes earlier wording assigning overall execution leadership to Codex or Claude. Current authorized camera/food/navigation work remains in progress; source, validated and live states must be reported separately. Communication is through this repository; no direct cross-provider live-chat connection is claimed.

This is the governing coordination revision. Gemini is not participating. Preserve the whole original plan and later backlog. Codex integrates; Claude and Grok are trusted independent owners, not limited assistants. Persistent domains reduce context switching. Small shared changes are coordinated, not prohibited.

## Current execution order — latest explicit user instruction

1. Measured simulation speed on an actual native100-resident Low-profile run: target p95<33ms; cut demonstrated hot paths and implement an authoritative Web Worker simulation with real measurements.
2. Normal whole-branch merges, behind game options: agents/claude-societies at least55fc655, agents/claude-experience at least9992fe9, and agents/grok-world. Wire the board hooks. No partial branch landing, rebasing or force-pushing shared work.
3. Then knowledge/provenance redesign, livestock/horses/cheese, crafting and saves. Preserve already qualified pending work; it is not a new published release.

[COMPLETION_PLAN.md](COMPLETION_PLAN.md) is the supplied plan from Claude coordination commit e8a48af. Codex owns canonical backlog reconciliation and native/built evidence before gate credit. This order overrides earlier queue wording below; all original scope remains.

## Persistent domain ownership

| Lane | Primary owner | Scope | First deliverable |
|---|---|---|---|
| C-Economy | Codex | labor, food, farms, survival, livestock/wool/dairy/horses, crafting/materials, tools/armor mechanics, practice/skills/discovery, prestige | integrate paid sheep/wool and finish reliability |
| C-Platform | Codex | inventories/reservations, hull/crew/physics primitives, persistence, runtime profiling/culling/LOD infrastructure, tests/builds/releases | integrate sailing; retain Low performance and save compatibility |
| A-Societies | Claude | NPC strategy, diplomacy, trade/caravans, leader dialog, raids/defense, captives/conquest, commanders/siege/naval operations | physical NPC docked-hull scouting and return |
| A-Experience | Claude | Option H/E3D art, architecture/cultures, units/armor appearance, wonders/ruins/artifacts, animation, UI design system, shared HUD composition and audio | reviewed real3D H and compact UI vertical slice |
| W-World | Grok | geography, biomes/ecology, river/soil/resource distribution, terrain metrics, navigation, placement, territory and civil engineering | reliable native placement/routes and coherent river/regional terrain |

Claude receives the aesthetic and open-ended systems work formerly assigned to Gemini. Codex receives render-performance engineering, inventory/queue behavior and technical UI accessibility. Grok receives biome dressing data, terrain-to-geometry grounding constraints and water/current/site constraints; Claude renders those data. Codex implements workshop/knowledge/ledger runtime behavior using Claude's design system. Grok implements map/minimap/placement controls. Claude implements trade/diplomacy/combat UI. No responsibility is dropped.

## File boundaries and shared integration seams

- Codex: food/labor/production/crafting/husbandry/discovery/prestige modules, cargo ownership, haulage/boat physical primitives, persistence/release tooling. Integration owner for src/game/sim.ts, engine.ts, types.ts, constants.ts, persistence.ts and package/build scripts.
- Claude societies: rival* strategy/operations, trade* and caravans, diplomacy/relations, raid/conflict/warfare/captivity/peace/defense and siege missions. Read Codex stock/crew APIs; request actual operations rather than directly granting cargo or commandeering workers.
- Claude experience: src/scene building/unit/architecture/material/animation modules, art assets, shared UI components/theme, HUD layout and audio. Integration owner for src/scene/world.ts and shared HUD composition. Codex's culling/metrics infrastructure edits coordinate with Claude before modifying shared renderer entry points.
- Grok: worldgen/geography/landforms/regions, hydrology/ecology, navigation/local routing, plots/field geometry/placement, territory/frontiers, earthworks/bridges/waterworks. Construction recipe/payment remains Codex; terrain/admissibility/work positions are Grok; building appearance is Claude.
- Existing direct overlaps (e.g. bridge work, river rendering, scene grounding, armor/equipment rendering) require a task claim naming exact files before edits. Existing pending sheep and sailing patches are Codex-owned exceptions until merged. Do not overwrite them.
- Do not assume commandGateway.ts or simulationEvents.ts are complete generic buses: they currently cover worker eligibility and food/cargo accounting respectively. Extract small seams when needed; no prerequisite framework rewrite.

## Standard contracts

Every cross-domain interface declares: stable IDs; units; authoritative owner; inputs/output; deterministic ordering; rejection reason; retry/cancel behavior; cargo/actor reservations; save version/default/migration; performance budget; focused acceptance. Economic simulation owns state. UI/rendering consume snapshots/selectors and issue commands; they never create resources or advance work by drawing.

Buildings share one stable ID across economic recipe, footprint/entrances/work positions and visual definition. Terrain queries and placement validation are pure, with the same result used for preview and commit. Missions request actual inventory/hull/crew transactions. No free goods, teleportation, hidden-knowledge leaks, duplicated ownership or automatic deletion of stuck actors. Distinguish game-force units from historical physical units. Tunable constants have one authoritative definition and documented units.

Use existing project TypeScript/style conventions, small named modules, existing save validators, deterministic seeded randomness, bounded queries and actual lifecycle states. No repository-wide formatting or opportunistic unrelated refactors. New dependencies require a concrete need and memory/size assessment. Preserve historical sources, approved art, user villages and the98-gate checklist.

## Swarm layout and context discipline

Codex has four available concurrent slots total: integrator plus three specialists. Fill them with non-overlapping work, not duplicate audits. Each task gets a short packet: current main/runtime, defect/acceptance, exact files, dependencies and next deliverable. Specialists remain on one system until the batch closes. A reviewer may read broadly but does not edit a second worker's files.

Claude: start with two persistent workers, Societies and Experience, plus coordination/review if its tool/account supports that concurrency. Add a combat or asset worker only with disjoint files and ready inputs. Grok: start with World/Ecology and Navigation/Civil workers if supported. Provider limits differ; these are requested assignments, not a claim those external agents are already running. Keep cloud source work parallel. Run one expensive local build/browser/simulation at a time on the8GB Mac. Do not consume all RAM blindly.

## Frequent commit, push and merge loop

1. Start each independent batch from latest origin/main in its own checkout and short-lived branch. Long-lived agents/* branches are landing pointers, not months-long divergent development lines.
2. Claim exact files and contracts in a task note; split by one independently verifiable behavior. Merge backward-compatible shared contracts before consumers. Avoid dependent PR stacks where a small common seam suffices.
3. Commit and push whenever a coherent recoverable step is ready; aim for a checkpoint every30–60 minutes during active implementation. This is a checkpoint target, not permission to fabricate empty commits or merge broken code. Longer work gets a pushed draft branch and explicit remaining work.
4. Open/update a small PR with the standard handoff template. Codex reviews and merges ready batches serially as they arrive; don't wait for the entire provider domain to finish. Rebase/update before final checks if main changed relevant contracts. No force-push over another worker's commits.
5. Focused domain checks first, then affected inventory/save/conservation regressions. Reuse one frozen integrated build for publication; native UI checks target changed boundaries rather than repeating long campaigns. Component checks alone do not establish whole-game acceptance.
6. After merge, start the next batch from new main and update the landing pointer without overwriting in-flight commits. External owners do not deploy to8086/8101 or restore/delete villages. Codex publishes verified gameplay batches with rollback and reports merged versus actually live separately.
7. Every merge records base/head, source versus controlled/native test assumptions, exact results, migration impact, unresolved bugs and rollback. Keep current batch percentages separate from unchanged34/98 recorded overall until matching published evidence changes it.

Git transport works, but gh is currently unauthenticated. Direct authenticated PR creation/merge through gh is not enabled here; use GitHub PRs from the connected provider/UI or pass branch+commit to Codex for serial Git integration. This is not a reason to stop branch work or pushes. No branch protection/CI settings were silently changed.

## Model recommendations

These are task-allocation recommendations, not a proven cross-provider quality ranking or a promise of threefold speed. Availability depends on the user's account.

- Claude Opus5.5 for difficult society/conquest architecture and visual/art-direction decisions; Sonnet5.5 for well-scoped implementation, assets/components and regression iteration. Use normal/high deliberation where offered; reserve the most expensive setting for unresolved structural decisions.
- Codex GPT-6.1 Sol Medium for routine implementation and integration; High for conservation, save migrations and difficult deadlocks. Astra Medium/High for genuinely ambiguous architecture/review, not every small patch. Keep specialist tasks small enough that a full-history reread is unnecessary.
- Grok4.7 for its persistent world/civil track; use higher reasoning for drainage/topology/navigation contracts and ordinary settings for implementing agreed slices. Do not invent a cheaper unsupported variant or assume subscription API access.

Official references checked11 November2026: https://learn.chatgpt.com/docs/model-selection ; https://www.anthropic.com/claude-sonnet-5-5 ; https://x.ai/news/grok-4-7 . Vendor claims guide selection but do not measure this game. Review actual accepted output and elapsed integration time to adjust.
