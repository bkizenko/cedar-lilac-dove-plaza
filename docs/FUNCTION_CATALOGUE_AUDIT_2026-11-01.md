# Functional catalogue audit — 2026-11-01

The current source registers **36 structures,23 processing recipes and 25 role groups**. The desktop catalogue lists **106 functions:14 narrowly working foundations,35 partial functions,57 planned functions**. A catalogue entry is neither a new building nor implementation credit. No executor was added in this audit.

## Official Dawn of Man comparison

Only primary Madruga pages were consulted. Their overview describes seasonal survival, animal materials, cultivated food, fortifications and physical megalith hauling; those are useful dependency principles. It does not publish an exhaustive station registry. [Official overview](https://www.madrugaworks.com/dawnofman/)

The FAQ identifies material/tool/workload limits and alert-based tower staffing. It also states that the game ends in the Iron Age and has no AI-controlled settlements. Hearthwild’s independent societies, contextual custody/occupation, coastal exchanges and later eras are its own scope; their existence cannot be inferred from Dawn of Man. No art or building assets were copied. [Official FAQ](https://dawnofman.madrugaworks.com/faq.php)

## What the audit corrected

- Added the ten already-documented later-expansion stations to the actual searchable inventory; Medieval/Renaissance filters are now populated.
- Corrected Bloomery to smelting and bloom consolidation to smithing. Salt curing, trade/markets, garrisons, aqueducts and mounted services now use their appropriate groups.
- Marked portable tents, dedicated flint/bone/wood component stations, dairy preservation, bloom consolidation, pack animals, fountains, administrative records, stone-house/fire services and siege engineering as planned. A generic predecessor does not implement the named function.
- Updated custody, production observation, enlarged finite pasture/feeding and actual pottery/jar descriptions to their concrete present scope.
- Added six explicitly searchable functions: megalith work, copper trials, water-vessel outfitting, builder coordination, fuelwood preparation and paid-batch parking/pickup.
- Every foundation now explains “Working now” and “Still missing”; exact working/partial/planned filters prevent the broad role labels from hiding gaps.

## Fourteen bounded working foundations

These functions have executors. Each may still have refinements; this list does not claim a complete institution or every historical dependency.

| Function | Current executor scope |
|---|---|
| Food drying rack | Finite meat/fish batches load a rack, cure with measured weather and require real pickup/delivery. |
| Smoking shelter | Hearth/smokehouse fuelled batches deliver distinct longer-lasting meat/fish lots. |
| Hide cleaning and tanning place | Delivered hides are cleaned; real log/water tannin extraction and hide/tannin/water leather batches work. |
| Skin sewing shelter | Skin/leather clothing is actually made, delivered, worn and lost with its owner. |
| Cultivation plot | Real plots consume seeds, require suitable full-footprint terrain and physical seasonal work. |
| Hand quern / grinding stone | Four grain become four flour:60 work seconds at hearth or 24 at a grinding stone. |
| Bread hearth / oven | Four flour plus real water/fuel become four bread; an oven shortens work and has two slots. |
| Water collection / carrier point | Residents reach discovered freshwater, fill finite loads and physically deliver water. |
| Fishing bank / landing | A dock supports physical finite fishing and paid boat construction. |
| Stone outcrop / quarry workplace | Known finite outcrops/seams use real miners, labor and carrying. |
| Defense horn / alarm assembly point | A defense horn calls nearby eligible residents to real owned weapons; response and standdown are physical. |
| Earthwork / ditch crew | Paid adjustable-depth trenches change actual sampled terrain and navigation after completed work. |
| Water-vessel cache / carrier outfitting | Equipping removes one delivered vessel from stock; actual larger water loads use proportional filling time and recorded wear. |
| Paid-batch cache / physical pickup | A loaded paid production batch can unload at a real cache; another resident physically collects the same paid inputs without a second charge. |

## Main missing linked chains

| Missing function cluster | Actual precursor | Remaining connected work |
|---|---|---|
| Portable shelter, bindings and containers | Mobile camps, huts, owned pottery | Packable tents, baskets/cordage and useful binding/repair recipes |
| Food and household service | Paid food processing and actual lots | Threshing, granary pests/bins, dairy preservation, salt/brine and meal distribution |
| Textile/animal economy | Actual goats, finite pasture/feed, skin/leather clothing | Sheep/wool, crop fibre, spinning/weaving, horses/donkeys and winter hay chain |
| Metallurgy and components | Finite workable-metal extraction, paid prototypes/equipment | Ore grade/crushing, charcoal, smelting, tin/alloys, blooms, smithing heat and repairs |
| Roads, fleets and large construction | Paid bridges, small boats, trenches and current defenses | Roads/drainage, ship repair/rigging, megalith transport, siege supply and hydraulic moats |
| Water and civic institutions | Physical freshwater trips, custody, contacts and recipe teaching | Wells/cisterns/fountains, sanitation, healers, staffed civic service, literacy/books and formal education |

## Builders: verified priority semantics

Each resident can retain up to 64 saved site intentions. Duplicate queueing does not create duplicate tasks. Only one current construction job owns the actor. High(2) precedes Normal(1), then Low(0); village labor focus breaks equal-priority ties, then explicit list order. Priority is considered among ready sites: paused, unfundable or unreachable entries remain pending while other ready work can proceed.

A priority change does not automatically abandon the current paid site. Pause the queue or give an explicit immediate construction order to interrupt; physical cargo/materials and completed progress remain governed by their existing executors. Completed sites leave the queue, and the next task starts. Paid production/other commitments defer a builder intention rather than stealing its actor. Queueing is not a permanent occupation or a free construction/material grant.

Current source: `constructionQueue.ts`, `construction.ts`, `constructionOwnership.ts` and the desktop queue controls. Focused queue tests cover pending ownership, ready-site selection, priority/focus/list ordering, pause/resume/edit, actual paid construction/save/load and priority funding without discounts. See test results supplied with this patch; no new construction behavior is claimed by this documentation.

The complete 106-entry function inventory remains in `src/game/productionCatalog.ts`, with 36 real registered-structure actions and 23 authoritative processing recipes kept separate. The full all-executor goods-reservation gate remains unfinished.
