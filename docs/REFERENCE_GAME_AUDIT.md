# Reference games and foundation audit — 2026-10-31

This report records verified primary-source mechanics, the player's interview answers and current code evidence. It is not a claim that the overhaul is complete. Proposed behavior below is our design, not a historical fact or a claim of exact parity with another game.

## Player's answer: the intended game

The opening and much of the early game should be difficult, rewarding survival, scaled by difficulty: hunt, gather berries, collect water, build shelter, prepare for winter. Seasonal survival, scarce resources and rival defense remain recurring pressures, with their relative importance changing between games. Direct orders are primary; persistent assignments provide optional automation. Development must arise from needs and incentives. Wealth, theft, trade, defenses, legitimacy, ritual, families, treaties, harvest accounting and ancient ruins should form connected systems.

This overrides the earlier assumption that plentiful automatic food and rapid progression alone would make the game fun. Do not respond by making workers refuse orders, hiding prerequisites or causing unavoidable early starvation. Difficulty should come from understandable choices and opportunity costs.

## Verified reference mechanics

| Reference | Published mechanic | Application to this game |
| --- | --- | --- |
| Dawn of Man | Seasonal availability, hunting/gathering, winter food and clothing preparation, farming/domestication and fortification form its survival progression. [Official overview](https://www.madrugaworks.com/dawnofman/) | Build one complete first-winter loop before more late-game menus. Distinct food, tools, storage, clothing and water need clear purposes and physical work. |
| Dawn of Man | Domestic species have different uses: goats/milk, sheep/wool, pigs/meat, cattle/more milk, donkeys and horses/traction. The FAQ also exposes workload, tool availability, resource limits, animal limits and defense alerts as explicit controls. It says there are no AI-controlled settlements, only raider attacks. [Developer FAQ](https://www.madrugaworks.com/dawnofman/faq.php) | Real husbandry needs feeding, births, labor and products. Competitive rival cities are an additional Civ/AoE requirement; copying Dawn of Man alone cannot supply them. |
| Civilization VII | The launch dev diary describes relationship stages and leader agendas, trade resources that support settlement specialization, land/sea trade networks and merchants physically reaching destinations in earlier Ages. Its resource routes copy resource access, rather than shipping finite crates. [Firaxis dev diary, publisher Steam feed](https://steamcommunity.com/games/1295660/announcements/detail/508443269496045928) | Borrow differentiated interests, legible relations and regional specialization. Retain this player's finite physical cargo, hidden foreign reserves and negotiated barter instead of blindly copying every Civ abstraction. |
| Age of Empires III: Definitive Edition | Its official overview describes an Explorer collecting guarded treasures, customizable Home City shipments, age-up choices, and contested resources/Trading Posts that pull players outward. It also explicitly says gathered resources enter stockpiles without drop-off. [Official gameplay pillars](https://www.ageofempires.com/news/aoe3de-inside-overview/) | Borrow worthwhile exploration, contested routes, tactical choices and outward pressure. Keep the user's requested hauling, population recruitment and local development; shipment cards and instant resource transfer are not prerequisites for those benefits. |

These sources establish core design patterns, not every current patch detail. The Civ VII game-guide page and official Civ VI manual returned403 during this audit; their unread contents are not presented as inspected. The developer-linked Dawn of Man playthrough was found, but browser approval declined YouTube access. No video/transcript was watched or accessed through a workaround. Primary written sources above were reviewed.

## Current code: why maps remain repetitive

- `src/game/worldgen.ts` still begins with a single `islandR` (410–455m) and a radial/elliptical distance mask. Seeded lobes, warp and coast orientation decorate that parent island. They do not implement Pangaea, separate continents or an archipelago generator.
- The `MAP=1040` constant and fixed navigation/fog grids are assumed throughout simulation, rendering and save validation. Simply increasing that constant would alter old regenerated worlds and does not provide safe per-save size options.
- The extra woodland pass stops at400 added trees and rejects close spacing. Sample version6 seeds123456 and42 produced607 and577 trees respectively, with52% and51% sampled dry land. Node stock is26692 and25768 logs, but stock quantity is not the same as a visibly continuous forest or accessible timber near a settlement.
- Radial placement/recovery checks survive outside the coastline equation. Replacing only the height mask leaves camp placement, resources, wildlife recruitment and some navigation assumptions inconsistent.
- The simulation coordinator is large, but many systems already have separate modules. Replacing the engine is not necessary to remove these specific couplings. Work eligibility and order ownership remain partly duplicated; new reserved tasks must be protected across all schedulers.

## Recommended next execution order

1. **World foundation:** persist per-world size/layout/metrics; preserve legacy dimensions for old saves. Centralize coordinate/grid conversions. Add real continent, Pangaea and archipelago landmask modules; use elevation, connected land/water regions and shoreline distance instead of one radius in placement/recovery. Test layout differences using component/land-area metrics and visible seed galleries.
2. **Resource geography:** dense usable forest regions, clearings, treelines, drylands, river valleys, mountain ores and regional shortages. Add spatial queries/chunk visibility before greatly increasing tree counts. Starter viability checks should guarantee a route to essential survival supplies without stamping the same tiny forest/berry patch into every start.
3. **First-winter vertical slice:** people without prebuilt halls; usable temporary drop/storage and camp shelter; direct hunting/gathering/water collection; finite fuel/tools/clothing; visible workload and seasonal planning. Show why a task is blocked and how to solve it. Test an actual normal-difficulty first winter, rather than testing each subsystem in isolation and inferring fun.
4. **Rival incentives:** evaluate expected benefit, labor/material cost, travel risk, danger and upkeep. Exposed stores plus recent raids justify fortification; food deficits justify new supply/trade; favorable exchanges justify merchants and escorts; safe repeated commerce can outperform theft. Raiding must have travel, casualty, retaliation and opportunity costs. Walls need doors/routes and affordable maintenance. Do not force every tribe to build every unlocked building or make theft universally optimal.
5. **Progression and legitimacy:** practical discoveries reduce real bottlenecks; surplus and density permit specialists. Family/dynastic ties, shared rituals, protection, provisioning and agreements can support legitimacy with different local outcomes. Writing/accounting supports stores and administration; ruins provide material evidence to recover and study. Treat these as design hypotheses to test, not a single deterministic theory of human history.
6. **Cultural presentation and later cities:** implement the requested regional architectural families, trade/conquest influences, wealth ornament, meaningful institutions and delegated administrators against the working economy. Preserve direct overrides and concise explanations.

## Acceptance: foundation before more feature boxes

- Fresh seeds visibly produce genuinely different landmass families and useful terrain, not another circular island with a different coast angle.
- Size selection changes explorable extent without changing an existing save. Boats have connected destinations and ports; land parties get credible dry routes or explicit crossing requirements.
- Forest starts can support substantial timber economies, while plains/arid starts have intentional alternatives, migration or trade rather than arbitrary starvation.
- A player can explain the first-winter plan from visible information and direct the needed work without repeatedly clicking stalled workers.
- At least two viable rivals develop, exchange, contest resources and defend valuable holdings for legible reasons.
- Measure actual frame time, resource-query cost and memory on the target M1 Air; keep instancing and reduce distant detail before sacrificing world variety.

## Husbandry batch status

A Stone Age animal pen and actual owned goat herd are implemented in the current batch: capture/lead home, keeper care, pasture depletion, plant feed in winter, breeding/kid growth, maternal milk, physical delivery, slaughter and converting one adult into an existing pack carrier. This does not complete animal diversity, wool/leather chains, livestock trading/theft, herd disease, water needs or rival livestock strategy. See the execution record for test/build/publication evidence.
