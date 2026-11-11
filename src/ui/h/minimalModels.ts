/** Minimal-UI view models (Option H): short, hard-capped text. Pure; they present what the simulation owns
 * (src/game/knowledge.ts topics, production queue entries, src/game/seasonReports.ts samples, real need signals)
 * and never invent evidence, totals or alerts. Every text field is clipped to a word budget; `viewWords`
 * counts what a view would display so tests can hold each model to its limit.
 *
 *  - knowledge: short method cards with evidence chips (what was observed, how far a trial got, what was proven);
 *  - crafting: icon + queue boxes with progress and one-line cause when stalled;
 *  - ledger: tabs production / history / seasonal comparison; the season report exists only at season end;
 *  - notifications: urgent needs only, one line "cause - remedy"; raid arrival is never announced. */
import {compactNumber} from './compactModel';
import {goodIconId} from '../../scene/goodsVisuals';

export const WORD_LIMITS={knowledgeCard:40,craftBox:14,ledgerTab:70,seasonReport:60,notice:18,noticeStack:3} as const;
export const wordsOf=(s:string)=>s.trim().split(/\s+/).filter(Boolean);
/** Clip text to at most n words, marking the cut. */
export const clipWords=(s:string|undefined|null,n:number)=>{const w=wordsOf(String(s??''));return w.length<=n?w.join(' '):w.slice(0,Math.max(1,n-1)).join(' ')+'…';};
const NOT_SHOWN=new Set(['id','icon','kind','state','tab','enabled','stage','tone','sparkline','percent','values']);
/** Words a view would put on screen (strings and numbers; ids, icons and states are not read by the player). */
export function viewWords(v:unknown):number{
 if(v===null||v===undefined)return 0;if(typeof v==='string')return wordsOf(v).length;if(typeof v==='number')return 1;if(typeof v==='boolean')return 0;
 if(Array.isArray(v))return v.reduce((n:number,x)=>n+viewWords(x),0);
 return Object.entries(v as Record<string,unknown>).reduce((n,[k,x])=>n+(NOT_SHOWN.has(k)?0:viewWords(x)),0);
}

// ---- Knowledge: short method cards with evidence chips.
export type TopicLike={id:string;title:string;need?:string;stage:'need'|'observation'|'experiment'|'proven'|'adoption';observation?:string;experiment?:string;result?:string;adoption?:string;
 progress?:{completed:number;required:number;unit:string};metrics?:Record<string,number>;actions:{id:string;label:string;blockedReason:string|null}[];limitation?:string};
export type EvidenceChip={label:string;value:string;tone:'seen'|'trial'|'proven'|'warn'};
export type KnowledgeCard={id:string;title:string;stage:TopicLike['stage'];stageText:string;/** one line: what to do next */method:string;evidence:EvidenceChip[];action?:{id:string;label:string;enabled:boolean;why?:string}};
const STAGE_TEXT:Record<TopicLike['stage'],string>={need:'Unexplored',observation:'Observed',experiment:'Trying',proven:'Proven',adoption:'In use'};
const STAGE_ORDER:Record<TopicLike['stage'],number>={experiment:0,observation:1,proven:2,need:3,adoption:4};
export function knowledgeCards(topics:readonly TopicLike[],limit=6):{cards:KnowledgeCard[];more:number}{
 const sorted=[...topics].sort((a,b)=>STAGE_ORDER[a.stage]-STAGE_ORDER[b.stage]||a.title.localeCompare(b.title));
 const cards=sorted.slice(0,limit).map(t=>{
  const action=t.actions.find(a=>!a.blockedReason)??t.actions[0],ev:EvidenceChip[]=[];
  if(t.stage!=='need'&&t.observation)ev.push({label:'Seen',value:clipWords(t.observation,6),tone:'seen'});
  if(t.progress&&t.progress.required>0)ev.push({label:clipWords(t.progress.unit,2),value:`${compactNumber(Math.min(t.progress.completed,t.progress.required))}/${compactNumber(t.progress.required)}`,tone:'trial'});
  if((t.stage==='proven'||t.stage==='adoption')&&t.result)ev.push({label:'Result',value:clipWords(t.result,6),tone:'proven'});
  if(t.limitation)ev.push({label:'Limit',value:clipWords(t.limitation,5),tone:'warn'});
  if(!ev.length)ev.push({label:'Evidence',value:'none yet',tone:'seen'});
  // Budget: title 5 + method 10 + three chips; trim chips until the card fits.
  const card:KnowledgeCard={id:t.id,title:clipWords(t.title,5),stage:t.stage,stageText:STAGE_TEXT[t.stage],method:clipWords(t.stage==='need'?t.need:t.experiment||t.need,10),evidence:ev.slice(0,3),
   ...(action?{action:{id:action.id,label:clipWords(action.label,3),enabled:!action.blockedReason,...(action.blockedReason?{why:clipWords(action.blockedReason,8)}:{})}}:{})};
  while(viewWords(card)>WORD_LIMITS.knowledgeCard&&card.evidence.length>1)card.evidence.pop();
  return card;});
 return {cards,more:Math.max(0,sorted.length-limit)};
}

