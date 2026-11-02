# Background autosave

Periodic autosave now has an isolated, bounded Worker pipeline. Manual save, import protection, page-hide/visibility checkpoints and disposal saves retain their synchronous contracts. The 18-second automatic-save cadence is unchanged. This targets periodic serialization stalls; it does not solve sustained simulation cost or establish an FPS gain.

An explicitly approved prerequisite fixes an incidental RNG side effect: `Game.blank()` still draws once from the original 70–120 raid-timer distribution, while strict validation calls `Game.prototype.blank(0)` only to inspect required field types. Missing fields still fail; no defaults are copied. Validation no longer consumes gameplay randomness. This is not a full ownership/invariant-completion claim.

## Ordering and durability

One reusable Worker handles one logical job at a time. At most one latest pending request marker is retained; it is not a second giant snapshot. Worker preflight strictly validates the old primary and applies the original same-seed/newer-time guard **before any live `encodeGame` normalization**. Only a current, still-matching request can then encode and post its immutable clone. A queued marker uses the actual clock when dispatched; the later serialized clock is guarded against reversal.

The Worker strictly validates the current snapshot and previous primary/backup/protected candidates, then stringifies locally. It cannot access browser storage or mutate the live Game; its code does not construct a Game or reconstruct terrain. A valid protected checkpoint newer than an intentionally restored primary does not block future autosaves: the original primary-only stale guard is preserved.

Before committing, the main thread rechecks Game and state identity, generation, seed/time and exact expected bytes of all three storage slots. The primary `setItem` is essential. Only a validated previous primary can replace the backup; corrupt primary bytes never replace a good backup. Existing protected bytes remain untouched, and a missing protected slot is filled using the original policy. Optional-copy quota failures do not invalidate a durable primary. Browser localStorage has no multi-key transaction or cross-tab compare-and-swap; same-turn guarded writes preserve the existing best-effort semantics, not an impossible transactional guarantee.

Worker creation/transport/clone failure or timeout uses the original corrected synchronous path only while the request remains current. Strictly invalid current snapshots retain existing saves rather than falling through to an unvalidated write. Old job IDs and superseded jobs cannot overwrite later checkpoints. TestLab never encodes or saves its test copy.

## Lifecycle inventory

- `saveGame` and `protectGame` advance generation before their guards, including failed/disabled synchronous attempts. Save Now and export-with-protection use these paths.
- Import invalidates before awaiting the file. Applying any restored village invalidates again; resume and TestLab entry/exit use this helper.
- Restart/configuring a new world invalidates before reset. Game/state identity and seed/clock guards also catch direct replacement/reset.
- Disposal invalidates, clears pending requests/timers, terminates the Worker and removes its storage listener before the existing synchronous disposal save.
- Page-hide and visibility checkpoints stay synchronous and invalidate through `saveGame`.
- Cross-tab changes to primary/backup/protected or clear events invalidate pending work. Exact storage values are checked again before encoding and before commit.
- Reset measurements clears diagnostic cohorts only; it does not cancel an in-flight durable save or alter simulation state.

## Evidence

The isolated suite passed 45 cases before the final pending-clock test; the latest controller suite passes 16 cases after that guard, giving 46 unique covered cases. These include actual off-main Node worker execution with no DOM/terrain reconstruction/randomness, strict invalid payloads, quota and corrupt-primary behavior, queue bounds, preflight ordering, lifecycle changes, out-of-order messages, clone failures and timeout fallback. Root owns the final combined tests/type/build gate. The public proof build predates only the final pending-dispatch clock assignment, so a final combined rebuild is required.

A four-process A–B–B–A serialization-only experiment uses the same authorized immutable mature-village snapshot, three warm and twelve measured saves per process, corrected RNG-pure sync baseline and Map-backed storage. Complete encoded-Game and all three stored-byte hashes match across all four processes; saving draws zero random numbers. Main-thread synchronous work averages 121.82ms for sync and 13.36ms for the Worker pipeline. Worker processing averages 303.79ms and total wall latency 336.28ms: background safety work and latency increase while main blocking decreases. These low-priority, fixed-batch Node/Map results exclude browser storage I/O, simulation and rendering, and do not predict live browser FPS. Timing spans are elapsed synchronous work, not OS-exclusive CPU-cycle counts.

Root's actual CUA proof on a generated public paused camp at a fresh origin confirms the built Worker, checkpoint writes and zero failed/fallback jobs. The first observed checkpoint reports 27.6ms main-thread work, 119.1ms background processing and 287.3ms wall latency. After toggling Auto work Off→On, manually saving and reloading, On persists; a new Worker checkpoint succeeds with zero failures/fallbacks, reporting 19.8/94.3/190.3ms respectively. These are functional observations, not same-state A/B speedup evidence. The public-camp screenshot is `screenshots/background-autosave-desktop.png`; no private save payload is published.

Menu Performance separates main prepare/clone+commit time, background processing and total wall latency. The request row alone is not the complete autosave cost. Detailed hashes, individual experiment runs, source list and limitations are in the aggregate JSON.
