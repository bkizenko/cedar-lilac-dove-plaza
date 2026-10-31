# V13: several substantial landmasses

V13 is an explicit generation branch. It does not change versions 1–12, the default version, or saved-game decoding. The old layout names remain compatible inputs; even the legacy `pangaea` setting now describes a group of substantial mainlands in V13. No setting permits a single giant showcase island with minor satellites.

## Physical acceptance

`MULTILAND_RULES` is the central tuning table in `src/game/multipleLandmasses.ts`:

- 2–5 substantial connected dry landmasses.
- Each substantial landmass has at least 18,000 m² of actual connected dry terrain.
- The largest has at most 62% of total dry terrain.
- The second has at least 13% of total dry terrain and at least 18,000 m².

`world.topology` records every final connected component, its area and center, total dry area, substantial count, and largest/second shares. The survey uses the final 4.0625 m terrain samples and the actual local water surface. Lakes and rivers remove wet cells. These are measured terrain components, not counts of construction ellipses or feature markers. Generation fails visibly when the physical gates fail. `MULTILAND_GEOMETRY_GATES` also rejects missing measured map-level relief, terraces, pillars, valley flanks, lake area or waterfall bed drop; feature labels alone cannot pass. This rejection guards invalid terrain; it is not a repair or a claim that every untested seed is already qualified.

## Geographic organization

The landmasses have independently seeded coastal outlines, orientations, sizes and complete lake/outflow/tributary watersheds. Their IDs are unique. Each river extends to its own landmass coast. The terrain chooses the owning landmass before evaluating its geographic relief, avoiding additive remote mountains or distant channel stamps.

The first watershed retains the full required catalogue. Secondary watersheds vary their real terrain: lower dry rolling country with dunes but no pillars/high shelf; higher cragged country with pillars and a shelf but no dunes; or eroded shelf country without either pillar or dune districts. Mountain relief and orientation differ. V13 canyon benches retain 16 m physical flats between 4 m risers on one bank and a different broad two-tier sequence on the other. This avoids losing the first terrace inside river-bank carving or erasing narrow flats during 4 m heightfield interpolation. A wider shelf envelope retains a substantial high plateau around those benches. Valley cross sections sample the actual northern ridge and southern shoulder separately, avoiding off-island sea samples. Per-region physical measurements are exposed in `world.landscape.regionalGeometry`. Map-level mandatory families and all eight substantial connected ecological provinces remain required; every island need not reproduce every biome or spectacle.

The current compact outline is an irregular stretched island with multiscale coastal noise. It is not yet a full coastline taxonomy of fjords, atolls and calderas. These would require their own physical coverage criteria and drainage checks. No visual completion claim follows from the topology tests.

## Validation

`scripts/multiple-landmasses.test.mjs` checks final connected terrain, largest/second shares, map-level feature coverage, actual prominence/summit/canyon/cliff/terrace/plateau/pillar/valley/hills/dunes/lake/fall measurements across regions, eight ecological connected-area thresholds, unique water-body IDs and independent freshwater catchments across all three map sizes and all three layout inputs. It also compares complete serialized generated worlds against pre-change SHA-256 baselines for versions 7, 10, 11 and 12.

A separate development sweep checks 32 seeds across all three layout inputs (96 topology/interior cases). This sweep checks room for regional terrain generation; it is not a substitute for final terrain/ecology tests or desktop rendering acceptance.

## Recorded qualification

The final 20 rotating full-world holdouts pass: 7 small, 7 medium and 6 huge maps; 8 pangaea-input, 6 continents-input and 6 archipelago-input maps. Actual component counts span 2–5. Largest shares range from 21.2% to 53.9%; the smallest second mainland is 77,816 m². Every map passes actual geographic measurements, all eight connected ecological area thresholds, dry resource roots, dry camps and above-average home checks. See `docs/qa/v13-holdouts.json`, which records the source fingerprint. Earlier failed/partial runs are retained beside it, documenting the narrow-terrace defect and its correction.

Two real worker movement checks also pass on the final terrain: seed 42 walks 129.4 m uphill by 5.4 m, and seed 1 walks 346.3 m uphill by 17.6 m. Maximum individual vertical steps are 0.55 m and 0.53 m. These tests isolate resident navigation rather than running the full survival simulation, do not teleport, and do not mark archaeological finds collected. See `scripts/v13-upland-traversal.test.mjs` and `docs/qa/v13-upland-traversal.json`.

These checks do not establish desktop visual acceptance, boat journeys or every possible seed. Generation timing was measured as wall-clock time during concurrent development, including an unexplained 320.7-second outlier; it is not a performance benchmark. V13 remains opt-in until integration accepts its rendered scene, water/navigation behavior and saved-game compatibility.
