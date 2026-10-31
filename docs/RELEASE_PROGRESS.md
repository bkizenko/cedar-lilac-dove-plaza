# First-release acceptance progress

Baseline **hearthwild-first-release-gates-v1** (frozen) · 2026-10-31 · desktop only.

**15/98 verified gates — 15.31%.** This measures acceptance evidence, not development effort or time remaining.

Verified baseline: c25f405. Unpublished map/conflict integration earns no credit. Partial/unverified/pending gates earn zero; source files and test definitions alone are not passed evidence.

## Milestone counts

| Milestone | Verified / total | Verified checks |
| --- | ---: | ---: |
| M0 | 5/12 | 41.67% |
| M1 | 9/22 | 40.91% |
| M2 | 0/16 | 0% |
| M3 | 0/18 | 0% |
| M4 | 0/20 | 0% |
| M5 | 1/10 | 10% |

## Fixed acceptance checklist

### M0

| Gate | Status | Acceptance | Evidence / limitation |
| --- | --- | --- | --- |
| M0-01 | verified | Gather/job-assignment physical actor eligibility gives one rejection reason and bounded actor assessments | batch1. Physical eligibility only; eventual order success/latency remains M0-10/12. |
| M0-02 | verified | Direct gather/drill interruption preserves already-paid transport progress and material charges | batch1, batch4. Direct gather/drill paid interruption and saved progress explicitly verified. |
| M0-03 | verified | Atomic reservation contract rejects partial claims and competing migrated actor ownership | batch2. Atomic contract plus migrated actor ownership checked; all-executor goods migration remains pending. |
| M0-04 | verified | Migrated tree workers share physical workplace slots and reconstruct ownership after save/load | batch2. Tree-slot reconciliation, physical work/delivery and save ownership checked. |
| M0-05 | verified | Paid transport projects survive maker reassignment/death and resume on a replacement without repayment | batch4. Replacement/original maker, death/workplace loss, cart input and legacy duration checks recorded. |
| M0-06 | pending | Construction interruption and paid-work resumption use a single actor/project owner | No matching executed evidence. Foundations exist; single ownership and complete construction interruption acceptance not yet demonstrated. |
| M0-07 | pending | Gathering, construction, hauling and all crafting executors use coordinated atomic goods/capacity reservations | No matching executed evidence. Tree/paid-haulage migrations are partial; other direct-mutation executors remain. |
| M0-08 | pending | Transport journeys, husbandry, expeditions and captivity migrate through the shared ownership contract | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M0-09 | pending | Versioned simulation RNG and timestamped commands reproduce new-game outcomes across replay/save | No matching executed evidence. Seeded world generation is not serialized simulation RNG or full deterministic replay. |
| M0-10 | pending | Command execution latency, blocked time, stealing and reservation failures are measured beyond eligibility | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M0-11 | pending | Priority and recall changes conserve full-handed cargo, escrow and paid construction across interruption | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M0-12 | pending | Full M0 integrated scenario passes direct override/recall/construction/paid-work resumption without repair | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |

### M1

