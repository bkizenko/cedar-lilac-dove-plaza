# Hillside farming and terraces (terrain models v2 and v3)

**BLUF.** New villages (`state.terrainModel==='v3'`) farm hills the way most farmers did: the field is just placed on the slope and worked along the contour, with an earth bank at the lower edge. No stone, no terraces by default. Plough or ard fields work to 18 degrees; hoe and digging-stick plots, small ones only (up to 90 m2), to 30 degrees; beyond 30 degrees only terraced ground can be farmed (an explicit choice, needs the means), up to the cliff limit (mean slope 52 degrees, step 75 degrees, always refused). Soil still thins with slope and erodes, aspect and frost still count; cheap habits (contour furrows, a bank or grass strip, resting under grass) cut the loss by about 45% without any terrace. Terraces are an OPTIONAL investment: a "Terrace this field" action on the field card turns an existing field into earth bunds (everyone), then stone-faced strips (stone-working, a work gang). Peoples differ in how readily they lean to it (mountain, high-altitude, irrigating peoples more) but nothing is ever built on its own. Saves keep the model they were made with: `v2` saves keep terraces assigned by slope (the section "Terrace kinds" below), saves with neither switch keep the plain 22 degree field rule. Every number is a DESIGN VALUE.

## Ordinary hillside farming (v3, the default)

Code: `src/game/hillFarming.ts` (limits, erosion with cheap mitigations, furrow and bank lines, preference, upgrade plan), `siteAssessmentV2.ts` (`model:'v3'`), `terraceRuntime.ts` (`terraceUpgradeQuote`, `terraceField`, `terraceLean`).

| Slope (mean) | Work | Rule |
|---|---|---|
| under 3 deg | level field | nothing special |
| 3 to 18 | plough or ard, furrows along the contour | any plot size; free; amber from 8 deg |
| 18 to 30 | hoe and digging-stick plot, hand-tilled | plots of 90 m2 or less (a default field is about 67); harvest down 1.5% per degree above 18 (about 18% at 30); orange warning tint |
| 30 to 52 | terraced ground only | refused with "Too steep to farm without terraces" unless the people can build that kind (gates below); then placed as an explicit terraced field |
| above 52, or a 75 degree step | cliff | refused, as before |

- **Layout.** No strips, no walls, no goods bill: the field record is a `terrace` record with `k:'none'` (it carries soil, sun, frost, wetness, altitude, slope and yearly soil loss; `k:'none'` means no terraces). Crop rows already follow the survey's contour angle; the placement ghost draws the same furrows (`hillFieldLines`: lines perpendicular to the downhill direction, so level along their length) and a bank at the lowest line, tinted orange with gully risk or on hand-tilled ground. Field edges keep an earth bank, wattle or hedge (never a drystone wall, `boundaryKind(..., noStone)`), only along the lower edge and flanks, and the shader's stone lip is switched off on these fields.
- **Soil and erosion.** Natural soil depth (thins with slope and geology) plus 0.08 m mixed by the plough. Erosion is the same curve as before (tan of the slope, softer rock faster) cut by contour furrows (30%) and a lower-edge bank or grass strip (20%), together 44%. A year rested under grass loses 0.6 of that, bare unsown ground 1.25. Terraces cut it much further (bunds 50%, stone 93 to 97%, on the bare rate). A yearly loss of 5% or more is flagged "gullies will cut this slope". Fields without a record (rivals) use the same ordinary rate.
- **Preview words.** Banner and ghost: "Hillside field" or "Hillside plot (hand-tilled)", the slope, "furrows ploughed along the contour" or "hoed and dug along the contour, small plot", "earth bank at the lower edge", soil, harvest penalty, soil loss per year with the gully warning, and from 12 degrees "Terraces available: <kind> can be added from the field card" or what the people still lack ("terraces later: needs stone-working..."). Cliffs, "Too steep to plough" (plot too big for hand tilling) and "Too steep to farm without terraces" are refused.

## Terrace this field (optional, explicit)

On the field card (v3 only, your own finished fields): "Terrace this field" first builds **earth bunds** (any people, wood only); once bunds stand, the same button reads "Face with stone (...)" and rebuilds the field as the stone-faced kind for its slope (stone-working, a work gang, and for andenes and stairs irrigation know-how and age; the table below). The cost is the new bill less what the bunds already cost, goods are spent at once, the record is rewritten (strips, risers, soil, yearly erosion), and half of any soil already lost is hauled back as fill. Slopes where bunds are all that is needed (under 12 degrees) stop there. Never done by the sim on its own, never by the rival AI.

