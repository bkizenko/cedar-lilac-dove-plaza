import {useEffect,useState} from 'react';
import type {Engine} from '../game/engine';
import type {EngineReadModel,EngineReadQuery} from '../game/engineReadModels';
type Entry={model?:EngineReadModel;error?:string};
/** Mounted controls request owner facts; the display never runs admission helpers. */
export function useOwnerReadModels(engine:Engine,queries:EngineReadQuery[]){
 const signature=JSON.stringify(queries),epoch=engine.dispatchEpoch;
 const [cache,setCache]=useState<{epoch:number;signature:string;entries:Map<string,Entry>}>(()=>({epoch,signature:'',entries:new Map()}));
 useEffect(()=>{
  let active=true,inFlight=false;
  const requested=JSON.parse(signature) as EngineReadQuery[];
  const current=()=>active&&!engine.disposed&&engine.dispatchEpoch===epoch;
  const refresh=async()=>{
   if(!current()||inFlight||!requested.length)return;inFlight=true;
   try{
    const entries=await Promise.all(requested.map(async query=>{
     const key=JSON.stringify(query);
     try{const reply=await engine.readModel(query);return [key,reply.epoch===epoch&&reply.model.kind===query.kind?{model:reply.model}:{error:'Availability belongs to an older session'}] as const;}
     catch(error){return [key,{error:error instanceof Error?error.message:'Actual availability is unavailable'}] as const;}
    }));
    if(current())setCache({epoch,signature,entries:new Map(entries)});
   }finally{inFlight=false;}
  };
  void refresh();const timer=requested.length?globalThis.setInterval(()=>void refresh(),500):undefined;
  return()=>{active=false;if(timer!==undefined)globalThis.clearInterval(timer);};
 },[engine,epoch,signature]);
 return <Q extends EngineReadQuery>(query:Q|null):{model?:Extract<EngineReadModel,{kind:Q['kind']}>;issue:string|null}=>{
  const entry=query&&cache.epoch===epoch&&cache.signature===signature?cache.entries.get(JSON.stringify(query)):undefined;
  return {model:entry?.model as Extract<EngineReadModel,{kind:Q['kind']}>|undefined,issue:entry?.error||(entry?.model?null:'Checking actual availability')};
 };
}
