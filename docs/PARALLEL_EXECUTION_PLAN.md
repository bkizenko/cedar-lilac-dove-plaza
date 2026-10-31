# Parallel execution proposal — 2026-10-31

The goal remains all eight workstreams, the human-development catalogue and original backlog. This proposal organizes that scope; it does not replace it or mark it complete. Run at most three worker agents alongside one integrator on this host. More simultaneous builds/browsers will compete with the game on an8GBMacBook Air.

## Roles and ownership

| Role | Deliverable | Owned surfaces |
| --- | --- | --- |
| Integrator / architecture | Shared contracts, save migrations, simulation dispatch, integration, publish and push | `sim.ts`, `types.ts`, `engine.ts`, persistence/save schema, shared constants; sole writer while workers run |
| Geography / ecology | Watersheds, varied landforms, dry vegetation/building checks, walkable mountains, biome resources, seed metrics | `landforms.ts`, `geography.ts`, dedicated terrain/ecology modules and generator tests; generator entry changes proposed to integrator |
| Economy / survival | First-winter loop, food/water/wood balance, labor allocation, farming, tools, fatigue, seasonal needs | Pantry/cultivation/fishing/production modules and focused tests; no direct shared-sim edits |
| Rival strategy / politics | Personality-weighted feasible plans, real resource competition, development, leadership, rise/fall and diplomacy | Rival strategy/development/communities modules and scenario tests; relationship/schema proposals to integrator |
| Warfare / captivity | Cohesive raids, guards, walls/gates/siege, looting, physical prisoners/tribute/revolt | Combat/raider/captivity/peace modules and scenarios |
| Transport / husbandry | Working boats/ports/cargo routes, pack/draft animals, herding and animal products | Water/boat/caravan/haulage/husbandry modules and end-to-end delivery scenarios |
| Discovery / culture | Practical discoveries, production adoption, era moments, physical artifacts/monuments, victory metrics | Discovery/culture/artifact modules; economy remains physical, scores summarize achievement |
| Cities / administration | Multi-settlement supply, expanding stores/housing, households, civil delegation and infrastructure | City/admin/settlement-network modules after shared contract approval |
| Interface / interaction | Larger readable controls, concise actions, selected-object orders, keyboard access and test tools | React UI/CSS; renderer/input changes coordinated with integrator |
| Art / audio / performance | Distinct handmade cultural/age/wealth silhouettes, lighting, calm evolving music, bounded render cost | Scene models/materials/audio modules, licensed assets and `THIRD_PARTY_ASSETS.md`; avoid overlapping UI/terrain work |
| Playthrough / balance | Seeded survival/rival/raid/trade/lifecycle scenarios, frame/simulation budgets, actual rendered acceptance | Scenario scripts, metrics reports; reports issues rather than rewriting another agent's module |

## First wave

1. Geography worker: terrain generation and dry placement, with seed-quality metrics.
2. Interface worker: test flow, age readability, compact controls. Current test/restart corrections must be integrated first.
3. Rival strategy worker: build on `rivalOperations.ts`, finish development/operations/lifecycle incentives with physical constraints.
4. Integrator handles shared contracts, resolves imports, checks saves, runs one combined build and publishes.

Next waves pair economy with transport/husbandry and warfare, then discoveries/culture/cities. Art/performance and playthrough checks accompany each functional wave through non-overlapping assignments. A role is not necessarily a separate permanently running agent.

## Contract before parallel writes

- Define input/output types and ownership before assigning tasks; send required shared-file changes to the integrator.
- Preserve saves and existing working job executors. One decision layer selects/reserves jobs; multiple schedulers must not claim the same worker/materials.
- Each module has named tuning rules plus measurable outcomes, not only one magic pass/fail metric. Example: raid utility separates known target value, distance, observed resistance, squad strength, guards and personality; survival reports food gained versus consumed, travel/rest and blocked work.
- Do not give rivals free resources or omniscient inventories to make a scenario pass. Knowledge comes through actual contact/survey/trade.
- Each batch updates FUTURE_IMPLEMENTATION.md and REMAINING_FEATURES.md with narrow proven completion and remaining acceptance. Use focused checks; run whole release gates once after integration.
- Do not launch this proposed worker team until requested. Existing user approval for routine code work is sufficient; no new routine permission prompts.
