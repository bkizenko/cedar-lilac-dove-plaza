# Persistent raider return

Reaching a retreat landing no longer zeroes a surviving raider's health or deletes their carried loot.

If an existing, living, uncrewed team-3 vessel is within the normal 24-metre boarding distance, the return checks its real owned dock, connected navigable water, a dry landing, and a reachable existing raider camp. Up to its existing five-seat capacity can board. The same crew wait for each other, sail through the existing boat movement system, disembark at the native dock's dry landing, then physically walk into camp. Only arrival at camp deposits the actual remaining carried goods once. The boat remains a reusable owned object. Cold water-route preparation uses the existing cooperative pending API; pending holds the actual crew/cargo and is never treated as an impossible route or a reason to delete/refund anything.

An old shore-spawned band has no recorded overseas hull or home identity. Without a real suitable vessel it seeks an existing reachable raider camp overland. If neither route exists, the same living people remain at the landing with their cargo and a stranded status, retrying every ten simulated seconds. No hull, dock, camp, worker, weapon or stock is granted. A destroyed camp or vessel likewise preserves survivors and remaining cargo rather than teleporting or crediting it.

`Unit.seaRaidReturn` is optional and strictly validated, with owner/camp/boat references, bounded five-person manifests, phases and in-world landing coordinates. Old saves require no initialization or regeneration change. Normal per-step boat synchronization still controls aboard positions; the new actor hook only gives return orders and walks the final dry leg.

## Bounded verification

Four new controlled checks cover stranded survival/cargo across reload; real overland return with exactly-once deposit; a two-person return using a hull actually paid for with 40 logs and four stone plus real construction labor; and rejection of malformed save manifests/coordinates. The vessel case physically boards and sails outward to the test landing before retreat, saves on return, then completes with ordinary `Game.step`, asserting bounded per-step movement, unchanged actor/boat identities and exactly eight delivered logs from two finite four-log bundles. The terrain and starting native dock/camp/stocks are explicit test fixtures; this is not a claim of an autonomous natural raid campaign.

The wider frontier-defense, raid-balance and riverboat suite initially passed 35 of 36 checks. The sole obsolete assertion expected a living shore arrival to be killed and its eight carried food deleted. It now requires the same live survivor and retained finite cargo; the separate shore-departure assertion was also changed to reject a fabricated escape. All unrelated combat, walls, loot, strength, recovery intervals, boats and paid construction assertions remain.

## Remaining architecture

`Game.spawnRaid` still creates a shore party directly and grants its initial food; it has no native outbound fleet scheduler or finite crew recruitment. This batch does not replace that architecture or claim a complete paid outward naval raid. Legacy survivors without a real hull can remain stranded; while still present, they continue to block overlapping sea-raid scheduling under the existing campaign rule. Creating paid native dock/hull construction, allocating finite native crews, and an autonomous outward campaign is separate work. Trade escort, pack loading and patrol selection are also outside this return change.
