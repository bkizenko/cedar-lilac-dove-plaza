import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {workerResponse} from './helpers/worker-response.mjs';
class Port extends EventEmitter{threadId=1;postMessage(message){this.post?.(message);}}
const clean=port=>{for(const event of ['message','error','messageerror','exit'])assert.equal(port.listenerCount(event),0,event+' leaked a response listener');};
test('reply cleans every terminal listener and leaves other observers intact',async()=>{const p=new Port(),observer=()=>{};p.on('message',observer);p.post=m=>p.emit('message',{id:m.id,status:'ready'});assert.deepEqual(await workerResponse(p,{id:8}),{id:8,status:'ready'});assert.equal(p.listenerCount('message'),1);p.off('message',observer);clean(p);});
test('worker error rejects with the original stack and cleans pending listeners',async()=>{const p=new Port(),error=new Error('import failed');p.post=()=>p.emit('error',error);await assert.rejects(workerResponse(p,{}),e=>e===error);clean(p);});
test('even clean early worker exit rejects instead of waiting forever',async()=>{const p=new Port();p.post=()=>p.emit('exit',0);await assert.rejects(workerResponse(p,{}, {label:'Autosave preflight'}),/Autosave preflight: worker exited with code 0 before replying/);clean(p);});
test('nonzero worker exit retains exit code and request phase',async()=>{const p=new Port();p.post=()=>p.emit('exit',7);await assert.rejects(workerResponse(p,{}, {label:'Serialization'}),/Serialization: worker exited with code 7/);clean(p);});
test('message decoding errors have a bounded terminal rejection',async()=>{const p=new Port(),cause=new Error('clone invalid');p.post=()=>p.emit('messageerror',cause);await assert.rejects(workerResponse(p,{}),e=>e.cause===cause&&/deserialized/.test(e.message));clean(p);});
test('silent worker hits the explicit response bound and releases listeners',async()=>{const p=new Port();await assert.rejects(workerResponse(p,{}, {timeoutMilliseconds:5,label:'Silent autosave'}),/Silent autosave: no reply within 5 ms/);clean(p);});
test('synchronous postMessage failure cleans the same listener set',async()=>{const p=new Port(),error=new Error('port closed');p.post=()=>{throw error;};await assert.rejects(workerResponse(p,{}),e=>e===error);clean(p);});
test('already exited workers and invalid limits fail without admitting a request',async()=>{const p=new Port();let sent=0;p.post=()=>sent++;p.threadId=-1;await assert.rejects(workerResponse(p,{}),/already exited/);p.threadId=1;await assert.rejects(workerResponse(p,{}, {timeoutMilliseconds:Infinity}),RangeError);assert.equal(sent,0);clean(p);});
