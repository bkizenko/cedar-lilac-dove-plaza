# Terrace farming and terrain nuance (terrain model v2)

**BLUF.** Fields are no longer refused above 22 degrees. On a hillside a field is laid out as narrow contour strips held by retaining walls, in four kinds that grow with the slope (earth bunds, drystone, stone-faced and drained "andenes", tall stairs). Cost and build time rise with the slope; the bigger kinds need stone-working, irrigation know-how, a work gang and age. A field is refused only on a cliff face (mean slope above 52 degrees or a step above 75) or on bare rock. Placement also reads curvature, aspect, roughness, drainage and natural shelves, so a steep hill with a flat ledge is a good site. New villages get it (`state.terrainModel==='v2'`, needs `slopeModel==='graded'`); saves without it keep the earlier rules byte for byte. Every number is a DESIGN VALUE; the history below only informed it.

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

## Save and switch

Optional, validated: `state.terrainModel` ('v2', requires graded), `building.soilLoss` (0..0.6, farms, v2 only), `building.site.terrace` (kind, strips, riser, tread, soil, sun, frost, wet, erosion, altitude, slope) and `site.tags` (known words, v2 only). Old saves have none and are never touched.

## Sheets

`docs/renders/terraces/terrace-farm.png` (four field rows up a mountain: bunds, drystone, stone-faced with channel, stairs; crops on the level treads) and `slope-nuance.png` (ridge, hollow, shelf, smooth vs broken, sun vs shade). Built from the real code by `tools/render-preview/terraces.mjs`.

## Sources actually fetched (2026-11-13)

- Terrace (agriculture), Wikipedia: Yemen terraces from the 3rd millennium BC; Levant from the 4th millennium BCE; Andes: Wari before 1000 AD, Inca later, Machu Picchu fed by them; Mediterranean terrace building intensified c. 1100-1600; terraces cut erosion and runoff. <https://en.wikipedia.org/wiki/Terrace_(agriculture)>
- Inca technology, Wikipedia: excavate, fill behind a retaining wall; large rocks at the base, then smaller rocks, a sand layer, topsoil; drain outlets in the walls; walls absorb heat by day and release it at night against frost; channels beside stairways carry runoff. <https://en.wikipedia.org/wiki/Inca_technology>
- Banaue Rice Terraces, Wikipedia: stone and rammed-earth walls, irrigation from the forest above, about 1,500 m, age over 2,000 years is disputed, needs constant rebuilding. <https://en.wikipedia.org/wiki/Banaue_Rice_Terraces>
- Cinque Terre, Wikipedia: terraced vineyards and olives; maintenance decline linked to the 25 Oct 2011 floods and mudslides. <https://en.wikipedia.org/wiki/Cinque_Terre>
- WOCAT, bench terraces, Yemen (qcat 5357): slopes over 60% (about 31 degrees), hand-built walls 1.8-3 m high, annual wall repair after rains, many terraces abandoned when upkeep is unaffordable. <https://qcat.wocat.net/en/wocat/technologies/view/permalink/5357>
- University of Chicago Magazine, Yemen: terracing 4,000-5,000 years old, runoff water harvesting with sluices and dams. <https://magazine.uchicago.edu/9710/9710investig1.html>
- Not retrieved: the Wikipedia "Andenes" page (fetch blocked).

## [UNVERIFIED]

All game numbers (slope bands, risers, costs, gate sizes, yield, erosion and altitude multipliers, the 52 and 75 degree cliff limits). Chinese terraces, Mediterranean wall heights, andén widths and slopes, labour figures, frost-pocket and aspect effects in the game's hemisphere, and Inca altitude ranges for potato, maize and quinoa were not fetched. Irrigation channels follow `docs/IRRIGATION_RESEARCH.md` only loosely (the opt-in irrigation model is a gate, not a dependency).
