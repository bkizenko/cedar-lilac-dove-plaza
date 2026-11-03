# M1-05 bounded difficulty controls and qualification audit

Baseline37d183e. Isolated candidate `.play/difficulty-profiles-review`. The fixed gate is: “All six difficulty profiles centrally control abundance/climate/provisions/pressure with explicit advantages.” Master plan line140 specifies resource abundance, climate severity, spoilage, starting provisions, rival decision capability, conflict tolerance and political pressure, while forbidding weaker command reliability.

**Recommendation: keep M1-05 pending, credit0.** There is no actual internal political-pressure/household-grievance executor to configure. No unused political scalar was added, and foreign border tension is not renamed domestic politics. Root explicitly authorized completing the existing-domain controls separately while retaining the full acceptance requirement.

## Implemented existing domains

The central six-profile registry now controls finite new-world node amounts/capacities, starting player food/drinking water, shared temperature departures from12°C, real NPC strategic review intervals and witnessed player-border grievance gain. Existing player food-use, edible-spoilage, incoming-damage and raid/band coefficients retain their exact previous values. Normal coefficients are all1.

| Preset | World node capacity | Player starting food/water | Temperature departure | NPC review interval | Witnessed border grievance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Super easy |1.5×|1.6×|0.55×|2×|0.45×|
| Easy |1.25×|1.3×|0.8×|1.4×|0.7×|
| Normal |1×|1×|1×|1×|1×|
| Hard |0.9×|0.85×|1.15×|0.85×|1.25×|
| Survival |0.8×|0.7×|1.3×|0.7×|1.5×|
| Apocalypse |0.65×|0.5×|1.5×|0.55×|1.8×|

Resource capacity and climate apply to the shared world, including rivals. Starting reserves and the existing food/spoil/damage assistance are player advantages. Rival review policy still uses the same physically known information and paid executors; only its actual strategic cadence changes. Positive witnessed player-border grievance is scaled, while ordinary cooling remains unchanged. Player orders, paths, accuracy and command admission acquire no difficulty-based failure chance.

Finite node amounts and max capacities change only during new-world creation. Seasonal wild-plant quotas subsequently use those actual saved capacities. Tree, wildlife and resource counts, terrain, camp placement, landmass family and biome coverage remain intact. Wildlife density/meat, newly excavated quarry seams, future planted-tree definitions and raw-material spoilage are not universally difficulty-scaled by this patch. It does not mint recurring supplies or change gathering/work rates. Climate modifies actual survival/clothing temperatures and local edible-spoilage temperatures; weather probabilities and durations retain their prior rules.

Menu → New world exposes the real six-option selector through WorldSetup. Numeric effects explicitly distinguish shared-world, player and rival modifiers inside a closed disclosure. Starting another world protects the active village first and refuses replacement if that checkpoint cannot be written. Test worlds keep their existing protected-copy behavior. Restart carries the selected profile forward. Difficulty is serialized on ordinary game state, not terrain-generation options; legacy absent values are Normal, and saved depleted quantities load exactly without reapplying opening multipliers. Existing saved non-Normal profiles receive their newly implemented runtime climate/strategy/tolerance effects but their prior finite stocks are not retroactively changed.

## Behavior evidence

Final dedicated/related suite21/21 passed: `/tmp/difficulty-domains-release.log` (44.06s). Typecheck `/tmp/difficulty-release-type.log` and development build `/tmp/difficulty-release-build.log` passed. New tests exercise all six actual native V14 seed345 openings, not six labels: geometry hash, ecological coverage, native camp coordinates, body/wildlife/node counts, finite food/water amounts and each real resource array quantity/capacity. Six partial-depletion saves preserve exact inventory, nodes, capacities, people and terrain. Invalid IDs/prototype names are rejected; absent legacy difficulty is neutral.

Actual cold exposure, displayed/local temperature, strategic review admission/cooldown and physically witnessed frontier tension follow their controls. The frontier component deliberately declares a controlled local topology and uses a living witness rather than injecting a knowledge record. Separate native-ground direct move scenarios actually reach their destinations for all six profiles, and finite provisions actually incur the measured consumption/spoilage debits. Existing direct combat damage, raids, frontier guarding and survival-needs regressions also pass. The old spoilage-factor test was updated to compose the real climate effect with the existing spoil multiplier; neither existing coefficient was weakened.

A separate fixed-RNG A/B against untouched37d compares the full encoded Normal opening and the state after100 actual Game.step calls. Only the newly explicit difficulty=normal label is removed. Both opening and post-step hashes,650 external RNG draws/end4007004391 and zero simulation errors match exactly. Evidence: `docs/metrics/difficulty-normal-equivalence-2026-11-02.json`; repeatable probe: `scripts/difficulty-normal-equivalence.mjs`. This is behavior equivalence, not a hardware timing measurement.

A broader `survival-winter.test.mjs` fails in both untouched37d and this candidate: its V10 manual opening orders water but never enables Auto work or assigns food, then the camp starves with58 untouched logs. The earlier combined run was19/20 with this failure, not an all-pass result. Baseline log `/tmp/difficulty-winter-baseline.log`, candidate log `/tmp/difficulty-domain-combined.log`. The test and Normal/manual-work defaults were not altered to hide this existing assumption. A connected all-profile seasonal viability/balance campaign remains unqualified.

## Scope and limits

Production source files: difficulty.ts, worldOptions.ts, sim.ts, ecology.ts, frontiers.ts, engine.ts, WorldSetup.tsx and Hud.tsx. No schema, storage quota, save validator, map-generation algorithm or production recipe is changed. The exact numeric observations are in `docs/metrics/difficulty-existing-domains-2026-11-02.json`.

M1-05 remains pending domestic political pressure. There is also no claim of stronger strategic reasoning (the supported lever is review cadence), all-seed/all-biome seasonal balance, complete resource-universe scaling, or target-hardware frame performance. No completion percentage is changed by this worker.
