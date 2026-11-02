# Saved-village query performance — 2026-11-02

Two narrowly scoped query changes reduce measured CPU work on the existing authorized mature-village save, without reducing simulation cadence or removing gameplay. The private save remains local and unchanged. These results describe performance-only branches of frozen `1a90ade`; they do not claim that the root feature integration, which intentionally adds NPC/information behavior, has an identical game state.

## Evidence and diagnosis

The exact input contains 245 units and 408 buildings. Three initial control processes ran 20 warm-up and 180 measured ordinary `Game.step(1/30)` updates at 4×. Their measured means were 42.42, 41.37 and 35.86ms; p95 values were 65.69, 60.76 and 50.57ms. One scoped 1ms-sampling CPU profile covered the same measured window after warm-up, excluding decode. It identified `reserveSeconds` at 17.22% inclusive sampled wall time, `foodDemand` at 14.07%, `interactionSpot` at 10.20%, and `shareLocalTransport` at 9.22%. These inclusive percentages overlap and must not be added.

The independent rest change checks the actor's job/order eligibility before asking for household food reserves. Non-food workers and locked idle residents cannot receive the urgency exception, so they no longer trigger unnecessary full-population food-demand scans. Hungry food gatherers and free idle adults retain the exception; no appetite, food requirement, work schedule, shelter decision or random draw changes.

The independent frontage change rejects positions outside every possible physical entrance/arrival bound before doing the expensive entrance search. It retains the original near-footprint true fast path, preserves the original pending-navigation rebuild, allows very large footprints, and delegates when a cached entrance belongs to this same building. The cached case preserves old behavior even after direct footprint movement without invalidation. A floating tolerance keeps the bound conservative. Bridge handling remains unchanged. No route result, query refresh cadence or cross-step cache is approximated.

## Separate and combined comparisons

Each final comparison used A–B–B–A order in sequential fresh processes at low process priority, the same random stream, 20 warm-up steps and 180 measured steps per process. The table averages the two run means on each side; p95 is calculated from both runs' pooled 360 measured steps.

| Branch | Baseline mean | Candidate mean | Mean reduction | Baseline p95 | Candidate p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rest eligibility only | 37.23ms | 34.99ms | 6.0% | 52.12ms | 49.87ms |
| Final cached-safe frontage only | 39.71ms | 36.44ms | 8.3% | 56.39ms | 52.61ms |
| Both changes | 38.07ms | 32.59ms | 14.4% | 52.84ms | 48.30ms |

All 16 qualification processes matched the complete initial encoded state, complete final encoded state, and all 33,475 update-time random calls. The 16 consist of three initial unprofiled controls, one scoped profile, four rest comparison processes, four final frontage comparison processes, and four combined comparison processes. An earlier four-process frontage draft was measured before adding the cached-frontage compatibility guard; its superseded timings are not used for the final frontage or combined claim.

- Private input SHA-256: `04c7ead2973223a52a6e6783c71bc7866cb890672b94aa6d2c1508c0d4e00347`
- Complete initial encoded-state SHA-256: `3776a52d1435b6b59e521593e688151b26b13d0030b32efb1896e391cb080b36`
- Complete final encoded-state SHA-256: `9430afc0d60ffee2fbe3ab18ed2638c9f3f0aaf6c2d9b5b22a5f3410fbb03870`
- Combined performance-only source manifest SHA-256: `0137194e5e0326df61dbe0f3bcc2f8d1a3c82e3323b8737d17e671ebbe4f5a23`

Ten focused cases pass, including 7,500 physical frontage comparisons against the original predicate, cached/moved entrances, dirty-navigation behavior, gates, bridges, oversized footprints and work/rest priorities. Another 20 existing cultivation/food and haulage compatibility cases pass on the combined performance-only branch. Root integration has its own combined tests and build gates; do not add overlapping cases to its reported count.

## Practical limits

Single updates over 100ms remain. The rest-only comparison included a 155.60ms maximum, worse than that comparison's baseline maximum of 133.15ms. In the combined comparison the observed maximum fell from 175.78 to 111.69ms, but that does not establish a maximum latency guarantee. No browser rendering, GPU time, autosave cost, input latency or sustained frame rate was measured here. Low-priority OS scheduling and external system load influence absolute timing. This is reduced simulation query work and exact observed behavior preservation, not a claim that buffering is solved.

The aggregate JSON contains timings, counts, public source checksums and state hashes only; no private resident records, coordinates, inventory contents or save payload are published.
