/** Bounded test-only probes of NON-samplers. No timing/FPS inference. */
export function workboardCounters(g){
 const b=g.workBoard,rows={reset:0,invalidateTasks:0,refreshCalls:0,fullRefreshes:0,reusedRefreshes:0,obstructionClears:0,labelCalls:0,labelRevisions:0,labelFloodFills:0,reasonSamples:0,reasonBudget:256,reasons:{}},original=[];
 const wrap=(key,fn)=>{const f=b[key];if(typeof f!=='function')return;const own=Object.getOwnPropertyDescriptor(b,key);b[key]=function(...args){return fn.call(this,f,args);};original.push([key,own,b[key]]);};
 const reason=kind=>{if(rows.reasonSamples>=rows.reasonBudget)return;rows.reasonSamples++;const stack=new Error().stack.split('\n').slice(1),line=stack.find(s=>s.includes('/src/game/')&&!s.includes('/settlement.ts:'));const match=line?.match(/at\s+(.*?)\s+\(.*\/src\/game\/([^:]+):(\d+):\d+\)/);const key=match?`${kind}:${match[2]}:${match[3]}:${match[1]}`:`${kind}:unclassified`;if(Object.keys(rows.reasons).length<32||key in rows.reasons)rows.reasons[key]=(rows.reasons[key]||0)+1;else rows.reasons.other=(rows.reasons.other||0)+1;};
 for(const key of['reset','invalidateTasks'])wrap(key,function(f,args){rows[key]++;reason(key);return Reflect.apply(f,this,args);});
 wrap('refresh',function(f,args){const [game]=args,reuse=game.state.time<this.next&&this.obstructionWorld===game.world&&this.obstructionState===game.state;rows.refreshCalls++;rows[reuse?'reusedRefreshes':'fullRefreshes']++;return Reflect.apply(f,this,args);});
 wrap('refreshObstructions',function(f,args){const old=this.obstructedResources;try{return Reflect.apply(f,this,args);}finally{if(old!==this.obstructedResources)rows.obstructionClears++;}});
 wrap('labelNavigation',function(f,args){rows.labelCalls++;const revision=this.revision,labels=this.labels;try{return Reflect.apply(f,this,args);}finally{if(revision!==this.revision)rows.labelRevisions++;if(labels!==this.labels)rows.labelFloodFills++;}});
 return{rows,restore(){for(const [key,own,wrapper]of original){if(b[key]!==wrapper)continue;if(own)Object.defineProperty(b,key,own);else delete b[key];}}};
}
