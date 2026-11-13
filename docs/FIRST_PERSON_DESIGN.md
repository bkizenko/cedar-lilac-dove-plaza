# First-person mode: design

Author: Claude worker, 12 November 2026. Base: `origin/main` 67965c6b. Branch `claude/firstperson-design`; real-render revision on `claude/firstperson-real` (13 November 2026 UTC). **Design only.** No game source was changed. Build after the current visual and bug pass.

## Rule zero

**Same world, same art, same HUD. First person is only a camera mode.**

It is not a second game and not a second renderer. The same `Game`, the same `WorldView` (painterly terrain, botanical trees, village buildings in their civ skin, people v2 with items, draw distance, season, light) and the same Hearth HUD are drawn; only the camera pose, near plane and FOV differ. Anything that would make a first-person frame look unlike the RTS frame (new art, new fog, new UI chrome, an HTML mockup) is a defect, not a design choice. Pictures in this document are therefore **real engine frames** from `tools/render-preview/fp.mjs` and never mockups; the earlier HTML/SVG mockups were retired because they did not look like the game. If a proposal below cannot be shown by that harness, it is not ready to be designed.

## BLUF

- **Build one primary mode: "Walk", an eye-level, bodiless witness in your own village** (the ruler's eye). It is the one mode that answers a question the RTS camera cannot: what does this place feel like, and who needs me. Everything else is a secondary mode that reuses the same camera, collision and card system.
- **Secondary modes, in this order: "Audience"** (you sit in the hall and people come to you in a line; a scripted-free scene built from real petitions) **and "Ride along"** (the camera rides a chosen villager's eyes; read-only, with the same orders the RTS view already gives). Photo/inspect falls out of Walk for free. **Do not build** scout/explorer or combat-commander first person yet: both need the avatar to see more than the team knows, which breaks the observed-knowledge rules, or need a fight camera the sim cannot feed.
- **Yes, people can come up and give reports, and it should be the spine of the mode.** A report is one pure read-model item (kind, source, basis, age, a "go and see" place), delivered by a real resident who really walks to you and really leaves their work to do it. The same item feeds the existing pins and priority stack when you are in the RTS view, so there is one truth and two presenters, never a second alert feed.
- **The mode earns its keep only if it costs something.** No free actions: the avatar owns nothing, carries nothing, sees nothing the team has not seen, and acts only through the typed commands that already exist. Reporters are paid for in lost labour. Time keeps running; speed is capped at 2x while you walk and drops to 1x during a conversation.
- **The hard technical truths** (all from the source, not guesses): the terrain grid is **256 cells over 1040 m, about 4.06 m per cell**, so at 1.7 m eye height the ground facets show unless shading and ground cover hide them; the RTS camera never goes nearer than 14 m, so **no building has ever been seen from the ground by anyone**; there is **no pointer-lock code and no interior for any building**; `world.ts` is 3,133 lines with one orbit camera that eight places read. None of these block the plan. They set the order of work.
- **Six decisions for Boris** are at the end, each with a default. The defaults keep scope small enough to ship Phase 1 and 2 without touching `sim.ts`, saves or the Worker protocol beyond one new read-model kind.

Claims I could not source from this repository are marked **(unverified)** and collected in the last section. Real games are named only as inspiration for a feel, never as a source of facts.

## Phases (no time units; each ends in a native check)

| Phase | Ships | Touches | Done when (native evidence on the 8 GB M1, built game) |
|---|---|---|---|
| 0. Seam | A `viewMode` on the engine (`orbit` default, `walk`), one camera-pose override path in `updateCamera`, `this.dist`-consumers audited, near plane and shadow frustum set per mode, pointer-lock input layer, escape back to orbit with the same look-at | `world.ts`, `engine.ts`, `keyboard.ts`, new `src/scene/firstPersonView.ts`, `src/game/firstPersonInput.ts` | Toggle in and out 20 times without drift; orbit pose restored exactly; p95 frame time at the village in walk view recorded next to orbit at the same seed |
| 1. Walk | Capsule avatar on the real height field, slope and water limits, building and tree collision, sprint, 3D audio listener at the eye, comfort options, photo/inspect | new `firstPersonAvatar.ts`, `audio.ts` listener hook | Screenshot at eye level in a real village; walking the full village loop without leaving the walkable set; no entry into a footprint in a 10-minute scripted walk |
| 2. Reports | `fp-reports` read model, reporter errands through the existing `move` command, report card, short replies mapped to existing dispatch commands, cadence rules, pin and stack interlock | new `src/game/reports.ts` (pure), one `EngineReadQuery` kind, `src/ui/hearth` card | Six situations in a real save each produce the correct card from real state; a refused command shows the engine's own reason; a resolved problem withdraws its report before delivery |
| 3. Audience | Hall interior (one room kit), seat anchor, petition queue from the same read model plus council and diplomacy | new `roomKit.ts`; `rulersView`, `leaderDialogue` reused | An audience with an envoy and an elder in a real save, answers dispatch real treaty or trade commands |
| 4. Ride along | Camera on a villager's eyes, first-person arms and tool, diegetic needs | `characterRig` socket reads, new arm rig | Rides a farmer for a full day cycle; needs cues appear only when `hunger`, `thirstSeconds` or `coldSeconds` cross their real thresholds |
| 5. Reach | Facade rule upgrades (selected interiors), more reporter roles, rival-society audiences, optional voice-free subtitle polish | per building family | Each added interior passes the interior checklist below |

Each phase is independently shippable behind a switch (`?view=walk` first, a Menu toggle after), so a bad phase never blocks the visual and bug pass.

---

## 1. What first person is for

### The question to answer
Hearthwild's pitch is an honest, physical simulation: finite goods, real labour, observed knowledge. The RTS camera shows the total; it cannot show **presence**. The things worth seeing at eye level are the things the sim already models and the orbit view flattens: who is thirsty, how the granary actually looks when it is full, how far the well is from the fields, where the smoke is, a stranger at the gate. First person is therefore not "a second way to play". It is a **window on the same simulation that makes its facts legible and costly to ignore.**

### Modes compared

| Mode | What you do | What it shows that RTS cannot | Sim cost | New systems | Conflict with the rules | Verdict |
|---|---|---|---|---|---|---|
| **Walk** (free-roam, eye level, your village) | Move, look, approach people and buildings, listen | Scale, distance, density, the daily rhythm, who comes to you | None to the sim (presentation only) plus errands in Phase 2 | Camera rig, collision, avatar, report layer | Low if the avatar is a bodiless witness | **Primary** |
| **Audience** (ruler's seat, hall interior) | Sit, hear petitions in order, answer | Rulers, factions, envoys as people; ties the council UI to faces | None beyond reports; reads `rulersView`, `leaderDialogue` | One interior room kit, seat anchor | Low: every answer is an existing command | **Secondary 1** |
| **Ride along** (a villager's eyes) | Watch their work, needs, load, route; optionally redirect them with existing orders | Hunger, thirst, cold, carrying, terrain effort as lived; best proof the sim is physical | None (read-only camera) plus first-person arms | Arm rig, needs cues | Low if read-only; "possession" that gives free actions would break it | **Secondary 2** |
| **Photo/inspect** | Freeze the view, free-look, inspect an object up close, capture | Craftsmanship, materials, wear, art | None | A pause-friendly look mode and a capture button | None | **Free with Walk** (no separate build) |
| **Scout/explorer** | Walk beyond the border | Discovery from the ground | Needs the avatar to see | A vision source for the avatar | **High.** The avatar would see for the team. Either it reveals fog for free, or it is clamped to the explored set and adds nothing | **Not now.** Revisit as "ride along on a scout unit", which keeps the unit's real sight radius |
| **Combat commander** | Command from the field | Morale, formations, a flank | Needs fast-moving camera tied to units, selection, and orders under fire | A battle camera, order UI in FP | **High.** Command in first person is slower than the RTS view and the sim has no fight camera feed. Real value is small | **Not now.** Combat can be watched through Ride along on a soldier later |

### Recommendation
1. **Primary: Walk**, because it has the highest value per unit of risk, needs no sim change, and carries the report idea (people come to you) which is what makes first person more than a screenshot tool.
2. **Secondary 1: Audience**, because rulers, factions and envoys already exist as data (`rulersView.councilModel`, `leaderDialogue`, `diplomaticVoice`, `capitulationOffers`) and are currently shown only as panels. A seat and a line of people turns them into scenes without new rules.
3. **Secondary 2: Ride along**, because it is the strongest demonstration of the physical sim (needs, load, terrain, tools) and is read-only by default.
4. **Why not the others first:** scout and combat first person would need the avatar to know things the team does not, or a fight camera the sim does not feed. Both are better served later as Ride along on a specific unit, which inherits that unit's real knowledge.

### Reference feel (inspiration only, from memory, **unverified** as to details)
Walking through your own settlement and talking to people in halls (Mount & Blade's town and hall scenes); a quiet walk-and-look mode over a simulated place (city builders with a street-level camera); a fortress-versus-adventurer split where the same world is read from the ground (Dwarf Fortress). Nothing is copied; these name a feel, not a feature set.

### What the avatar is (the most important rule)
**A bodiless witness** in Phases 1 to 3: a capsule that collides with terrain, water, buildings and trees so you cannot walk through a wall, but that **owns nothing, carries nothing, trades nothing, fights nothing and has no sight radius of its own**.
- It can stand only where the team already has vision: `visibleAt` or `exploredAt` for the position, both in the Worker render-query allowlist (`simulationRenderProjection.ts`). In your village that is always true; at the border it stops you. The mode never reveals fog.
- It cannot take or hand over goods. Anything that moves goods is a command to a real person (see section 4).
- Other people do not know you exist (the sim has no entity for you). Presentation-only soft rule: a unit that comes within 0.8 m of the eye is hidden by a near-plane fade rather than stopped. (A sim-side "yield to the player" would be a rules change; it is out of scope and noted as a risk.)
- A real unit as avatar (the ruler as a `Unit`) is a Phase 5 option. Whether the ruling person exists as a `Unit` in the player's community at all is **(unverified)**: `rulersState.ts` holds a `dynasty` of people records, while `peopleLook.roleOf` and `characterRig.bodyClassFor` name a `leader` unit type used for rival leaders.

---

## 2. "People come up and give reports"

### The idea, restated
Not a notification feed with faces on it. A **report is information that a particular person has, got in a particular way, and chooses to bring to you now**. The person is real, walks a real path, costs real labour, can be wrong, and the same fact stays available in the RTS UI whether or not you were there to hear it.

### One model, two presenters
A new pure function `reportsFor(game, team)` in a new `src/game/reports.ts`, exposed as one new `EngineReadQuery` kind `fp-reports` (the existing pattern in `engineReadModels.ts`: a typed query validated by `isEngineReadQuery`, answered by `applyEngineReadQuery`, safe to call on the Worker). Its output is the single list that both presenters read:

- **RTS view:** the existing pins and priority stack (`src/ui/hearth/glance*.ts(x)`, `VillageAlerts.tsx`) read the same items. A report that has not been delivered shows as a pin or a stack chip, exactly as today.
- **First person:** the same item is delivered by a reporter walking up.

```
Report = {
  id            // stable: kind + subject id, so a re-computed report is the same report
  kind          // 'need' | 'find' | 'threat' | 'trade' | 'grievance' | 'rite' | 'envoy' | 'rumour'
  tier          // 'urgent' | 'routine' | 'ambient'
  source        // the real Unit id who carries it, chosen by role (below)
  basis         // 'witnessed' | 'told' | 'rumour'
  observedAt    // sim seconds, for the "x ago" line and for staleness
  claim         // short structured facts, never prose: {subject, quantity band or exact, place}
  place?        // where to "go and see" (becomes a pin; walking there can confirm or contradict)
  replies       // 2 to 4 typed choices, each mapping to an existing EngineDispatchCommand or to 'later'
  resolvedBy?   // sim condition that withdraws the report before delivery
}
```
No prose is stored. The line the person says is composed from `claim` plus the per-civ phrasebook (below), so wording changes never change meaning and nothing is invented.

### Who walks up, and what real state triggers them

| Who | Chosen how (real unit state) | Brings | Triggered by (real sim state) | Basis and bias |
|---|---|---|---|---|
| **Steward** | A resident who works the hall or a storehouse, else the longest-serving adult near the hall (`roleOf` reads type, age, farm tool, trading, live recipe) | Needs and workload | The same counters `VillageAlerts` reads: `hunger >= 60`, `thirstSeconds >= SURVIVAL_RULES.thirstGraceSeconds`, `coldSeconds >= coldGraceSeconds`, blocked by full stores (`workReason` contains "cache full"), harvest backlog (`harvestBacklogAlert`), workload over 100% (`measureVillageWorkload`) | Witnessed for what is at the hall and stores; told for fields and camps. Frames **shortages first**, rounds numbers to bands ("a few", "most"), never drops a critical one |
| **Scout** | A unit with a scouting task or one that just returned (`scouting.ts`, `scoutProvisions.ts`) | Finds | A newly surveyed fibre patch, clay deposit, wild herd, water, a coast, or a stranger sighted, from the knowledge sets the sim already keeps (`fibre.patches[].knownTeams`, `clay.deposits[].surveyedBy`, wild-craft "afield" rows) | Witnessed; exact place; **age shown** because the thing may have moved |
| **Elder** | An elder-class person (`bodyClassFor`) in the community | Grievances and factions | `councilModel` faction loyalty under a threshold or a stated `demand`, unrest stage, a standing claim (`casusLines`), a succession handover | Told; **leans toward the tradition faction**; speaks in the faction's own terms, never exact loyalty numbers |
| **Merchant** | A visiting trader or an owned caravan carrier (`visitors.ts`, `caravans.ts`) | Offers and prices | An offer or caravan arrival; `tradeIntel`, `tradePricing`, `tradeQuotes` | Told; **has an interest**: the quote is real but the "best price" framing is theirs; shows the date the price was seen |
| **Captain** | The commander or a guard on duty (`commanders.ts`, `guardDuty.ts`) | Threats | `musicMood() === 'raid'` or an observed hostile near home, a raid report (`raidReports.ts`), a captive escape risk (`captivity.ts` resistance) | Witnessed if their own sight, else told; **leans to alarm**; counts as bands unless counted |
| **Priest** | A resident whose role is priest if one exists; else the elder | Rites and morale | Death, birth, marriage, mourning, ruler events (`RulerEventToast` already derives these), a foster or hostage change (`wardLines`) | Told; **only reports events the sim logged**; does not invent omens |
| **Rival envoy** | The real carrier of a `diplomaticMessage` (`g.state.diplomaticMessages`, `carrierId`, phase `delivered`) or a first-contact stranger (`encounters.ts`) | Proposals, peace terms, tribute, refusals | The same data `leaderDialogue` already reads | Told and **may be guarded or proud** per `diplomaticVoice` manner; never given your stock; shows only what that society has observed of you |
| **Anyone, far news** | A passer-by, trader or refugee carrier | Rumour | `fame.ts` pulses with tier `whisper` to `renown`, delivered only through real carriers | **Rumour**; vague tier word, never exact numbers; the model already enforces this |

Priest and elder data are partly **(unverified)** as sources: faith as a mechanic beyond the `priests` faction and the temple building is not something I found in the sim. If it is absent, the priest is removed from Phase 2 and the elder carries rites.

### Truthfulness: witnessed, told, rumour
Three rules, enforced in `reportsFor`, tested like the rulers facts tests:

1. **No fact the reporter's society could not know.** The source unit's own observation or the society's dated intel (`intelOf`, `observedAt`, the informationCustody and fog provenance modules). A reporter who has not been to the far camp does not report on it; the steward says "no word from the camp".
2. **Bias selects and frames; it never invents.** Numbers are exact only if witnessed at the reporter's own place of work; otherwise a band ("a few", "about half", "most"). The order of items, the adjectives and what leads are bias; the underlying fact is read from state. No lies from your own people in v1. A rival envoy may withhold, but may not state a falsehood about the world (it can state its own stance, which is not a fact claim).
3. **Everything is checkable.** A report with a `place` becomes a pin. Walking there and seeing it (position inside the team's visible set, which is the existing sim rule) marks the claim **confirmed**, **changed** or **gone** on your next visit with that reporter. A reporter whose claims prove stale or wrong repeatedly is shown less in the order of delivery (a presentation weight, not a sim state), so trust is something you can feel.

### Cadence and priority (so it never becomes spam)
- **At most one reporter in play at a time.** The queue is ordered by tier, then age of the underlying problem, then role rotation.
- **Urgent** (raiders sighted, someone past thirst grace, fire) interrupts at once. It re-fires only if the underlying value worsens by a stated step (for example one more person thirsty), never on a timer.
- **Routine** (needs, workload, trade, grievances): bundled **per role into one card**, delivered at most a small fixed number of times per in-game day, and only when you are idle (not mid-conversation, not mid-inspect).
- **Ambient** (finds, rumours, rites): delivered in a lull, and only the freshest per kind. Stale ambient items quietly become ledger lines.
- **Resolved withdraws.** If the sim stops being true before the walker reaches you (the well was built, the raiders left) the report is cancelled and the person turns back, and the ledger notes "resolved". Nothing stale is ever spoken.
- **Ignore twice, it parks.** The report becomes a pin (and a chronicle line) and the reporter goes back to work. Parking never deletes information; the RTS UI still shows it as long as it is true.
- **Everything has an off switch** by tier (Menu: Reports: all, urgent only, none) and a Quiet mode that suppresses walkers but keeps pins. The existing proposal for per-category event filters (`AUD-UI-EVENT-FEED-FILTER`) is the same control surface; build once.
- **In the RTS view nothing walks to you.** The same items appear as pins and stack chips under the existing priority rules, so a player who never uses first person loses nothing.

### The reporter is real and it costs
A walking report is a real resident leaving real work. Phase 2 uses the **existing `move` command** (`EngineDispatchCommand` `{kind:'move', unitIds, x, z}`) to send the chosen person toward the avatar's position, and the existing automation to take them back. No new order, no new save field. Rules:
- Only people **without a task commitment** (`hasTaskCommitment`) are eligible. A steward in the middle of a delivery cannot come; the steward waits, and the card says so by the person being visibly busy.
- The walk takes real seconds and real labour; the time is simply not worked. That is the price of being told, and the argument for bundling.
- Presentation-only fallback (if sending a person turns out to destabilise the work board): the nearest eligible person is chosen and drawn walking toward you **only inside the player's view**, with no sim effect. This weakens "costs something", so it is the fallback, not the plan. Which is safe is **(unverified)** until Phase 2 is tried on a real save.

### How the player replies
Every card has **at most four replies**, short verbs, the first one is the default on Enter. Replies come in three kinds:

| Kind | Example | What it sends |
|---|---|---|
| **Choice** | "Dig a well", "Hold the gate", "Accept the offer" | One existing typed command through `engine.dispatch` (see map below); the engine's refusal reason is shown verbatim |
| **Gesture** | Look at a building or person, press the order key while the reporter waits: "Send them there" | The same command with a target taken from the crosshair (`construction-priority`, `order-construction`, `move`, `guard-duty`, `hold-selected`) |
| **Delegation** | "See to it" | Turn on the automation the sim already has for that domain (`set-auto-work`; drinking water is already automatic). The button exists **only where such automation exists**; it is absent otherwise. No new autopilot is invented here |

Plus two non-command replies on every card: **Later** (parks it) and **Show me** (the reporter leads you to the `place`; you walk, they walk, nothing is spent but time).

Reply to command map (all exist today in `engineDispatch.ts`):

| Situation | Reply | Command |
|---|---|---|
| Thirst, no well | "Dig a well" | opens the build flow in the RTS view (placement stays in RTS); `queue-construction` or `order-construction` when a plan exists |
| Hunger, harvest exposed | "Bring it in" / "See to it" | `set-auto-work` (enabled) |
| Raiders sighted | "Sound the horn" / "Hold" | `defense-horn`, `hold-selected`, `guard-duty` |
| Find: clay, fibre | "Send gatherers" | `survey-clay`, `gather-clay`, `survey-fibre`, `gather-fibre` |
| Trade offer | "Accept" / "Refuse" | the trade proposal path (`TradeProposal.tsx`, contact actions) |
| Envoy, peace terms | "Accept the terms" | `leaderDialogue` choices (`kind:'peace'`, `settlePeace`) |
| Grievance | "Hear them" / "Give way" | `marry-houses`, `foster-houses`, `exchange-hostages` as available; otherwise "Hear them" only, with no command |
| Capitulation | "Accept" / "Refuse" | `accept-capitulation`, `refuse-capitulation` |

Anything with no existing command offers only **Later** and **Show me**. That is a feature: the mode will not pretend you can act when the sim gives you no way to.

### Interlock with alerts, pins and the council
- **Same ids.** A report's `kind` and subject id match the pin's. Delivering a report marks the pin "heard" (no longer pulsing); it does not remove it. Only the sim resolving the problem removes it.
- **Same stack rules.** Urgent shares the one sticky critical slot of the priority stack; a delivered urgent report and its stack card are the same card, not two.
- **Council and Society tabs** are the long-form of elder, envoy and priest reports; a report links to its tab ("Open in Council"). The ledger of past reports is the chronicle the UIUX proposal found missing (`UIUX_PROPOSAL.md`: "there is no chronicle hook the HUD can write to"); this model is that hook.
- **Hearth size floor applies:** text 16 px, icons 24 px, controls 48 px minimum. The card is the standard Hearth panel; no new visual language.

### Dialogue style guidelines
1. **Under 14 words per line, two lines per card.** The numbers and the icon carry the rest.
2. **Lead with the fact, then the ask.** "Two are thirsty. The old well is dry." Not "I am afraid I must bring grave news."
3. **One register per civ, from the civ bible** (`civStyles.ts` names, `cultureGrammar`, `peopleLook`): plain and blunt for hillfort tribes, formal and indirect for river-court realms, trade-terse for caravan peoples, courtly for sea republics. A civ-specific phrasebook is a small table of 6 to 10 stems per report kind, not generated text.
4. **No fantasy filler.** No "my lord" unless the polity form says so (`rulersView.polity`). Titles come from the society's own law, not a default.
5. **Say what you know and how.** One of three tags, in the voice: "I saw", "I was told", "they say". That is the witnessed/told/rumour basis made audible.
6. **State age when it matters.** "Seen at dawn" or "four days ago", never an unqualified present for old news.
7. **No names the player has not learned.** A person is "the steward" until they have a name the sim gave them (`personName`).
8. **No voice acting.** Text only, captioned, with a short non-verbal sound cue (cloth, breath, a word's rhythm) so audio supports but is never required. A subtitle is the dialogue, not an addition to it.
9. **Refusals are plain.** "No." "Not yet." Use the engine's own refusal reason for command failures; never soften it.

### Six worked situations
Civ names are the game's own invented ones from `civStyles.ts`. Format: who, basis, what is on the card, replies.

**1. Steward, urgent need (Brythen, hillfort tribes; witnessed)**
> "Two are dry. The brook is cut off." *[Water: 2]*
> Replies: **Dig a well** · **Show me** · **Later**

**2. Scout, a find (Sahelan, savanna trading towns; witnessed, exact place, age shown)**
> "Clay at the dry bend. Seen this morning." *[pin: dry bend]*
> Replies: **Send gatherers** · **Show me** · **Later**

**3. Elder, grievance (Hanrei, river-and-mountain realm; told, frames by faction)**
> "The wardens want the north wall higher. They say it quietly." *[Wardens: restless]*
> Replies: **Hear them** · **Later**
> (No numbers. Faction loyalty and demand come from `councilModel`; the card never prints the loyalty value.)

**4. Merchant, an offer (Sandrill, rock-cut caravan city; told, price age shown)**
> "Salt for hides, the same as last market. Price from six days back." *[offer card]*
> Replies: **Accept** · **Refuse** · **Later**

**5. Captain, a threat (Steppan, felt-yurt riders; witnessed, count as a band)**
> "Riders on the ridge. A dozen, maybe more." *[pin: ridge, edge arrow]*
> Replies: **Sound the horn** · **Hold the gate** · **Show me**

**6. Rival envoy, a proposal (Aureline, marble sea republics; guarded manner, per `diplomaticVoice`)**
> "My city offers peace on these terms. We name no one who sailed with us." *[terms list]*
> Replies: **Accept the terms** · **Refuse** · **Ask what they want**
> (The terms come from `leaderDialogue` / `PeaceTerm`; the envoy's stance is the voice, not a hidden fact.)

A **rumour** variant (not counted above): any passer-by, basis `rumour`, "They say a far city built something large. I know no more." (`fame.ts` tier `whisper`; no replies but **Later**.)

---

## 3. Technical feasibility (this codebase, 8 GB M1)

All figures labelled "estimate" are from reading code and the existing budget memo `docs/parallel/handoffs/claude-8gb-budget.md`, which is itself an estimate. **Nothing here has been measured on a device.**

### What the code gives us
| Need | Existing piece | Fit |
|---|---|---|
| Camera | One `THREE.PerspectiveCamera(38°, near 0.5, far 860)` driven by an orbit (`look`, `dist` 14 to 230, `yaw`, `pitch`) in `world.ts updateCamera` (line ~1249) with `FixedOrbitCameraCollision` and `cameraClearance.ts` | A second pose path is easy; the orbit collision must be bypassed in walk mode |
| Orbit consumers | `this.dist` is read in 8 places in `world.ts`, notably the building cull radius `8 + dist*.12` (line ~1912); 32 UI references to `view.dist/yaw/look` | Must audit; in walk mode the cull must be frustum-wide, not a 10 m bubble |
| Input | `KeyboardCommands` (`keyboard.ts`), W A S D Q E arrows PageUp/Down pan the orbit; digits 1 to 9 quick build; Ctrl/Alt digits groups | FP takes W A S D and arrows in its own mode; no conflict because the modes are exclusive. **No pointer lock exists anywhere** (`grep` finds none): new |
| People | Shared 7-bone rigid rig (`characterRig.ts`), instanced, LOD near < 35 m full animation, mid < 70 m, far static (`ANIMATION_DISTANCES_METRES`); budgets 2,400 / 1,700 / 900 triangles, typical near 1,500; life layer (breathing, sway, gestures) near only | Ideal at eye level; **the near tier has never been seen under 14 m**, so face and hand detail is untested |
| People data | `roleOf` (real roles), `individualFor` (stable identity), `peopleLook` (per-civ garb), held-item sockets `itemR` `itemL` | Reuse for reporters and for the first-person arm tool |
| Sim access | Worker owns the sim; the display copy is a read-only projection (`simulationRenderProjection.ts`) with an allowlist including `height`, `waterAt`, `travelHeight`, `visibleAt`, `exploredAt`, `solidBuilding` | The avatar can run entirely on the display copy |
| Commands | `engine.dispatch(EngineDispatchCommand)` and typed read models (`engineReadModels.ts`), validated and Worker-safe | All replies go here; **one new read-model kind** is the only protocol addition |
| Audio | `proceduralAudio.ts` takes `listener:{x,z,yaw,dist}`, `emitterGain` uses stereo pan and a camera-distance rolloff; ambient layers are gains from real biome, season, hour, water, fire (`audioState.ts`), "no ambient audio files exist yet" | Set the listener to the eye and a near distance; positional work is already there but is **2D stereo pan, not HRTF 3D** |
| Walkability | `Game.walkable(x,z)`, `terrainWalkCache.ts` (exact grid per sea level), `travelHeight`, `solidBuilding`, footprint test `abs(dx) < w*.4` in `sim.ts`, pens in `penGeometry.ts` | Collision can match what units already obey, so you stand where people can stand |

### Camera rig
A `walk` pose: eye at feet height + **1.55 m** (derived, now measured from the rig: head pivot y 0.93 in `RIG_PIVOTS` times the adult body scale 1.65 in `world.ts` line ~2199 = 1.53 m to the head centre; per-civ `body.height` 0.97 to 1.05 gives 1.49 to 1.62 m, and `stature` varies each person, so 1.55 is the average adult eye, and children at scale 0.64 see from about 1.0 m). Yaw and pitch from the pointer, pitch limited to about plus/minus 80 degrees. Differences from orbit that must be explicit:
- **Near plane** 0.5 is too far for a hand or a doorway; use about 0.1. The far plane is not 860 any more: draw distance **Medium sets `camera.far` 1,400** (tree far 1,100, people far 900, fog scale 0.82; measured from `getDrawBands()`). Depth resolution at 24 bits is `d^2 / (near * 2^24)`: with near 0.1 about 6 mm at 100 m, 9.5 cm at 400 m, 60 cm at 1,000 m and 1.2 m at 1,400 m (near 0.5 is five times finer). No z-fighting was visible in any of the eye-level frames taken, so this stays a watch item, with reversed or logarithmic depth as the fallback.
- **Vertical FOV** 38 degrees is a telephoto RTS view; walk should default around 55 to 65 vertical (about 85 to 100 horizontal at 16:10), user-adjustable.
- **Shadows are off by default** (`GRAPHICS_RULES.defaultShadows = false`), so at the default setting people and buildings carry only the blob contact shadow, which looks pasted on at eye level. When on, the frustum is ±110 m on a **512 map at Medium (0.43 m per texel) or 1,024 at High (0.21 m)**; see finding F4. Walk mode should turn shadows on by default and centre a tighter frustum (about ±40 m, 0.08 to 0.16 m per texel) on the avatar.
- **Fog** `FogExp2 0.0034` and the painter fog are tuned for overhead haze; at eye level they shorten the horizon dramatically. A mode fog setting is needed.
- **Sun, sky disc and glow** follow `camera.position`; they work unchanged.

### Terrain at eye level (the biggest visual risk)
`SEGS = 256` over `MAP = 1040` is about **4.06 m per height cell**, bilinear in `game.height`. At 1.7 m eye height each facet is larger than a person. Mitigations, cheapest first:
1. **Smooth vertex normals** and the existing painter terrain shader detail in the fragment stage, so shading does not reveal the grid.
2. **Near-field ground cover**: grass tufts, pebbles, bracken, which `painterGround`, `biomeVegetation` and the ground-cover quality setting already produce at medium/high (off at `low`).
3. **Do not add geometry that disagrees with the height field.** Units and feet use the bilinear `game.height`. Extra tessellation is fine only if it samples the same field; any invented bump the avatar cannot stand on is a lie. Micro-detail is shading and props, not shape.
4. Path and trail ribbons (`trailRibbons.ts`, `trails.ts`) already follow the surface and will read well at eye level.
5. A 1 m local re-tessellation ring around the avatar is the escalation if 1 to 3 fail **(unverified)**.

### Near-LOD people
Mid and far tiers are fine. The near tier (35 m) is reached when the avatar is within 35 m of a person, so the **reporter at 2 m is the highest-detail person in the game and nobody has inspected them at that range**. Phase 0 includes a close review of the rig at 1 to 3 m for each civ: face, hands, garment edges, held tools. If it is not good enough the choice is a **rig-near-2** tier (more detail only within about 6 m, only ever one or two people at once) rather than raising the global near budget. Instance cost is already shared by outfit.

### Building interiors and entrances
No building has an interior today (`improvedHome.ts`: "empty interior only"; `classicalBuildings.ts`: "broken/open doorway ... keeps interior depth visible at RTS scale"). **Rule: every building type must carry either a real interior or a facade rule, declared in a table, and no building is enterable until its row is ticked.**

| Class | Rule | Examples (from `BUILD_ORDER`, `buildingFamilies`) |
|---|---|---|
| **A. Enterable, one room kit** | A single reusable room (floor, four walls with openings matching the facade door, roof underside, hearth or lamp, a few props from real state) generated from the building's own footprint and family | Town hall (Audience seat), hut, house (one room), temple, barracks |
| **B. Threshold only** | Door is a real opening 1.2 m deep with a dark stage behind it; you stop at the sill; the occupant comes to the door when present (`Unit.shelterId` is real state) | Workshop, storehouse, granary, market stall |
| **C. Facade only** | Closed door leaf; knocking or approaching has the worker answer outside; windows lit at night only when `shelterId` occupants are inside | Mills, forges, docks, anything where entering is not the point |
| **D. No entry, ever** | Fences, pens, quarries, farms, wonders | Open yards |

Phase 3 builds exactly one class A kit (the hall). Houses are class C until the room kit exists. A building that has no declared row **is not enterable and the avatar does not collide through its door**. An interior must also show **real** contents only (the stores it actually holds, `StorehouseInventory`), never decorative stock; the existing note in `improvedHome.ts` ("delivered game materials are not decorative stock") already says this.

### Collision and walking
- Feet follow `game.height` (bilinear). **Water:** `waterAt` over about 0.9 m blocks; shallow wading slows (rule parity with the unit walk mask is **(unverified)**; use `Game.walkable` so the avatar and units agree).
- **Slope:** a maximum walkable gradient from the height field (start near 35 degrees; tune), sliding along steeper ground rather than stopping dead.
- **Buildings:** footprint rectangles as `solidBuilding` does (`abs(dx) < w*.4`), expanded by the capsule radius (0.35 m), plus door openings only for classes A and B.
- **Trees, rocks, fences:** circle or segment colliders from `state.trees`, resource nodes and `penGeometry`. Tree trunk radii per species are **(unverified)** in the sim; the botanical set has trunk taper, so use the render radius at 1 m height.
- **Units:** not colliders (the sim does not know the avatar). The near-plane fade handles overlap.
- **Terrain edits** (trenches, canals, excavation) change `terrainRevision`/`navigationRevision`; the avatar re-queries on a revision change so it never stands inside a new trench.
- **Bridges** use `travelHeight` (it includes bridges, `crossings.ts`).

### Audio
Move the listener to the eye (`listener = {x, z, yaw, dist ~ 1}`), so footsteps, tool strikes, fire, water and murmur gain rise as you approach. Today's spatialisation is a stereo pan plus distance gain (`createStereoPanner`), good enough for orientation; it is **not** binaural 3D and does not model occlusion by walls or interiors. Needed: per-building low-pass for sounds heard through walls (a filter and a gain per emitter class, cheap), a footstep set by surface (grass, stone, wood, snow, shallow water) from the biome and a ground-class lookup, and breath and cloth layers for Ride along. Ambient layers are **gains with no sound files yet** (`audioState.ts` header); first-person needs those assets to feel alive. That is an asset request, not an engineering risk.

### Animation needs
- **Walk and Audience:** none (a witness has no body).
- **Reporters:** existing clips `walk`, `idle`, plus the life layer's gestures. Needed: an **arrive-and-face** blend (stop 1.5 m away, face the eye, a small beckon or bow clip) and a **hand-over** gesture; both are pose edits on the same 7 bones (`animationClips.ts`).
- **Ride along:** first-person **arms and held tool**. The rig has `itemR`/`itemL` sockets and per-bone parts; a first-person view renders the two arm bones and the item at a different scale and near plane. This is the largest new animation item. It reads the same real clips (hoe, chop, carry), so no new gameplay logic.
- No skinning is involved anywhere (instanced rigid bones), so first-person arms cost two extra instances, not a skinned mesh **(estimate)**.

### Shadows and lighting
Tight sun shadow frustum centred on the avatar (above); contact shadow under people stays as is; interiors need a lamp or hearth point light (one at a time, as `world.ts` already has a single `hearth` PointLight) and no cast shadow. Night: eye-level darkness is a visual and an accessibility concern (brightness floor option).

### Performance cost per mode (estimates, unmeasured)
| Mode | Draw cost vs orbit | Why | Main risk |
|---|---|---|---|
| Walk | Similar to a close orbit view, usually lower: the horizon is blocked by buildings and trees | Fog and occlusion drop the far set; the near set is dense | Dense forest at eye level pushes the tree near tier (impostors beyond 40 m, per the budget memo); instance caps (`instanceCapacity`) need a check |
| Audience | Lowest: one room | Interior only, hall exterior culled | Light count |
| Ride along | Walk plus two arm instances | Same | Camera shake and motion comfort, not GPU |
| Photo/inspect | Walk, paused | Sim paused (`pause` command) | None |

Hard budget reuse: p95 frame time under 33 ms at Low and under 22 ms at Med (from the budget memo); pixel caps of 0.8, 2.1 and 3.2 million pixels at low, med, high (`graphics.ts`); shadows default off. **First person must pass the same budgets**, measured, not assumed. A frame in walk mode may be slightly heavier on near-field instances and lighter on distance.

### What it reuses, what is new
**Reused:** `world.ts` render layers (terrain, trees, buildings, people, water), the Worker display projection, `terrainWalkCache`, `solidBuilding`, `Game.walkable`, `characterRig` and `peopleLife`, `peopleLook` roles and individuals, `engineReadModels`/`engineDispatch`, `rulersView`/`leaderDialogue`/`diplomaticVoice`/`fame`, the Hearth panel kit, pins and priority stack, `proceduralAudio` listener.
**New:** `firstPersonView` (pose, near plane, fog, shadow frustum), `firstPersonInput` (pointer lock, drag-look, key look), `firstPersonAvatar` (collision), `reports.ts` (pure), one `fp-reports` read-model kind, report card UI, a room kit (Phase 3), first-person arms (Phase 4), a surface footstep table and wall low-pass in audio.

### Risks
| Risk | Why it matters | Mitigation |
|---|---|---|
| Terrain facets at 4.06 m cells | The first thing a player sees at eye level | Shading, ground cover, props; never invent geometry the avatar cannot stand on |
| Orbit state is global in `world.ts` | Eight `dist` reads, 32 UI reads; a mode flag can leak | Phase 0 audit and a single `viewMode` gate; `look` kept valid for the minimap and edge pins |
| Pins and screen projection assume the RTS camera | World pins project with `project()` and edge arrows assume a ground-plane view | Re-test pins in walk mode; arrows still work off the same `project()` |
| Near-tier people are untested at 1 to 3 m | A reporter is the most inspected person in the game | Phase 0 close review per civ; a near-2 tier if needed |
| Reporter errands disturb the work board | A resident leaving work could drop a job | Task-commitment gate; presentation-only fallback; native test on a real save |
| No pointer lock on trackpads | The tester uses a laptop; a bad look control is a dealbreaker | Three look schemes (lock, drag, keys), see section 5 |
| Fog of war leak | Standing at an eye can see across a ridge into unknown land | Render only explored/visible; clamp the avatar to the known set; never grant vision |
| Photo mode captures secrets | A capture could include hidden info | The renderer already draws only what the display copy holds; the clamp above applies |
| Whole-game budget | An 8 GB Mac; one expensive process at a time | Each phase measures p95 and memory; Phase 0 gate before any new content |
| Interiors multiply art cost | Every building family needs a room | The declared class table; one kit first; classes C and D never need one |

### Staged build order and acceptance checks
Native evidence means: the built game on the owner's 8 GB M1 (not the sandbox, which lacks `three`), a named save or seed, a screenshot, and a short measured note. Documentation-only changes need none (`AGENTS.project.md` execution policy).

1. **Phase 0, Seam.** Add `viewMode`. Checks: toggling 20 times returns the identical orbit pose; `tsc` clean; orbit frame time unchanged within noise; shadow frustum, near plane and fog switch cleanly.
2. **Phase 1, Walk.** Checks: eye-level screenshots of a fresh village and a mature village; a scripted walk never enters a footprint or deep water; slope behaviour on a hillside; frame-time table for low, med, high; audio footsteps and ambient heard at the eye.
3. **Phase 2, Reports.** Checks: for each of the six situations, set up the real state in a save (thirst, a find, a faction demand, an offer, a raider sighting, an envoy) and capture the card; resolve the state and confirm the report is withdrawn; confirm no dispatched command bypasses an engine refusal; confirm no two reporters at once.
4. **Phase 3, Audience.** Checks: a real hall renders an interior from its own footprint; a peace term accepted in the audience equals the same term accepted in the Society tab (same resulting state).
5. **Phase 4, Ride along.** Checks: needs cues start and stop at the real thresholds; no cue appears for a state the unit does not have; arms and tool match the real clip.
6. **Phase 5, Reach.** Each new interior ticks the checklist: footprint match, real contents only, light, collision, exit, audio low-pass, performance.

Dispatch and read-model tests follow the existing style (`scripts/*.test.mjs`, such as `rulers-facts.test.mjs`): reports are pure, so they are testable without the renderer.

---

## 4. Interaction with the simulation

| Rule | Design |
|---|---|
| **No free actions** | The avatar has no inventory and no body in the sim. Every effect is an existing typed command to a real person. Commands refuse for the same reasons they do today and the card prints that reason |
| **Finite goods** | Nothing is created, shown or handed over by the avatar. A reply that moves goods (trade, tribute) is the existing exchange, which already conserves goods. First-person arms show a real carried load, never a duplicated one |
| **Observed knowledge** | The avatar sees only the team's visible and explored set. Reports contain only what the reporter's society observed, with its observation time. Rumour carries through real carriers only (`fame.ts`). The avatar's eyes add no new knowledge |
| **Costly attention** | A reporter leaves real work; a long conversation holds a real person and the clock keeps running |
| **Time compression** | The sim runs while you walk. Walk is capped at 1x or 2x (the engine's `speed` is `1\|2\|4`); entering a conversation drops to 1x and restores your previous speed afterwards. Eye-level at 4x is a time-lapse and is blocked in first person **(proposed; Boris decision 3)** |
| **Pausing** | Space still pauses. Paused first person lets you look, inspect and capture. Replies given while paused are accepted or refused by the same rules the engine applies to paused orders **(unverified for each command)**; the safe default is to queue the reply until play resumes if a command refuses while paused |
| **Day and night** | Daylight is 88 to 94% of play time by the project direction; eye-level night needs a brightness floor option; no reports at night unless urgent |
| **Save/load** | No new save field in Phases 0 to 3. Reports are recomputed from state, so loading a save re-derives them (they are not persisted). The avatar position and view mode are a per-session setting, not part of the village. A reporter mid-walk at save time is just a unit with a `move` order, which saves already handle. Ride along stores nothing |
| **Old saves** | Unaffected: nothing here depends on a save version. The `rulersVersion` and civic data used by elder and envoy reports are optional; their reporters simply do not appear when the data is absent |
| **Multiplayer** | None. This is single player; no replication design is needed and none is attempted |
| **The Worker** | All avatar work is on the main thread over the read-only projection. The only Worker-side addition is one read-model kind and its bounded query (the existing pattern limits sources and cache entries) |
| **Build placement** | Stays in the RTS view. First person does not place buildings, draw plots or dig, because those need the whole-map view and plot-size handles (`PlotControls`). "Dig a well" in a report opens the RTS build flow at the right place |

---

## 5. Controls and UI

### Keyboard and mouse
- **Move:** W A S D (same keys as the RTS pan; no collision because the modes are exclusive); Shift sprint (toggle available); C crouch is **not** included (no crouch gameplay).
- **Look:** mouse with pointer lock (new); Esc releases the lock and opens the Menu.
- **Interact:** left click or E on what the crosshair rests on (a person, a building door, a pin); Enter answers a card with its first reply; 1 to 4 pick a reply by number while a card is open (this reuses digits only while a card is open, so it does not collide with quick-build in the RTS view, where digits already mean "build").
- **Gesture order:** Q while a reporter waits sends the current reply's command to the crosshair target.
- **Inspect:** hold F to lock look and zoom to inspect; Space pauses; T cycles speed 1x/2x.
- **Leave:** Tab or the mode key returns to the RTS view at the same look-at.

### Trackpad (the owner's hardware is a laptop)
Pointer lock works on a trackpad but is the most error-prone scheme (accidental clicks, inertia). Three look schemes, selectable, with a first-run choice:
1. **Mouse-lock** (default on a mouse): pointer lock, move to look.
2. **Drag-to-look** (default on a trackpad): hold the pointer button and drag to turn; release to use the cursor for the UI. No lock; the cursor is free to click cards.
3. **Keys-look:** arrow keys turn and tilt, smooth with a speed setting.
Two-finger scroll adjusts FOV or zoom-to-inspect, never reply. Tap-to-click is respected; a dead zone setting suppresses jitter. **Which scheme the platform allows first, and how the pointer-lock API behaves under the current browser build on the M1, is (unverified).**

### Reply UI
A single Hearth card docked low and to the side of the reporter, so it never covers them (the real frame (a) in the section "Real eye-level renders" puts it in the selection card's slot, bottom-left): a medal (role icon), the line (at most two short lines), the icon row of facts, up to four reply buttons, one gold (the default). **No portrait close-ups, no full-screen dialogue.** The existing `LeaderConversation`/`EncounterDialog` flow is a modal; in first person it becomes the same card placed in the scene.

### Accessibility
- **Everything is readable without audio:** dialogue is text; every sound cue has a visual counterpart (a small icon pulse at the screen edge in the direction of an urgent emitter).
- **Text 16 px minimum**, icons 24 px minimum, targets 48 px, from the Hearth floor and enforced by `hearth-size-floor.test.mjs`.
- **No colour-only signalling:** state is icon plus shape plus number, matching UIUX principle 2.
- **Reply by keyboard only** is complete; the mouse is optional.
- **Hold-to-confirm** for destructive replies (refuse treaty, accept capitulation), with a tap-confirm alternative.
- **Reading time:** cards never time out while open; a report's own pressure comes from the sim, not a countdown.
- **Reduced reports:** Quiet mode and per-tier mute, also usable by players who find unprompted approaches stressful.
- **Screen-reader labels** on the card via ARIA roles as the Hearth cards already do **(unverified for the canvas layer)**.

### Motion comfort
- **Head bob off by default**; an intensity slider.
- **FOV slider** (default about 60 vertical; range about 45 to 85).
- **Comfort vignette** while turning or sprinting (off by default, adjustable).
- **Snap turn** option and a turn-rate cap.
- **Horizon lock** during all reporter blends; the camera never rolls.
- **Walk speed** default about 1.4 m/s, sprint about 3 m/s (estimates), with a smooth acceleration limit.
- **Respect `prefers-reduced-motion`**: disables bob, vignette easing and camera blends by default.
- **No forced camera moves.** The reporter turns toward you; the camera never turns toward them.
- **Dwell-free alternative** for any interaction that otherwise needs sustained aiming.

---

## 6. Open questions for Boris (six, each with a recommended default)

1. **Who is the avatar?** A bodiless witness (the ruler's eye) or a real unit you control? **Default: bodiless witness** in Phases 1 to 3; revisit a real-unit avatar only after the "no free actions" tests pass. It is the one choice that keeps the mode from becoming a cheat.
2. **What may first person do?** Only answer reports and give the short list of orders in section 2, or build and manage as well? **Default: answer and order only; placement, plots and digging stay in the RTS view.** First person is for seeing and deciding, not a second UI for everything.
3. **Time in first person?** Real time at the chosen speed, capped at 2x, 1x during conversations? **Default: yes, with a Pause key and a 2x cap.** Eye-level is a bad place for a 4x clock.
4. **Do reporters really walk to you, at the cost of their work?** Or is a card enough? **Default: real walkers in first person, bundled per role, with the same items as pins and stack chips in the RTS view.** If errands destabilise the work board in testing, the presentation-only fallback is allowed for the first release.
5. **How much interior?** Only the hall at first, everything else a facade rule? **Default: the hall only (class A), houses as class C, everything else per the table.** Interiors are the largest art cost and the least necessary for the core idea.
6. **Entry point and default look scheme?** A Menu toggle plus a key and a "Walk to the hall" first-run offer; trackpad drag-to-look by default on laptops? **Default: Menu toggle and key, off until chosen; drag-to-look on a trackpad, pointer lock on a mouse; no onboarding beyond one line.**

---

## Unverified claims (collected)

I could not confirm these from this repository or from running anything. Each needs a check before it is relied on.

1. **Adult eye height** in world units: derived from a rig head height of about 1.06 in the unit frame and a render scale of about 1.65 (`world.ts` ~2199); the actual in-game metres were not measured.
2. **Frame-time and memory** for every mode: all numbers are estimates from `claude-8gb-budget.md`, which is itself unmeasured. Nothing was run on the M1.
3. **Near-tier person quality at 1 to 3 m.** The RTS camera floor is 14 m; the near rig tier has not been reviewed at eye level.
4. **Whether the ruling person exists as a `Unit`** in the player's community, versus a `dynasty` record only.
5. **Priest and faith as sim mechanics.** I found the `priests` faction and a temple building but no faith system; the priest reporter may not be sourceable.
6. **Whether sending a resident with `move` disturbs the work board** (task commitments and auto work); the fallback is described but untried.
7. **Whether each existing command accepts or refuses while the game is paused**; the per-command behaviour was not traced.
8. **Tree collision radius in the sim**, and the exact walk/wade depth rules used for units; I reuse `Game.walkable` but did not trace its water thresholds.
9. **Depth precision** at near 0.1 and far 860 on the target GPU; the logarithmic or reversed depth fallback was not tried.
10. **Browser pointer-lock behaviour** on the owner's M1 trackpad and browser build, and ARIA behaviour on the canvas layer.
11. **Real-game references** (Mount & Blade, Dwarf Fortress, street-level city-builder cameras) are from memory and named only as inspiration for a feel, not as sources of facts.
12. **Walk and sprint speeds, slope limit, FOV defaults, shadow frustum size, the 6 m "near-2" radius:** starting points to tune, not measured values.

## Files this design reads (for the implementer)
`src/scene/world.ts` (`updateCamera`, the `dist` consumers, shadow and fog setup), `src/scene/cameraClearance.ts`, `src/scene/fixedOrbitCollision.ts`, `src/game/keyboard.ts`, `src/game/audio.ts`, `src/game/proceduralAudio.ts`, `src/scene/audioState.ts`, `src/scene/characterRig.ts`, `characterRigLayer.ts`, `characterAnim.ts`, `animationClips.ts`, `peopleLook.ts`, `peopleLife.ts`, `src/game/engineReadModels.ts`, `engineDispatch.ts`, `simulationRenderProjection.ts`, `terrainWalkCache.ts`, `rulersView.ts`, `societyView.ts`, `societyCivicRuntime.ts`, `leaderDialogue.ts`, `diplomaticVoice.ts`, `fame.ts`, `greatPersons.ts`, `captivity.ts`, `wildCraftView.ts`, `commanders.ts`, `scouting.ts`, `src/ui/VillageAlerts.tsx`, `EncounterDialog.tsx`, `src/ui/hearth/glance*`, `docs/UIUX_PROPOSAL.md`, `docs/parallel/CLAUDE_RULERS_INGAME.md`, `docs/parallel/handoffs/claude-8gb-budget.md`, `AGENTS.project.md`.

The rulers, great-person and fame specs listed as project docs (`claude/rulers-ingame-representation.md`, `claude/great-persons-and-player-integration-spec.md`, `claude/rulers-dynasties-expansion-spec.md`, `claude/engagement-design-and-decisions-round3.md`, `claude/completion-plan-and-context.md`) are not reachable from this session (no Projects tool). I used the repository's `docs/parallel/CLAUDE_RULERS_INGAME.md` and the source modules `greatPersons.ts`, `fame.ts`, `rulersView.ts` instead; the project copies may say more.


## Real eye-level renders

**These are engine frames, not mockups.** `tools/render-preview/fp.mjs` boots the real `Game` and the real `WorldView` in headless Chromium (three.js on SwiftShader), builds a village through the game's own placement rules, and draws the real `HudHearth` over the frame exactly as the app does. Only the camera is different: the orbit rig first places the sun, the shadow frustum and the culls on the ground under the eye, then the camera is set to an adult eye at 1.55 m, near 0.1, 62 degrees vertical FOV (see "Prototype camera" below). Output is PNG, never JPEG.

Setup common to all four: seed 7, worldgen version 18, 1,040 m map; the player's civ skin is `civ:brythen` (the doc's own Brythen example); village style, painterly map, botanical tree set, quality Medium, **draw distance Medium**, summer, real day-of-year light for the hour shown. The village is a street of houses, huts, a workshop, a market, a well and a hearth with the town hall closing it (its door faces down the street) and two crop plots beside it, all placed with `placeBuilding`; the street is worn with `wearTrail`; stores are set to plausible numbers. People are the game's own units moved into place (their look, kit, tools and pose come from the unit state): the farmer has a real `farmTool`, the thirsty pair really have `thirstSeconds`, the visitor is a unit of a rival society (so it wears that society's garb and carries a trade pack).

| Frame | Situation | Eye | Mean luminance (0 to 255) |
|---|---|---|---|
| `docs/renders/firstperson-real/a-street.png` | (a) walking the village street, a steward approaching 4 m away with a report; the real top bar, resource bar, time card, rail, minimap and dock, a real **thirsty pin** and priority card for the two dry residents, and the **report card** in the selection card's slot | street, looking at the hall | 123.9 |
| `docs/renders/firstperson-real/b-farmer.png` | (b) looking at a farmer working a ripe plot; the real **selection card** for that person | plot edge | 117 |
| `docs/renders/firstperson-real/c-hall-door.png` | (c) standing at the hall door with a visitor from a rival society 3.5 m away; selection card for the town hall | hall porch | 108.1 |
| `docs/renders/firstperson-real/d-river.png` | (d) a long view downstream along the river to the horizon | bank cut | 153.7 |

Each frame also exists without the HUD as `<name>-world.png` (that is the image the luminance is measured on, so the dark HUD panels cannot lower it). **The luminance guard**: `fp.mjs` computes the mean Rec. 709 luma of every world frame and exits 2 under `--min-lum` (default 70 of 255). The first-pass frames of the earlier mockups showed black on Boris's device; these are all between 108.1 and 153.7. **No exposure, near-plane, shadow or fog fix was needed to reach that**: the game's tone mapping (exposure about 1.09), the hemisphere light and the painter haze already give a bright eye-level frame at 09:30 to 11:30. The one dark case is a backlit person (finding F2).

Reproduce (from the repo root; needs esbuild, playwright, sharp, react, react-icons in `NODE_PATH`, and three's `build/` in `THREE_DIR`):

```
export NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=/mnt/user-data/uploads/hearthwild.nosync/node_modules/three
node tools/render-preview/fp.mjs --skin=civ:brythen                                   # the four frames, shots in tools/render-preview/fp-shots.json
node tools/render-preview/fp.mjs --skin=civ:brythen --no-hud --shots=tools/render-preview/fp-findings.json --out=docs/renders/firstperson-real/findings
node tools/render-preview/fp-crops.mjs                                                 # the evidence crops below
```

Honest limits of the harness: the post-processing is the repo's SwiftShader shim (`shims/post.js`: bloom is a simplified blur-and-add, vignette and tone map are the same chain), so bloom will differ on a GPU; people are staged units, not a simulated day; there is no wind or water animation beyond what one `sync` gives. Real device numbers (frame time, memory) are **not** measured here.

### What looks wrong at eye level (each with a frame)

Ordered by how badly it breaks "same game, seen from the ground". Every item is something the RTS camera hides.

**F1. Terrain faceting and slope streaks (the ~4 m cell).** On a steep bank the height-grid triangles show as a polygon web (`findings/f1a-terrain-facets-right-bank.png`, the cell is 4.06 m, about 2.6 eye heights) and the painter ground texture smears along the slope (`findings/f1b-terrain-streaks-left-slope.png`). On gentle grass the ground reads well, because pebbles, blades and dirt flecks cover it; the facets only betray themselves on bare sand and rock.

**F2. Near-LOD people at 1 to 3 m.** At 2.4 to 4 m a person fills a third of the frame. Faces are a handful of boxes (two dark-cube eyes under a brow, a wedge nose, no mouth), arms end in stubs with no hands or fingers, one arm of the visitor sticks straight out sideways in the idle pose, the trade pack is a flat brown slab, and a walking steward's arms stay horizontal in the stride pose (`findings/f2a-near-lod-visitor-at-3m.png`, `findings/f2b-near-lod-steward-walk-pose.png`). In an earlier 15:00 pass with the sun behind the visitor the whole figure went near-black (the unlit side only gets the hemisphere fill); the 09:30 frame shown reads, so this is a time-of-day trap, and the only dark region seen in any pass. The design's "reporter is the highest-detail person in the game" is true and the detail is not enough yet.

**F3. Building entrances.** The hall door is a flat dark slab flush with the wall, no frame, no recess, no sill, no depth behind it (`findings/f3a-hall-door-flat-slab.png`); a hut door is a green rectangle painted on the wall (`findings/f3b-hut-door-painted-on.png`). The hall stands on a low timber deck that the eye walks onto. There is no interior to look into, as the doc already said; now it is seen.

**F4. Shadows.** Off by default; with them on, a 512 map over ±110 m is 0.43 m per texel and people self-shadow into muddy dark (`findings/f4-shadows-sheet.png`: top left default off, top right Medium 512 at ±110, bottom left High 1,024 at ±110, bottom right High at ±40). The tight frustum is visibly cleaner and is cheap, so it is a mode setting, not a quality tier.

**F5. Ground cover has no near fade.** A single `nonblocking-sapling` instance at about 0.5 m from the eye fills 70 percent of the screen with flat dark green (`findings/f5-groundcover-fills-view.png`; found by hiding scene nodes one at a time). Reeds and cattails at 0.6 m do the same on a smaller scale. The orbit camera never gets this close, so nothing fades them.

**F6. The eye can be below the water surface.** The lake outlet's bed is 1.9 m under the water plane, and the eye at 1.55 m is under it: a hard milky sheet across the whole horizon (`findings/f6-eye-under-water.png`). `waterAt` is known to the sim (the design's 0.9 m wade rule covers it); the camera needs a hard clamp too.

**F7. A black rectangle (seen once).** In one run of frame (d) a black axis-aligned rectangle (48 by 94 px at the left edge, `findings/f7-black-rectangle-seen-once.png`) appeared and vanished when the yaw changed by 0.08 rad; it did not come back in later runs, and hiding any scene node did not remove it while the terrain was drawn. **Cause not isolated; treat as a SwiftShader tile artefact until a GPU run says otherwise.** Recorded because Boris saw black on his device; this is not that bug (his was the mockup JPEGs).

Checked and **not** a problem in these frames: depth precision (no z-fighting in any frame taken; table above), the near plane (0.1 shows nothing wrong; a test with the eye 0.45 m from the hall wall looked the same at near 0.5 and 0.1), fog (the painter haze reads as a pleasant horizon at 11:30; the fog density is -0.0012 with the Medium scale 0.82), exposure, and the shadow-frustum position (the sun, shadow box and building culls follow `look`, so they stay correct once `look` is set under the eye).

### Prioritised fix list for eye-level quality

| P | Fix | Why (frame) | Where |
|---|---|---|---|
| P0 | Near fade (dither or cull) for every `nonblocking-*` ground-cover instance within about 0.9 m of the eye | F5 | `biomeVegetation` / ground-cover instance shaders; eye distance uniform |
| P0 | Hard camera clamps: eye at least `waterAt + 0.3` and never inside terrain; walk collision with `Game.walkable` | F6 | walk pose (new), `cameraClearance.ts` |
| P0 | A first-person pose path: sun, shadow box, culls and tree view follow the eye, not `look`/`dist` (the orbit's 14 m minimum and `8 + dist*.12` building-cull radius must not apply) | prototype below | `world.ts updateCamera`, `treeView`, `syncBuildings` |
| P1 | Shadows on in Walk by default, frustum ±40 m on the avatar, keep 1,024 on Medium for this mode only | F4 | `applyQuality`, sun shadow camera |
| P1 | Near-people detail (rig-near-2): eye sockets with a pupil, a mouth line, finger blocks, arm swing in stride, a fill light on backlit faces (a small hemisphere or rim term in the person material) | F2 | `characterRig.ts`, `peopleLook.ts`, people material |
| P1 | Doors and thresholds as real geometry: framed reveal 0.2 to 0.3 m deep, a lintel and sill, a dark stage behind (class B of the table above), per skin grammar | F3 | `civBuildings.ts` door part per grammar |
| P2 | Slope-aware terrain texturing (triplanar or stretch-compensated UV) and smoothed vertex normals on steep cells, so banks stop streaking and facets stop showing | F1 | terrain painter shader |
| P2 | Optional local 1 m tessellation ring that samples the same height field, only if P2 above is not enough | F1 | terrain mesh |
| P3 | Re-check F7 on a real GPU; measure frame time and memory of Walk at Medium on the M1 (not done here) | F7 | device |
| P3 | Depth: keep near 0.1; add reversed-Z only if far-shore flicker shows on device (60 cm at 1 km) | depth table | renderer |

### Prototype camera (not wired)

`fpShot` in `tools/render-preview/fp-entry.tsx` is the whole prototype and it is about thirty lines: set `view.look` to the ground under the eye with a steep orbit pitch and `dist 14`, call `updateCamera(0)` so the sun, the shadow box and the culls land on the avatar; then set `camera.position` to `ground + 1.55`, `near 0.1`, `fov 62`, `lookAt(eye + (sin yaw cos pitch, sin pitch, cos yaw cos pitch))`; then `sync` and `render` (re-applying the pose before each `sync` so people, trees and ground items pick their LOD from the eye, not from the orbit). Nothing in `src/` was changed. A real build moves exactly this into a `walk` pose in `world.ts` and replaces the harness's fixed shot list with input.

### What remains

Pointer lock and input; walk collision and the water clamp; the P0 and P1 fixes above; the `fp-reports` read model and a real report card component (the card in frame (a) is a harness prototype in `fp-entry.tsx` built from the real `IconBtn`, `Stat` and the `hw-sel`, `hw-medal`, `hw-primary` classes and size tokens, `--hw-hit` 48 px, `--hw-fs-m` 18 px, 26 px icons; its copy is the steward example of section 2, and there is **no steward role in the sim** (`peopleLook.ROLES`), so the frame uses an ordinary worker in that slot); the class A hall room; audio listener; Ride along arms. Frames for Audience (hall interior) cannot be rendered until a room kit exists, which is itself the finding.
