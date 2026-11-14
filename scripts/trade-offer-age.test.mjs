import test from 'node:test';import assert from 'node:assert/strict';
import {offerAge} from '../src/ui/tradeOfferAge.ts';
const o=(x)=>({phase:'proposed',status:'Offer received',canAnswer:true,answerLeft:600,...x});
test('open offers show real time left, urgent under two minutes',()=>{
 assert.equal(offerAge(o({answerLeft:600})).text,'Answer within 10 minutes');assert.equal(offerAge(o({answerLeft:600})).tone,'ok');
 assert.equal(offerAge(o({answerLeft:90})).tone,'soon');assert.equal(offerAge(o({answerLeft:30})).text,'Answer within a minute');
});
test('lapsed and caravan states explain themselves; unknown states say nothing',()=>{
 assert.equal(offerAge(o({answerLeft:0})).tone,'gone');
 assert.equal(offerAge(o({canAnswer:false,status:'Offer expired',answerLeft:null})).tone,'gone');
 assert.match(offerAge(o({canAnswer:false,status:'Caravan overdue',answerLeft:null})).text,/overdue/);
 assert.match(offerAge(o({canAnswer:false,status:'Awaiting caravan',answerLeft:null})).text,/gathering/);
 assert.equal(offerAge(o({canAnswer:false,status:'Goods received',answerLeft:null})),null);
});
