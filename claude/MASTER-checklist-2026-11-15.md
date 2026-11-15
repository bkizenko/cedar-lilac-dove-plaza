# Hearthwild master checklist

BLUF: single list of everything Boris asked for, status as of 01:00 on 2026-11-15. LIVE = in his game. MAIN = pushed, goes live at next publish. OPEN = not built. (The full project copy with request wording lives in the Claude project "hearthwild"; this is the repo copy.)

## Live (release 2026-11-15T05-38-58-000Z)
Bread/water/nourishment rebalance; selection circles; HUD overlap; storage bar; raids at least 3 raiders; mill speeds; cause of death; no bone for clothing; weapon times and benches; watchtower in Bronze; arming never blocked by food; earlier water collection; camera zoom to 520 and camera rising over terrain; update-ready reload button; handcart gate 5; player orders win over automation (Resume/Repair/Craft never greyed, auto tool repair, workload breakdown); combat fixes (armed people keep fighting, raiders stay), raid card outcomes and 40 s banner, surrender/annex/puppet/pillage, peace offers on neighbour cards and minimap, formation gating.

## On main, not yet published
- Farms (2cf9d69): placement trims instead of rejecting, red only on cliffs, fertility gradient, stumps hidden, autumn crop stage, steep-slope routing and climb pace.
- Food (102bb2a, partial): starvation guard (turns on below 600 s reserve), cereal sheaves folded into clean grain, grind/bake buttons always clickable and queue, station choice windmill > watermill > stone. Starvation bug itself was not reproduced.
- Seasons/trees/mills (666a591, 81a12de, 91b2336): per-year temperature variation, season colour grade, far trees 2x range (2.5x winter) with solid crowns, watermill wheel in water, mills spin only when working.

## In progress (cloud helpers): P5 ships/trade/harbors/cisterns/beasts, P7 health/clothing/pregnancy/Vitruvius, P8 UI fixes, P9 animals/domestication/roof patches/season music, P10 food follow-up.

## Open (local session lanes): military (call to arms, walls, towers, patrol, groups, weapon stock display, weapons per age, fighting skill, lighting, focus modes); governance (governors, policies, government types, rivals that dominate, building look by wealth, build time by complexity, work inside buildings, click person then building, timber homes, bridges, steep-hill pathing).

## Open (unassigned)
Save error "Save is damaged or incompatible" (not reproduced, needs his save); longer seasons (year length 1800 s is hard-coded in many places; changing it risks saves); trade encounter dialog and map trade proposals, trading people, coins; expedition panel; baskets and clay containers; storage caps; near and mid tree LOD radii.

## Last (Boris said later): first-person mode, tutorial mode, future eras.
