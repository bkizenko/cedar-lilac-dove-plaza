import test from 'node:test';import assert from 'node:assert/strict';
import {societyChips} from '../src/ui/council/societiesModel.ts';
test('chips sort war first and count claims/wards',()=>{
 const c=societyChips([{team:2,name:'Bea',trust:70,casus:[],wards:[]},{team:3,name:'Aro',trust:5,hostile:true,casus:[{byUs:false},{byUs:true}],wards:[{endsIn:1}],canMarry:true}]);
 assert.equal(c[0].name,'Aro');assert.equal(c[0].claimsAgainst,1);assert.equal(c[0].claimsByUs,1);assert.equal(c[0].wardsHome,1);assert.equal(c[1].mood,'friend');
});
