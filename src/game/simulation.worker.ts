import {SimulationWorkerRuntime} from './simulationWorkerRuntime';
import type {SimulationWorkerResponse} from './simulationWorkerProtocol';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent<unknown>)=>void)|null;postMessage:(message:SimulationWorkerResponse,transfer?:Transferable[])=>void};
const runtime=new SimulationWorkerRuntime({postMessage:(message,transfer)=>scope.postMessage(message,transfer)});
scope.onmessage=event=>runtime.receive(event.data);
