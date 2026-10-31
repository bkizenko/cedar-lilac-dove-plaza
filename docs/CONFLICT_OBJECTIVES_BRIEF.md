# Conflict actions and natural transitions: implementation brief

Status: audited 2026-10-31. Existing backlog and master plan remain in scope. Desktop controls are the delivery target. This specification records intended behavior; it does not claim the connected feature has shipped.

## Latest user direction

**No compulsory objective picker or predeparture modal.** The latest clarification supersedes the earlier proposal to choose an expedition goal before departure. Raiding, conquering and domination should emerge naturally from what the player orders and what happens on the ground:

- Take accessible goods and withdraw: a loot raid.
- Deliberately surround a person, accept surrender and arrange an escort: prisoner capture and custody.
- Secure a living hall/control point, defeat or negotiate with local defenders, then keep a garrison: intact occupation.
- Maintain leverage and negotiate obligations: tribute, vassalage or another domination arrangement.

The player can change plans in the field. Record intent from actual contextual orders and show the current purpose/status plainly; do not ask for an up-front strategic classification. Moving an army toward a settlement does not authorize an automatic sequence of burning every building. A control order must not fall back to burning if it encounters resistance.

**Did the requirements transfer?** The master plan retains capture/escort/custody/release, territorial conflict, society continuity and military commitments. Existing code includes partial foundations and intact annexation through peace. The natural connected transitions above are still missing and are now explicit retained requirements. The original catalogue is not replaced or silently reduced by this clarification.

## Audited implementation

| Surface | Existing behavior | Gap relative to this request |
|---|---|---|
| `src/ui/Hud.tsx`, rival hall selection | One “Mass raid” button sends all armed residents. | No contextual capture/secure-control actions, party commitment preview, or intent-specific outcomes. |
| `massRaid.ts` | Existing armed adults unload carried cargo, march physically, and use `pillage`/`attackmove`; civilians return to work afterward. | No recorded contextual intent, persistent mission party, or occupation/capture completion gate. `massRaidTarget` is cleared when marching starts. |
| `Game.nextPillage`, `acquireTarget`, `applyCombatDamage` in `sim.ts` | Combat acquires buildings; destroyed buildings are shown as Burned/Fallen and invoke `lootBuilding`. Pillage continues toward other buildings belonging to the target society. | New occupation and capture parties need target/damage exclusions before this path can run. Preventing only the destruction message would not prevent destruction. |
| `Game.lootBuilding`, `warfare.raidLootAI` | Destruction moves finite victim stock into ruin loot. Raiders physically collect cargo and credit stores only after return. | Reusable finite cargo foundation, but normal loot currently depends on destruction. A completed cargo raid is not village occupation. |
| `captivity.tryCivilianSurrender` | A surrounded adult worker may surrender before a fatal blow, with nearby superior player force, housing and a reachable player hall. The existing person's ID and wounds persist. | Player-only, incidental to lethal combat, restricted to workers, no capture objective or prisoner party; automatically sets `enslavedFrom`, conflating custody and forced labor. |
| `captivity.ts`, `caravans.ts` | Local guard coverage is finite (up to three captives per eligible nearby guard); real escorts, hunger/fatigue-related unrest, escape, release, physical return and arrival goodwill exist. | Reuse physical executors, but distinguish prisoner custody, forced labor, surrender, ransom/exchange and integration. Full revolt/ransom lifecycle remains incomplete. |
| `peace.ts` | Physical peace delegations exist. Annexation transfers surviving people, buildings, aggregate stock and region owners without destroying them; puppet terms retain a society and its assets. | Annexation acceptance uses society-wide military strength, not local arrival/control. It transfers an entire society and its stock, not one occupied village. There is no garrison/control/withdrawal gate. |
| `campAnchor.ts`, `Game.connectedCamp` | Camps survive without halls. Connected buildings and existing resident `homeHall` references provide partial site foundations. | A stable settlement identity and bounded asset membership are needed for local occupation. Connected-building chains alone can merge nearby settlements; distant people must not be silently annexed. |
| `simulationEvents.ts` | Bounded persisted food/cargo accounting exists. | No custody, local control, surrender or occupation outcome events yet. |

Focused tests exist for mass raids, captivity, peace/annexation and finite loot. Their presence is evidence of those narrow mechanics, not proof of the requested connected operation.

## Recorded intent follows action

