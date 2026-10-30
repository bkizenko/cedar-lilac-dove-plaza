import type {Engine} from '@/game/engine';
import {beginCopperStudy} from '@/game/materialStudy';
export function CopperStudyControl({engine,workplace}:{engine:Engine;workplace:number}){
 const g=engine.game,t=g.tribe(0),person=g.state.units.find(u=>u.team===0&&u.hp>0&&u.copperStudy),work=person?.copperStudy;
 if(t.copperExperiment)return <p className="text-sm text-parchment">✓ Copper toolmaking discovered</p>;
 const start=()=>{beginCopperStudy(g,workplace);engine.pushHud();};
 if(work)return <div className="copper-study-control">
   <strong>Copper trial · {Math.floor(work.progress/90*100)}%</strong>
   <progress aria-label="Copper trial progress" max={90} value={work.progress}/>
   {work.paused?<button type="button" onClick={start}>Resume trial · materials paid</button>:<span>One resident testing a prototype</span>}
 </div>;
 const people=g.popNow(0),enough=people>=20&&t.copper>=8&&t.wood>=4;
 return <div className="copper-study-control">
  <button type="button" disabled={!enough} onClick={start} title="Bring discovered copper home. A resident walks to this shelter and tests a prototype at a free bench.">Test a copper tool</button>
  <span>8 copper · 4 logs · 90s bench work</span>
  {people<20&&<span>{people}/20 residents needed</span>}
  {(t.copper<8||t.wood<4)&&<span>Need {[t.copper<8?`${Math.ceil(8-t.copper)} copper`:null,t.wood<4?`${Math.ceil(4-t.wood)} logs`:null].filter(Boolean).join(' · ')}</span>}
 </div>;
}
