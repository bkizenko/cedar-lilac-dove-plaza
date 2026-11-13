# Skills model: individuals, practice, forgetting, teaching, and village specialisation

## BLUF

- Every person can now carry a compact skill record covering 20 skills (farming, herding, hunting, fishing, foraging, woodcutting, mining, building, hauling, pottery, weaving, smithing, tanning, toolmaking, cooking and curing, healing, sailing, trading, leading, fighting). Code: `src/game/skills.ts` (pure, seeded) and `src/game/skillRuntime.ts` (glue).
- Growth is a saturating curve with a plateau set by the person's aptitude. Skills fade with disuse toward a floor that is a fraction of the person's peak (deeper skills fade slower and keep more); relearning a rusty skill is up to 3x faster than first learning. Young people learn fast, bodies decline in elders, cognitive skills hold up, and a skilled elder teaches best. A master working within 30 m teaches an apprentice (up to 2x gain, and the lesson sticks better).
- Effects are **time multipliers only** (gather period, field work, production work). The model never adds or removes goods. With no practice the multiplier is exactly 1.
- Villages get a decaying **tradition** per skill, built from how many skilled hands the settlement has and how rich its local resources are. A tradition speeds that work by at most 15%, gives craft quarters a deterministic style name, forms a guild at town size, and lapses (with a knowledge-panel entry) when the last master dies.
- New games turn it on; saves without the field behave as before. `reset(seed, version, {skillsVersion: 0})` turns it off. Older practice (crafting XP, combat XP, recipe batches, draft practice, tribe haulage practice) is migrated into initial person skills by `migrateLegacySkills`.
- Not done: healing has no work hook (no healing mechanic exists), leading and sailing are sampled once a day rather than per step, and no trade-pricing, visitor or prestige hook consumes village reputation yet (see Hooks).

## How claims are marked

Numbers in tables are game tuning, not measurements. Statements about how people learn come only from pages fetched on 13 November 2026 and are cited as [source]. Anything else is marked [UNVERIFIED].

## Model

| Piece | Rule |
|---|---|
| Experience | `xp` in work-seconds of sim time, capped at 3.2 tau |
| Mastery | `ceiling(apt) * (1 - exp(-xp / tau))`, `ceiling = clamp(0.85 + 0.5 (apt - 1), 0.7, 1)` |
| Aptitude | 0.7 to 1.3 per skill from a genome hash of (world seed, person id): 30% a general factor shared across skills, 70% skill-specific. 35% of it is pulled toward the mean of the parents' genomes (family influence). Scales learning speed and sets the plateau. |
| Age | learning speed by years: 0.8 (4), 1.5 (8), 1.4 (14), 1.2 (20), 1.0 (30), 0.9 (45), 0.7 (60), 0.5 (75). Bodily performance 1.0 from 18 to 45, falling to 0.65 by 75, weighted by each skill's `physical` share. Teaching quality = mastery x (0.7 + 0.6 x wisdom), wisdom rising from age 35 to 70. In-game births carry a 14-year offset because they mature at 0.2 sim years. |
| Forgetting | after a 4-day grace period, xp relaxes toward `floor = peak x (0.35 + 0.35 depth + 0.2 lore)` with time constant `60 x (1 + 3 depth) x (1 + peak mastery)` days. |
| Rusty | mastery below 85% of peak mastery. Gain multiplier `1 + 2 x (1 - xp/peak)`. |
| Teaching | a master (mastery at least 0.35, at least 0.12 above the learner, within 30 m, practised in the last two days) multiplies the learner's gain by `1 + quality`. The share learned this way raises `lore`, which raises the forgetting floor. At most 8 teachers per skill per village are considered. |
| Injury | below 35% hit points sets a severity that heals over 12 days and leaves a permanent scar up to 0.3 (0.03 per injury, scaled by severity). Reduces bodily skills by `0.8 x physical x (severity + scar)`. |
| Effect | `speed = 1 + bonus x mastery x age x injury` (bonus 0.15 to 0.4 per skill) times the village tradition factor. |

### Where practice is recorded

- Per step, a counter only: gathering (woodcutting, mining, foraging, fishing, hunting), field work (farming), and production recipes (pottery, weaving, smithing, tanning, cooking and curing, toolmaking).
- Sampled once per day (credit 40 work-seconds when the order is active): fighting (militia), building, hauling with a haulage rig, sailing aboard, trading and envoys, herding and taming.
- Everything is banked in one batch per sim day (`advanceSkillDay`); between batches a person's multiplier is constant, so lookups are cheap.

### Why a saturating curve with a plateau

