import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eventInsideUi,wheelZoomFactor,UI_EVENT_SELECTOR} from '../src/game/cameraInput.ts';

// A tiny DOM stand-in: closest() walks parents and matches by class/tag/role tokens from UI_EVENT_SELECTOR.
const node=(tag,cls='',parent=null,attrs={})=>({tag,cls:cls.split(' ').filter(Boolean),attrs,parent,
 closest(sel){const parts=sel.split(',');for(let n=this;n;n=n.parent){for(const p of parts){
  if(p.startsWith('.')&&n.cls.includes(p.slice(1)))return n;
  if(p.startsWith('[')){const m=/\[([\w-]+)(?:=([\w-]+))?\]/.exec(p);if(m&&n.attrs[m[1]]!==undefined&&(m[2]===undefined||n.attrs[m[1]]===m[2]))return n;}
  if(/^[a-z]+$/.test(p)&&n.tag===p)return n;}}return null;}});

test('wheel over Hearth panels, menus, dialogs, trays and lists never belongs to the camera',()=>{
 const hw=node('div','hw'),canvas=node('canvas','',node('div','game-root'));
 const menu=node('div','hw-screen',hw,{role:'dialog'}),row=node('li','hw-row',menu);
 const tray=node('div','hw-tray',hw),tile=node('span','hw-tile',tray);
 const legacy=node('div','hud-panel',node('div','game-root')),dlg=node('div','',node('dialog'));
 for(const t of [menu,row,tray,tile,legacy,dlg,node('select')])assert.equal(eventInsideUi(t),true);
 assert.equal(eventInsideUi(canvas),false);
 assert.equal(eventInsideUi(null),false);
 assert.match(UI_EVENT_SELECTOR,/\.hw/);
});

test('zoom factor: mouse-wheel steps and trackpad streams are proportional, bounded and directional',()=>{
 assert.ok(wheelZoomFactor({deltaY:100})>1&&wheelZoomFactor({deltaY:-100})<1);
 assert.equal(wheelZoomFactor({deltaY:0}),1);
 const mouse=wheelZoomFactor({deltaY:100}),line=wheelZoomFactor({deltaY:3,deltaMode:1});
 assert.ok(Math.abs(mouse-1.08)<.005,`mouse ${mouse}`);assert.ok(line>1&&line<1.08);
 // 40 trackpad events of 2 px must zoom less than ten mouse notches (the old sign-based code zoomed 1.08^40).
 let d=1;for(let i=0;i<40;i++)d*=wheelZoomFactor({deltaY:2});assert.ok(d<1.08**2,`trackpad ${d}`);
 assert.ok(wheelZoomFactor({deltaY:5000})<=Math.exp(.08)+1e-9);
});

test('Hearth CSS contains scroll chaining and lets touch pan inside panels',()=>{
 const css=fs.readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
 assert.match(css,/\.hw[^{]*\{[^}]*overscroll-behavior:\s*contain/);
 assert.match(css,/touch-action:\s*pan-y/);
});

test('engine wheel handler defers to the UI gate',()=>{
 const src=fs.readFileSync(new URL('../src/game/engine.ts',import.meta.url),'utf8');
 const i=src.indexOf('private onWheel');assert.ok(i>0);
 assert.match(src.slice(i,i+500),/cameraOwnsWheel\(e\.target/);
});
