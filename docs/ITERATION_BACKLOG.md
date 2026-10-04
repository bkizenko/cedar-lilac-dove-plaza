> Current remaining-work source: [FUTURE_IMPLEMENTATION.md](FUTURE_IMPLEMENTATION.md). The chronology below is historical; newer requirements and verified fixes supersede its older missing-feature descriptions.

> Latest requirements: read [REQUEST_AUDIT.md](REQUEST_AUDIT.md). The 2026-10-03 user correction requires natural practical development rather than spending exploration points, traveling trade reports rather than live remote knowledge, and explicitly queues sleep, storms, domestication, named people, dynamic settlements, waterways and administration. It supersedes conflicting older plans.

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


## Sol continuation — 2026-10-03: work, exploration rewards and caravan risk

The preceding exploration/checkpoint/handoff changes were committed as `53bf156` and pushed to `main` before this continuation. Browser access is now restored: a fresh in-app preview loaded successfully, the ledger rendered with the new traditions, and a selected villager accepted a Logs order without a lumber camp. Keyboard selection and village focus were exercised. Earlier browser-block notes above are historical; desktop/mobile coverage and long natural survival play remain incomplete.

Implemented:
- Any discovered, reachable live tree can be cut without a lumber camp. Automatic and locked wood assignments use the same rule. A finished nearby camp still reduces cutting time by 42%; camps elsewhere give no blanket prerequisite/penalty. Removed the mandatory-camp opening objective.
- Manual move orders wait at their destination. Scouts and stationed adults remember their orders across emergency shelter/militia response and save/load.
- Standing stones award historical discoveries rather than unexplained food/material caches. Favorable random-event payouts and daily territory stock payouts were removed. Local territory gathering bonuses remain tied to actual work.
- Nine one-time discovery/preparation milestones earn legacy points. Spend twelve on Pathfinders (scouting/caravan speed), Winter stores (capacity and ordinary spoilage), or Woodcraft (cutting efficiency), at most one per age. These are saved, budget checked and shown in the Village ledger. They do not replace the practical technology graph still to build.
- Age choices have larger storage, preservation, timber, health and damage benefits. Age commitment now rechecks population, building variety and resources. Removed free people from the final military choice and the hidden watchtower placement; Watchfires actually extend sight.
- Partners protect seasonal food and basic construction reserves and may refuse unwanted offered goods. Quick exchange now sends a real carrier to a known willing partner. Market knowledge improves terms; the seller loses every unit returned as cargo. Quotes, dispatch, recurring routes and arrival check willingness; damaged outbound shipments return remaining cargo without exchanging missing goods.
- New games may generate one or two remote land raider camps, with two initial band members each and no replacement spawning. A five-minute grace and Quiet frontier prevent proactive theft. Bands patrol locally, see nearby carriers/stores, steal up to four real goods, haul them back and retaliate against attacks. Destroying the camp scatters survivors. Existing sea raiders retain their separate behavior. Camps and home references persist; old saves are not retrofitted.

Validation: 305 full-suite tests passed (273 scripts/game + 32 application/auth). After removing daily territory payouts and polishing camp descriptions, nine focused tests passed; production build and type checks passed. Live preview shows ledger traditions and wood gathering. This is not a claim that the entire overhaul or late-game balance is complete.

Limits / next ordered work:
1. Multi-year opening balance across ordinary seeds and each habitat, including consequences of removing passive region income; test manual order overrides during alarms. More UI checks on wide and narrow viewports.
2. Physical local stores, transport and persistent source materials; raider store theft currently subtracts faction food at a physical warehouse because per-building inventories do not yet exist. Improve escort commands, theft warnings, and injured/surrendering band behavior.
3. Material/item economy: tools, warm/light clothing, preservation recipes, equipment and useful building upgrade branches. Adapt shelter choices to habitat and season.
4. Seeded regional resource asymmetry that makes some materials locally scarce while preserving a viable early survival path. Catan-inspired incentives to explore/trade, not an arbitrary universal trade tax. Current terrain deposits and habitat yields vary, but do not yet guarantee this acceptance criterion.
5. Organic experimentation/technology graph and population/density/material gates; richer era challenges distributed across later ages, with meaningful benefits. The current nine milestones are a first foundation.
6. Distinct rival goals, economic growth and setbacks; diplomacy terms and counteroffers; refugees/new camps; later regional secession and empire administration. Remove hard-coded faction assumptions before expanding the tribe count.
7. Full end-to-end survival → developing village → rival trade/war → multi-settlement empire acceptance from `SOL_EXECUTION_HANDOFF.md`, excluding the visual/3D overhaul.

