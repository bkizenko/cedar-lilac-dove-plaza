/** Reproducible isolated rival economy audit. Never reads/writes browser saves.
 * The unattended player would lose before three years; suppress only the
 * scenario's victory checks, leaving rival work, hunger, weather and AI intact.
 * Run: node --import ./scripts/game-loader.mjs scripts/rival-economy-audit.mjs
 */
import assert from 'node:assert/strict';
import { Game } from '../src/game/sim.ts';
const results=[];
for(const seed of [345,123456,98765]) {
  let random=seed;
  const originalRandom=Math.random;
  Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
  try {
    const g=new Game();g.reset(seed);g.enterIsland();g.checkVictory=()=>{};
    for(let i=0;i<16200;i++) {
      g.step(1/3);
      if(i%5400===5399) {
        const row={seed,year:Math.round(g.state.time/1800),rivals:[1,2].map(team=>({
          team,pop:g.popNow(team),food:Math.round(g.tribe(team).food),wood:Math.round(g.tribe(team).wood),age:g.tribe(team).age,
          fields:g.state.buildings.filter(b=>b.team===team&&b.type==='farm'&&g.finished(b)).length,
          stores:g.state.buildings.filter(b=>b.team===team&&b.type==='warehouse'&&g.finished(b)).length,
          travelers:g.state.units.filter(u=>u.team===team&&u.hp>0&&(u.scout||u.visit)).length,
        }))};
        console.log(JSON.stringify(row));if(row.year===3)results.push(...row.rivals);
        assert.ok(g.state.units.every(u=>[u.x,u.y,u.z,u.hp].every(Number.isFinite)));
      }
    }
  } finally {Math.random=originalRandom;}
}
assert.ok(results.filter(r=>r.pop>=4).length>=4,'at least four of six societies sustain residents through three years');
assert.ok(results.some(r=>r.pop>=8),'at least one society grows beyond its starting population');
console.log('Survival/growth foundation passed. Later-age power, local logistics and dynamic independent factions remain open.');
