# NPC equipment, remembered destinations and village performance

Candidate based on published `1a90ade`; integration work is isolated in `.play/npc-performance-integration`. This is a review record until final build and promotion are recorded below. The fixed release checklist remains `hearthwild-first-release-gates-v1`, 29/98 (29.59%); these narrower repairs do not establish an additional complete acceptance gate.

## Actual changes

Rivals can pay for and physically carry out repairs to their own worn farming tools through the same owner, materials, workplace and bench rules used by the player. Bounded reviews retain home adults, meal and material reserves and protect loaded people and committed jobs. A paused paid repair resumes without another payment. A controlled ordinary simulation case includes field wear, autonomous admission, walking, actual repair work, an interrupted strict save and return to ordinary construction.

Trade and delegation destinations now retain individually witnessed settlement sites and saved journey endpoints. Old explored terrain does not reveal a later town. Reaching the old empty site returns the same finite offer rather than redirecting the traveler to an unseen replacement. Paid legacy sea voyages retain their contractual endpoint and cargo through strict reload.

The information change is deliberately incomplete: grievance warnings lack a physical messenger, and several military/infrastructure consumers need further auditing. The separately integrated proposal repair now sends an unescrowed dated offer as a real journey budget/minimum and checks it only at physical arrival; existing paid legacy guarantees retain their escrow. Full information causality stays unverified. See `WITNESSED_DESTINATIONS_2026-11-02.md`.

## Executed integration evidence

The final combined candidate passed71/71 checks in `/tmp/npc-performance-actual-71-final.log`, with all14 explicitly named test files first checked for existence. Intermediate47/68-case runs omitted the NPC repair patch because Git ignored its paths inside the nested snapshot; the source-manifest audit caught this before publication. Those runs do not establish NPC integration. The final71-case run includes actual native field wear→paid repair→saved interruption→ordinary labor alongside witnessed-site, proposal, legacy escrow, sea trade, frontage, rest, player-tool, UI and clock checks.

Private mature-village profiling uses the already authorized diagnostic save without publishing it. The frozen published baseline ran three identical-state controlled windows, each 20 warmup and 180 measured ordinary updates at 4x. All repeats produced the same complete saved final state and 33,475 simulation RNG calls. Means were 42.42/41.37/35.86 ms, p95 65.69/60.76/50.57 ms, maxima 118.74/132.69/108.53 ms. These are simulation timings on the current machine, not browser frame-time or target-hardware certification.

Final source, tests and production build are audited below; publication is recorded by the commit containing this document.

## Final candidate additions

The performance-only branch uses two scoped expression/geometry changes, without reducing simulation cadence or changing game rules: reject irrelevant food-urgency cases before computing society-wide reserves, and reject impossible distant building-arrival checks before sampling a frontage. Across controlled A–B–B–A runs, combined mean simulation update cost fell38.07→32.59ms (14.4%), pooled p9552.84→48.30ms. Full initial/final saved states and33,475 update RNGcalls matched. These equivalence results apply to the performance-only branches; new witnessed facts intentionally change the separately integrated candidate state. Updates above100ms remain.

The final production build and typecheck passed (`/tmp/npc-performance-actual-build.log`, `/tmp/npc-performance-actual-type.log`). Actual desktop production inspection confirmed expanded-clock Resume→Pause, visible PAUSED state and working Auto work toggle, with no captured browser errors; screenshot `screenshots/npc-performance-expanded-controls.png`. This is a bounded smoke test, not broad visual or FPS acceptance.
