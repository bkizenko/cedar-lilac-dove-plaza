# Periodic search costs — 2026-11-02

The remaining reproducible long simulation updates come from coastal landing surveys and settlement-site searches. The accurate diagnostic profile uses uniquely named outer update callers visible in CPU stacks; it does not wrap hot methods. An earlier attempt to align Inspector samples with process-clock timestamps was rejected because those macOS clocks have different offsets. Approximate attribution from that earlier method is superseded.

On the approved rest/frontage performance-only branch of `1a90ade`, absolute update 24 took 116.18ms: coastal review accounted for 48.96ms inclusive sampled wall time, including 42.13ms in `observedCoastalLandings`. Update 85 took 108.68ms: communities accounted for 78.33ms, including 74.75ms in settlement-site selection and 64.83ms in `findOpenSpot`. Inclusive samples overlap and must not be summed. These are single diagnostic profiles, not comparative speed measurements.

## Conservative distance bounds

Independent candidates add inexpensive axis bounds before the original strict circular distance tests. They retain candidate/resource order, original final predicates, messages, RNG and update cadence. Placement bounds affect stone/tree/forage rejection. Shore bounds affect the current query's resident/site visibility tests; known-cell, terrain and route checks remain live.

Each comparison used four sequential fresh low-priority processes in A–B–B–A order, 20 warm updates followed by 180 measured ordinary updates at 4×. These branches exclude the separate, noisy assignment-query candidate and intentional NPC feature changes.

| Candidate | Baseline mean | Candidate mean | Change |
| --- | ---: | ---: | ---: |
| Placement bounds | 33.14ms | 32.45ms | 2.10% lower |
| Shore bounds | 32.42ms | 33.60ms | 3.63% higher |
| Both bounds | 33.66ms | 32.44ms | 3.64% lower |

Whole-update means remain noisy. The shore-only candidate improved its targeted coastal update from an average 110.03ms to 95.83ms while worsening its whole-window mean. For both bounds together, the average coastal update fell from 108.34ms to 101.83ms and the average settlement update from 111.04ms to 99.61ms. Updates over 100ms remain. Neither these results nor the source change establish a browser FPS improvement or a stall ceiling.

All twelve comparison processes preserve the complete encoded initial/final state and 33,475 update-time RNG calls. Two correctly attributed named-caller profiles also preserve that state/RNG. Exact hashes, individual run metrics, pooled distributions and source manifests are in the aggregate JSON. The authorized private save remains unchanged and is not published.

Five new focused cases pass, including 3,240 strict placement-boundary comparisons and sixteen complete ordered coastal-query oracle fixtures, nonfinite/depleted resources, original message precedence, live observation changes and avoided far-resource distance work. Twenty existing cultivation/food and haulage cases also pass; do not double-count them in a larger integration suite.

## Next isolated candidate

The scoped placement broadphase is implemented separately, without either distance-bound or assignment delta. A synchronous `findOpenSpot` invocation creates ordered nearby reference arrays once, retaining original narrow predicates and messages. A `finally` block discards/restores its context, including exceptions and nested searches. Queries with different type/team, state/world/array identity, explicit dimensions/span, or coordinates outside the proven candidate envelope use original arrays. Depleted resources and dead buildings remain reference-visible; there is no cross-update cache.

Six focused broadphase cases pass, including 120 actual seeded quarry/lumber/settlement/storage searches with identical site choices and RNG draws, all-building conservative geometry, large expansion footprints, nested/exception cleanup and next-search changes. The first saved-village A–B–B–A did not qualify. A1/B1 shared the original final state and 33,475 draws; B2/A2 shared a different final state and 34,191 draws, demonstrating sensitivity to cooperative wall-budget preparation in both branches. Their pooled mean is not a valid speed comparison. In the clean same-state A1/B1 pair, mean cost worsened 34.02→34.32ms and the settlement update worsened 130.28→132.30ms. The candidate is rejected for shipping. No performance benefit is claimed.