The user plans a separate prompt to inventory historical/cultural/scientific development features. That inventory is intentionally reserved for their next request; do not substitute it for execution now. Keep prioritizing working gameplay and transparent systems over extra feature count.

## Request audit and immediate corrections — 2026-10-03

Read `REQUEST_AUDIT.md` for the consolidated requirements from the original prompt and all visible user requests in this chat. This supersedes contradictory older plans: natural practical development, no point-spending controls, no live border-pressure management, and trader-carried knowledge are explicit requirements.

Implemented in this phase:
- No decorative grass allocation/wind shader; existing terrain and crop visuals remain. Verified development hardware is M1 MacBook Air with 8 GB shared memory and a 7-core GPU. Remaining performance has not been profiled and is not claimed fixed.
- Direct group wood orders and clicked resource orders now share job reservation capacity. At most two gatherers are assigned to a tree; surplus workers use other suitable known work sites. Hunting stays a civilian job and uses visible herd tasks.
- Added wood, stone and hunting village priorities. Finished lumber camps make nearby trees eligible beyond the ordinary local work-distance limit and improve their task priority. Explicit remote workplace staffing/rations/security is still needed; this is not a guarantee that remote work will beat all nearby tasks.
- Removed the Border pressure selector and exploration point-spending controls from the ledger. Existing save fields and previously adopted benefits remain compatible. Practical experiments and study are still pending.
- Sustained taking of resources beside a rival hall causes lost trust, warnings and eventually hostility. Visits alone do not trigger this rule; alliances and active food/grazing compacts permit their corresponding activity. Hall-radius claims are provisional until shared settlement influence/perception is complete.
- Territory tint now fades outward from buildings. Added one instanced cargo-bundle mesh, colored by real carried resource; foreign bundles remain hidden outside vision.
- Ledger names the month within a season; farm construction timber reduced from 50 to 20.

Validation: 310 tests passed (278 script/game + 32 app/auth); production build and type checks passed. Four new regressions cover group tree capacity, trespass versus visiting, fading territory strength, and new priority persistence. Live visual verification is incomplete: the existing in-app tab is listed but repeatedly times out when attaching. No claim of visual/performance acceptance from successful builds alone.

Next high-priority block: traveler/envoy reports with dated, imperfect information, physical gifts and negotiation; remove current remote-stock quoting. Then provisions/local inventories and sleep/storm shelter, followed by the ordered audit phases. Every requested unfinished feature remains explicitly listed.


## Save continuity and traveling diplomacy — 2026-10-03

User's current village must not be lost. No restart/reseed was performed. Save key and version remain 17; all new fields are optional and validated, so established terrain/people/buildings/orders can load. Browser-session local storage has not been directly inspected or copied during this block; do not claim the user's actual current live snapshot was independently verified.

