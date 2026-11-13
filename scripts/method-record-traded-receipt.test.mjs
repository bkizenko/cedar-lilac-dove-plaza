import test from 'node:test';
import assert from 'node:assert/strict';
import {METHOD_RECORD_TRADE_PRICE_WOOD,validMethodRecordAcquisitions,appendMethodRecordAcquisition,markMethodRecordReturned} from '../src/game/methodRecordAcquisition.ts';

// Controlled custody metadata only: these tests do not prove physical purchase/payment.
function fixture(){
 const state={time:100,nextId:100,tribes:[{id:0},{id:1},{id:2}],communityHandovers:[{id:80,fromTeam:1,toTeam:0,timeSeconds:30}]};
 const record={id:50,source:{recipe:'twistCordage',makerId:11,makerName:'Maker',team:1,teamName:'Origin',successfulBatches:3,demonstratedAt:10},authoredAt:20,authorProjectId:40,team:0,holder:{kind:'carrier',unitId:12,x:0,z:0},studies:[],acquisitions:[{kind:'traded',fromTeam:1,toTeam:0,at:30,by:12,payment:{kind:'wood',amount:METHOD_RECORD_TRADE_PRICE_WOOD}}]};
 return{state,record};
}
test('traded custody accepts only the exact finite wood quote and retains immutable authorship',()=>{
 const{state,record}=fixture(),source=structuredClone(record.source);
 assert.equal(METHOD_RECORD_TRADE_PRICE_WOOD,4);assert.equal(validMethodRecordAcquisitions(state,record),true);
 markMethodRecordReturned(record,0,60);assert.equal(record.acquisitions[0].returnedAt,60);
 assert.equal(validMethodRecordAcquisitions(state,JSON.parse(JSON.stringify(record))),true);
 assert.deepEqual(record.source,source);assert.deepEqual(record.studies,[],'custody receipts teach nothing');
 for(const change of [r=>delete r.by,r=>r.by=0,r=>r.by=100,r=>r.handoverId=80,r=>delete r.payment,
  r=>r.payment=null,r=>r.payment=[],r=>r.payment={kind:'wood',amount:4,extra:true},r=>r.payment.kind='food',
  ...[undefined,NaN,Infinity,-1,0,.5,3,5,1e12,'4'].map(amount=>r=>r.payment.amount=amount)]){
  const copy=structuredClone(record);change(copy.acquisitions[0]);assert.equal(validMethodRecordAcquisitions(state,copy),false,JSON.stringify(copy.acquisitions));
 }
});
test('legacy receipts remain valid without payment and forbid invented trade charges',()=>{
 for(const kind of ['captured','recovered','inherited']){
  const{state,record}=fixture();record.acquisitions[0]={kind,fromTeam:1,toTeam:0,at:30,...(kind==='inherited'?{handoverId:80}:{by:12})};
  assert.equal(validMethodRecordAcquisitions(state,record),true,kind);
  record.acquisitions[0].payment={kind:'wood',amount:4};assert.equal(validMethodRecordAcquisitions(state,record),false,kind);
 }
 const{state,record}=fixture();delete record.acquisitions;assert.equal(validMethodRecordAcquisitions(state,record),true);
});
test('traded receipts preserve chronological custody chains and final ownership checks',()=>{
 const{state,record}=fixture();record.acquisitions[0].returnedAt=40;
 appendMethodRecordAcquisition(record,{kind:'traded',fromTeam:0,toTeam:2,at:50,by:13,payment:{kind:'wood',amount:4}});record.team=2;
 assert.equal(validMethodRecordAcquisitions(state,record),true);
 for(const change of [r=>r.acquisitions[1].at=39,r=>r.acquisitions[1].fromTeam=1,r=>r.team=0,r=>r.acquisitions[0].at=19,r=>r.acquisitions[1].at=101,r=>r.acquisitions[1].returnedAt=49]){
  const copy=structuredClone(record);change(copy);assert.equal(validMethodRecordAcquisitions(state,copy),false);
 }
});
