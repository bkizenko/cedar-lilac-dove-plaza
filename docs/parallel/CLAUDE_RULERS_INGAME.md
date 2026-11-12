# Rulers, houses and kinship: how it shows up in the game

**BLUF:** Everything is pure data in `src/game/` (rulers, polity, houses, dynasty, ties, eras, glory, fame, unrest, playerLine, civGenerator, rulersState). It reaches the player through six surfaces and is gated by polity complexity, so a forager band never sees claims or regents. The player always commands their own civ; only the face of the ruler changes. Merge status: all rulers files are additions; the patch applies cleanly onto main, grok-prestige, grok-world and sim-worker with no name clashes, and tests pass on main plus the patch.

## 1. Where the player sees it
1. **Council / dossier panel** (one button on the existing society UI): ruler portrait data, top 3 traits in words (not numbers), the one contradiction line, what they want (ambitions), house motto, living family tree with ages.
2. **Handover card** (on succession): `playerLine.handover()` gives the headline, up to four trait shifts and how each faction reacts. The player sees why things feel different.
3. **Factions strip**: internal rule per polity form (kin, warriors, priests, elders, merchants, landholders, commons, assembly), each with loyalty and its stated demand. Unrest stages (calm, grumbling, agitation, plots, uprising, civil war) show the counter-action.
4. **Diplomacy sheet**: for each known society, bond word (acquainted, friendly, close kin, blood-bound, estranged, blood-feud), and a "what this union means" list from `ties.implications()`.
5. **Fame feed**: whisper/rumour/report/renown lines for far societies, only via real carriers, never exact numbers.
6. **Glory ledger**: nine streams in plain bars; breadth earns a bonus so expansion is not the only road.

World cues (visual, later): ruler's banner and insignia on the leader unit, house colours on retinue, a wedding or funeral gathering at the capital, mourning cloth for a season.

## 2. Cause and effect (every action has a visible chain)
- **Marry into another tribe:** trust and bond rise now; bond is smaller for unequal matches; peace sealed if at war; each side gains a small claim on the other. Later: a child of the union may claim, allies join defensive wars, a succession claim becomes a casus belli.
- **Repudiate or kill a spouse:** trust and bond collapse, grievance spikes, vendetta risk. Bonds decay unless a living union or envoys renew them.
- **Fosterage, hostages, envoys, bride gifts, tribute marriage** each have their own signed effects (`ties.effects`). The UI prints the `why` strings as the cause chain.

## 3. Historically appropriate complexity (`eras.ts`)
Gated by measured complexity, not calendar dates.
| Stage | Rule | Succession | Marriage means | Not yet |
|---|---|---|---|---|
| Forager | camp consensus, best hunter leads | none | band exchange, safety net | heirs, claims, tribute |
| Tribal | big man, clan council | election by clans, tanistry | bride-price, clan alliance | permanent offices, standing army |
| Chiefdom | hereditary ranked chief | eldest line, brother-then-son | rank, tribute, fosterage | written law, taxes |
| Early state | king or council, palace/temple | primogeniture, designated, elective | dynastic match, hostages, claims | modern bureaucracy |
| Agrarian state | monarchy, oligarchy, republic | any law incl. partible | treaties, regents | mass ideologies |
| Mature polity | any | constitutional | rarely decisive | none |

## 4. Internal rule
`houses.generateFactions` builds the power blocs from the polity form. Each ruler pleases or angers each bloc by personality (a pious ruler pleases priests, a bold cruel one pleases warriors). Loyalty drifts yearly; hostile power share feeds the unrest score.

## 5. Families have personalities
`houses.generateHouse`: 2-3 mild trait biases, motto, reputation, cohesion. Members are sampled with the house shift, so a house runs in character but individuals still vary. Rival houses and in-house disputes move cohesion.

## 6. Player control
The player never loses control. On death the next of the line takes over (law-based), or a weaker, illegitimate claimant is raised if the line ends. Rivals age on a compressed clock; the player's line uses the same step function.

## Still to wire (Codex-owned files)
One sim hook behind a switch calling `stepRulersYear`; glory events from the prestige model; diplomacy actions mapped to `ties.effects`; UI panels (Claude lane) reading `rulersOf(state)`.
