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
