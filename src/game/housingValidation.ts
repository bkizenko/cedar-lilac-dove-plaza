import type { GameState } from "./types";
import type { HousingMaterials, HousingRenovation } from "./housingTypes";
import { HOUSING_MATERIAL_KEYS, housingMaterialsEqual } from "./housingMaterials";
import { HOUSING_RULES } from "./housingRules";
const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v),
  num = (v: unknown, max = 1e8): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max,
  id = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0,
  only = (o: object, allowed: readonly string[]) =>
    Object.keys(o).every((k) => allowed.includes(k));
function materials(v: unknown): v is HousingMaterials {
  return (
    obj(v) &&
    only(v, HOUSING_MATERIAL_KEYS) &&
    HOUSING_MATERIAL_KEYS.every((k) => num(v[k], 100000))
  );
}
/** Structural/finite-ledger validation only. A duplicated Unit cargo view is not
 * counted as extra inventory; it must exactly equal its one project packet. */
export function validHousingState(s: GameState) {
  const units = new Map(s.units.map((u) => [u.id, u])),
    buildings = new Map(s.buildings.map((b) => [b.id, b])),
    teams = new Set(s.tribes.map((t) => t.id)),
    half = (s.worldOptions?.size ?? 1560) / 2,
    point = (v: unknown) =>
      obj(v) &&
      typeof v.x === "number" &&
      Number.isFinite(v.x) &&
      Math.abs(v.x) <= half &&
      typeof v.z === "number" &&
      Number.isFinite(v.z) &&
      Math.abs(v.z) <= half;
  const project = (p: HousingRenovation, buildingId: number, retained = false) => {
    if (
      !obj(p) ||
      !only(p, [
        "version",
        "mode",
        "actorId",
        "phase",
        "progress",
        "duration",
        "initialHp",
        "quote",
        "paid",
        "paidBy",
        "custodyTeam",
        "sourceTeam",
        "packetTeam",
        "uncollected",
        "delivered",
        "packet",
        "source",
        "parcel",
        "createdAt",
        "blockedReason",
      ]) ||
      p.version !== 1 ||
      !["upgrade", "new"].includes(p.mode) ||
      !["planned", "fetching", "carrying", "working", "paused"].includes(p.phase) ||
      !num(p.duration, 100000) ||
      p.duration <= 0 ||
      !num(p.progress, p.duration) ||
      !num(p.initialHp, 1e6) ||
      !materials(p.quote) ||
      !materials(p.uncollected) ||
      !materials(p.delivered) ||
      !materials(p.packet) ||
      typeof p.paid !== "boolean" ||
      !teams.has(p.paidBy) ||
      !teams.has(p.custodyTeam) ||
      !teams.has(p.sourceTeam) ||
      !teams.has(p.packetTeam) ||
      !num(p.createdAt, s.time) ||
      !point(p.parcel) ||
      !only(p.parcel, ["kind", "x", "z"]) ||
      !["cache", "ground", "carrier", "site"].includes(p.parcel.kind) ||
      (p.blockedReason !== undefined &&
        (typeof p.blockedReason !== "string" || p.blockedReason.length > 500))
    )
      return false;
    if (
      p.source !== undefined &&
      (!point(p.source) ||
        !only(p.source, ["x", "z", "cacheId"]) ||
        (p.source.cacheId !== undefined && !id(p.source.cacheId)))
    )
      return false;
    if (p.actorId !== null && (!id(p.actorId) || !units.has(p.actorId))) return false;
    if (!p.paid) {
      if (
        p.progress !== 0 ||
        p.source !== undefined ||
        HOUSING_MATERIAL_KEYS.some(
          (k) => p.uncollected[k] !== 0 || p.delivered[k] !== 0 || p.packet[k] !== 0,
        )
      )
        return false;
    } else if (
      HOUSING_MATERIAL_KEYS.some(
        (k) => Math.abs(p.quote[k] - p.uncollected[k] - p.delivered[k] - p.packet[k]) > 1e-7,
      )
    )
      return false;
    if (p.parcel.kind === "carrier") {
      const u = p.actorId === null ? undefined : units.get(p.actorId);
      if (
        retained ||
        !u?.housingCargo ||
        u.housingWorkId !== buildingId ||
        u.housingCargo.buildingId !== buildingId ||
        !housingMaterialsEqual(u.housingCargo.materials, p.packet)
      )
        return false;
    }
    return true;
  };
  for (const b of s.buildings) {
    const p = b.renovation;
    if (p) {
      if (
        !project(p, b.id) ||
        !["hut", "house"].includes(b.type) ||
        (p.mode === "upgrade" && (b.type !== "hut" || b.build !== 1)) ||
        (p.mode === "new" && (b.type !== "house" || b.build >= 1))
      )
        return false;
    }
    const r = b.housingReceipt;
    if (r) {
      if (
        !obj(r) ||
        !only(r, [
          "version",
          "mode",
          "paidBy",
          "materials",
          "workSeconds",
          "completedAt",
          "makerId",
          "demonstrationSeconds",
          "adoptedAt",
        ]) ||
        r.version !== 1 ||
        b.type !== "house" ||
        b.build !== 1 ||
        !["upgrade", "new"].includes(r.mode) ||
        !teams.has(r.paidBy) ||
        !materials(r.materials) ||
        !num(r.workSeconds, 100000) ||
        !num(r.completedAt, s.time) ||
        !id(r.makerId) ||
        !num(r.demonstrationSeconds, HOUSING_RULES.demonstrationSeconds) ||
        (r.adoptedAt !== undefined &&
          (!num(r.adoptedAt, s.time) ||
            r.adoptedAt < r.completedAt ||
            r.demonstrationSeconds < HOUSING_RULES.demonstrationSeconds))
      )
        return false;
    }
  }
  for (const u of s.units) {
    if (
      u.housingWorkId !== undefined &&
      (!id(u.housingWorkId) || buildings.get(u.housingWorkId)?.renovation?.actorId !== u.id)
    )
      return false;
    const c = u.housingCargo;
    if (c) {
      const p = buildings.get(c.buildingId)?.renovation;
      if (
        !obj(c) ||
        !only(c, ["version", "buildingId", "materials", "custodyTeam", "paidBy"]) ||
        c.version !== 1 ||
        !id(c.buildingId) ||
        !materials(c.materials) ||
        !teams.has(c.custodyTeam) ||
        !teams.has(c.paidBy) ||
        !p ||
        p.actorId !== u.id ||
        p.parcel.kind !== "carrier" ||
        u.housingWorkId !== c.buildingId ||
        !housingMaterialsEqual(c.materials, p.packet) ||
        c.paidBy !== p.paidBy ||
        c.custodyTeam !== p.packetTeam
      )
        return false;
    }
    const k = u.housingSkill;
    if (
      k &&
      (!obj(k) ||
        !only(k, ["version", "sourceHouseId", "originTeam", "builtAt", "demonstratedAt"]) ||
        k.version !== 1 ||
        !id(k.sourceHouseId) ||
        !teams.has(k.originTeam) ||
        (k.builtAt === undefined && k.demonstratedAt === undefined) ||
        (k.builtAt !== undefined && !num(k.builtAt, s.time)) ||
        (k.demonstratedAt !== undefined && !num(k.demonstratedAt, s.time)))
    )
      return false;
    const w = u.housingUse;
    if (
      w &&
      (!obj(w) ||
        !only(w, ["version", "buildingId", "seconds", "paused"]) ||
        w.version !== 1 ||
        !id(w.buildingId) ||
        !num(w.seconds, HOUSING_RULES.demonstrationSeconds) ||
        (w.paused !== undefined && w.paused !== true) ||
        (!w.paused && !buildings.get(w.buildingId)?.housingReceipt))
    )
      return false;
  }
  if (s.retainedHousingProjects !== undefined) {
    if (!Array.isArray(s.retainedHousingProjects) || s.retainedHousingProjects.length > 4096)
      return false;
    const ids = new Set<number>();
    for (const r of s.retainedHousingProjects) {
      if (
        !obj(r) ||
        !only(r, ["version", "id", "buildingId", "team", "project", "reason"]) ||
        r.version !== 1 ||
        !id(r.id) ||
        ids.has(r.id) ||
        !id(r.buildingId) ||
        !teams.has(r.team) ||
        typeof r.reason !== "string" ||
        r.reason.length > 500 ||
        !project(r.project, r.buildingId, true) ||
        r.project.custodyTeam !== r.team ||
        r.project.actorId !== null
      )
        return false;
      ids.add(r.id);
    }
  }
  return true;
}
