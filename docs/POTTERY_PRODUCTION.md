# Pottery production: implemented scope and evidence

Checked 2026-10-31 against the current registry: **36 structures/build-menu entries, 23 processing recipes, 25 functional roles and 90 station functions**. Pottery contributes two real Stone workplaces and six recipes. The catalogue remains a mixture of real, partial and planned functions; these counts do not mean all chains work.

| Step | Real command / method | Paid input → output | Work and capacity |
|---|---|---|---|
| Survey and extract | Select an adult, survey nearby known freshwater banks, then dig/carry from a recorded bank | Finite bank reserve → carried clay → actual cache | Initial reserve 80–160; four clay per 24 work seconds; one reserved digger per bank |
| Shape | `formClayHand` at hearth; `formClay` at pottery shelter | Four clay + two collected water → four greenware | 90 versus 30 work seconds; shelter has two shared slots |
| Dry | `dryClay` on rack; `dryClayCovered` under shelter | Four greenware → four dried unfired ware | Ten loading seconds + 90 effective weather seconds; actual pickup/delivery |
| Fire | `fireClayHand` at hearth; `fireClay` in kiln | Four dried ware + four/two logs → up to four vessels; failed units become potsherds | 90 versus 45 work seconds; kiln has two slots |
| Deploy | Collect a delivered vessel at the actual cache | One stored vessel → one owned carrier vessel | 32 L/16 filling seconds versus unchanged 24 L/12 seconds without pottery; ten delivered trips before breakage |

A shelter costs eight logs/two stone and 14 base construction seconds. A kiln costs eight logs/eight stone and 20 seconds. Neither creates ingredients. Costs, physical construction, worker arrival, paid inputs, occupied slots, work, pickup and delivery all precede usable output.

Rain rewets exposed greenware; 180 cumulative wet seconds damages a batch. Shelter prevents that rain damage, while freezing still pauses useful drying and humidity changes elapsed duration. Paid drying releases its loader while retaining the slot. Firing losses use a saved deterministic tuning rule, including occasional full failures; surviving vessels plus shards account for the four input units. Detailed geological/thermal chemistry is not simulated.

Vessel equipping removes one item from communal stock. It follows the actual person with recorded producing society/site/style and remaining trips. Actual water collection takes proportionally longer to fill the larger load; only completed physical delivery wears the jar. The benefit is fewer carrying trips, not free water or faster filling. Broken/dead owners' vessels are recorded as losses, not also returned as available pots. No generic storage-capacity bonus is awarded. Unrecorded/editor-granted items are not given fictional provenance.

## Verification executed

**38 distinct focused checks passed:** pottery 4, bread 7, food preservation 6, catalogue/geometry/UI 9, storage/workplace UI 6 and survival 6. The first combined run passed 37/38: an existing strict-water test caught acceptance of oversized cargo without an owned jar. Bounds were corrected to the actual owned vessel capacity; all six survival checks and the natural 32 L scenario then passed again.

The natural seed-1 V14 pangaea scenario surveys actual banks, extracts/depletes clay, physically constructs paid workplaces, forms and dries ware across save/decode, fires vessels, equips the producing origin and completes a real 32 L trip with 16 filling seconds and recorded wear. Other checks cover saved carried-clay interruption without a second debit, exhausted banks, wet exposure, covered drying, manual-vs-specialist costs, maker death/replacement, firing shards and rejected impossible provenance/progress.

The desktop QA save reuses that physical scenario and adds a second actual curing batch: bank reserve 155 → 147, eight clay dug/delivered, one equipped jar and a paid drying project. Its explicit initial test endowment is 140 logs, 100 stone, 1,200 provisions and 2,000 L water. No clay or pottery was granted and no terrain was flattened or overridden. It is visual/scenario evidence, **not campaign survival or overall-plan completion credit**.

## Remaining gaps

Wheel throwing, glazes, distinct clay mineral properties, kiln heat/atmosphere/fuel cycles, food-storage containers, large-vessel carrying mass, shard recycling and provenance-preserving vessel trade remain incomplete. The alluvial survey is a deterministic game suitability rule, not measured geological truth. The local style is an authored, source-derived identity, not a historical attribution.

Implementation: `src/game/pottery.ts`, the six recipes and shared paid executor in `src/game/production.ts`, owned-vessel water handling in `src/game/survivalNeeds.ts`, and strict optional saved-state validation. UI instructions expose survey/dig/resume and cache equipping; the owned-vessel readout shows trips and recorded style. See [functional building reference](BUILDING_FUNCTIONS_2026-10-31.md) and [detailed chain notes](POTTERY.md).
