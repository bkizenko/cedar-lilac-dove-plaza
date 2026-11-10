import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {updateSeasonReports, recordSeasonWeapon, validSeasonReports, SEASON_REPORT_LIMIT} from '../src/game/seasonReports.ts';
import {recordSimulationEvent} from '../src/game/simulationEvents.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

test('season boundaries record actual receipts, deliveries, weapons and end stocks without inventing history',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();
 g.state.time=30;
 recordSimulationEvent(g,'food_received',0,'food',80);
 updateSeasonReports(g);
 recordSimulationEvent(g,'food_received',0,'food',18);
 recordSimulationEvent(g,'cargo_delivered',0,'food',18);
 recordSimulationEvent(g,'cargo_delivered',0,'wood',12);
 recordSeasonWeapon(g,0);
 recordSeasonWeapon(g,1);
 g.tribe(0).wood=75;
 g.state.time=450;updateSeasonReports(g);
 const [row]=g.state.seasonReports.history;
 assert.equal(row.partial,true);
 assert.equal(row.totals.food,18);
 assert.equal(row.totals.wood,12);
 assert.equal(row.totals.weapons,1);
 assert.equal(row.stock.wood,75);
 updateSeasonReports(g);assert.equal(g.state.seasonReports.history.length,1);
 const decoded=decodeGame(encodeGame(g));
 assert.deepEqual(decoded.state.seasonReports,g.state.seasonReports);
 const bad=structuredClone(g.state.seasonReports);
 bad.history[0].totals.food=-1;
 assert.equal(validSeasonReports(bad,g.state.time),false);
 for(let i=2;i<=SEASON_REPORT_LIMIT+3;i++){g.state.time=i*450;updateSeasonReports(g);}
 assert.equal(g.state.seasonReports.history.length,SEASON_REPORT_LIMIT);
});
