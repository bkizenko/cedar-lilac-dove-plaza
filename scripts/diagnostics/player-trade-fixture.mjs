// Finite INITIAL playtest endowment on unchanged generated native terrain.
// This is not an earned campaign, observation/discovery or historical balance proof.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game} from '../../src/game/sim.ts';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
import {endowSettlementSites} from '../helpers/endowed-settlement-sites.mjs';
import {proposeTradeOffer} from '../../src/game/tradeNeeds.ts';

const hash=g=>createHash('sha256').update(JSON.stringify({h:Array.from(g.world.heights),r:g.world.rivers,f:g.world.features})).digest('hex');
export function nativeTradeFixture(mode){
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();const terrain=hash(g),team=1;g.vision.fill(2);
 // Finite initial civic infrastructure at naturally legal sites. No terrain edits.
 for(const owner of [0,team])if(!g.state.buildings.some(b=>b.team===owner&&b.type==='townhall'&&g.finished(b))){const home=g.campOf(owner),actor=g.state.units.find(u=>u.team===owner&&u.type==='worker');assert.ok(actor);let point;for(let radius=12;radius<=60&&!point;radius+=4)for(let i=0;i<24&&!point;i++){const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;if(g.placementIssue('townhall',x,z,owner)===null&&g.workBoard.connected(g,actor.x,actor.z,x,z))point={x,z};}assert.ok(point,'legal initial hall site');g.state.buildings.push(g.makeBld('townhall',point.x,point.z,owner));g.rebuildWalk();}
 const hall=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&g.finished(b)),u=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(hall&&u);assert.ok(g.workBoard.connected(g,u.x,u.z,hall.x,hall.z),'actual generated camps must share a land route');
 for(const p of g.state.units){p.selected=false;p.order='hold';p.jobLock=!(p.type==='worker'&&(p.team===0||p.team===team));}
 for(const t of g.state.tribes){t.hostile=false;t.aggro=0;t.thinkT=10000;t.food=2000;t.foodLots={provisions:2000};if(t.survival)t.survival.waterLiters=3000;}
 Object.assign(g.tribe(0),{stone:mode==='outgoing'?60:0,wood:mode==='outgoing'?0:340});Object.assign(g.tribe(team),{stone:mode==='outgoing'?0:220,wood:mode==='outgoing'?320:0});
 g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.visitorTimer=900;g.state.raidT=g.state.birthT=10000;g.raidT=g.seaT=g.calamityT=10000;g.vision.fill(2);g.state.contacts=[team];endowSettlementSites(g,0,team);endowSettlementSites(g,team,0);
 let extra={};if(mode==='incoming'){const p=proposeTradeOffer(g,team,0,'stone','wood',16);assert.equal(p.ok,true,JSON.stringify(p));g.state.time=p.offer.answerAt;extra={offerId:p.offer.id,quoted:p.offer.quoted};}
 g.state.paused=true;const save=structuredClone(encodeGame(g)),copy=decodeGame(structuredClone(save));assert.equal(hash(copy),terrain);assert.equal(hash(g),terrain);
 return {save,team,hallId:hall.id,terrain,...extra,scope:'Finite initial stocks and historical site/vision endowment; two legal initial halls; generated actors/terrain unchanged; no goods, actors or knowledge added after scenario begins'};
}
if(process.argv[1]?.endsWith('player-trade-fixture.mjs')){const folder=process.argv[2]||'/tmp/hearthwild-player-trade-fixtures';mkdirSync(folder,{recursive:true});for(const mode of ['outgoing','incoming']){const f=nativeTradeFixture(mode);writeFileSync(folder+'/'+mode+'.json',JSON.stringify(f));console.log(JSON.stringify({mode,team:f.team,hallId:f.hallId,terrain:f.terrain,offerId:f.offerId,quoted:f.quoted}));}}
