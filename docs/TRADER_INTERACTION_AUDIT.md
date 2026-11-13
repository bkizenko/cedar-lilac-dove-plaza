# Trader interaction audit

## BLUF

No commit removed the four verbs (attack, capture, rob, kill) from the sim for walking traders. A reproduction on `origin/main` (fixture world, `Game.step` driven, no mocks) shows:

- **Attack / kill**: work against visiting traders, need-based caravan carriers and rival envoy carriers (right-click `issueAttack` and the contact `Attack` action). Cargo drops as finite parcels (carried resource, and trade `itemCargo` for need-based caravan carriers).
- **Capture**: works only on an **unarmed adult worker** that is not aboard a boat. Armed or loan-armed (`caravanArmed`/`militia`) traders, escorts and boat crews cannot be captured (by design in `acceptPrisonerSurrender`, never relaxed for traders).
- **Rob**: the only path is the contact `Demand carried goods` action. It moves `carry` only (never `itemCargo`, animals or gear), asks the victim to yield, writes no cargo mark and no hostile-act record beyond `makeHostile`.
- **Interrogate**: the player has **never** been able to run the societies interrogation or ransom. `interrogateCaptive`/`proposeRansom` have no caller for team 0 (no UI, no dispatch command, no read model). Only NPC captors call them. What the player does have is the older `Talk` question topics on a prisoner.
- What changed between "it worked" and "it feels gone" is **reachability, not removal**: in the Hearth HUD (the default since the glanceable-state pass) the verbs sit three levels deep (`More orders` > `Contact & orders` > `Other choices`), with no icons and no consequence preview, and they need a free armed adult within a fixed radius of the trader. The classic HUD has the same nesting. Foreign boats cannot be selected at all, so coastal traders afloat cannot be touched.

So the suspected regression is a mix of (a) one real gap (interrogate/ransom never wired for the player, rob never covered bulk items), (b) hard-to-find controls, and (c) physical rules the societies/caravan work tightened (goods that have a physical holder only). It is not a deletion.

## Findings table

Legend: yes = player can do it and it resolves through the physical sim; partial = works with limits stated; no = cannot.

| Verb | Rival visiting trader (walks to our hall) | Need-based caravan carrier (`tradeNeedsId`) | Rival envoy carrier (`trade`) | Armed trader / escort (`caravanArmed`, militia) | Coastal trader ashore | Coastal trader afloat | Pack caravan animal |
|---|---|---|---|---|---|---|---|
| Attack (order / right-click) | yes | yes | yes | yes (they fight back) | yes | no (boat not selectable, hull not a target) | no (animal is part of the carrier body; no separate target) |
| Attack-move | no (auto-targeting only picks hostile societies; unchanged since the original `isFoe` rule) | no | no | no | no | no | no |
| Kill (dropped parcels) | yes, `carry` | yes, `carry` and bulk `itemCargo` | yes, `carry` | yes, `carry` | yes | no | animal and gear stay on the body (no parcel adapter) |
| Capture | yes, unarmed adult only | yes, unarmed adult only | yes, unarmed adult only | no, must be defeated (`acceptPrisonerSurrender` requires non-militia worker) | yes, unarmed adult only | no (`!u.boat`) | no |
| Rob (take cargo) | partial: `Demand` takes `carry` only | partial: `carry` only, `itemCargo` stays | partial: `carry` only | partial: defenders resist, combat | partial | no | no |
| Interrogate (after capture) | `Talk` topics only; no snapshot interrogation | same | same | n/a | same | n/a | n/a |
| Ransom / release | release yes (`repatriate`/`release-prisoner`); ransom no | same | same | n/a | same | n/a | n/a |

## Evidence and commits

Reproduction harness: `scripts/trader-interaction.test.mjs` (added with this audit) and the existing `scripts/contact-actions.test.mjs` (18 of 19 pass on `origin/main`; the one failure is the missing `typescript` package in this sandbox, unrelated).

| Claim | Evidence | Commit / reason |
|---|---|---|
| Contact verbs (Attack, Demand, Capture, Talk) exist and are unchanged | `src/ui/ContactActions.tsx` identical in behavior since `b9a761f2`; `src/game/encounters.ts` | introduced `5dfcfae8`; later edits `221b246f` only reworded text |
| Attack/kill still work on traders | fixture probes: visitor killed in the same step window, parcel `wood:12`; caravan carrier killed, parcel created | no regression |
| Armed traders cannot be captured | `acceptPrisonerSurrender` rejects `u.militia`, `u.type!=='worker'`, `u.boat`; `equipCaravan` (`03dbaf72`) makes a trader `militia` | design rule, not a removal |
| Rob only moves `carry` | `tickContactOrders` demand branch in `encounters.ts` moves `person.carry`/`carryType` and `seedSamples` only | `5dfcfae8`; bulk `itemCargo` carriers arrived later with `57c0b774` and `b4386e84` (restricted to goods with a body holder) |
| Interrogation never reachable by the player | no call to `interrogateCaptive` or `proposeRansom` with team 0 in `src/`; no `ui`/`engineDispatch`/`engineReadModels` reference | source-only handoff `e6590c5b`, `0acf2c2f`, `b9809014` ("Interface request: Experience") |
| Dead trader cargo is physical | `dropFrom` and `dropTradeCargoItems` in `stolenCargo.ts` | `7bfc943` (parcels), `85f332d8` (trade items) |
| Peace/neutral guards do not block explicit attacks | `isSocietyPeaceMessengerFor` and `contactYieldingTo` only filter automatic targeting; `contactYieldingTo` is revoked by an explicit attack order | `e6590c5b`/`b007f257`; `transit.ts` agreements gate caravan departure, not player orders |
| Safe conduct only covers released prisoners | `contactYieldingTo` (`encounters.ts`) | `b284e69f` |
| Hearth buries the verbs | `SelectionCard` in `src/ui/hearth/parts.tsx` shows `More orders`; `ConflictControls` > `ContactActions` > `<details>Other choices` | Hearth pass `c4625945`; text-only edit `221b246f` |
| Foreign boats unselectable | `engine.leftClick`: boat selection only for `boat.team===0` | original behavior |

