# Taste envelope

**BLUF.** A pure, seeded layer (`src/scene/tasteEnvelope.ts` + data in `src/scene/tasteData.ts`) that defines the "lowest common denominator of good taste" for generated civs. One `StyleGenome` per civ (climate, materials, roof, proportions, palette, ornament, garb, banner, wonder) is validated against quantified rules and repaired deterministically. The 14 presets are unchanged and sit inside the envelope as exemplars (widened `exemplar` profile). A new `generated` civ source uses the envelope end to end. The repair of the legacy `free`/`remix` generators is behind a switch that is **off by default**, so saves and presets are byte-identical. All numbers are design values; nothing was fetched from a source ([UNVERIFIED] as history).

Proof (all in `scripts/taste-envelope.test.mjs`, 18 tests passing): 200 seeded genomes pass the strict validator; 200 deliberately unconstrained genomes each trip 20-31 rules and all repair clean; 60 games x 8 civs stay pairwise apart; era views stay in the envelope. Report: `docs/metrics/taste-envelope-2026-11-13.json`. Sheets: `docs/renders/taste-envelope/`.

## 1. Survey: how a civ's look is generated today, and where a seed goes weird

| Layer | Where | What a seed picks | Weird outcomes found |
|---|---|---|---|
| Civ seed | `game/civGenerator.ts` | 1-3 materials from all 10 (free), silhouette, hueShift +-20 | any material mix (felt+brick, bamboo+stone, wood in the desert) |
| Palette | `civSkin.ts` freeSkin/remixSkin | dye hue from a 10-hue list, sat .42-.68(+.1), cloth hue +0/+24/+180/-30; remix rotates hues +-38 deg | purples/neon greens/pink/orange ground; 331 of 400 legacy free/remix palettes break the strict envelope (rule tally in the metrics JSON: contrast 153, mean saturation 111, lightness 95, saturation cap 77, purple 73, harmony 45, pure primary 21, dark-brown-with-green 18) |
| Building grammar | `civBuildings.ts` | grammar id by material/silhouette affinity; roof form from the grammar or climate list | roof/material mismatches; proportions are fixed per grammar (house width:height measured 1.06-2.21), not seeded |
| People garb | `civSkin.garbFor`, `peopleLook.lookForSkin` | cut, headwear, motif uniformly from all lists; remix/free jitter body, marks, helm, shield | ponchos and hoods in desert civs, brims in the arctic; garment colours not tied to the palette |
| Banner/insignia | freeSkin, `villageIdentity.ts` | banner style and emblem uniformly; heraldry is per village | independent of everything else |
| Wonder | freeSkin | signature piece: random civ half the time | a desert wonder for a forest civ |
| Items | `itemStyle.ts`, `itemTexture.ts` (12 shield decals + emblem cells), `game/weaponFamilies.ts` | follow skin colours | inherit the palette problems; decal choice not under the envelope |

## 2. The model

**(a) Colour.** `tasteData.PIGMENTS`: ochres, umber, sienna, lime white, bleached linen, undyed/brown wool, iron-gall black, weld, madder, woad, indigo, verdigris, dyers' green, saffron, malachite, and rare crimson/lapis/Tyrian-like purple (weight .15, era 4+). Each has a first era and biomes. Rules in `checkPalette` (generated profile): saturation caps per role (wall .50, roof .52, trim .58, cloth .64, accent .68), lightness bands per role, floor L .14, mean saturation <= .44, at most 3 hue families (all earth hues 0-58 count as one), non-earth families analogous (<=50 deg) or complementary (140-220), purple at most one role and dark, OKLab contrast wall/roof, wall/trim, wall/accent, forbidden: neon (sat>=.75 mid-lightness), pure primaries, near-black, blown white, dark brown (L<.34) beside green. Repair clamps, collapses extra families, fixes harmony/purple/brown-green, then pushes contrast; it is a no-op on a valid palette.

**(b) Proportions** (`PROPORTIONS`, by climate): width:height, pitch (also within +-9 deg of the roof form's nominal pitch), overhang, wall thickness (also by material), door and window ratio. The envelope for the real buildings is the measured silhouette range of the 14 grammars (`MEASURED_RATIO`, tested).

**(c) Materials.** Local availability per biome, a forbidden-pair list (felt+brick, bamboo+stone, turf+plaster, ...), roof form -> carrying materials, roofs per climate. **(d) Ornament.** Six families (geometric weave, carved lintel, painted band, mosaic, inlay, incised), each with its own motifs, zones, symmetry, repeat range, materials and first era; at most 2 motifs, 3 zones, density <= .68 by era 5. Families are named for the kind of tradition only; no real insignia. **(e) Garb.** Cut, headwear, fibre per climate; garment colours must come from the civ palette; at most 2 garment hues; motif from the civ's ornament.

**(f) Consistency and distance.** The genome drives skin palette, roof, granary, banner, wonder, garb and civ materials (`generatedSkin`, test "one style genome drives everything"). `castGenomes(gameSeed,n)` deals slot i from slots < i with rerolls until pairwise palette >= .18, form >= .20, total >= .30 and a gap from every preset exemplar; measured over 60 games x 8: min total .428, palette .201, form .211.

**Era.** `eraView(g, era)`: hut materials (mudbrick/wood/turf/bamboo) until the signature material's era; dyes not yet known are replaced by ochre/undyed stand-ins; saturation cap .32 -> .72; ornament density cap .10 -> .68. `checkEraProgression` bounds the per-era palette step and forbids regression.

## 3. Using it

- `setTasteEnvelope(true)`: free/remix skins are repaired (palette, garment colours, cut, headwear, roof) in `skinFromCiv`. Default false. Presets never pass through it.
- `generateCiv(seed, slot, 'generated')` / `skinFromCiv`: the enveloped source (SkinMode `generated`; people/item remix logic treats it like free). Not in the default cast, so existing games do not change.
- `validateGenome`, `repairGenome`, `generateGenome`, `castGenomes`, `genomeDistance`, `eraView`.

## 4. Results

Sheets (24 civs each, cell = house + civic + worker/farmer/soldier/ruler + banner + palette chips; none near-black, mean RGB ~ 140-166): `contact-generated-24.png` (the envelope), `contact-legacy-unenveloped-24.png` (before: red ground, pink, purple, neon green), `contact-legacy-repaired-24.png` (switch on), `era-progression.png`. Worst seeds and the rules that caught them are in the metrics JSON (e.g. unconstrained seeds 1-10 trip 20-39 rules each; the sampler's worst, seed 184, tripped lightness band, harmony, dark-brown-with-green and contrast and was rerolled once).

## 5. Limits and [UNVERIFIED]

- Every threshold and pigment hex/era is a design value, not a cited historical fact. Dye availability by era is common knowledge, unchecked here.
- Genome `proportions` are validated but **not consumed**: building massing comes from the 14 grammars, so generated civs differ in form by grammar, roof form, palette and ornament, not by free proportions. Wiring proportions needs grammar parameters.
- Ornament family/zones are validated but not yet drawn: items/shield decals and building trim do not read them.
- People hair, skin, marks, armour and helm styles are outside the envelope.
- The generated sheet is deliberately conservative (earthy, muted); it is more uniform than the legacy sheet. Raise `LIMITS.generated` saturation caps in `tasteData.ts` for more colour.
- Presets brythen and verdant-thatch contain dark brown beside green (the owner-disliked pairing); they pass only the exemplar profile.
