# W4 copper ore chain — source qualification

Branch work/copper-metallurgy-chain-2026-11-12, base947fb5a. Source only; no built/published gate claim.

## Model

tribe.copper remains usable copper. Existing stock, untagged loaded carryType copper and already paid jobs retain exact meaning/quantity. Fresh player society0 gets optional copperMetallurgyVersion1: only new copper extraction goes into existing optional itemCargo.copperOre, with actual deposit depletion equal to extracted quantity and bounded body load. Old villages can choose Adopt ore smelting in normal Knowledge after completing a kiln; this changes future extraction only. Rivals deliberately retain legacy economics until their own adoption/scheduler; this milestone does not claim complete NPC metallurgy.

Finite delivered8ore+2charcoal reserves an ordinary kiln production batch,90base hands-on seconds,4usable-copper output. These are explicit game units/tuning, not historical assays, weights or durations. The returned copperMetal packet becomes tribe.copper only at actual reached-cache completion, never a duplicate cached item. Paid inputs, project ownership, manual pause/resume, losses and physical return reuse existing production. Existing copper prototype and subsequent tool recipes consume usable metal; no age1 forge is needed for first smelting. Production controls automatically show the kiln recipe; Knowledge shows actual ore, transit, usable stock and successful delivered practice. Other metals remain open.

## Historical constraint

Historic England, Archaeometallurgy Guidelines, section4.2 supports distinguishing ore from metal and charcoal-fuelled reduction of copper oxides/carbonates with air supply. https://historicengland.org.uk/images-books/publications/archaeometallurgy-guidelines-best-practice/heag003-archaeometallurgy-guidelines/ . The kiln/work abstraction here does not model furnace atmosphere, ore mineralogy or historic yield.

## Executed validation

3/3 focused tests passed on Node24, terminal63062; total39470.254625ms. Native case29515.528167ms: generated seed42/V18 deposits physically mined and depleted, ore returned with usableCu0, two paid charcoal smelts delivered8usableCu, original paid batch manual pause+strict reload, paid copper prototype consumed8Cu, same maker walked to a field and sowed in the next ordinary spring with actual tool wear. No heightmap change. Declared fixture opening includes completed legally placed hearth/kiln/workshop, finite charcoal4, wood200/stone200, provisions20000 and water1000. No authored ore/usable copper/technique or terrain flattening. Charcoal production was separately published and is not re-claimed here.

Normal Knowledge adoption preserves old metal7+loaded3 and physically returns10 once. Invalid version/cargo reject strict saves. Blocked admission conserves inputs and IDs; this is an explicit interactionSpot seam test, not native encirclement acceptance. Native useful tool factor and actual wear are checked; no historical yield/campaign/FPS/fullW4 claim.

Compiler terminal86230 PASS. Command: Node24 --experimental-strip-types --import ./scripts/game-loader.mjs --test --test-concurrency=1 scripts/copper-metallurgy-chain.test.mjs . Optional COPPER_METALLURGY_NATIVE_SAVE exports its actual final passing earned state to an absolute path.

Root review fixture: /tmp/hearthwild-copper-metallurgy-earned.json, actor6224,2successful smelts/8useful metal units, copperTools condition0.9995555555555555 after actual sowing; cached ore5, usableCu0 because prototype consumed8. Time1824.12. No screenshots retained.

## Remaining

Tin/bronze/iron refining, material-specific weapon ownership/durability, full NPC adoption, furnace/casting detail and larger smelting throughput remain W4. Root owns whole-branch merge, related regressions and one built earned-state UI/save qualification.
