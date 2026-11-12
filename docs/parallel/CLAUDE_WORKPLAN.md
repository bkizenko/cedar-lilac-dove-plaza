# Claude workplan: lanes, cadence, allocation

**BLUF:** Four scheduled sessions per hour, each owning one lane, so they never edit the same files and every run ends with a push and a status line. Boris does not babysit. Work is chosen from AUTOPILOT first, then from this file's backlog; when both are empty, audit and add rows.

## Cadence (America/New_York)
| Minute | Lane | Owns |
|---|---|---|
| :10 | A. Systems | src/game/ rulers, kinship, expansion, diplomacy, succession, international; tests |
| :25 | B. Experience UI | src/ui/ panels and the UI/UX variant (theme switch; old UI archived, never deleted) |
| :40 | C. Visuals | src/scene/ civ buildings, people (armor, headwear, banners, insignia), wonders, vegetation; render checks |
| :55 | D. Integrator | merge hygiene, tsc diff, full focused test sweep, conflicts with Codex/Grok, board status roll-up, AUTOPILOT audit, bottleneck fixes |

Each run: ~20 minutes of work, always ends with a normal merge to integration/2026-11-11, one status line on the board (integration and main), and the AUTOPILOT row updated.

## Rules
- Normal merges only; full-refspec fetch first; never rebase or force-push.
- Old saves load; behind switches when unsure; no invented free goods, teleporting, shrunk collision or flattened terrain.
- Old visuals and UI are archived and switchable, never deleted.
- Do not take Grok's World core wiring or Codex's economy/knowledge work. Blocked more than 15 minutes: skip, log it, move on.

## Backlog (in order within each lane)
**A Systems:** handover card data on succession; fosterage and hostage commands (same path as marry-houses); NPC marriages and alliances via marryHouses; expansion parties (colonist, explorer, raid, trade venture) driven by expansionOf modes with real units, supplies and travel (no teleporting); casus belli and claims wired to unrest; per-era machinery gating; save round-trip and validator tests; long-run stylized-facts test.
**B Experience UI:** handover card; fame feed; factions strip; glory bars polish; diplomacy sheet; LeaderPortrait beside LeaderConversation; capitulation terms picker, captive panel, trade dialog; a coherent theme variant (palette, type scale, spacing, hierarchy) behind a setting, old theme kept.
**C Visuals:** people armor, headwear, banners, insignia; unique wonders; vegetation and village shots; less blocky Mekhari and Sandrill; Tigrane vault; Option H adapter; hearth lighting; render harness shots after each change.
**D Integrator:** T4 rivers/trails, T5 building yaw and fish recovery panel, T7 CarvedBuildingLayer eviction, T8, T9 contracts; tsc baseline diff; full-suite notes for Codex's native run.
