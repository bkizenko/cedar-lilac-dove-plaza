# Building functions — October 31, 2026

Generated from the current working BUILDINGS, BUILD_ORDER, recipe and grouped-role exports for this reviewable batch. Source and focused tests do not by themselves establish publication or full campaign acceptance. There are **33 registered building IDs**, **33 player-menu structure entries**, and **25 grouped role descriptions**. A role is not an extra building or a full-time profession. Registered structures still require their actual age, placement, materials and construction. Registry presence does not claim the entire related production chain or later civic simulation is complete.

## Current registered structures

Base costs and work below exclude plot/span scaling and player-specific discounts or tower preferences. The first player hall can be free; farm drawings use seeds. Final site commands remain authoritative. Craft benches and processing slots are separate systems. Each processing batch uses one actual adult to carry, work and deliver; outgoing carriers release their processing slot.

|ID|Name / stage|Player menu|Base cost / construction work|Actual work capacity|Current function or registry limitation|
|---|---|---|---|---|---|
|palisade|Palisade / Stone|Yes|6 logs / 12s base work|No dedicated processing slots|Place adjacent 4m sections to block raiders. Leave a gate for workers.|
|gate|Timber gate / Stone|Yes|12 logs / 18s base work|No dedicated processing slots|Open in peacetime; automatically closes when an enemy approaches. Select to lock or open. Anyone can pass an open gate.|
|stonewall|Stone wall / Iron|Yes|12 stone / 24s base work|No dedicated processing slots|Strong 4m defensive section. Raiders must break through or find a gap.|
|trench|Defensive trench / Stone|Yes|Labor only / 18s base work|No dedicated processing slots|Dig an earthwork: crossing takes twice as long for everyone. Leave clear approaches for workers.|
|moat|Flooded moat / Medieval|Yes|4 logs + 4 stone / 30s base work|No dedicated processing slots|Medieval water-fed earthwork near a shore or river. Crossing is four times slower. Leave a dry gate approach.|
|grindingStone|Grinding stone / Stone|Yes|2 logs + 6 stone / 12s base work|1 processing slots|Grind actual harvested grain into flour in 24 work seconds instead of 60 at a hearth. One staffed station; no passive flour.|
|oven|Stone bread oven / Stone|Yes|8 logs + 8 stone / 18s base work|2 processing slots|Bake delivered flour with real water and fuel. Two staffed batches, 24 work seconds each instead of 45 at a hearth.|
|hearth|Cooking hearth / Stone|Yes|4 logs + 4 stone / 10s base work|1 processing slots|Cook delivered raw meat with actual logs. New hunting catches then enter the raw-food processing chain.|
|butcher|Butcher and skin yard / Stone|Yes|6 logs + 2 stone / 12s base work|1 processing slots|Clean actual animal hides and extract tannin from delivered bark-bearing logs and collected water.|
|dryrack|Skin drying rack / Stone|Yes|4 logs / 10s base work|2 processing slots|Two finite drying slots for cleaned skins. Requires real tending work; an empty rack produces nothing.|
|tanner|Tanning yard / Stone|Yes|8 logs + 2 stone / 14s base work|1 processing slots|Tan cleaned hides using actual bark tannin, collected water and worker time.|
|tailor|Skin sewing shelter / Stone|Yes|8 logs / 12s base work|1 processing slots|Sew real dried skins or leather with a bone needle. Finished clothes must be delivered and worn.|
|townhall|Town Hall / Stone|Yes|20 logs / 16s base work|1 equipment benches|The first hearth is free. Additional halls cost 40, 60, 80, then 100 logs, including planned halls. They need construction labor and room beyond existing villages. Frontier outposts extend your claim; residents must defend them.|
|cornerstone|Frontier outpost / Stone|Yes|70 logs / 12s base work|No dedicated processing slots|Claims explored ground and serves as a local delivery point. Additional or distant claims need more armed guards; rival frontiers can provoke disputes.|
|hut|Hut / Stone|Yes|40 logs / 8s base work|No dedicated processing slots|Raises population cap by 5.|
|farm|Farm / Stone|Yes|4 seeds / 10s base work|No dedicated processing slots|Sow in spring, tend in summer, harvest in autumn. Base full yield: 260 food/year, adjusted by soil and habitat. See Village (L).|
|lumber|Lumber Camp / Stone|Yes|16 logs / 10s base work|No dedicated processing slots|Optional workplace: nearby cutting takes 42% less time. Known trees can be cut without it. Spent stands return most of the timber.|
|workshop|Crafting shelter / Stone|Yes|18 logs + 2 stone / 14s base work|3 equipment benches|Three shared benches instead of one at a hall, 25% faster hands-on work, and shorter simple-equipment recipes. Practical copper trials also need this shelter.|
|quarry|Quarry / Stone|Yes|18 logs / 12s base work|No dedicated processing slots|A 32m work area covers nearby stone outcrops. Two miners haul finite surface stone or excavate a finite mountain seam; each site has a different yield.|
|dock|Fishing Dock / Stone|Yes|40 logs / 10s base work|1 equipment benches|Two fishers work finite nearby fishing grounds. No food without labor; depleted grounds need time to recover.|
|bridge|Timber bridge / Stone|Yes|32 logs + 4 stone / 40s base work|No dedicated processing slots|Span a narrow shallow river between two gentle banks. Builders work from your bank; people and cargo cross only after completion.|
|warehouse|Storehouse / Stone|Yes|60 logs / 12s base work|No dedicated processing slots|Shelters 200 food. Adults can dry and smoke surplus food here using timber above the next age reserve. Also shortens carrying trips.|
|barracks|Barracks / Stone|Yes|40 logs / 12s base work|2 equipment benches|Arm existing adults from the Bronze Age. Early villagers hunt and defend without a separate profession.|
|forge|Forge / Bronze|Yes|70 logs + 60 stone + 10 copper / 24s base work|2 equipment benches|Copper becomes bronze blades. Iron becomes steel. Speeds metal work nearby.|
|watchtower|Watchtower / Iron|Yes|60 logs + 50 stone / 16s base work|No dedicated processing slots|Fires on enemies in range.|
|temple|Temple / Classical|Yes|40 food + 60 logs + 120 stone / 28s base work|No dedicated processing slots|Faith and order. +8 population.|
|market|Market / Classical|Yes|90 logs + 40 stone / 22s base work|No dedicated processing slots|Traders. Gatherers work 12% faster.|
|keep|Keep / Medieval|Yes|80 logs + 160 stone + 12 iron / 36s base work|No dedicated processing slots|Stone stronghold. +6 population.|
|pen|Animal pen / Stone|Yes|18 logs / 16s base work|No dedicated processing slots|Capture wild goats and lead them home. Up to 8 animals; a keeper brings winter feed, milks females, and cares for breeding pairs.|
|stables|Stables / Medieval|Yes|40 food + 100 logs + 40 stone / 28s base work|No dedicated processing slots|Train cavalry.|
|university|University / Renaissance|Yes|80 food + 140 logs + 160 stone / 32s base work|No dedicated processing slots|Learning. +10 population.|
|cairn|Stone Cairn / Stone|Yes|20 logs + 40 stone / 18s base work|No dedicated processing slots|A stone landmark that strengthens local influence.|
|grove|Sacred grove / Stone|Yes|36 logs / 16s base work|No dedicated processing slots|A sacred gathering place that strengthens local influence.|

