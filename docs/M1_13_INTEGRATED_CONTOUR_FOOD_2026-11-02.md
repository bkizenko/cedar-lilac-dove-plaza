# M1-13 connected contour farming qualification — November 2, 2026

Exact gate: **Seed-funded expandable farms follow contours and support soil/fallow/preservation/milling decisions.** This work adds test/evidence only; it does not change simulation or independently award gate credit.

## Integrated scenario

`node --import ./scripts/game-loader.mjs --test --test-concurrency=1 scripts/integrated-contour-food.test.mjs`

The test drives ordinary `Game.step` across 3,601 simulation seconds (two complete crop years). Initial controlled endowment: three adults, 900 provisions, 200 logs, 80 stone, 24 seed baskets and 160 L collected water, plus an existing hall/hut/four stores. Weather, births, calamities, raids and rival thinking are delayed at fixture creation. The authored heightfield is a real sampled 4% x / 2.5% z slope; no height query or movement rule is replaced. No resources, actors or crop progress are granted after initialization.

The household physically pays and builds a hearth, grinding stone and oven. Two fields consume 12 seed baskets through actual marking and expansion. Enlargement halves the planted fraction while conserving its already-sown absolute area; subsequent sowing/tending/harvesting requires workers to walk among the actual rows. Fields do not flatten or alter any terrain samples. At autumn, 212 actual grain instances are checked against their sampled root heights.

The first crop yield is 936 physical units. A second continuously cultivated expanded field crop adds 549; all 1,485 units are carried home. Eight of that grain is debited into eight delivered flour, then eight bread, through manual and dedicated workplaces. The manual grain batch is interrupted, saved, decoded and resumed without a second grain charge or reset work. Manual elapsed milling/baking are 70.2/49.0 seconds; dedicated stations are 29.0/29.4 seconds in this controlled run (travel and acquired practice included, not universal timing promises).

Food preservation is real warehouse work: an explicit worker improves unprepared store care using actual logs and lowers the current spoilage forecast. Existing food assignments continue maintenance over the run. A field rested for the second year returns to fertility1.0, while the continuously cropped field falls to0.76; it produces no harvest during fallow.

Exact final balances:

- Food: 900 +1,493 received −459.98555 eaten −572.62285 spoiled −8 milled =1,352.39160.
- Seeds: 24 −12 marking/expansion +1,485 returned harvest ×0.08 =130.8.
- Logs: 200 −14 station construction −2 bread fuel −101 timed store-care payments −8.85492 heating fuel =74.14508.
- Stone: 80 −18 station construction =62.
- Water: 160 −86.42784 drinking −4 baking =69.57216 L.

One integrated automated scenario passes. The repeated verification runs are not counted as additional scenarios. The controlled terrain is reinstated after decode, without repositioning actors or repairing paid work/inventory. This authored test alone does not prove natural-world terrain reconstruction or visual acceptance.

## Natural V16 inspection fixture

`scripts/create-natural-contour-food-visual.mjs` independently generates an importable natural-world save using ordinary public placement, expansion, staffing and `Game.step`. To regenerate from the repo:

`node --import ./scripts/game-loader.mjs scripts/create-natural-contour-food-visual.mjs .play/natural-contour-food-visual.json`

It uses seed −935736685, generation16, Standard Archipelago, with no terrain changes. Initial inspection endowment: known grain, 700 provisions, 100 logs, 40 stone, 16 seeds, 100 L water, and a previously cleared campsite (234 trees removed at setup; clearing labor is endowed, not qualified). Marking and expansion actually debit eight seeds. The crew walks 264.1 m, sows in spring and tends in summer without forced crop progress. The saved autumn crop contains149 grain.

Field3101 is at(−42,182), size16.4×8.2 m, near camp(−54,146). Actual full-footprint height range is0.765 m, max grade0.210 and contour angle−0.697 radians. The V16 heightfield SHA256 `6bd64cc3ed9382d1253901fb1b34dada6bd148d05676e9ab798a193af4c93454` matches after ordinary save/decode with no fixture terrain reconstruction. The ripe crop also survives that decode unchanged. The local save is deliberately kept under ignored `.play/`, not committed.

Root should import this fixture and inspect actual rows/roots/surface fit on the natural slope before deciding whole-gate visual acceptance. This is an inspection setup, not an emergent campaign or difficulty-balance proof. Other crop types/biome transitions, terrace construction, irrigation/traction and broader survival campaigns remain separate requirements.

Integrator review: the scenario was re-executed successfully on the combined920952a +tool-maintenance/camera candidate. Actual natural V16 field inspection also passed (selected149ripegrain and visible contour rows), recorded in screenshots/natural-contour-field-camera-fixed.png. Final whole-gate disposition and controlled fixture limits are in docs/TOOLS_CAMERA_SURVIVAL_2026-11-02.md and RELEASE_PROGRESS.json.
