# Forest ecology: continuum stands, not salt-and-pepper

**BLUF.** Trees are no longer picked per tree from a hash. Every species responds on its own to the gradients (temperature, moisture, soil depth and acidity, slope, aspect, altitude, distance to water), trees are sampled from the local suitability weights with spatially correlated patch noise, and only two hard rules hold: (1) climate-incompatible species never share a neighbourhood (no palm with a spruce, no desert acacia in a boreal bog), (2) microsite filters are real (willow only on wet ground, pines on poor soil, beech and oak on deeper soil). Between those rules woods are genuinely mixed, with local dominance patches, gradual transitions, age cohorts, gaps and glades. New worlds default on (`forestEcologyVersion: 1`); old saves are placed and drawn exactly as before. Code: `src/game/forestEcology.ts`. Tests: `scripts/forest-ecology.test.mjs`. Renders: `docs/renders/forest-ecology/`.

History: the first cut of this lane built monodominant one-or-two-species stands with hard borders. Owner feedback ("I don't think that's how forests work") was right: vegetation is mostly a continuum. The model below replaces it.

## What is sourced and what is a design value

Only two things below were fetched and read this session:

- Cushman, Evans, McGarigal, Kiesecker (2010), USDA Forest Service RMRS-RP-84, *Toward Gleasonian Landscape Ecology* (https://www.fs.usda.gov/rm/pubs/rmrs_rp084.pdf). It presents Gleason's individualistic view: each species responds on its own to local environmental and biotic conditions, communities are not discrete nameable units, and vegetation should be modelled as species responses to continuous gradients rather than categorical patch mosaics. This is the basis for sampling species per tree from per-species suitability instead of assigning a stand type.
- Northern Woodlands, *What is shade tolerance and why is it so important* (https://northernwoodlands.org/articles/article/what-is-shade-tolerance-and-why-is-it-so-important). Tolerant species (hemlock, American beech) survive on roughly 1 to 3% of full light and are slow, long-lived; intolerant species (trembling aspen, red pine) can need up to about 60% and outgrow tolerant neighbours in gaps but die younger; intermediate species (yellow birch, white pine) wait under canopy and accelerate when a gap opens; tolerance also varies with age, site and region. The article uses North American species; the Hearthwild values below are design values for the European/Mediterranean analogues.

Searches were also run for Scots pine on sandy acid soils, beech on deep fertile soils and willow on floodplains; those returned titles only and the pages could not be fetched here, so **every niche trapezoid, prior and tolerance number in this document is a design value / [UNVERIFIED] against literature** (they follow standard silvics knowledge but were not checked against a source in this session). Tune them in `SPECIES_NICHE`, `BIOME_PRIORS` and `SHADE_TOLERANCE`.

## Model

1. **Climate group (hard rule).** From an effective warmth E and wetness: E = province-kind shift (alpine -6, conifer -4.5, mixed 0, meadow +.3, dry scrub +1.8, warm coast +1.6, arid +3.5) + 0.5 x the local temperature offset. The kind is needed because the world's temperature offset is relative to that world's own median (measured on two generated worlds: conifer-forest cells had a median offset of -0.4 in one and -3.6 in the other), so on its own it cannot say boreal or tropical. Boreal below E = -3, temperate to +2, Mediterranean to +3.5, then arid (dry), tropical (wet) or Mediterranean. Tropical therefore needs a genuinely hot, humid coast and is rare. Species belong to a group (`CLIMATE_OF`). A neighbourhood holds the dominant group plus, only near a boundary, the ADJACENT group at a share that falls from 50% on the boundary to 0 one boundary-width away (a gradient, not a seam). Adjacency: boreal-temperate-Mediterranean, Mediterranean-arid, Mediterranean-tropical, arid-tropical. Boreal and Mediterranean, palm and boreal, acacia and fir are never adjacent. A border guard additionally forces every tree to be compatible with every climate group present within two 8 m cells of it, so an abrupt province border between climatically neighbouring kinds still resolves as a gradient. Limit: two province kinds that are climatically non-adjacent (boreal conifer forest directly against arid) do not occur on generated maps, and if forced would fall back to the dominant group only.
2. **Niche (microsite filters).** Per species a trapezoid tolerance on each declared factor; fitness is the product, floored at 3% per factor. Willow: moisture >= .68 and within ~30 m of fresh water. Scots pine: thin, acid, drained soil. Beech: deep soil, shaded aspect, cool. Oak: deeper loam, not waterlogged. Birch: everything, best on cold and thin ground (pioneer). Poplar: wet ground (it also stands in for alder, which the 24-species set lacks).
3. **Weights and patchiness.** Weight = province prior x niche fitness x exp(A * (2n - 1)), where n is the species' own smooth noise field (patch scale 60 m for hawthorn/birch/poplar/willow up to 190 m for spruce). A below 1 keeps woods mixed; the correlated noise makes local dominance patches of tens to hundreds of metres. Each tree is sampled from the cell's weights (8 m cells), species under 2% are dropped.
4. **Shade-tolerance dynamics.** Weights drift toward tolerant species in old stands. Under an old canopy tolerant species (beech, fir, spruce, maple) keep a suppressed young cohort; intolerant species (birch, poplar, Scots pine) are the older cohort that grew after a disturbance and have no saplings. In gaps, light-demanding pioneers (birch, poplar) and saplings regenerate.
5. **Disturbance.** Glades (open ground, soft edges, 90 m field), windthrow gaps (jittered lattice, about a quarter of 56 m cells hold a 6 to 16 m gap), a stand-age field (150 m) from fresh pioneer ground to old growth with veterans and ~3% standing dead wood (`snag`).
6. **Age and size.** Tree age = stand age +- variance; size = 0.34 + 0.92 * smoothstep(age). Classes sapling / young / mature / veteran map to the botanical variants (young, mature, old). Mature cohorts have a small coefficient of variation so a stand has a coherent height.
7. **Crown shyness.** Minimum spacing 0.8 x crown radius x size, clamped 2.9 to 4.6 m, applied to filler trees and to simulation placement.
8. **Hooks.** `successionAt` (cleared ground: herbs 0-3 y, pioneer thicket to 12 y, pioneer canopy with climax saplings to 45 y, then the climax plan). `groveSpecies` (planted trees: one species per 48 m plot, best fit). `thinningFactor` (felled stumps per hectare). `understoryBias` (forest floor follows canopy species and openness).

## Where it is wired

- Switch: `WorldOptions.forestEcologyVersion = 1`. `engine.configureNewWorld` requests it with `geologyVersion: 1`; `mapgen/index.ts` records it in `world.options`; `persistence.ts` validates it (worldgen v21 only). Saves without the flag regenerate and render exactly as before.
- Placement (`mapgen/placement.ts`): glades and gaps thin the density, gallery forest along fresh water, crown spacing, stand-age tree scale. Species is not stored; it is a pure function of position, seed and site.
- Rendering: `BotanicalForest` (`ecology` option: species, variant and size from the stand), `FillerForest` (`ecology` env: density, group, size, crown spacing), `biomeSceneLayer.ts` (`standSiteAt` builds the site from province grid, geology acidity and altitude; `standFieldFor` returns null for old worlds; the forest floor reads the canopy species).
- Determinism: only hashes of (seed, id, position); no `Math.random` or `Date.now`. One known exception outside this module: the simulation's own stump regrowth uses `Math.random` (existing code, not touched).

## Per-biome species table (priors; design values)

Priors say which species are in play in each province kind before the site decides; the niche and the noise do the rest. Species of a different climate group appear only inside the ecotone gradient.

| Province | Species (prior) | Rationale (design value / [UNVERIFIED]) |
|---|---|---|
| Meadow | oak 1, hawthorn .8, birch .7, maple .4, poplar .3, willow .2, beech .2, Scots pine .25, juniper .3, olive .15 | Open grassland with scattered trees; hawthorn and birch are edge and pioneer species |
| Mixed woodland | oak 1, beech 1, birch .6, maple .6, spruce .5, Scots pine .5, fir .4, poplar .3, hawthorn .15, willow .15, cedar .1, stone pine .1 | Temperate mixed forest; oak and pine on poorer or sandier ground, beech and fir on deep shaded loams, willow and poplar on wet ground |
| Conifer forest | spruce 1, Scots pine .9, fir .7, birch .4, cedar .25, stone pine .2, juniper .2, krummholz .1 | Cool boreal and montane conifers; pine on thin acid soils, spruce on moist ground; birch as pioneer |
| Alpine | krummholz 1, juniper .6, spruce .35, Scots pine .3, birch .3, fir .15, cedar .1 | Treeline: wind-bent mountain pine, juniper; trees shrink with altitude |
| Wetland | willow 1, poplar .7, birch .4, mangrove .8, oak .15, hawthorn .1, tamarisk .1 | Riparian and wet ground; mangrove only in the warm tropical group |
| Dry scrub | olive .8, acacia .8, juniper .7, hawthorn .5, tamarisk .5, cypress .5, stone pine .5, eucalyptus .3, Scots pine .3, cedar .2, oak .2, date palm .15, baobab .15 | Mediterranean and dry savanna scrub; olive and cypress on calcareous thin soils, tamarisk along wadis |
| Arid | acacia 1, tamarisk .7, date palm .5, juniper .3, baobab .3, olive .2, cypress .1 | Desert margin; date palm and tamarisk follow water |
| Warm coast | coconut palm 1, mangrove .8, acacia .4, date palm .3, eucalyptus .3, stone pine .3, tamarisk .3, olive .2, cypress .2 | Tropical and warm coastal; coconut palm and mangrove on wet shores, stone pine and cypress at the Mediterranean end of the gradient |

Shade tolerance (design values): beech .9, fir .85, spruce .7, maple .7, hawthorn .55, oak .35, Scots pine .2, willow .2, poplar .15, birch .1; the rest 0.2 to 0.5.

Species map colour key (`species-map.mjs`): oak green, beech teal, birch pale yellow, maple orange, poplar lime, willow cyan, hawthorn pink, Scots pine brown, stone pine tan, spruce dark green, fir blue-green, cedar dark brown, cypress olive-black, juniper grey-blue, krummholz lavender, coconut palm magenta, date palm orange-red, acacia yellow, baobab red, mangrove sea green, tamarisk lilac, olive grey-green, eucalyptus mint, snag black.

## Tests (`node --import ./scripts/game-loader.mjs --test scripts/forest-ecology.test.mjs`)

Species vs biome validity and niche respect; microsite filters; **no climate-incompatible pair within 15 m** over a boreal-to-tropical transect (and the transect does cross ecotones); **plausible local richness** (mean 2.5 to 7 species within 30 m, monodominant blocks rare) with spatial autocorrelation above independent sampling; determinism; age and size structure (gaps hold small trees and pioneers, old growth holds veterans and snags); shade-tolerance cohorts; crown spacing in the filler; hooks (succession, groves, thinning, understory); old saves unchanged (original `pickSpecies` path when the option is absent, flag absent unless requested).

## Known limits

- Old worlds (no flag) can still show palm, pine and oak near each other, because the legacy per-tree path is kept byte-for-byte on purpose.
- Succession, wood-cutting thinning and grove rows are pure functions with tests; only planted-tree grove species is wired into drawing. The simulation does not yet record clearing time per stump.
- No alder model exists in the 24 species; poplar and willow cover the riparian niche, birch the pioneer niche.
