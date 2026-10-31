# Physical production, defense and presentation batch

Isolated source: .play/craft-defense-1qrmo3nx. First combined build/typecheck pass and30/30 single-process integration checks pass (production, catalogue, horn, quarry, partial trade, minimap, graphics). Tower addition11/11 focused checks pass. Renderer-registry regression1/1 and rich-stone conservation1/1 pass. Final assembled compiler/build pass. Desktop review verified the Village/Food/Industry palettes, paid construction, rendered workplace models, and the 14m stone tower with its ladder/platform. No browser console errors were recorded. Test-lab completion grants were used only for visual review, not campaign qualification. 43 targeted checks in these disjoint sets; this does not qualify the entire Classical campaign.

## Production and building coverage

Five paid workplaces are registered, listed in the building palette and included in actual scene instancing/picking: cooking hearth, butcher/skin yard, skin drying rack, tanning yard and skin sewing shelter. Seven real batch recipes cover cooked meat, cleaned hide, bark tannin, dried skins, leather and two garments. Inputs are loaded at a real cache, carried to a staffed slot, worked, and output carried back. Projects retain paid inputs/progress through interruption and replacement. New catches after a real hearth generate finite raw material loads; previous edible meat and legacy saves retain their meaning.

Raw spoilage, actual collected water and delivered logs, finite item capacity, owned/equipped clothes, warmth and wear are measured. These are early survival foundations: drying currently requires a60-second staffed batch, tannin comes from a consumed bark-bearing log+water, and complete weather vats/bindings/hot-weather cloth/repair chains remain explicit gaps. The in-game catalogue exposes25 workplace roles and all31 registered building IDs with actual costs/recipes/blockers; planned roles have no fake build/output buttons.

## Defense and extraction

Dedicated defense horn and bounded automatic local alarms rally nearby adults within70m. Weapons come from actual stores after physical arrival; healthy unarmed adults use work tools, vulnerable residents seek reachable shelter. Guard/custody/away duties are protected unless actual intruders threaten locally. Temporary militia return weapons and resume civilian work/queued exploration.

Quarries cost18logs and work a32m area of known/reachable deposits. Miners distribute over finite outcrops; reports expose actual stock and slots. Existing unpaid36-log quotes are discounted, while paid/partial construction earns no refund. Loose stone richness now consumes exactly the amount carried, including the final partial load. Mountain seam identity across rebuilding remains an explicit older gap.

Towers offer paid timber2–8m or stone3–14m designs, with measured costs, labor, stronger HP, bounded range, correct deck/ladder/footprint/projectile height and saved material/height. Old towers keep their original design/stats; unfinished towers cannot fire. Real staffed garrisons/ammunition remain separate future qualification.

## Trade, minimap and lighting

Smaller quoted packets reduce payment proportionally before packing; minute jitter is removed. Existing fixed contracts/reservations are retained. An unreserved smaller offer found at arrival returns the full original budget and reports the newly priced trip instead of remotely refunding or inventing mixed cargo. No free value multiplier was added.

The minimap camera marker is a thin muted square, independent of terrain rays; fog/local-water/terrain accuracy remains. Graphics quality is remembered, including Low's proper initial resolution budget. OutputPass now supplies final tone mapping/display-color conversion to the Medium/High effect pipeline, matching the direct Low renderer; duplicated composer disposal is removed. This addresses an automatic-quality brightness jump; normal weather/day/night light changes remain.

Overall release baseline remains hearthwild-first-release-gates-v1,19/98verified19.39%. New narrow batches do not automatically complete broader material/campaign gates.
