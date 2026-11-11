# Riverbank cross-section audit

The playable default uses V18. V19 remains the refined-bank option in Test Lab. This survey compares physical water depth against the terrain sampler used by the game. It does not establish visual approval, route safety, or performance at camera zoom.

Run the survey from the repository root.

```sh
node --import ./scripts/game-loader.mjs scripts/diagnostics/riverbank-cross-sections.mjs
```

Each river segment is sampled at intervals of at most 2 m, with lateral tests at 0.25 m increments. Water over 0.05 m deep counts as wet. At each section, both banks are traced outward from the wet center until the first dry sample or the search limit of 4 m beyond the designed edge. Adjacent wet sections with width differences of at least 2 m count as width jumps. The scan includes connected lakes, tributaries and the sea where they overlap a river cross-section. Those transitions can register as width errors against the individual river's specified width. The measurement gives a comparison between versions and is not a target for forcing joins to match a uniform width.

| Seed and layout | Generation | Sections | Dry centers | Mean absolute width error | Width jumps ≥2 m | Lower river jumps | Fine terrain tiles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7, archipelago, 1,040 m | 18 | 386 | 0 | 2.792 m | 12 | 6 | 0 |
| 7, archipelago, 1,040 m | 19 | 386 | 0 | 3.842 m | 5 | 0 | 320 |
| 42, continents, 1,560 m | 18 | 1,047 | 0 | 2.749 m | 19 | 10 | 0 |
| 42, continents, 1,560 m | 19 | 1,049 | 0 | 2.275 m | 12 | 0 | 580 |
| 1, pangaea, 1,040 m | 18 | 420 | 0 | 2.584 m | 26 | 22 | 0 |
| 1, pangaea, 1,040 m | 19 | 420 | 0 | 4.259 m | 5 | 0 | 305 |

The V19 lower river removed the sampled width jumps in all three worlds. The largest remaining jump count in the continents preview came from the ordinary brook and the riparian side channel, at four each. The continents generations also differ by two sections due to generation-specific side-channel geometry. Mean width error increased in the other two previews. Follow-up qualification needs to distinguish isolated banks from joins, inspect corresponding views at multiple zooms, and verify traversability and rendering cost.