**Who leans toward it.** `terracePreference` (0 to 0.85): a base 0.08, mountain peoples +0.4, highland (70 m and above) +0.25 or upland (20 m) +0.1, irrigation know-how +0.07, paddy rice +0.2 (the hook for a rice civ; no rice crop exists yet). `terracePressure` (0 to 1) rises with yearly soil loss and with steepness beyond 18 degrees. `terraceInclination` = pressure x (0.2 + 0.9 x preference), never above 0.92 and zero without pressure; `leansToTerrace(pref, pressure, fieldId)` is a deterministic yes/no per field. The field card says "Your people favour terracing a slope like this" when it is yes. Advice only: it never builds, never forces, and a keen people still declines some fields.

## Save and switch

Optional, validated: `state.terrainModel` is `'v2'` or `'v3'` (both need `slopeModel==='graded'`); new games write `'v3'`. `building.soilLoss`, `site.terrace`, `site.tags` need either model. v3 adds no new save fields: an ordinary hillside field is a `k:'none'` record, an upgraded one a normal bund or stone record. v2 saves keep terraces assigned by slope and have no upgrade action (`terraceUpgradeQuote` returns null). Rival fields in v3 use the ordinary limit (`maximumOrdinaryFieldGrade`), not the cliff limit.

## Sheets

`docs/renders/hill-farming/hill-default.png` (10, 18 and 26 degree fields, the last facing south-west: furrows and crop rows along the contour, lower-edge bank, no stone) and `hill-terraced.png` (the same hillsides after "Terrace this field": top row earth bunds, bottom row stone facing, with goods and soil-loss change). Built from the real code by `tools/render-preview/hill-farming.mjs` (`render-three.mjs hill-farming-default|hill-farming-terraced`, `--scale=1.5 --shot-timeout=150000` on a software GL). The v2 sheets stay under `docs/renders/terraces/`.

# Terrace kinds and the v2 model (automatic terraces; also the optional upgrade ladder in v3)

**v2 BLUF (saves with `terrainModel==="v2"`).** Fields are no longer refused above 22 degrees. On a hillside a field is laid out as narrow contour strips held by retaining walls, in four kinds that grow with the slope (earth bunds, drystone, stone-faced and drained "andenes", tall stairs). Cost and build time rise with the slope; the bigger kinds need stone-working, irrigation know-how, a work gang and age. A field is refused only on a cliff face (mean slope above 52 degrees or a step above 75) or on bare rock. Placement also reads curvature, aspect, roughness, drainage and natural shelves, so a steep hill with a flat ledge is a good site. New villages get it (`state.terrainModel==='v2'`, needs `slopeModel==='graded'`); saves without it keep the earlier rules byte for byte. Every number is a DESIGN VALUE; the history below only informed it.

Code: `src/game/terraceFarming.ts` (kinds, gates, layout, bill, soil, yield, erosion, strip geometry), `slopeNuance.ts` (curvature, aspect, roughness, shelf, wetness, risks), `siteAssessmentV2.ts` (assessment for buildings and fields), `terraceRuntime.ts` (capability from the sim, harvest factor, yearly soil loss), `terraceRecord.ts` (save record + validators). Rendering: `siteFoundation.ts` ('strips' with `terrace`), `buildingGrounding.ts`, `contourFields.ts` (crops on the level treads), ghost in `world.ts`, banner in `engine.ts`.

## Terrace kinds

| Kind | Mean slope | Riser | Needs | Notes |
|---|---|---|---|---|
| Contour bunds | 5-12 | 0.4 m | nothing | earth bunds and grass strips, no stone; stops half the erosion |
| Drystone terraces | 12-24 | 1.0 m | stone-working (finished quarry or Bronze Age), 4 workers | strip walls of drystone |
| Stone-faced terraces | 24-38 | 1.7 m | stone-working, irrigation know-how (dug ditch, opt-in irrigation or Iron Age), 10 workers | gravel drainage layers, water channel down the terraces, walls store heat |
| Terrace stairs | 38-52 | 2.2 m | Iron Age, irrigation know-how, 16 workers | tall narrow stairs; refused on bare rock |

A mountain people (identity symbol) needs 30% fewer workers, knows andenes without ditches and builds 15% cheaper. Strip count = fall / riser, limited by a minimum workable tread. Stone, wood and worker-seconds are real goods spent like any other cost (`b.site.extraWork` is added to the build need); loose ground costs more, hard rock is quarried on the spot, thin soil means hauled fill.

## Soil, climate, yield, erosion

- **Soil depth** thins with slope and geology (`naturalSoilDepth`); terraces bring fill (`terraceSoilDepth`), still limited by thin geology.
- **Aspect**: a sun-facing slope (south in the north hemisphere) is warmer; the effect grows with altitude. **Frost**: hollows pool cold air; stone walls blunt it by 35%. **Wetness**: waterlogged hollows lose yield.
- **Altitude** (metres above water; bands at 20 and 70 m): highland favours tubers, lowland grain. Only grain, pulses and tubers exist; `HIGHLAND_CROPS` (potato, maize, quinoa) is a hook, not implemented.
- **Erosion**: each year a field loses a share of its soil (`b.soilLoss`, capped 0.6) that scales with tan(slope), softer rock, bare ground, and is cut by 50 to 97% by bunds and walls. Lost soil lowers the harvest by the same share. Fields without a terrace record (rivals are never surveyed) count as unterraced.
- The harvest factor is `terraceYield * (1 - soilLoss)` inside `farmHarvestEstimate`.

