# Wild-craft audit: hunting, butchery, hides, food keeping, clothing, feed

**BLUF.** The base is stronger than the request implies. Armed hunting, tracking memory, boar hazard, gutting, skinning, raw-meat delivery, hide scraping, bark tannin, drying racks, smokehouse, cooking, wool and plant-fibre garments with wet and heat burden, repair, and animal feed already exist and are finite. The real gaps are: only one hunting method per unit type, no passive traps, no bleeding wounds, no trail to a dead animal, nothing from a carcass but meat, hide and bone, a three-step hide chain, no way to keep berries, no tallow, salt, hay or dogs. This lane adds those as an opt-in module (`src/game/wildCraft.ts`, `state.wildCraft`, off for every old save) and leaves Codex's economy core untouched. Salt curing, fodder and dogs stay open.

Status key: **have** = exists and is finite; **part** = exists but shallow; **new** = added by wild-craft v1; **open** = not built.

| Area | Item | Status | Where |
|---|---|---|---|
| Hunting | Bow, spear, blade, thrown stones by unit type | have | `hunting.ts` `huntingWeapon`, `HUNTING_WEAPONS` |
| Hunting | Method chosen from held tool and animal, with icon | new | `huntMethodFor`, `HUNT_METHOD_ICON` |
| Hunting | Swept projectile, sight lines, bounded lead | have | `hunting.ts` |
| Hunting | Snare (cordage, small game and deer), pitfall (timber, large game); real wildlife only | new | `setSnare`, `digPitfall`, `tickWildCraft` |
| Hunting | Driven drives, dogs | open | needs herd steering and a dog species |
| Hunting | Fishing | have | `fishing.ts` |
| Tracking | Last-seen memory and search | have | `huntTrail` |
| Tracking | Bleeding wound, blood trail, death at the kill site, tracker follows trail | new | `Wound`, `trackWounded` |
| Hazard | Wounded boar charge | have | `tickHuntingHazard` |
| Kill site | Gut, skin, take meat 3 per swing, capacity limited carry home | have | `workerHuntAI` |
| Butchery | Fat, sinew, brain, horn per species, finite, take at most six per trip | new | `BUTCHERY_PARTS`, `dressParts` |
| Hides | Flesh, tannin, dry skin, tan | have | `fleshHide`, `extractTannin`, `drySkin`, `tanHide` |
| Hides | Soak, brain tan, smoke tan, frame dry (weather), soften to leather | new | `soakHide`, `brainTan`, `smokeTan`, `frameDry`, `softenHide` |
| Hides | Brine tan | open | needs a salt source |
| Meat | Cook, air-dry, smoke at hearth or smokehouse | have | `production.ts` |
| Meat | Render fat to tallow, sinew to cordage | new | `renderFat`, `twistSinew` |
| Meat | Salt curing | open | no salt deposit or pans (`station-46` planned) |
| Spoilage | Per food kind, by weather, storehouse care, season | have | `pantry.ts` `lossRates` |
| Spoilage | Per wild-craft good (brain fast, horn none), by weather; every lost unit counted | new | `WILD_SPOIL_PER_SECOND`, `tickWildCraft` |
| Facilities | Two slots per rack, smokehouse, tanner; real capacity | have | `dryrack`, `smokehouse`, `tanner` |
| Facilities | Same two-slot limit for wild-craft jobs | new | `WILD_STATION_SLOTS` |
| Fruit | Berries spoil fastest | have | `berries` rate in `pantry.ts` |
| Fruit | Dry berries, boil jam (vessel kept) | new | `dryBerries`, `boilJam`; foods `driedBerries`, `jam`, `tallow` |
| Grain, legumes | Thresh, winnow, grind, bake, porridge; granary spoilage | have | `cerealProcessing.ts`, `pantry.ts` |
| Clothing | Light plant cloth, skin, leather, lined hide coat, wool coat or felt coat | have | `textiles.ts`, `production.ts` |
| Clothing | Warmth from the survival system, rain wetness, heat burden, wear and repair | have | `survivalNeeds.ts`, `garmentRepair.ts` |
| Clothing | Wild-craft leather feeds the existing leather garments | new | `softenHide` writes `items.leather` |
| Animals | Pen feed, grazing, hunger, water, bedding, keepers | have | `husbandry.ts`, `penPasture.ts` |
| Animals | Hay and winter fodder store | open | `hayStore` is planned only |
| Knowledge | Method gate from delivered proof (own, taught, traded, inherited) | have | `hasDeliveredMethod` |
| Knowledge | New hide and jam steps use the same proof, plus own practice count | new | `recipeKnown` |
| Feedback | Work reason string per person | have | `workReason` |
| Feedback | Icon rows: jobs, traps, wounds, rotting goods | new | `wildCraftFeedback` (data only; HUD wiring open) |

## Rules this lane follows

Each stage is a job with a named actor, a station, a work time scaled by the actor, and a gate. Inputs are claimed from the cache at start, carried, worked, carried home and credited once. Cancelling refunds. Outputs never exceed what was consumed (`recipe tables conserve` test). No station, no job. Nothing runs unless `enableWildCraft(g)` has been called; old saves have no field and never grow one.

## Shared-file edits (one line each)

`types.ts` (FoodKind +3, `Unit.wildWorkId`, `state.wildCraft`), `foodKinds.ts`, `inventoryVolume.ts`, `foodExperience.ts`, `pantry.ts` (names and spoil rates for the three new foods), `workCommitments.ts` (+`wildWorkId`), `persistence.ts` (+`validWildCraftState`), `sim.ts` (+dispatch line, +tick line, +import).

## Still open

Hunt drives and dogs, salt and brine, hay and fodder, a HUD panel reading `wildCraftFeedback`, a world-setup toggle for `enableWildCraft`, horn uses, pitfall as a physical dig in terrain, carrying a whole carcass as one load, and trade or escrow of wild-craft goods (they live in a per-team ledger, not the trade surface).
