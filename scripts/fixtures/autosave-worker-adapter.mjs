import {parentPort} from 'node:worker_threads';
import {Game} from '../../src/game/sim.ts';
Game.prototype.reset=()=>{throw Error('Worker validation must not reconstruct terrain');};
Math.random=()=>{throw Error('Worker validation must not consume randomness');};
globalThis.postMessage=result=>parentPort.postMessage(result);
await import('../../src/game/autosave.worker.ts');
parentPort.on('message',data=>globalThis.onmessage({data}));
