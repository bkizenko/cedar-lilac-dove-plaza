# Movement-query CPU correction

Previous goal turn published007e444 and verified server health. This batch reduces repeated building collision checks while retaining the same physical rules.

During actor updates, point checks read nearby footprint buckets, then run the unchanged exact obstruction and outward-escape predicates. Numeric bucket keys avoid per-query strings. Gates, health and construction status remain live references; each new actor pass revalidates every footprint. Navigation changes, added/replaced arrays and dirty resized footprints invalidate the index. Very large footprints and queries use a bounded full-list fallback. Outside actor updates, UI/direct queries always use the original current list.

The final4x ABBA CPU comparison uses the older private245-person/408-building village,20warmup plus180measured updates per process. Complete encoded final states and random-call counts match in all four runs. Mean update cost decreases modestly; mean-of-run p95 is essentially unchanged. Exact trials, source blobs and limitations are in metrics/movement-building-queries-2026-11-01.json. This is not a claim that buffering is fixed, or a browser/GPU/FPS result. No people, trees, geometry, systems or simulation events were removed.

The timber-priority QA failure was reproduced in the published baseline and traced: at90seconds workers still carried22–28logs, with the first full carrier approaching home. Logging now takes four times the old labor. Allowing180seconds preserves both physical-delivery and subsequent-priority assertions and passes; no work rate/output rule was changed.

Acceptance remains hearthwild-first-release-gates-v1,23/98=23.47%. This correction does not qualify a broad campaign gate. Remaining frame-tail work needs further world-decision and movement profiling plus the actual newer village and browser-stage evidence. All pending boat/cultural-trade/patrol/geography/leaderboard and Classical-release requirements remain active.

Verification:71distinct functional cases passed during this batch. After changing bucket keys from temporary strings to numeric rows,11collision/gate/steering cases were re-executed and passed on the final source, along with exact full-state/RNG equality in the final4x ABBA run. Frozen-source typecheck and production build pass. No browser visual/FPS verification is claimed for this internal-only optimization.