| Gate | Status | Acceptance | Evidence / limitation |
| --- | --- | --- | --- |
| M1-01 | verified | Default player and rivals start as unbuilt camps with finite possessions and no automatic pen | batch2. v10 finite unbuilt camp opening is verified; inhabited prehistory remains M2-14. |
| M1-02 | verified | Goods physically reach a reachable camp before credit; recall/save never duplicates cargo | batch2. Camp approach, real walking/credit and save/recall conservation recorded. |
| M1-03 | verified | Losing a hall preserves a living society and its usable supply anchor | batch2. Living people retain society and camp supply after hall loss; full collapse/refounding still M2-12. |
| M1-04 | verified | Emergency occupants reach real entrances, respect capacity and become exposed when shelter is destroyed | batch3. 20 actual Game.step frames, real shelter destruction and target reacquisition passed. |
| M1-05 | pending | All six difficulty profiles centrally control abundance/climate/provisions/pressure with explicit advantages | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-06 | verified | Water collection traverses a discovered physical bank and returns finite cargo through interruption/save | batch4. Discovered bank collection, physical return and reassignment/recall/save conservation recorded. |
| M1-07 | verified | Cold consumes real stored fuel and shelter/fire benefits affect measured gradual exposure | batch4. Actual wood use and measured shelter/cold effects checked; no clothing completion implied. |
| M1-08 | verified | Desktop needs panel/ledger show actual reserves, physical-action availability and one disabled reason | batch4. Real desktop development/built-output controls opened and used with zero page errors. |
| M1-09 | pending | Rest, shelter, clothing, tool wear and repair form a viable survival production loop | No matching executed evidence. Clothing and complete repair/needs production remain open. |
| M1-10 | pending | Tracking, hunting, carcass handling and wildlife hazards provide meaningful finite food | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-11 | pending | Fishing uses actual reachable freshwater/coastal banks with physically returned catches | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-12 | pending | Early animals require real capture, food and care rather than automatic initial gifts | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-13 | pending | Seed-funded expandable farms follow contours and support soil/fallow/preservation/milling decisions | No matching executed evidence. Contour-following farms are explicit latest scope; field-module presence is not current visual/gameplay acceptance. |
| M1-14 | pending | Food attention, local depletion/regrowth and warned hazards produce choices without broken labor | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M1-15 | pending | Every map has mandatory hills/valleys/rivers/lakes; substantial landmasses have coherent drainage and reachable uplands | No matching executed evidence. v11 implementation and focused checks are unpublished integration work; zero credit until integrated acceptance/publish. |
| M1-16 | pending | Every map contains all required landscape families with organic forms and varied prominence | No matching executed evidence. Organic v11 forms/material/water fixes are under desktop review; prior ellipse/teeth/striped fall gallery was rejected. |
| M1-17 | verified | Scenic scores expose geographic components and choose an above-average viable start when feasible | batch1. Numeric geographic score components and above-average candidate selection verified. User rejects broader art; M1-16/M5-04 remain pending. |
| M1-18 | pending | New terrain supports dry roots/foundations, freshwater access and prospectable mountain approaches | No matching executed evidence. New elevated water changes physical access/dry placements; unpublished v11 must pass broader scenarios. |
| M1-19 | verified | Water/cold neglect produces visible warnings and grace before gradual harm; legacy needs rules persist | batch4. Needs warnings/grace/neglect and legacy opt-in compatibility checked, not all survival pressures. |
| M1-20 | pending | Current Normal default-conflict unbuilt-camp scenario survives first winter with water/fuel/food/defense and no repair | No matching executed evidence. Earlier defended pre-needs runs and separate quiet needs runs cannot be combined into proof of this gate. |
| M1-21 | pending | Every map contains at least eight substantial ecological regions with measured coverage, coherent moisture/soil/climate transitions and matching resources | No matching executed evidence. Only three broad habitat labels are present; many-biome physical coverage and transitions are unverified. |
| M1-22 | pending | Biome presentation uses distinct grass/forest forms, wetland reeds, desert scrub and alpine vegetation with dry placement and bounded detail tiers | No matching executed evidence. Distinct biome vegetation families/ground structure are not completed by recoloring the same trees or grass. |

### M2

| Gate | Status | Acceptance | Evidence / limitation |
| --- | --- | --- | --- |
| M2-01 | pending | Societies compare feasible bounded local-AI alternatives using explicit needs/costs/risks and reasons | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-02 | pending | Committed strategic plans reserve resources and use hysteresis/interruption rules | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-03 | pending | Rivals develop from finite camps, scout and specialize without recurring resource gifts | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-04 | pending | Two rivals independently complete profitable physical trade through shared rules | No matching executed evidence. Older rival economic/logistics reports and focused test files do not prove current shared-rule rival-rival completed route scenario. |
| M2-05 | pending | Two rivals compete/fight, negotiate a treaty and recover through the same society systems | No matching executed evidence. General directed multi-society war/treaty/recovery acceptance remains open. |
| M2-06 | pending | Directed society-pair ledger stores incidents/trust/grievances/agreements/dependencies/claims | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-07 | pending | Information travels through observation/envoys/routes; unknown actions do not generate remote knowledge | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-08 | pending | Claims have defended cores/fading influence and witnessed extraction/settlement incidents | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-09 | pending | Warnings/compensation/transit denial/embargo/eviction precede proportionate escalation when appropriate | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-10 | pending | Wealth creates learned opportunities/risks while safer geography and defense can deter or redirect attacks | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-11 | pending | Arrivals, refugees, departures, aging, families and leadership preserve community identity | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-12 | pending | Shortages and failed obligations cause warned gradual collapse, abandonment and possible refounding | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-13 | pending | Leadership succession retains agreements, grievances and community histories | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-14 | pending | Inhabited-world start runs bounded recorded prehistory and discloses asymmetry | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-15 | pending | Rival growth/investment/plan completion/recovery outcomes are measured on fixed and holdout worlds | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M2-16 | pending | Full M2 chapter links surplus, wider access, exposed routes and independent society decisions | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |

