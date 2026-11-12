import test from 'node:test';
import assert from 'node:assert/strict';
import {KeyboardCommands} from '../src/game/keyboard.ts';

// Run the actual keyboard dispatcher against frozen presentation data. The
// Engine boundary records selection/owner commands; no WebGL or second Game.
function fixture(worker=true){
 const units=[
  {id:1,kind:'unit',team:0,hp:10,type:'worker',x:1,y:2,z:3,selected:true},
  {id:2,kind:'unit',team:0,hp:10,type:'spear',x:4,y:2,z:5,selected:false},
  {id:3,kind:'unit',team:0,hp:0,type:'worker',selected:false},
  {id:4,kind:'unit',team:1,hp:10,type:'worker',selected:false},
 ];
 const buildings=[{id:10,kind:'building',team:0,hp:10,x:7,y:2,z:9,selected:false}];
 const state={units,buildings,placing:null,pendingAge:false,paused:false,speed:1,selBld:null,forage:[],trees:[{id:20,kind:'tree',amount:10,x:2,y:1,z:2}],stones:[],copper:[],iron:[],fish:[]};
 let selected=[1];const calls=[];
 const deny=name=>()=>{throw new Error(`native mutation: ${name}`);};
 const game={state,started:true,awaitingStart:false,selectedUnits:()=>units.filter(u=>(worker?selected.includes(u.id):u.selected)&&u.team===0&&u.hp>0),exploredAt:()=>true,
  clearSelect:worker?deny('clearSelect'):()=>{for(const u of units)u.selected=false;for(const b of buildings)b.selected=false;state.selBld=null;},
  banner:worker?deny('banner'):(...args)=>calls.push(['native-banner',...args]),
  soundRecall:worker?deny('soundRecall'):()=>calls.push(['native-recall']),issueMove:worker?deny('issueMove'):(...args)=>calls.push(['native-move',...args]),tribe:()=>({age:0})};
 if(worker){for(const u of units)Object.freeze(u);for(const b of buildings)Object.freeze(b);Object.freeze(units);Object.freeze(buildings);Object.freeze(state);Object.freeze(game);}
 const engine={game,isWorkerSession:worker,keys:new Set(),moveMode:true,loggingMode:false,pointer:{x:0,y:0},canvas:{clientWidth:800,clientHeight:600,focus:()=>calls.push(['focus'])},
  view:{look:{set:(...args)=>calls.push(['look',...args])},updateCamera:()=>{},groundAt:()=>({x:12,z:14})},
  setWorkerSelection:s=>{assert.equal(worker,true);selected=[...s.selectedUnitIds];calls.push(['selection',s]);},
  cancelPresentationInteraction:()=>{selected=[];engine.moveMode=false;engine.loggingMode=false;calls.push(['cancel']);},
  presentationNotice:(...args)=>calls.push(['notice',...args]),pushHud:()=>calls.push(['hud']),
  dispatch:async command=>{calls.push(['dispatch',command]);return{accepted:true};},
  setPaused:p=>calls.push(['pause',p]),setSpeed:s=>calls.push(['speed',s])};
 const keyboard=new KeyboardCommands(engine);
 function key(code,options={}){const event={code,repeat:false,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false,target:null,preventDefault:()=>calls.push(['prevent']),...options};keyboard.key(event);}
 return{keyboard,key,engine,calls,state,selection:()=>selected};
}
const events=(f,kind)=>f.calls.filter(c=>c[0]===kind);
test('Worker Escape cancels via Engine even when a dialog owns focus',()=>{const f=fixture();f.keyboard.help=f.keyboard.ledger=true;f.key('Escape',{target:{closest:()=>({})}});assert.equal(events(f,'cancel').length,1);assert.deepEqual(f.selection(),[]);assert.equal(f.keyboard.help,false);assert.equal(f.keyboard.ledger,false);assert.equal(f.engine.moveMode,false);});
test('Worker control groups save and recall only living owned IDs',()=>{const f=fixture();f.key('Digit2',{ctrlKey:true});f.keyboard.groups.set(2,[1,2,3,4,999]);f.key('Digit2',{altKey:true});assert.deepEqual(f.selection(),[1,2]);assert.deepEqual(events(f,'notice').map(c=>c[1]),['Group 2 saved','Group 2: 2 people']);assert.equal(f.engine.keys.size,0);});
test('Worker group modifier precedence and repeated keys preserve native behavior',()=>{const f=fixture();f.key('Digit1',{ctrlKey:true,altKey:true});assert.deepEqual(f.keyboard.groups.get(1),[1]);f.key('Digit1',{altKey:true,repeat:true});assert.equal(events(f,'selection').length,0);});
test('Worker C/B cycling updates local IDs and camera without entity writes',()=>{const f=fixture();f.key('KeyC');f.key('KeyC');assert.deepEqual(f.selection(),[2]);f.key('KeyC',{shiftKey:true});assert.deepEqual(f.selection(),[1]);f.key('KeyB');assert.deepEqual(events(f,'selection').at(-1)[1],{selectedUnitIds:[],selectedBuildingId:10});assert.deepEqual(events(f,'look').at(-1).slice(1),[7,.8,9]);});
test('Worker J selects workers and V selects soldiers before the recall command',()=>{const f=fixture();f.key('KeyJ');assert.deepEqual(f.selection(),[1]);f.key('KeyV');assert.deepEqual(f.selection(),[2]);const selectionIndex=f.calls.findLastIndex(c=>c[0]==='selection');const dispatchIndex=f.calls.findIndex(c=>c[0]==='dispatch');assert.ok(selectionIndex<dispatchIndex);assert.deepEqual(f.calls[dispatchIndex][1],{kind:'recall'});});
test('Worker Z routes attack-move coordinates and IDs through typed dispatch',()=>{const f=fixture();f.key('KeyZ');assert.deepEqual(events(f,'dispatch')[0][1],{kind:'move',unitIds:[1],x:12,z:14,attackMove:true});assert.deepEqual(f.engine.pointer,{x:400,y:300});});
test('Worker pause/speed shortcuts route Engine and ignore repeated action keys',()=>{const f=fixture();f.key('Space');f.key('KeyP');f.key('Equal');f.key('Minus');f.key('Space',{repeat:true});assert.deepEqual(events(f,'pause').map(c=>c[1]),[true,true]);assert.deepEqual(events(f,'speed').map(c=>c[1]),[2,1]);});
test('Worker resource cycling changes camera and uses presentation notice',()=>{const f=fixture();f.key('BracketRight');assert.equal(f.keyboard.mode,true);assert.deepEqual(events(f,'look')[0].slice(1),[2,-.19999999999999996,2]);assert.equal(events(f,'notice')[0][1],'tree · R to gather');});
test('typing and UI precedence prevent selection and commands, camera keys retain focus',()=>{const f=fixture();f.engine.keys.add('KeyW');f.key('KeyJ',{target:{closest:selector=>selector.includes('input')?{}:null}});assert.equal(f.engine.keys.size,0);f.key('KeyV',{target:{closest:selector=>selector==='button,a,summary'?{}:null}});assert.equal(events(f,'dispatch').length,0);f.key('ArrowUp',{target:{closest:selector=>selector==='button,a,summary'?{}:null}});assert.equal(f.engine.keys.has('ArrowUp'),true);assert.equal(events(f,'focus').length,1);});
test('native main shortcut behavior retains direct selection, recall and attack move',()=>{const f=fixture(false);f.key('KeyJ');assert.equal(f.state.units[0].selected,true);f.key('KeyV');assert.equal(f.state.units[1].selected,true);assert.equal(events(f,'native-recall').length,1);f.key('KeyZ');assert.deepEqual(events(f,'native-move')[0].slice(1),[12,14,true]);f.state.placing='house';f.state.pendingAge=true;f.key('Escape');assert.equal(f.state.placing,null);assert.equal(f.state.pendingAge,false);assert.equal(events(f,'cancel').length,0);});
