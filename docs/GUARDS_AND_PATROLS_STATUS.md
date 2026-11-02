# Guard and patrol controls: current behavior

This audits the implemented orders; it does not count an interface label as an executor.

| Function | Actual control and behavior | Limit |
| --- | --- | --- |
| Station armed residents | Select residents and issue a move; `Game.issueMove` sets `stationOnArrival`, then arrival becomes Hold. Hold is also an explicit selected-person order. Armed residents still acquire nearby hostile targets. | A stationary post, not a repeating route or a permanent assigned guard profession. |
| Frontier guards | Select a completed cornerstone → **Post guards**. `guardFrontier` sends actual spare armed adults to the reachable post; measured support rises only after arrival. Each armed adult backs its nearest post. | This uses physical stationing, not a persistent patrol assignment. A militia member can stand down after responding to a later alarm. No guarantee of automatic replacement after death. |
| Prisoner guard | Select a prisoner → **Assign an available guard**. `assignPrisonerGuard` gives an actual armed adult an escort target; protection starts only after physical arrival. Capacity, distance, food, water and escape rules remain active. | Custody duty, not general map patrol. |
| Intact settlement garrison | Select a discovered foreign hall → **Secure**. `secureVillage` records actual guard IDs, sends them to the control point and measures contested/held control. **Withdraw** ends the obligation. | Local control and garrison, not an automatic route around the village. |
| Trade escort | Trading panel → **On the road** → **Add armed escort**. `sendTradeEscort` sends an existing armed adult to the actual carrier; it follows the party and returns when the journey ends. | Attached to one real shipment, not a freestanding guard route. |
| Defense horn and automatic alarm | **Defense horn** calls local adults; intruders also trigger local defense. Actual available weapons are collected physically; children and injured residents seek reachable shelter. Militia later return their equipment and stand down. | Temporary defense, not permanent posting. |
| Barracks emergency refuge | A completed barracks now admits up to **12** actual emergency occupants through a reachable entrance, using the existing shelter protocol. Concealed occupants cannot be newly acquired as targets; the physical barracks can still be attacked and destroyed. | No instant hiding, healing, free weapons, added population capacity or ordinary lodging. Existing airborne projectiles still resolve. Existing saved building HP is unchanged. |

There is currently **no player patrol-route API, waypoint loop, patrol button, automatic post staffing/replacement policy, or permanent general guard assignment**. Raider roaming is separate NPC behavior and does not implement a player patrol command. Occupation and prisoner guards are the persistent role-specific duties that currently exist.

Relevant sources: `frontiers.ts`, `captivity.ts`, `conflictIntent.ts`, `caravans.ts`, `defense.ts`, and the movement/hold handlers in `sim.ts`. The listed controls are contextual; the compact interface may place them inside its relevant expanded panel.
