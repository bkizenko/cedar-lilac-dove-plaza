// Diagnostic only. Controlled entropy for matched performance/parity runs;
// this is not a persisted gameplay RNG or a production Worker entry point.
import {parentPort,workerData} from 'node:worker_threads';
let seed=workerData.seed>>>0,draws=0;
Math.random=()=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
globalThis.postMessage=(message,transfer=[])=>parentPort.postMessage(message,transfer);
await import('../../src/game/simulation.worker.ts');
parentPort.on('message',data=>{
 if(data?.diagnostic==='rng'){parentPort.postMessage({diagnostic:'rng',seed,draws});return;}
 globalThis.onmessage({data});
});
