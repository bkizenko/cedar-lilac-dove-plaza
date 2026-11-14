import test from 'node:test';
import assert from 'node:assert/strict';
import {JobCoordinator} from '../src/game/jobCoordinator.ts';

const slot = [{key:'production:17:slots',amount:1,capacity:1}];
const invalidActors = [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1];
function propose(jobs,id,actors){return jobs.propose({id,kind:'production',owner:0,actors,target:17});}

test('invalid initial owners cannot reserve a workplace or block a real resident',()=>{
 for(const invalid of invalidActors){
  const jobs=new JobCoordinator();
  propose(jobs,'invalid',[1,invalid]);
  assert.equal(jobs.reserve('invalid',slot),false,`invalid actor ${invalid} must be refused`);
  assert.equal(jobs.job('invalid').phase,'proposed');
  assert.equal(jobs.job('invalid').blockedReason,'Invalid resident ownership');
  assert.equal(jobs.activeJob(1),undefined);
  assert.equal(jobs.activeJob(invalid),undefined);
  assert.equal(jobs.reservations.used('production:17:slots'),0);
  propose(jobs,'valid',[1]);
  assert.equal(jobs.reserve('valid',slot),true);
 }
});

test('invalid replacement owners leave paid work suspended with unchanged progress and actors',()=>{
 for(const invalid of invalidActors){
  const jobs=new JobCoordinator();
  propose(jobs,'paid',[1]);
  assert.equal(jobs.reserve('paid',slot),true);
  assert.equal(jobs.transition('paid','working',17),true);
  assert.equal(jobs.suspend('paid','Paused'),true);
  assert.equal(jobs.resume('paid',[2,invalid],slot),false,`invalid resume actor ${invalid} must be refused`);
  assert.deepEqual(jobs.job('paid').actors,[1]);
  assert.equal(jobs.job('paid').phase,'suspended');
  assert.equal(jobs.job('paid').progress,17);
  assert.equal(jobs.activeJob(2),undefined);
  assert.equal(jobs.reservations.used('production:17:slots'),0);
  assert.equal(jobs.resume('paid',[2],slot),true);
  assert.equal(jobs.activeJob(2).progress,17);
 }
});

test('valid high entity IDs and passive work keep their existing reservation semantics',()=>{
 const jobs=new JobCoordinator(),actor=2**40+1;
 propose(jobs,'paid',[actor,actor]);
 assert.equal(jobs.reserve('paid',slot),true);
 assert.deepEqual(jobs.job('paid').actors,[actor]);
 assert.equal(jobs.transition('paid','working',17),true);
 assert.equal(jobs.amend('paid',[],slot),true);
 assert.equal(jobs.activeJob(actor),undefined);
 assert.equal(jobs.reservations.used('production:17:slots'),1);
 assert.equal(jobs.job('paid').progress,17);
 assert.equal(jobs.suspend('paid','Paused'),true);
 assert.equal(jobs.resume('paid',[actor],slot),true);
 assert.equal(jobs.activeJob(actor).progress,17);
});
