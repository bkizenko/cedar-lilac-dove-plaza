# Remaining full-goal gap: livestock drinking water — November 2, 2026

M1-12 (actual animal capture, food and care rather than initial domestic gifts) is already credited in the fixed ledger from earlier materials/pasture evidence. This note adds no duplicate gate credit and does not retroactively broaden that literal gate.

The requested deeper animal-care granularity still lacks drinking-water behavior. `husbandry.ts` `tickHusbandry` consumes finite pasture/stored plant feed, updates hunger/health/care/reproduction and releases animals from destroyed pens. It does not consume `survival.waterLiters`, carry pen water, track animal thirst or apply dehydration consequences. Household drinking water exists separately. Consequently a test cannot honestly qualify livestock drinking-water care from the current code.

A later complete implementation needs adjustable animal/species water demand and thirst consequences; actual household/pen water withdrawal and a real keeper/carrier trip; saved pen/animal water state with validation; honest UI inventory/blockers; and conservation/interruption/death/save checks. Runtime ownership would span husbandry, pen state/report, types/persistence and husbandry UI. This task changed none of those sources.
