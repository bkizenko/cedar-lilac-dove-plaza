/** Per-game society skins (optional save field `state.skins`). Each society slot (team id) carries ONE CivSkin from the first frame to the last:
 * derived from civGenerator output (generateCiv / generateCast, the same cast the rulers lane uses) and stored here so it never changes mid-game.
 * Old saves have none: `ensureSkins` derives the same skins deterministically from the world seed and writes them back.
 * The player's slot may be chosen in WorldSetup (SkinRequest); every rival slot takes the cast default. Pure: no Game import. */
import {generateCast,generateCiv,type Mode} from './civGenerator';
import {hash32} from './rulerCore';
import {NEUTRAL_SKIN,isCivId,skinById,skinFromCiv,validSkin,type CivSkin} from '../scene/civSkin';

/** What the player asked for in WorldSetup: one registry skin ('preset'), a remix of a civ, a random generator draw, or the plain Village grammar. */
export type SkinRequest={mode:'preset';skinId:string}|{mode:'remix';preset?:string}|{mode:'random'}|{mode:'neutral'};
export type SkinsState={version:1;seed:number;/** team id -> skin */slots:Record<string,CivSkin>;request?:SkinRequest};
type S={seed:number;tribes:unknown[];skins?:SkinsState};

export function validSkinRequest(x:unknown):x is SkinRequest{
 const r=x as SkinRequest;if(!r||typeof r!=='object')return false;
 return r.mode==='random'||r.mode==='neutral'||(r.mode==='remix'&&(r.preset===undefined||isCivId(r.preset)))||(r.mode==='preset'&&typeof r.skinId==='string'&&!!skinById(r.skinId));
}
/** Skin for one slot with no request: the game's cast (preset / remix / free, deterministic per seed and slot). */
function castSkins(seed:number,n:number):CivSkin[]{
 const cast=generateCast(seed,n),out:CivSkin[]=[];
 for(let i=0;i<n;i++)out.push(skinFromCiv(cast[i]??generateCiv(seed,i,'free')));
 return out;
}
function requestedSkin(seed:number,req:SkinRequest):CivSkin{
 if(req.mode==='neutral')return NEUTRAL_SKIN;
 if(req.mode==='preset')return skinById(req.skinId)??NEUTRAL_SKIN;
 if(req.mode==='remix')return skinFromCiv(generateCiv(seed,0,'remix',req.preset&&isCivId(req.preset)?req.preset:undefined));
 const modes:Mode[]=['preset','remix','free'];return skinFromCiv(generateCiv(seed,0,modes[hash32('skin-random',seed)%3]));
}
/** Build every slot's skin for a new game. Societies never share a skin: a rival that would wear the same preset as another is remixed from it instead. */
export function buildSkins(seed:number,teams:number,req?:SkinRequest):SkinsState{
 const cast=castSkins(seed,teams),slots:Record<string,CivSkin>={},used=new Set<string>();
 for(let i=0;i<teams;i++){
  let s=i===0&&req?requestedSkin(seed,req):cast[i];
  if(i>0&&s.mode!=='neutral'&&used.has(s.id)&&s.preset)s=skinFromCiv(generateCiv(seed,i,'remix',s.preset));
  if(i>0&&used.has(s.id))s=skinFromCiv(generateCiv(seed,i+100,'free'));
  used.add(s.id);slots[String(i)]=s;
 }
 return {version:1,seed,slots,...(req?{request:req}:{})};
}
export function validSkinsState(x:unknown,teams?:number):boolean{
 const s=x as SkinsState;if(!s||s.version!==1||typeof s.seed!=='number'||!s.slots||typeof s.slots!=='object')return false;
 const ids=Object.keys(s.slots);if(!ids.length||(teams!==undefined&&ids.length<teams))return false;
 return ids.every(k=>validSkin(s.slots[k]));
}
/** Make sure the game carries valid skins for all its societies (new games, old saves, damaged field). Returns the state's skins. */
export function ensureSkins(state:S):SkinsState{
 const n=state.tribes.length;
 const prior=state.skins as SkinsState|undefined;
 if(validSkinsState(prior)){
  // Growing the society array must not redraw any existing civilisation.
  const used=new Set(Object.values(prior!.slots).map(s=>s.id));
  for(let i=0;i<n;i++)if(!prior!.slots[String(i)]){
   let slot=i,skin=skinFromCiv(generateCiv(state.seed,slot,'free'));
   while(used.has(skin.id)){slot+=n+1;skin=skinFromCiv(generateCiv(state.seed,slot,'free'));}
   prior!.slots[String(i)]=skin;used.add(skin.id);
  }
 }else state.skins=buildSkins(state.seed,n,prior&&validSkinRequest(prior.request)?prior.request:undefined);
 return state.skins!;
}
/** The skin a team wears (null = the plain Village grammar). Read-only: never mutates state. */
export function skinOfTeam(state:{skins?:SkinsState},team:number):CivSkin|null{
 const s=state.skins?.slots[String(team)];return s&&s.grammar?s:null;
}
