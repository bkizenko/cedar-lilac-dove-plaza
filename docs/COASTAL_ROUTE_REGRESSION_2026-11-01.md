# Bounded coastal-route regression — 2026-11-01

A natural V14/seed 1 archipelago voyage remained in `sailingOut` after moving only 1.04m. Its cargo and crew were still present while finite provisions ran out. Read-only checkpoint inspection found valid start/goal water cells in the same connected region. All 16 local half-meter movement probes passed the existing physical checks.

The ordinary 24,000-node search returned no path; the existing 96,000-node long-journey search found a 372-point route. Coastal actors normally have order `move`, and their voyage flag was missing from `Game.steer`'s deliberate long-journey classification. The change adds only `coastalVoyageId` to that classification. Search budgets, physical water checks, route caching and retry behavior remain unchanged.

The extra fallback search measured about 12ms in one diagnostic, after the failed ordinary search. This is a bounded additional cost, not a frame-time guarantee. The resulting route is cached by the existing mechanism.

## Reproducer and correction

The committed fixture contains only an 8KB run-length navigation mask, public world recipe, endpoints and expected route length. It contains no serialized village, resident records or inventories. The test regenerates the native heightfield and verifies that its marine grid exactly matches that extracted mask. Navigation-reference hull/cargo/buildings are controlled initial conditions, not evidence of paid commissioning.

The first fixture incorrectly recruited a worker directly on water. `spawnUnit` deliberately relocated that recruit onto dry ground, so checking the relocated person's height falsely suggested a world-generation difference. Explicitly initializing the already-aboard state at the recorded water point fixes the fixture. Fresh and decoded height-array hashes match; no missing random-layout hint or terrain-generation bug was demonstrated.

Two bounded tests check the exhausted ordinary budget, successful existing fallback, save/reload ownership and physical departure of the same loaded captain. A separate precise checkpoint-clone probe advanced the actual captain 39.15m in 30 ordinary boat-AI steps, with maximum step 1.51m; every step passed physical checks. Cargo, HP, provisions, tribal stocks and source save were preserved in that navigation-only probe.

This qualifies departure from the reported stall. It does **not** establish a completed natural voyage, barter, replenishment or return delivery.
