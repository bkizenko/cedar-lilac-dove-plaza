# Live village diagnosis and performance correction

Actual Chrome village:57player residents,245total entities,408saved building records, generation7/size1560/year3. Lowgraphics, shadows/personcirclesoff. Actual browser before fixes:10fps, simulation47–50ms mean/108–146ms peak; scene~3ms, drawing~.9ms, map6.4ms, autosave55ms. Thus this slowdown is simulation/search scaling, not cured by cutting shadows. A native UI export produced a local2.1MB diagnostic copy; the game state was not published.

## Exact-state paired correction

- Spatial bounds run before expensive solidity/finished checks, preserving candidate order and thresholds.
- Work assignments build live foe/lumber/rival-reach snapshots per synchronous scan. No cross-frame relationship or worker cache hides new events.
- Each entrance call creates an exact conservative nearby-footprint envelope, then uses the original collision test for each sampled candidate.
- The legacy hostility decision removes redundant ally lookups;262,144Boolean/team comparisons match the original. Independent NPC-pair hostility remains separate future integration.
- Emergency response surveys defended buildings only when an actual nearby eligible threat requires them; original17/45/65m rules and custody/protection remain.

Paired untouched diagnostic replay,120fixed steps: originalmean135.87ms, median110.63ms, p95291.36ms; finalmean60.64ms, median53.43ms,p9595.29ms. Mean decreases55.4%; full encoded-state SHA256 matches892eb53b7a559fa96240aa4efec1752f0c4e48213f407ff1bc210b43266780e6. These Node replay figures are not browser FPS promises.

33targeted final checks passed (31shelter/priority/frontier-defense +2exhaustive enemy/entrance checks);2rival-range reference/invalidation checks passed. Minimap byte-equivalence/physical refresh tests8/8passed, warmedCPU fell61% at1040/53% at2080. New workload report is memoized for500ms with immediate state/world/Game invalidation;7checks plus actual browser invalidation matrix pass.

Exact saved village is retained locally in.play/diagnostics/year-three-village.json for future profiling. Benchmark and profile files remain under/tmp/hearthwild-real-save-* in this session. Gameplay mechanics and population were preserved; no changes to stocks, terrain, density, damage or food needs formed this performance correction.

## Ready interaction batch

77/77camp/custody/contact/knowledge/workload/music checks and10cardinal gate/line checks pass in isolated source. Explore loaded-cargo queue3/3passes with real delivery/save/provision depletion. Music skip11/11checks. Combined compiler/build and actual Chrome review are performed before publication. Productioncohort/V14/defaultpromotion/major NPC/naval/trench work remain outside this performance release.
