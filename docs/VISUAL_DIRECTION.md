## Additional Civ visual context — October 31, 2026

Four further images demand richer surface treatment: soil/rock texture and strata, varied ground cover, depth-graded water with shore foam and clear banks, coherent biome transitions, dense integrated city composition and readable light/shadow. These augment the rugged Dawn of Man close/mid-range references and Bierstadt/Cole composition. Original materials/meshes must carry the detail; flat vertex-color repainting alone is insufficient. Validate actual desktop gameplay views at close/middle/wide zoom, with a measured render/memory budget. No mobile-specific work.

## User correction — October 31, 2026

Desktop only; mobile/touch requirements in generic workspace guidance do not apply. Current terrain is rejected as too flat and monotonous. The three new Dawn of Man reference images require visibly rugged enclosing mountains, nested relief, broken/rolling foreground, exposed rock, broad river/lake compositions, usable fields and connected settlement space. Fortifications need weight and functional entrances: rough stone/timber compounds and recognizable towers. The master plan now requires every map to include all requested landform families, with measured geometry and actual rendered exploration review. Smooth tall mounds, feature tags and near-universal gentle terrain are not acceptance.

# Hearthwild visual direction

**Proposal, October 31, 2026.** This brief records the current requested direction; it does not claim these changes are implemented. It refines `ART_DIRECTION.md` and the visual preference in `REWORK_DIRECTION.md`: coherent, stylized blocky 3D with richer objects, materials and activity, sized for an M1 MacBook Air with 8 GB memory. Keep the simulation work in the existing rework plan ahead of a wholesale art replacement.

## Reference board: borrow principles, create original assets

