import {decodeGame,encodeGame,validateGameSave} from './persistence';
import {serializeStoredSave} from './storageCodec';
import {PRODUCTION_RECIPES,beginProduction,pauseProductionProject,resumeProduction,productionIssue} from './production';
import type {Game} from './sim';
import {LEGACY_WORKER_RNG,SIMULATION_WORKER_RULES as R,type SimulationClock,type SimulationCommand,type SimulationCommandOutcome,type SimulationPoseFrame,type SimulationWorkerPort,type SimulationWorkerRequest,type SimulationWorkerResponse} from './simulationWorkerProtocol';

type Slot={capacity:number;activeFrameId?:number;ids?:ArrayBuffer;poses?:ArrayBuffer};
const integer=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Bound retained fingerprints to supported flat command payloads. */
function commandShape(value:unknown):value is SimulationCommand{
 if(!object(value)||typeof value.kind!=='string')return false;
 const keys:Record<string,string[]>={pause:['kind','paused'],speed:['kind','speed'],move:['kind','unitIds','x','z','attackMove'],'begin-production':['kind','recipe','workplaceId','unitId'],'pause-production':['kind','projectId'],'resume-production':['kind','projectId','unitId']};
 const allowed=Object.hasOwn(keys,value.kind)?keys[value.kind]:undefined;if(!allowed||Object.keys(value).some(k=>!allowed.includes(k)))return false;
 switch(value.kind){
  case 'pause':return typeof value.paused==='boolean';
  case 'speed':return value.speed===1||value.speed===2||value.speed===4;
  case 'move':return Array.isArray(value.unitIds)&&value.unitIds.length>0&&value.unitIds.length<=R.maximumActorsPerCommand&&Array.from(value.unitIds).every(integer)&&typeof value.x==='number'&&Number.isFinite(value.x)&&typeof value.z==='number'&&Number.isFinite(value.z)&&(value.attackMove===undefined||typeof value.attackMove==='boolean');
  case 'begin-production':return typeof value.recipe==='string'&&Object.hasOwn(PRODUCTION_RECIPES,value.recipe)&&integer(value.workplaceId)&&integer(value.unitId);
  case 'pause-production':return integer(value.projectId);
  case 'resume-production':return integer(value.projectId)&&(value.unitId===undefined||integer(value.unitId));
  default:return false;
 }
}
/** The only Game owner. New transport core; no Engine/UI activation. */
export class SimulationWorkerRuntime {
 private game:Game|null=null;
 private epoch=0;private lastRequestId=0;private sequence=0;private tick=0;private revision=0;
 private commandOutcomes=new Map<number,{fingerprint:string;outcome:SimulationCommandOutcome}>();
 private slots:Slot[]=[];private nextFrameId=0;private droppedFrames=0;
 private port:SimulationWorkerPort;private now:()=>number;
 constructor(port:SimulationWorkerPort,now=()=>performance.now()){this.port=port;this.now=now;}
 private clock():SimulationClock{const g=this.game!;return{tick:this.tick,time:g.state.time,paused:g.state.paused,speed:g.state.speed,stateRevision:this.revision,appliedSequence:this.sequence};}
 private send(message:SimulationWorkerResponse,transfer:Transferable[]=[]){this.port.postMessage(message,transfer);}
 private error(epoch:number,requestId:number,code:string,message:string){this.send({type:'error',epoch,requestId,code,message,appliedSequence:this.sequence});}
 receive(input:unknown){
  if(!object(input)||!integer(input.epoch)||!integer(input.requestId))return;
  const epoch=input.epoch,requestId=input.requestId;
  if(input.type==='initialize'){
   if(input.protocolVersion!==R.version){this.error(epoch,requestId,'protocol-version','Unsupported simulation worker protocol');return;}
   if(epoch<=this.epoch){this.error(epoch,requestId,'stale-epoch','Initialization requires a new session epoch');return;}
   if(input.rngMode!=='legacy-worker-random'){this.error(epoch,requestId,'rng-policy','Legacy RNG limitation must be explicitly acknowledged');return;}
   try{const game=decodeGame(input.snapshot);
    if(!integer(game.state.nextId)||[...game.state.units,...game.state.buildings,...(game.state.production?.projects||[])].some(e=>!integer(e.id)))throw new Error('Worker core requires positive safe-integer entity identities');
    this.game=game;this.epoch=epoch;this.lastRequestId=requestId;this.sequence=0;this.tick=0;this.revision=0;this.commandOutcomes.clear();this.slots=[];this.nextFrameId=0;this.droppedFrames=0;
    this.send({type:'ready',protocolVersion:1,epoch,requestId,clock:this.clock(),rng:LEGACY_WORKER_RNG});
   }catch(error){this.error(epoch,requestId,'invalid-save',error instanceof Error?error.message:'Invalid saved village');}
   return;
  }
  if(!this.game||epoch!==this.epoch){this.error(epoch,requestId,'stale-epoch','No matching authoritative simulation session');return;}
  // Every transport request is exactly once, including advance/checkpoint/recycle.
  if(requestId<=this.lastRequestId){this.error(epoch,requestId,'duplicate-request','Request IDs must increase within the session');return;}
  this.lastRequestId=requestId;
  try{const message=input as unknown as SimulationWorkerRequest;
   if(message.type==='command'){this.command(message);return;}
   if(message.type==='recycle'){this.recycle(message);return;}
   if(message.type==='inspect'){this.inspect(message);return;}
   if(message.type!=='advance'&&message.type!=='checkpoint'){this.error(epoch,requestId,'unsupported-request','This request is not implemented');return;}
   if(!Number.isSafeInteger(message.afterSequence)||message.afterSequence!==this.sequence){this.error(epoch,requestId,'sequence-barrier','Request does not match the latest applied command');return;}
   if(message.type==='checkpoint'){
    const snapshot=encodeGame(this.game);validateGameSave(snapshot);
    this.send({type:'checkpoint',epoch,requestId,clock:this.clock(),serialized:serializeStoredSave(snapshot),rng:LEGACY_WORKER_RNG});return;
   }
   if(!Number.isSafeInteger(message.ticks)||message.ticks<0||message.ticks>R.maximumTicksPerRequest){this.error(epoch,requestId,'tick-budget','Tick batch exceeds the bounded core request');return;}
   const start=this.now();for(let i=0;i<message.ticks;i++){this.game.step(R.stepSeconds);this.tick++;this.revision++;}
   const frame=this.poseFrame();this.send({type:'advanced',epoch,requestId,clock:this.clock(),ticks:message.ticks,cpuMilliseconds:Math.max(0,this.now()-start),frame,poseFramesInFlight:this.slots.filter(s=>s.activeFrameId!==undefined).length,droppedPoseFrames:this.droppedFrames,simulationErrors:this.game.simulationErrors.map(e=>({...e}))},frame?[frame.ids.buffer as ArrayBuffer,frame.poses.buffer as ArrayBuffer]:[]);
  }catch(error){this.game.state.paused=true;this.error(epoch,requestId,'runtime-error',error instanceof Error?error.message:'Simulation worker failed');}
 }
 private command(message:Extract<SimulationWorkerRequest,{type:'command'}>){
  const {epoch,requestId,sequence,command}=message;
  if(!integer(sequence)){this.error(epoch,requestId,'command-sequence','Invalid command sequence');return;}
  const shape=commandShape(command),fingerprint=shape?JSON.stringify(command):'invalid-command';
  if(sequence<=this.sequence){const previous=this.commandOutcomes.get(sequence);
   if(!previous){this.error(epoch,requestId,'outcome-expired','Old command outcome is no longer retained; command was not executed again');return;}
   if(previous.fingerprint!==fingerprint){this.error(epoch,requestId,'duplicate-conflict','Same sequence was already used by another command');return;}
   this.send({type:'command-result',epoch,requestId,clock:this.clock(),outcome:{...previous.outcome,duplicate:true}});return;
  }
  if(sequence!==this.sequence+1){this.error(epoch,requestId,'command-gap','Commands must arrive in order');return;}
  const result=shape?this.execute(command):{accepted:false,reason:'Unsupported or malformed command payload'};this.sequence=sequence;this.revision++;
  const outcome:SimulationCommandOutcome={sequence,...result,duplicate:false};this.commandOutcomes.set(sequence,{fingerprint,outcome});
  while(this.commandOutcomes.size>R.retainedCommandOutcomes)this.commandOutcomes.delete(this.commandOutcomes.keys().next().value!);
  this.send({type:'command-result',epoch,requestId,clock:this.clock(),outcome});
 }
 private execute(command:SimulationCommand):{accepted:boolean;reason:string;projectId?:number}{
  const g=this.game!,no=(reason:string)=>({accepted:false,reason});if(!object(command))return no('Invalid command');
  switch(command.kind){
   case 'pause':if(typeof command.paused!=='boolean')return no('Invalid pause value');g.state.paused=command.paused;return{accepted:true,reason:'Pause applied'};
   case 'speed':if(![1,2,4].includes(command.speed))return no('Invalid simulation speed');g.state.speed=command.speed;return{accepted:true,reason:'Speed applied'};
   case 'move':{
    if(!Array.isArray(command.unitIds)||!command.unitIds.length||command.unitIds.length>R.maximumActorsPerCommand||command.unitIds.some(id=>!integer(id))||new Set(command.unitIds).size!==command.unitIds.length)return no('Choose distinct existing residents');
    if(!Number.isFinite(command.x)||!Number.isFinite(command.z)||Math.abs(command.x)>g.world.size/2-1||Math.abs(command.z)>g.world.size/2-1||command.attackMove!==undefined&&typeof command.attackMove!=='boolean')return no('Invalid destination');
    const units=command.unitIds.map(id=>g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0&&!u.prisoner&&!u.boat));if(units.some(u=>!u))return no('An original land resident is unavailable; this core does not implement hull orders');
    g.clearSelect();for(const u of units)g.selectEntity(u!,true);g.issueMove(command.x,command.z,command.attackMove===true);return{accepted:true,reason:'Move issued to original residents'};
   }
   case 'begin-production':{
    if(!integer(command.workplaceId)||!integer(command.unitId)||typeof command.recipe!=='string'||!Object.hasOwn(PRODUCTION_RECIPES,command.recipe))return no('Invalid recipe or original actor/workplace ID');
    const b=g.state.buildings.find(b=>b.id===command.workplaceId&&b.team===0&&b.hp>0),u=g.state.units.find(u=>u.id===command.unitId&&u.team===0&&u.hp>0);if(!b||!u)return no('The original owned workplace or person is unavailable');
    const issue=productionIssue(g,command.recipe,b.id,u.id);if(issue)return no(issue);
    if(!beginProduction(g,command.recipe,b.id,u.id))return no(g.state.banner||'Paid production admission failed');
    return{accepted:true,reason:'Actual inputs paid once; original person begins work',projectId:u.productionProjectId};
   }
   case 'pause-production':case 'resume-production':{
    if(!integer(command.projectId)||!g.state.production?.projects.some(p=>p.id===command.projectId&&p.team===0))return no('The original owned project is unavailable');
    if(command.kind==='resume-production'&&command.unitId!==undefined&&(!integer(command.unitId)||!g.state.units.some(u=>u.id===command.unitId&&u.team===0&&u.hp>0)))return no('The original owned person is unavailable');
    const accepted=command.kind==='pause-production'?pauseProductionProject(g,command.projectId):resumeProduction(g,command.projectId,command.unitId);return{accepted,reason:accepted?'Original paid project updated':'Original paid project cannot make that transition'};
   }
   default:return no('This gameplay command is not implemented by the isolated core');
  }
 }
 private inspect(message:Extract<SimulationWorkerRequest,{type:'inspect'}>){
  const g=this.game!,q=message.query;let data:unknown;
  if(object(q)&&q.kind==='inventory'){const t=g.tribe(0);data={food:t.food,foodLots:{...t.foodLots},wood:t.wood,stone:t.stone,items:{...t.items},waterLiters:t.survival?.waterLiters??0};}
  else if(object(q)&&q.kind==='production'&&integer(q.projectId)){const p=g.state.production?.projects.find(p=>p.id===q.projectId&&p.team===0);data=p?{id:p.id,recipe:p.recipe,phase:p.phase,progress:p.progress,actorId:p.actorId,blockedReason:p.blockedReason}:null;}
  else{this.error(message.epoch,message.requestId,'unsupported-query','Unsupported core read query');return;}
  this.send({type:'inspection',epoch:message.epoch,requestId:message.requestId,clock:this.clock(),data});
 }
 private poseFrame():SimulationPoseFrame|undefined{
  const g=this.game!,count=g.state.units.length;if(count>R.maximumPoseEntities){this.droppedFrames++;return;}
  let slot=this.slots.find(s=>s.activeFrameId===undefined);
  if(!slot){if(this.slots.length>=R.maximumPoseFrames){this.droppedFrames++;return;}slot={capacity:0};this.slots.push(slot);}
  const capacity=Math.max(16,2**Math.ceil(Math.log2(Math.max(1,count))));
  if(slot.capacity<capacity){slot.capacity=capacity;slot.ids=new ArrayBuffer(capacity*8);slot.poses=new ArrayBuffer(capacity*R.poseStride*4);}
  if(!slot.ids||!slot.poses)throw new Error('Pose buffer custody is inconsistent');
  const ids=new Float64Array(slot.ids),poses=new Float32Array(slot.poses);
  for(let i=0;i<count;i++){const u=g.state.units[i],k=i*R.poseStride;ids[i]=u.id;poses[k]=u.x;poses[k+1]=u.y;poses[k+2]=u.z;poses[k+3]=u.facing;poses[k+4]=u.stride;poses[k+5]=u.hp;poses[k+6]=u.maxHp;poses[k+7]=u.vx;poses[k+8]=u.vz;}
  const frameId=++this.nextFrameId;slot.activeFrameId=frameId;slot.ids=undefined;slot.poses=undefined;
  return{epoch:this.epoch,frameId,count,capacity:slot.capacity,stride:9,tick:this.tick,time:g.state.time,stateRevision:this.revision,ids,poses};
 }
 private recycle(message:Extract<SimulationWorkerRequest,{type:'recycle'}>){
  const slot=this.slots.find(s=>s.activeFrameId===message.frameId);
  if(!slot||!(message.ids instanceof ArrayBuffer)||!(message.poses instanceof ArrayBuffer)||message.ids.byteLength!==slot.capacity*8||message.poses.byteLength!==slot.capacity*R.poseStride*4){this.error(message.epoch,message.requestId,'buffer-custody','Unknown, reused or invalid pose buffer');return;}
  slot.ids=message.ids;slot.poses=message.poses;slot.activeFrameId=undefined;this.send({type:'recycled',epoch:message.epoch,requestId:message.requestId,frameId:message.frameId});
 }
}