// ---- Crafting: icon + queue boxes.
export type CraftEntry={recipe:string;label:string;progress:number;phase?:string;paused?:boolean;blockedReason?:string;worker?:string;output?:{kind:string;amount:number}};
export type CraftBox={icon:string;label:string;percent:number;state:'working'|'waiting'|'paused'|'blocked'|'done';/** one short line, only when not simply working */cause?:string;output?:string};
const FAMILY_ICON:[RegExp,string]=[/^(thresh|winnow|grind)/,'grain'] as unknown as [RegExp,string];
export function craftIcon(e:CraftEntry){if(e.output)return goodIconId(e.output.kind);return /^(thresh|winnow|grind|bake|cook|ferment)/.test(e.recipe)?'provisions':/^(spin|weave|sew|wash|felt)/.test(e.recipe)?'cloth':/^(twist)/.test(e.recipe)?'cordage':/^(form|fire|dry)/.test(e.recipe)?'pot':'parcel';}
void FAMILY_ICON;
export function craftingBoxes(entries:readonly CraftEntry[],limit=4):{boxes:CraftBox[];more:number}{
 const boxes=entries.slice(0,limit).map(e=>{
  const p=Math.max(0,Math.min(1,Number.isFinite(e.progress)?e.progress:0)),state:CraftBox['state']=p>=1?'done':e.blockedReason?'blocked':e.paused?'paused':e.phase==='working'||p>0?'working':'waiting';
  const cause=state==='blocked'?e.blockedReason:state==='paused'?'Paused':state==='waiting'?(e.worker?undefined:'Needs a free worker'):undefined;
  return {icon:craftIcon(e),label:clipWords(e.label,4),percent:Math.round(p*100),state,...(cause?{cause:clipWords(cause,8)}:{}),...(e.output?{output:`${compactNumber(e.output.amount)}`}:{})} as CraftBox;});
 return {boxes,more:Math.max(0,entries.length-limit)};
}

