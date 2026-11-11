# Hearthwild completion plan (architect: Claude; PM: Grok; integrator: Codex)

## BLUF
The code mostly exists on branches; the game is not finished because (1) the sim is too slow (~60 ms/step, p95 ~96 ms), (2) finished work is not merged or visible in the live game, and (3) almost nothing is verified on native terrain or in a real renderer. Order: make it fast, merge behind switches, look at the real game, then fill the remaining systems in parallel lanes. Frozen acceptance stays 34/98 until native/built evidence says otherwise.

## Principles
- One owner per shared file (sim.ts, types.ts, persistence.ts, save.ts, world.ts). New behavior goes in new modules plus one wiring line, behind a switch.
- Normal merges only (no rebase or force-push of pushed work). Never merge a partial branch; a branch lands whole.
- Optional save fields with validators; old saves must load.
- A feature counts only after native-terrain (or built-UI) evidence. Fixture tests are necessary, not sufficient.
- Finite goods, physical work/travel, observed knowledge, no teleporting. 8 GB Mac budget: render only what is near; LOD/impostors; instancing.
- Boris reviews renders before any PNG is pushed.

## Lanes
| Lane | Owner | Scope |
|---|---|---|
| Platform | Codex | sim speed, worker/off-thread sim, saves, release, merges |
| Economy | Codex | livestock, crafting, prestige, food, production, knowledge/tech redesign |
| World | Grok | terrain, navigation/flow-field pathfinding, placement, civil engineering, deep-water, tides |
| Societies | Claude | trade networks, diplomacy, alliances, raiders, conquest/puppet/tribute, captives, siege/naval, storms |
| Experience | Claude | natural biome terrain, 14 civ architectures, people/armor/insignia, wonders (unique per game, presets), UI, audio, game feel |
| PM | Grok | status, check-ins, board, backlog hygiene |

## Phases (ordered; no durations)
1. **Speed.** Codex: profile and cut hot paths (indexed water, per-step clones), sim in a Web Worker, measurable frame/step budget (p95 <33 ms Low profile at 100 residents). Gate: numbers on a real run.
2. **Integrate behind switches.** Codex merges agents/claude-societies (whole), agents/claude-experience and agents/grok-world with normal merges, wiring hooks listed on the board; each new system gets a game option (e.g. eraMode, render style, civ architecture).
3. **See the real game.** Claude desktop linked: install deps, run dev server, screenshot in real three.js; tune lighting/materials against the concept art; Boris reviews.
4. **Systems fill (parallel).** Codex: knowledge/tech redesign (visible provenance: observed/taught/traded/captured; known/partly/unknown), livestock/horses/cheese, crafting. Grok: pathfinding, water routes, territory/influence while dominated. Claude: raider camps settling, siege, puppet escalation, captive revolt, armed caravans, market-driven trade frequency, deep-water storms, leader conversations/diplomacy UI.
5. **Visual overhaul.** Wire biomeTerrain, civBuildings/civShowcase, civPeople, wonderKit; baked AO, haze/fog, bloom, grade; Blender only for hero assets (wonders, ships, portraits) and baked detail; per-civ review against concept art.
6. **Scale.** Hundreds of residents, multiple villages, larger maps: residency bands, LOD, BatchedMesh per chunk, per-chunk sim activity; measure on 8 GB.
7. **Acceptance.** Re-run frozen checklist on native/built evidence; Codex reconciles canonical backlog and COMPLETION_LOG.

## Verification rule per item
Source test -> native-terrain test -> built UI check -> perf check -> backlog state change by Codex only.

## Open decisions for Boris
- eraMode default (fixed vs morph). Claude recommends fixed.
- Which Codex backlog items move to Claude workers (knowledge/tech first).
