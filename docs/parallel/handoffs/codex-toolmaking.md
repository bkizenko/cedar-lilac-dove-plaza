# Toolmaking specialization — narrow W4 slice

Source branch: work/toolmaking-specialization-2026-11-12, based on main34dad7e. Not published; QA-037 remains partial.

## Behavior

Only productive farm-tool crafting/repair at an actual admitted bench earns toolmaking wall seconds. The final work slice is clipped to remaining paid work. Existing generic craftingXP is retained; other crafting never invents toolmaking experience. A successful owned-tool or repair completion is required before the personal family bonus applies. Bonus grows to20% over1200productive seconds, bounded by TOOLMAKING_PRACTICE_RULES. Tool output and repair counts are separate and capped. Existing Aptitudes & practice displays the measured history.

## Saves

Optional Unit.craftingPractice.toolmaking is strictly validated: finite nonnegative workSeconds<=36000, integer completion counts<=1000000, no unknown family/entry keys. Absent old-save history remains absent; genericXP is neither reset nor converted. Completion is recorded only in the synchronous actual farm-tool output assignment; reconciliation/load never grants a receipt. Skill remains on the maker, not a transferable tool.

## Validation

4/4 focused cases passed, including a native unchanged seed42/V18 legal workshop, actual paid stone-hoe work, pause/in-flight strict reload, same maker completion, paid repair and a second strict reload without receipt replay. Opening workshop/stocks are declared; no claim of earned workshop construction. Queue/travel/pause/cancel and tiny final slices checked separately.

Command: /Users/boriskizenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types --import ./scripts/game-loader.mjs --test --test-concurrency=1 scripts/toolmaking-specialization.test.mjs

Compiler: terminal failed only at unchanged main src/scene/biomeVegetation.ts159 and src/scene/painterGround.ts39. Those files diff identically against origin/main93ce91f. No changed-file diagnostics. No build/browser or release gate credit. Root must merge normally and qualify publication.

## Remaining

Weapon/metal/hull work-family histories, broader vocational adoption and their UI qualification remain open. No extra art/World changes.
