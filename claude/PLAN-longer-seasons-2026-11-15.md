# Plan: longer seasons (year length no longer hard-coded)

**BLUF:** The 1800 s year is encoded in at least 45 places across 30 files, some as a named constant (`SIM_CALENDAR_RULES.yearSeconds`, `YEAR_SECONDS`) and some as bare `1800`/`450`/`1350`/`900` literals; five rule tables each carry their own private copy. The refactor is NOT mechanical enough to ship unreviewed: it needs a decision on what "year" means for ageing and lifespan, and it needs a per-save year length so old saves keep their calendar. Recommendation: introduce one `calendarOf(game)` accessor backed by a persisted `state.yearLength` (absent = 1800), route every site below through it, keep the 1800 s *life year* (ageing, lifespan, skills) as a separate constant so people do not live fewer seasons. Not implemented; waiting for Boris to approve the decisions in section 5.

Status of claims: every file:line below was found by grep on this branch (main at 557f2520). Sites in section 2 marked [UNVERIFIED] were not opened in full.

## 1. Single source of truth (proposal)

- `src/game/calendarPacing.ts`: keep `SIM_CALENDAR_RULES={yearSeconds:1800,daysPerYear:32}` as the DEFAULT only (`DEFAULT_YEAR_SECONDS`). Add `LIFE_YEAR_SECONDS=1800` (ageing/lifespan/skills, never changes).
- New helpers in the same file: `yearSecondsOf(state)` (= `state.yearLength ?? 1800`), `seasonSecondsOf(state)` (= year/4), `yearPhase(time,yearSeconds)` returning `{year,phase,frac}`.
- Persisted: `GameState.yearLength?: number` (integer seconds, 600..14400, multiple of 4 and of daysPerYear). New games write the chosen value; absent on old saves means 1800. No SAVE_VERSION bump needed because the field is optional (persistence.ts:182 only checks `version`); validation must reject non-finite or out-of-range values and fall back to 1800.
- Day length stays constant in real time: `daysPerYear = round(yearLength / 56.25)` (today 1800/32), so `DAY_RATE` (sim.ts:271) becomes `86400 / 56.25` independent of year length. Otherwise a 2x year would make every day 2x longer and clock-driven systems (night raids, sleep, waystations) change feel.

## 2. Hard-coded sites to convert

Named constants (change definition, consumers follow):
- src/game/calendarPacing.ts:2 `SIM_CALENDAR_RULES.yearSeconds`
- src/game/settlement.ts:39 `YEAR_SECONDS`; :42-:49 `calendar()` (year, phase, month, remaining); :91 `CROP_GROW_SECONDS=round(YEAR*0.45)` evaluated at import, must become a function of the game
- Duplicated private copies: src/game/ecology.ts:86 `WILD_PLANT_RULES.yearSeconds`; src/game/fibre.ts:6 `FIBRE_RULES.yearSeconds`; src/game/fishing.ts:13 `FISHERY_RULES.yearSeconds` + `seasonSeconds:450`; src/game/yearClimate.ts:3 `YEAR_CLIMATE_RULES.yearSeconds`
- Consumers of `YEAR_SECONDS`/`SIM_CALENDAR_RULES.yearSeconds`: src/ui/Hud.tsx:347; src/ui/hearth/glanceReads.ts:78; src/ui/PrestigeReadout.tsx:6; src/ui/VillageHistory.tsx:13; src/ui/hearth/glance.tsx:61,68; src/ui/hearth/glanceModel.ts:125 (already takes yearSeconds as an argument); src/ui/hearth/screens.tsx:178; src/ui/hearth/parts.tsx:44; src/game/farmCalibration.ts:20; src/game/seasonReports.ts:83,87,113; src/game/rivalDevelopment.ts:30,88; src/game/rivalFarming.ts:18; src/game/knowledgeEvidence.ts:39; src/game/fieldLook.ts:9; src/game/farmingProgress.ts:22; src/scene/world.ts:1393; src/game/sim.ts:271

Bare literals that mean "year" or "season" (1800/450 and derived):
- src/game/sim.ts:5796 (`seasonMix` yearFrac), :5859 (`yearClimate` year index), :6014 (`sdt/…1800` slow decay, a rate not a calendar: decide case by case), :3767 comment
- src/game/daylight.ts:6 (`time % 1800`); needs a yearSeconds parameter
- src/game/pantry.ts:21 (`remaining+450/+1350/+900` season arithmetic), :27 (`%1800/450`), :82 (`/1800*1800+phase*450+225`), :167 (`:450`)
- src/game/discovery.ts:38 (`time/450 %4===3`, winter test)
- src/ui/SettlementLedger.tsx:237, :422 (`time/1800` as year number)
- src/scene/contourFields.ts:156 (`time/1800` year index for crops)
- src/game/waystations.ts:183 (`VISIBLE_DAY_SECONDS=1800/32*24`)
- Further `calendar(g)` callers (54 call sites) need no edit if `calendar()` is fixed.

