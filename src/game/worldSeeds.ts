/** New games consume a persisted permutation of the 32-bit terrain seed space.
 * Explicit seeds and save reconstruction bypass this allocator. Storage removal,
 * separate browser profiles and concurrent tabs are outside its uniqueness scope. */
export const WORLD_SEED_KEY='hearthwild.world-sequence.v1';
type Cursor={version:1;salt:number;next:number};
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
const SPACE=0x100000000;
function entropy(){const word=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(word);else word[0]=(Math.random()*SPACE)>>>0;return word[0];}
function browserStorage():StoragePort|undefined{try{return globalThis.localStorage;}catch{return undefined;}}
function valid(value:unknown):value is Cursor{const c=value as Cursor;return !!c&&c.version===1&&Number.isInteger(c.salt)&&c.salt>=0&&c.salt<SPACE&&Number.isSafeInteger(c.next)&&c.next>=0&&c.next<=SPACE;}
/** An odd multiplier and xor are bijections, so counter values cannot collide. */
export function seedAt(index:number,salt:number){return (Math.imul(index,0x9e3779b1)^(salt>>>0))|0;}
export function createWorldSeedAllocator(storage:()=>StoragePort|undefined=browserStorage,random:()=>number=entropy){
 let memory:Cursor|undefined;
 return()=>{
  const port=storage();let cursor=memory;
  try{const raw=port?.getItem(WORLD_SEED_KEY);if(raw){const stored:unknown=JSON.parse(raw);if(valid(stored)&&(!cursor||(stored.salt===cursor.salt&&stored.next>cursor.next)))cursor=stored;}}catch{/* Private mode or corrupt preferences use this session's cursor. */}
  cursor??={version:1,salt:random()>>>0,next:0};
  if(cursor.next>=SPACE)throw new Error('All fresh world seeds have been used in this browser profile');
  const seed=seedAt(cursor.next,cursor.salt);memory={...cursor,next:cursor.next+1};
  try{port?.setItem(WORLD_SEED_KEY,JSON.stringify(memory));}catch{/* Keep no-repeat allocation alive in memory when persistence is unavailable. */}
  return seed;
 };
}
export const nextWorldSeed=createWorldSeedAllocator();
