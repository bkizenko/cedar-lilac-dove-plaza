# M2-07 information causality audit — November 2, 2026

Exact gate: **Information travels through observation/envoys/routes; unknown actions do not generate remote knowledge.** Master-plan lines93–95 require witnessed incidents; line391 permits player learning through actual observation/messages. A player controlling a person at a meeting can receive that witnessed information live. This audit does **not** invent a universal home-return delay for player observations.

## Two positive connected scenarios

`node --import ./scripts/game-loader.mjs --test --test-concurrency=1 scripts/information-causality-qualification.test.mjs`

Both cases use ordinary `Game.step`, finite initial household/merchant stores, real halls, actual carriers and controlled flat dry routes. The supplied historical terrain knowledge is an initial prior-contact endowment; no current partner report exists initially. Quiet weather/raid/birth/NPC-thinking timers isolate information causality. The authored route surface is reinstated after decode without relocating the saved carrier or altering cargo/report/progress.

1. **NPC market report:** a real resident dispatches32stone, walks to the foreign hall, exchanges locally, and carries a dated bounded needs/quote report home. Shared planner advice remains unknown throughout the outbound journey and while the report is on the body. After the carrier leaves the meeting, the test changes foreign wood/stone and adds an unobserved distant hut as deliberate causal interventions; these do not edit the carried report. Saving/decoding mid-return preserves the exact body position, cargo and report. Only physical arrival publishes it. The original observation time is retained, with a later received time; the remembered offer can legitimately be outdated on arrival. Cargo enters home stock exactly once.
2. **Player meeting:** a real delegated person travels to the hall and spends actual conversation time there. No report appears before the meeting. The witnessed account contains uncertain local population/building estimates, bounded offers and trusted stock bands rather than exact hidden inventories. Later unobserved stock changes and a distant hut do not rewrite that account or its dated quoted terms, including across a saved return journey. Live availability at the actual meeting is intentional RTS observation, not a failed return rule.

2/2 positive scenarios pass on frozen188df58. Repeated rechecks do not count as additional cases.

## Confirmed negative diagnostic: previously mapped ground reveals a new unwitnessed claim

`node --import ./scripts/game-loader.mjs scripts/diagnostics/unwitnessed-frontier-repro.mjs`

Two ordinary-step runs start with identical NPC prior knowledge of **empty terrain** at(100,0). NPC people remain near their hall(0,0), never coming within26m of that site; no NPC building lies within55m. No report or message about a new structure returns.

In the treatment, the player's hall is at(220,0). A real builder walks106.7m after a public outpost placement/build order;70logs are paid, and the post completes at31.4simulationseconds. At120seconds, NPCtrust has changed0.5→0.4381 and tension0→0.9995 despite no present witness. The control with no post remains trust0.5/tension0. Neither run has simulation errors.

Cause: `frontiers.ts` `tickFrontiers` scans current live foreign posts and checks `rivalKnows` for the terrain coordinate. `rivalKnows` accepts old mapped cells, so terrain familiarity becomes foreknowledge of a later building action. This contradicts the gate's unknown-action/witnessed-incident requirement. It is separate from legitimate live player meeting information.

Proposed correction, not implemented here: distinguish current witnesses / dated observed structures or claim incidents from explored-terrain cells. If ongoing known-claim pressure is intended after a witness leaves, retain an actual observed claim fact; simply requiring a current witness every tick would forget legitimate past observations. Audit the same historical-cell/live-entity pattern in extraction and raid planning, but do not claim those branches fail from source inspection alone.

**Do not credit the whole M2-07 gate from the two positive cases.** The negative diagnostic must be corrected and a witnessed-versus-unwitnessed regression must pass first. No runtime source files were edited for this audit.
