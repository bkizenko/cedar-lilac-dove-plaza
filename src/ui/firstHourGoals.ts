/** "Next three things" for the first hour of a village: shelter, a food store, first neighbour contact. Pure; reads
 * finished buildings, game time, difficulty and whether a neighbour's settlement is known. No scripted resources. */
type B={type:string;team:number;hp:number};
export const FIRST_HOUR_SECONDS=3600;
const EXPERT=new Set(['hard','survival','apocalypse']);
/** Live village facts for the first-ten-minutes steps: someone has gathered, and a child has been born here. */
export type FirstSteps={gathered:boolean;child:boolean};
/** At most this many steps show at once, so the strip stays small on a phone. */
export const FIRST_GOALS_SHOWN=3;
export function firstHourGoals(s:{time:number;difficulty?:string;buildings:readonly B[];tribes:readonly {id:number}[];tutorial?:{active?:boolean}},finished:(b:B)=>boolean,met:(team:number)=>boolean,steps?:FirstSteps):string[]{
 if(s.time>FIRST_HOUR_SECONDS||EXPERT.has(s.difficulty??'normal')||s.tutorial?.active)return [];
 const has=(types:string[])=>s.buildings.some(b=>b.team===0&&b.hp>0&&types.includes(b.type)&&finished(b));
 const out:string[]=[];
 if(steps&&!steps.gathered&&!s.buildings.some(b=>b.team===0&&b.hp>0&&b.type!=='townhall'&&finished(b)))out.push('Collect food and wood — select people, right-click a bush or tree');
 if(!has(['hut','house']))out.push('Build a first shelter — Build › Village');
 if(!has(['warehouse']))out.push('Build a storehouse so food keeps — Build › Village');
 if(!s.tribes.some(t=>t.id!==0&&met(t.id)))out.push('Find a neighbour — explore or send a scout');
 if(steps&&!steps.child)out.push('Raise a first child — a sheltered, fed couple at the hearth');
 return out.slice(0,FIRST_GOALS_SHOWN);
}
/** Real state behind the extra steps; a step done once stays done for that village. */
const seen=new WeakMap<object,FirstSteps>();
export function firstSteps(state:object,units:readonly {team:number;hp:number;carry?:number;order?:string;parents?:readonly number[]}[]):FirstSteps{
 const prev=seen.get(state)??{gathered:false,child:false};
 const now={gathered:prev.gathered||units.some(u=>u.team===0&&u.hp>0&&((u.carry||0)>0||u.order==='gather')),child:prev.child||units.some(u=>u.team===0&&!!u.parents?.length)};
 seen.set(state,now);return now;
}
