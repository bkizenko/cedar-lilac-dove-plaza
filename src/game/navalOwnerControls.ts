import type {Game} from './sim';
import {personName} from './people';
import {boatCrew} from './boats';
import {PORT_WORK_IDS,PORT_WORK_SPECS,SHIP_DESIGNS,shipDesign} from './navalClasses';
import {navalView,commissionIssue,resumeVesselCommissionIssue,boardingIssue,designOfBoat} from './navalFleet';
import {navalState,navalBuilderAvailable,portWorkIssue,resumePortWorkIssue,vesselSupplyQuote} from './navalPorts';
export type NavalControlContext={dockId?:number;boatId?:number;builderId?:number};
/** Owner facts and shared authoritative readiness only. Never initializes naval
 * state, makes a project, mutates a person, or reveals foreign cargo/rosters. */
export function navalOwnerControls(g:Game,query:NavalControlContext={}){
 const s=navalState(g),view=navalView(g,0),available=g.state.units.filter(u=>navalBuilderAvailable(g,u,0)),builder=query.builderId===undefined?available[0]:g.state.units.find(u=>u.id===query.builderId&&u.team===0&&u.hp>0);
 const builders=available.slice(0,128).map(u=>({id:u.id,name:personName(u)}));if(builder&&!builders.some(b=>b.id===builder.id))builders.unshift({id:builder.id,name:personName(builder)});
 const bid=builder?.id??-1,ports=view.ports.map((p,index)=>({id:p.dockId,name:`Harbour ${index+1}`,tier:p.tierName,works:p.works,moored:p.moored,moorage:p.moorage,blockaded:p.blockaded})),dock=query.dockId===undefined?ports[0]:ports.find(p=>p.id===query.dockId);
 const boats=(g.state.boats||[]).filter(b=>b.team===0&&b.hp>0).map((b,index)=>{const v=view.vessels.find(v=>v.boatId===b.id);return{id:b.id,name:`${designOfBoat(g,b.id).name} · ${index+1}`,hp:b.hp,crew:boatCrew(g,b.id).filter(u=>u.boat?.phase==='aboard'&&u.hp>0).length,commissioned:!!v,food:v?.stores.food??0,missiles:v?.stores.missiles??0,starved:v?.starved??false};}),boat=query.boatId===undefined?boats[0]:boats.find(b=>b.id===query.boatId);
 const works=PORT_WORK_IDS.map(id=>{const spec=PORT_WORK_SPECS[id];return{id,name:spec.name,wood:spec.wood,stone:spec.stone,cordage:spec.cordage,seconds:spec.workSeconds,issue:dock?portWorkIssue(g,dock.id,id,bid,0):'Choose an owned finished dock'};});
 const designs=Object.values(SHIP_DESIGNS).map(spec=>({id:spec.id,name:spec.name,wood:spec.cost.wood,stone:spec.cost.stone,cordage:spec.cost.cordage,copper:spec.cost.copper,seconds:spec.workSeconds,issue:dock?commissionIssue(g,dock.id,spec.id,bid,0):'Choose an owned finished dock'}));
 const projects=[...(s?.projects||[]).filter(p=>p.team===0).map(p=>({id:p.id,dockId:p.dockId,name:PORT_WORK_SPECS[p.work].name,phase:p.phase,progress:p.progress,seconds:PORT_WORK_SPECS[p.work].workSeconds,resumeAction:'resume-port-work' as const,issue:resumePortWorkIssue(g,p.id,bid,0)})),...(s?.commissions||[]).filter(p=>p.team===0).map(p=>({id:p.id,dockId:p.dockId,name:shipDesign(p.design)!.name,phase:p.phase,progress:p.progress,seconds:shipDesign(p.design)!.workSeconds,resumeAction:'resume-commission' as const,issue:resumeVesselCommissionIssue(g,p.id,bid,0)}))];
 const supply=boat?vesselSupplyQuote(g,boat.id,{},0):{issue:'Choose an owned hull',food:0,loads:0,missiles:0,wood:0,dockId:undefined};
 const targets=boat?(g.state.boats||[]).filter(b=>b.team!==0&&b.hp>0&&g.visibleAt(b.x,b.z)).map((b,index)=>({id:b.id,name:`Foreign hull · ${index+1}`,issue:boardingIssue(g,boat.id,b.id,0)})):[];
 return{builder:builder?{id:builder.id,name:personName(builder)}:null,builders,ports,dock:dock??null,boats,boat:boat??null,works,designs,projects,supply,targets,events:view.events.slice(-4),issue:builder?navalBuilderAvailable(g,builder,0)?null:'Choose a free, healthy, unlocked adult on land':'No free, healthy, unlocked adult on land'};
}
export type NavalOwnerControlsModel=ReturnType<typeof navalOwnerControls>;
