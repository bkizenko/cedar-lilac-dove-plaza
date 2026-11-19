import type {Game} from '../game/sim';
/** Sound for a real chronicle line, or null when it needs none. Trade landings chime; cargo taken on the road sounds low, so loss reads as a consequence. */
export function lifeEventSfx(text:string):'trade'|'lose'|null{
 if(/\braiders took\b|\bcargo (was )?lost\b|\bparty was (robbed|lost)\b/i.test(text))return 'lose';
 if(/\bis home:|\bdelivered\b|^traders from .+ arrived\b|^traded \d+/i.test(text))return 'trade';
 return null;
}
export type CueWatch={state?:object;last?:object;lastTime?:number};
/** New team-0 chronicle entries since the last check that carry a trade cue. The first check (and a new village) only learns.
 * The chronicle is capped and shifts, so the last entry seen is tracked by identity (then by time), not by count. */
export function watchLifeCues(g:Game,w:CueWatch):('trade'|'lose')[]{
 const h=g.state.lifeHistory??[],tail=h[h.length-1];
 if(w.state!==g.state){w.state=g.state;w.last=tail;w.lastTime=tail?.time;return [];}
 if(tail===w.last)return [];
 const at=w.last?h.indexOf(w.last as typeof h[number]):-1;
 const fresh=at>=0?h.slice(at+1):h.filter(e=>w.lastTime===undefined||e.time>w.lastTime);
 w.last=tail;w.lastTime=tail?.time;
 const out:('trade'|'lose')[]=[];for(const e of fresh){if(e.team!==0)continue;const s=lifeEventSfx(e.text);if(s)out.push(s);}
 return out;
}