| Reference | Proposed lesson for Hearthwild |
| --- | --- |
| [Dawn of Man — official Steam page](https://store.steampowered.com/app/858810/Dawn_of_Man/) · [reference screenshot](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/858810/ss_2fb0ff284e4d5f7972a5c414ca279ce665031e9e.1920x1080.jpg?t=1731856813) | Start with a believable rural settlement: useful outdoor space, visible subsistence work and buildings that belong to their surroundings. |
| [Age of Empires IV — player screenshot thread on publisher forum](https://forums.ageofempires.com/t/my-best-looking-screenshots-of-aoe4/181538) · [reference screenshot](https://forums.ageofempires.com/uploads/default/optimized/3X/2/0/20aa0c88cbec212cf28e9fd5a8e35d16b6713ea5_2_1380x776.jpeg) | Make building purpose and cultural character legible through massing, roof shapes, entrances and coherent local materials. |
| [Civilization VII — screenshot in Forbes article](https://www.forbes.com/sites/barrycollins/2025/02/28/civilization-vii-updates-to-bring-big-changes-in-march/) · [reference screenshot](https://imageio.forbes.com/specials-images/imageserve/67c185f4de3e45ca7e1a3fbb/0x0.jpg?fit=bounds&format=jpg&height=900&width=1600) | Aim for a dense city that reads as one composition: varied heights, connected streets, courtyards and restrained civic focal points. Use contextual UI hierarchy as inspiration, with original styling and interaction. |

These are design interpretations and visual references, not asset sources or claims of historical accuracy. Do not bundle the screenshots, extract game models, or copy branded UI.

### Bierstadt and Cole landscape generation — requested direction, October 31, 2026

Use Albert Bierstadt and Thomas Cole as explicit influences on the generated world itself, as well as its lighting. Translate their landscape composition into Hearthwild’s original stylized 3D terrain: grand mountain backdrops, luminous open valleys, winding rivers and reflective lakes, wooded foreground framing, waterfalls or ravines as occasional focal points, and layered distant ridges softened by atmosphere. Compose these elements into connected regions and views that reward exploration.

Allow some spectacular places to be difficult or impractical to settle: steep cliffs, remote lakes, narrow gorges and rugged mountain amphitheaters can exist for their beauty and sense of scale. Keep scenic appeal separate from fertility, buildability, accessibility and resource value; the most beautiful place need not be the strongest economic opening. Preserve viable routes and subsistence at the player’s above-average scenic starting site. Ordinary landscapes must remain common, with attractive regions and rare exceptional vistas providing contrast; do not turn every island into the same showcase.

Centralize and measure landmark rarity (per land area), relief and ridge continuity (metres), valley openness, water curvature and visible water fraction, foreground framing, number of depth layers, focal-point prominence and atmospheric falloff (distance). Record regional beauty distributions and start-site percentiles separately from settlement viability. New composition metrics extend the current water/relief/outlook/contrast score; they are proposed work, not implemented measurements. Keep terrain composition independent of camera position, with view-dependent lighting/framing diagnostics as a separate layer. Tune daylight for warm illuminated land and cool shadows while keeping weather, seasons and nights distinct and readable.

Acceptance: inspect representative ordinary, attractive and exceptional views across fixed and holdout seeds; verify coherent regional composition rather than scattered decorative stamps, measurable variation, safe player starts and bounded generation/render costs. This is artistic influence, not a promise of photorealism or a copy of a particular painting.

## The settlement should show how people live

Early homes use timber, reed, straw and rough earthen surfaces, with garden plots, paths, work yards and storage around them. Later neighborhoods become denser through connected street edges and inward-facing courtyards. Keep working rural edges around the city rather than upgrading every hut into an isolated monument.

The main city develops a warm sandstone, lime-plaster and terracotta vocabulary. Wealth adds better masonry, shaded galleries, carved lintels, patterned borders, planted courtyards and elegant civic entrances. Blend cultural influences through a deliberate family of proportions, motifs and materials; do not scatter arbitrary tiered pagoda roofs across ordinary buildings. Reserve exceptional rooflines and monuments for buildings with a clear civic or cultural role.

Define each building by its use first: a long open workshop, a ventilated raised granary, a courtyard home, an accessible market canopy, a broad meeting hall. Vary age, repair, wealth and local practice through interchangeable modules. Use bounded asymmetry in posts, patches, roof edges and prop placement; preserve straight usable doorways and clear movement space.

Detail should explain work: drying racks, baskets, tools, stacked logs, cut stumps, grain sacks, crop growth stages and carried bundles. Attach props to actual roles and state where supported. Do not display a full store beside an empty inventory or a ripe field immediately after sowing. Prefer a few convincing arrangements to uniform clutter around every building.

## Ordered implementation batches and acceptance gates

| Order | Bounded batch | Reviewable acceptance |
| --- | --- | --- |
| 1 | **Readable interface.** Larger text, fewer words, verbs such as Build, Assign, Repair and Trade. Compact resource bar; selection opens one contextual panel with status, cost and next action. | At 1440×900 and 1280×800, primary text is at least 16 CSS px; no clipped controls; resources and selection remain visible. In five representative selections, identify the next available action within five seconds. Explain disabled actions in one short sentence. |
| 2 | **One complete village kit.** Improve home, granary, workshop and meeting hall together; add shared timber, plaster, thatch and stone treatments. | Identify all four building roles from silhouettes at normal play zoom without labels. Provide at least three compatible variants for repeated homes. Review one fixed camera scene before/after for consistent scale, palette and entrances. |
| 3 | **Visible production.** Add a small shared prop library, crop stages and carried goods; connect to existing simulation state. | A farm, forestry site and workshop each show at least two truthful state changes. No props block selectable entrances or routes. At overview zoom, decorative clutter yields to people, roads and building identity. |
| 4 | **City progression.** Extend the same kit with courtyard blocks, terracotta roofs, streets and wealth ornaments; preserve recognizable working districts. | Compare early, middle and late settlement scenes at the same camera angle: increasing density and prosperity are visible without age labels. Adjacent buildings share a coherent material family; premium ornament appears selectively. |

## Performance and parallel work

Reuse meshes, materials and small shared texture atlases; instance repeated props and vegetation. Hide fine tools, roof trim and small ornaments at distance. Avoid unique high-resolution textures per building, individual shadow-casting lights and elaborate geometry that cannot be seen at normal zoom. Establish a baseline before changing renderer or engine.

Proposed hardware gate, not a measured result: on the target M1 Air, test a repeatable scene with 100 residents and 60 buildings at 1440×900 for five minutes after warm-up. Target median frame time at or below 33 ms and 95th percentile at or below 50 ms, with no repeated stalls above 100 ms or tab reloads. Record browser, render scale, draw calls, triangles and memory trend. Compare the same scene before/after each batch; simplify distant detail before expanding asset variety if the gate fails.

Parallel agents help after the palette, dimensions and interaction contract are fixed: assign interface, modular art and performance review to separate owners. Keep one integrator responsible for the final scene and play check. Do not give multiple agents the same renderer or simulation files; independent visual ideas still require one coherent art pass. World generation, save roundtrip and building-footing corrections are separate work and are not implemented by this brief.
