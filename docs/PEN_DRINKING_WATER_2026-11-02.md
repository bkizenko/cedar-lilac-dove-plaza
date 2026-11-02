# Finite pen drinking water

This closes a livestock-care mechanism gap; it awards no additional M1-12 or other release gate. Final parent integration is based on published79d6148; the underlying specialist patch was developed from1a90ade.

`PEN_WATER_RULES` centralizes actual demand0.006L/animal/second, 12L maximum keeper load, area-based storage6L/housing place with12L minimum,120-second refill threshold,180-second health grace,1800-second fatal exposure and3seconds/second recovery. Goats drink only while inside their real pen. Dry animals accumulate measured thirst; fed animals still cannot breed, generate milk or heal without enough delivered drinking water. Scarcity eventually harms health. Body thirst is not free water inventory. Legacy optional fields start at zero water/zero pressure and get the named health grace; legacy survival-disabled feeding/breeding remains unchanged.

An assigned actual keeper observes low pen water, walks to a real friendly cache entrance, withdraws finite communal stock once, carries the real burden and walks to the pen entrance. Stock is never credited remotely. Overflow is carried physically back. The same saved work owns its load across direct-order interruption and resume. Reassigning care prioritizes paused same-pen work and cannot overwrite another loaded parcel. Releasing a loaded keeper returns the actual load before clearing the job.

Saved parcel `waterTeam` records the originating ledger. Death, violent capture/team change, owner removal or an illicit replaced work reference spills its remaining water once; it never refunds remote stores or gives the captor free stock. Stored water in a destroyed/removed pen is lost once. A destroyed pen leaves a surviving keeper's loaded parcel intact for physical return, including save/load while the pen is gone. Reconciliation runs before the herd early-return and immediately before the final Game.step body cleanup, covering deaths after the earlier herd tick. Runtime references reset on state replacement and are retained only for real positive stock/loads; the empty reconciliation path returns immediately.

Pen ledger: initial0 + delivered − consumed − lost = stored. Society herd ledger: withdrawn + transferred in − transferred out − returned − consumed − lost = pen stock + carried loads. Communal stock accounts the herd transfer as **−withdrawn + returned**, separately from human drinking and source collection. Strict saves validate nonnegative finite counters, capacity, parcel owner/phase and both herd balances. The test lab displays measured transfers/held inventory and herd balance error; it does not infer an absolute communal error from an unrecorded opening stock and omitted other mission cargo.

Herd demand joins ordinary freshwater collection's actual reserve threshold; an actual carrier must still discover/reach a bank, collect, return and deliver to the cache. A separate keeper then hauls it to the pen. Assigned keeper forecasts already reserve their working time and do not add duplicate water work. Unassigned care adds the exact bounded-load trip estimate; paused parcels and physical returns remain visible with real actor ownership. A paused carried-water owner is not falsely marked free. Compact pen controls show stock/capacity/demand/in-transit litres and per-animal thirst, with resume/release controls that preserve real parcels.

Final combined validation:51/51 checks pass across six explicitly present suites, including11 pen-water tests, existing husbandry/pasture, occupation and planned/production workload checks. Typecheck and production build pass. Actual desktop production import displays3goats,12.0/48L pen stock and87L communal stock, with no captured browser errors. The JSON records source hashes and exact log paths; no full save/private game is included.

The joined physical fixture endows a finite owned pair and an already-paid completed legal pen on unchanged native seed1 V14 terrain. Its mother starts near birth to test water admission, not a full gestation campaign. Actual12L fetch slows the keeper to0.84 loaded pace; public move interrupts, strictsave/load preserves the parcel, and real delivery precedes birth/milk. End at7.8simulation seconds: communal100−12−0.312human drinking=87.688L; pen12−0.0144drunk=11.9856L. Dry, well-fed control animals freeze pregnancy/milk and cannot heal, then lose health after grace. Separate checks exercise known-bank automatic collection, loaded death/deletion, late people-phase death/capture, destroyed/removed pen, stored-water loss, malformed counters and legacy disabled behavior. No midrun stock, body position, health, terrain or clock corrections make these paths pass.

Run the dedicated checks with the repository game loader:

```
node --import ./scripts/game-loader.mjs --test scripts/pen-water.test.mjs
```

Pack-goat and wild-animal water systems, a dedicated trough model, natural campaign frequency and renderer/performance acceptance are separate work. This patch adds no free animals, free feed, source water, stock refund, healing grant or terrain change.

## Intact village handover audit

A final review found a missed cross-society case before publication: stored pen water changed owner without updating its society ledger. Pen water now records its owner and physical stock transfers use separate incoming/outgoing counters. An accepted intact village surrender also preserves the same keeper-carried parcel and transfers the actual animals with their pen. Violent custody changes keep the separate loss path. Communal stock is neither credited nor debited during this transfer: it is the existing pen/load stock that changes owner.

A controlled held-village opening exercises the actual `integrateOccupiedVillage` command separately with water still carried and with water already delivered. It preserves the exact animal IDs/health, building health, water amount and both society balances, rejects duplicate integration and immediately strict-saves while paused. The initial garrison is explicitly already known, so a first-contact modal is not a hidden reason to resume the simulation. The test driver now fails on a stopped clock rather than spinning indefinitely.

Final logs: `/tmp/pen-water-final-regressions.log` (51/51), `/tmp/pen-water-root-type.log`, `/tmp/pen-water-root-build.log`. Browser proof: `screenshots/pen-drinking-water-physical-delivery.png`. No new release gate is credited; overall remains29/98 (29.59%).
