/** Explicit scenario initial knowledge, not runtime discovery. The scenario
 * declares that this society previously observed and physically reported these
 * particular initial structures. Never use this helper after scenario start. */
export function endowStructureReports(g, observer, owner) {
  const witness = g.state.units.find((u) => u.team === observer && u.hp > 0);
  if (!witness) throw new Error("Initial knowledge needs an actual historical society member");
  const reports = (g.state.structureReports ??= []);
  for (const b of g.state.buildings.filter((b) => b.team === owner && g.finished(b))) {
    const site = {
      id: b.id,
      type: b.type,
      team: b.team,
      x: b.x,
      y: b.y,
      z: b.z,
      w: b.w,
      d: b.d,
      hp: b.hp,
      maxHp: b.maxHp,
    };
    const fact = {
      version: 1,
      observer,
      witnessId: witness.id,
      observedAt: g.state.time,
      receivedAt: g.state.time,
      active: true,
      site,
      defenders: 0,
      defensePower: 0,
    };
    const i = reports.findIndex((p) => p.observer === observer && p.site.id === b.id);
    if (i < 0) reports.push(fact);
    else reports[i] = fact;
  }
}
