/** Exact pre-optimization refresh from frozen62a122e; test oracle only. */
import type {Game} from '../../src/game/sim';
import {WorkBoard,reserveSeconds,calendar,farmAvailable} from '../../src/game/settlement';
import type {Building,ResourceNode,Critter,ResKind} from '../../src/game/types';
import {constructionPriority,CONSTRUCTION_QUEUE_RULES} from '../../src/game/constructionQueue';
import {expansionCost,plotArea} from '../../src/game/plots';
import {constructionDemand} from '../../src/game/construction';
import {fishingGrounds} from '../../src/game/fishing';
import {quarryAvailable} from '../../src/game/mining';
import {preservationAvailable} from '../../src/game/pantry';
import {huntable} from '../../src/game/hunting';
import {DOCK_R,QUARRY_R} from '../../src/game/constants';
type Node=Building|ResourceNode|Critter;
type Task={node:Node;kind:'build'|ResKind;slots:number;priority:number};
export function refreshBefore(this:WorkBoard,g:Game) {
    if (g.state.time < this.next && this.obstructionWorld === g.world && this.obstructionState === g.state) return;
    this.next = g.state.time + 1;
    this.tasks.clear();
    this.refreshObstructions(g);
    for (const t of g.state.tribes) {
      if (!t.alive || t.id === 3) continue;
      const list: Task[] = [],
        pop = g.popNow(t.id),
        foodUrgency = reserveSeconds(g,t.id)<90 ? 320 : reserveSeconds(g, t.id) < 240 ? 180 : 80;
      const buildings = g.state.buildings.filter((b) => b.team === t.id && b.hp > 0);
      const needed=new Set((["wood","stone","copper","iron"] as ResKind[]).filter(k=>constructionDemand(g,t.id,k)));
      const add = (node: Node, kind: Task["kind"], slots: number, priority: number) => {
        if(!this.blockedResource(node))list.push({ node, kind, slots, priority:priority+(needed.has(kind as ResKind)?90:0) });
      };
      const nearby = (n: Node, type: string, r: number) =>
        buildings.some(
          (b) => b.type === type && g.finished(b) && Math.hypot(b.x - n.x, b.z - n.z) < r,
        );
      for (const b of buildings) {
        if(b.plannedCost)continue;
        if(b.expansion&&(b.expansion.paid||g.canAfford(b.team,expansionCost(b,b.expansion))))add(b,"build",2,235+(constructionPriority(b)-1)*CONSTRUCTION_QUEUE_RULES.automaticPriorityDelta);
        if (!g.finished(b)) {
          add(b, "build", 2, (reserveSeconds(g,t.id) < 90 ? 120 : 235)+(constructionPriority(b)-1)*CONSTRUCTION_QUEUE_RULES.automaticPriorityDelta);
          continue;
        }
        if (b.type === "farm" && farmAvailable(g, b))
          add(b, "food", Math.min(12,Math.ceil(3*plotArea(b))), calendar(g).phase === 2 ? 500 : reserveSeconds(g,t.id)<90 ? 100 : 210);
        if (b.type === "dock" && fishingGrounds(g,b).length) add(b, "food", 2, foodUrgency+65);
        if(b.type==="quarry"&&quarryAvailable(g,b))add(b,"stone",2,Math.max(25,100-t.stone*.35));
        if (preservationAvailable(g, b)) add(b, "food", 1, calendar(g).phase === 2 ? 105 : 85);
      }
      for(const n of g.state.fish)if(n.amount>=1&&!nearby(n,"dock",DOCK_R))add(n,"food",1,foodUrgency-20);
      for (const n of g.state.forage) if (n.amount > 0) add(n, "food", 2, foodUrgency+(n.cropCandidate&&!t.cultivated?.length?35:0));
      for (const n of g.state.trees)
        if (n.amount > 0)
          add(n, "wood", 2, t.id === 0 && g.chopMarks.has(n.id) ? 140 : Math.max(15, 95 - t.wood * 0.35));
      for (const n of g.state.stones)
        if (
          n.amount > 0 &&
          (g.cornerstoneAt(n.x, n.z, t.id) || nearby(n, "quarry", QUARRY_R) ||
            Math.hypot(n.x - g.campOf(t.id).x, n.z - g.campOf(t.id).z) < 28)
        )
          add(n, "stone", 2, Math.max(10, 65 - t.stone * 0.4));
      if (t.age >= 1 || t.id===0)
        for (const n of g.state.copper) if (n.amount > 0) add(n, "copper", 2, 45 - t.copper * 0.25);
      if (t.age >= 2)
        for (const n of g.state.iron) if (n.amount > 0) add(n, "iron", 2, 40 - t.iron * 0.25);
      for (const n of g.state.wildlife)
        if (huntable(g,n,t.id)) add(n, "food", n.hp<=0?2:1, foodUrgency + (n.hp<=0?100:calendar(g).phase===3?35:-10));
      this.tasks.set(t.id, list);
    }
  }