Life/ageing (decision in section 5, default: do NOT scale):
- src/game/sim.ts:941 (`ageT` starts `(18+rand*24)*1800`), :3784 (lifespan `(58+id%20)*1800`)
- src/game/persistence.ts:746-748 (legacy ageT defaults)
- src/game/skills.ts:56 (`skillAgeYears`), :23 (`tau:1800`)
- src/scene/characterRig.ts:46 (`ELDER_AGE_T=40*1800`); src/ui/SettlementLedger.tsx:311 (age display)

Not calendar years despite the name (leave alone): `RULERS_YEAR_SECONDS=90` (src/game/rulersRuntime.ts:25), `RUIN_RULES.yearSeconds:90` (src/game/ruinsWorld.ts:21), tick-based 1800 s windows (strategicDirector.ts:9, tradeIntel.ts:6, tradedTeaching.ts:13, buildingMaintenance.ts:12, survivalNeeds.ts:25, wonderDefs labour, towerPlatforms hp).
Needs a per-site look [UNVERIFIED]: animal breeding/ageing seasons (animalBehaviour.ts, cattle.ts), cereal rules (cerealRules.ts:8 `coveredGraceSeconds:1800`, a rot timer not a season), production.ts:53 and :452 (spoil lifetimes that happen to equal 1800 or 3600), temperature `sn.*` curve in sim.ts:5855-5862 uses seasonMix so it follows once seasonMix does.

## 3. Migration approach

1. Add the accessor and `state.yearLength` (optional). Game.reset writes `DEFAULT_YEAR_SECONDS` unless a new-game option sets another value.
2. Persistence: serialise `yearLength` only when not 1800; on load, absent => 1800. Add validation (finite, in range) that repairs to 1800 instead of failing the save (this lane's sibling "Save is damaged" report shows strict failure is costly).
3. Convert named-constant sites first (calendar(), seasonMix, daylight, yearClimate), then the private rule-table copies (they read the game's value at use time, not import time), then UI literals.
4. Anything evaluated at module import (`CROP_GROW_SECONDS`, `DAY_RATE`, `VISIBLE_DAY_SECONDS`) becomes a function of game state.
5. Time-only helpers without a Game in scope (`daylightAt(time)`, `seasonPhaseOf`, `calendarPhase(time)`) gain a `yearSeconds` argument defaulting to 1800, so call sites that were not converted behave exactly as before.
6. Timers stored as absolute `sownAt`, `maturesAt`, `fell`, `lastSettlement` stay in sim seconds and need no migration; only season-boundary arithmetic changes.

## 4. Risks

- Mid-game change of year length would shift the phase of a running save (time % year jumps). Mitigation: yearLength is fixed per save; no in-game slider.
- Growth/harvest windows scale with the year (`CROP_GROW_SECONDS`), but food demand per second does not, so a longer year means more food needed per season and a longer winter. Winter stores and `growthFoodNeed` (pantry.ts:21) must scale together or starvation rises. Needs balancing, not only plumbing.
- Import-time constants and module-level memos can hold the old value in the worker; the sim Worker and UI each hold a Game, so a module-global "current year length" is unsafe in tests running several Games; use per-Game state.
- Hidden consumers: 69 references to `YEAR_SECONDS`/`yearSeconds` plus literals found by value only; a missed literal silently desyncs one system from the calendar. A grep-based guard test (below) is needed.
- Ageing decision (section 5) changes lifespans in seasons.
- Animals, rivals and the rulers module run on their own clocks [UNVERIFIED].

## 5. Decisions needed from Boris

1. Should people age in calendar years (lifespan scales with the year) or stay on the 1800 s life year? Recommended: life year stays 1800 s.
2. Fixed year length options for new games (for example 1800, 3600, 7200), and whether existing saves can opt in (not recommended).
3. Whether day length stays constant (recommended) or scales.

## 6. Test plan

- Golden: with yearLength unset, `calendar()`, `seasonMix()`, `daylightAt`, `yearClimate`, `growthFoodNeed`, `CROP` ripening time and fishing seasons give identical outputs to current main across a sweep of times (snapshot compare before/after the refactor).
- Round trip: save with yearLength 1800 omits the field; old fixture loads with 1800; save with 3600 loads with 3600; out-of-range value repairs to 1800.
- Scaling: with yearLength 3600, phase boundaries at multiples of 900, crops ripen at `0.45*3600` after sowing, winter food forecast scales, day length unchanged.
- Guard test: grep `src` for bare `1800` or `% 450` in calendar contexts against an allow-list (life year, 1800 s windows listed above).
- Run: game.test, normal-pace, daylight-food, wild-plants-integration, fish-stock-conservation, farming-related and calendar tests only (heavy files via hw-lock).
