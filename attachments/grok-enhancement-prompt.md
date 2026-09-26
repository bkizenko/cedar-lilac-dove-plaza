# Dawn of Empire — Enhancement Directive for Grok

## BLUF
Upgrade the existing engine in two tracks — visual (post-processing pass) and systems (decision depth, AI opponents, branching progression) — without rewriting the working core (`sim.ts`, `engine.ts`, `meshes.ts`, `world.ts`, `constants.ts`). Every addition below is scoped against what's already implemented; do not duplicate existing systems (minimap, day/night, fog, save system, single AI opponent, 6-age progression already exist and work).

---

## Design philosophy this is built on
Real-time strategy games hold attention through decision density, not spectacle: the constant tension between managing the economy and reacting to combat is the core loop, and it's what separates a strategy game from a diorama. Two specific, evidence-backed patterns to apply:

1. **Forced either/or choices create the most memorable early-game tension.** Not "spend more, get more" — actual mutual exclusivity where picking one option forecloses another for a meaningful stretch of play.
2. **Automate the boring part, keep the interesting part manual.** Hauling/logistics should be automatic; what to build, who to fight, which bonus to take should not be.
3. **Asymmetry doesn't require new systems — it requires different numbers on a shared system.** A faction needs one signature unit and 2-3 modified stats, not a parallel tech tree.
4. **AI opponents should shift strategy over time on a script, not react unit-by-unit.** Development/defense early, aggression later, driven by the existing `tech` stat.

---

## TRACK 1 — Visual (do this first, highest visible payoff per unit of work)

1. Add `EffectComposer` + `UnrealBloomPass` to `world.ts`'s render pipeline. Tune threshold/strength so the sun disc, campfire (`hearth` PointLight, already at `#ff8a38`), and torches actually bloom — right now they're just bright pixels, not glowing light sources.
2. Add a subtle vignette + very light film grain as a final composite pass. Keep both subtle — this should read as "cinematic," not "Instagram filter."
3. Add 3-4 additive-blended, alpha-gradient planes angled from the sun direction through the tree line as cheap volumetric god-rays. Reuse the existing `sun` DirectionalLight's angle so they track the day/night cycle already implemented.
4. Instance the existing `grassGeo()` densely with a simple vertex-shader wind sway (sine offset by world position + time uniform). This is the single biggest lever for selling the "misty valley" read the reference image has.
5. If the river/water is currently static, add a scrolling normal map + fresnel edge shader.
6. Do NOT attempt photorealistic character models, skin shaders, or fur — that's out of scope for a real-time WebGL renderer. Stay in the stylized-diorama lane; push it as far as bloom + fog + lighting craft will take it, not toward photorealism.

## TRACK 2 — Systems depth (do this after Track 1)

### A. Branching age-up choices
Currently `AGE_COST` is a flat resource gate — advancing just costs more each age. Add a forced choice at each age transition: two mutually exclusive bonuses, player picks one, the other is unavailable for that playthrough. Example axis: an economy bonus (e.g., +15% gather rate) vs. a military/defense bonus (e.g., +15% unit HP or a free watchtower). Store the choice per-age in save data (extend `SAVE_VERSION` schema in `save.ts`).

### B. Multiple AI opponents with distinct personalities
`sim.ts` already tracks a `tech` value (0–1) per team driving AI competence. Extend this:
- Instantiate 2-3 AI teams instead of one, each with a fixed personality profile: `{ techFloor, aggression, boomWeight }`.
- Each AI should run a simple staged behavior-tree: Stage 1 (early game) = pure economy/build-order execution, ignore combat unless attacked. Stage 2 (triggered by own age level or elapsed game time) = start producing military and probing player's territory. Stage 3 (triggered by tech threshold or being ahead in age) = committed aggression, target weakest player structure.
- This must stay rule-based/scripted (finite state machine), not ML — deterministic, debuggable, and fits the existing codebase's style.

### C. Fog of war
Map is 140 units (`MAP` constant) — currently everything seems visible. Add an unexplored/remembered/visible tri-state per grid cell, darken unexplored and desaturate remembered-but-not-visible. Vision radius per unit/building already implicitly exists via combat `range` — reuse those values as sight radius with a multiplier.

### D. Weather/season consequences (hook into existing HUD data)
The HUD already displays weather ("Light Cloud") and implied season. Wire actual gameplay effects: winter/cold reduces gather rate on `food`, a storm event temporarily halts construction, a "migrating herd" event gives a temporary meat/food bonus. Use the existing `GATHER` period/carry constants as the multiplier target — don't add a parallel resource system.

### E. Idle-worker and priority UI
`BUILDINGS[type].hint` field exists in `constants.ts` but confirm whether it's rendered — if not, wire it into building tooltips in `Hud.tsx`. Add an idle-worker counter/button that cycles camera to unassigned gatherers (common in AoE-likes, currently absent).

### F. Light faction asymmetry (optional, do last)
If time allows: give the player and each AI a small named identity (already have `TEAM_NAMES`/`TEAM_COLORS`) with 2-3 modified stats and one unique unit reusing the existing `UNITS` schema — not a new system, just different numbers plus one new entry in `UNITS`.

---

## Explicit non-goals
- No rewrite of `sim.ts`'s core tick loop.
- No reinforcement-learning or ML-based AI — finite state machine / behavior tree only, per current codebase style and industry-standard practice for this genre.
- No photorealistic asset pipeline — stylized diorama is the visual ceiling for this renderer.
- No multiplayer scope creep unless already planned elsewhere in the codebase.

## Order of operations
Track 1 items 1-2 (bloom + vignette) → Track 1 items 3-5 (godrays, grass, water) → Track 2.A (branching age choices) → Track 2.B (AI personalities/staging) → Track 2.C (fog of war) → Track 2.D (weather hooks) → Track 2.E (UI polish) → Track 2.F (asymmetry, optional).
