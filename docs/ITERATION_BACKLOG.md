# Hearthwild iteration status

## 2026-09-29 recovery and trade iteration

The current preview runs from a persistent `.nosync` checkout. The former temporary checkout disappeared; an ordinary Documents checkout then had source files offloaded by iCloud. Keep the active checkout outside automatic cloud offloading and temporary cleanup.

`startup.sh` accepts `DAWN_PORT` (default 8080), supports `DAWN_FOREGROUND=1`, and uses an installed compatible bundled Node runtime if the system runtime is too old. Local preview logs live in ignored `.preview/`.

Implemented in this iteration:
- Negotiated single shipments in the settlement ledger: choose offered goods, quantity, and requested goods.
- Quotes reflect partner reserves, trust, tension, and available metals. Discover settlements before trading.
- Goods travel with an existing adult carrier; dispatch deducts cargo and does not instantly credit the return goods. Existing save behavior preserves the shipment.
- Urgent food gathering and seasonal harvest retain priority over community tree designations.

Validation: production build and type checks passed. All 277 automated tests passed (245 script/game tests and 32 application/auth tests). Interactive visual checks remain pending: the browser tool rejected access to the cached error page, and the user was asked to refresh it. HTTP success alone does not establish browser rendering success.

## Ordered remaining work

1. Play a complete survival year across multiple seeds; diagnose idle labor, food shortages, construction, travel and defensive response.
2. Extend single shipments to recurring agreements with delivery history, duration, and cancellation.
3. Deepen preservation, storage, tools, and equipment through actual inputs, labor, and hauling.
4. Connect technologies to prerequisites and practice; integrate population and surplus requirements with age progression.
5. Expand functional building families with distinct utility and upgrade paths.
6. Make tribes more distinct through geography, economic priorities, motives, migration, and rise/fall.
7. Model soils, seasonal farming, fodder, traction, and plows through labor productivity. Avoid a universal fixed agriculture percentage.
8. Improve combat roles, counters, morale, and congestion before commanders and formations.
9. Refine sparse seasonal acoustic music using distributable, documented assets.
10. Add cohesive detailed visual assets after profiling, recording licenses in THIRD_PARTY_ASSETS.md.
11. Add disease with observable causes and counterplay; defer deeper ground-level interaction.

The full requested overhaul is unfinished. A meaningful overall percentage requires agreed release acceptance criteria; the list above is a work inventory, not a claim of feature parity with Dawn of Man, Age of Empires, or Civilization.

## 2026-10-02 opening, soundtrack, and survival baseline

- New games now use the established settlement entry for both button and Enter. One completed player hut remains alongside the hall. The alternative band-founding simulation method remains available internally; existing saves are unchanged.
- New games start clear with a 300-second weather timer. Seasonal ground snow no longer forces falling precipitation under clear weather.
- Replaced the active folk loops with two attributed solo-piano recordings, seasonal selection, 12-second fades, lower default volume, and 60–105-second rests between pieces. Battle orchestration remains opt-in through the calm-soundtrack control.
- Full suite: 278 passing tests; build and type checks pass. The added audio-rest behavior also passed a targeted rerun.
- Three unattended 1,800-second simulation runs (seeds 12, 345, 6789) survived with 222, 193, and 127 food respectively and 7, 6, and 7 people. All remaining workers were gathering or returning cargo at the final sample. This is a diagnostic baseline, not interactive proof of construction, raids, or complete balance.
- Preview HTTP check passed. Interactive visual/listening verification remains outstanding under the previously reported browser access block.

Next survival validation: actively construct farms and storage, harvest through autumn, and test withdrawal/defense during raids. Continue remaining systems in the order above.
