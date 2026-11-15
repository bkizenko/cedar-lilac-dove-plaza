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

## Update 2: release 2026-11-15T08-41-20-000Z (built from main a8e02192; live on 8086)
Now live in addition to the 07-28-28 list:
- Rivals: difficulty-scaled rival economy/aggression/army, Hard+ rivals scout and raid weaker neighbours, rival governments and governors, rival economy fixes (seeds, hold bug, harvest put-down, yield-aware farm sites). NOT proven: rivals reaching Bronze reliably; conquest of a hall (occupation registers, hall hp unchanged); one rival still starves on some seeds.
- Trade: regional goods (olive oil, wine pressed at storehouse/town hall, Bronze+), captive sale, basket carry bonus, coins, expedition panel. Open: map destination picker, willing migrants, vineyard/press buildings.
- Building behaviour: door/eave clearance for all carved buildings, workers inside large workshops, work-face for repair/craft flows, steep-ridge detour test, workshop plinth/cornice wealth tiers, build-time tiers.
- Saves: failing check is now named in the error and console; six over-strict checks relaxed; live-state bug after peace annexation fixed. Boris's exact error NOT reproduced. Oct 13-29 builds' saves (worldgenVersion 10, no worldOptions) cannot be restored and are refused with a reason.
- Smoke: game loads in browser on 8086 with no console errors (start screen only); new panels not exercised visually.
Open for Boris: longer-seasons decisions (3 questions in claude/PLAN-longer-seasons-2026-11-15.md); planning docs ready: claude/PLAN-future-2026-11-15.md (first-person, eras to planets, big/Earth/donut maps, loading screen, name candidates, fleshing out ages).
