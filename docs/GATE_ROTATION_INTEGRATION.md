# Cardinal gates and wall joins

Gate placement supports north, east, south and west. Choose the compass buttons, Rotate, or R (Shift+R reverses) while placing a gate. Text-input/UI keyboard focus is respected. The initial preview can suggest the axis of nearby own timber/stone walls; after explicit rotation, the player's choice stays final.

Engine uses the actual snapped point for both its ghost and paid construction. It refuses an invalid gate location instead of silently relocating it away from the intended wall opening. Direction is captured on the new project immediately, including unfunded plans; changing the placement selector never rotates an existing gate. The existing stock cost, builder work, opening/closing rules and 4×4 m collision footprint remain unchanged.

`gateGeometry.ts` supplies the same passage vectors/yaw and join ports to placement and rendering. Undefined saved facing retains legacy north. North/south passages connect east–west walls; east/west connect north–south walls. Timber/stone wall drags use `joinedConstructionLine` for preview, section/cost counts and commit. It attaches to actual owned gate ports and does not remove paid wall sections or invent a connector.

`gateKit.ts` adds a visible front brace/latch within the original footprint, making opposite facings distinguishable. Every frame/leaf instance and ghost uses saved yaw. The whole leaf assembly hides when the gate opens; posts remain. The optional saved Building.gateFacing field accepts only the four cardinal values and leaves older saves compatible.

Validation: 13 gate/line tests pass, including actual stock spending, all four directions through save/load, malformed direction rejection, unpaid-plan retention, saved render yaw on frame and leaf, cached ghost rotation, open-leaf hiding, and exact Engine preview/committed wall positions. Desktop GPU/interactive acceptance remains a separate release check.