### M3

| Gate | Status | Acceptance | Evidence / limitation |
| --- | --- | --- | --- |
| M3-01 | pending | Boat/port deliveries carry actual people/cargo through boarding, travel, unloading and save/load | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-02 | pending | Caravan/depot/pack-animal routes scale capacity with actual equipment and escort obligations | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-03 | pending | Markets consolidate known offers/contracts/cargo/storage with measurable handling/search benefit | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-04 | pending | Shipment interruption and interception conserve cargo/equipment and measure profitability/reliability/loss | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-05 | pending | Roads/bridges/canals/trenches require real work and bounded terrain/navigation updates | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-06 | pending | Husbandry breeding/feed/products and pack transport connect to real expedition/trade needs | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-07 | pending | Contested access and extraction support physical transit agreements, escorts or route abandonment | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-08 | pending | Raids prepare/approach/contact/loot/withdraw; defense can deter them without automatic larger spawns | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-09 | pending | Finite looting can succeed without compulsory burning and counts only physically returned goods | No matching executed evidence. Natural non-destructive loot integration unpublished; ordinary destruction-linked loot is not this gate. |
| M3-10 | pending | Contextual capture/surrender preserves existing people and requires physical escort, custody and needs | No matching executed evidence. Incidental surrender/forced-labor foundations do not complete contextual nonlethal capture/custody. |
| M3-11 | pending | Intact local occupation requires present control/garrison and preserves building/person/project identities | No matching executed evidence. Local intact occupation is unpublished; society-wide treaty annexation is not this gate. |
| M3-12 | pending | Domination/vassalage uses local leverage and real continuing obligations rather than remote instant transfers | No matching executed evidence. Remote strength-ratio treaty acceptance is not actual local sustained domination. |
| M3-13 | pending | Withdrawal/release returns surviving actors and possessions and updates local control/custody | No matching executed evidence. Natural withdrawal/custody/control integration unpublished; zero credit. |
| M3-14 | pending | Negotiated aftermath preserves incidents, compensation, agreements and witnessed conflict knowledge | No matching executed evidence. Player-centric peace foundations do not establish full shared-rule aftermath. |
| M3-15 | pending | Raids report actual casualties/loot/retreat and residents resume appropriate civilian work | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-16 | pending | Captivity includes guard cost, injury/resistance/escape, ransom/exchange, integration and organized revolt | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-17 | pending | Militia/formations/basic siege and staffed maintained walls protect actual approaches with era-correct gear | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M3-18 | pending | Full M3 delivery/interception/defense/loot-withdrawal/negotiated-aftermath scenario passes with saves | No matching executed evidence. Current Natural-conflict integrated operation remains unpublished and unaccepted. |

### M4

