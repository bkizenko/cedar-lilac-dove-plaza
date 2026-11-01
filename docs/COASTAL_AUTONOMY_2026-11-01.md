# Coastal autonomy: bounded qualification

The first wave fixes physical loading, ordinary paid scouting and the foreign-port dependency. Natural completion is **not qualified**: a genuinely paid and dispatched rival boat subsequently stalled in sailing. This remains a navigation blocker, not evidence of successful trade.

## Changed rules and execution

- A real adult loads cargo at its own cache and walks to a distant boat. Saving during that walk retains the same actor, cargo and debit.
- Five actual working adults permit one paid coastal builder/scout while four remain ashore. The 600-second investment meal buffer and actual dock/canoe/hull costs remain. Other equipment policies retain their previous adult thresholds.
- A completed dock can fund a real personal reconnaissance canoe before optional farm/hauling upgrades. Canoe owners prefer nearby water-separated unknown frontiers. They do not receive hidden partner positions.
- New scouts physically return to a cache to load finite food and water. Their saved pack is consumed instead of communal demand, unused supplies return only at a real cache, interruption retains the pack, and capture/death transfers or loses the remaining actual supplies. Low actual return budget turns the same body home. Legacy scouts without a pack retain their previous need accounting.
- A small beachable boat may land on an already surveyed, dry low bank with a real walk to an observed friendly village. A foreign formal dock is optional. A saved beach landing has an explicit strict mode; existing dock voyages remain valid.
- Paid coastal intentions enter ordinary material labor targets. A second compatible harbor can be built when an existing fishing dock serves a different water body. Actual own knowledge gates all candidates.
- Partner choice uses observed distance and a bounded recent-visit penalty. Offers use actual own surplus and existing barter values; remote stock is inspected only at the physical meeting.
- Water-route preparation preserves the opportunity while pending and retries after one simulation second. Per-step preparation uses the navigation agent's shared bounded budget.

All knobs are in `COASTAL_BOOTSTRAP_RULES`, `SCOUTING_RULES`, `SCOUT_PROVISION_RULES`, the existing commission/voyage rules and `TRADE_PRICING`. Diagnostics count explicit review stages and blocked reasons separately; runtime counters reset on load. Saved commissions/voyages preserve actual paid progress.

## Evidence and limits

Focused checks cover separate paid rival hulls and opposite-goods round trips, combined wood/stone conservation, a distant-cache loading walk and save, paid dock/hull save continuity, beach landing without a foreign dock, finite scout packs, interruption/refund, strict invalid-pack rejection, actual `Game.step` demand exclusion, late-phase death loss, and existing physical scout return behavior. Controlled component fixtures declare their initial stock/adult endowment; they are not natural campaign balance evidence.

A natural Normal V14 seed 42, standard pangaea ran 2,400 seconds with the existing legitimate player startup harness. Both rivals paid/built docks and one paid a canoe. No rival trade was dispatched in this window.

A second natural Normal V14 seed 1, standard archipelago ran 5,000 seconds without rival grants, boats, terrain edits, knowledge edits or actor repositioning. Rivals paid docks and personal canoes; actual scouts crossed between landmasses and both societies eventually observed each other's halls. Neither observed the other's formal dock, exposing the port-bootstrap cycle. This pre-fix trajectory is preserved at `/tmp/hearthwild-coastal-natural-checkpoint.json` (SHA-256 `969533c41c38f629e2cf5390a940c8b145a001eab02dcdc76336d9a4770c5bd2`).

Continuing that same trajectory with surveyed beach landings and finite scout-pack support, without granting or repairing anything, reached 6,200 seconds. Team 2 paid a real hull, launched it, loaded real cargo and dispatched toward rival 1. The boat then stalled after 1.04 m of recorded sailing. Neither cargo delivery nor profitable natural completion receives credit. The exact counterexample is `/tmp/hearthwild-coastal-natural-continuation-checkpoint.json` (SHA-256 `3fd70a76e66174c8f35340ec18303d50dbbf951f52b8d490785e4e9095c74e7c`), supplied to the navigation owner. No simulation errors were recorded. Final partner-ranking and late-phase pack-death cleanup were added after that natural continuation; their evidence is focused checks, not another natural run.

The natural completed-route gate stays pending. New prepared-scout departure/return is qualified by focused physical/need/save checks; campaign frequency of provisioned reconnaissance remains unverified. Wider naval combat is outside this batch.
