# Astra planning handoff — user priorities, 2026-10-31

This supplements the conversation and repository plans; it is not a verbatim transcript. A fresh chat does not automatically inherit the original conversation. Prefer a fork retaining its history, and use these files as durable context. Long conversation history can still be summarized by the model.

## Latest direction: incentives first, creative agents

The user's highest planning priority is the incentive structure: make survival, settlement development, trade, competition, institutions, diplomacy and progression emerge from coherent motivations and constraints. Do not begin with another catalogue of isolated features.

Give domain agents broad creative freedom to challenge existing assumptions, propose original mechanics and replace weak designs. Existing plans and numerical rules are evidence and proposals, not creative boundaries. Do not force every agent into one predetermined solution. Ask them to explain the player choices, incentives, consequences and interactions their proposals create, then reconcile their proposals into one game.

Keep coordination requirements light: shared interfaces and file ownership prevent conflicting edits. Preserve the user's saved society, verify claims against actual gameplay and honor the target hardware. These are delivery requirements, not restrictions on creative design. This planning task does not itself authorize launching a large worker team or implementing speculative systems.

## What the player wants the game to become

- Original real-time survival/civilization builder: Dawn of Man's survival and physical work, Age of Empires' responsive command/combat feel, Civilization's exploration, historical moments, diplomacy and societal progression.
- Difficult but rewarding survival opening, adjustable by difficulty: hunting, gathering, water, shelter, fuel, clothing, winter and scarce resources. Manual control with optional persistent assignments; later delegate growing administrative work.
- Progression beyond a self-running farm simulator: seasons, scarcity, exploration and rivals create changing decisions; competition should emerge from needs/opportunities, rather than scripted universal aggression or free AI gifts.
- Individuals/households/leaders/societies have blended motives. Leaders and societies change over time; different contact histories, material cultures and geography matter. Trade, defense, expansion, practical discovery, prestige, legitimacy and religion should interact. Avoid deterministic real-world cultural stereotypes.
- Physical economy: production, hauling, cargo, finite supplies, storage, tools, boats, pack/draft animals and husbandry. No generic gold/science/production points as a substitute. The player does like bounded historical achievements, era score, overall score, cultural artifacts/monuments and multiple victory paths.
- Robust work orchestration, exploration, hauling/unloading, construction, direct orders and local defense are essential. Do not add deep systems on top of unreliable commands or repeated starvation/idle traps.
- Territory has a controlled core and fading outer sphere. Known intrusions and competition create remembered grievances; responses depend on personality, relations, needs and military feasibility. Include diplomacy, trade, raiding/looting, walls, captives, tribute and meaningful peace.
- Rival villages must become strong, build/use varied facilities, develop cultures and trade networks, grow/expand/split/collapse/refound. Natural collapse must not itself end the game.
- Depth between Civilization VII and Hearts of Iron IV, expressed through clear RTS controls and later delegation, not an unreadable UI.
- Long campaign ambition: survive locally, develop cities/states, continue into larger regions/world maps after victories, eventually space settlement. Treat first complete release and later expansions explicitly; retain the larger ambition in the architecture.

## Visual/world direction

- Coherent detailed stylized blocky3D that runs on an M1 MacBook Air with8GBRAM. Clear building functions, handmade variation, cultural/age/wealth-dependent silhouettes, visible work and carried goods. Main city preference: sandstone/plaster/terracotta/courtyards with elegant blended ornament; avoid arbitrary stacked roofs everywhere.
- Bigger text, fewer words, clear action verbs, contextual panels, keyboard play, minimal testing/startup clicks. Preserve welcome design for later; currently iteration bypasses it.
- Calm instrumental music, appropriate seasonal/age variation; no intrusive vocals/electronic feel.
- Geography should be inspired by the real world: Dolomites, Victoria Falls, Arizona, Sahara, Zhangjiajie; landscape light/composition from Albert Bierstadt and Thomas Cole. More than circles/islands with flat interiors and isolated spikes: coherent foothills, mountain ranges, passes, valleys, plateaus, lakes, rivers, waterfalls, bays/coves, varied coasts and biome resources. Smaller islands also need meaningful relief. Some low islands are appropriate; universal flatness is not.
- Each domain planning agent should study relevant primary academic work and strong genre precedents, identify uncertainty and translate evidence into playable systems. Research should resolve design choices, not become a substitute for delivery.

## Read these authoritative starting points

- `FUTURE_IMPLEMENTATION.md`: delivered batch checkpoints and explicit limitations.
- `REMAINING_FEATURES.md`: consolidated backlog and newest accepted requests.
- `HUMAN_DEVELOPMENT_CATALOGUE.md`:120-item catalogue, including optional requests.
- Repository-root `ASTRA_BACKLOG.md`: original25 tasks.
- `AI_INCENTIVES.md`: original audit snapshot plus subsequent territorial/operation corrections; distinguish dated audit rules from current code.
- `REFERENCE_GAME_AUDIT.md`: interview answers and primary-source research.
- `PARALLEL_EXECUTION_PLAN.md`: proposed roles/ownership, revise as needed.
- `VISUAL_DIRECTION.md`: reference images and original art/UI proposal from a parallel agent; not implemented art.
- Older `ART_DIRECTION.md`, `REWORK_DIRECTION.md` and other design documents when present. Reconcile rather than silently discard requests or count headings as completed work.

## Current checkpoint

Last game batch at this handoff: `692b03d`, pushed to origin/main and published at http://127.0.0.1:8086/. It includes version8 varied landforms/continuous relief/flood-safe new roots and foundations, random-layout save/load correction and evidence-based recovery of affected version7 maps, rigid-building render footings and larger-grid palette smoothing. Focused tests/build/typecheck pass; on-screen acceptance is still unverified. The full game remains unfinished. Do not treat this checkpoint as proof of all terrain, climbing, ecology, UI or save scenarios.

Existing rivals use local programmed simulation AI, not language-model calls. `rivalOperations.ts` exposes target benefit/risk/travel/guard metrics and dispatches real armed adults; it is not a complete society planner. Major work remains in all eight workstreams. Most new systems should reuse or improve physical job executors; rewrites require evidence of benefit, not blanket prohibition.

## Requested planning output

One executable master plan: actual-state audit, core loops/progression, incentive architecture, feature coverage matrix, system dependencies/contracts, creative agent assignments with non-overlapping implementation ownership, measurable scenario-based improvement loop, prioritized end-to-end playable milestones, performance/save requirements, first-release acceptance and expansion roadmap. Include a self-contained execution prompt.

Planning only: inspect and research first; do not reset the village, implement features, deploy/push game changes or launch additional agents. Use Astra Medium initially; reserve higher effort for specific unresolved decisions. After review, implementation can proceed in coordinated batches using a suitable faster model.
