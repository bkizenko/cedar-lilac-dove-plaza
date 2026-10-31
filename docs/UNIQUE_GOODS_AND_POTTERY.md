# Village goods and pottery: next production design

Status: proposed. No new material, workplace, trade item or automatic income is implemented by this document. Preserve existing buildings, the six-era roadmap, actual finite resources and observed-information rules.

## Current code boundary

- `ResKind` currently permits food, wood, stone, copper and iron. Barter quotes, stock/costs, cargo, inventories and most accounting assume those five categories.
- `FoodKind` refines food into provisions, berries, fish, meat, grain, pulses, tubers and milk. These are existing consumed/perishable lots, not crafted pots, leather, textiles or charcoal.
- Water is a finite collected survival stock; fire burns real communal logs. The workshop has real bench slots, paid jobs, work progress and actual deliveries. Those foundations can support another chain.
- Clay deposits, clay extraction, wet/unfired/fired vessels, potter work, drying, kiln firing, vessel breakage, pottery storage and pottery trade do not exist. A forge hint or a village name is not an implemented manufacturing chain.
- Goat capture/feed/breeding/milk/pack work exists. Sheep/wool, tanning inputs, separate textile production, charcoal and ore-to-ingot processing remain gaps documented in the building catalogue.

## Small complete pottery batch

Use a separate item inventory for intermediate/manufactured goods, with explicit conversion adapters to current cargo and barter. Do not turn the existing communal food/wood/water into second duplicate stocks.

| Stage | Actual dependency and job | Saved, measured output and blockers |
|---|---|---|
| Observe clay | Resident surveys an accessible real sediment/clay site. Geological potential may guide placement; labels alone do not make a deposit | Known deposit, finite remaining volume/quality, reachable bank/route. Unknown rival deposits remain unknown |
| Extract and haul | Worker digs actual clay and carries it to a yard | Clay volume/mass removed, carried load, delivered amount, route time; no remote inventory reward |
| Prepare and shape | Potter at an existing compatible shelter or a new staffed pottery yard consumes delivered clay and measured water | Reserved inputs, occupied bench, hands-on seconds, vessel count and maker practice. No water means a blocked job, not invented water |
| Dry | Loaded wet greenware occupies a finite drying slot; temperature/humidity/rain affect drying | Remaining moisture/time, cracked batches, covered capacity. An unloaded rack produces nothing |
| Fire | Actual dried vessels are loaded into a firing place; delivered logs or later real charcoal supply heat | Fuel consumed once, firing progress/temperature, finite kiln capacity, failed and successful vessels. Hearth warmth and kiln firing cannot both spend the same fuel unit |
| Store and use | Real fired vessels are delivered and allocated to storage/cooking/water tasks | Stored/allocated/broken counts; a measured food-protection or carrying-capacity effect tied to actual available vessels |
| Trade | A resident loads a real offered quantity and walks/rows it to an observed trading partner | Seller stock reserved/debited once, actual arrival/quote/payment, losses, delivery and refusal reasons. No global pottery income tick |

A first vertical slice should deliver this full chain for a simple vessel, before adding decorative names, dozens of pottery recipes, or a large craft tree. Legacy saves need explicit optional migration and should not receive free completed wares.

## How villages become distinct

Differences should emerge from observed land, actual practice, supplies and exchange. A society may specialize in a good; that is an outcome rather than a permanent ethnic production bonus.

| Local opportunity | Potential specialization | Required real distinction |
|---|---|---|
| Accessible river/lake sediment plus fuel and water | Pottery and storage vessels | Clay quality, drying climate, firing skill, fuel/hauling cost, useful vessel quality and a persistent original visual style |
| Woodland plus actual hides/tannin | Leather goods and warm skin clothing | Tannin collection, hides from actual animals, tanning time, tailoring/equipment and condition |
| Grazing/fodder plus actual milk animals | Dairy and preserved food | Fed/lactating animals, keeper time, seasonal milk, conversion/preservation capacity and spoilage |
| Sheep/fibre crops plus practical weaving | Cloth and suitable garments | Actual wool/fibre supplies, spinning/weaving/tailoring labor, warmth/heat suitability and wearing out |
| Accessible rock/ore plus actual fuel | Dressed stone, metal tools and fittings | Finite extraction, ore/fuel processing, measured skill/yield, repair/quality and physical transport |
| Dense timber with excess work after subsistence | Wood products, boats and later charcoal | Real tree cutting/replanting, construction and bench labor, maintenance, hauling and fuel conversion |

A style or recipe is acquired through need → observed sample → experiment → repeatable production → local adoption/teaching. Foreign goods can be brought home, examined and eventually imitated if inputs and practice exist. Trade should create useful interdependence without making basic first-winter survival require an undiscovered specialist village.

## Small acceptance set

Prove conservation of clay, water, fuel, intermediate vessels and final wares; physical trips and bench/kiln capacities; no duplicate output after interruption, worker loss or save/reload; visible wet/drying/fired states; local quoted trade backed by real inventories; and one measurable use benefit. Preserve species/resource density, shared society rules and the current campaign checklist until those gates are actually passed.
