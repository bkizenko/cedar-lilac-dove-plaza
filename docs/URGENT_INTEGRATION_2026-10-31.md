# Urgent integration verification — October 31

The isolated staged-source checkout `.play/urgent-final-cxfebusv` builds and typechecks. Narrow integration checks:48/48 unique tests passed across the43-case urgent suite and5 navigation-cache cases. The first43-case run had two failures because knowledge fixtures omitted weather text; the labor-temperature reader now tolerates absent weather, and all6 knowledge tests passed on rerun alongside the5 cache checks. Earlier failed logs are retained. This is not a full first-winter or Classical release qualification.

## Measured buffering cause and fix

Actual desktop browser, default generation10, Normal difficulty, medium graphics: autosave previously averaged1509.9ms, peaked2423.9ms. saveGame validated the prior snapshot through decodeGame, reconstructing its world/navigation every18 seconds. The same strict serialized schema/reference checks are now shared by restore and a terrain-free autosave validator. Real restores still reconstruct terrain. Regression verifies damaged-primary recovery, validated backups, stale-tab protection and no terrain resets during repeated writes. Updated actual browser readout: autosave mean46.8ms/max48.7ms, longest frame50ms over the preceding600 frames. These are scenario-specific CPU measurements, not a universal FPS guarantee.

Navigation caches retain exact terrain/water/bridge equality and rerasterize current structures. Identical walk grids reuse component labels, while navigation revisions and per-node caches still invalidate. A distance-first lumber-site check avoids testing remote trees before the unchanged local-distance condition. Same-state/same-RNG measurements:139–164ms/885 placement checks before;1.03–1.64ms/5 after, identical returned site.

## Other integrated changes

Camp militia actually unload/disarm and resume work; explicit Hunt retains real weapons and completes hunting/butchery/delivery. Contact offers physical capture, bounded personal questioning, finite carried-goods trade and distinct own-scout return/visitor departure/captive release. Calm music still switches for real attack/defense.

Desktop graphics expose Low/Medium/High; default Medium, shadows off and selected-person rings off, with opt-in controls. Explicit tree designation works with automation off and catches crowns within selection boxes. New unbuilt starts await manual orders; restored saves retain their settings/buildings. The farming report exposes samples, work progress, missing hearth/worker, spring sowing and seasonal waiting. Minimap uses actual local terrain/water and camera footprint.

Food/timber labor is slower with bounded exposed cold/heat/wet penalties; trees/animals remain abundant. Two controlled Normal five-person household audits stayed fed; full winter/raid qualification remains outstanding. Village-specific goods and pottery/container production remain design scope, not implemented inventory.

V12 ecology/materials/contour crops and V13 island foundations are integrated behind explicit generation versions; default map generation remains10 pending V14 continent/edge-family GPU acceptance. Unhooked next-wave work is excluded from this snapshot. Nomadic relocation, fuller contact actions, workload UI, V14 seasonal plants and cardinal gates are separate pending batches.

Overall release ledger remains hearthwild-first-release-gates-v1:15/98 verified (15.31%). No release credit is granted just for staged source or narrow tests.
