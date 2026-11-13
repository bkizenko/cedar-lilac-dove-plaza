import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readTestLabButton,writeTestLabButton,TESTLAB_BUTTON_KEY} from '../src/ui/hearth/testLabPrefs.ts';
const rd=f=>readFileSync(new URL(f,import.meta.url),'utf8');
const hud=rd('../src/ui/hearth/HudHearth.tsx'),screens=rd('../src/ui/hearth/screens.tsx'),css=rd('../src/ui/hearth/hearth.css');
test('setting defaults on, survives throwing storage',()=>{
 assert.equal(readTestLabButton(null),true);
 assert.equal(readTestLabButton({getItem:()=>{throw new Error('blocked');}}),true);
 assert.equal(readTestLabButton({getItem:()=>'0'}),false);
 assert.equal(readTestLabButton({getItem:()=>'1'}),true);
 const seen={};writeTestLabButton(false,{setItem:(k,v)=>{seen[k]=v;}});assert.equal(seen[TESTLAB_BUTTON_KEY],'0');
 assert.doesNotThrow(()=>writeTestLabButton(true,{setItem:()=>{throw new Error('blocked');}}));
});
test('main HUD wires a Test lab button that starts the session and opens the panel',()=>{
 assert.match(hud,/showTestLab&&<button[\s\S]*?className="hw-testlab"[\s\S]*?startTestSession\(\)[\s\S]*?setTest\(true\)/);
 assert.match(hud,/<span>Test lab<\/span>/);
});
test('Menu keeps Test lab and offers the setting',()=>{
 assert.match(screens,/startTestSession[\s\S]{0,120}onTest\(\)[\s\S]{0,40}Test lab<\/button>/);
 assert.match(screens,/Show Test lab on main screen/);
});
test('Test lab button meets the size floor and is placed clear of the map',()=>{
 const m=css.match(/\.hw-testlab\{([^}]*)\}/)[1];
 assert.match(m,/min-height:52px/);assert.match(m,/min-width:52px/);assert.match(m,/font-size:16px/);
 assert.doesNotMatch(m,/right:|bottom:/,'stays in the left column, away from the map/music/speed/alerts');
});
