/** Read-only owner facts for an independently owned display projection.
 * Real Games are never registered here; ordinary native survival caches remain authoritative. */
const views=new WeakMap<object,{hearths:Set<number>;teams:Set<number>}>();
export function setPresentationSurvivalView(game:object,heatingHearthIds:readonly number[],burningFireTeams:readonly number[]){views.set(game,{hearths:new Set(heatingHearthIds),teams:new Set(burningFireTeams)});}
export function presentationHearthHeating(game:object,id:number):boolean|undefined{return views.get(game)?.hearths.has(id);}
export function presentationSurvivalFireActive(game:object,team:number):boolean|undefined{return views.get(game)?.teams.has(team);}
