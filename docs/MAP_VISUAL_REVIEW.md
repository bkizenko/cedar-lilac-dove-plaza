# Desktop landscape and settlement visual review

Review date: 2026-10-31. Scope: the three newly supplied Dawn of Man reference images and actual Hearthwild desktop captures. Desktop is the acceptance surface; no mobile work is part of this batch. Reference images guide playable geometry and material treatment, not static backgrounds or replacements for gameplay.

## Finding

The current renderer does **not** meet the requested landscape standard. The terrain has elevation, but a tall smooth mound is not a convincing mountain range. Scenic score improvements and passing slope tests do not establish visual acceptance. The current `bierstadt-cole-region.png` capture particularly exposes a broad, almost uniform green mountain apron, weak summit hierarchy and a dark linear seam that reads as a terrain defect. Atmospheric tint and rock color alone cannot fix that geometry.

The normal opening captures (`scenic-world.png`, `needs-desktop.png`) show a small green patch surrounded by bright knowledge fog. They do not prove a varied explorable landscape. The unbuilt player camp is appropriate for campaign rules, but that rule does not excuse unreadable geography, sparse ground structure or a landscape without visible destinations.

## What the references actually do

| Supplied reference | Useful observation | Playable consequence |
| --- | --- | --- |
| `ddf49dfc…` elevated lake village | A broad water corridor separates land uses; close boulders, cultivated slopes and a chain of rugged hills establish several distance bands. Mountain mass is broken into connected outcrops and gullies. | Banks and crossings must be readable. Flat settlement ground, rolling foothills and steep rock should coexist in one view, with traversable routes between them. |
| `6b3aa742…` close village and skyline | Human-scale fences, roof fibers, exposed frame members and work yards provide scale. Distant peaks have varied heights and saddles. Lower slopes retain vegetation, while exposed faces are materially different. | Preserve building and person scale; avoid one enormous slope filling the view. Distinguish roof, frame, wall, ground and exposed rock through shape and material, not palette swaps alone. |
| `45db8c4c…` fortified village | Large rough stones make a heavy wall base; timber ties, platforms, braces and tower roofs reveal construction and function. People beside the wall demonstrate its height and defensive use. | Walls need thickness, readable parapets and actual gates/approaches. Tower walk decks and supports must be visible; wall geometry must match collision and usable routes. |

Do not copy photographic texture density indiscriminately. Hearthwild's restrained block forms can remain, but large silhouettes and construction logic must carry the same information.

## Terrain hierarchy required next

1. **Landmass:** several coherent high and low districts, rather than one global mountain stamp.
2. **Range:** connected primary ridge with subordinate peaks, saddles and branching spurs; no repeated rounded cones.
3. **Slope:** exposed rock faces interrupted by gullies, ledges and vegetated shoulders. A low-poly ridge may use angular facets, but facets must describe a ridge rather than a smooth cone's triangulation.
4. **Valley:** a broad usable floor, drainage that follows terrain and at least one physical approach toward uplands. Abrupt uniform trenches and dark cracks fail review.
5. **Foreground:** rolling ground, grouped boulders/outcrops and vegetation transitions, leaving clear work areas and paths. Rocks must sit on real dry ground and respect navigation or remain nonblocking minor detail.
6. **Water:** broad enough lake/river surfaces to read at the normal desktop camera, explicit banks and narrow crossing opportunities. Water must not be a blue decoration on dry terrain.

Core variety is required on every playable standard/large map: hills, usable valleys, freshwater and reachable uplands. Tiny islands may borrow the nearest reachable landmass's major destination rather than receive an identical waterfall/range/plateau checklist. Spectacular landscape families should remain unevenly distributed. Above-average player beauty is a relative placement preference subject to dry, connected and viable settlement constraints; it is not a reason to flatten the entire start district or assign random beauty values.

## Materials, lighting and camera

- Rock exposure follows measured slope and geological province. Pale ridges, warm layered stone and darker ravines need meaningful large-scale separation. Current same-green mountain faces fail this criterion.
- Use angular mass and contour-following strata before adding tiny texture noise. Thin stripes cannot rescue an undifferentiated silhouette.
- Warm daylight and cool shadow should reveal faces without turning all grass dark green or coating everything in pastel fog. Weather and winter remain legible.
- Atmospheric separation should distinguish foreground, middle distance and skyline. It must not wash out the nearest mountain or erase cliff contrast.
- Review at normal playable desktop camera distance and a deliberate exploration overview. An extreme zoom-out that turns residents into specks does not establish useful scale.
- New terrain and its renderer must agree: heightfield samples, dry placement, navigation, mining approaches and rendered relief must occupy the same surface. Decorative detached mountain meshes are unacceptable substitutes.

## Measured checks and rendered gates

Generation diagnostics should report landmass coverage, local relief distributions at multiple radii, ridge/saddle prominence, steep exposed fraction, gentle connected valley area, freshwater-bank access and reachable upland routes. Report ordinary and spectacular regions separately. Scenic beauty must expose its component scores and selected-start percentile.

These measurements are proposed checks, not achieved results. Thresholds must be tuned against actual fixed and holdout seeds. An average-slope statistic can pass while all visual relief is concentrated in one giant hill; include spatial coverage and per-landmass distribution.

A retained batch needs actual desktop captures for: normal player opening, a representative ordinary district, its most attractive reachable district, a lake/river bank and an upland route. Include at least three seeds across pangaea, continents and archipelago. The integrator owns final rendered verification. Review must explicitly reject smooth mound silhouettes, impossible banks, cracks, floating props and uniform mountain material even if numerical tests pass.

## Ownership and remaining scope

- Geography worker: versioned physical relief/drainage changes, shared generation contract, fixed/holdout diagnostics and old-save preservation.
- Landscape renderer worker: slope/region material treatment, camera-readable terrain families and bounded foreground rocks using actual terrain. Begin source changes only after the pending gameplay integration commit.
- Integrator: schemas, save versions, final build, actual desktop browser review and publication evidence.
- Dense functional villages and rough stone/timber fortifications remain necessary work. They are not completed by this landscape review or by adding more resource bundles to an unbuilt camp.

## Additional Civilization references and revised material requirement

The four newer supplied images (`7d5cf188…`, `cb48c207…`, `6f4f45a0…`, `ebcf69e5…`) make the missing surface hierarchy especially clear. Nearby land shows mineral variation, ground cover and broken rock; mid-distance terrain preserves different ecological districts; water changes from transparent turquoise shelves to dark blue depths with bank foam and reflected light. The close city reference combines materially rough mountains with readable streets, terraces and buildings. Flat vertex recoloring does not deliver this. The next renderer implementation therefore needs original surface detail affecting albedo, roughness and normals, plus actual terrain-depth-driven water. This is additional to, not a substitute for, authoritative rugged heightfield geometry. No generated photograph, background landscape or detached mountain mesh will be used as evidence of playable terrain quality.

The latest explicit map requirement supersedes the earlier optional-presence interpretation: every map must contain the requested core landscape families, including canyon/cliff/terrace/plateau/pillar/fall/dune destinations. Their extent and prominence may vary. Physical feasibility, freshwater heights and access must be checked rather than implied by decorative stamps. The map worker's implementation brief owns those generation requirements.
