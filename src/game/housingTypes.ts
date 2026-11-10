export type HousingMaterials = { wood: number; stone: number; plantFibre: number };
export type HousingPoint = { x: number; z: number };
export type HousingRenovation = {
  version: 1;
  mode: "upgrade" | "new";
  actorId: number | null;
  phase: "planned" | "fetching" | "carrying" | "working" | "paused";
  progress: number;
  duration: number;
  initialHp: number;
  quote: HousingMaterials;
  paid: boolean;
  paidBy: number;
  custodyTeam: number;
  sourceTeam: number;
  packetTeam: number;
  uncollected: HousingMaterials;
  delivered: HousingMaterials;
  packet: HousingMaterials;
  source?: HousingPoint & { cacheId?: number };
  parcel: HousingPoint & { kind: "cache" | "ground" | "carrier" | "site" };
  createdAt: number;
  blockedReason?: string;
};
export type HousingCargo = {
  version: 1;
  buildingId: number;
  materials: HousingMaterials;
  custodyTeam: number;
  paidBy: number;
};
export type HousingReceipt = {
  version: 1;
  mode: "upgrade" | "new";
  paidBy: number;
  materials: HousingMaterials;
  workSeconds: number;
  completedAt: number;
  makerId: number;
  demonstrationSeconds: number;
  adoptedAt?: number;
};
export type HousingSkill = {
  version: 1;
  sourceHouseId: number;
  originTeam: number;
  builtAt?: number;
  demonstratedAt?: number;
};
export type HousingUse = { version: 1; buildingId: number; seconds: number; paused?: true };
export type RetainedHousingProject = {
  version: 1;
  id: number;
  buildingId: number;
  team: number;
  project: HousingRenovation;
  reason: string;
};