## Physical processing recipes

Grain is removed from the real edible grain lot; flour is a separate material item; bread returns as edible bread only after delivery. Four grain become four flour and then four bread: there is no stock-yield multiplication. The approved bread balance gives20% more meal nourishment per physical food unit, at real grinding/water/fuel/labor costs. Practice and workplace efficiency change actual effort; base seconds are not a promised arrival time.

|Recipe|Workplace|Inputs|Delivered outputs|Base work / slots|
|---|---|---|---|---|
|Cook meat|Cooking hearth|4 raw meat + 1 logs|4 edible meat|20s / 1|
|Flesh and clean a hide|Butcher and skin yard|1 raw hides|1 cleaned hides|20s / 1|
|Extract bark tannin|Butcher and skin yard|1 logs + 2 L water|2 bark tannin|20s / 1|
|Dry a cleaned skin|Skin drying rack|1 cleaned hides|1 dried skins|60s / 2|
|Tan a hide|Tanning yard|1 cleaned hides + 1 bark tannin + 2 L water|1 leather|90s / 1|
|Sew skin clothing|Skin sewing shelter|2 dried skins + 1 bones|1 skin clothing|45s / 1|
|Sew leather clothing|Skin sewing shelter|2 leather + 1 bones|1 leather clothing|60s / 1|
|Hand-grind grain|Cooking hearth|4 grain|4 flour|60s / 1|
|Grind grain at a stone|Grinding stone|4 grain|4 flour|24s / 1|
|Bake hearth bread|Cooking hearth|4 flour + 1 logs + 2 L water|4 edible bread|45s / 1|
|Bake oven bread|Stone bread oven|4 flour + 1 logs + 2 L water|4 edible bread|24s / 2|