## What is not a regression (kept on purpose)

- Attack-move does not auto-engage peaceful traders: that would massacre neutrals on any march.
- Trade goods are limited to goods with a physical holder while travelling (resources and bulk `itemCargo`). Tools, weapons, armor and animals are not offered in trade (`TRADE_SELECTABLE_KINDS`, `b4386e84`) so nothing robbable is invented.

## Restoration plan (implemented in the same branch)

Implemented on `claude/trader-interaction-audit` (merged into `integration/2026-11-11`). Code: `src/game/traderInteraction.ts` (new), `encounters.ts`, `stolenCargo.ts`, `captivity.ts`, `captiveDealings.ts`, `sim.ts` (one kill hook), `types.ts` (two optional fields), UI `src/ui/TraderVerbs.tsx`, `ContactActions.tsx`, `hearth/parts.tsx`. Tests: `scripts/trader-interaction.test.mjs` (13 cases).

| Verb | Now |
|---|---|
| Attack | Unchanged physical combat; the verb is on the selection card (icon plus consequence icons) in Hearth and in the contact panel. A killing records a witnessed incident. |
| Kill | Unchanged parcels; test proves exact conservation (resource `carry` and bulk `itemCargo`) for caravan carriers, visitors and envoy carriers. |
| Capture | Unchanged rule (unarmed adult, local superiority, guard, escort). New: the prisoner carries a capture-time `trade` knowledge snapshot (route, offer terms, prices, seen sites, rumours). |
| Rob | New contact action `rob` (Demand's forced twin). A free armed adult with empty hands walks to the person, the society turns hostile, and if local force is superior takes the exact `carry` and bulk `itemCargo` (up to the robber's capacity). The load is marked with its owner, walked to a real cache (`beginLootReturn`), and owner adults pursue within the existing bounded rules, now also for item-only loads. A broken walk home resumes. |
| Interrogate | New player action on a held person in custody (takes real time with a guard present); yields only the stored snapshot. A report lists home as it was at capture plus what the trader carried. |
| Ransom / release | Player can name a ransom (carried by real origin people) or release the person to walk home. |
| Consequences | `makeHostile` and `recordSocietyAttack` as before, plus an incident ledger: witnesses of the victim society walk the news home; on arrival the victim's grievance and trust change, and its trading friends lose a little trust. No witness: a weaker change after a long silence. Switchable (`traderIncidents.enabled=false`; Rob is then refused and Demand remains). |

## Still open

- Foreign boats cannot be selected or attacked, so coastal traders afloat are untouched; armed escorts of a caravan cannot be captured; animals and gear carried by a trader have no robbery adapter (they stay on the body). Attack-move still ignores peaceful traders by design.
- Reputation is expressed only through society trust and grievance; there is no separate prestige score for harming traders.
- UI is not rendered or play-tested here (no `node_modules`/browser in the sandbox); the contact-panel render test needs `typescript`.

## Update 11-12 (gap list 3 and 4)

- **Foreign boats**: a visible foreign hull can be selected (inspect only; `Game.selectForeignBoat`) and targeted. `naval-order attack` (right-click with your own hull) refuses first, makes a peaceful society hostile only when the attack proceeds, notes a trader incident if traders are aboard, and boards in grapnel range or closes in. Tests: `scripts/foreign-boat-attack.test.mjs`.
- **Armed escorts**: a caravan escort (`caravanArmed`) that is beaten (hp at or below 60%) and outnumbered can be captured; its loan weapon goes into the capturing guard's `weaponCargo` (exactly once; nobody's stock changes) and it becomes the unarmed worker it was. A healthy escort still fights on; any other armed adult still cannot be captured.
- **Gear and animals**: `rob` now also takes what a trader carries: weapon bundles up to the taker's load, carried armor (the same asset, team follows the holder), a farm tool with its condition, a led pack animal, and the loan weapon of an escort. Each moves exactly once to the robber's hands (`robGear` in `traderInteraction.ts`); a farmer's own tool is not fair game. Tests: `scripts/trader-interaction.test.mjs` (gear, capture, escort rules).
- Not done: gear is held by the robber (real holders, saved) but is not auto-deposited at the robber's cache; kill still leaves it to the existing death reconcilers.