The minimal recorded intent is `loot | capture | occupy | dominate`, inferred from contextual orders and subsequent physical outcomes. This is a simulation/diagnostic field, not a compulsory player selection. Persist party/actor references, target person or stable settlement ID, phase, current blocked reason, goods/prisoners under control, actual escort/garrison commitments, and outcome metrics.

An explicit new order can redirect an operation in the field, preserving paid work, cargo, prisoners and existing people. “Withdraw” ends pressure and physically returns participants and possessions. Changing from looting to securing a village changes target permissions before any further combat damage occurs. A rejected contextual action gives one reason; it never substitutes a destructive order.

Phases follow the actual task: approaching, contact, taking goods/accepting surrender/securing control, escorting/holding/withdrawing, completed or canceled. Arrival and a hold period are physical requirements, not remote strength-ratio awards. Direct player orders retain precedence over automatic plans, with incapacitation and physical impossibility handled explicitly.

## Connected player actions and gates

| Contextual action | Actual behavior | Completion gate |
|---|---|---|
| Take goods | Reach an accessible store/cargo site; handle its local defenders; remove finite available goods once. Deliberate destruction remains a separate escalation. | Goods physically reach friendly storage. Loading goods or destroying a building is not a delivered-loot success. |
| Capture / Accept surrender | Existing armed residents approach a visible reachable person. Local force, resistance and surrender determine custody; a nonlethal surrender path does not require first inflicting a fatal hit. | The same living person reaches custody with food/water access and real guard coverage. Battlefield surrender remains pending escort. |
| Secure village | Reach an intact hall/control point; defeat, deter or negotiate withdrawal/surrender of local defenders. Hold contested control with a present garrison for a tunable interval. | Local occupation is recorded with the same building IDs, remaining HP, residents and paid work. Legal annexation or a vassal agreement is a separate decision. |
| Demand terms | Use established local leverage and information to negotiate tribute/vassalage. Continued domination imposes actual obligations and costs. | Agreed obligations and physical deliveries occur; a distant superior army alone does not complete conquest or magically transfer stock. |
| Withdraw / Release | Retreat with surviving people and real possessions; release prisoners to walk home or become free through an explicit subsequent decision. | Physical returns, custody changes and control withdrawal are accounted for. Garrison withdrawal can weaken/reverse contested control. |

Prisoners retain names, IDs, wounds, bodily needs and origin. Custody is distinct from slavery: do not set all newly captured people to forced labor. Existing forced-labor saves retain their meaning. Guard capacity is finite; losing escorts or blocking routes leads to visible waiting, escape, release or retreat. Prisoners do not quietly join the automatic labor pool upon reaching camp.

Loot does not annex a settlement. Occupation does not automatically enslave its residents. Neither action grants remote goods or replacements for dead people. Weak parties can fail or withdraw with visible reasons; success need not require killing everybody or burning the hall.

## Intact occupation safeguards

1. Apply contextual intent at every target/damage path: acquisition, direct target orders, pillage continuation, cached targets and projectile impact. Capturing/occupying parties must exclude protected civilian buildings from automatic destructive targeting. A UI label or hidden burn message is not sufficient.
2. Track local control separately from legal society membership. Preserve settlement identity, former society, buildings, resident/household membership, local goods, construction history and consumed project inputs. Never annex distant settlements through a local village-control action.
3. `connectedCamp` and `homeHall` are useful initial adapters, but a chain of nearby buildings is not a permanent settlement identity. Snapshot the local asset/person scope and validate it; prefer a stable explicit anchor when available.
4. Existing society-wide `Tribe` stock cannot be duplicated across occupied villages. Until inventories are localized, keep unlocalized stock with its society and transfer only goods physically localized and accounted for. Do not reuse all-society annexation as a local-control shortcut.
5. Settlement-owned haulage projects must keep their consumed inputs, progress and ownership permissions. Current treaty annexation changes unit/building teams without migrating those new projects; resolve that continuity explicitly before adapting treaty transfer.
6. Occupation needs actual guard commitments and recurring costs. Secure control must not trigger the normal raid's automatic demobilization of every participant.
7. Normal combat consequences remain for explicit destructive attacks and defended military targets. Preserve buildings by correct task permissions and surrender/control resolution, not global invulnerability, damage erasure or healing after the fact.

## Tunable rules and diagnostics

