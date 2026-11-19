import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quietSeasonCue} from '../src/ui/quietSeason.ts';
const w=(id,extra={})=>({id,team:0,hp:10,type:'worker',order:'idle',carry:0,itemCargo:{},stuckT:0,...extra});
const st=(units,extra={})=>({time:500,speed:1,paused:false,weather:'clear',units,production:{projects:[]},buildings:[],...extra});
test('quiet-season cue fires only in winter or drought when most hands truly have no job',()=>{
 const idle=[w(1),w(2),w(3),w(4,{order:'gather'})],s=st(idle),before=JSON.stringify(s);
 const c=quietSeasonCue(s,'Winter');assert.equal(c.idle,3);assert.match(c.line,/^Quiet winter: 3 people have no work/);
 assert.equal(quietSeasonCue(s,'Summer'),null,'busy seasons stay quiet');
 assert.equal(quietSeasonCue(st(idle,{weather:'drought'}),'Summer').lean,'drought');
 assert.equal(quietSeasonCue(st([w(1),w(2,{resting:true}),w(3,{order:'gather'}),w(4,{order:'build'})]),'Winter'),null,'resting is not "no work"; one idle hand is not a lull');
 assert.equal(quietSeasonCue(st(idle,{speed:4}),'Winter'),null,'already fast');
 assert.equal(quietSeasonCue(st(idle,{paused:true}),'Winter'),null);
 assert.equal(JSON.stringify(s),before);
});
test('cue offers ×4 speed through the engine and is mounted on Hearth and Classic',()=>{
 const c=readFileSync(new URL('../src/ui/QuietSeasonCue.tsx',import.meta.url),'utf8');assert.match(c,/engine\.setSpeed\(4\)/);assert.match(c,/Not now/);
 assert.match(readFileSync(new URL('../src/ui/hearth/HudHearth.tsx',import.meta.url),'utf8'),/<QuietSeasonCue engine=\{engine\} season=\{hud\.season\}\/>/);
 assert.match(readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),/<QuietSeasonCue engine=\{engine\} season=\{hud\.season\} classic\/>/);
});
