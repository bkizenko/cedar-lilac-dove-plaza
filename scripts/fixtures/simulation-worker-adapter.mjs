import {parentPort} from 'node:worker_threads';
// Same actual module Worker entry as browser production; no Game.step/reset mocks.
globalThis.postMessage=(message,transfer=[])=>parentPort.postMessage(message,transfer);
await import('../../src/game/simulation.worker.ts');
parentPort.on('message',data=>globalThis.onmessage({data}));
