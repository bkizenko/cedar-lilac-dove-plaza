# Finite overland camp residents, provisions and support

Scope: a new-world, bounded overland extension to the already seeded two-person raider camps. This does not qualify finite naval recruitment, camp annexation, a replacement population model, an independent per-camp warehouse, or a sustained FPS improvement.

## Actual behavior

- New worlds set `finiteRaiderCampVersion:1`. Older saved camps without this optional marker retain their previous patrol/forage behavior; existing naval parties and their plans are not converted.
- Existing guards observe hostile town halls/stores within22m (12m at night). A dated report stays with its observer and reaches camp through real walking before it can become a camp dispatch objective. Reports expire after300s and are bounded to12 sites; enemy stock is not read by this decision.
- A camp can reserve one existing, eligible guard for a paid overland loot trip only at its actual supply approach while another actual guard is physically home. Paid food covers180s at that person's existing appetite rate; survival water covers180s (1.44L). Actual home meal/water floors remain. A shared coordinator claim owns the actor and one outbound slot, and reconstructs after restore.
- The same paid body uses the existing nonlethal loot executor: approach an actually standing store, perform finite collection work, carry actual goods, and physically return. A55s outward deadline leaves its remaining pack for return. No person or boat is spawned by dispatch. Pack consumption is independent of communal demand, and unused provisions enter storage only at an actually reached owned supply entrance.
- A destroyed home does not delete its survivor/cargo or refund it remotely. The real returning person can walk to another actually reachable owned camp. With no refuge the body and belongings remain visible. Existing lawful annexation excludes team3; this change does not weaken that ownership schema or pretend to support camp annexation.
- Below8L communal water, two actual home guards gather at camp. One puts its existing spear in storage, becomes temporarily unarmed, and performs the existing automatic freshwater collection job. This works with the player's Auto work off. It rearms only after physically reaching camp, at least18L water is available, and an actual stored spear can be consumed. The role changes neither health nor identity. The other guard remains home and still retaliates against actual nearby attacks.
- The water carrier remains a real vulnerable worker. Existing surrender/custody can capture that same person and retain its actual carried water; the inactive historical support record cannot turn a captive into an enemy guard or grant a weapon.
- Death releases the actual trip reservation and records loss; remaining paid provisions are not refunded. Interruption retains the pack. Reports, paid amounts, used amounts, departures, returns and losses remain measurable and strict-save validated.

## Accounting and limits

`FINITE_CAMP_RULES` names every new distance, timer, budget, stock threshold and bound. `finiteCampReport` returns copies without mutating simulation or drawing random values. Its camp records describe departed/returned bodies and paid/used provisions; camp food/water still uses the existing communal team cache. This is not a new physically localized per-camp inventory. Travel food uses the existing scout provisions contract, including its legacy scalar packed-food representation; food-lot freshness in travel packs is not newly qualified.

Initial two-person camp rosters and finite starting food remain existing generation endowments. There are no replacement heads, new recruits, free water, paid hulls or invisible return vessels in this subsystem. Legacy `spawnRaid` still creates shore parties and adds its old food endowment; no finite fleet/camp recruitment gate is claimed. Existing local camp opportunistic stealing/forage remains; broad civilian production and autonomous raider-to-civilization development remain future work.

## Qualification

The public tests use authored initial stocks/actors and either explicitly controlled flat terrain or nativeV14 terrain. Native water collection, water-carrier capture, and paid pack/save/physical return use native reconstructed terrain without repairs. The destroyed-camp/refuge case deliberately uses controlled flat geometry, restored explicitly after its save; it is not native terrain evidence. No private user village or browser FPS result is claimed.

Final evidence is recorded in `docs/metrics/finite-raider-camps-2026-11-03.json` and the exact test/build logs named there. Parent integration must repeat coupled checks on the maintained publication base because this snapshot begins at8836777 plus the frozen river-objective and raid-intent packages.
