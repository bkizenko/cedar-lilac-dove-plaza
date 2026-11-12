# war-outcome-v1 — defended-aim war outcome for prestige (Claude T9 contract)

**Purpose.** Codex T6 prestige needs a war component that is neither a kill count nor a retreat proxy. The defended aim of a conflict is the hall (and community) a front is fought over. This contract defines the outcome from state that already exists and is already saved. No new save fields are required.

## Source of truth
`src/game/capitulation.ts` `CapitulationFront` (`hallId`, `attackerTeam`, `defenderTeam`, `phase`, `openedAt`) and, for lasting results, `src/game/domination.ts` `Domination` (`overlord`, `subject`, `origin`, `phase`). `conflictJournal` totals are context only and never score.

## Outcome per front (settled fronts only)
| Front phase | Attacker | Defender | Notes |
|---|---|---|---|
| `accepted` with outcome `occupy`/`annex`/`raze`/`loot`/`captives`/`tribute`/`puppet`/`autonomy` | aim achieved | aim lost | scale by outcome weight below |
| `refused` then `relieved` | aim failed | aim held | defender kept the hall |
| `relieved` | aim failed | aim held | relief force or pressure collapse |
| `expired` | no result | no result | stalemate scores nothing |
| `pressed`, `capitulated` | pending | pending | never scored; no partial credit |

## Outcome weights (attacker side; defender receives the mirror only for `held`)
`raze`=0.5 (destruction is not rule), `loot`=0.5, `captives`=0.6, `tribute`=0.8, `autonomy`=0.8, `puppet`=1.0, `occupy`=1.0, `annex`=1.2. A held aim scores the defender 1.0 per settled front. Scores are per settled front, once, keyed by front `id`.

## Rules
- Only fronts with `phase` in `accepted|refused|relieved|expired` count; a front id is scored once. Store no new counters: recompute from `capitulation.fronts` (bounded list) plus a score-side `scoredFrontIds` cache if Codex's ledger needs idempotence.
- Never score kills, deaths, retreats, hp or conflictJournal totals.
- A defender counts as holding only when `phase` is `refused`/`relieved` and the `hallId` building still exists owned by `defenderTeam`.
- Domination: a `Domination` created from an accepted front adds a lasting `overlord` bonus only while `phase==='active'`; `lapsed`, `released` and `rebelled` remove it. Never both a front score and a domination score for the same front id beyond the weight above.
- Known identity versus private metrics: other teams' fronts may be scored in the ledger only if the player has observed them; the rival private total stays hidden.
- Old saves: missing `capitulation` means zero war score. No save migration.

## Tests Codex should add
1. `accepted occupy` scores attacker 1.0 once across save/reload.
2. `relieved` scores defender 1.0, attacker 0.
3. `expired` and `pressed` score nothing.
4. Killing units with no settled front changes nothing.
5. Old save without `capitulation` loads with 0.
