# Subsistence labor balance: measured proposal

Status: source module and controlled rate tests are ready; the two runtime period hooks are an isolated review patch in `.play/subsistence-hooks.patch`. This report does not claim those hooks are published or that the changed seasonal-food campaign has passed a full first winter.

## Actual source of excess

`GATHER_WORK_RATE = 4` divides ordinary working periods by four. Before habitat/workplace/weather/urgency and travel, wild food takes **0.5 seconds per unit**, timber **0.625 seconds per log**. A dock's .62 camp factor makes its nominal on-site limit about 194 fish/minute per worker; a lumber camp's .58 factor makes its nominal on-site limit about 166 logs/minute. Actual trips, finite stocks and failed rich/thin rolls reduce delivery, but household food need is only about **10.4–11.0 units/minute for the five actual adults measured here**.

This is a labor-time imbalance, not evidence that the world needs fewer trees or animals. Keep dense habitats and finite resource patches. The new wild-plant maturity subsystem separately limits *when* each species can provide food; labor balance governs how fast available food and logs are collected.

## Chosen central tuning

`src/game/subsistenceBalance.ts` exposes `SUBSISTENCE_RULES`, `outdoorWorkConditions`, `subsistenceLaborMultiplier`, `butcheryLaborMultiplier`, and `subsistenceWorkReport`.

- Ordinary food working time ×4.5; timber working time ×4. Other resource extraction is unchanged.
- Comfortable outdoor range: 8–28°C. Each colder degree adds .04 labor, capped at .75; hotter degrees add .025, capped at .45.
- Wet-weather factors: mist 1.04, rain 1.12, storm 1.35, frost 1.05, flood 1.22, drought 1.02; clear/golden 1. The additional exposure factor is capped at 2.5, so it can never set productivity to zero.
- Temperature starts with the **actual displayed ambient temperature**, adds the local ecological offset and elevation cooling, and includes the existing clock's nighttime temperature. Reports expose every component and the chosen difficulty.
- Existing winter gathering/fishing, habitat, workplace, urgency, transport and weather rules remain. These can stack with exposure. The 40% productivity floor describes this new exposure modifier, not an invented guarantee that every worker can feed a whole village in a storm.

The generic collection hook changes working time only. Hunting attack/combat cadence remains unchanged. A separate carcass-processing period hook uses the food labor factor, because butchery currently releases three meat per 0.45 work seconds and bypasses the generic collection period. Farms and livestock have separate seasonal work/yield models and are explicitly outside this small change.

## Real worker and delivery measurements

Two unchanged generated v13 1040 m continent worlds, Normal difficulty, a five-adult manual camp, one designated wild-food collector, one logger, three residents available for other work. Initial stores were the real 120 food / 58 logs. The test uses actual `Game.workerAI` paths, resource approach, harvesting, carrying and camp delivery; actual food demand, spoilage and survival consumption. The candidate period factor is applied algebraically through a per-instance work-bonus wrapper while the shared source is untouched. After integration the harness detects the actual hook and cancels/reapplies the same factor for the baseline comparison.

No stocks were granted, workers teleported, land flattened, vision forced, wildlife deleted or resource density changed. Workers only target discovered reachable patches through direct gather commands. This is a controlled **300-second household labor audit**: births, raids, plant regeneration and other world systems are outside its measurement loop. It is not full-game or first-winter qualification.

| Seed | Baseline food delivered per forager/min | Proposed food/min | Baseline logs delivered per logger/min | Proposed logs/min | Actual five-adult food demand/min | Proposed minimum / ending food |
|---|---:|---:|---:|---:|---:|---:|
| 42 | 79.4 | 20.0 | 43.8 | 9.6 | 10.40 | 100.90 / 165.22 |
| 123456 | 91.2 | 30.0 | 54.6 | 15.4 | 11.03 | 106.79 / 204.96 |

Both proposed camps delivered more food than actual consumption **plus spoilage**, kept all five residents alive, never emptied food, and ended above their original food reserves. Actual delivered timber was 48 / 77 logs over five minutes. Thus the measured reduction preserves room for manual building, crafting and water labor, while one logger no longer creates hundreds of spare logs in a few minutes. Colder seasons should increasingly use prepared stores, preserved food, hunting and additional available hands rather than unlimited ripe winter berries.

`workingSeconds` counts time at the actual resource work surface. `overheadSeconds` includes travel, delivery, waiting and task selection; it is not mislabeled as pure walking time. Per-worker output counts only actual cargo-delivery events, avoiding double-counting food receipt and cargo delivery.

## Verification and remaining gates

`scripts/subsistence-balance.test.mjs`: three tests pass, including two real-worker baseline/candidate household comparisons and bounded cold/wet/hot conditions. It also checks unchanged resource-node/animal counts, unchanged opening stores, delivered-food sustainability and useful continuing timber output. Detailed raw evidence is `.play/subsistence-rate-audit.log`; formal test output is `.play/subsistence-balance-tests.log`.

Before publishing this together with species maturity, qualify the combined rules through Normal first winter using actual available spring greens/roots, summer fruit, autumn grain/pulses/roots, winter stores, water, shelter, fuel and defenses. Check hunter/butcher output, actual fish trips, larger settlements, rival budgets and live UI rate descriptions after the hooks land. In particular, the old fishing hint still quotes the unmodified 4× on-site upper rate and must be updated when the balance hook is activated. The proposal does not change the stable campaign checklist denominator or mark a season/production chain complete merely because the module exists.