The communal hearth is the manual fallback:60s to hand-grind four grain,45s to bake four bread. The grinding stone reduces grinding to24s; the stone bread oven reduces baking to24s and offers two slots. The early crafter has three equipment benches and a25% hands-on workplace advantage over the single civic bench; this does not grant free equipment or erase travel.

## Grouped roles: current foundation and remaining work

“Partial” means listed physical work exists while the explicit gap remains. “Planned” means the named production chain is not implemented, even if a related structure exists. No planned role grants a fake build/production action.

|Role|Stage|Status / registered IDs|Purpose|Inputs → outputs|Work / capacity|Remaining boundary|
|---|---|---|---|---|---|---|
|Huts and early tents|Stone|partial / hut|Shelter residents before winter|logs; covering for future tents → housing and local shelter|Physical construction; future household upkeep / Existing hut: five population places|Existing hut works; distinct tents, assigned beds and household heating remain future work.|
|Communal hearth and cooking|Stone|partial / hearth|Cook food and prepare grain at a shared camp workplace|actual raw meat, grain or flour; logs and water where the recipe requires → edible meat or bread; flour|Actual staffed batches; fuel must be spent once / Finite workplace slots; recipe-specific batches|Cooking batches consume real raw meat and logs. Dedicated hearth warmth/ignition/tending beyond existing survival fire remains separate.|
|Early crafter|Stone|working / workshop|Make useful equipment at a physical bench|logs; stone; metal where required → weapons; farm tools; haulage equipment|Paid recipes; actual worker arrival, strength and practice / Three shared benches per completed shelter|Separate bone, binding, hide and advanced repair recipes remain incomplete.|
|Butcher place|Stone|partial / butcher|Clean delivered hides and extract bark tannin|raw hides or bark-bearing logs; water for tannin extraction → clean hides; bark tannin|Paid preparation batches with real carried inputs and delivered outputs / Finite work slots and carcass supply|Hunters provide actual raw meat, hides and bones. Dedicated carcass portions, knives and yard butchery remain incomplete.|
|Meat and fish drying|Stone|planned / dryrack|Preserve loaded raw food|raw meat or fish; loading labor → dried food|Loading plus actual drying exposure / Finite drying slots|Needs measured moisture, spoilage, batch occupancy and conserved input.|
|Hide drying rack|Stone|partial / dryrack|Dry cleaned skins for clothing|clean hides from the butcher place; hands-on drying work → dried skins|Current staffed drying batch; passive weather exposure remains planned / Finite loaded hides|Current drying is a60-second staffed batch. Weather-dependent moisture/exposure remains future work; one skin cannot also feed tanning.|
|Tanning work area|Stone|partial / tanner|Turn actual hides into leather|clean hide; extracted bark tannin; water → leather|Staffed preparation and processing / Finite slots and paid batches|Current tannin extraction consumes a delivered log and water. Separate observed plant species, vats and curing exposure remain incomplete.|
|Outfitter and tailor|Stone|partial / tailor|Make and equip season-appropriate garments|dried skins or leather; bindings; later cloth → skin clothing; later textile garments|Tailor labor, delivery and equipping / Finite benches; garments worn by actual people|Current recipes produce skin/leather garments with actual inventory and equipping. Wool/cloth, bindings and hot-weather clothing remain incomplete.|
|Pasture and shepherd|Stone|partial / pen|Keep captured animals on actual usable land|captured livestock; grazing; water; winter feed → healthy herd; milk where biological conditions permit|Keeper/shepherd time; actual feeding / Area, species and seasonal carrying capacity|Existing goat pen and keeper work; full pasture ecology and species diversity remain incomplete.|
|Fodder shelter|Bronze|planned / No dedicated registered workplace|Save fodder for cold seasons|cut grass or crop residues; drying and hauling → stored hay|Cut, dry, carry and store / Finite volume and animal demand|No automatic animal feed from a building name.|
|Well and reliable water|Bronze|planned / No dedicated registered workplace|Reach a measured potable groundwater source|tested site; digging and supports; vessels → collected water|Excavation, maintenance and collection / Actual refill/yield and storage|Current freshwater collection remains valid; wells cannot create infinite water anywhere.|
|Granary and protected stores|Stone|partial / warehouse|Protect actual delivered crops|grain/pulses; containers; care labor → protected food lots|Hauling and recurring store care / Existing store capacity; specialized bins future|Existing generic storage/care works; grain-specific pests, containers and bins remain incomplete.|
|Grinding place|Stone|partial / hearth, grindingStone|Prepare grain for cooking|grain; grinding stone → flour|Physical grinding labor; tool wear remains planned / One maker per batch; finite grinding slots|Hand grinding at a hearth and a faster grinding stone consume actual grain to make flour. Tool wear remains future work.|
|Oven and bakery|Stone|partial / hearth, oven|Bake supplied batches|flour; water; fuel → bread|Loading, heating, baking and unloading / Finite oven batches|Hearth and oven batches consume delivered flour, water and fuel. The oven has faster work and two slots; no passive bread income.|
|Spinning and weaving|Bronze|planned / No dedicated registered workplace|Make yarn and cloth|actual sheep wool or grown/retted fibre → yarn; cloth|Spinning and weaving labor / Finite loom/work slots|Existing goats do not produce free wool.|
|Charcoal kiln|Bronze|planned / No dedicated registered workplace|Transform delivered timber into furnace fuel|logs; ignition and tending → charcoal; conversion losses|Load, tend, carbonize and unload / Finite kiln batch|Charcoal cannot duplicate logs already burned for warmth.|
|Smelting furnace|Bronze|planned / No dedicated registered workplace|Refine ore using real heat and inputs|ore; fuel; recipe-specific alloy/flux inputs → ingots; slag|Furnace labor and fuelled heating / Finite furnace batches|Current copper/iron stocks abstract workable metal; ore-to-ingot and bronze alloying remain gaps.|
|Forge and smith|Bronze|partial / forge|Make and maintain metal tools|metal stock; logs/fuel → tools; weapons; future repairs|Actual equipment recipes and benches / Shared crafting capacity|Current metal equipment works; distinct ingots, heat and maintenance chains remain incomplete.|
|Clay, pottery and firing|Bronze|planned / No dedicated registered workplace|Make useful village containers|finite clay; water; fuel → fired vessels; tiles; failed ware|Extract, shape, dry, fire and deliver / Finite drying/firing batches|No clay/ware inventory or pottery production exists yet.|
|Dairy preservation|Bronze|partial / pen|Preserve milk from actual livestock|actually milked milk; processing inputs → cheese or other preserved dairy|Keeper plus processing labor / Actual lactation and batch capacity|Milk delivery exists; cheesemaking chain remains planned.|
|Smoking and salt curing|Iron|planned / No dedicated registered workplace|Preserve actual meat or fish|raw meat/fish; logs or actual salt → smoked/salted food|Load, cure, tend and unload / Finite chamber batches|Store-care protection is not a smoked-food conversion.|
|Stoneworking and supplied defenses|Iron|partial / quarry, stonewall, watchtower, barracks|Build and supply durable defenses|finite quarried stone; logs; ammunition; repair inputs → structures; staffed defensive service|Mine, dress, haul, build, guard and maintain / Physical miners, builders and guards|Existing extraction/walls/guards work; dressed stone, full ammunition and repair chains remain incomplete.|
|Classical civic services|Classical|partial / market, temple, townhall|Supply trade, administration and community services|actual surplus; staff time; transport; water/fuel as required → measured service coverage|Staffed service and physical exchange / Actual workers, storage and routes|Existing civic effects are partial; full staffed service chains remain roadmap work.|
|Medieval institutions|Medieval|partial / keep, moat, stables|Preserve later fortified and mounted development|materials; horses; feed; equipment → fortification; mounted service|Construction and supplied staffing / Actual garrison and animal capacity|Existing IDs retained; full horses, feed, tack, siege and hydraulics remain incomplete.|
|Renaissance teaching and workshops|Renaissance|partial / university|Preserve later teaching and advanced workshops|skilled teachers; supplies; staff time → demonstrated taught practice|Staffed practical teaching / Teacher and workshop capacity|Existing university retained; complete staffed teaching network remains future work.|

Storage is shared village inventory, not private physical bins in each storehouse. Food capacity is an overflow-spoilage threshold; material-item capacity is a separate delivered-item limit. Carried goods, paid processing inputs, finished batches awaiting delivery and worn clothing are reported separately. The selected-site queue lists real saved projects and bench/slot reservations; it does not manufacture future orders from catalogue entries.
