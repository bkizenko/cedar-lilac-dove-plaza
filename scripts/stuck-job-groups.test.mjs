import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stuckJobGroups} from '../src/ui/stuckJobs.ts';
test('stuck jobs group by the blocker the sim wrote, one reason each, nothing invented',()=>{
 const tasks=[
  {id:'a',label:'Workshop #4 · axe',status:'blocked',blocker:'Needs a stone tool before work starts'},
  {id:'b',label:'Dock #2 repair',status:'blocked',blocker:'No reachable construction approach — clear a route to the site'},
  {id:'c',label:'Brew at hearth #7',status:'blocked',blocker:'Waiting for a clean vessel'},
  {id:'d',label:'Trade load',status:'blocked',blocker:'Trade load needs more carriers or transport capacity'},
  {id:'e',label:'House #9',status:'queued',blocker:'Missing 4 logs'},
  {id:'f',label:'Sow field',status:'active',blocker:null},
  {id:'g',label:'Paused kiln',status:'paused',blocker:'Paused by you'},
  {id:'h',label:'Odd job',status:'blocked',blocker:'Waiting for the moon'},
 ];
 const before=JSON.stringify(tasks),g=stuckJobGroups(tasks);
 assert.deepEqual(g.map(x=>x.cause),['No tool','No route','Waiting on a vessel','Waiting on a hauler','Waiting on materials','Other']);
 assert.deepEqual(g[1].jobs,[{label:'Dock #2 repair',reason:'No reachable construction approach — clear a route to the site'}]);
 assert.equal(g.flatMap(x=>x.jobs).length,6,'active and paused jobs are not shown as stuck');
 assert.deepEqual(stuckJobGroups([]),[]);assert.equal(JSON.stringify(tasks),before);
});
test('workload panel renders the grouped stuck-job list folded and at 16px',()=>{
 const s=readFileSync(new URL('../src/ui/WorkloadPanel.tsx',import.meta.url),'utf8');
 assert.match(s,/stuckJobGroups\(report\.tasks\)/);assert.match(s,/<details data-stuck-jobs><summary className="cursor-pointer text-base">Why work is stuck/);
});