Implemented:
- Protected checkpoint slot separate from primary/rolling backup; autosaves do not overwrite it. User controls: Keep checkpoint, Restore checkpoint, Download village, Import backup. Import validates before replacing state, protects the current active game first, and refuses if protection fails; downloads also work as an independent JSON backup. Keep serving the same preview origin/port because browser storage is origin scoped. Do not regenerate terrain to introduce future content into old saves.
- Locked wood orders scout when no suitable known timber site exists, then use shared tree reservations when discovered. Crowded/unsafe known sites do not falsely imply no timber. New move/rest/explore/stop commands cancel search/delegation intent.
- Sowing/tending/harvest receive stronger seasonal priority. Under 90 seconds of reserves, immediately edible wild food can still outrank field preparation. AI field building uses the actual reduced timber cost.
- Well-provisioned welcome arrivals can bring outsider groups of 1–3, limited by housing and food. Existing rival-to-player migration remains single-person for now; future household/refugee groups should preserve donor people and family links.
- Recall horn (button and V) cancels raids/exploration/delegations and brings children/adults/soldiers home, banking carried cargo there and holding for orders. It does not teleport units. Ledger provides selected-adult raid/pillage campaign orders, separate from home labor priorities.
- Player raid/attack orders do not cause instantaneous distant declarations. Hostility begins at actual raid/attack contact; rival raid departure no longer instantly sets hostility either. Physical observation is presently represented by proximity around the target/community center, not a full per-faction perception model.
- Trade, peace and gift delegations use existing adults. They walk to a discovered community center, meet for twenty seconds, then return. A trade report is published at home only on return, survives mid-journey saves and expires after fifteen simulation minutes. Home shipment proposals/quick exchange/offer lists use those dated reported terms, not current remote stocks. Arrival can refuse if partner needs/stock changed; goods remain with the carrier.
- Peace is negotiated on arrival, not remotely from a button. Nearby ongoing player raids cause refusal; accepted truces use existing ceasefire/withdrawal machinery. Gifts deduct thirty food at departure, visibly carry it and credit the recipient/improve trust only at delivery.

Validation: 317 full-suite tests passed (285 script/game + 32 application/auth) before final gift/recall refinements. Twelve focused tests passed afterward, plus one seasonal-field test; production build and type checks passed. New regressions cover independent checkpoint recovery, unknown timber search, real cargo on recall, children/soldiers, delayed raid hostility, outgoing/returning reports and staleness, traveling peace, physical gifts, group capacity, and seasonal field priority. No live visual verification this block; the user's established browser session was not reset to clear the earlier connection timeout.

Remaining: substantial overhaul work in the requirements audit/catalogue. Reports are currently simple offered goods pairs; treaties/grazing proposals and some recurring-route generation still need full traveling negotiation/perception. Delegates have no journey rations yet. Peace acceptance needs richer incentives/personality and geographic safety; report UI delivery of peace outcomes is basic. Sleep/storm shelter, wear, physical local inventories, tool/clothing chains, domestication/nomadic strategies, practical artifact study/tech graph, distinct growing/collapsing rivals, multiple settlement administration and water transport remain. Do not describe this phase as a feature-complete game.


### 2026-10-03 — foundations for the expanded human-development scope

- Accepted every formerly optional catalogue item and consolidated the latest requests into eight dependent execution phases. Added Vitruvius and geographic interpretation boundaries. The full overhaul remains unfinished.
- Construction staffing skips explorers, envoys, recalled people and existing builders. New construction receives two slots and outranks routine gathering when reserves exceed 90 seconds; emergency food still wins. Remote/manual locked labor can still leave a site short of workers and needs an explicit workplace staffing interface.
- Selected remembered resources have a yellow ground ring; resource materials are not recolored by selection. Farm ghost tint grades from ochre to bright green by site potential; invalid placement remains red. River proximity, biome and slope affect harvest yield independently of fertility depletion/fallow.
- Removed the small-population famine immunity for all ages. Hunger accumulates only with empty stores, has a three-minute grace period, gradual health loss thereafter and faster recovery with food. Optional hunger state validates and round-trips in existing version-17 saves.
- Reports are published at the destination meeting. Added player-authored proposals without a prior report; carriers bring real offered cargo, negotiate there, accept the displayed policy of smaller counteroffers or return refused cargo. Local terms use reserves, relationship, stable trader ability and bounded meeting variation; no remote stock lookup in proposal dispatch. Counteroffer approval/minimum acceptable quantity and recurring agreements remain later work.
- Stable identity-based predispositions influence size, appetite, movement, construction strength, fighting and local trade. Existing citizens retain identity across saves; cached weak references avoid repeated hash work per frame. A named citizen traits UI and learned skill progression remain incomplete.
- Increased the fading territorial wash for readability; the fresh renderer change is not yet visually verified in the ongoing game. Ground tint already conforms to terrain; do not replace it with a flat plane.
- New-game randomized biomes must be versioned before implementation: saved terrain is reconstructed from the original seed, not serialized. Altering the generator directly would silently change ongoing worlds. No generator changes or active-world resets were made.
- Remaining major phases include equipped long expeditions/night camps, worn paths for all factions, hunting expansion, climate/site systems, natural discoveries/domestication, robust combat and richer rival evolution. These are explicitly not completed by this block.