The learning-curve literature describes proficiency rising quickly then levelling off, with an exponential rise to a limit and a plateau model in which learning stops near a floor of achievable cost [Wikipedia, Learning curve, fetched 13 Nov 2026]. The forgetting-curve page gives an exponential form with a "stability" that governs how fast retention falls, says each repetition flattens the curve, and defines "savings" as the time saved when relearning, which is why rusty recovery is faster than first learning [Wikipedia, Forgetting curve]. Those pages are the basis for the curve shapes; the specific constants are tuning.

Age: the fluid and crystallised intelligence page reports fluid intelligence peaking around 27 and declining, and crystallised intelligence growing and holding through most of adulthood, declining after about 65, with the exact peak age unclear [Wikipedia, Fluid and crystallized intelligence]. That motivates "cognitive skills hold up, bodies decline"; the ages used in the table are tuning, not figures from that page.

Apprenticeship and craft towns: craft guilds transmitted skills through formal systems of apprenticeship, journeymanship and mastery, oversaw goods from textiles and metalwork to baking, and could limit apprentice numbers and enforce standards; historians disagree on whether guilds mainly aided training or acted as monopolies [Wikipedia, Guild]. The game's guild is deliberately mild: it slows forgetting and speeds teaching, and does nothing to block outsiders.

[UNVERIFIED] The tau values (how long each skill takes), the idea that deep skills are forgotten more slowly, the 14-year offset for births, and any "10,000 hours" style plateau claim are design choices or recollections not checked against a fetched source.

## Village level

For each settlement, each day: for each skill, `sum` of mastery over adults with mastery of at least 0.25, scaled by local resource affinity (trees near camp for woodcutting, forage, fish, stone, and farm count for farming; crafts use a neutral 0.6, since the pottery lane's clay deposits are not read here). Target tradition = `min(1, sum / 2.5) x (0.5 + 0.5 affinity)`. Tradition rises about 6% of the gap per day and decays with a 90-day time constant (225 with a guild, 20 when no master is left).

- **Quarter**: a craft (pottery, weaving, smithing, tanning, toolmaking, cooking) with tradition at least 0.4 and at least 3 practitioners is listed as a quarter with a deterministic style name, for example "Reed-banded pots" (hash of world seed, team, skill).
- **Guild**: tradition at least 0.5, at least 4 practitioners, population at least 24, at most 1 + population/40 guilds. Effects: tradition decays slower, the forgetting floor is a little higher, teachers count for 1.25x.
- **Lapse and knowledge loss**: if a skill's tradition once reached 0.3 and no adult has mastery of at least 0.35, it is marked lapsed: the village bonus halves, tradition fades in about 20 days, a life-history line is written, and the knowledge panel lists "X is fading" (`skillKnowledgeTopics`). No recipe or unlock is deleted; that would be a save-compatibility and balance decision for the economy owner.

## UI

- Person card (`SkillStrip`, `src/ui/hearth/skillsCard.tsx`): the top three skills as a word (novice, practised, skilled, expert, master), a bar, a "rusty" chip, a suggested job line, and a wound note. Rows are at least 40 px high, text uses the Hearth font tokens.
- Village screen, Craft tab: `VillageSkillsCard` with tradition bars, hands and masters, guild chip, "no master left" flag and craft quarters.
- Renders: `docs/renders/skills/`.

## Saves

Optional `Unit.skills` (record with five-number tuples per skill) and `GameState.skillModel` (day counter and per-village tradition). Both are validated on load (`validSkillRecord`, `validSkillModel`); a corrupt record rejects the save. Saves without the fields load unchanged and keep the old behaviour because `gatherSkillStep` and friends return 1 when the model is off.

## Hooks left for other lanes

- Trade pricing, visitor choice, apprentice recruitment and prestige can read `villageSkillCard(g, team)` or `state.skillModel.towns[team].trad` (renown for a craft). Nothing consumes it yet; it is the economy lane's call.
- Pottery breakage and quality: the pottery code has no quality concept, so tradition currently only speeds work. A breakage-chance multiplier is the natural hook if the economy owner wants it.
- Healing needs a healing mechanic before it can be practised.
- Old per-recipe practice (`productionPracticeRate`, +20% cap) still applies and stacks with the new multiplier; retiring it is a balance decision.

## Tests

`scripts/skills-model.test.mjs` (run with `node --import ./scripts/game-loader.mjs --test scripts/skills-model.test.mjs`): saturation and plateau, aptitude bounds and family pull, decay floor and depth, rusty recovery, age, teaching speed and lore, injury, speed bounds, validators, switch off, daily batch determinism and goods conservation, disuse, apprentice versus solo, village tradition / guild / lapse, migration, save round trip, live run.
