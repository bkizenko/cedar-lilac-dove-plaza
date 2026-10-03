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

## Survival and landscape block — 2026-10-02

Implemented:
- Pale, slowly moving fog-of-war overlay conforms to terrain. Unexplored ground is mist-colored and remembered land lightly veiled. Visibility/targeting rules remain in place. Reduced normal distance haze, vignette and film grain. First spring no longer inherits winter snow cover.
- New settlements begin with civilians, including rival camps. Hunting remains a villager assignment. Permanent spear training/drill starts at Bronze with the existing surplus requirement; temporary emergency militia remains available earlier.
- Explicitly selected adults with empty hands can raid without changing profession. Children and unselected villagers are excluded. Explicit adult combat orders take precedence over automatic shelter behavior.
- Grassland favors crops; woodland favors gathering/timber; uplands have lower crop yield and greater winter food demand. These are initial tunable habitat effects, not a complete ecological simulation. The village ledger explains the local habitat.
- Updated obsolete hints about training people and hunters.
- Exhausted minerals stay depleted. Habitat affects vegetation recovery. Wildlife recovery requires spring/summer, a surviving nearby herd, unseen dry ground and an available depleted population slot. Full extinction no longer magically repopulates from nowhere.

Validation: all 283 full-suite tests passed. Final production build and type checks passed. Three diagnostic full-year construction scenarios (same terrain, each habitat profile) completed farms and storage and survived: grassland 10 people/306 food, woodland 11/323, uplands 11/236. These scenarios started with 160 timber to exercise construction and are not proof of unassisted opening balance. Random simulation events mean these are observations, not reproducible balance targets.

Remaining acceptance: visually inspect fog on desktop/mobile and listen to the changed score once the existing browser-access block clears. Continue with survival-year balance across natural seeds, more meaningful tools/preservation, and distinct tribal growth. No claim of full overhaul completion.

## Exploration, growth and winter preparation — 2026-10-03

Implemented this phase:
- Explored land now has a light veil; thick shrouding remains over unknown terrain.
- Player work assignments and resource search require discovered resource locations. Hunting requires current sight of the animal and stops tracking a herd after sight is lost. Construction/hauling tests explicitly establish prior scouting knowledge.
- Felled trees recover over 3–5 game years before habitat/weather modifiers, rather than a few minutes. Minerals remain finite.
- Winter gradually removes uncollected wild forage; it does not regrow until spring. Winter fishing is slower. Fields still require actual sowing, tending, autumn harvest and delivery.
- Storehouses shelter limited food quantities. Workers can maintain food preservation with labor and timber when reserves permit; urgent food gathering retains priority. Preparation decays and is saved. Summer spoilage is greater than winter spoilage.
- Ledger shows food losses, preservation state, full annual field capacity (including habitat/soil), and an estimated winter requirement. The estimate explicitly assumes adequate capacity, current population/weather, maintained stores and no new income; it excludes pre-winter consumption.
- New games welcome migrants by default. Existing explicit growth choices remain intact. Births require reserves, housing and enough supporting adults; well-provisioned families can attract additional adult kin. Children mature at 16 game years, so migration supports near-term workforce growth.
- Replaced the old approximately one-year aging cutoff with adult ages of 18–42 initially and old-age thresholds of 58–77, independent of season. Version-17 saves without the new demographic marker migrate into this age scale.
- Fever no longer randomly kills victims immediately: it causes recoverable damage, with recovery supported by food. Combat and starvation remain threats.
- Worker training no longer creates people, even when migration is enabled. Obsolete worker queues refund their cost.

Validation: 289 tests passed (257 script/game and 32 application/auth), production build and type checks passed. Three one-year construction diagnostics completed farm/storage and survived; observed final populations were 11/11/9 and food 181/163/40 for grassland/woodland/uplands. These runs used extra starting timber and preceded the final surplus-kin refinement; they are observations, not comprehensive balance proof. Full multi-year natural play, interface/fog visual checks and listening tests remain outstanding.

Browser QA remains blocked. On October 3 the browser inventory showed no tabs; automatic approval review rejected creating a fresh preview tab as a workaround for the earlier cached-page denial. Explicit user approval was requested. Do not attempt alternate browser surfaces or indirect automation while this is unresolved.

Next phases: verify the live interface and full survival loop; deepen equipment/tool production and useful building upgrades; then linked technologies and distinct tribal growth/diplomacy. Full feature parity with the reference games remains far from complete.
