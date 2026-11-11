# Farming calibration: source evidence, present ratios and a safe next change

Status: research and an isolated calculator, not a gameplay rebalance. `src/game/farmCalibration.ts` has no runtime callers. No existing village, food dispatcher, field, crop, calendar or release-gate denominator changes. Three short calculator checks pass in `.play/farm-calibration.log`.

## The immediate mismatch

A neutral full-care base plot is 8.2 × 8.2 rendered metres. Its 260 potential grain portions become 520 sheaf items, 260 gross cleaned grain portions, 20.8 seed units and 239.2 edible grain portions. Eventual bread represents 287.04 nourishment. A hypothetical neutral adult with appetite 1 on Normal, without weather modifiers, consumes 64.8 nourishment per 1,800-simulation-second year. The ideal plot therefore represents 4.43 adult-years before spoilage, hauling, incomplete batches and other losses. This is economic/spatial compression; 67.24 rendered square metres is not a defensible claim of historical acreage.

The current standard dedicated pipeline has these **fractional-batch throughput equivalents**:

| Stage | Worker-seconds for that ideal plot |
|---|---:|
| Thresh 520 sheaves at 8/12 seconds | 780 |
| Winnow 65 batches at 8 seconds | 520 |
| Grind 239.2 grain at 4/24 seconds | 1,435.2 |
| Bake 239.2 flour at 4/24 seconds | 1,435.2 |
| Post-harvest total | 4,170.4 |
| Sow, tend and reap in the field, before row walking/tools | 126 |

The archived approximate 4,130 figure was not exact; use 4,170.4 for these specific standard recipes. Full batches, leftovers, expanded/bulk methods, practice, weather and travel produce different executed results. The all-hearth equivalent is 8,879 worker-seconds. Post-harvest work is approximately 33 times nominal field work in this neutral comparison. This does not itself prove a historical rate is wrong, but identifies where a throughput retune would matter most.

Fertility currently changes yield, not sowing/tending time. At 50% fertility the neutral potential is 130: nominal field work falls only from 126 to 113 seconds (less to reap), while crop output halves. Full sowing/tending effort remains 100 seconds. Grain removes 0.12 fertility per fully sown year, pulses 0.03; both stop at the 0.50 floor. An unsown year restores 0.24 at the next annual reset (0.30 with the specific economy choice). Pulses slow depletion but do not replenish it. Terrain yield also averages habitat and soil quality across at most nine equal-area samples; moisture/weather apply separately. These are existing game rules, not measured agronomic rates.

**Annual seed use is missing.** Marking a base field currently pays four seed units once, and expansion pays four per added base area. Annual `farmWork` sowing does not withdraw seeds. Meanwhile winnowing allocates 8% of gross cleaned grain to seeds every harvest. This explains accumulation; it is not an annual replacement-seed model. Do not describe the allocation percentage as a historically validated sowing ratio.

## What primary evidence can actually support

