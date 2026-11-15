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

## Update from local session, release 2026-11-15T07-28-28-000Z (built from main 8813738c; live on 8086)
LIVE (code + tests; UI panels typechecked but NOT yet seen rendered, [UNVERIFIED] visually):
- Military: one-press call to arms; weapon stock line (townhall/barracks/warehouse); watchtower crews; squads 5/10/25/50/100; fighting rank and defence; weapon grades per age/material; town focus modes (Normal/Crafting/War); wall-walk patrols and "Man the walls"; night torches (logs, charcoal, oil).
- Governance: 11 government types (band council to parliamentary republic), 13 policies, governors, council card. AI adoption not wired yet (aiGovernmentFor exported).
- Leftovers: storage caps for logs/stone/copper/iron (cap meter in supply bar); wider near/mid tree radii.
- Trade UI: coins (mint/melt), send-expedition panel. Regional goods, captive sale and basket bonus are on main after this build (commit 755e0baf) and ship at the next publish.
IN PROGRESS: rivals (deeper dominance, conquest tests), building behaviour (heights, work face, steep hills, look tiers), save round-trip (report pending).
OPEN: longer seasons (plan in claude/PLAN-longer-seasons-2026-11-15.md; needs Boris's 3 decisions), trade map destination picker, willing migrants, vineyard/press buildings. Last: first-person, tutorial, future eras (plan: claude/PLAN-future-2026-11-15.md).
