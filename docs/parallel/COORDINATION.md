# Hearthwild: cross-provider work coordination

Published gameplay baseline: e695e85 (paid armor, goat-search interruption fix, staffed beam ram). Read latest origin/main before starting; later accepted batches may already be present. The full goal and frozen hearthwild-first-release-gates-v1 checklist remain in force:34/98 verified, not a percentage of lines written.

Latest user correction: Codex retains livestock/wool/dairy and complex prestige. See WHOLE_GAME_WORKSPLIT.md for the entire game allocation. Old external livestock/prestige briefs are superseded.

## Ownership

| Owner | Task brief | Branch | First deliverable |
|---|---|---|---|
| Codex integrator | Existing master plan and active batches | main | Release combined automatic clearing, persistent goat searches and identity; continue sailing and integration |
| Claude Code | CLAUDE_SOCIETIES.md | agents/claude-societies | Actual NPC docked-hull sea exploration, then the broader international track |
| Grok Build | GROK_SIMPLE_TASKS.md | agents/grok-simple | Short truthful building help and primary-reference catalogue; no simulation/prestige |

Use an isolated branch/worktree or cloud checkout. Never use the dirty canonical worktree as an external agent's scratch directory. Do not merge or push to main, change play-server symlinks, refresh the user's running village, restore/delete saves, or include unrelated held edits. Commit only owned changes and push your branch, then return commit/PR, exact files, executed tests and limitations. Codex reviews and integrates. No new accounts, API keys, paid requests or downloaded asset packages are required by these briefs.

Shared hubs (sim.ts, types.ts, persistence.ts, production.ts, Hud.tsx) require small explicit integration hunks. Prefer new focused modules and add only necessary hooks; do not rewrite entire hubs or unrelated formatting. Source current main may advance while you work; report your base commit and conflicts rather than force-pushing over another owner. Consult AGENTS.project.md and the master plan. Broad art overhaul remains proposals only. A functional new sheep silhouette is permitted for species readability; do not restyle the world.

One heavy build/browser/simulation at a time on the8GB Mac; cloud source work can proceed independently. Use short code-first scenarios and preserve finite goods, real travel/work, saved ownership, lost/dead actors and old saves. Pure helper checks alone do not establish full gameplay. Screenshots are temporary unless the user explicitly keeps concept references. Do not silently change the98-gate denominator or credit it from component tests.

## Reporting

Write a compact result on your branch: base+commit, actual behavior, test commands/results, native/controlled assumptions, remaining gaps and any required follow-up. Put cross-owner questions in that result or your PR. Codex can fetch branches/PRs and integrate them; direct live chat orchestration requires separately installed and authenticated provider tools. These files do not mean external agents are already running.

## Current queued batch boundary

Automatic site preparation, remembered-habitat goat-search queues and community identity are in a separate qualified source candidate. Do not reimplement or overwrite them. Goat searches are not guaranteed if no living reachable animals exist. Historical rates are adjustable game units until calibrated; do not claim kilograms/acre or empirical protection from arbitrary constants.
