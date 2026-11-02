# Witnessed destinations and legacy paid journeys — review candidate

Baseline `920952a`; isolated runtime `.play/witnessed-claims-review`; complete source patch `.play/witnessed-destinations.patch`. No shared source or tests were overwritten or staged. This supersedes the earlier frontier-only patches. Exact source file list: `docs/WITNESSED_DESTINATION_SOURCE_FILES.json`.

## Implemented information boundaries

`observedClaims` records NPC observations of player frontier posts; `observedSettlements` records individually witnessed foreign hall sites for each observer. These are dated finite snapshots, not live references to remote entities. Old explored terrain, a known society, or an unrelated known first town cannot reveal a later new town. Actual local visits can refresh position/identity or discover an old site's absence. Memory survives strict save/load after the observer leaves, including removed witnesses and structures. Absent legacy memory defaults conservatively to unknown, without migrating terrain into structure evidence.

`barter.knownSettlement` and the direct player/NPC land and coastal trade destination consumers now use recorded sites. Living traders may consult current hall objects only within the existing 26m physical observation radius. Reaching a last-known empty site returns the same offered cargo, without redirecting to a globally visible replacement hall. Coastal commissioning uses remembered partner halls; local exchange/report collection uses consistent `buildingWorkReached` frontage checks. Player firsthand local meeting reports stay live in RTS control, while existing NPC market reports remain carried on bodies and published only after physical home return.

The radius deliberately matches existing person/rival observation semantics. No new terrain LOS/occlusion model is claimed. Per-observer settlement-site facts currently become shared as a physical observer sees them; this is not a newly modeled NPC messenger network.

## Saved endpoints and compatibility

New Unit field `settlementJourney` contains version, owner, optional committed site ID, bounded endpoint coordinates and recording time. Each new dispatch snapshots its known endpoint. It remains fixed during the paid journey. Strict decoding rejects malformed ownership/IDs/coordinates/dates/unknown keys. Old active land trades and delegations without this field retain their existing serialized `tx/tz` endpoint; these are explicit active-journey evidence, not a terrain-derived hall location. Actual arrival then inspects local reality.

New CoastalVoyage field `foreignHallSite` snapshots its committed hall location. A legacy paid voyage already records exact `foreignHallId` and landing points. Decode recovers the saved location of that exact contractual ID, relying on the natural runtime invariant that constructed halls are immobile; if that exact ID is absent, it preserves the serialized landing as its fallback inspection endpoint, never chooses another current hall. A supplemental externally moved-ID legacy payload cannot reconstruct original missing coordinates, so that artificial case is not claimed. Modern voyages preserve explicit coordinates through such perturbations.

A dormant old approved route containing only a society name and no location-bearing memory/active journey cannot establish a new physical location from its name. It stays saved; future departures need actual site evidence. A legacy in-flight paid route can complete its recorded journey and establish physical site evidence for later departures. There is no rejection of the old save or refund/duplication shortcut.

## Causal verification

`scripts/witnessed-frontier-claims.test.mjs` includes seven tests: paid frontier build invisible to historically mapped terrain; actual observer and stale appraisal through save; unseen destruction/replacement; dead-body exclusion; witnessed individual hall sites with unseen changes; paid NPC second-town construction and real offscreen combat destruction followed by a legacy paid carrier's actual old-site inspection; legacy paid gift delegation save/resume and strict endpoint corruption rejection.

The paid-town case declares all people, raiders and initial building materials at setup, uses ordinary public placement and actual NPC build labor, then normal combat to destroy the first hall. No mid-run funding or job completion is injected. Raiders withdraw physically before the trading journey. The player is not informed of the unseen new town/destruction, pays ten food into its offer, reloads a legacy payload without new fields, and walks 213.87m to the old site. It learns absence there and keeps all ten food; it never visits the unseen town. Explicit direct NPC military/build orders are scenario commands, not corrective commands for a stuck worker. Earlier synthetic position/resource perturbations remain supplemental boundary checks, not paid-construction qualification.

