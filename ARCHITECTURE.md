# Architecture and execution contract

Keep Game as the simulation facade and WorldView as renderer. Engine owns input, fixed-step scheduling, persistence, music and lifecycle; React consumes snapshots and calls commands. Do not couple React state to per-frame simulation or put Three objects in saves.

Current: src/game/{sim,types,constants,worldgen,rng,save,engine,audio}.ts; src/scene/{world,meshes}.ts; src/ui/{GameApp,Hud}.tsx. Add focused modules input.ts, navigation.ts, music.ts, persistence.ts only at exercised seams. Future system extracts: game/systems/{economy,construction,combat,wildlife,technology}.ts, game/ai/{director,economy,military}.ts, game/data/{units,buildings,technologies}.ts, scene/assets.ts. constants.ts re-exports stable IDs while extracted consumers migrate.

Command boundary: select ids; issue move/attack/gather/build/research; simulation validates ownership, life, visibility, terrain, cost. Presentation never changes balances. Rendering gets stable entity IDs, interpolated transforms and event records. Save IDs are unique across entities/nodes; reference restoration resolves after arrays are built. Explicit versions on save envelope. DTOs exclude DOM, Three, callbacks and selection pointers.

Simulation ticks 30Hz, capped catch-up (max 3 ticks per rendered frame after 100ms delta cap), rendering independent. Existing speed/night scaling stays within the step until timing migration is tested. Serialize all gameplay timers; replay determinism later replaces every simulation Math.random with persisted RNG. Browser audio follows real elapsed time, never accelerated simulation time.

Testing: scripts/game-tests.ts against pure simulation/persistence/navigation; test fixtures use deterministic map seed and explicit placements. Include cost conservation, blocked route, reference rebinding, corruption rejection and order lifecycle. Browser tests additionally prove screen focus, real keyboard events and audio decoding. Production preview must match development.

Read ASTRA_BACKLOG.md and one relevant spec per task. Before changes read targeted methods, not all source. Mark actual tests and remaining limitations in DEVELOPMENT_STATUS.md; never mark visual/behavioral criteria complete from code inspection. Keep tasks small, preserve working systems and avoid unrelated dependency upgrades.
