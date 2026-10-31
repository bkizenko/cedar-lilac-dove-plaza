# Independent society interactions

This batch connects directed rival–rival relations and actual land raid/peace missions to `Game.step`. It is not a boat, non-destructive store-looting, full treaty-economy or natural-map frequency qualification.

## Runtime contracts

`Game.sendSocietyPeace(team,partner)`, `Game.dispatchSocietyRaid(team,partner)` and `Game.resumeSocietyJourney(id)` use the same executors as the bounded automatic review. The review uses a society's observed ground and known reachable partner sites, retains actual home guards and allocates existing uncommitted adults. Plans alone do not count as departures or contact.

A raid's original finite party physically approaches a known target, establishes contact, fights through the existing raid executor and physically returns its surviving members and finite loot. It changes only the two societies' relationship. Return chooses the nearest reachable owned cache, including a real storehouse; it does not force every carrier past a nearer store to the first hall in the building list. Existing destructive ruin-looting behavior remains distinct from later non-destructive store raids.

A peace messenger loads actual food and water at its source cache, walks to a known destination, meets a living local representative, talks, accepts/refuses, then walks home. Unused supplies are credited only on physical return. Ordinary remote food/water consumption excludes this paid pack once. Interruption preserves the same person's remaining provisions; capture transfers that pack to that same body. No free people, boats, remote rewards, global annexation or universal peace is created.

## Saved fields and exports

- Unit: optional `societyMissionId`.
- State: optional `societyRelations`, `rivalMissions`, `rivalActivity`, `rivalActivityNextReview`.
- `societyRelations.ts`: `societyRelation`, `societiesAreFoes`, `recordSocietyContact`, `recordSocietyAttack`, `declareSocietyHostility`, `agreeSocietyTruce`, `acceptSocietyPeace`, `validSocietyRelations`.
- `rivalActivity.ts`: `assessRivalPairRaid`, `planRivalPairRaid`, `dispatchPairRaid`, `dispatchSocietyPeace`, `resumeSocietyMission`, `cancelSocietyMission`, `societyMissionAI`, `tickSocietyMissionNeeds`, `tickRivalActivity`, `reviewRivalSocietyActivity`, `rivalPairActivityStatus`, `isSocietyPeaceMessengerFor`, `validRivalActivityState`.

Strict validation checks pair bounds, finite packs, unique owned actors, mission IDs and bounded journals. The existing save validator remains read-only and does not regenerate a world during autosave checks. Targeting/alarms protect a real parley messenger toward its recipient; explicit attacks remain possible. Paid actors are protected from ordinary work, crafting, scouting and recruitment selectors.

## Performance and evidence

Player, raider and same-faction targeting retains the published direct legacy rule. These queries do not scan or allocate pair relations. Unassigned residents do not scan mission history. Pair/mission indexes retain references to the actual saved records and refresh for changed collections; current hostility/phase remains live. Existing terrain/component caches and early distance filtering are preserved.

`SOCIETY_PAIR_SCENARIOS_2026-10-31.json` records the current controlled full-simulation cases: automatic1→2 raid, witnessed-conflict2→4 peace, mid-route save/reload, actual contact/return and one-use water accounting. These use declared flat land and finite controlled populations to qualify the executor, not ordinary-map campaign balance. The raid leaves the target society alive; casualties and home retention remain visible in the report.

Focused verification: ten relation/ownership/material cases, two full `Game.step` cases, five existing rival-operation cases and two legacy/performance-boundary cases. `scripts/diagnostics/society-predicate-perf.mjs` provides the short reproducible targeting comparison; its report states explicit thresholds and does not claim a full-village stress test. The wider Classical-release checklist is unchanged.
