# Village workload and finite adult capacity

Status: a read-only model and reusable React panel, awaiting the integrator's HUD hook and desktop review. It does not create jobs, alter inventories, change priorities, add speed penalties, or manufacture random accidents.

## Contract

`measureVillageWorkload(game,team=0,{horizonSeconds?})` returns estimated **person-seconds of demanded work / person-seconds of civilian adult capacity**, shown as an approximate percentage. The default adjustable window is 180 simulation seconds. Values above 100% are retained. No-capacity cases return a null percentage and an explicit reason instead of NaN or a fabricated huge number.

`<WorkloadPanel engine={engine}/>` is a compact HUD disclosure; `expanded={true}` also fits the village ledger. The report includes separate ready, blocked and paused totals, task priority/deadline rows, real waiting reasons, per-person availability/fatigue/cargo, and unassigned civilian hands. The view performs no scheduling commands.

## What contributes

- Existing incomplete construction is measured once per building using its actual remaining progress and `BUILD_TIME`, plot area, builder strength, and actual excavation-work duration when present. Direct build orders and two builders do not duplicate the site. Expansions include their remaining area/work; unfunded plans expose real missing inputs and their acquisition demand.
- Current seasonal fields use remaining sowing/tending/actual harvest, actual tools, the existing gathering-work rate and economic practice, bounded crew slots, row changes, and carrying trips. The report derives a missing new-year crop state without calling the mutating `crop()` initializer. Current season deadlines are exposed; future unsown harvests are not credited to inventory.
- Actual paid weapon, tool, copper, transport, planting, taming and husbandry commitments retain their remaining work. Crafting practice improves the same rates used by the executor. Paid haulage ledger records and unit compatibility fields are deduplicated by project ID.
- Real marked/assigned timber and resource jobs are grouped once. An explicit continuing resource order can occupy the planning window only while known finite supplies exist. Subsistence labor/exposure, habitat, workplace, carrying equipment and current winter effects inform collection estimates. Actual hunting commitments include their finite kill/processing/hauling work.
- Food, water and cold-fuel reserve deficits are merged with planned acquisition and existing related work rather than charging the same output twice. Real carried goods and water share one return trip. Unknown water approaches explicitly identify unmeasured travel.
- Current stores and herds add actual tending/care requirements. Preservation respects the existing food and timber reserve blockers. A named future institution does not invent extra maintenance work.

Legacy military training timers run on elapsed time before selecting an adult at completion. They are displayed separately, not mislabeled as continuous staffed labor. Real benches still limit simultaneous crafting: four assigned projects at a three-bench shelter explain a waiting maker even when total village workload is below 100%.

## Capacity and overload

Living adults are counted once. Dependents, prisoners, ordinary military/guard duties, distant missions and military practice are not spare civilian labor. An actual armed hunter is represented in its current food work. Currently storm-sheltered residents have no ordinary outdoor capacity. Fatigue uses the existing .85 rest threshold, .12 recovery target, 240-second work accrual and 20-second recovery rates to estimate work/rest within a busy planning window. Illness is reported but receives no invented blanket productivity penalty.

Carrying is required work, not both a capacity subtraction and a second duplicated job. Paused projects remain visible but are excluded from current demand. One resident owns at most one current execution slot in the report; subsequent saved commitments explain their place in the queue.

Above 100% means the represented queue will not fit the selected time window at current capacity. Existing executors already wait for workers, benches, inputs, routes, fields and deliveries. This panel exposes those constraints; it does not impose a second overload penalty. Suggested priorities favor water, food and due harvests while leaving actual manual/automatic choices to the player. Three large fields can exceed a three-minute plan while still being possible before a later seasonal deadline; that is not a claim that the harvest is automatically doomed.

## Precision and verification

These are rate-based planning estimates. Travel is straight-line, without running pathfinding or changing route caches; obstacles, weather changes, shift changes, interruptions and serial dependencies can add delay. Future crop seasons and unknown exploration are not simulated in advance. The panel never silently spends food, reserves a bench, initializes a project ledger or mutates a crop in order to inspect it.

Focused tests cover increased demand and >100%, real adult/tool improvements, read-only state equality, dependent/guard/fatigue/cargo capacity, duplicate site/project/actor views, bench waiting below 100%, paused projects, elapsed training timers, marked-tree deduplication, shared cargo return, and a real React render with scheduler methods forbidden. Desktop verification and the full campaign acceptance checklist remain the integrator's separate gates.
