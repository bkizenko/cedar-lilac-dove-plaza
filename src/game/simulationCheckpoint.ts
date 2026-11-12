import type {LEGACY_WORKER_RNG,SimulationClock,SimulationSessionContext} from './simulationWorkerProtocol';
/** Actual authoritative snapshot at a completed command/tick barrier. No display Game serialization. */
export type AuthoritativeCheckpoint={
 source:'main'|'worker';sessionEpoch:number;serialized:string;clock:SimulationClock;context:SimulationSessionContext;
 /** null means existing main-mode legacy save behavior, never deterministic RNG equivalence. */
 rng:typeof LEGACY_WORKER_RNG|null;
};
export type CheckpointAuthority={checkpoint:()=>Promise<AuthoritativeCheckpoint>;currentEpoch:()=>number;allowed:()=>boolean};
