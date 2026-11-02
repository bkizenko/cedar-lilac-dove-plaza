# Frame performance measurement window

The isolated `d048d1a` candidate corrects FPS calculation to use full animation-frame timestamp gaps. Simulation still receives its original capped delta and fixed update scheduling. A 250ms rendered-frame gap reports 4fps rather than deriving an inflated rate from the 100ms simulation cap.

Menu → Performance remains closed by default. Opening it refreshes diagnostics once per wall-clock second, including while paused; closing/unmounting removes the timer. It exposes actual recent frame FPS, frame mean/p95/maximum, >100ms stalls, existing per-stage mean/p95/maximum, and catch-up/backlog counters. Reset measurements clears only these diagnostics and the prior frame boundary. It never changes game speed, pause, work, resources or save state.

History is bounded to 600 frame intervals and 240 samples per stage. World samples measure one fixed simulation update; scene/drawing samples measure one frame operation, and map/save/UI samples their own operations. These different denominators must not be added as if they were a per-frame CPU breakdown. Drawing measures synchronous CPU submission, not GPU execution. Audio/camera/ghost work and React commit work also affect frame gaps outside these measured stages.

Six new focused cases and six existing clock/scheduling/profile cases pass, with isolated typecheck and production build passed. Actual desktop observations are recorded below; no FPS gain or buffering fix is claimed from adding diagnostics.

## Actual-controls measurement protocol

Use a separate local test copy of the already authorized mature-village save; keep the user's running village and private source file untouched. Import through the normal save controls. Keep the browser foreground, viewport/camera fixed, and no other profiling/build/test process active. Record starting and final graphics quality, shadows, speed and pause state; automatic quality reduction can change settings during a slow window.

1. Allow initial scene construction to settle. Open Menu → Performance and reset. With the game paused, wait at least ten wall-clock seconds. The displayed window age must advance while paused. Capture the panel and actual quality. Pausing stops ordinary AI work, but influence preparation and visual operations can still run.
2. Resume at 1×, reset, and observe thirty wall-clock seconds with the same camera/settings. Resolve any real encounter dialog before resetting so an unnoticed modal pause does not invalidate the run. Capture frame FPS/p95/maximum, stall count, stage timings, limited-frame count and discarded backlog.
3. Optionally repeat at 4× and then at Low graphics using separate resets. Treat each as a distinct condition. Reimport/repeat the same private initial save if comparing behavior-sensitive windows; do not claim exact simulation-state equivalence from wall-clock browser observations.
4. Close and reopen the panel while paused to confirm the measurement view is current. Reset after any import, browser backgrounding, camera movement, quality change or measurement setup delay. The first new frame is only a boundary; FPS appears after a fresh interval.

A high world-update cost with low scene/submission cost points toward simulation CPU work. High scene cost points toward scene synchronization. Poor total frame gaps with low measured CPU stages can involve unmeasured CPU, GPU/driver work, scheduling or browser overhead; this instrumentation cannot isolate GPU execution. No GPU timer query is added, and rendering completion is never synchronously waited on.

## Complete-frame renderer accounting

The separate renderer extension is verified against installed Three 0.185.1. It disables per-pass automatic info resets, explicitly resets once at the start of each real `WorldView.render` invocation, and records after the full compositor/direct/fallback attempt. Counts therefore include all submitted passes, including partial work submitted before a failed effect and its direct fallback. It does not synchronously wait for graphics completion or claim GPU duration. Lost/disposed frames provide no stale renderer sample.

Menu Performance exposes complete-frame drawing calls and primitives, bounded call-count statistics, and live geometry/texture/program counts. Resource counts are not graphics-memory byte estimates. Optional `performance.memory` is labeled browser JS heap in MiB; unsupported readings are absent. Navigation remains included in simulation CPU, with no invented separate duration. The existing one-second open-panel timer is reused; no new polling runs while closed.

Eight new renderer/heap cases plus the prior twelve pass (20 total), including actual installed Three info and actual WorldView render/fallback/lost wiring. The isolated extension typecheck and production build pass. The desktop observations below still do not qualify the resident-band performance gate. The original four-file observability patch remains stable; the extension is separately reviewable.

## Actual desktop observations (Apple M1, 8 GiB, November 2)

A separate authorized mature-save copy was imported through the ordinary controls. On Medium with shadows off, paused rendering measured58.9FPS (17.0ms mean frame); ordinary1× measured47.2FPS (21.2ms mean), with world-update CPU23.6ms mean. A later4× window measured23.3FPS,42.9ms mean frames and39.2ms mean world-update CPU; drawing submission stayed about1.3ms. A subsequent Low window measured19.8FPS with46.0ms mean world CPU. This was a growing village (245 to313 people), not a same-state quality comparison. Low cannot be blamed for the difference.

Autosave peaks75–86ms were a separate periodic CPU cost. These observations support prioritizing simulation work and save processing; they do not establish GPU cost, strict240–300-person qualification, a frame-rate improvement, or M5-07 completion. A second attempted baseline reset failed to establish the intended starting time and is excluded from causal comparison. Private saves and screenshots are not included in source control.
