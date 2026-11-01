# Finite fibre, cordage and owned baskets

This Stone cohort adds one actual fibre/basket shelter and four paid recipes. Current registry: **37 structures,27 processing recipes,25 functional groups and 106 catalogue function entries**. Basket/cordage is partial because binding components, nets, cloth and detailed plant preparation remain unfinished.

A resident inspects actual known, reachable living trees with suitable observed bast potential. Each recorded tree-linked patch starts with 4–12 abstract units, holds at most 16, and is neither created from a biome name nor awarded for constructing a shelter. Every four prepared fibre takes 24 hands-on seconds, consumes four finite patch units and one unit of the actual tree’s standing timber potential, then must be physically carried to a cache. Tree cutters and fibre workers share the same physical source-slot ledger; an independent fibre-strip slot prevents duplicate harvesters.

A living source regrows at most 16 fibre units per 1800-second game year, capped by its actual patch capacity. Winter has zero regrowth; drought halves growth. Felled/exhausted tree sources cannot supply or regrow bark fibre. Initial source stock, harvest, cumulative regrowth, remaining stock, standing timber consumed, work seconds, carried loads, deliveries and losses are measurable saved quantities. These rates and unit conversions are explicit game-tuning knobs in `FIBRE_RULES`, not archaeological measurements.

| Paid recipe | Inputs → delivered output | Manual hearth | Fibre shelter |
|---|---|---|---|
| Twist prepared fibre |4 plant fibre →4 cordage |90 work seconds |30 work seconds |
| Weave a carrying basket |4 plant fibre +2 cordage →1 basket |120 work seconds |45 work seconds |

The shelter costs eight logs/two stone and 14 base construction seconds. It has two shared processing slots versus one at the hearth. Neither method creates free inputs or passive inventory. Actual worker travel, paid input commitment, labor, saved interruption, physical unloading/pickup and final delivery reuse the shared production executor. Useful delivery also uses existing exact-recipe practice and observation; there are no abstract researchers or a population prerequisite for these Stone methods.

Collect one delivered basket at the actual cache to assign it to a real resident. It leaves communal stock and becomes `Unit.basket` with condition 0–1 and recorded producing society/site/style where known. Stored tribe-wide baskets do not give every person a bonus. Unrecorded/editor-granted baskets remain explicitly unrecorded.

An owned serviceable basket raises a civilian worker’s gathered-food capacity from 40 to 60, or fibre trip capacity from four to eight. Harvesting still takes 24 seconds for each four units; it reduces carrying trips rather than generating resources or accelerating gathering. No bonus stacks with a boat or existing haulage equipment, and logs/stone/metal receive no basket multiplier. Real loaded food/fibre deliveries wear the basket; baseline durability is 24 deliveries. Empty trips do not wear it. Worn-out/dead-owner baskets are recorded as losses and are not also returned to available inventory.

Before a fibre load is collected, a direct interruption cancels the unpaid harvesting intent. After collection the original body retains ownership of the actual load. Return-load and existing loaded-exploration paths physically deliver it; save/load reconstructs shared actor/source claims and cannot duplicate the resource. The read-only workload report includes remaining harvest/travel/delivery once, and read-only knowledge/catalogue reports never initialize or survey sources.

## Evidence and limits

Focused natural seed-1 V 14 pangaea qualification inspects real trees, harvests/delivers eight fibre with two actual standing-timber debits, physically pays/builds the shelter, makes cordage and a basket, equips its real producing origin, saves/reloads it and returns an actual eight-unit fibre trip with recorded wear. No fibre or baskets are granted in that whole-chain scenario. Controlled manufacturing/terminal-wear fixtures separately test finite supplied inputs and worn equipment; they earn no campaign survival credit.

Primary research supports the basic material/technique direction: Hardy and colleagues document a twisted cord of inner-bark fibres. That supports a usable early bast-cordage method, not universal botanical suitability, the numeric game rates, or a complete cloth/net industry. [Hardy et al., Scientific Reports,2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7145842/)

Incomplete: species-specific bark ecology, soaking/retting and drying stages, strip-wound/tree-health biology, full fibre mass/volume, nets, sail/rope rigging, separate tool-binding components, repairs, textiles and provenance-preserving trade. The first implementation models observed living-tree bast, not a universal fibre crop or free reeds placed across the map.
