import type {Game} from './sim';
import {receiveFood} from './pantry';
export type TestAction='supplies'|'weapons'|'heal'|'cultivation'|'raid'|'finish';
/** Explicit testing commands operate only on the disposable test copy. */
export function testAction(g:Game,action:TestAction){
 if(!g.testMode)return false;
 const t=g.tribe(0);
 if(action==='supplies'){receiveFood(g,0,500);t.wood+=500;t.stone+=300;t.copper+=100;t.iron+=100;t.seeds=(t.seeds||0)+100;}
 if(action==='weapons'){t.spears+=20;t.bows+=20;t.blades+=10;}
 if(action==='heal')for(const u of g.state.units.filter(u=>u.team===0)){u.hp=u.maxHp;u.fatigue=0;}
 if(action==='cultivation'){t.cultivated=['grain','pulses','tubers'];t.cropTrial=undefined;t.seeds=(t.seeds||0)+40;}
 if(action==='raid')g.spawnRaid();
 if(action==='finish')for(const b of g.state.buildings.filter(b=>b.team===0&&b.hp>0)){b.plannedCost=undefined;b.planPaused=undefined;b.build=1;b.hp=b.maxHp;}
 g.state.walkDirty=true;g.workBoard.reset();g.banner(`Test: ${action}`,2);return true;
}
