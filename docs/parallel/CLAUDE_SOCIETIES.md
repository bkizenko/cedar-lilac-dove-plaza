# Claude: independent societies and international gameplay

Repository: https://github.com/bkizenko/cedar-lilac-dove-plaza . Branch: agents/claude-societies. Read latest origin/main, AGENTS.project.md, COORDINATION.md and WHOLE_GAME_WORKSPLIT.md. This replaces the earlier livestock assignment. Codex retains all livestock/wool/dairy work and prestige. You own the international track in staged tested batches, not a new engine or art rewrite.

## Whole track

Independent society exploration/settlement development, land/sea trade and caravans, leader/visitor conversations, diplomacy/alliances, observed-information exchange, raids/naval conflict, guards/commanders, intact occupation/captivity/annexation/puppets/tribute. Use the original master plan and user requirements; don't claim all of it from a first scenario. Existing paid armor/ram and food systems are foundations to preserve.

## First concrete deliverable: physical NPC sea exploration

Code-first evidence from an unchanged historical53-person save: one prosperous rival had83people,79adults,1728seconds of food reserves and a completed dock;26 adults could scout but its sole personal-canoe owner had43% health, below60% departure eligibility. Presence of that canoe blocked new equipment. All reachable dry land was already explored and no foreign halls known, blocking trade-driven hull commissioning. Other tiny foodless societies legitimately could not leave. Never solve this by granting food/ships or making more boats carried on people's heads.

Use existing paid vessel production to build a registered docked hull independently of known foreign settlements. Reuse existing eligible hulls and pending paid projects. A healthy available adult physically loads finite scouting provisions, walks to the dock, boards, explores connected unknown water in THAT society's knowledge, returns the same hull to a dock, disembarks and reports at its real cache. Reports/private stocks must not leak globally. Later trade/contact and pairwise war can use this foundation.

Suggested focused module npcSeaScouting.ts: bounded per-society admission reviews; actor/project/hull/origin/phase references; no new free people; finite home food buffer, actual timber/stone/work, healthy helm; own scoutKnowledge/rivalKnows navigation targets, not player fog. Existing boatExploration currently targets player fog and cannot be used unchanged for rivals. Existing raid planner is ground-only: add a real embark/transport/landing/return adapter in a subsequent batch, not a naval raid label.

Record bounded actual admission reasons, departures, arrivals, contacts and returns. Current pair journals can hide failed reviews entirely; zeros do not prove no review occurred. Record only genuinely known society IDs, no fabricated unknown partner. Existing home-defense readiness counts some unavailable militia: later rally/unload actual fighters rather than spawn new armies.

## Boundaries and evidence

Codex currently owns a sailing rig/wind/boatPractice/haulage batch and pending clearing/goat/identity integration. Prefer new orchestration modules and minimal hooks; do not rewrite boats.ts, haulage.ts, boatPractice.ts, physics, food or livestock without coordinating. Do not consume external APIs or upload local private village exports. Historical save numbers above are diagnostic context; add reproducible authored/native fixtures on public code.

Use one isolated worktree/cloud checkout; no edits to canonical dirty files, no main push/merge, no deployment/live-game control, no resetting saves or giant screenshot archives. Old/new strict saves, interruption/death/capture/partial transfers and material/provision conservation must work. No hidden-resource targeting, invented hulls, instantaneous shore escape or free clan growth. At least one short executed physical native-terrain sea departure→discovery/contact→dock/cache return before claiming delivery; no long whole-season playthrough for source diagnosis. Test/typecheck/build as appropriate, push only your branch and return base/commit, changed files, exact evidence, assumptions and remaining gaps. Frozen34/98 overall remains unchanged without complete-gate published acceptance.
