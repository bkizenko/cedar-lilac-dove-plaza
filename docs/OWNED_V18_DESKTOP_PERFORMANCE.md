# Owned V18 desktop performance observation

The public UI loaded the authored native V18 seed1 stress fixture with 100 residents and 60 finished initial structures. At Low quality, shadows off and 1×, the actual displayed 97-second window reported 32.6 FPS, 50.6 ms frame p95, and no pauses over 100 ms in the rolling samples. People/world CPU averaged 22.8 ms per simulation step (45.9 p95), compared with 3.0 ms scene update and 4.5 ms drawing submission. Catch-up limits discarded 11.4 seconds of backlog in 782 of 2,835 frames. This is not smooth-play acceptance.

All six autosaves committed through the worker; zero failed or fell back. Main save preparation/commit averaged 19.9 ms with a 25.2 ms peak. The original earlier session's fallback cause remains unknown.

The terrain was unchanged. Every initial building passed ordinary placement clearance, an additional nine-point footprint-relief bound and an actual founder-connected entrance test; assets and 95 additional adults were explicitly authored before the scenario. Initial finite resources and local surveyed knowledge are declared in the metric artifact. No midrun grants, teleports or terrain fixes occurred. This is a performance workload, not earned construction or settlement proof.

The old build did not count actual camera-frustum geometry. The 100/60 totals therefore do not establish that all targets were in view, and the run does not qualify that acceptance gate. An on-demand census follows separately. Native Chrome UI operations and the existing Performance disclosure supplied the observations; private browser chrome and villages are excluded. The owned QA tab was paused and closed.

Exact source, fixture hash, setup declarations, rolling-sample bounds and all numeric observations are in `metrics/owned-v18-100-60-desktop-2026-11-03.json`. The fixture generator is `scripts/diagnostics/owned-v18-100-60-fixture.mjs`.
