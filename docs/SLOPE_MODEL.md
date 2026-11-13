# Slope model (graded)

**BLUF.** A slight angle is free; a mountainside is not. New villages (`terrainModel==='v3'`) farm slopes the ordinary way: fields on hills up to about 18 degrees (plough) or 30 degrees (small hoe plots), furrows along the contour, terraces only as an optional upgrade. Buildings keep the tiers below. Placement now grades a footprint into four tiers (level, moderate, steep, severe) by mean slope and by fall across the footprint, with tolerances per building class. Each tier above level names the foundation that will be built and charges real wood, stone and extra labour seconds. New villages use it (`state.slopeModel==='graded'`); saves without that field keep the earlier linear rule (one relief allowance + 47 degree neighbour step) unchanged.

Code: `src/game/slopeTiers.ts` (model, pure), `src/game/siteFoundation.ts` (foundation boxes, pure), `Game.siteAssessment()` (sim), `buildingGrounding.ts` / `foundations.ts` (rendering), engine banner + ghost tint (preview). Optional save fields: `state.slopeModel`, `building.site` (validated in `persistence.ts`).

## Tiers (hut / pole-house class; other classes in `CLASS_PROFILES`)

| Tier | Mean slope | Preview | Foundation | Cost |
|---|---|---|---|---|
| Level | < 5 deg | green, "Level site" | none | free |
| Moderate | 5-15 | amber, "Needs levelling" | levelled cut-and-fill pad with kerb | small wood/stone, labour ~ volume moved |
| Steep | 15-25 | orange, "Terrace and wall" / "Posts on steep ground" | stepped terrace with drystone wall; post platform from 18 deg; dugout in soft rock | high; small footprints only; x1.25 slower |
| Severe | > 25 or a ledge > 50 deg | red, "Too steep" | refused, except: dugout in diggable rock (hut/house), footing on an outcrop (watchtower), stilt lean-to (dryrack) | - |

Tier is the worse of the slope tier and the fall tier (fall limits 0.5 / 1.8 / 3.5 m times class k, scaled up for footprints larger than a 5.4 m hut so long stores on faint slopes are not punished). Classes: dwelling 5/15/25, shelter 5/14/22, light 6/16/28, workshop 4/11/18, storage 3/8/14, civic 3/7/12, wonder 2/5/9, tower 5/14/25, field 5/12/22 (terraced strips, no refusal below 22), dock 4/10/18 (dry bank only). Walls, bridges, camps, pens, quarries etc. are exempt. Kilns, ovens, forges, smokehouses and hearths never go on posts. Steep ground also has a largest footprint per class.

Geology (`geologyAt`): exposed hard rock quarries its own stone (x0.6 stone, x1.25 earth labour); sandstone, limestone and tuff can be dug out (dugout); shale and sediment are loose: ceilings drop 15% and stone/labour rise 25%. No geology means plain ground.

Goods and labour: extra wood/stone are added to the placement bill and spent like any cost (planned sites too); `b.site.extraWork` is added to the worker-seconds the site needs (`sim.ts` build step, `villageWorkload.ts`). The free founding hall and `house` renovations (`planAdvancedHome`) are not charged; AI rivals are not surveyed (as before).

Rendering: foundation level is the highest contact (dugout: ground at the door). Every box is sunk to the terrain beneath it (tested), so corners do not float. Ladder sheet: `docs/renders/slope-tiers/slope-ladder.png` (`tools/render-preview/slope-tiers.mjs`).

## Terrain model v3 (new villages) and v2

**v3 is the default for new villages**: hillside farming is ordinary (no terraces unless you choose them). Fields work to 18 degrees with a plough, to 30 degrees as small hand-tilled plots, and only as terraced ground beyond that; furrows follow the contour, a bank holds the lower edge, soil thins and erodes, and a "Terrace this field" action adds earth bunds and then stone facing. See `docs/TERRACE_FARMING.md`. Saves with `terrainModel==='v2'` keep terraces assigned by slope (below); saves with neither keep the plain tiers. Everything below about buildings (shelves, nuance) is the same in v2 and v3.

### Terrain model v2

New villages also carry `state.terrainModel==='v2'`: fields are never refused below a cliff and become terrace strips (`docs/TERRACE_FARMING.md`); every building also reads curvature, aspect, roughness, drainage and natural shelves (a shelf is credited, so a steep hillside with a ledge is not refused). The tier table above is unchanged on plain slopes. Saves without the switch keep the 22 degree field rule.

## Sources

No external sources were fetched for this change. Every number above is a DESIGN VALUE chosen for game feel, informed by general knowledge of terracing, drystone retaining walls, pole platforms and dugouts; none is a cited engineering figure. Stone units follow the stone wall section in `constants.ts` (about 4 units per m3, a design assumption).
