# Cross-agent completion and request intake

This is the readable scoped overlay on FULL_GAME_BACKLOG.json. Original source IDs and the98-gate denominator are unchanged. Latest live source5f1b5e9; overall34/98 (34.69%).

## Proven completed slices

- **CODEX-SHEEP-CAPTURE — live**: Finite fresh-map sheep, paid capture/physical lead and care; broader domestication not complete
- **CODEX-WOOL-CLOTHING — live**: Finite fleece through paid textiles to owned wool coat; shears/dyes/repair and full climate balance pending
- **CODEX-SAIL-RIG — live**: Paid wind-assisted physical hull and cargo demonstration; naval combat/offshore/tacking/legacycanoemigration pending
- **CLAUDE-NPC-SEA — source-pushed-wip**: agents/claude-societies commit declares incomplete/untested
- **CLAUDE-H-SPECS — source-pushed-wip**: agents/claude-experience pure structural source; adapter and executed acceptance pending
- **CODEX-DAIRY — candidate-tested**: Isolated dairy candidate5/5 focused checks and typecheck; build/native UI pending
- **CODEX-PLATFORM-CONTRACTS — integration-testing**: Autosave-frame timing + render-style preference final frozen34 checks; built UI pending final artifact

## Additional explicit feedback retained

- **CHAT-G7-FOOD-TASTE** (C-Economy): Document tunable taste/enjoyment units and test morale/benefit versus preparation labor; treat supplied ranking as tentative, no new unsafe starvation food implied. Source: docs/parallel/chat-context/scenic-map-and-full-game.md:5654; state pending.
- **CHAT-G2-GOLDEN-HOUR** (A-Experience + C-Platform daylight): Preserve explicit time/weather exceptions and daylight behavior while reviewing warm low-angle grading. Source: docs/parallel/chat-context/keyboard-music-and-earlier-game.md:5856; state pending.
- **CHAT-G9-LAB-FLOW** (C-Platform technical UI): Track these three separate UI actions and acceptance; native lab scenario only, no private village overwrite. Source: ['docs/parallel/chat-context/keyboard-music-and-earlier-game.md:6259', 'docs/parallel/chat-context/scenic-map-and-full-game.md:3658']; state pending.
- **CHAT-G4-LEADER-PRESENTATION** (A-Experience + A-Societies): Track era availability and actual leader presentation separately from contextual dialog contents. Source: docs/parallel/chat-context/keyboard-music-and-earlier-game.md:6259; state pending.
- **CHAT-G6-CULTURAL-NAMES** (A-Societies): Culture/seed-dependent ancient-sounding names; no routine surnames in small villages; quantify repetitive stock-name collisions across seeds. Seeded saves remain reproducible. Source: docs/parallel/chat-context/keyboard-music-and-earlier-game.md; state pending-refinement-of-existing-culture-scope.
- **CHAT-G10-FOG-PROVENANCE** (W-World): Investigate reported unrequested auto-exploration; attribute fog changes to actual observers or valid received reports before deciding whether behavior is a bug. Source: docs/parallel/chat-context/scenic-map-and-full-game.md; state reported-needs-reproduction.
- **CHAT-G13-BOAT-DIMENSIONS** (C-Platform hull design + A-Experience): Player-adjustable boat dimensions within feasible class/design bounds, with real geometry and corresponding material/labor/seating/load consequences rather than cosmetic arbitrary scaling. Source: docs/parallel/chat-context/keyboard-music-and-earlier-game.md:5856; state pending.
- **CHAT-G14-DEEPWATER-PORTS** (W-World water/depth + C-Platform hulls + A-Societies): Explicit deep-water port infrastructure and depth/draft admission for larger vessels, coordinated with actual water-route and cargo infrastructure. Source: docs/parallel/chat-context/keyboard-music-and-earlier-game.md:5856; state pending-refinement-of-existing-port-scope.

## Completion protocol

Lane owners update their handoff with exact backlog IDs, owned files, source commit, executed checks/assumptions, migration impact and remaining scope. Codex updates the canonical JSON after reviewing and merging; publication is recorded separately. No provider marks another provider's work complete from a proposal or a WIP push. Broad catalogue rows remain partial while their unfinished uses remain. Golden-hour and leader presentation join Claude's design work; taste/lab actions join Codex; fog attribution and deep-water site admission join Grok. G12 is a playtest proposal, not a new user gate.
