# Delivered diplomatic information candidate

Baseline: 79d6148. Isolated source candidate; no shared source writes, staging or commits. M2-07 remains pending.

## Behavior

Frontier complaints and proposed peace terms are dated packets carried by real community members. Private tension changes do not broadcast a banner, change the relationship display, or expose peace terms at home. A paid messenger needs an actual known destination, real available adult and finite food/water pack. A living speaker reaching a player delivers the account; a four-second local mission conversation delivers its proposal. A complaint never silently makes a truce. A rejected peace speaker retains neutral return passage and walks home.

Relationship displays explicitly distinguish unknown and stale accounts. Firsthand player contact remains immediately available, consistent with RTS control. A speaker away from its community cannot refresh private mood remotely. Own declarations, actual attacks and signed agreements establish public legal status without inventing private trust or tension.

Compact offers carry exactly 20 food. Dispatch does not query unknown foreign trust. Actual arrival accepts or refuses the literal proposal; refusal returns the same finite cargo physically. Existing paid peace, raid, trade escrow and diplomatic saves retain their executors and accounting.

## Saved fields and compatibility

New optional fields: GameState.diplomaticReports (maximum 32), GameState.diplomaticMessages (maximum 128), Unit.diplomaticAccount. Existing envoy.kind gains compact; RivalMission.kind gains message and optional messageId. The new module validates bounded IDs, times, directed teams, packet phases, terms and actual active ownership. Legacy absent fields are accepted conservatively; existing legal treaties remain public. Historical settlement journey/account provenance survives actual capture or annexation. Active routed endpoints still must match the actual current mission partner.

## Evidence

All 70 focused causal and existing compatibility tests passed; typecheck and development build passed with bundled Node. Logs: /tmp/delivered-diplomacy-final-tests.log, /tmp/delivered-relations-final-type.log, /tmp/delivered-relations-final-build.log. The initial build used system Node 21 and failed on unsupported node:util.styleText; the final successful build uses the bundled runtime.

Six new scenarios use explicitly authored initial topology/endowments and ordinary Game.step thereafter: paid construction causing a witnessed complaint; save during paid travel then delivery; real guard capture and speaker death; identical home compact departures against two unseen private trust levels; delivered peace without prior knowledge of the speaker's capital; blocked route with physical return and paid retry; conservative legacy legal/inventory preservation. No midrun grants or forced job completion. The controlled route-block scenario explicitly changes terrain to model a route event. This is connected causal simulation evidence, not natural-campaign visual qualification.

The old escrow war-cancellation regression now uses Game.makeHostile, an actual player-known declaration/action, rather than directly mutating an unseen NPC private flag. Unknown remote policy cannot announce itself through immediate carrier cancellation. Known or locally discovered hostility still releases guarantees exactly once.

## Bounds and limitations

Diplomatic review runs every two seconds, uses 12-metre spatial contact buckets and one cached home lookup per team. Local contact is distance based, following existing observation semantics; no new occlusion/LOS system is claimed. A society account currently uses its community home reference; distributed multi-town political information is not fully modeled. Land/crossing message delivery is covered; naval diplomatic conveyance is not qualified. All-pair NPC planners still have confirmed separate information leaks documented alongside this candidate. Full M2-07 must not be credited from this batch.