- Preview recovered at the existing port 8086. Resumed the existing save, paused it and explicitly kept a protected checkpoint; UI confirmed autosaves cannot replace it. Did not begin/reseed a game. Screenshot: `.preview/protected-village-oct3.png`. Direct mesh picking was added after observing that canopy clicks otherwise test terrain behind the tree; a fresh renderer visual check remains outstanding.


### 2026-10-03 — terrain continuity and visitors

- Versioned map generation: old saves without `worldgenVersion` keep generation 1 exactly; new unseeded games use generation 2 with wider/broader relief, large lakes, wider varied rivers and shuffled starting habitats. Saved versions reconstruct the same terrain. Explicit-seed reset defaults remain generation 1 for backward-compatible callers; opt into generation 2 explicitly.
- Territorial projection radii increased 45%; added a colorful fading contour band. Visible/remembered map masking still prevents hidden territorial information. Fresh appearance requires visual checking.
- Village-wide priority changes clear current job locks and assignments, including resting/exploring workers; carried loads and diplomatic missions complete before switching. Children retain dependent status.
- Added all-villager previous/next buttons, including children; comma/Shift+comma cycle via keyboard without replacing existing bracket resource navigation.
- Removed hidden village counts from HUD. Renamed checkpoint buttons to Save/Load backup copy with explanatory hints; underlying protected save is preserved.
- Hunger now steadily affects health and movement after a brief five-second grace period, with approximately 150 simulated seconds (one compressed calendar month) to death at average appetite. Fed people lose hunger three times faster. Day/night and year calendars have a pre-existing scale mismatch that still needs harmonization and is recorded in the catalogue.
- Foreign traders use existing adult villagers and deduct actual export cargo at departure. They travel, wait up to 120 seconds at the player hall, offer payment-resource choices based on their needs/relationship, and transport payment or unsold goods home. Waiting/return missions validate and round-trip through saves. No new people are manufactured. This is not yet a general diplomacy visit screen or foreign-exploration system.
- Outstanding: foreign exploration/knowledge maps; river boats/navigation bonuses and walking-trade balance; village foundation/collapse/refugees; warmer/sheltered local climate effects; the rest of the accepted catalogue. No claim of full overhaul completion.

- Verification: full tests passed (330 checks before the final blocked-journey regression); type checking and production build passed. Preview observation timed out, so new visual appearance is not claimed verified. Final visitor fallback preserves cargo and abandons an obstructed trip rather than occupying the visitor slot forever.

- Loaded trade couriers walk at 75% of normal pace, including the paid return leg; ordinary gathering hauls retain their usual speed. Locally negotiated base exchange terms improved from 0.76 to 0.86 before scarcity/relationship/ability modifiers. River shipping remains unimplemented.

- After courier/price changes: 12 targeted trade, cargo, route and navigation checks passed; final type checking and production build passed. The new blocked-journey regression also passed. Automatic standing-route offers still use the older known-partner system; a general visiting-delegation negotiation interface remains part of the overhaul.

## 2026-10-03 journeys, traffic and communities

Implemented provisions for player exploration, finite wilderness forage, night camps and return/refund; ordinary civilian sleep/storm refuge with fatigue and a night-work setting; independent rival scouting; sparse traffic paths shared by all factions; physical survivor refounding and prospering rival expansion using existing residents and timber; player secondary halls with timber and labor requirements; resident names/traits/parents and village life history. Mineral grades no longer reroll. Save fields remain optional with corruption rejection. The protected current village was resumed paused on port 8086 with its original 5 people and 80/39/16 stores.

Remaining limitations are explicit in HUMAN_DEVELOPMENT_CATALOGUE.md. Scout knowledge is currently shared while away; incoming traders still have a legacy knowledge shortcut. Local community records currently share faction stores; they are not yet independent regional economies. Survival, development, diplomacy and combat still need the remaining accepted chains. Do not claim the 120-item overhaul is complete.
