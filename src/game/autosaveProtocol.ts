export type SaveSlots={primary:string|null;backup:string|null;protected:string|null};
export type AutosaveJob={id:number;snapshot:unknown;expected:SaveSlots};
export type AutosavePreflight={id:number;phase:'preflight';seed:number;time:number;expected:SaveSlots};
export type AutosaveSerialize={id:number;phase:'serialize';snapshot:unknown};
export type AutosaveMessage=AutosavePreflight|AutosaveSerialize;
export type AutosaveResult={id:number;status:'preflight'|'ready'|'stale'|'invalid';serialized?:string;previousPrimaryValid:boolean;validCandidates:number;workerCpuMs:number};
