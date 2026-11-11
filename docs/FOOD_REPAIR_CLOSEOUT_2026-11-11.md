# Food repair closeout — November 11

Published runtime: **9c653f0**, ports 8086/8101. Save and refresh an already open game to load it. This closes the proved dispatch bugs; it does not claim a fully balanced seasonal economy or a solved navigation system.

## Fixed and published

- Independent mills/ovens no longer stay disabled merely because quick fish/meat inputs exist. Quick meals retain shared-kitchen priority.
- Urgent processing can recall empty, unlocked distant berry gatherers; loaded people, direct orders and paid assignments remain protected. Returning berry carriers review food work before another forage trip.
- Bank and dock fishing share finite stock/pressure/depletion rules. Repeated habitat surveys do not restore depleted stock or create a second stock in the same connected cell; separate ponds remain separate.
- Actual worker activity shows paid recipe/stage/progress, cargo, saved source/destination and blockers; warmth visits report travel/warming while preserving the original batch.
- Storage-care workload uses ready-meal reserves rather than treating raw grain/fish as edible meals. Hauling is real time, counted once.

Published qualification was recorded per batch: fish/activity 18/18, warmth readout 8/8, and corresponding published-browser checks. Earlier food-dispatch evidence remains in the existing metrics files. No new credit to the fixed 98-gate checklist is claimed.

## Remaining cause in the saved village

The last recorded state had **all 3 grinding stones working on double batches**; all 6 hearth slots and both smokehouse slots were occupied. Flour was 2.76, below the 4-flour minimum for another baking batch. Grain was 1489.98. Thus the immediate downstream limit was milling throughput and delivery, not a rule ignoring available flour.

Three one-slot stones nominally produce 0.667 flour/second with double batches, equivalent to 0.8 bread nourishment/second before hauling and interruptions. The53-person saved demand was 1.932 nourishment/second: about 41% coverage if relying on bread through those mills alone. Other food sources supply the remainder. More raw grain cannot itself increase workstation throughput. Larger/expanded methods or more actual milling capacity are the intended productivity choices; no free food, hidden speed boost or removal of transport time was added.

Navigation/weather are separate: one workplace entrance and one finished-goods cache route remained blocked; rain held four winnowing batches and rewetted drying fish. Those do not justify describing every job as idle or claiming all paths are fixed.

## Stopped observation, not winter acceptance

The ordinary saved-world run was stopped at the user's request. Last complete sample: 570.18 simulated seconds, summer through autumn, 53/53 alive, no hunger/cold, ready nourishment 0→203.52, 992 additional ready meals produced. Winter was **not tested**. Original export checksum stayed unchanged. The private output records the stopped run; it is not a passing seasonal gate.

## Fast diagnosis from now on

`npm run audit:food -- /absolute/path/to/export.json` reads the save and reports actual inventories, occupied slots, recipes/progress/blockers and nominal milling capacity. It never advances simulation, opens a browser or modifies the export. Measured here: 3.73 seconds. The partial world run consumed 116.8 seconds for 570 simulated seconds; the tools answer different questions, so this is not a claimed equivalent speedup.

Source and snapshot checks are sufficient for stock/recipe/slot/ownership questions. A short regression checks a changed decision. Physical journey/render checks are used once for the changed integration boundary; full seasons are reserved for actual seasonal acceptance or an unresolved time-dependent failure.

The full game goal and broader backlog remain active. Current visual work is on hold by user instruction.