- **Medieval management, not a universal ancient baseline:** Walter of Henley’s c.1275 text describes a threefold sowing return in a worked example and a reaping/binding band of five people covering two acres daily. The latter converts to about 6.18 person-days per cultivated hectare **for those operations only**. It excludes ploughing, sowing, weeding, transport, threshing and household processing. Medieval acreage/bushel definitions and normative management advice are additional uncertainties. [Primary text in translation](https://sourcebooks.web.fordham.edu/source/1275manors1.asp).
- **Yield definitions and regional variation matter:** Reynolds’s original L’Esquerda/Butser experiments report much higher returns under some treatments, including a 43-fold emmer return after fallow and 52-fold after legumes in the cited 1994 trial. The study extrapolates sampled ear yield; that cannot be equated automatically with cleaned edible grain after deductions. It also documents climatic/treatment differences. Use regional distributions and failure risks, not one universal medieval ceiling. [Original experimental report](https://butser.org.uk/medieval%20cereals.pdf).
- **Grinding is substantial recurrent work:** Dietrich et al.’s Göbekli Tepe replicas processed 0.5 kg of einkorn in 40–60 minutes. This supports approximately 0.5–0.75 kg per person-hour for that grain/tool/experiment, not all querns or all populations. [Original experiment, discussion](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0215214).
- **Calories need explicit diet assumptions:** FAO’s table assigns medium-wheat whole meal/flour 334 kcal per 100 g. Its adult-energy report explicitly relates requirements to body size and habitual activity, rather than a single universal allowance. An illustrative game-analysis scenario of 3,000 kcal/day with 65% from cereals implies about 213.1 kg of that cereal equivalent per adult-year. Those diet choices are assumptions, not measurements of ancient inhabitants. [FAO cereal composition](https://www.fao.org/4/X5557E/x5557e04.htm), [FAO adult-energy framework](https://www.fao.org/4/y5686e/y5686e07.htm).

This pass could not reopen the archived Titow Cambridge excerpt (503), and FAO’s family-farming threshing page returned 403. Earlier notes retain their provenance, but neither is newly verified here. A reliable universal active-time allowance for winnowing, fuel preparation, kneading and baking is still absent. Do not silently fill those gaps with a single historical multiplier. Baking duration and active baker labor are different quantities.

## Explicit scenario, not a new default

For a sensitivity calculation only, assume one cultivated hectare, 600 kg gross **clean** grain/ha, 100 kg viable sowing seed/ha, 80% seed viability, 10% loss after seed allocation, and the diet above. Required seed is 125 kg; food is 427.5 kg; the field supplies roughly two adult cereal-diet-years. If half the arable area is fallow, that cultivated hectare requires two arable hectares. Other foods, animal feed, taxes and non-arable land are additional.

The calculator exposes every input and seed shortfall. If gross production is only 80 kg in that example, it allocates at most those actual 80 kg and reports a 45-kg seed shortfall; no food or seed appears. Gross-clean-yield values such as 400/600/800 kg/ha are analyst sensitivity cases, not certified universal ancient yields.

There is deliberately no `foodUnitKg` or `renderedMetreToHistoricalHectare` default. Separate the rendering scale, cropped area, grain mass, nourishment and accelerated calendar before adding either conversion.

## Recommended implementation order

1. **Preserve the current village and diagnose the pipeline.** Existing ready-food starvation, blocked carriers and paid-job recovery remain operational problems. A large sheaf stock is not ready meals, and changing farm yield would not repair an idle grinder. Measure field work, hauling, each processing stage, queue time, spoilage and edible delivery separately.
2. **Add a per-world agriculture profile before changing live constants.** Profiles should state cropped-area compression, crop/variety, cleaned yield distribution, sowing density/viability, moisture/soil response, storage losses and stage-specific methods. The research calculator can compare profiles without importing them into the scheduler. Do not assign one profile solely from a civilization label.
3. **Model actual annual sowing demand and separate reserves.** Compute the next planted area’s real seed requirement, reserve it from existing seeds, and visibly limit or queue sowing when insufficient. Keep seed reserves, cleaned food grain and straw/chaff distinct. Grain consumption and seed quantities need a declared compatible unit before using historical seed ratios.
4. **Retune processing and field work together.** The current 33:1 post-harvest/field ratio is the first measured sensitivity target. Distinguish threshing, winnowing and grinding; distinguish staffed work from drying/baking exposure. Use explicit recipe parameters and actual work positions. Do not apply a global productivity buff or require one permanent specialist at every station in a 50-person settlement.
5. **Roll out safely.** Keep existing worlds on their saved balance version. Offer an explicit opt-in/new-world profile; do not retroactively shrink stored harvests or raise seed charges on already-paid crops. Qualify identical saved 10/30/60/100-person cases through seasons, wet winnowing, a raid, limited storage and Auto Work off before recommending migration. Record population survival, edible reserves, seed balance, delivered crops, processing labor and blocked time. Component calculator tests do not pass a gameplay gate.

The preferred game direction is a reliable hand-processing fallback, protected dry-grain reserves and small meal/flour buffers, followed by real gains from larger staffed workshops, better querns and powered mills. More fertile land can sustain more people, but land, processing positions, water/fuel, seasonal labor and storage should jointly constrain expansion. These are implementation choices to test; no new live balance values have been selected by this document.
