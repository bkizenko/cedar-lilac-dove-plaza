/** Groups blocked workload tasks by the kind of blocker the sim already wrote, so a player sees why work is not
 * moving. Pure; reads task.blocker text only and never invents one. Unblocked tasks are ignored. */
type Task={id:string;label:string;status:string;blocker:string|null};
const CAUSES:[cause:string,re:RegExp][]=[
 ['No tool',/\btools?\b/i],
 ['No route',/\b(route|reach|reachable|unreachable|path|crossing|approach)\b/i],
 ['Waiting on a vessel',/\b(vessel|pot|pottery|jar|basket|container)\b/i],
 ['Waiting on a hauler',/\b(carrier|hauler|haul|carry|transport|deliver)\w*/i],
 ['Waiting on materials',/\b(material|logs?|stone|wood|fibre|clay|grain|food|stock|supplies|input)s?\b/i],
 ['Needs workers',/\b(worker|adult|hands?|labou?r|staff)s?\b/i],
];
export function stuckJobGroups(tasks:readonly Task[]){
 const groups=new Map<string,{label:string;reason:string}[]>();
 for(const t of tasks){if(!t.blocker||t.status==='paused')continue;const cause=CAUSES.find(([,re])=>re.test(t.blocker!))?.[0]??'Other';const list=groups.get(cause)??[];list.push({label:t.label,reason:t.blocker});groups.set(cause,list);}
 const order=[...CAUSES.map(([c])=>c),'Other'];
 return order.filter(c=>groups.has(c)).map(cause=>({cause,jobs:groups.get(cause)!.sort((a,b)=>a.label.localeCompare(b.label))}));
}
