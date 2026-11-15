import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {WEAPON_GRADES,bestGrade,weaponDamage,gradeName} from '../src/game/weaponGrades.ts';
import {UNITS,AGE_STAT} from '../src/game/constants.ts';
import {armFromStock,weaponStockReport,weaponStockText} from '../src/game/armingCall.ts';
test('grade table is ordered and the best grade follows the age gate',()=>{
 for(const [k,list] of Object.entries(WEAPON_GRADES)){for(let i=1;i<list.length;i++){assert.ok(list[i].age>list[i-1].age&&list[i].damage>=list[i-1].damage&&list[i].pierce>=list[i-1].pierce,k);}}
 assert.equal(bestGrade('spear',0).material,'stone-tipped');assert.equal(bestGrade('spear',2).material,'bronze-tipped');assert.equal(bestGrade('spear',9).material,'steel-tipped');
 assert.equal(bestGrade('blade',1).material,'copper');
 assert.equal(weaponDamage('spearman',0),UNITS.spearman.dmg,'stone age is unchanged');
 assert.ok(weaponDamage('spearman',3)>UNITS.spearman.dmg*AGE_STAT[3]);
});
test('arming uses the best grade for the age and the stock line names it',()=>{
 const g=new Game();g.reset(4242,3);g.enterIsland();g.state.units=[];Object.assign(g.tribe(0),{spears:2,bows:0,blades:0,age:2});
 const u=g.spawnUnit('worker',0,0,0);assert.ok(armFromStock(g,u,0));assert.equal(u.dmg,weaponDamage('spearman',2));
 assert.match(weaponStockText(weaponStockReport(g,0)),/bronze-tipped spears/);assert.equal(gradeName('bow',2),'iron-headed bow');
});
