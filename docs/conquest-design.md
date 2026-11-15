# Conquest, surrender and peace (design and shipped slice)

Conquest is earned in the field, never by planting a flag. It builds on the existing natural-capitulation system
(`src/game/capitulation.ts`); `src/game/conquest.ts` adds the player's choice about the town and its people.

## 1. When a town offers to surrender
A front opens when an armed hostile party stands inside a community (55 m of its hall). Each second the front measures:

| Factor | Measured from |
|---|---|
| Superiority | present attackers' strength / defenders' strength (civilians count 0.25). Needs ratio >= 1.5 |
| Casualties | residents dead or taken, share of the community |
| Morale | armed defenders lost since the front opened |
| Buildings | share of buildings lost, and damage to the hall |
| Supplies | seconds the society has been starving (reserve < 60 s) |
| Relief | no friendly armed relief within 150 m (unrelieved seconds) |
| Siege / occupation | seconds besieged, seconds the hall was held |

`score` (weighted sum, 0..1) must reach the community's `threshold` (0.5 x its boldness; each refusal raises it by 0.15), after at
least 20 s of pressure and while the ratio holds. Then the front becomes `capitulated`: the defenders lay down arms and the
player has 180 s, with the force still present, to answer. The UI shows "their will left" = 1 - score/threshold. Leaving voids the
offer; declining hardens them.

## 2. Player choices (`acceptConquest`)
States: `pressed -> capitulated -> accepted | expired | relieved`.

* **Annex**: the town's buildings and people join the player (existing intact handover). Society-wide stores (food, wood, stone,
  copper, iron, weapons) move in proportion to the people who joined (all of it when no other town of that society remains).
* **Puppet**: the town keeps people and buildings, truce, tribute while the garrison holds (existing domination, 'puppet' terms).
* **Pillage**: carried goods only (existing 'loot'); nothing is taken over.

People policy (annex only): **integrate** (default, warriors are disarmed and stand down), **execute** (armed adults die, civilians
and children join), **spare** (everyone joins, adults carry a `rebel` mark).

## 3. Rebellion
Spared adults roll once per second, deterministic from game time: 1/1500 per rebel per second (about 4 % a minute each). When the roll
hits, every rebel of that tribe takes up arms as raiders (team 3) and a banner reports it. Integrated people never rebel.

## 4. Captives and names
Every person joined by annexation gets `originTribe={name,gen:0}`; `personName()` shows "Name (Tribe)". Their children
born in the village inherit `gen:1` and keep the suffix; grandchildren do not. Saved as an optional unit field, validated in
`persistence.ts`; old saves load unchanged.

## 5. Raids that stay and fight
Raiders sent by the player remain until the raided people are beaten or the player gives any order: no standing down while a visible
person of the raided society is within 45 m, no loot trips while one is within 60 m, wounded raiders do not flee to shelter, and any
armed adult with a foe within 20 m keeps fighting however hurt (`engagedFighter`). Raid reports classify a heavy defender loss with few
raider losses as `overrun`, not `repelled`.

## 6. Formations
Only trained groups (3/4 soldiers or drilled militia) form up; raiding parties, units on a raid and groups with an enemy within 50 m at
night do not (`mayFormUp`).

## 7. Peace
The neighbour card and the minimap chip both read the held diplomatic report (the minimap's source), so they cannot disagree.
Hostile neighbours show **Offer peace**; an incoming offer shows **Accept / Decline** (`propose-peace`, `accept-peace`,
`decline-peace` owner commands). The raid card carries the surrender buttons (Annex / Puppet / Pillage / Decline) and the neighbour
card shows their will while it still holds.
