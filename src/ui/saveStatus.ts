/** Save-trust read model for the Menu: what is stored, how old, and why autosave fell back. Read-only; never decodes or alters a village. */
import {yearSecondsOf} from '../game/calendarPacing';
export type SaveSlotKind='latest'|'backup'|'protected';
export type SaveSlotInfo={kind:SaveSlotKind;label:string;savedAt:number|null;seed:number|null;generation:number|null;/** in-game year (1-based) and living home residents, read from the stored state; null when unknown */year:number|null;people:number|null;/** stored in-game seconds, to match a loaded village to its copy */time:number|null};
export type AutosaveFailure={reason:string;phase:string}|null;
const LABELS:Record<SaveSlotKind,string>={latest:'Latest',backup:'Previous',protected:'Protected'};
/** Reads only header facts from an already-parsed save; anything unexpected yields nulls rather than throwing. */
export function slotInfo(kind:SaveSlotKind,parsed:unknown):SaveSlotInfo|null{
 if(!parsed||typeof parsed!=='object')return null;
 const d=parsed as {savedAt?:unknown;state?:{seed?:unknown;worldgenVersion?:unknown;time?:unknown;yearLength?:unknown;units?:unknown}};
 if(!d.state||typeof d.state!=='object')return null;
 const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const time=num(d.state.time),len=num(d.state.yearLength),units=Array.isArray(d.state.units)?d.state.units as {team?:unknown;hp?:unknown;prisoner?:unknown;type?:unknown}[]:null;
 const year=time===null?null:Math.floor(time/yearSecondsOf({yearLength:len??undefined}))+1;
 const people=units?units.filter(u=>u&&u.team===0&&typeof u.hp==='number'&&u.hp>0&&!u.prisoner&&u.type==='worker').length:null;
 return{kind,label:LABELS[kind],savedAt:num(d.savedAt),seed:num(d.state.seed),generation:num(d.state.worldgenVersion)??1,year,people,time};
}
export function ageText(savedAt:number|null,now:number):string{
 if(savedAt===null||savedAt<=0)return 'time unknown';
 const s=Math.max(0,Math.round((now-savedAt)/1000));
 if(s<45)return 'just now';
 if(s<3600)return `${Math.max(1,Math.round(s/60))} min ago`;
 if(s<86400)return `${Math.round(s/3600)} h ago`;
 const d=Math.round(s/86400);return d===1?'yesterday':`${d} days ago`;
}
const REASONS:Record<string,string>={
 'timeout':'the background saver was too slow',
 'worker-error':'the background saver stopped',
 'message-error':'the background saver sent unreadable data',
 'dispatch-error':'the background saver could not start',
 'snapshot-error':'the village snapshot could not be prepared',
 'malformed-response':'the background saver sent a bad reply',
 'storage-read':'browser storage could not be read',
};
export type AutosaveLine={tone:'good'|'warn'|'bad';text:string;detail?:string};
/** Plain-language autosave health. A fallback is still a save; only a failed commit is "bad". */
export function autosaveLine(input:{mode:string;failure:AutosaveFailure;failedCommits:number;nextAttemptMs:number|null;testMode?:boolean}):AutosaveLine{
 if(input.testMode)return{tone:'warn',text:'Test Lab runs are not autosaved',detail:'Use Save to keep this run.'};
 if(input.failedCommits>0)return{tone:'bad',text:'Autosave could not write to browser storage',detail:'Press Save now, then download the village file from Tools to keep a copy.'};
 if(input.mode==='synchronous fallback'){
  const why=input.failure?REASONS[input.failure.reason]??'the background saver had a problem':'the background saver is paused';
  const retry=input.nextAttemptMs!==null&&input.nextAttemptMs>0?` Trying the background saver again in about ${Math.max(1,Math.round(input.nextAttemptMs/1000))} s.`:'';
  return{tone:'warn',text:'Autosave is working, in a slower way',detail:`Your village is still being saved because ${why}.${retry}`};
 }
 return{tone:'good',text:'Autosave is on'};
}
/** Which stored copy a freshly loaded village came from: the slot whose stored in-game time matches the loaded
 * one (within a second); a Protected match wins (restoring it re-saves Latest), then Latest, then Previous.
 * null when none matches (for example an imported file). */
const RANK:Record<SaveSlotKind,number>={protected:0,latest:1,backup:2};
export function loadedSlot(slots:readonly SaveSlotInfo[],loadedTime:number){
 return [...slots].filter(s=>s.time!==null&&Math.abs(s.time-loadedTime)<=1).sort((a,b)=>RANK[a.kind]-RANK[b.kind])[0]??null;
}
