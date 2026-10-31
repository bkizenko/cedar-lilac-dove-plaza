# First integrated execution batch — 2026-10-31

Base: latest origin/main 015c074. Three specialist workers plus integrator, one final build/browser owner. Master scope: INCENTIVE_FIRST_MASTER_PLAN.md.

## Delivered

- M0 narrow adapter: direct gathering/drill suspends paid activities correctly; tests preserve paid materials, progress and save reconstruction. Actor eligibility checks explain physical rejection; 128 timestamped actor assessments are retained per session and reset with a world. This is not yet a sole-owner JobCoordinator or atomic ReservationLedger.
- New worlds use generation v9; historical seeded defaults and saved generation versions remain supported. Decoder accepts v9 and reproduces scenery, terrain and finite resource nodes.
- Beauty: points/100 from water framing, relief, outlook, contrast. SCENERY_RULES contains weights, metre radii and selection percentile. Candidate clearings still satisfy existing dry, resource and spacing checks. Select at/above suitable-site mean and 65th percentile where available; explicit playerAboveAverage reports exceptions such as no candidates/equal scores. Scores remain geographic preferences, not simulated erosion or a complete aesthetic model.
- Test Lab exposes terrain, beauty components, candidate distribution, separate all-dry-land mean and command assessments. Diagnostics are behind the test-copy flow.
- LandscapeArt rules control geological province scale, grade exposure, contour strata and aspect shading. Cached per-vertex values add no draw calls; frame timing/hardware acceptance has not been measured.

## Verification

- Typecheck and production build pass; build retains existing large-chunk warning. No configured database migration needed.
- 27 integrated checks passed: command conservation, haulage, priority/defense, landscape art, terrain quality, old-generation hash and legacy save roundtrips. Final four command tests also pass, adding reset isolation.
- Five scenery tests pass: 12 regression seed/layout combinations, 20 rotating holdouts spanning standard/large/huge and three layouts, deterministic generation, v7 terrain hash and v9 save roundtrip.
- Browser render/interaction checks on development and production output: 1440x900 and 390x844 screenshots, Test Lab opens, diagnostics render, zero page errors. Example seed42 continents: player68.5, suitable-site mean61.0, percentile75, all-dry-land mean59.2. Screenshots in screenshots/scenic-*.png (local QA outputs).

## Remaining gates

M0 is partial. All command paths, priority outcomes, resource/actor atomic reservations, serialized simulation RNG and full replay remain open. New command counters assess actor eligibility, not eventual execution success or command latency.

Unbuilt starts require CampAnchor return/storage targets: nearestDrop and cargo-return paths assume Building interaction, initial spawning depends on hall creation, rival automatic refounding must distinguish initial camps. Deleting halls alone would strand deliveries. First-winter integrated acceptance is not claimed.

M2–M5 remain open: general directed society-pair strategy and knowledge, physical conflict/transport aftermath, institutions/households, Classical capability/victory scenarios, full campaign/performance acceptance. World drainage coherence for each landmass and the full visual reference families remain incomplete. Existing later-era content is retained.
