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

## Narrow burden and ore-death follow-up

The original smelt project now supplies its carrying/unloading input burden and returning metal burden through a WeakMap view; no second itemCargo is created. Paused work reads resumePhase. Successful ownership admission alone binds; an actual saved project is preferred over a tentative unload clone. Strict restore rebinds immediately without stock/reservation mutation. Field/finished/stored/lost work and former actors have no packet burden. Boat load already consumes the same body-load query.

Ordinary mined itemCargo copperOre can fall as the exact actual death-site parcel, retaining original owner/cap/strict provenance and physical pickup/cache delivery. Optional actual itemCargo copperMetal deposits once to usableCu. No trade selection/pricing added. Internal paid-production packet death still follows existing paid-batch loss accounting; this does not invent recoverable items for a destroyed smelt project.

Final focused whole run49115 passed5/5 in44769.7255ms (same original3 plus2new tests; no duplicate credit). It refreshed /tmp/hearthwild-copper-metallurgy-earned.json under burden mechanics. A later source-review correction binds only the canonical state project when a tentative proposal exists; affected phase test43565 passed1/1 in6214.36675ms, not a sixth unique test. Includes rejected claim burden0 and original stored/cleared parcel burden0. Native ore-death case uses a structured clone of the actual first-extracted body snapshot, preserves terrain, strictly reloads the real parcel and returns the exact ore once; ore never becomes usable copper. Initial failed assertions uncovered immediate reload binding and an aliased harness snapshot, both corrected. Compiler result handed to root separately. No child build/browser/publish claim.
