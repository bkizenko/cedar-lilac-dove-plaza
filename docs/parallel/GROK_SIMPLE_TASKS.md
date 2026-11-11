# Grok: simple building text and reference catalogue only

Repository: https://github.com/bkizenko/cedar-lilac-dove-plaza . Branch: agents/grok-simple. Read COORDINATION.md and WHOLE_GAME_WORKSPLIT.md. This replaces the earlier prestige assignment. Prestige, simulation and balance are NOT your assignment.

## Task1: concise truthful building help

Inspect existing building definitions/help and actual recipes/functions. Create an audit table covering the building catalogue: internal type, displayed name, actual current function, short help text, source of that fact, and implemented/partial/planned status. For existing help surfaces only, improve descriptions to roughly6–12 words, focused on what the building actually does. Longer optional tooltip details may list actual inputs/output or efficiency. Don't promise animal species, workers, yields, armor or bonuses merely from concept art or a building name. First batch20 clearly defined buildings; then continue catalogue groups after review.

Allowed implementation surface: the existing help-text/catalogue module and small text-only fixtures. No game rates/prices/recipes, timers, job selection, saves, map generation, combat, prestige, UI layout rewrite or dependency changes. Do not alter tests to conceal simulation failures. If a description requires an unknown behavior, mark partial and leave a specific question rather than inventing an effect.

## Task2: real architecture references, documentation only

For those20 buildings, find primary museum/archaeology/heritage references with actual structure/photo, date/region, materials and one functional construction observation. Record exact URLs and image reuse/license information if explicitly published; otherwise say redistribution permission unverified. Do not download/import protected game assets or new texture packages. Do not claim a modern reconstruction is an original ancient structure. Original generated culture families may combine evidenced techniques; do not label every culture as a real modern nationality. Preserve H/E approved references.

Use your separate branch; do not edit canonical dirty files, push/merge main, deploy or touch player villages. Keep temporary screenshots out of the repository. Run a relevant text/helper check and typecheck if source changes; no need for a heavy game build just for a documentation table. Push your branch and report exact changed files,20-row coverage, evidence and uncertainties. Further task groups require the same scope; do not start prestige or broad mechanics.
