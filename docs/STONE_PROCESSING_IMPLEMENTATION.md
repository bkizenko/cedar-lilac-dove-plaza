# First Stone processing cohort

This batch adds physical early processing, not the full production or teaching roadmap. Existing edible meat lots and legacy carcasses are preserved. A completed cooking hearth opts future hunting loads into raw processing; an unfinished drawing grants no output or new animal materials. Animals, plants and fuel are never spawned by the processing system.

## Measurable chain

The authoritative adjustable definitions are `PRODUCTION_RULES`, `PRODUCTION_RECIPES` and `ITEM_NAMES` in `src/game/production.ts`. Dedicated workplaces are `hearth`, `butcher`, `dryrack`, `tanner` and `tailor`. They have actual paid construction, footprint, health and work time. A camp may build a small hearth without a permanent hall.

| Batch | Delivered inputs | Output returned physically | Hands-on seconds |
|---|---|---|---:|
| Cook meat | 4 raw meat, 1 log | 4 edible meat in the existing food lots | 20 |
| Flesh hide | 1 raw hide | 1 cleaned hide | 20 |
| Extract bark tannin | 1 bark-bearing log, 2 L collected water | 2 tannin | 20 |
| Dry skin | 1 cleaned hide | 1 dried skin | 60 |
| Tan hide | 1 cleaned hide, 1 tannin, 2 L collected water | 1 leather | 90 |
| Sew skin clothing | 2 dried skins, 1 bone | 1 skin garment | 45 |
| Sew leather clothing | 2 leather, 1 bone | 1 leather garment | 60 |

Tannin extraction consumes the entire delivered log. That log cannot also fuel cooking or the survival fire. Bone is a consumed sewing implement input in this first model; separately reusable bone tools remain future work. Counts and work times are game balance quantities.

A newly killed deer has finite potential of 24 meat, 1 hide and 2 bones; boar 32/1/3; goat 16/1/2. Potential is created only by the real live-to-dead hunting transition when a hearth already exists. Physical butchery transfers it into bounded carried loads. Old corpses gain no retroactive hides or bones. Raw meat is delivered into material stores and is never simultaneously credited as edible food.

## Ownership, interruption and loss

An eligible adult must physically be at a reachable cache to load a new batch. Inputs, logs and collected water are debited once there. The maker carries that batch to the actual workplace entrance, works, and carries output to a cache before the inventory receives it. Dry racks have two occupied batch slots; the other workplaces have one. Paused work retains its slot and paid progress.

A direct override pauses paid work. Inputs already at the workplace can be resumed by a different free adult. An interrupted carrier retains the same paid load and must resume it personally. A dead carrier loses its finite load; a maker lost after reaching the workplace leaves a resumable paid batch. Destruction or ownership changes block or lose the actual batch, rather than granting a refund or output. Lost materials, completed batches and interruptions have persistent counters. `consumed` records inputs committed from stores; loss counters describe outcomes of those same commitments and must not be added as another debit.

Material storage is a separate manufactured-item inventory, with capacity100 plus200 per completed storehouse. Cooked food uses the existing edible-food inventory, not a second food stock. Raw meat decays continuously. Whole raw hides and cleaned hides expire in persisted storage buckets after900/1800 seconds; they do not decay into unusable fractional hides. Paid perishable inputs can expire while a job is abandoned. More detailed per-lot freshness, preservation containers and physical item barter remain future work.

## Garments

Delivered clothing must be put on by the actual resident at a cache. It leaves material stores and belongs to that person. Skin/leather clothing supplies3/4°C of condition-scaled warmth to its wearer, with7200 seconds of tunable service life. Stockpiled garments warm nobody. The existing fire, shelter, water, cold damage and food systems continue to consume their own real supplies. Clothing and carried hunting materials are measured as lost when their owner dies.

## Verification and limits

`production.test.mjs` covers full `Game.step` cooking, a paid and physically constructed hearth, saved interruption/replacement, complete skin/leather conversion, capacity/blockers, strict malformed saves, finite spoilage, wearer-specific cold exposure and a two-animal hunt-to-garment scenario. That latter scenario uses original finite animals and real walking observers; its controlled terrain and prepaid workplace fixtures qualify the processing executor, not ordinary-map campaign balance. Existing hunting and survival regressions are run alongside it. `production-catalog` tests separately cover the catalogue and workplace geometry.

Full first-winter balance, actual garment appearance on character meshes, food drying/smoking, wool/textiles, pottery, smelting, item cargo/barter beyond this local chain, and the full needs-driven teaching network remain incomplete. The wider catalogue labels these gaps. This batch changes no age50/75/100 population threshold.
