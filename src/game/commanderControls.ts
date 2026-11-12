import type{Game}from'./sim';
import{COMMANDER_RULES,commandersState,commandersOf,activeCommandersOf,commandSlots,commanderViews,commanderAssignment,commanderAppointmentIssue,commanderPromotionIssue}from'./commanders';
/** Owner-only bounded command sheet. Reading does not enable old saves, appoint,
 * prune rosters, spend timber, alter XP or derive anything from foreign rosters. */
export function commanderControlsModel(g:Game,unitIds:readonly number[],boatIds:readonly number[]){
 const people=unitIds.map(id=>g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0)).filter(u=>!!u),selected=people.map(u=>u.id),hulls=boatIds.filter(id=>g.state.boats?.some(b=>b.id===id&&b.team===0&&b.hp>0)),candidate=people[0];
 const own=commandersOf(g,0),views=commanderViews(g,0),rows=views.filter(c=>c.status!=='retired'&&own.find(o=>o.id===c.id)?.replacedBy===undefined).map(c=>{
  const raw=own.find(o=>o.id===c.id)!,ids=c.kind==='army'?selected:hulls,assignment=commanderAssignment(g,c.id,ids),releaseIds=ids.filter(id=>(c.kind==='army'?raw.memberIds:raw.boatIds).includes(id));
  return{...c,assignIds:assignment.ids,assignIssue:assignment.issue,releaseIds,replacementIssue:candidate?commanderAppointmentIssue(g,candidate.id,c.kind,{team:0,replaces:c.id}):'Select a free replacement person',promotionChoices:c.options.map(p=>({...p,issue:commanderPromotionIssue(g,c.id,p.id)}))};
 });
 return{enabled:!!commandersState(g),standardWood:COMMANDER_RULES.standardWood,slots:commandSlots(g,0),usedSlots:activeCommandersOf(g,0).length,candidate:candidate?{id:candidate.id,name:candidate.name||'Selected resident',armyIssue:commanderAppointmentIssue(g,candidate.id,'army',{team:0}),fleetIssue:commanderAppointmentIssue(g,candidate.id,'fleet',{team:0})}:null,commanders:rows};
}
export type CommanderControlsModel=ReturnType<typeof commanderControlsModel>;
