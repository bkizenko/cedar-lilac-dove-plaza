# Hearthwild: functional buildings, stations and settlement scale

Reference checked 2026-10-31. **36 registered structures, 36 build-menu entries, 23 processing recipes and 25 functional catalogue groups.** Counts describe the current source registry, not completion of every hinted service. This document adds no implemented gameplay. Existing equipment, cultivation, husbandry and transport executors also perform work outside the 23 processing recipes.

## Reference principles and boundaries

Dawn of Man is a useful reference for linked survival work: gathering and hunting supply food and useful animal materials; seasonal storage and clothing prepare a settlement for winter; cultivation and domestication support growth. Its official scope runs from the Stone Age to the Iron Age. These principles inform dependencies below, rather than a copied building list. [Madruga official overview](https://www.madrugaworks.com/dawnofman/)

The official FAQ connects stalled work to materials, tools and workload, and describes alert-based tower staffing and species-specific animal products. It also explicitly says there are no AI-controlled settlements. Hearthwild’s independent societies, contextual occupation, coastal trade and Classical-and-later development are its own scope. The official pages do not supply an exhaustive building registry, so the proposed stations below are Hearthwild design recommendations, not claims about Dawn of Man content. No assets are copied. [Madruga official FAQ](https://dawnofman.madrugaworks.com/faq.php)

## People first; stations improve work

A station is a place to perform a task, not a lifetime profession. A resident can gather, carry, construct, make a batch, tend animals and defend the camp as circumstances change. A small settlement should use seasonal and part-time specialists. No fifty-person camp should need a separate class of abstract researchers: useful learning comes from observations, samples, attempts, repeated successful work and teaching.

Construction supports multiple queued site tasks, explicit priorities and saved pause/resume through its own executor. This is a bounded task queue, not a lifetime builder profession or an unlimited future production list. Paid processing records remain a separate queue of batches with real committed inputs.

The ranges below are **design guidance, not unlock gates, historical measurements or simulated population caps**. Geography, travel, harvest peaks and surplus can justify an earlier or later station.

| Society size | Practical organization | What should justify another station |
|---|---|---|
| Traveling band, roughly 2–8 | Portable shelter/cache, hand tools, shared cooking, water trips; everyone combines jobs | A repeated bottleneck that still permits moving camp |
| Camp, roughly 8–20 | One or two people make batches between gathering/childcare/hauling; seasonal hunters and keepers | Frequent queues, spoilage, missing winter clothing or excessive carrying |
| Village, roughly 20–50 | Several part-time food/material specialists, shared builders, rotating guards; apprentices learn by doing | Sustained throughput demand and enough spare food for diverted labor |
| Town, roughly 50–150 | Some regular specialists, dedicated hauling routes, multiple simultaneous worksites, supplied civic services | Actual service coverage, route delays, input availability and maintenance demand |
| Regional society, roughly 150+ | Several settlements and trades, teaching workshops, regional transport and institutional staffing | Connected physical supply, regional demand and measurable operating costs |

Existing campaign age-readiness checks remain separate: Bronze 50, Iron 75, Classical 100, Medieval 125 and Renaissance 150 population, with stock costs. These are current game gates, not numbers of researchers or a reason to block Stone food processing. This document does not change them.

## Current registered structures

Costs are base registry amounts in logs/stone; food is zero for these entries. Command-time costs, expanding footprints, linear construction and configured defenses take precedence. Work is base work seconds before actual worker/travel effects, not promised wall-clock completion. Equipment benches and food/material processing slots are separate shared capacities, not passive production.

| ID / structure | Registry age | Base logs / stone | Base work | Current function and limits |
|---|---|---:|---:|---|
| `hut` — Hut | Stone | 40 / 0 | 8 s | Five population places and shelter. Distinct portable tents, household beds/heating remain incomplete. |
| `cornerstone` — Frontier outpost | Stone | 70 / 0 | 12 s | Local frontier anchor/influence. Not a magically supplied independent town. |
| `townhall` — Town Hall | Stone | 20 / 0 | 0 s | Communal anchor and one equipment bench. First-player founding has a special cost; later halls are not universally free or instant. Not required for all manual gathering. |
| `farm` — Farm | Stone | 0 / 0 | 10 s | Real cultivation/seeds, seasonal work and whole-footprint terrain suitability. No terrain flattening. |
| `pen` — Animal pen | Stone | 18 / 0 | 16 s | Actual captured goats, keeper work and finite herd care/milk. Full grazing ecology and sheep/cattle/pig diversity remain incomplete. |
| `dock` — Fishing Dock | Stone | 40 / 0 | 10 s | Physical fishing and a boat-building bench. Finite paid boats and bounded coastal trade; not a complete fleet/naval-combat economy. |
| `lumber` — Lumber Camp | Stone | 16 / 0 | 10 s | Optional nearby cutting efficiency; known trees can be cut by hand without this building. |
| `workshop` — Crafting shelter | Stone | 18 / 2 | 14 s | Three shared equipment benches and 25% faster hands-on crafting; shorter applicable recipes. No abstract researcher requirement. |
| `quarry` — Quarry | Stone | 18 / 0 | 12 s | Finite known outcrops/seams and physical miners; current cost 18 logs. Not infinite stone. |
| `warehouse` — Storehouse | Stone | 60 / 0 | 12 s | Communal capacity/store care, not separate per-building bins. No passive dried/smoked food production. |
| `barracks` — Barracks | Stone | 40 / 0 | 12 s | Equipment benches and military infrastructure. Local defense uses real owned equipment; full supplied professional-garrison services remain partial. |
| `palisade` — Palisade | Stone | 6 / 0 | 12 s | Physical timber barrier; leave reachable gates. |
| `gate` — Timber gate | Stone | 12 / 0 | 18 s | Directional timber gate; open/closed/automatic passage. |
| `trench` — Defensive trench | Stone | 0 / 0 | 18 s | Paid adjustable-depth smooth excavation. Actual volume controls labor; persistent terrain cut. No free mining yield. |
| `stonewall` — Stone wall | Iron | 0 / 12 | 24 s | Physical stone barrier. Dressed-stone manufacture and supplied maintenance remain incomplete. |
| `moat` — Flooded moat | Medieval | 4 / 4 | 30 s | Legacy water-adjacent defense. Complete excavated water flow and hydraulic engineering are not implemented. |
| `bridge` — Timber bridge | Stone | 32 / 4 | 40 s | Paid physical crossing over a measured span; passage still depends on terrain and routes. |
| `forge` — Forge | Bronze | 70 / 60 | 24 s | Two equipment benches and metal-stock recipes. Ore refining, bronze alloying, charcoal/heat and steel chains remain incomplete. |
| `watchtower` — Watchtower | Iron | 60 / 50 | 16 s | Paid material/height platforms; unfinished towers cannot shoot. Physical projectile origin; full guard/ammunition supply chain remains incomplete. |
| `temple` — Temple | Classical | 60 / 120 | 28 s | Existing civic/population effect. Complete staff, rites and physical service inputs remain planned. |
| `market` — Market | Classical | 90 / 40 | 22 s | Existing economic effect and physical exchange systems. Full market stall/merchant service staffing remains partial. |
| `keep` — Keep | Medieval | 80 / 160 | 36 s | Existing fortified/population effect. Full siege, supplied garrison and institutional operation remain partial. |
| `stables` — Stables | Medieval | 100 / 40 | 28 s | Registered mounted-development infrastructure. Complete horses, fodder, tack and breeding chain remain incomplete. |
| `university` — University | Renaissance | 140 / 160 | 32 s | Existing later civic/population effect. Complete practical teacher/apprentice network remains planned; do not infer researchers. |
| `hearth` — Cooking hearth | Stone | 4 / 4 | 10 s | One processing slot; cooking, manual grinding/baking/smoking. A placed hearth is not yet a complete ignition/heat-tending simulation. |
| `grindingStone` — Grinding stone | Stone | 2 / 6 | 12 s | One processing slot; 4 grain → 4 flour in 24 work seconds; hearth alternative takes 60. |
| `oven` — Stone bread oven | Stone | 8 / 8 | 18 s | Two processing slots; 4 flour + 2 water + 1 log → 4 bread in 24 work seconds; hearth takes 45. |
| `smokehouse` — Smokehouse | Stone | 12 / 6 | 18 s | Two processing slots; meat/fish smoking uses actual food and fuel. Salt curing remains planned. |
| `butcher` — Butcher and skin yard | Stone | 6 / 2 | 12 s | Hide cleaning and bark-tannin extraction. Hunters supply raw meat/hides/bones; detailed carcass cutting remains planned. |
| `dryrack` — Food and skin drying rack | Stone | 4 / 0 | 10 s | Two shared processing slots. Food has paid loading, weather-dependent curing and physical collection. Skin drying remains a staffed batch. |
| `tanner` — Tanning yard | Stone | 8 / 2 | 14 s | Paid cleaned-hide/tannin/water leather batch. Passive vat curing and plant-specific chemistry remain planned. |
| `tailor` — Skin sewing shelter | Stone | 8 / 0 | 12 s | Physical skin/leather garments, delivery and actual wearing. Textile fibres, bindings and summer clothing remain incomplete. |
| `potter` — Pottery shelter | Stone | 8 / 2 | 14 s | Two shared shaping/drying slots. Shaping 30 s versus 90 at a hearth; covered clay drying resists rain but still depends on humidity/temperature and physical pickup. |
| `kiln` — Pottery kiln | Stone | 8 / 8 | 20 s | Two firing slots. Four dried ware +2 logs take 45 work seconds; manual hearth uses 4 logs/90 seconds. Outputs are actual vessels and failed potsherds, not guaranteed four vessels. |
| `cairn` — Stone Cairn | Stone | 20 / 40 | 18 s | Local influence/community marker. Full monolith quarrying, sledge transport and erection chain remains planned. |
| `grove` — Sacred grove | Stone | 36 / 0 | 16 s | Local influence/community site. Complete staffed ceremonial/ecological services remain planned. |

Special cases: farms also require actual seeds; halls have founding/repeated-construction rules. Trenches use additional excavated volume (at least the base work), bridge spans alter requirements, and tower material/height designs determine paid cost, labor and HP. A blueprint never provides a completed service or a free terrain cut. New nomadic starts do not imply a prebuilt settlement.

## Current 23 processing recipes

All inputs are finite paid stock/food lots. A worker collects and carries them, reaches the site, performs work and delivers output. Four input food units becoming four output food units is conversion, not multiplication. Weather exposure is additional elapsed curing time, not staffed work. Site slots are shared across its recipes.

| Recipe | Workplace | Paid batch inputs | Output | Staffed work / exposure |
|---|---|---|---|---|
| `formClayHand` — Hand-form clay vessels | Cooking hearth | 4 clay, 2 water | 4 formed greenware | 90 s |
| `formClay` — Form vessels at a pottery shelter | Pottery shelter | 4 clay, 2 water | 4 formed greenware | 30 s |
| `dryClay` — Air-dry greenware | Food and skin drying rack | 4 formed greenware | 4 dried unfired ware | 10 s + 90 effective dry s |
| `dryClayCovered` — Dry greenware under cover | Pottery shelter | 4 formed greenware | 4 dried unfired ware | 10 s + 90 effective dry s |
| `fireClayHand` — Fire pottery at the hearth | Cooking hearth | 4 dried unfired ware, 4 logs | 0–4 fired pottery vessels; failed units become potsherds | 90 s |
| `fireClay` — Fire pottery in a kiln | Pottery kiln | 4 dried unfired ware, 2 logs | 0–4 fired pottery vessels; failed units become potsherds | 45 s |
| `cookMeat` — Cook meat | Cooking hearth | 4 raw meat, 1 logs | 4 cooked meat | 20 s |
| `fleshHide` — Flesh and clean a hide | Butcher and skin yard | 1 raw hides | 1 cleaned hides | 20 s |
| `extractTannin` — Extract bark tannin | Butcher and skin yard | 1 logs, 2 water | 2 bark tannin | 20 s |
| `drySkin` — Dry a cleaned skin | Food and skin drying rack | 1 cleaned hides | 1 dried skins | 60 s |
| `tanHide` — Tan a hide | Tanning yard | 1 cleaned hides, 1 bark tannin, 2 water | 1 leather | 90 s |
| `sewSkinClothes` — Sew skin clothing | Skin sewing shelter | 2 dried skins, 1 bones | 1 skin clothing | 45 s |
| `sewLeatherClothes` — Sew leather clothing | Skin sewing shelter | 2 leather, 1 bones | 1 leather clothing | 60 s |
| `grindGrain` — Hand-grind grain | Cooking hearth | 4 grain | 4 flour | 60 s |
| `grindGrainStation` — Grind grain at a stone | Grinding stone | 4 grain | 4 flour | 24 s |
| `bakeBread` — Bake hearth bread | Cooking hearth | 4 flour, 1 logs, 2 water | 4 bread | 45 s |
| `bakeBreadOven` — Bake oven bread | Stone bread oven | 4 flour, 1 logs, 2 water | 4 bread | 24 s |
| `airDryMeat` — Air-dry meat | Food and skin drying rack | 4 raw meat | 4 dried meat | 10 s + 60 effective dry s |
| `airDryFish` — Air-dry fish | Food and skin drying rack | 4 fresh fish | 4 dried fish | 10 s + 60 effective dry s |
| `manualSmokeMeat` — Smoke meat at the hearth | Cooking hearth | 4 raw meat, 2 logs | 4 smoked meat | 60 s |
| `manualSmokeFish` — Smoke fish at the hearth | Cooking hearth | 4 fresh fish, 2 logs | 4 smoked fish | 60 s |
| `smokeMeat` — Smoke meat | Smokehouse | 4 raw meat, 1 logs | 4 smoked meat | 30 s |
| `smokeFish` — Smoke fish | Smokehouse | 4 fresh fish, 1 logs | 4 smoked fish | 30 s |

Food drying releases the loading worker while the actual batch cures. Rain can rewet it, cumulative wet exposure can spoil it, and freezing can stop useful drying; sixty effective dry seconds are not sixty seconds in any weather. Ready food still needs physical pickup. Dried and smoked meat/fish have distinct food lots and spoilage rates. Skin drying does not yet use that weather model.

Manual grinding takes 60 seconds per four grain; the grinding stone takes 24 with one slot. Hearth bread takes 45 seconds; the oven takes 24 with two slots. Hearth smoking costs two logs and 60 seconds; the smokehouse costs one log and 30 seconds with two slots. Faster stations improve labor/fuel/throughput rather than creating extra goods. Bread’s 1.2 meal nourishment factor is an explicit game-tuning choice; physical units remain conserved.

Pottery begins with a resident surveying a reachable low freshwater bank, exposing a deterministic finite 80–160-unit alluvial deposit. Digging 4 clay takes 24 work seconds; the load is physically carried to the cache and the bank depletes. Four clay plus 2 water become 4 greenware; loaded greenware needs 90 effective drying seconds and physical collection before firing. Exposed rain rewets it,180 cumulative wet seconds damages it, and freezing pauses drying. The pottery shelter protects against rain, not cold. There is no ore/clay gift for constructing a station and no world-generation hash change.

Actual firing may produce potsherds instead of vessels. Stored fired vessels retain producing society/site and local style. Collect one at the cache to equip a resident: it leaves stock and enables an actual 32 L water trip with 16 seconds filling, instead of the unchanged 24 L/12 seconds without pottery. Ten successful delivered trips wear the vessel out; breakage/death records a lost vessel. This reduces travel trips, not filling effort or water demand. It does not also grant generic storage capacity. [Pottery execution and gaps](POTTERY_PRODUCTION.md).

The crafting shelter has three equipment benches versus one at a hall, an actual 25% hands-on rate advantage and shorter applicable equipment recipes. Those equipment queues are distinct from the processing table above. A workshop cannot produce flour merely because it has benches.

## Current 25 functional catalogue groups

`Working` means its stated executor exists; `partial` means some real work exists but named dependencies/services remain unfinished; `planned` provides no executable station. Several groups share a registered building, so groups must not be counted as additional buildings.

| Group | Stage | Existing station IDs | Status | Exact remaining boundary |
|---|---|---|---|---|
| `shelter` — Huts and early tents | Stone | `hut` | partial | Existing hut works; distinct tents, assigned beds and household heating remain future work. |
| `hearth` — Communal hearth and cooking | Stone | `hearth` | partial | Cooking batches consume real raw meat and logs. Dedicated hearth warmth/ignition/tending beyond existing survival fire remains separate. |
| `crafter` — Early crafter | Stone | `workshop` | working | Separate bone, binding, hide and advanced repair recipes remain incomplete. |
| `butcher` — Butcher place | Stone | `butcher` | partial | Hunters provide actual raw meat, hides and bones. Dedicated carcass portions, knives and yard butchery remain incomplete. |
| `foodDryer` — Meat and fish drying | Stone | `dryrack` | partial | Loaded food now dries with measured weather exposure, moisture, wet-weather spoilage and physical pickup. Wind, detailed food safety and species-specific cuts remain future work. |
| `skinDryer` — Hide drying rack | Stone | `dryrack` | partial | Current drying is a 60-second staffed batch. Weather-dependent moisture/exposure remains future work; one skin cannot also feed tanning. |
| `tanner` — Tanning work area | Stone | `tanner` | partial | Current tannin extraction consumes a delivered log and water. Separate observed plant species, vats and curing exposure remain incomplete. |
| `tailor` — Outfitter and tailor | Stone | `tailor` | partial | Current recipes produce skin/leather garments with actual inventory and equipping. Wool/cloth, bindings and hot-weather clothing remain incomplete. |
| `pasture` — Pasture and shepherd | Stone | `pen` | partial | Existing goat pen and keeper work; full pasture ecology and species diversity remain incomplete. |
| `hayStore` — Fodder shelter | Bronze | None | planned | No automatic animal feed from a building name. |
| `well` — Well and reliable water | Bronze | None | planned | Current freshwater collection remains valid; wells cannot create infinite water anywhere. |
| `grainStore` — Granary and protected stores | Stone | `warehouse` | partial | Existing generic storage/care works; grain-specific pests, containers and bins remain incomplete. |
| `mortar` — Grinding place | Stone | `hearth`, `grindingStone` | partial | Hand grinding at a hearth and a faster grinding stone consume actual grain to make flour. Tool wear remains future work. |
| `oven` — Oven and bakery | Stone | `hearth`, `oven` | partial | Hearth and oven batches consume delivered flour, water and fuel. The oven has faster work and two slots; no passive bread income. |
| `weaver` — Spinning and weaving | Bronze | None | planned | Existing goats do not produce free wool. |
| `charcoalKiln` — Charcoal kiln | Bronze | None | planned | Charcoal cannot duplicate logs already burned for warmth. |
| `smelter` — Smelting furnace | Bronze | None | planned | Current copper/iron stocks abstract workable metal; ore-to-ingot and bronze alloying remain gaps. |
| `smith` — Forge and smith | Bronze | `forge` | partial | Current metal equipment works; distinct ingots, heat and maintenance chains remain incomplete. |
| `pottery` — Clay, pottery and firing | Stone | `hearth`, `dryrack`, `potter`, `kiln` | partial | Finite clay survey/extraction, shaping, weather drying, paid firing, potsherds and owned 32 L carrier jars work. Wheel throwing, glazes, detailed geology/heat cycles, food storage vessels and provenance-preserving trade remain incomplete. |
| `dairy` — Dairy preservation | Bronze | `pen` | partial | Milk delivery exists; cheesemaking chain remains planned. |
| `smokehouse` — Smoking and salt curing | Stone | `hearth`, `smokehouse` | partial | Real meat/fish smoking uses paid fuel and staffed work, producing distinct longer-lasting food. Salt deposits, salt curing and advanced chambers remain planned. |
| `masonry` — Stoneworking and supplied defenses | Iron | `quarry`, `stonewall`, `watchtower`, `barracks` | partial | Existing extraction/walls/guards work; dressed stone, full ammunition and repair chains remain incomplete. |
| `civic` — Classical civic services | Classical | `market`, `temple`, `townhall` | partial | Existing civic effects are partial; full staffed service chains remain roadmap work. |
| `medieval` — Medieval institutions | Medieval | `keep`, `moat`, `stables` | partial | Existing IDs retained; full horses, feed, tack, siege and hydraulics remain incomplete. |
| `renaissance` — Renaissance teaching and workshops | Renaissance | `university` | partial | Existing university retained; complete staffed teaching network remains future work. |

## Functional station roadmap: Stone survival and settled camps

This is a functional checklist, not a requirement to build every named structure. A function can begin as a hand task or shared camp area, gain simple equipment, and only later justify a dedicated building. **Existing** below refers to the bounded function described; **extend** has a real predecessor; **planned** has no complete executor. Stage labels describe intended availability, not a rule that everyone advances on the same historical date.

| Function / possible station | Present starting point | Manual → specialist dependency and benefit | Measure before adding capacity |
|---|---|---|---|
| Portable tent / shelter frame | Extend hut and mobile camp | Gather real poles/coverings → erect, pack and physically transport reusable shelter | Sheltered beds, packed mass, setup labor, warmth, durability |
| Household sleeping/heating place | Extend hut | Shared shelter → assigned household beds, fuelled heating and repair | Occupancy, cold exposure, fuel, indoor capacity |
| Camp cache / covered store | Extend communal stores | Ground cache → covered containers → warehouse; preserve actual carried stock during moves | Stock volume, spoilage, exposure, haul distance |
| Basket and cordage area | Planned | Collect suitable plants → strip/twist/weave → baskets, bindings, ropes | Fibre consumed, batch time, container capacity, wear |
| Flint knapping place | Extend equipment crafting | Hand stone work → skilled knapping bench; finite appropriate stone, failed pieces | Tool yield, waste, sharpness, breakage, useful work per tool |
| Bone/antler tool bench | Extend hunted bone | Clean actual bone → needles, awls, hooks and handles | Species/material stock, labor, tool durability |
| Woodworking place | Extend workshop/lumber | Hand axe shaping → bench/jigs → handles, poles, boards | Log-to-part yield, waste, travel, tool wear |
| Binding/hafting bench | Planned | Actual cordage, handles and stone heads → assembled tools | All components conserved, strength, repair cost |
| Hunting dressing site | Extend hunt/butcher | Physical kill and transport → field dressing or yard cutting; knife and carcass portions | Carcass mass, meat/hide/bone yields, time-to-spoil, waste |
| Cooking and fire tending | Extend hearth/survival fire | Ignition/fuel gathering → shared hearth tending; no independent unlimited heat | Fuel, burn time, heat reach, tending labor, interruption |
| Food drying rack | Existing food drying | Loaded real food → weather curing → collection; shelter upgrades improve exposure control | Loaded slots, moisture, useful dry seconds, wet spoilage, delivery |
| Skin drying rack | Extend staffed drySkin | Clean hide → loaded weather drying, rather than simply time spent standing | Moisture, usable skin yield, weather damage, slots |
| Smoking shelter | Existing smokehouse | Manual hearth smoking remains useful → lower fuel/work and extra slots | Logs per preserved unit, work, capacity, spoilage |
| Hide scraping / tanning yard | Existing bounded batches | Scrape hides, extract actual tannin → vats with measured soaking/curing | Water/tannin use, loaded volume, elapsed curing, losses |
| Skin sewing / repair shelter | Existing garment production | Hand needle/skin work → sheltered benches; repairs consume real patches/bindings | Garments owned/worn, condition, warmth, work, repair material |
| Gatherer sorting / seed cache | Extend gathering/crop samples | Hand sorting → protected viable seed lots and practical crop observations | Edible vs seed allocation, seed viability, waste, sample provenance |
| Cultivation plot | Existing farm/cultivation | Trial plants and manual plot work → tools, larger suitable fields | Actual soil/water/grade, sowing/harvest work, yield and seed reserve |
| Threshing floor / winnowing place | Planned | Harvested plant material → separate grain/straw/chaff using real labor | Harvest mass balance, drying, wind/weather, losses |
| Hand quern / grinding stone | Existing hearth/stone recipes | Manual grinding → faster dedicated stone; later wear/maintenance | Grain/flour conservation, labor per batch, tool condition |
| Bread hearth / oven | Existing recipes | Hearth fallback → two-slot faster oven; supplied flour/water/fuel | Output, fuel, labor, queue delay, spoilage |
| Food pit / grain bin / granary | Extend warehouse | Real delivered crop lots → moisture/pest-aware specialized storage | Volume by commodity, humidity, pest losses, store care |
| Water collection / carrier point | Existing freshwater trips | Known reachable water and physical vessels → better collection facilities | Yield, potable quality, liters carried/delivered, round-trip time |
| Rainwater catchment / cistern | Planned | Real catchment area and vessels → finite rain-fed storage; drought matters | Rain input, evaporation, leakage, capacity, contamination |
| Washing / waste area | Planned | Carry water, separate waste from camp/source → sanitation service | Water used, distance, contamination, cleaning labor |
| Fishing bank / landing | Existing dock/fishing | Hand fishing at known reachable water → nets/traps/landing equipment | Finite stock, catch effort, tool/material losses, season |
| Net-making / fish trap yard | Planned | Actual fibre/bone/wood → owned nets/traps and repairs | Gear stock, deployment, catch selectivity, breakage |
| Animal capture / quarantine area | Extend actual goat capture | Escort actual animals → safe holding and acclimation; avoid invented herds | Animals captured/alive, injury, escape, keeper time |
| Grazing enclosure / shepherd circuit | Extend pen | Real herd and usable land → movable/large pasture management | Area, forage regrowth, grazing load, water, winter deficit |
| Birthing / milking shelter | Extend goat milk | Actual sex/age/lactation and care → protected service slots | Lactating animals, milk, labor, health, calf/kid survival |
| Stone outcrop / quarry workplace | Existing finite mining | Hand collection → organized extraction/hauling; no stone regeneration by naming a quarry | Remaining seam, worker slots, tool wear, haul capacity |
| Community gathering place | Extend cairn/grove | Shared rituals/social time → maintained gathering area with local service | Attendance, travel, staff/input cost, actual wellbeing effect |
| Burial / memorial ground | Planned beyond civic markers | Physical body handling, burial and mourning → local supported service | Bodies, labor, grave space, disease/morale effects |
| Learning / demonstration place | Extend need-driven knowledge | Experienced adult demonstrates a real task to another → shared tools/practice area | Samples, attempts, success quality, learner skill, teacher time |

Current Stone pottery functions complement the camp checklist above:

| Function / station | Present starting point | Manual → specialist benefit | Measured limits |
|---|---|---|---|
| Clay bank survey and digging | Existing finite alluvial bank survey/extraction | A nearby resident surveys actual reachable low freshwater banks;4 clay dug in 24 work seconds and carried home | 80–160 initial units, remaining reserve, one digger, delivered/lost stock |
| Hand forming / pottery shelter | Existing hand/shelter recipes | Hearth 90 s → shelter 30 s;4 clay +2 water →4 greenware | Real paid inputs, work, travel, two shelter slots |
| Greenware drying | Existing rack/covered shelter |10 s loading then 90 effective weather seconds; shelter protects from rain | Humidity/temperature, moisture,180 wet-second damage, retained slot, physical pickup |
| Hearth firing / pottery kiln | Existing paid firing | Hearth 4 logs/90 s → kiln 2 logs/45 s/two slots |4 dried ware → vessels plus shards; recorded failures, actual delivery |
| Owned water vessel | Existing cache equipping and carrier use | Store item → owned jar with producing society/site/style;32 L/16 s versus 24 L/12 s | Stock leaves cache once, ten delivered trips, recorded wear/breakage; no duplicate storage bonus |

## Functional station roadmap: Bronze development

These stations should emerge from practical input/output chains. A stage label must not bypass prospecting, finite material supply or demonstrated practice. Present metal stock is not already a complete ore-to-ingot economy.

| Function / possible station | Present starting point | Required real dependency and specialist advantage | Useful scale / measured demand |
|---|---|---|---|
| Reed/thatch collection and roofing | Planned | Real suitable vegetation → dried bundles and replaceable roofs | Roof area, seasonal harvest, leak/wear, labor |
| Fodder cutting / hay drying | Planned | Real grass/residues → cut and dry fodder, not automatic pen feed | Herd winter demand, weather drying, usable pasture biomass |
| Hay barn / fodder shelter | Planned | Actual dry hay → protected finite volume and hauling | Feed-days, spoilage, fire risk, delivery distance |
| Sheep shearing / wool cleaning | Planned | Actual sheep, fleece growth, shears and water → usable wool | Fleece mass, season, animal welfare, cleaning losses |
| Flax retting / fibre preparation | Planned | Grown fibre crop, retting water/time and separation labor | Usable fibre, polluted water, weather, losses |
| Spindle / spinning shelter | Planned | Actual prepared wool/fibre → yarn; hand spindle before dedicated benches | Yarn per work hour, inputs, breakage |
| Loom / weaving shelter | Planned | Actual yarn → finite cloth; no clothes from generic sheep count | Cloth area, loom slots, labor, waste |
| Textile outfitter / dye place | Planned | Real cloth/thread and optional measured dyes → seasonal garments | Clothing coverage, condition, water, colorant use |
| Dairy processing place | Extend actual milk | Delivered milk and appropriate vessels/process → cheese or other preserved dairy | Milk age, conversion loss, batches, spoilage |
| Salt source / salt pans | Planned | Observed deposit or actual saline water + heat/evaporation → salt | Salinity, brine/fuel/area, weather, yield |
| Salt-curing store | Planned | Actual salt + food → finite cured batches; manual method first | Salt per food unit, curing time, quality, storage loss |
| Brewing / fermentation area | Planned | Actual grain/fruit, water, vessels and time → fermented product | Ingredient diversion from food, batch capacity, spoilage, service |
| Charcoal clamp / kiln | Planned | Actual timber, ignition and tending → charcoal with mass/energy losses | Timber cost, fuel output, elapsed cycle, fire risk |
| Prospecting / ore mine | Extend finite metal mining abstraction | Observed seam and samples → distinct ore, safe work and transport | Grade, finite reserve, extraction work, access |
| Ore crushing / sorting | Planned | Actual ore → concentrated usable feed and tailings | Recovery, waste, labor, equipment wear |
| Copper smelter / furnace | Planned | Actual ore, charcoal and heat control → copper and slag | Heat/fuel, charge size, recovery, failure, work |
| Tin supply / alloying hearth | Planned | Observed tin source or physical trade + copper → bronze | Alloy proportions, stock conservation, temperature, batch quality |
| Casting / mold workshop | Planned | Metal + real mold/crucible inputs → cast parts, sprues and losses | Reusable mold life, defects, work and fuel |
| Smith / repair forge | Extend current forge/equipment | Workable metal, fuel, tools → equipment and repair rather than free replacement | Bench time, metal lost/reused, durability restored |
| Carpenter / sled / wheelwright yard | Extend paid haulage | Actual timber/components → sleds/carts, maintained and assigned to real carriers | Equipment ownership, load, travel savings, repair cost |
| Boat landing / boatwright | Extend dock/paid vessels | Real hull materials, shore access and labor → owned launchable boat | Boat cost/work, berth/crew, condition, cargo, return rate |
| Trade stall / exchange cache | Extend actual contact trade | Meet actual partner with finite goods → physically settle an exchange | Delivered cargo, price/terms, refusals, spoilage, safe return |
| Well digging / lining / maintenance | Planned | Tested groundwater, excavation, lining and vessels → finite collected water | Sustainable yield, drawdown, quality, digging risk, upkeep |
| Dedicated builders' yard | Planned service, construction exists | Shared real tools/material staging → less fetching and coordinated work | Queue priorities, material reservations, labor, site delays |

## Functional station roadmap: Iron development

| Function / possible station | Present starting point | Required dependency and actual service | Useful scale / measurable limits |
|---|---|---|---|
| Bloomery | Planned | Iron ore, charcoal, air supply and real furnace work → bloom/slag | Recovery, fuel, cycle and refractory wear |
| Bloom consolidation / smithy | Extend forge | Actual bloom or metal stock + heat/hammering → bars/tools | Work, fuel, waste, tool quality and repairs |
| Specialist toolmaker / armorer | Extend equipment recipes | Parts, bindings, metal and skill → distinct durable equipment | Bench utilization, quality, fittings, maintenance |
| Dressed-stone yard | Planned beyond quarry | Finite blocks, suitable tools and hauling → shaped building stone | Rough-to-dressed yield, labor, load, breakage |
| Lime burning / mortar preparation | Planned | Actual limestone, fuel and water → lime/mortar with losses | Fuel, batch heat, storage damage, use before setting |
| Large bridge / road crew | Extend timber bridge | Surveyed route, grades, drainage and materials → maintained traversable network | Travel speed, road capacity, wear, repair labor |
| Watch post / alarm assembly point | Extend defense horn/tower | Real reachable defenders, owned weapons and local threat information | Response time, equipment stock, sheltering, standdown completion |
| Staffed tower / gatehouse | Extend configured towers/gates | Actual guards/ammunition/food and access → sustained service | Guard shifts, line of sight, ammunition, supply interruption |
| Garrison store / training ground | Extend barracks | Owned equipment, training time, provisions and safe rotations | Ready people, injury, fatigue, stock, actual defense coverage |
| Earthwork / ditch crew | Existing paid trench | Surveyed grade and volume, builders and access → real local terrain change | Excavated volume, work, traversability, drainage limitations |
| Defensive supply / repair yard | Planned recurring service | Actual damaged structures and material deliveries → paid repair | Damage repaired, material/labor costs, safe access |
| Pack-animal station / stable service | Extend later stables ID | Real appropriate animals, feed, water, tack and handlers | Carry capacity, condition, forage, return and mortality |
| Regional store / caravan waystation | Planned | Physically connected suppliers, shelters and finite stores | Route distance, demand, reserve, storage loss, convoy safety |
| Workshop teaching / apprenticeship | Planned complete network | Real competent teacher, learner, task and supplies → retained demonstrated skill | Attendance/work time, practice success, transfer and forgetting |

## Functional station roadmap: Classical civic society

These are Hearthwild expansion choices, beyond the official Dawn of Man period. They should earn their staffing and physical supply costs; a town should not receive a full service because a decorative structure exists.

| Function / possible institution | Existing predecessor | Functional dependency and benefit | Practical staffing / measurable limits |
|---|---|---|---|
| Organized marketplace / merchant stores | Partial market/contact exchange | Actual sellers, buyers, cargo and inventories → reliable local exchange | Part-time stalls before full-time merchants; delivered goods, queues, prices |
| Public granary / emergency distribution | Partial warehouse | Actual reserve lots, workers and distribution access → ration service | Reserve-days, people reached, hauling, spoilage and issue records |
| Water distribution / fountain | Freshwater trips; no aqueduct chain | Tested source, gradient, channels/pipes and finite cisterns → local collection points | Source yield, flow, leakage, upkeep, coverage |
| Aqueduct / channel / reservoir works | Planned | Surveyed real elevation and construction → delivered water with hydraulic constraints | Construction volume, flow, storage, breaches; not in current excavation scope |
| Public bath / washing house | Planned | Actual water, fuel, drainage and staff → scheduled hygiene service | Water/fuel per visit, capacity, cleaning and waste |
| Latrine / sewer / refuse collection | Planned | Real waste transport/drainage and safe disposal → sanitation | Coverage, pollution destination, maintenance and staff work |
| Infirmary / healer's shelter | Planned full service | Real supplies, care skill, clean water and beds → treatment | Patients/bed, consumables, care time, outcomes; no free healing aura |
| Communal kitchen / bakery service | Existing small hearth/oven batches | Larger supplied workplaces → regular delivered meals, not passive food income | Input/output balance, staff, meals delivered, spoilage |
| Council hall / records office | Partial townhall | Real representatives, records and local communication → decisions/tax accounting | Staff hours, reachable households, compliance and collection costs |
| Law / mediation / custody facility | Contextual custody exists | Actual guards, food/water, hearing and release/transfer process | Guard burden, cases, prisoner needs and time; no automatic forced labor |
| Temple / festival precinct | Partial temple/grove/cairn | Actual attendance, goods, staff and local practice → community service | Participation, costs, access and measured wellbeing |
| School / teaching workshop / library | Partial later university ID | Literate practice/materials where available, teachers and real learners | Learners per teacher, taught tasks, retained knowledge, supplies |
| Harbor / warehouse / ship repair | Partial dock/coastal trade | Real berth access, boats, cargo handling, repair materials and crews | Berths, handling time, damage, capacity, safe route knowledge |
| Regional administration / diplomatic lodging | Actual contacts/relations | Known societies, physical messengers and supported guests → sustained agreements | Message travel, obligations delivered, people/food costs |
| Stone housing / fire service | Hut/stone building predecessors | Actual masonry, roofing, water and repair → denser safe settlement | Occupancy, material volume, fire response, maintenance |
| Siege / military engineering yard | Partial defenses, not full siege chain | Actual machines, ammunition, crews and haulage → paid military capability | Assembly, transport, damage, supply, capture and repair |

## Later expansion: preserve the dependency chain

| Later function | Existing predecessor | Missing practical chain, rather than a building-name unlock |
|---|---|---|
| Watermill / windmill | Hand grinding and grinding stone | Actual suitable flow/wind, drive machinery, grain supply, maintenance and weather-limited throughput |
| Advanced pottery / roof tile / brick kiln | Real pottery vessels; advanced ceramic construction remains planned | Real clay/fuel and drying/firing batches, damaged ware, finite transport and construction consumption |
| Steel / advanced metallurgy | Current forge abstraction | Carbon/heat control, real feedstock/fuel, measured failure and quality; no steel conjured from an age label |
| Mounted stable / saddler / farrier | Existing stables ID | Real horses, breeding, feed, tack/horseshoes, handlers, veterinary care and remount availability |
| Castle / siegeworks / moat engineering | Keep, walls and legacy moat | Actual staffed supplies, repair, excavation and water engineering; siege machinery and logistics |
| Specialist guild / workshop cluster | Crafting shelter and practical knowledge | Actual skilled practitioners, teaching, tools and paid production; no passive research-point mint |
| Paper / ink / printing / records | Planned teaching/record service | Actual fibre/pulp, ink, presses or copying work, physical books and distribution |
| University / advanced teaching | Registered university | Real teachers, learners, subjects demonstrated in practice, teaching space and supply costs |
| Larger sailing ship / shipyard | Paid small boats/coastal voyages | Finite hull/rigging/sail materials, deeper launch access, crews, navigation, repair and cargo handling |
| Civil engineering / surveying | Real terrain and construction | Actual survey knowledge, graded routes, drainage, materials and work; no automatic flat foundations |

## Dependencies, useful adoption and tuning

A coherent small-camp sequence is: observe a need → collect real samples/materials → try the manual task → produce a useful result → repeat it reliably → adopt a faster station when saved time or reduced losses pays its cost. Population alone neither demonstrates a technique nor supplies its materials. Existing practical crop trials, copper study, equipment practice and processing results provide real starting points; the full teaching network remains incomplete.

For every proposed station, implementation should expose: input quantities and provenance; worker/slot ownership; travel and delivery; active work and elapsed exposure; weather/season limits; fuel/water; output quality/quantity; spoilage/waste; capacity; repair/wear; interruption/death/replacement; saved state; current blocked reason. Service buildings additionally need actual people reached, operating inputs and staff time. These are tuning variables and diagnostics, not all currently implemented metrics.

Prioritize small connected cohorts rather than dozens of decorative IDs:

1. Extend portable shelter, bindings and container capacity around the real mobile camp and manual tools.
2. Complete harvested-grain separation, specialized storage and pottery extensions around existing flour/bread/preservation and fired water vessels.
3. Complete animal species, winter fodder, fibre and cloth around existing goat care and worn garments.
4. Split ore, fuel, smelting and alloying around current metal equipment; retain useful simple hand methods.
5. Add supplied roads/harbors, civic services and practical teaching only when real settlements can sustain their labor.

### In-game catalogue representation

The in-game catalogue keeps 25 broad role groups and 90 grouped station entries, with search and era/implementation filters. Station entries contain purpose, stage, status, manual predecessor, dependencies, staffing guidance and useful capacity/demand measures. Actual command/readiness providers remain in the registered-structure and recipe views; station metadata itself creates no action or goods. Guidance describes a bottleneck and a suggested organization; it does not hard-lock a station by population.

Only registered, actually usable structures get a build action. Only actual recipes get a processing action with authoritative costs and blocked reasons. Planned stations remain visibly planned; a group with one implemented recipe cannot claim its entire production chain works. Queue editing, repeated batches and builder priorities must use their real executor contracts when implemented, never a catalogue-only simulated completion.

## Source and verification notes

Registry/cost/stage/work data: `src/game/constants.ts`. Actual processing recipes/slots: `src/game/production.ts`; weather curing: `src/game/foodPreservation.ts`; food lots/spoilage: `src/game/pantry.ts`; functional grouping: `src/game/productionCatalog.ts`. Equipment bench behavior is separate from processing slots. Runtime commands override display-only hints where dynamic costs or incomplete legacy descriptions differ.

Reference counts were extracted directly from `BUILDINGS`, `BUILD_ORDER`, `PRODUCTION_RECIPES` and `PRODUCTION_ROLES`: **36 / 36 / 23 / 25**. These counts and roadmap rows do not claim browser acceptance, historical accuracy, completion of the master plan or functionality for planned stations. Implementation qualification remains the relevant physical scenario, persistence, conservation and UI checks.

Official reference sources: [Madruga Dawn of Man overview](https://www.madrugaworks.com/dawnofman/), [Madruga Dawn of Man FAQ](https://dawnofman.madrugaworks.com/faq.php), and [developer-published Steam overview](https://store.steampowered.com/app/858810/Dawn_of_Man/). The dependency/size recommendations and later-era roadmap above are authored Hearthwild design proposals.

## Scalable pasture update (2026-11-01)

Animal pens now use dragged10–30m dimensions, perimeter-priced fences and paid extensions. Real usable area limits new animals (48/pen maximum); actual captured herds consume finite seasonal grass and physically delivered plant feed. Winter regrowth is zero. One keeper slot per8animals, actual care/feed travel, native identity and conserved overflow are measured. The natural12×10 qualification enclosure held one captured goat in nine eligible places,99m² usable pasture and120 feed capacity. Existing animals are retained if conditions reduce capacity. Other livestock species and dedicated grazing-depletion surface visuals remain planned.
