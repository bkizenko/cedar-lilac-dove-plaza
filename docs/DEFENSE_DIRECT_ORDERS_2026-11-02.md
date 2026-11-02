# Defense horn and newer direct orders

Candidate against the frozen `.play/boat-diplomacy-frame-integration` source, with its qualified hunting/boat/frame changes retained. This patch changes only three gameplay anchors; it does not alter boats, visuals, weapons, damage, visibility, health or navigation rules.

## Reproduced bugs

1. On native seed1/V14/pangaea1040 terrain, a healthy resident takes the actual finite spear at the camp. The horn mobilizes the band, then the player gives that armed resident a new Move. Other actual defenders kill the remaining authored intruder through ordinary `Game.step`. At5.6 simulation seconds in the failing control, `finishSeaRaid` unconditionally sets the moving resident `demobilizing=true`, cancelling the new order. Periodic alarm protection already worked; the separate raid-ending path did not honor it.
2. `combatAI` changed an armed resident's completed `stationOnArrival` Move to `idle`. Civilian movement already changed it to `hold`. Thus the promised “wait here” station could become an automatic fighter or be recalled by a later raid-ending transition.

## Narrow change

`finishSeaRaid` skips automatic stand-down only for a healthy resident with no active emergency and an explicit armed order. Actual alarm responders continue returning their weapons. Explicit Manual Stand Down still overrides the station. Armed Move arrival now uses `hold` and reports that the resident awaits orders. `explicitArmedOrder` recognizes the persistent `hold + stationOnArrival` station as well as an in-progress Move/Attack/Attack-move.

The existing **50% health threshold remains**: injured residents can seek shelter under an alarm even after an armed order. Children, custody/protected duties, observed enemy visibility, local alarm bounds and finite arming remain unchanged. No claim is made that a horn reveals an unseen intruder or equips someone from remote stores. Initial native residents in the tests physically recall to the supply approach before manual arming.

## Evidence

`defense-native-orders.test.mjs` adds five ordinary `Game.step` scenarios on unchanged generated terrain:

- Existing armed resident advances to an actual visible intruder and personally attacks (own combatXP plus target damage), then automatically stands down.
- New direct Move survives periodic reviews, then the same body's explicit Attack reaches and damages the selected target.
- A newer Move survives strict save/load and Resume, other defenders kill the remaining intruder, and the real raid-completion transition preserves the order/equipment.
- Armed Move reaches a real station, becomes `hold`, and preserves that station across strict save/load.
- Responders receiving no newer direct command still physically return and stand down. Stores plus actual equipped residents equal **one finite weapon every step**, including temporary handoffs; after all alerts end the spear is in stores exactly once.

The fixture declares finite initial food/water/one-spear stock and authored held baseline enemies/raid-campaign context. It retains all five original player bodies and native geometry. This proves the targeted transition/control semantics, not natural raid frequency or fresh-camp difficulty balance. Imports intentionally pause; the saved continuation explicitly performs ordinary Resume, and every drive asserts clock advancement. No terrain, actor-position, stock or health corrections are made during play.

Previously run legacy horn, neighborhood, live-order and camp-militia regressions passed21 distinct checks (one optional private-save check skipped). Five final native cases pass after the save driver resumes imported games. Typecheck passes. Parent owns final integration/compiler/desktop acceptance. No new release-gate credit is claimed.
