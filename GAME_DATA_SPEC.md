# Game data contract

Current authoritative values: src/game/constants.ts BUILDINGS, UNITS, AGE_COST, AGE_CHOICES, GATHER, BUILD_TIME. Do not duplicate balances into UI or docs as a second mutable source. Inventory resource IDs: food/wood/stone/copper/iron; weapon stock spear/bow/blade. Costs are nonnegative, affordable before mutation and deducted once. Training reserves population including queue entries.

Building definition: id, label, footprint {w,d}, hp, cost, age, prerequisites[], buildSeconds, production[], storage, housing, vision, siteRule. Unit: id, hp, speed, radius, range, damage, cooldown, armorClass, armor, bonuses, cost, trainSeconds, population, vision, rig, equipment. Technology: id, age, prerequisites[], exclusiveGroup?, cost, researchSeconds, effects[]. Effect is typed multiplier/addition/unlock; application is derived from researched IDs and base definition, idempotent across reloads.

Validate definitions: unique IDs, finite positive stats, valid references, acyclic tech graph, every playable ID has render fallback and label. Keep existing IDs while prehistoric campaign content is curated. Save migrations map IDs, not array indexes. Resource nodes keep amount/max/regen/rich plus ID and transform. Navigation and hit testing use the same footprints/radii.
