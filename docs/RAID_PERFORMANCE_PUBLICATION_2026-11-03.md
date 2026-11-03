# Raid behavior and navigation allocation playable batch

New arrivals have measured, difficulty-weighted scouting, finite looting, guarded capture, destruction and rare annihilation behavior. Actual nearby observed targets, physical collection, carried goods, same-person custody and physical withdrawal remain authoritative. Old in-flight parties preserve their behavior. Full finite-camp fleet recruitment and legacy spawned provisions remain unfinished; see RAID_INTENT_2026-11-03.md.

Navigation relabeling reuses the same four neighbor tuples in the same order. This avoids per-cell temporary arrays without delaying building obstruction updates, changing paths or weakening movement checks. Independent ABBA testing preserves full state, random state and walk/label bytes. Timings are noisy; no sustained FPS or whole-game speedup is claimed.

Combined validation on current09d4146 plus both changes:75/75 checks pass, zero skipped, across raid-intent, raid-balance, raid-river-objective, sea-raider-return, captivity, navigation-neighbor-labels, quarry-return-range, building-maintenance, storage-codec and v14-first-winter. The Normal first-winter scenario passes ordinary water/fuel/shelter/defense and strict save/load with no founder loss or simulation errors. Typecheck and production build pass. Three additive merge conflicts preserve both maintenance and raid imports/state declarations. Canonical saved villages are untouched.

Live broad acceptance remains32/98 (32.65%), hearthwild-first-release-gates-v1. This batch does not prove autonomous naval sourcing, full campaign balance, smooth riverbanks or the pendingV18 terrain default. Periodic autosave fallback remains under separate causal diagnosis.