## Slope nuance (all buildings and fields)

Curvature (centre minus ring mean: ridge = windy, hollow = damp or frost), aspect/sun, roughness (plane-fit residual; broken ground is slower), **natural shelf** (55% or more of the footprint flat, spread under 0.75 m, on a hillside of 10 degrees or more: the flat part decides the tier, foundation work is cut 40%, shown as "Natural shelf"), wetness (rock permeability, water distance, hollow, low slope), and risks (landslip, flood, frost, wind) that scale stone and labour. Preview words: Natural shelf, Hollow: damp, Hollow: frost, Ridge: windy, Sun slope, Shade slope, Broken ground, Slip risk, Flood risk, Wet ground. On refused ground the banner points at a nearby shelf ("natural shelf 7 m north-west"). Level ground can still say "Sun slope" or "Natural shelf".

## v2 save record

Optional, validated: `state.terrainModel` ('v2', requires graded), `building.soilLoss` (0..0.6, farms, v2 only), `building.site.terrace` (kind, strips, riser, tread, soil, sun, frost, wet, erosion, altitude, slope) and `site.tags` (known words, v2 only). Old saves have none and are never touched.

## v2 sheets

`docs/renders/terraces/terrace-farm.png` (four field rows up a mountain: bunds, drystone, stone-faced with channel, stairs; crops on the level treads) and `slope-nuance.png` (ridge, hollow, shelf, smooth vs broken, sun vs shade). Built from the real code by `tools/render-preview/terraces.mjs`.

## Sources actually fetched (2026-11-13, for the v2 terrace kinds only)

- Terrace (agriculture), Wikipedia: Yemen terraces from the 3rd millennium BC; Levant from the 4th millennium BCE; Andes: Wari before 1000 AD, Inca later, Machu Picchu fed by them; Mediterranean terrace building intensified c. 1100-1600; terraces cut erosion and runoff. <https://en.wikipedia.org/wiki/Terrace_(agriculture)>
- Inca technology, Wikipedia: excavate, fill behind a retaining wall; large rocks at the base, then smaller rocks, a sand layer, topsoil; drain outlets in the walls; walls absorb heat by day and release it at night against frost; channels beside stairways carry runoff. <https://en.wikipedia.org/wiki/Inca_technology>
- Banaue Rice Terraces, Wikipedia: stone and rammed-earth walls, irrigation from the forest above, about 1,500 m, age over 2,000 years is disputed, needs constant rebuilding. <https://en.wikipedia.org/wiki/Banaue_Rice_Terraces>
- Cinque Terre, Wikipedia: terraced vineyards and olives; maintenance decline linked to the 25 Oct 2011 floods and mudslides. <https://en.wikipedia.org/wiki/Cinque_Terre>
- WOCAT, bench terraces, Yemen (qcat 5357): slopes over 60% (about 31 degrees), hand-built walls 1.8-3 m high, annual wall repair after rains, many terraces abandoned when upkeep is unaffordable. <https://qcat.wocat.net/en/wocat/technologies/view/permalink/5357>
- University of Chicago Magazine, Yemen: terracing 4,000-5,000 years old, runoff water harvesting with sluices and dams. <https://magazine.uchicago.edu/9710/9710investig1.html>
- Not retrieved: the Wikipedia "Andenes" page (fetch blocked).

## [UNVERIFIED]

v3 (no sources fetched for it): the 18 and 30 degree working limits, the 90 m2 hand-tilled plot size, the 1.5% per degree harvest penalty, the 30% and 20% erosion shares of contour furrows and a lower-edge bank, the grass-fallow and bare-ground factors, the preference weights per people, and the idea that rice civs terrace more (no rice crop exists). Contour ploughing, ridge-and-furrow, strip fields and hedge or earth-bank boundaries are general agricultural knowledge, not looked up here. Cover crops and manure are not modelled as separate actions: resting under grass and the existing fertility rules stand in for them.

v2: all game numbers (slope bands, risers, costs, gate sizes, yield, erosion and altitude multipliers, the 52 and 75 degree cliff limits). Chinese terraces, Mediterranean wall heights, andén widths and slopes, labour figures, frost-pocket and aspect effects in the game's hemisphere, and Inca altitude ranges for potato, maize and quinoa were not fetched. Irrigation channels follow `docs/IRRIGATION_RESEARCH.md` only loosely (the opt-in irrigation model is a gate, not a dependency).
