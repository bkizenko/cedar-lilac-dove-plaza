/** "Next three things" for the first hour of a village: shelter, a food store, first neighbour contact. Pure; reads
 * finished buildings, game time, difficulty and whether a neighbour's settlement is known. No scripted resources. */
type B={type:string;team:number;hp:number};
export const FIRST_HOUR_SECONDS=3600;
const EXPERT=new Set(['hard','survival','apocalypse']);
export function firstHourGoals(s:{time:number;difficulty?:string;buildings:readonly B[];tribes:readonly {id:number}[];tutorial?:{active?:boolean}},finished:(b:B)=>boolean,met:(team:number)=>boolean):string[]{
 if(s.time>FIRST_HOUR_SECONDS||EXPERT.has(s.difficulty??'normal')||s.tutorial?.active)return [];
 const has=(types:string[])=>s.buildings.some(b=>b.team===0&&b.hp>0&&types.includes(b.type)&&finished(b));
 const out:string[]=[];
 if(!has(['hut','house']))out.push('Build a first shelter — Build › Village');
 if(!has(['warehouse']))out.push('Build a storehouse so food keeps — Build › Village');
 if(!s.tribes.some(t=>t.id!==0&&met(t.id)))out.push('Find a neighbour — explore or send a scout');
 return out;
}
