# Animal models audit

## BLUF

- The owner's deer (brown box body, four stick legs, ball head, stick antlers) was accurate: every animal was a merged low-poly bundle of 50-530 triangles of boxes, cylinders and spheres, with no neck, no muzzle, no jointed limbs and no animation beyond a sideways bob.
- Replaced with a rigged, instanced pipeline: 17 quadrupeds, 3 birds and 4 fish, each built from real anatomy (lofted torso/neck/head, four-bone leg chains with hock and knee zig-zag, species antlers/horns, tails, manes, ears, eyes), 2.7-3.2k triangles near, about 0.85-1.05k mid, 0.42-0.49k far. Poses cover idle, graze, alert, drink, walk, trot, gallop and dead, driven by distance actually moved.
- Deterministic and save-compatible: look (sex, age, winter coat, spots, size) comes from the critter id and calendar; no ids or save fields changed. `?animals=legacy` restores the old path.
- The grey pointed wedge on the water was `fishGeo()`, the fishing-ground node marker, not a fish and not a boat. It is replaced by species shoals (trout, carp, pike, eel).
- Boats: the canoe now has a real shell hull (gunwale, bow/stern, thwarts, posts) and a wake. Fishing from the canoe already existed in the economy; I did not touch its rules.
- Not done: seated fisher and catch inside the hull, oars/sails, per-civ hull types, pack animals (still legacy), live in-game render (only the harness was run).

## Species table (triangles per animal)

Legacy = old merged mesh. New columns = near / mid / far LOD (near <34 m, mid <80 m, far beyond).

| species | legacy | near | mid | far |
|---|---|---|---|---|
| redDeer | 232 | 2894 | 1006 | 458 |
| fallowDeer | 232 | 2908 | 1046 | 458 |
| roeDeer | 232 | 2770 | 914 | 458 |
| boar | 212 | 2871 | 904 | 418 |
| wolf | ~200-300 (merged boxes) | 2821 | 864 | 454 |
| fox | ~200-300 (merged boxes) | 2744 | 814 | 454 |
| bear | ~200-300 (merged boxes) | 2919 | 834 | 418 |
| aurochs | 530 | 2828 | 940 | 490 |
| cattle | 530 | 2834 | 920 | 490 |
| mouflon | 232 | 2934 | 1034 | 458 |
| sheep | 232 | 3150 | 1034 | 458 |
| ibex | 222 | 2832 | 894 | 458 |
| goat | 222 | 2796 | 874 | 458 |
| wildHorse | 426 | 2675 | 852 | 442 |
| horse | 426 | 2666 | 852 | 442 |
| donkey | 426 | 2683 | 860 | 450 |
| hare | ~200-300 (merged boxes) | 2426 | 784 | 418 |
| duck | 86 | 674 | 464 | 192 |
| goose | 86 | 646 | 464 | 192 |
| raptor | 86 | 676 | 464 | 192 |
| trout | 56 | 654 | 150 | 88 |
| carp | 56 | 668 | 146 | 88 |
| pike | 56 | 668 | 152 | 84 |
| eel | 56 | 648 | 144 | 88 |

Caps are enforced in `scripts/animal-models.test.mjs`.

## Construction

- `animalGeo.ts`: loft/sweep toolkit (superellipse sections, vertex colour countershading, tubes, tufts, plates).
- `animalSpecs.ts`: real shoulder height, mass, trunk sections, neck, head, fore/hind leg segment lengths and standing angles, tail kind, coat palette, gait speeds and stride lengths, sex size ratio.
- `animalModels.ts`: builds the skeleton and parts; `calibrate()` scales limbs to the real shoulder height; antlers (red, fallow, roe), horns (aurochs, ibex, mouflon, goat, sheep).
- `animalPose.ts`: gait solver (lateral walk, diagonal trot, rotary gallop), graze angles solved from the skeleton, ground contact from the foot bounds.
- `animalRigLayer.ts`: one InstancedMesh per (model, tier, part); per-instance colour and coat attribute; shader chunk for mottling, fawn spots, piglet stripes, winter greying.
- `animalFlyers.ts`, `fishShoal.ts`: birds (stand, swim, fly) and fish (fusiform, tail, dorsal/pectoral fins, eye, countershading), shoals as pure functions of node and clock, with rise/leap ripples.
- `animalAdapter.ts`: reads the game's animals, builds `Draw`s, hides the legacy meshes (kept as invisible picking proxies).
- `canoeModel.ts`: canoe hull.

## Fish and boats

- Wedge = `fishGeo()` in `meshes.ts`, drawn at fishing-ground nodes. Now shoals sit just under the surface, with a ripple on rising and a wake behind moving shoals.
- Fishing from a canoe: `fishingBank` has a canoe branch in the economy. There is no near-shore/offshore split and riverboats are a separate model. Unchanged.
- Changed: `haulageGeo('canoe')` returns `canoeGeo()`; the world draws a wake while the canoe moves.

## Known issues and follow-ups

- Facing: sim facing is atan2(vx,vz) while models face +X, so the adapter applies `FACING_OFFSET=-pi/2`. The legacy meshes probably moved sideways. The behaviour agent (docs/ANIMAL_BEHAVIOUR_AUDIT.md) should keep this convention or tell me.
- Pack animals (draught cattle/horses with loads) still use the legacy path.
- Far LOD legs are thin tubes; far aurochs clip at the sheet edge in the render harness camera only.
- Deferred: split spine, biome-aware deer species, per-civ hulls (planked, hide, reed), oars/sail, seated fisher and catch.
- `tsc` could not be run here; unit tests run under the strip-types loader. `meshes.ts` cannot load in node tests (three/examples missing).

## Renders (docs/renders/animal-models/)

- Before: `near-legacy.png`, `near-legacy-2.png`, `canoe-old.png`.
- After: `near-new-1..5.png`, `near-new-birds-{stand,swim,fly}.png`, `near-new-fish*.png`, `mid-new-1/2.png`, `far-new-1/2.png`, `canoe-new.png`.
- Species sheets for redDeer, wolf, horse, boar, cattle, sheep: `seasons-*`, `sexage-*`, `poses-*`, `strips-*` (idle/graze/alert/walk/gallop). Other species are covered in the near sheets.
