# Building maintenance and physical paid repairs

Base: `8836777`, isolated `.play/building-maintenance-review`. This is a bounded standing-building subsystem, not a complete civil engineering or maintenance economy.

New worlds carry optional `buildingMaintenanceVersion:1`. Completed standing buildings gain 1,800 simulation seconds of grace. Timber loses 0.72 percentage points of upkeep condition per simulation hour; stone loses 0.36. Rain multiplies wear by1.35, storms by2, actual production/training use by1.2. Wear reduces actual HP and stops at70% upkeep; it never heals a building already damaged below that level. Selected buildings warn below90% upkeep. Farms, trenches and bridges retain their existing landscape behavior and are excluded. Rates, thresholds, reserve budgets, packet capacity and labor are named in `BUILDING_MAINTENANCE`.

Older saves without the marker receive no new passive wear. Their untouched town halls retain the old8HP/s compatibility behavior. New worlds disable that free healing; choosing an explicit paid repair on an older hall permanently adopts the paid path for that hall, without enabling passive wear for the older village. A pending repair never receives the old free heal.

## Actual paid work

A repair quote covers the current HP/condition deficit using35% of the corresponding original wood/stone construction fraction, rounded to finite units. Labor is0.22 person-seconds per HP, with an8-second minimum. At payment, existing communal resources move into a serialized claim, partitioned exactly into uncollected cache inputs, bounded carried packets and material delivered to the site. No recurring remote resource deduction or instantaneous healing exists.

An actual free adult collects at an owned reachable cache, carries at most8 units per trip, and uses the real building interaction approach. Larger repairs require repeated cache trips before work. A full packet slows that carrier to80% pace. After physical delivery, labor gradually restores only the paid HP/condition budgets; subsequent combat damage is not repaired for free. Measured counters retain paid materials, repair labor, repaired HP, completed repairs and cumulative wear.

One shared workRuntime actor/target claim owns a repair. Direct tasks/job locks are protected. Automatic scheduling does not take stationed held residents; an explicit Repair command can assign a free held adult. Site BUILD priorities order pending repair claims, and pending equal/higher-priority construction is protected. Existing paid commitments remain intact when village labor focus changes. Planned repair work and remaining material trips appear in workload; paused work is shown but excluded from active demand.

Player Auto work delegates needed repairs. NPCs use the same payment/travel/repair commands independently of the player's toggle. New automatic claims require an eligible adult, at least240seconds of food,12logs and4stone left after payment, and no other repair claim in that society. Reviews are bounded at10seconds. Manual repairs can use a deliberately tighter budget. Ordinary old-save NPC villages are not silently opted into the new automatic economy.

Interruption releases hands, preserving progress and dropping a carried packet at the actual body's location. Another adult must collect it before continuing. Death is reconciled before dead units leave the state. Paused save/load, replacement and restoration do not repay inputs or reset condition.

## Intact occupation and limits

Whole-society transfer preserves actual cache/packet/site locations and paid progress, changing current custody while retaining original payer. Local occupation never fails merely because an enemy had a repair outstanding. If local transfer splits materials/cache/carrier from the target, the old-custody claim is retained, paused, in `retainedBuildingRepairs`; any carried packet is dropped at the actual body's location. No goods are remotely refunded or copied. The captured building can immediately start its own separately paid repair. An old claim can be restored without payment if its custody and building reunify. On-site fully supplied work transfers with its site and can use an actual same-owner replacement.

Retained claims are explicit paused workload records, not usable extra stock. Recovery/salvage of a permanently disconnected claim, dedicated repair-yard advantages, bridge engineering, mortar manufacture, guard supplies and ruin rebuilding remain unimplemented. No full shared-executor/fairness or release-checklist credit is asserted by this package.

## Verification

`/tmp/building-maintenance-final-v2-tests.log`:52/52 distinct cases:19 maintenance cases,28 construction/shared-allocation/workload compatibility cases and5 catalogue cases. The maintenance group includes a nativeV14 finite coastal village on unchanged terrain, paused save/load with exact terrain reconstruction, same-body paid completion, multiple material loads, death/replacement, priority/locks, NPC operation with player Auto work off, zero-random-draw read-only queries, whole transfer, local cache/carrier/site splits, and paid-claim restoration after reunification.

`/tmp/building-maintenance-final-first-winter.log`:1/1 current NormalV14 seed42 default-conflict first-winter case passed with the new reset marker: five original founders survived,18 adults alive, two completed shelters,237.45food-reserve seconds, physical water/fuel delivery, zero maximum thirst and strict save round-trip. Initial grace is deliberately active in this opening; this is viability evidence, not a post-grace multi-year upkeep economy proof.

Final typecheck and development build passed (`/tmp/building-maintenance-final-types.log`, `/tmp/building-maintenance-final-build.log`). Overall53 distinct automated cases pass; earlier reruns are not added again. Actual interactive controls QA is pending parent review: this agent's CUA exposed no browser surface. Own preview8105 and public, nonprivate native fixture `.play/building-maintenance-review/.play/building-maintenance-public.json` are supplied; no user preview/save was touched. No FPS speedup claim.