Centralize named units for approach/control radii (metres), local force ratios, surrender resolve, occupation hold time (seconds), guards per prisoner, escort separation (metres), custody capacity, provision reserve (seconds), withdrawal tolerance and timeouts. Initial values require scenario evidence. Historical outcomes must remain interpretable after tuning changes.

Record bounded events and persistent totals: contextual order/intent changes, preparation/contact times, local strengths, surrender offers/refusals, prisoners surrendered/escorted/arrived/released/escaped/dead, guard coverage seconds, cargo loaded/delivered/lost, participants killed/returned, control held/contested seconds, garrison cost, buildings retained/damaged/destroyed, people retained/displaced, paid work preserved/transferred, blocked reasons and operation outcomes.

## First executable batch

Integrator owns shared schemas, dispatcher/combat hooks, migration and UI wiring. Specialist modules own contextual intent, custody and local control. The verified preceding batch is committed as `c25f405`; source implementation is now authorized with non-overlapping ownership.

1. Add natural contextual actions in existing selection panels: Take goods, Capture/Accept surrender, Secure village and Withdraw. No mandatory up-front picker. Infer/persist purpose from the action; provide current status and a concrete blocked reason.
2. Route existing mass-raids through a compatibility loot intent. Add capture/control targeting guards before enabling those actions. Old saved pillage orders retain their legacy behavior; do not reinterpret every attack as an occupation.
3. Connect deliberate nonlethal surrender to existing real-person/guard/escort foundations. Add neutral prisoner custody separate from forced labor; prevent automatic labor and continue bodily needs. Verify delivery, interruption and release.
4. Connect secure-control action to actual approach, contested hold and a local garrison record. Preserve the intact settlement. Keep formal all-society annexation/tribute as distinct negotiations; broader local politics and domination remain retained work until their scenarios pass.

## Acceptance scenarios

- Approach a settlement without an initial modal; take goods, then choose to withdraw or instead secure the village. Verify that the new contextual action changes recorded intent and target permissions without losing possessions.
- Physically capture a reachable living person through surrender without requiring a lethal strike. Maintain finite escort capacity, deliver to custody, and verify the same person is fed and guarded without automatic forced labor. Remove a guard or block the route; observe a reason or a real escape/release.
- Secure an intact defended village through arrival and contested control. Assert preserved building/resident IDs and remaining HP, no automatic protected-building damage, and continued paid project identity. Explicit destructive orders remain explicit.
- Secure one village in a multi-settlement society. Distant residents, other villages and unlocalized society stock remain untouched. Withdraw the garrison and test loss/contestation of control.
- Negotiate domination obligations after actual leverage; verify physical tribute, broken obligations and subsequent responses rather than remote conversion.
- Save/load during approach, surrender, escort, holding control and withdrawal. Preserve old pillage/treaty/forced-labor saves. Check no duplicated goods, people, weapons, project inputs or victory credit.

A contextual button, an isolated annexation transfer or passing preexisting combat tests does not establish this connected behavior. Full captivity, diplomacy, control and victory backlog remains retained.

## Integration contract for the isolated implementation

Current isolated modules export `captureTarget`, `captureIntentAI`, `secureVillage`, `occupationActorAI`, `tickOccupation`, `occupationStatus`, `integrateOccupiedVillage`, `withdrawOccupation`, the two target-permission helpers, and explicit-order cleanup. The later integration should record the existing `massRaid` loot action without adding a modal; its live executor remains unchanged during the preceding map release.

`integrateOccupiedVillage` is the contextual aftermath of a physically held village. It transfers only that local scope, preserves existing people/buildings and carried possessions, migrates local paid haulage projects without repayment, and leaves society-wide stock and distant communities alone. The recorded phase becomes `integrated`; the former society is not globally erased by this function. This is distinct from the earlier all-society peace annexation helper.

New custody has escorting, custody and released/home-return phases. New captures do not set `enslavedFrom`. A released person physically retains/uses remaining pack provisions and returns leftovers only on reaching home; escaping is counted separately from an intentional release. Escorting and released people require their own physical supplies, whereas a prisoner who has reached custody consumes the captor's ordinary local supplies. Existing forced-labor saves remain separate.

The integrator must still wire selection actions, shared optional types, combat permissions on every route, AI/needs hooks, assignment protection and save validators. Before those hooks are connected and rendered, these exports and focused module tests do not constitute a shipped contextual conflict feature.
