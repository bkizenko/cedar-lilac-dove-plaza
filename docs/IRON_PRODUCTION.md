# Iron: finite ore, solid bloom and usable metal

This is a bounded extension of the existing paid production executor, not a complete metallurgy gate. Existing usable iron, loaded legacy iron and paid tool jobs retain their units. No deposit generation, tin, bronze alloying, steel or new Iron Age unlock is added.

The owner opens **Knowledge → Iron ore, bloom and usable iron → Use iron ore processing** after observing a remaining iron deposit with a land route to a completed forge. Adoption changes future extraction only. The existing extraction and Iron Age tool access rules remain in force. A new ore packet must be carried back to a real communal cache.

The completed forge exposes two paid recipes, also reachable from Knowledge:

| Task | Inputs | Delivered result | Base staffed work |
|---|---|---|---|
| Reduce ore to a solid bloom | 8 iron ore + 4 charcoal | 4 unconsolidated bloom | 120 seconds |
| Heat and consolidate bloom | 4 bloom + 1 charcoal | 4 usable iron | 60 seconds |

These are explicit game-unit/time tuning values in `IRON_METALLURGY_RULES`, not kilograms, measured temperatures or archaeological yield claims. The existing forge model represents its smelting hearth and smithy; a distinct bloomery building, furnace airflow/temperature/lining wear and slag recovery are not implemented. Historic England describes charcoal-fired bloomery reduction as producing a solid, forgeable bloom rather than molten iron: [Archaeometallurgy: Guidelines for Best Practice, §3.2](https://historicengland.org.uk/images-books/publications/archaeometallurgy-guidelines-best-practice/heag003-archaeometallurgy-guidelines/).

Each forge has one production slot for these batches. Existing equipment benches keep their existing separate contract. A batch pays its inputs once, reserves its real actor/workplace, travels and works through the ordinary executor, then physically returns its output. Shared project pause/unload/replacement and strict save restoration apply. Burden reads the original paid packet; it does not create another inventory. Mined loose ore follows the existing finite death-parcel and physical recovery path. Site-held paid work follows the existing project-loss/reassignment rules, rather than duplicating its materials into a parcel.

Bloom is stored as an item. Delivered `ironMetal` credits only the existing usable-iron treasury; there is no second metal stock. Existing Iron Age farming tools still cost 4 iron and 3 logs, equip one adult, improve real farming work, wear through use and require paid repair. No prototype bypass of the era requirement is introduced.

Native qualification and matching built publication remain required. NPC automatic iron adoption, ore/bloom trade pricing, full alloy/weapon chains and the wider all-executor ownership gate are outside this batch.
