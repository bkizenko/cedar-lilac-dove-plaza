import type {EngineReadQuery,EngineReadModel} from './engineReadModels';
import type {SimulationPresentation} from './simulationRenderProjection';
import type {EngineDispatchCommand,EngineSelection} from './engineDispatch';
import {FRAME_SIMULATION_RULES} from './frameSimulation';

export const SIMULATION_WORKER_RULES={version:1,stepSeconds:FRAME_SIMULATION_RULES.stepSeconds,maximumTicksPerRequest:FRAME_SIMULATION_RULES.maximumSteps,maximumActorsPerCommand:128,retainedCommandOutcomes:128,maximumPendingRequests:128,maximumPoseFrames:2,maximumPoseEntities:20000,poseStride:9} as const;
/** Explicit limitation: old saves contain no replayable gameplay RNG state. */
export const LEGACY_WORKER_RNG={mode:'legacy-worker-random',replayable:false,persisted:false} as const;
export type SimulationCommand=EngineDispatchCommand;
type Request={epoch:number;requestId:number};
export type SimulationWorkerRequest=Request&(
 |{type:'initialize';protocolVersion:1;snapshot:unknown;rngMode:'legacy-worker-random'}
 |{type:'command';sequence:number;command:SimulationCommand;selection?:EngineSelection}
 |{type:'read-model';query:EngineReadQuery}
 |{type:'presentation';afterSequence:number;includeWorld:boolean;selection?:EngineSelection}
 |{type:'advance';afterSequence:number;ticks:number;selection?:EngineSelection}
 |{type:'checkpoint';afterSequence:number}
 |{type:'inspect';query:{kind:'inventory'}|{kind:'production';projectId:number}}
 |{type:'recycle';frameId:number;ids:ArrayBuffer;poses:ArrayBuffer});
export type SimulationClock={tick:number;time:number;paused:boolean;speed:number;stateRevision:number;appliedSequence:number};
/** Only render copies transfer; authoritative Game fields never detach. */
export type SimulationPoseFrame={epoch:number;frameId:number;count:number;capacity:number;stride:9;tick:number;time:number;stateRevision:number;ids:Float64Array;poses:Float32Array};
export type SimulationCommandOutcome={sequence:number;accepted:boolean;reason:string;duplicate:boolean;projectId?:number};
type Response={epoch:number;requestId:number};
export type SimulationWorkerResponse=Response&(
 |{type:'ready';protocolVersion:1;clock:SimulationClock;rng:typeof LEGACY_WORKER_RNG}
 |{type:'command-result';clock:SimulationClock;outcome:SimulationCommandOutcome}
 |{type:'advanced';clock:SimulationClock;ticks:number;cpuMilliseconds:number;frame?:SimulationPoseFrame;poseFramesInFlight:number;droppedPoseFrames:number;simulationErrors:{scope:string;message:string;count:number}[]}
 |{type:'checkpoint';clock:SimulationClock;serialized:string;rng:typeof LEGACY_WORKER_RNG}
 |{type:'presentation';clock:SimulationClock;presentation:SimulationPresentation;captureMilliseconds:number;previousDispatch?:{stateRevision:number;cpuMilliseconds:number}}
 |{type:'read-model-result';clock:SimulationClock;model:EngineReadModel;navigationRevision:number;cpuMilliseconds:number}
 |{type:'inspection';clock:SimulationClock;data:unknown}
 |{type:'recycled';frameId:number}
 |{type:'error';code:string;message:string;appliedSequence:number});
export type SimulationWorkerPort={postMessage(message:SimulationWorkerResponse,transfer?:Transferable[]):void};