The coastal regression saves the same paid boat/captain at sea while paused, removes new observation/endpoint fields to create a legacy payload, decodes strictly, resumes, completes its finite exchange, sails home and physically unloads the same cargo once. Food/water consumption, seller deductions and no remote home credit remain checked. Fixture-only initial historical site endowments now use `scripts/helpers/endowed-settlement-sites.mjs`; this helper is never used in runtime or mid-scenario. Old negative tests explicitly remove that endowment when testing unknown partners. This changes the old tests' initial-knowledge assumption, not their economic assertions.

## Remaining full M2-07 gaps — no gate credit

Confirmed contract-stage leak: `recordTradeMeeting` records volunteered dated offers at a real local meeting but does not escrow those offers. After the player physically returns home, `dispatchTrade(accepted=true)` calls `shipmentIssue` against current unobserved seller stock and creates escrow remotely via `reserveTradeGoods`. In the causal diagnostic, the same reported offer (20 wood for 24 stone, observed at39.1s) is accepted at home if unobserved free seller stone remains200, and rejected if it became0; the stored report is identical. The acceptance outcome therefore reveals later private inventory. There was no seller agent carrying a fresh guaranteed contract and no escrow at the original observation time. Diagnostic: `scripts/diagnostics/remote-contract-stage-repro.mjs`; evidence `docs/metrics/remote-contract-stage-2026-11-02.json`.

Minimal physically grounded follow-up: ordinary reported offers should dispatch a proposal/budget and negotiate/reserve only at actual arrival; a guaranteed offer must escrow at the real seller meeting and have a physical carrier convey that finite guarantee before home acceptance. Existing reservation spending, release, death/recall and save invariants are intentionally unchanged in this candidate, pending review of that contract design.

Confirmed frontier-message limit: `tickFrontiers` still raises a player banner when an NPC grievance crosses its threshold without checking for a physical speaker/envoy/message at the player's community. Relationship UI also exposes underlying values. Claim observation memory alone does not supply message provenance, so this patch does not close that separate information channel.

Broader consumer audit: other military/infrastructure planners and `observedCoastalLandings` still have global entity enumeration guarded by historical `rivalKnows`/explored cells. These were not causally qualified in this batch and must not be assumed safe merely because trade hall destinations now use facts. A complete all-society knowledge/messaging gate requires auditing those consumers. No full M2-07 percentage or universal information closure is claimed.

## Work bounds

Claim facts cap512; settlement facts cap1024; each person has at most one saved journey endpoint. Both observation reviews are at most once per two simulation seconds. Settlement observations are cached by game/state/time across repeated influence/UI queries. Remembered navigation markers cache by immutable fact/endpoint identity to retain existing frontage caching. No per-frame world graph or new route search is introduced. These are design bounds, not a large-village frame-time qualification.

## Exact verification logs and integration artifacts

- `/tmp/witnessed-destination-complete-regression.log`:40/40 trade/sea/quote/report regressions before the final coastal commissioning consumer change.
- `/tmp/witnessed-destinations-final.log`:combined52 tests;51 pass, one coastal fixture's initial knowledge needed updating after it swapped society IDs.
- `/tmp/witnessed-coastal-commission-refocused.log`:that exact case passes after fixing its declared initial endowment; no source behavior relaxed.
- `/tmp/witnessed-destination-causal-final.log`:7/7 dedicated causal/legacy/strict-save cases pass.
- `/tmp/witnessed-destination-type-final.log`:typecheck passes.
- `/tmp/witnessed-destinations-build-final.log`:development build passes.
- `/tmp/witnessed-remote-contract-stage.json`:confirmed deferred-contract stock prerequisite diagnostic.

The source-only patch is `.play/witnessed-destinations.patch`. Fixture-only changes for five tracked economic/coastal suites plus the new explicit initial-endowment helper are `.play/witnessed-destinations-tests.patch`. Separately copy/review the candidate-owned `scripts/witnessed-frontier-claims.test.mjs`, `scripts/information-causality-qualification.test.mjs`, `scripts/diagnostics/remote-contract-stage-repro.mjs`, docs and metrics; those were already untracked qualification artifacts in the shared root and are intentionally not overwritten by this agent.
