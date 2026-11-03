import type {Game} from './sim';
export const PERSON_METHOD_RULES=Object.freeze({maximumSamples:240});
type Target=object;
type Saved={target:Target;key:string;descriptor:PropertyDescriptor|undefined;wrapper:Function};
type Row={calls:number;totalMs:number;selfMs:number;inclusive:number[];self:number[]};
/** Opt-in, per-instance probes of named NON-samplers. No prototype patching. */
export class PersonMethodProfile{
 enabled=false;
 private now:()=>number;
 private game:Game|undefined;
 private board:Game['workBoard']|undefined;
 private saved:Saved[]=[];
 private rows=new Map<string,Row>();
 private stack:{children:number}[]=[];
 constructor(now=()=>performance.now()){this.now=now;}
 setEnabled(enabled:boolean,game?:Game){this.enabled=enabled;if(enabled&&game)this.attach(game);else if(!enabled)this.detach();}
 attach(game:Game){
  if(!this.enabled||this.game===game&&this.board===game.workBoard)return;
  this.detach();this.game=game;this.board=game.workBoard;
  for(const key of['steer','workerAI','interactionSpot','nearestWalk'])this.wrap(game,key,`Game.${key}`);
  for(const key of['assign','refresh','labelNavigation'])this.wrap(game.workBoard,key,`WorkBoard.${key}`);
 }
 private wrap(target:Target,key:string,label:string){
  const original=Reflect.get(target,key);if(typeof original!=='function')return;
  const descriptor=Object.getOwnPropertyDescriptor(target,key),profile=this;
  if(descriptor?.configurable===false||!descriptor&&!Object.isExtensible(target))return;
  const wrapper=function(this:unknown,...args:unknown[]){
   const frame={children:0},start=profile.now();profile.stack.push(frame);
   try{return Reflect.apply(original,this,args);}finally{
    const inclusive=Math.max(0,profile.now()-start),self=Math.max(0,inclusive-frame.children);profile.stack.pop();
    const parent=profile.stack.at(-1);if(parent)parent.children+=inclusive;
    const row=profile.rows.get(label)||{calls:0,totalMs:0,selfMs:0,inclusive:[],self:[]};row.calls++;row.totalMs+=inclusive;row.selfMs+=self;row.inclusive.push(inclusive);row.self.push(self);
    if(row.inclusive.length>PERSON_METHOD_RULES.maximumSamples){row.inclusive.shift();row.self.shift();}profile.rows.set(label,row);
   }
  };
  Object.defineProperty(target,key,{value:wrapper,writable:true,configurable:true,enumerable:descriptor?.enumerable??false});
  this.saved.push({target,key,descriptor,wrapper});
 }
 private detach(){
  for(const {target,key,descriptor,wrapper}of this.saved){if(Reflect.get(target,key)!==wrapper)continue;if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);}
  this.saved=[];this.game=undefined;this.board=undefined;
 }
 dispose(){this.enabled=false;this.detach();}
 reset(){this.rows.clear();}
 report(){const summary=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return{samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0,maxMs:sorted.at(-1)||0};};return{enabled:this.enabled,methods:[...this.rows].map(([method,row])=>({method,calls:row.calls,totalMs:row.totalMs,selfTotalMs:row.selfMs,inclusive:summary(row.inclusive),self:summary(row.self)}))};}
}
