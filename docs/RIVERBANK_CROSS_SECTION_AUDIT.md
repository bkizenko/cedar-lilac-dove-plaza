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

## Isolated banks and nearby water

The survey also builds a second water index for each river that omits the river itself. At every lateral sample it checks whether the lake, sea, falls, or another river would leave water over the same physical terrain. A section with any such sample is classified as near other water. A jump is counted as isolated only if both adjacent sections pass that check. The category includes proximity within the scan window, even when the visible bodies are separated by a narrow strip of dry ground.

| Seed | V18 isolated sections | V18 mean width error | V19 isolated sections | V19 mean width error |
| --- | ---: | ---: | ---: | ---: |
| 7 | 81 | 0.385 m | 81 | 0.311 m |
| 42 | 560 | 2.053 m | 421 | 0.262 m |
| 1 | 32 | 0.641 m | 32 | 0.258 m |

All jumps of at least 2 m in this sample had nearby water on at least one of the two sections. This includes the lower rivers. At seed 42, the eligible sections differ between versions, so the means compare each version's isolated reaches and are not a matched-location improvement estimate. Future visual and route checks should sample across the actual connections and inspect whether transitions follow the intended banks, particularly at the riparian side channel and ordinary brook.

## Shoreline access and rendering smoke check

The integrated fishing test now runs four trips across the three surveyed V19 layouts. It verifies that the original worker reaches dry ground beside a generated fishing site, depletes the finite stock, retains the catch when saved at the bank, and adds food only after returning home. Both the coarse height grid and the refined tile heights are hashed before saving, after restoration, and after delivery.

| Seed | Water | Distance walked | Catch delivered |
| --- | --- | ---: | ---: |
| 7 | Freshwater | 660.1 m | 3 |
| 7 | Coast | 827.8 m | 3 |
| 42 | Freshwater | 90.2 m | 4 |
| 1 | Freshwater | 96.5 m | 3 |

The seed 7 browser session restored the 320-tile V19 preview on port 8101 and drew the tributary join at camera distances of 30, 75 and 160 m without page errors or a lost WebGL context. The renderer reported approximately 596,000 triangles per sampled frame. This was a headless render check, so visual approval and interactive Mac frame-time measurements remain open. A separate seed 42 browser attempt timed out before the scene loaded. The four fishing trips provide bank-access evidence and do not qualify all crossing or boat routes.
