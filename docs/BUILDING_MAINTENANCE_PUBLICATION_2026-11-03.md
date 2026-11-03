# Building maintenance playable batch

Published after the8836777 crafting/ownership release. This batch adds named, bounded material/weather/use wear to new worlds and actual paid repairs to both new and older villages. A repair consumes finite allocated resources, reserves one adult, hauls bounded packets from a real cache, then restores only the paid condition/HP budget through labor. Direct orders, priorities, paused jobs, death/replacement and save/load preserve the paid claim. NPCs use the same repairs independently of the player's Auto work setting. Older villages keep passive-wear compatibility.

## Verification

53/53 distinct automated cases pass:52 maintenance/construction/coordination/workload/catalogue checks plus1 current Normal first-winter scenario with the new marker. Typecheck and final production build pass. Exact runtime hashes match the qualified source package.

Actual production desktop review imported a public native damaged-dock fixture into an isolated origin, preserving its prior checkpoint. Clicking Repair charged7logs (580→573), kept damage at50% while paused, then exposed loading and a carried7-unit packet during actual resumed play. The dock completed at100%, wood stayed573, the repair action disabled at full health, and the actual Save button reported success. Browser error/warning log was empty. No user village was modified for this review. Screenshot: screenshots/building-repair-completed-2026-11-03.png.

Source/evidence details: BUILDING_MAINTENANCE_2026-11-03.md and metrics/building-maintenance-publication-2026-11-03.json.

## Scope

No fixed release gate is newly credited by this component batch:32/98 (32.65%). Local capture preserves separated old-custody repair claims instead of blocking integration or copying goods. Permanent disconnected-claim salvage, bridge maintenance and specialist repair yards remain unfinished. No FPS improvement or full economy/campaign completion is claimed. The distributed/random-character V18 terrain generator remains separately under qualification; sawtooth riverbanks remain explicitly pending.
