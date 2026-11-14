# Codex logic queue — 14 November 2026

Latest Boris assignment governs. Claude is PM/architect. Work stays on
`codex/logic-reliability-20261114`. Boris explicitly authorized merging this
branch into main on 14 November; that supersedes the earlier integration hold.
Publication remains separate from a GitHub merge, and the reserved-file list
still applies. Source tests do not earn live acceptance: 37/98 remains frozen.

Never edit `encounters.ts`, `ContactActions.tsx`, `engine.ts`,
`buildingFamilies.ts`, `civBuildings.ts`, or `src/ui/hearth/`. No visual changes,
grass/tree appearance, trade or livestock/transport implementation. Village
systems stay unassigned until split. Do not redo previously delivered systems.

| Assignment | Current verified source | Concrete remaining work |
|---|---|---|
| #2 Save reliability | e1d8d784 preserves occupied unreadable checkpoints; recovery/compaction/worker tests pass | Historic fixture coverage is incomplete; retain primary/backup/protected byte conservation for later schema additions. |
| #9 Simulation correctness | e1d8d784 refuses invalid actor reservations and keeps paid resume claims | Persist versioned simulation RNG and exact command/selection/tick replay; current terrain seeds, pure validation and Worker sequencing are not replay. Engine journal hooks are reserved to Claude for now. |
| #6 Physical inventory | 42f48822 gives newly equipped actual water jars unique persisted custody through real collection, wear, handover and reload | General cached/manufactured container identity, maker, tare, seal, contents and all custody consumers remain open; coordinate any trade-facing contract with Claude. |
| #7 Equipment | e1d8d784 fixes exact reached-cache admission; existing padded-armor repair/custody tests pass | Reconcile broader armor condition/combat acceptance; hide armor, shields and helmets require actual supported inputs and their own conservation tests. No rendered equipment work. |
| #4 Production chains | Prepared-food return fix e1d8d784; existing native pottery chain passes with identified jars | Tin/bronze alloy chains remain absent; audit copper/iron and unfinished recipes before extending. No fake inputs or unused recipe stubs. |
| #5 Food systems | e1d8d784 ages paused/returning meals once, preserving legacy grace; existing preservation/brewing clocks pass | Dedicated/fruit brewing and other catalogue remainders require finite ingredients and real labor; existing grain brewing is already delivered and must not be restarted. |
| #10 Progression | Existing eight-component prestige formula and paid building-fabric hooks are present | Audit their current concrete remaining acceptance; rival victory/goals and broader trade/AI outcomes are not completion credit for the formula alone. No trade implementation. |
| #3 Knowledge/practice | Existing paid observation, production receipts, records and provenance are present; validation purity passes | Reconcile remaining teaching/adoption/institution coverage against actual delivered receipts; do not substitute a science-points queue or restart delivered method-record work. |
| #12 Performance/settings | Existing explicit/Auto graphics preference tests pass; 42f48822 profile measured natural-opening/declared-80 p95 step CPU 39.08/49.15 ms, zero errors, same terrain; docs/metrics/codex-logic-profile-2026-11-14.json | Follow sampled exact/local water queries, pathfinding and geographic-influence hot paths; optimization requires separate scope. Graphics appearance, renderer changes and the experimental Worker are excluded. No built FPS or real-player-village claim. |

Compiler blocker: the full tree reports the same TS1261/TS2693 on unchanged base
and this branch, caused by `OldSaveNote.tsx`/`oldSaveNote.ts` extensionless import
resolution in Claude-reserved Hearth. Do not bypass checks or edit reserved files.
