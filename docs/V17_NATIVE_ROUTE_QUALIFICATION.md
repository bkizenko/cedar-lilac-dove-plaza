# Native V17 physical routes and bounded ground planning

Candidate source: `.play/geography-v17-route-fix`, copied from the frozen V17 exact-surface candidate. The original V17 source/export remains unchanged. Runtime change is only the intentional ground fallback in `Game.steer`; no geometry, passability, inventory, vision or actor corrections.

## Reproduced defect

On native seed0/1040/continents, the original founder at(-149,-365) cannot execute Move to the admitted upland at(-162,-298). Both points are walkable and connected; all16 half-metre local canStep probes pass. Ordinary24,000-pop A* finds no path. The existing96,000-pop search finds380waypoints around the actual water/cliff barrier. V16 independently exhibits the same defect at the same coordinates (379waypoints). This is not a V17 triangle/initial-camp regression.

The frozen before-source's actual30second Game.step observation leaves the original resident unmoved:13failed plans, including7periodic retries about3.0–3.2seconds apart after navigation settles. Corrected source produces0failed plans/retries and146.7m actual progress over the same duration. Other NPC navigation revisions differ because ordinary RNG is not overridden. These are observed cache events, not a timing benchmark or an FPS claim.

## Correction

After ordinary search fails, a same-component intentional ground goal may use the already-existing96k fallback. Eligible goals are player explicit Move/AttackMove, or actual assigned-node Build/Gather. Existing return/scout/trade/voyage behavior is unchanged. Added searches cost two more slots after the ordinary one, inside the existing four-slot step budget. If those slots are unavailable, the request defers without a false unreachable result or increasing stuck time. The normal route cache/revision/retry and all physical movement checks remain in effect. Other connected goals may still exceed96k; universal planner completion is not claimed.

Three focused checks cover real V16 native Move, real paid V17 Build through the long detour, and actual native planner budget deferral then admission. The last is a direct planner-unit scheduling test; campaign proof below uses ordinary Game.step exclusively.

## Joined native qualification

Initial choice: Quiet conflict, Normal needs/default speed, native original five founders and generated stocks. Auto work stays off. There are no initial endowments or midrun grants, no RNG override, debug vision, manual AI, time writes, body moves or terrain edits. Explicit public Move, Place quarry, Build and Staff quarry commands provide player intent. Restore intentionally pauses, so the test invokes the real Engine Resume handler. First-contact pauses are answered with the actual Observe handler.

| Seed / layout / size | Actual upland rise | First home delivery | Further evidence |
| --- | ---: | ---: | --- |
|7 archipelago1040|15.93m|24stone at86.4s|Actual80stone excavation exposes98finite copper; known, physically admitted approach|
|0 continents1040|15.47m|24stone at425.2s|Same locked Stone assignment makes a second outbound trip, mines25thstone at642s; automatic carrier delivers24L|
|1 pangaea1040|15.55m|24stone at51.0s|Strict save/load while carrying, no extra credit|
|20261102 archipelago1560, holdout|15.48m|24stone at51.8s|Strict save/load while carrying, no extra credit|
|-932481187 pangaea1040, holdout|6.93m|24stone at64.0s|Strict save/load while carrying, no extra credit|

Each pays the actual18logs once, finishes actual construction, extracts from a finite mountain seam, saves with1stone in the same body's hands, naturally fills the24stone load, walks home and credits once. Subsequent ordinary steps do not duplicate delivery. The seam/store/carried-stone ledger balances; initial and final terrain hashes match. Seed0's native water ledger also balances:24initial+24delivered−25.68consumed=22.32L at642s, zero shortages/losses/cold. No ore is remotely credited or mined past the current age restriction.

An earlier corrected-route attempt returned a net18stone increase while carrying24: the source has a real random hillside slide that removes6stone from stores. That failed assumption is retained locally. The final harness traces the real Game.step-invoked calamity method through an unchanged forwarding call, records any actual stock loss, and checks gross cargo delivery separately. It never disables the event or replaces lost stock. Final five-case cohort had zero stone calamity loss.

## Every substantial landmass, not only the starting island

The read-only admission survey reconstructs actual ocean-connected coast components from height nodes, then associates actual walk components with each substantial coast component. On all10substantial landmasses in these five maps, it finds a connected local low-to-upland rise, admits the96k route and probes it at≤0.5m using the real worker-radius canStep rules. Local rises span11.32–87.40m, including ordinary rolling islands; maximum probe height rise is0.768m. Surveying does not mutate encoded gameplay. These are physical admission probes, not invented people or simulated landings on the other islands. Actual founder movement is the joined evidence above.

## Scope and remaining acceptance

5/5 joined native cases and10/10 substantial-landmass admission surveys pass. Combine these with the separate10-map V17 physical geometry/root/foundation/freshwater survey and actual surface pipeline proof. Parent must still review integrated source/build and the close/mid/wide native desktop gallery before publishing/default promotion or accepting M1-15/M1-18. M1-16 organic/perceptual landscape acceptance remains a rendered review. No gate credit is assigned by this artifact. Raw full native saves remain local; committed evidence contains public-seed aggregates only.
