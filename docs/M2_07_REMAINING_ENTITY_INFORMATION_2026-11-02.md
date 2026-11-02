# Remaining M2-07 entity-information gaps

These are pending defects, not qualified behavior. Diagnostics run against the delivered-diplomacy isolated candidate based on 79d6148.

## Confirmed: unseen paid foreign dock

scripts/diagnostics/unseen-paid-port-repro.mjs pays 40 logs and walks a real builder 52.260 metres to complete a foreign dock. The observer society historically mapped empty coast, but no living observer enters 26 metres during construction and its continuous home view is also excluded. observedCoastalLandings changes from zero docks to dock 582. Evidence: docs/metrics/unseen-paid-port-2026-11-02.json.

Consumers: reviewCoastalCommissioning and dispatchCoastalTrade call observedCoastalLandings, which filters current global foreign docks by historical terrain cells. Old geography is not evidence of later infrastructure. A separate fix needs dated witnessed dock facts and must retain historical locations rather than reveal unseen replacement/removal.

## Confirmed: unseen paid raid warehouse and current defenders

scripts/diagnostics/unseen-paid-raid-target-repro.mjs pays 60 logs and walks the actual builder 40.409 metres to complete a warehouse outside all opposing observations. The opposing assessment changes from no target to structure 504, utility 6.049, and also reports six current defenders. Evidence: docs/metrics/unseen-paid-raid-target-2026-11-02.json.

Call path: reviewRivalSocietyActivity → assessRivalPairRaid → current finished foreign structures filtered only by historical rivalKnows. Resistance similarly reads current troops and towers through old geography. The future fix must cover the executor as well as its predicate: offscreen destroyed/moved targets and lost partner status currently can terminate a distant raid without a fresh witness. A remembered location is appropriate; attacking or learning its current condition requires actual arrival/observation.

## Additional review risks, not yet causally qualified

knownPartners scans current foreign supply drops/private alive status through historical terrain. peacePressure counts global player army. rivalDevelopment coastal planning and coastalStrategy inspect current foreign ports/world blockers. Navigation feasibility may reveal changed walls/bridges via global walkability. These static audit findings need separate causal cases; no blanket claim that every path is repaired.

The current physical diplomatic-message batch fixes player-facing warning/relationship provenance. It does not qualify all society-pair intelligence or M2-07 overall.
