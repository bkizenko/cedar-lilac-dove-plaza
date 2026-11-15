/** Teams that have newly turned hostile since the last look. The first look only records who is already at war (a loaded save must not shout). Pure. */
export function newWars(seen:ReadonlySet<number>|null,hostileNow:readonly number[]):{fresh:number[];next:Set<number>}{
 const next=new Set(hostileNow);
 return {fresh:seen?hostileNow.filter(t=>!seen.has(t)):[],next};
}
