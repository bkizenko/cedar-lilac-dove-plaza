# Dated trade proposals — follow-up repair, 2026-11-02

Isolated candidate `.play/physical-proposal-review`, based on the completed witnessed-destinations candidate. Source follow-up `.play/physical-reported-proposals.patch` changes only `src/game/sim.ts`, `src/game/barter.ts`, and `src/ui/TradeProposal.tsx`. The completed destination patch is unchanged. No shared source was overwritten or staged.

## Behavior and contract stage

An ordinary reported offer now dispatches the player's finite proposal/budget without consulting the seller's unobserved current inventory or creating seller escrow remotely. The quantity in the dated deal becomes the agreed minimum through the existing saved `procurement.minimum` field. The real carrier travels to its recorded site; only physical arrival permits current local quote/stock checks. A locally adequate offer exchanges finite goods; a refused or below-minimum offer returns the entire original budget with the same carrier. Better local terms may satisfy the minimum; worse terms are never silently accepted. Explicit Allow smaller counteroffers remains a separate existing opt-in. Approved automatic routes retain their requested minimum rather than acquiring a remote guarantee.

No new state field or save version is introduced. The existing strict procurement minimum validation still applies. Old unescrowed journeys lacking an explicit proposal flag receive their serialized deal's minimum when they reach the meeting. Existing valid held `tradeReservation` guarantees skip renegotiation and retain their original finite collection terms. Reservation executors, release/reconciliation, theft/death/recall handling and strict reservation validation are unchanged. This repair stops creating new home escrow from unguaranteed reports; it does not erase or reinterpret already paid escrow ownership.

## Causal proof and accounting

`scripts/physical-reported-proposal.test.mjs` uses a controlled authored dry map with explicit initial household resources and quiet external timers. A real player carrier walks to the foreign entrance and obtains the dated 20wood→24stone report, then physically returns to its home cache. Before each fork, explicit unobserved seller consumption leaves200,0,or50stone; no resource is granted. The report is identical.

All three home dispatches succeed identically:20wood leaves the player's store and enters the real carrier, minimum24 is saved, seller stock is untouched, and no seller escrow exists. A strict save/reload retains the paid budget and minimum. Ordinary simulation travel then reaches the seller and either purchases at least24stone (200-stock branch), or returns the full20wood (empty and worse-price50-stock branches). Fifty stone could physically cover24units, but its changed local terms fall below the agreed minimum, so the test separately proves price protection. The same carrier physically brings purchased goods or unchanged budget home. Combined buyer/seller stone is conserved; payment/budget wood is conserved including separately measured hearth fuel. Actual walking distances and every result are in `docs/metrics/physical-reported-proposals-2026-11-02.json`. This is an actual-step physical flow, not a report-only or force-completed-job test.

## Existing guarantees and compatibility

The two immutable input saves in `scripts/fixtures/legacy-held-trade-920952a.json` and `scripts/fixtures/legacy-held-armed-trade-920952a.json` were captured from the completed previous runtime before this follow-up. They already contain paid20food in transit and30wood held outside the seller's40free wood. They are intentionally legacy ownership fixtures, not new-runtime examples of creating a guarantee at home. Provenance, byte lengths and SHA256 hashes are in `docs/metrics/legacy-held-trade-fixture-provenance.json`.

The reservation suite now loads these existing paid payloads to verify collection after free stock is spent, no interference from new unguaranteed proposals, exact-once escrow release on recall/move/death/war/stolen payment, strict save/reload and malformed reservation rejection, and an armed carrier retaining its weapon/escrow across defense and resumption. These legacy executor checks retain the old controlled endpoint setup; the independent new proposal scenario proves ordinary complete travel.

The partial-quote test now checks the intended new semantics: only the actual payment is carried, seller stock stays spendable until arrival, the proposed minimum survives save, and the finite local exchange/delivery conserves both goods. It no longer asserts that an unguaranteed home report magically creates seller escrow.

## UI audit

The reported-offer button now says Send reported proposal. Its explanatory reason and dispatch banner describe a proposal and minimum, removing promises of reserved goods. Production-source audit found no remaining Reserve reported offer, Shipment reserved, promised goods or Accepting checks text. The traveler's reserved quantity appears only when a real `tradeReservation` exists, which remains accurate for legacy held guarantees. Caravan help already says exchange happens at arrival; trade-priority food reserves refer to the player's actual home rations. Historical dated evidence documents describe the older implementation and are superseded for this contract-stage behavior by this follow-up.

## Verification and limits

- `/tmp/physical-proposal-final-tests.log`:28/28 proposal, legacy escrow, partial/approved-route, meeting-report and coastal regressions pass.
- `/tmp/physical-proposal-exact-accounting.log`:the dedicated proposal test also passes after strengthening exact wood/fuel accounting and requiring loading at the actual home cache.
- `/tmp/physical-proposal-final-type.log`:typecheck passes.
- `/tmp/physical-proposal-final-build.log`:development build passes.

Copy both fixture JSON files separately along with the test patch; the source patch intentionally contains no fixture blobs. The updated dedicated proposal test and diagnostic are in the latest test patch.

This closes the confirmed ordinary home-acceptance private-stock leak. It does not establish full M2-07 completion: global frontier grievance/relationship messages and broader political, military, landing and all-society information paths still need their separate evidence and fixes. No full-gate percentage is claimed here.
