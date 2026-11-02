# Connected M0 command qualification — November 2, 2026

Frozen runtime: `c66304cc24ad9036132b1227c727871b54863924`. One connected test passed in 8.37 seconds (8.66 seconds including runner). All 264 runtime source files matched the frozen Git export before and after execution. No runtime patch was applied.

## Proposed gate coverage

- **M0-11:** “Priority and recall changes conserve full-handed cargo, escrow and paid construction across interruption.”
- **M0-12:** “Full M0 integrated scenario passes direct override/recall/construction/paid-work resumption without repair.”

These are proposals for integrator review and publication, not changes to the fixed 98-gate ledger.

## Connected execution

The fixture starts on actual V14 seed 1, pangaea, 1040-metre terrain. Its five original residents and native resources remain. Before work begins it receives finite stocks: 300 logs, 150 stone, 1,000 provisions, 16 clay and 200 litres water. Clear/quiet conditions and deferred outside reviews isolate commands. Terrain, passability, positions, worker paths and resource amounts are never replaced or flattened. Natural initial exploration is retained.

Twenty-three declared public gameplay commands execute through 1,162 ordinary `Game.step(.2)` calls over 232.4 simulation seconds:

1. Pay for, walk to and build a hearth and crafting shelter.
2. Debit four clay and two litres water for actual carried hand-forming work; a direct movement order pauses that paid batch.
3. Gather a real **full 28-log load** from an initially explored, reachable 46-unit tree. Change priority with Auto work enabled. Step the simulation and verify physical return begins while all 28 logs remain on the resident, before sounding recall.
4. Pay for a hut and assign the full-handed resident; recall with the timber, clay commitment and paid hut all still present. Save and restore before delivery. Timber is credited only after physical home arrival.
5. Physically unload the paid clay into committed cache capacity without refunding it into available stock. Save/restore. Assign the original maker to the paid hut, then let a replacement collect the original batch.
6. Interrupt the hut at **15.325855%** progress with a direct movement order. Save/restore; a replacement builder finishes the same paid site while the replacement maker produces and returns four greenware.
7. Pay eight logs/one stone for a sled at the supported crafting shelter. Interrupt after **5.14117 work seconds**, save/restore, explicitly resume the same paid project on another adult and finish one owned sled.
8. Save/restore completed work, then advance another two seconds and assert no duplicate goods, delivery credits or equipment.

Every simulation step checks that original residents remain alive, the heightfield is unchanged, no simulation errors occur and no actor owns two actual paid executors. Original residents physically walk 10.2–53.0 metres over the native slopes. Five strict restores compare actual positions, HP, cargo, site/project IDs, paid progress, owners and stocks; absent optional fields are compared by their serialized meaning.

## Exact accounting

- Logs: **300 initial + 28 delivered − 70 paid − 0 fuel = 258 final**.
- Stone: **150 initial − 7 paid = 143 final**.
- Clay: **16 initial − 4 paid = 12 available**, plus **4 greenware delivered once**. Parked clay remains committed rather than refunded.
- Water: **200 − 2 production − 9.296 bodily consumption = 188.704 litres final**; no delivery/loss or midrun grant.
- Food: **1,000 − 45.284545 consumed − 134.195738 spoiled = 820.519717 final**; no incoming food reward.

## Limits and separate finding

This is one authored component scenario, not a Normal first-winter campaign, all-difficulty/holdout qualification, combat-death test, performance benchmark or deterministic replay proof. The locally seeded test harness does not qualify serialized simulation RNG (M0-09). All-executor atomic goods/capacity migration (M0-07/08) remains separate. Replacements follow explicit ordinary reassignment; no failing timeout is repaired by a corrective command.

The frozen sled eligibility accepts a townhall/crafting shelter, although its rejection text mentions a hearth. The fixture uses an actually paid and built supported shelter; that separate wording/eligibility mismatch was reported without changing runtime source.

Run `node --import ./scripts/game-loader.mjs --test scripts/m0-integrated-qualification.test.mjs`. Optional `HEARTHWILD_M0_REPORT` writes the measured JSON. The companion JSON records the source/test/log hashes, command trace, save hashes, identities and quantities; no complete user village or private save is committed.