// ---- Ledger: tabs and a season-end-only report.
export type Counts=Record<'food'|'wood'|'stone'|'copper'|'iron'|'weapons',number>;
export type SampleLike={season:number;partial:boolean;totals:Counts;stock:Counts};
export type LedgerInput={active:SampleLike;history:readonly SampleLike[];/** simulated seconds since the last season ended */secondsSinceSeasonEnd?:number};
export const SEASON_NAMES=['Spring','Summer','Autumn','Winter'] as const;
export const SEASON_REPORT_WINDOW_SECONDS=90;
const METRICS=['food','wood','stone','copper','iron','weapons'] as const;
export type LedgerRow={label:string;value:string;delta?:string;tone?:'up'|'down'|'flat'};
export type LedgerView={tab:'production'|'history'|'seasons';title:string;rows:LedgerRow[];note?:string;sparkline?:Record<string,number[]>};
const seasonName=(i:number)=>SEASON_NAMES[((Math.floor(i)%4)+4)%4];
const delta=(a:number,b:number)=>{const d=a-b;return {delta:`${d>0?'+':d<0?'-':''}${compactNumber(Math.abs(d))}`,tone:(d>0?'up':d<0?'down':'flat') as 'up'|'down'|'flat'};};
export function ledgerView(tab:LedgerView['tab'],input:LedgerInput):LedgerView{
 const {active,history}=input;
 if(tab==='production')return {tab,title:`${seasonName(active.season)} so far`,rows:METRICS.filter(m=>active.totals[m]>0||active.stock[m]>0).map(m=>({label:m[0].toUpperCase()+m.slice(1),value:compactNumber(active.totals[m]),...(history.length?delta(active.totals[m],history[history.length-1].totals[m]):{})})),...(active.partial?{note:'Season in progress'}:{})};
 if(tab==='history'){const last=history.slice(-6);const spark:Record<string,number[]>={};for(const m of METRICS)spark[m]=last.map(s=>s.totals[m]);
  return {tab,title:'Recent seasons',rows:last.map(s=>({label:seasonName(s.season),value:`${compactNumber(s.totals.food)} food`,...(s.partial?{delta:'partial'}:{})})).reverse(),sparkline:spark,...(last.length?{}:{note:'No finished season yet'})};}
 // Seasonal comparison: the latest finished season against the one before it (same year-on-year season when 4+ finished).
 const done=history.filter(s=>!s.partial);if(done.length<2)return {tab,title:'Season comparison',rows:[],note:'Needs two finished seasons'};
 const cur=done[done.length-1],prev=done.length>=5?done[done.length-5]:done[done.length-2];
 return {tab,title:`${seasonName(cur.season)} vs ${seasonName(prev.season)}`,rows:METRICS.filter(m=>cur.totals[m]>0||prev.totals[m]>0).map(m=>({label:m[0].toUpperCase()+m.slice(1),value:compactNumber(cur.totals[m]),...delta(cur.totals[m],prev.totals[m])}))};
}
/** The season report: present only in the window after a season ends, never mid-season. */
export function seasonEndReport(input:LedgerInput):{title:string;rows:LedgerRow[]}|null{
 const s=input.secondsSinceSeasonEnd;if(s===undefined||!(s>=0)||s>SEASON_REPORT_WINDOW_SECONDS)return null;
 const done=input.history.filter(x=>!x.partial);if(!done.length)return null;const cur=done[done.length-1],prev=done[done.length-2];
 const rows:LedgerRow[]=METRICS.filter(m=>cur.totals[m]>0).slice(0,5).map(m=>({label:m[0].toUpperCase()+m.slice(1),value:compactNumber(cur.totals[m]),...(prev?delta(cur.totals[m],prev.totals[m]):{})}));
 return {title:`${seasonName(cur.season)} ended`,rows};
}

// ---- Notifications: urgent needs only, one line, never a raid landing.
export type Signal={id:string;kind:string;urgency:number;cause:string;remedy:string};
/** Kinds that may interrupt the player. Raids and arrivals are deliberately absent. */
export const URGENT_KINDS=['starvation','dehydration','freezing','homeless','sickness','workers-idle','blocked-critical'] as const;
export const NEVER_NOTIFY=/raid|landing|landed|arriv|attack|enemy|invasion/i;
export const NOTICE_RULES={minimumUrgency:.6,repeatSeconds:60,maximum:WORD_LIMITS.noticeStack} as const;
export type Notice={id:string;kind:string;line:string;tone:'urgent'|'warn'};
export function notificationsView(signals:readonly Signal[],shown:Record<string,number>,now:number):{items:Notice[];shown:Record<string,number>}{
 const seen=new Set<string>(),out:Notice[]=[],next={...shown};
 const ok=signals.filter(s=>(URGENT_KINDS as readonly string[]).includes(s.kind)&&!NEVER_NOTIFY.test(s.kind)&&!NEVER_NOTIFY.test(s.id)&&Number.isFinite(s.urgency)&&s.urgency>=NOTICE_RULES.minimumUrgency).sort((a,b)=>b.urgency-a.urgency||a.id.localeCompare(b.id));
 for(const s of ok){if(out.length>=NOTICE_RULES.maximum)break;if(seen.has(s.kind))continue;seen.add(s.kind);
  if(shown[s.id]!==undefined&&now-shown[s.id]<NOTICE_RULES.repeatSeconds)continue;
  next[s.id]=now;out.push({id:s.id,kind:s.kind,line:`${clipWords(s.cause,9)} - ${clipWords(s.remedy,7)}`,tone:s.urgency>=.85?'urgent':'warn'});}
 return {items:out,shown:next};
}
