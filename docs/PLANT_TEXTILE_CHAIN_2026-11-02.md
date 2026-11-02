# Plant textiles and seasonal clothing — implementation review, 2026-11-02

This fills one missing function in the exhaustive workplace catalogue: actual plant-bast spinning, weaving and light garments. It extends the existing physical production, per-instance slot ownership, delivery, practical learning and garment systems. It does not add a labels-only building or claim flax cultivation, sheep wool, dyes or advanced looms.

| Function | Actual workplace | Finite inputs → outputs | Base hands-on work | Status / remaining work |
|---|---|---|---|---|
| Obtain textile fibre | Existing living-tree fibre gathering | Observed finite bast source and standing-wood tradeoff → physically delivered plant fibre | Existing source/harvest rules | Existing working chain; full retting and fibre-species ecology remain partial |
| Hand spin | Actual hearth | 4 plant fibre → 4 yarn | 90 seconds | New physical fallback, no knowledge-tree cost |
| Shelter spin | Actual fibre/basket shelter | 4 plant fibre → 4 yarn | 35 seconds | Shares this instance's two paid slots with cordage, baskets and weaving |
| Weave bast cloth | Actual fibre/basket shelter | 4 yarn → 2 cloth | 70 seconds | Available after a real spun batch is delivered; advanced looms/wool/flax remain planned |
| Sew light garments | Actual tailor | 2 cloth + 1 cordage → 1 light garment | 45 seconds | Available after real woven cloth is delivered; dyes and repairs remain planned |
| Store, carry and wear | Actual camp/store and resident | One delivered garment leaves stock; the prior serviceable garment becomes one carried spare | Existing travel and cache access | Exact conditions preserved; no stock refund or automatic healing |
| Change seasonally | Actual camp/store | Swap the same worn/spare objects | Requires real cache access | At most one spare; adding a third serviceable garment is rejected |

The times above are named base work seconds, before the existing personal effort and earned practice modifiers. Each batch uses the normal paid inputs, actual carrier travel, real workplace work and output delivery. Starting cannot create output or practical knowledge. A paid interrupted project retains its exact original materials, progress and physical slot; resumption does not debit again. Different building IDs retain independent queues and capacities. The existing optional explicit actor ID and animal-processing adoption rules are preserved.

Light cloth provides 0.75°C insulation at full condition versus existing skin3°C/leather4°C. The displayed actual ambient temperature above22°C adds a bounded condition-scaled exertion burden during gathering, building, movement/exploration and combat: at30°C the light/skin/leather factors are0.1/0.65/1. One unit adds one fatigue point over600seconds; actual fatigue remains bounded0–1. Held/resting residents pay no work penalty. Worn garments record weighted heat-exposure seconds; cold exposure continues through the actual survival calculation. A spare supplies no additional warmth and does not wear as if equipped. These are adjustable game rules, not historical physiology claims.

A carried spare adds abstract personal-load units light0.08/skin0.12/leather0.16, using the existing walking burden and actual boat crew/cargo load calculation. Capture retains both garments on the same body with unchanged condition; no village gets a phantom inventory credit. Death loses both once. Legacy garments without a spare or heat counter remain valid; strict validation rejects unsupported materials, invalid conditions and impossible spare-without-worn data.

The primary native-terrain scenario starts with declared ordinary construction/food/water supplies, obtains8 real fibre through actual gathering (costing2 standing timber units), physically constructs its paid hearth/fibre shelter/tailor, makes4cordage and4yarn, weaves2cloth and sews one light garment. It saves/resumes interrupted spinning, equips the actually delivered result, and checks exact input/output/practice ledgers. No textile inputs are granted during that chain. Separate controlled inventory fixtures test slot ownership, wardrobe/capture, heat/cold, death and malformed/legacy saves; they are component tests, not campaign qualification.

This review does not by itself qualify desktop visuals, full seasonal campaign balance, all-building art, wool/flax/dye industries or a new acceptance gate. Source/test/build results and any browser evidence must be recorded after final verification.

## Verification

The final frozen source passed42/42 cases with no skips in `/tmp/textile-all-42-final.log`: six textile/wardrobe cases, five worn-garment geometry/ownership cases, and31 existing fibre, production, practical-learning, shared-ownership and catalogue regressions. Final typecheck and production build passed (`/tmp/textile-final-typecheck.log`, `/tmp/textile-final-build.log`). The subsequent catalogue-only correction updates the previously missed spinning row and tailor wording; its focused check passes5/5 with no skips (`/tmp/textile-catalogue-followup-tests.log`), without adding duplicated tests to the42-case total. The source patch preserves optional production actor IDs and the current animal-processing adoption fields.

The public controlled native QA save is `/tmp/hearthwild-native-textile-qa.json` with a separate `-view.json` explanation. It contains the actually made light garment on its wearer and the physically built workplaces, suitable for actual desktop inspection. No browser render, screenshots, all-biome visual qualification, general hot-season balance or new acceptance gate is claimed by the headless checks alone.
