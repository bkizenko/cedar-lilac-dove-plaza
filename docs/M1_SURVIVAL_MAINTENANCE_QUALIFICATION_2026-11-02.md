# Joined survival-maintenance qualification candidate

M1-09: “Rest, shelter, clothing, tool wear and repair form a viable survival production loop.”

The dedicated ordinary Game.step scenario passed in the isolated 188df58 export plus tool-maintenance source, with 6,695 steps and 1,391.32 simulation seconds. Parent combined-source rerun and gate review are still required. This artifact does not award release credit.

The initial controlled endowment is finite: 600 logs, 200 stone, 3,000 provisions, 300 litres water, 40 seeds, two raw hides and one bone. Cultivated grain is already known. All six stations/shelter are paid and physically built on unchanged native seed1 V14 pangaea terrain. Quiet conflict, clear weather and deferred initial decision/birth timers isolate this mechanism. No midrun inventory, terrain, body position, clock or health corrections occur.

Actual flesh-hide, drying and sewing projects consume two hides and one bone, deliver one garment to stores and equip its real owner. A newly paid workshop hoe starts at full condition; real sowing reduces it to 0.8986667 while planting 0.8359156 of the two-area field. Actual labor fatigue falls from 0.2791667 to 0.1191667 through physically observed shelter rest. An ordinary move leaves rest before the owner requests repair.

Repair charges exactly one log and one stone. The owner works 2.0946613 progress, receives an ordinary movement override, saves while paused, returns and resumes the same paid project without a second payment. The original hoe finishes at condition 1. Final strict save/load also preserves garment and tool condition.

Natural seasonal cold arrives without a clock adjustment. Two residents walk outside shelter and beyond the actual home-fire radius; their positions remain outside throughout the 30-second paired exposure. The clothed resident gains zero cold-seconds, the bare resident gains five. Both physically return home and clear exposure. Real home heating consumes 2.0502 logs. All five originals survive and simulation errors remain empty.

Exact player ledgers close: logs 600 − 84 construction/tool/repair − 24 in two actual hill-slide calamities − 2.0502 fuel = 489.9498; stone 200 − 11 paid − 12 calamity = 177; food 3000 − 271.7089531 eaten − 2087.5002893 spoiled = 640.7907575; water 300 − 55.6528 consumed = 244.3472. Each unexpected per-step material loss must match the real slide amount and slide banner. Finite natural loss is recorded, never compensated.

Run with the repository game loader:

```
HEARTHWILD_M1_MAINTENANCE_REPORT=/tmp/m1-maintenance.json node --import ./scripts/game-loader.mjs --test scripts/m1-survival-maintenance-qualification.test.mjs
```

The JSON contains commands, paid charges, actual stage metrics, source hashes and save hashes. It contains no full save. This is a controlled joined component proof, not fresh-camp food acquisition, hunting, all-difficulty campaign balance, all-map reliability, hearth-tool support, renderer or performance qualification. Workshop tool semantics are used; parent separately qualifies real hearth support.

Integrator review: the scenario was re-executed successfully on the combined920952a +tool-maintenance/camera candidate. Actual natural V16 field inspection also passed (selected149ripegrain and visible contour rows), recorded in screenshots/natural-contour-field-camera-fixed.png. Final whole-gate disposition and controlled fixture limits are in docs/TOOLS_CAMERA_SURVIVAL_2026-11-02.md and RELEASE_PROGRESS.json.
