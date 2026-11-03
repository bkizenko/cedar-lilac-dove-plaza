import {Game} from '../../src/game/sim.ts';
import {beginProduction} from '../../src/game/production.ts';
import {settlePeace} from '../../src/game/peace.ts';
import {encodeGame,decodeGame} from '../../src/game/persistence.ts';
const g=new Game();g.reset(345,10);g.enterIsland();
// Declared initial flat policy fixture; not native terrain or paid-construction evidence.
g.world.heights.fill(4);g.world.waterHeights=undefined;g.world.waterBodies=[];g.state.units=[];
g.state.buildings=[g.makeBld('townhall',0,0,1),g.makeBld('hearth',12,0,1),g.makeBld('townhall',100,0,0)];g.vision.fill(2);
const maker=g.spawnUnit('worker',6,0,1);maker.order='hold';g.tribe(1).items={rawMeat:8,clay:3};g.tribe(1).wood=30;g.tribe(1).hostile=true;
for(let i=0;i<8;i++){const u=g.spawnUnit('spearman',16+i%2,10+Math.floor(i/2),0);u.order='hold';}
g.rebuildWalk();const site=g.state.buildings.find(b=>b.type==='hearth');
const started=beginProduction(g,'cookMeat',site.id,maker.id);decodeGame(encodeGame(g));
const accepted=settlePeace(g,1,'annexation');let validAfter=true,error='';try{decodeGame(encodeGame(g));}catch(e){validAfter=false;error=e.message;}
console.log(JSON.stringify({scope:'Pending ownership defect probe; not a passed acceptance test',started,validBefore:true,accepted,validAfter,error,stocks:g.state.tribes.slice(0,2).map(t=>({team:t.id,alive:t.alive,items:t.items||{}})),projects:g.state.production?.projects.map(p=>({team:p.team,actorTeam:g.state.units.find(u=>u.id===p.actorId)?.team,workplaceTeam:g.state.buildings.find(b=>b.id===p.workplace)?.team,phase:p.phase}))},null,2));
