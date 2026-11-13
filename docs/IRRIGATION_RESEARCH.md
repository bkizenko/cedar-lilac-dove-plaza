# Irrigation research for Hearthwild fields (2026-11-12)

## BLUF

Historically, water management was a labour-and-timing problem, not a "water on/off" switch. Four things carry into the game model:

1. **Gravity ditches and flooded basins came first and cost labour to build and keep up.** Canal irrigation at Choga Mami (Iraq) is dated to about 6000 BCE; surface methods (furrow, border strip, basin) are the oldest form ([Wikipedia: Irrigation](https://en.wikipedia.org/wiki/Irrigation)).
2. **Lifting water is a separate, later, labour-heavy step.** The shaduf is a pole-and-counterweight lift, 1-6 m range, one person lifting roughly 39-130 L/min in one Chad study ([Wikipedia: Shadoof](https://en.wikipedia.org/wiki/Shadoof)). The noria (pot wheel) is described as in use among Roman settlers in North Africa, with valved pots by 150 BCE ([Wikipedia: Irrigation](https://en.wikipedia.org/wiki/Irrigation)).
3. **Flood-recession (basin) farming ties yield to the flood, so a bad year is a famine year.** Small floods left upper basins unfilled; large floods broke dykes and canals ([Wikipedia: Flooding of the Nile](https://en.wikipedia.org/wiki/Flooding_of_the_Nile)). Irrigation that is dug and managed buffers this; it does not remove it.
4. **Over-watering has a cost.** Raised water tables cause salinity ([Wikipedia: Irrigation](https://en.wikipedia.org/wiki/Irrigation)). The game keeps this out of the first model (see "Not modelled").

## What the sources say

### Basin irrigation and flood-recession farming (Egypt)
- Land was split into large fields enclosed by dams and levees, with intake and exit canals. Each basin was flooded, then closed for about 45 days so silt settled and soil took up moisture; water was then released downslope or back to the river ([Flooding of the Nile](https://en.wikipedia.org/wiki/Flooding_of_the_Nile)).
- Sowing began right after drainage; harvest came three to four months later; the dry season after that allowed no farming ([same](https://en.wikipedia.org/wiki/Flooding_of_the_Nile)).
- Annual silt sustained fertility; salinisation did not occur because the summer water table stayed deep and the next flood flushed salts ([same](https://en.wikipedia.org/wiki/Flooding_of_the_Nile)).
- Around 1800 BCE the Faiyum's natural lake was used as a reservoir to hold floodwater for dry seasons ([Irrigation](https://en.wikipedia.org/wiki/Irrigation)).
- Perennial irrigation (barrages, year-round water, two to three harvests a year) replaced basin irrigation only from the 1800s ([Flooding of the Nile](https://en.wikipedia.org/wiki/Flooding_of_the_Nile)).

### Rain-fed versus irrigated
- Irrigation can supplement rainfall (common in rain-fed farming) or be the main water source (mainly arid areas) ([Irrigation](https://en.wikipedia.org/wiki/Irrigation)). In the game: rain-fed is the default; irrigation is a bonus and a drought buffer, and only becomes essential if a later arid biome rule is added.

### Mesopotamia and Persia
- Farmers there used irrigation from at least the third millennium BCE and developed perennial irrigation by moving water through a matrix of small field channels ([Irrigation](https://en.wikipedia.org/wiki/Irrigation)).
- Qanats: a gently sloping tunnel from a "mother well" on an aquifer, with shafts for spoil and air; water flows by gravity to an exit and then to shareholders' fields. About 50,000 are reported in 40+ countries; mother wells 18-300 m deep; ownership is separate from land and run by a communal council ([UNESCO nomination](https://whc.unesco.org/document/152821)). Dated from the early first millennium BCE (Assyrian inscription of Sargon II, 714 BCE) ([same](https://whc.unesco.org/document/152821)).

### Shaduf
- Earliest evidence: a seal of about 2200 BCE, possibly under Sargon of Akkad; Egyptian use later (a disputed 18th Dynasty or about 1250 BCE tomb drawings) ([Shadoof](https://en.wikipedia.org/wiki/Shadoof)).
- A pole pivots about one-fifth along its length; bucket on the long end, clay or stone counterweight on the short end; water is tipped into runnels or ditches ([same](https://en.wikipedia.org/wiki/Shadoof)).

### Water meadows (medieval to early modern England)
- River water diverted by a weir and sluices into a main carrier, then narrower channels over ridges, spreading as a film of no more than 25 mm; drains between ridges returned it to a tail drain ([Historic England](https://historicengland.org.uk/images-books/publications/iha-water-meadows/heag237-water-meadows)).
- Winter flooding cut frost damage and gave an early bite for sheep; summer flooding raised moisture and the hay crop; silt added nutrients ([same](https://historicengland.org.uk/images-books/publications/iha-water-meadows/heag237-water-meadows)).
- Simple floating from at least the medieval period; full bedworks in the 17th century (Dorset, 1605); about 100,000 acres by 1850; mostly abandoned 1918-1960 ([same](https://historicengland.org.uk/images-books/publications/iha-water-meadows/heag237-water-meadows)).
- Contour "catchworks" on slopes ran water along a gutter at the top and let it overflow down the hillside, repeated lower down ([same](https://historicengland.org.uk/images-books/publications/iha-water-meadows/heag237-water-meadows)). This is the historical model for "fields follow contours on slopes".

### Terraces
- Terraced rice fields used dikes to control the water level in each field ([Irrigation](https://en.wikipedia.org/wiki/Irrigation)). Stone retaining walls, erosion control and maintenance burden of terraces: [UNVERIFIED] (the Terrace (agriculture) page was not retrievable in this session).

### Noria
- The noria is a water wheel with clay pots, said to come into use at about the same time as qanats (the page dates qanats to about 800 BCE) among Roman settlers in North Africa, with valved pots by 150 BCE; the page's dating looks loose, so treat the start date as uncertain ([Irrigation](https://en.wikipedia.org/wiki/Irrigation)). That the wheel is turned by stream current without animals, typical lift height and output: [UNVERIFIED] (Noria page not retrievable).

## [UNVERIFIED] / not fetched
- Terrace construction and upkeep details, noria mechanics and capacity, Mesopotamian flood timing mismatch with the crop calendar, seeder-plough and ditch-maintenance labour records. Treat any numbers in the game for these as design values, not history.
- All game numbers below (cost, bonus size) are design choices tuned for play, not sourced figures.

## How the model uses this (see `src/game/irrigation.ts`)

| History | Game rule |
|---|---|
| Gravity ditch from a river or lake, labour to dig and clear silt | Player-dug ditch segments cost labour (logs not needed) and wear down slowly; blocked ditches lose reach |
| Basin: water stays on the field, then drains | A plot touching water or a connected ditch is "wet" and gets a moisture floor |
| Shaduf lifts 1-6 m by hand | Early lift building: raises reach by up to ~3 m of height, costs a worker slot and wood |
| Noria / water wheel | Later lift: greater head, no worker slot, costs more wood and a tool upkeep |
| Small flood = hunger | Irrigated plots resist drought by a fixed factor; they are not immune |
| Salinity from over-watering | Not modelled in v1 |

## Not modelled in v1
Qanats and aquifers, water meadows as a distinct land type, salinisation, flood pulses, shared-water disputes.
