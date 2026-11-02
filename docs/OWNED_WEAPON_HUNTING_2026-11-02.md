# Owned weapons and physical wildlife subsistence

Candidate against `d048d1a`; no automatic release-gate credit. The joined native-terrain proof and complementary geometry cases cover the proposed M1-10 implementation. Parent integration, compiler and desktop review remain required before publication.

A resident must actually make and equip a bow before using bow flight. The actual hearth now admits Stone weapons at its existing single outdoor work spot, using the same paid work/resume rules at three times workshop duration. Spears/blades retain physical reach. Unarmed residents use loose stones. Arrows and stones use the existing non-inventoried ammunition assumption; this change does **not** implement finite ammunition.

Hunting shots have a fixed launch direction, an observed-velocity lead, a bounded lifetime and swept moving-body collision. Terrain and solid building footprints stop them. Missing/dead/tamed targets and expiry award no damage, meat or diplomatic incident. Combat projectiles retain their original update path, including their existing target behavior. Hunting flight is advanced after wildlife movement so both segments participate in collision; combat remains in its previous phase. Rendering adds one bounded instanced stone mesh (maximum40); arrows use the existing mesh and orient to fixed hunting velocity.

Hunters remember only an actually observed point for25 seconds, approach it, and search for at most8 seconds. They cannot replace the destination with a hidden live animal position. Solid footprints and terrain block sight. A wounded boar remembers its actual attacker for8 seconds and physically closes using the existing obstacle-safe wildlife movement. Contact inflicts6 health at a2.2-second cooldown. Shelter, boats, walls, distance, attacker loss and expiry bound this response; no entire-society hostility is created. Parameters live in `HUNTING_WEAPONS`, `HUNTING_FLIGHT_RULES`, `HUNTING_TRACKING_RULES`, `HUNTING_HAZARD_RULES` and `CARCASS_PROCESSING_RULES`.

## Actual joined evidence

`hunting-chain-qualification.test.mjs` runs ordinary `Game.step` on unchanged seed1/V14/pangaea1040 terrain. It uses fixed initial endowments (100logs,50stone,2000food,200L water, one baseline4HP authored wild boar), quiet/clear conditions and deferred external-event timers. No midrun stock, terrain, clock or position corrections occur. All five original player residents survive.

In172 simulation seconds, residents physically build a hearth (4logs/4stone), craft a bow there (3logs/1stone), walk back to equip the same body, observe and hunt the actual boar. It moves6.3m. A fixed-flight shot survives strict save/load and hits in the loaded branch. Wounded defensive pursuit occurs, but the bow user kills before contact: the native case does not claim injury or last-seen tracking.

Actual gutting/skinning precede harvest; all32 raw meat and the finite hide/bones are physically carried to storage. One actual hearth batch consumes4 raw meat and1log, then delivers4 edible food. Final raw stock27.5001747882 plus actual spoilage0.4998252118 plus4 cooked equals32. Final logs92 and stone45 match exact capital/operating debits. Water, edible food consumption/spoilage, original bodies and unchanged terrain are asserted. The scalar report is [metrics/owned-weapon-hunting-2026-11-02.json](metrics/owned-weapon-hunting-2026-11-02.json); no full saved game is committed.

## Complementary checks and limits

Eight component cases cover fixed-direction swept hits and misses; missing/dead targets and expiry; terrain and wall interception; exact hazard damage/cooldown/protection; last-seen expiry and strict save validation; old combat motion; ordinary unarmed physical charge/health loss; and ordinary stalking of moving deer becoming hidden behind a solid corner. The latter two use declared controlled flat-ground fixtures with actual actor movement and no midrun correction. They are not native campaign-balance evidence.

Existing hunting helpers now explicitly advance the real hunting-projectile phase. One existing warfare test now waits for the existing distance-based arrow lifetime rather than assuming a80m shot hits after1.5 seconds; combat runtime was not shortened or changed to satisfy it. Legacy carcass, weapon, hunting delivery and public animal-order tests are rerun alongside the new cases. This is a controlled functional proof, not all-map/default-conflict survival balance, target-hardware performance, finite-ammo implementation or naval-combat work.
