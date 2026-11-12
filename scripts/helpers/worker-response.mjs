/** Test transport only: exactly one request/reply, bounded even if a worker
 * exits cleanly before answering. Never changes autosave's runtime timeout. */
export function workerResponse(worker,message,{timeoutMilliseconds=30000,label='Worker request'}={}){
 if(!Number.isFinite(timeoutMilliseconds)||timeoutMilliseconds<=0)return Promise.reject(new RangeError('A positive response timeout is required'));
 if(worker.threadId===-1)return Promise.reject(new Error(`${label}: worker already exited`));
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);for(const[event,listener]of listeners)worker.off(event,listener);};
  const finish=(fn,value)=>{cleanup();fn(value);};
  const listeners=[
   ['message',value=>finish(resolve,value)],
   ['error',error=>finish(reject,error)],
   ['messageerror',error=>finish(reject,new Error(`${label}: worker reply could not be deserialized`,{cause:error}))],
   ['exit',code=>finish(reject,new Error(`${label}: worker exited with code ${code} before replying`))],
  ];
  for(const[event,listener]of listeners)worker.once(event,listener);
  timer=setTimeout(()=>finish(reject,new Error(`${label}: no reply within ${timeoutMilliseconds} ms`)),timeoutMilliseconds);
  try{worker.postMessage(message);}catch(error){finish(reject,error);}
 });
}
