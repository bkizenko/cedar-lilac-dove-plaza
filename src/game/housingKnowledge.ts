import type { Game } from "./sim";
import type { KnowledgeTopic, KnowledgeActionResult } from "./knowledge";
import {
  beginHousingUpgrade,
  beginHomeUse,
  housingAdoptionIssue,
  housingMaterialIssue,
  housingQuoteText,
  HOUSING_RULES,
} from "./housing";
export function housingKnowledgeTopic(g: Game): KnowledgeTopic {
  const homes = g.state.buildings.filter((b) => b.team === 0 && b.hp > 0),
    project = homes.find((b) => b.renovation),
    prototype = homes.find((b) => b.type === "house" && g.finished(b) && b.housingReceipt),
    hut = homes.find((b) => b.type === "hut" && g.finished(b) && !b.repair && !b.expansion),
    learned = g.state.units.filter(
      (u) => u.team === 0 && u.hp > 0 && u.housingSkill?.demonstratedAt !== undefined,
    ),
    use = g.state.units.find((u) => u.team === 0 && u.housingUse && !u.housingUse.paused),
    p = project?.renovation;
  return {
    id: "housing",
    title: "Homes learned through use",
    need: `${g.popNow(0)} residents / ${g.popCap(0)} places. A tested timber home adds two places and warmth only while actually sheltered.`,
    stage: learned.length
      ? "adoption"
      : prototype
        ? "proven"
        : p
          ? "experiment"
          : hut
            ? "observation"
            : "need",
    observation: hut
      ? "An existing hut can be improved while its original shelter stays open."
      : "First build and actually complete a hut.",
    experiment: p
      ? `${p.paid ? "Paid" : "Unpaid"} ${p.phase} · ${p.progress.toFixed(1)}/${p.duration}s actual work`
      : `${housingQuoteText()} paid at the real cache, carried and worked at the home.`,
    result: prototype
      ? "A completed paid home exists. Existing damage was preserved."
      : "No paid prototype has been completed.",
    adoption: `${learned.length} living residents have personally tried the home. New homes require a builder who learned the method.`,
    ...(p
      ? { progress: { completed: p.progress, required: p.duration, unit: "work seconds" } }
      : use
        ? {
            progress: {
              completed: use.housingUse!.seconds,
              required: HOUSING_RULES.demonstrationSeconds,
              unit: "seconds of real use",
            },
          }
        : {}),
    metrics: {
      learnedResidents: learned.length,
      completedPaidHomes: homes.filter((b) => b.housingReceipt && g.finished(b)).length,
      workSeconds: p?.progress || 0,
    },
    actions: [
      {
        id: "housing:prototype",
        label: p ? "Prototype work already planned" : "Improve a hut",
        blockedReason: p
          ? "Use the selected home to pause/resume its existing project"
          : !hut
            ? "Need a completed hut"
            : null,
      },
      {
        id: "housing:try",
        label: "Try the paid home",
        blockedReason: prototype ? null : "Complete the paid prototype first",
      },
      {
        id: "housing:place",
        label: "Choose a timber-home site",
        blockedReason: housingAdoptionIssue(g),
      },
    ],
    limitation:
      "Materials and hauling are finite. Housing does not heal damage or warm people away from shelter.",
  };
}
export function runHousingKnowledgeAction(g: Game, id: string): KnowledgeActionResult {
  if (id === "housing:place") {
    const reason = housingAdoptionIssue(g);
    return reason
      ? { accepted: false, reason }
      : {
          accepted: true,
          reason: "Choose a real site; materials and construction work are still required",
          placement: "house",
        };
  }
  if (id === "housing:prototype") {
    const b = g.state.buildings.find(
      (b) =>
        b.team === 0 &&
        b.type === "hut" &&
        g.finished(b) &&
        !b.repair &&
        !b.expansion &&
        !b.renovation,
    );
    return b
      ? beginHousingUpgrade(g, b.id)
      : { accepted: false, reason: "Need an available completed hut" };
  }
  const b = g.state.buildings.find(
    (b) => b.team === 0 && b.type === "house" && g.finished(b) && b.housingReceipt,
  );
  return b ? beginHomeUse(g, b.id) : { accepted: false, reason: "Complete a paid home first" };
}