| Gate | Status | Acceptance | Evidence / limitation |
| --- | --- | --- | --- |
| M4-01 | pending | Need-driven discoveries show observation/sample, performed experiment, demonstrated production and adoption | No matching executed evidence. Existing discovery modules are foundations; visible need-led experiment/production/adoption chapter not yet demonstrated. |
| M4-02 | pending | Residents/players prioritize meaningful practical experiments with evidence and readable blocked reasons | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-03 | pending | Teaching/successors/artifacts/records spread demonstrated techniques through learning/trade/migration | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-04 | pending | Bronze/Iron/Classical advancement keeps 50/75/100 population plus practices/institutions/sustainable unspent reserves | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-05 | pending | Small specialized societies remain competitive through trade and techniques without matching every population threshold | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-06 | pending | Households request support and respond to needs/unequal burdens/allegiance without arbitrary order refusal | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-07 | pending | Political complexity grows with population/diversity/distance/power and has warned negotiation/unrest stages | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-08 | pending | Leaders propose projects/agreements/commitments with legitimacy and continuity consequences | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-09 | pending | Council/ritual/learning/administrative institutions perform actual coordination/participation/training/delegation | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-10 | pending | Practical metallurgy/material production covers garments/pottery/charcoal/copper/tin/bronze/iron with wear/workplaces | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-11 | pending | Four construction families have distinct homes/stores/workshops/civic/defense silhouettes and learned diffusion | No matching executed evidence. Palette/roof variants do not complete four functional architectural families. |
| M4-12 | pending | Player sandstone/plaster/courtyard/waterworks city develops maintained prosperity before selective ornament | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-13 | pending | Dense neighborhoods/work yards/cargo/construction and era-appropriate residents visibly reflect real activity | No matching executed evidence. New appearance reference studies are requirements; no source implementation/acceptance credit. |
| M4-14 | pending | Compact desktop controls expose all buildable structures and knowledge-accurate political/resource/logistics minimap layers | No matching executed evidence. Desktop-only acceptance; no mobile denominator or mobile work is counted. |
| M4-15 | pending | Instrumental activity/culture/era music and spatial rate-limited work/combat sounds remain readable | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-16 | pending | Prosperity victory completes in a dedicated connected scenario and offers continuation | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-17 | pending | Commerce victory completes in a dedicated connected scenario and offers continuation | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-18 | pending | Dominion victory completes in a dedicated connected scenario without compulsory extinction/destruction | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-19 | pending | Knowledge victory completes through demonstrated techniques and a dedicated connected scenario | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M4-20 | pending | Legacy victory completes with bounded nonrepeatable era achievements, identity/history and continuation | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |

### M5

| Gate | Status | Acceptance | Evidence / limitation |
| --- | --- | --- | --- |
| M5-01 | pending | Complete current Stone-through-Classical campaign passes all required release scenarios without command repair | No matching executed evidence. All required current release scenarios must pass together; currently incomplete. |
| M5-02 | verified | Published baseline migration checks preserve historical terrain hashes and camp/needs/paid-project saves | batch1, batch2, batch4. Recorded historical generation hashes/roundtrips plus old-needs behavior and transferable project compatibility. New v11 qualification remains M5-01/03/09. |
| M5-03 | pending | Latest release candidate passes typecheck/build and clean development/production desktop interactions | No matching executed evidence. Earlier c25f405 build/desktop smoke passed, but current unpublished candidate has no final production qualification yet. |
| M5-04 | pending | New map gallery passes close/middle/wide same-landscape, overcast, water/fall/cliff/dune/route/contour-farm review | No matching executed evidence. Root owns the next actual desktop gallery; raw GL cleanliness alone is not visual acceptance. |
| M5-05 | pending | Actual physical geometry agrees with depicted surfaces, farms, water, dry placement and navigation | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-06 | pending | M1 MacBook Air 8GB desktop target meets median <=33ms and p95 <=50ms at 100 visible residents/60 buildings | No matching executed evidence. Target hardware figures are proposed targets, not achieved measurements. |
| M5-07 | pending | Separate 240-300-total-resident stress profile reports CPU/navigation/render/memory and full-pipeline costs | No matching executed evidence. Postprocess final-pass call count is not full-scene draw-call/frame-time evidence. |
| M5-08 | pending | Major mechanics expose named parameters/units/reasons/outcomes and meaningful-decision/chapter metrics | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-09 | pending | Fixed regression and rotating holdout scenarios improve intended outcomes without conservation/save regressions | No matching executed evidence. Current integrated acceptance evidence is missing or narrower than this gate; existing modules/test-source alone earn no credit. |
| M5-10 | pending | Packaged published first release preserves saves/preview/later-era content and records exact evidence/remaining expansion scope | No matching executed evidence. A maintained preview/batch push is not the completed first release. |

## Scope and counting rules

Every gate has equal weight. Regressions revoke credit. Changing scope/denominator requires a documented new baseline version. Each batch/push reports batch passed/total separately from this full release checklist. The complete catalogue mapping, evidence scopes, preservation requirements and deferred expansion scope are retained in the JSON ledger; deferred expansions are not counted as delivered.
