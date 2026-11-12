/** Why societies expand, explore and conquer: a layered model, not "an ambitious leader".
 * Historical pattern (stylised, not a script): migrations and conquests usually need several of these at once.
 *  PUSH    pressure to leave: crowding against housing/land, hunger, climate stress (drought, frost, flood), cadet surplus
 *          (younger sons with no seat: Norse, Polynesian chiefly lines), feud and tribute debts.
 *  PULL    reasons to go somewhere: open or richer land, wealthy or weak neighbours, trade access, a mission or a promised land.
 *  ENABLE  capacity to go: boats and seafaring, mobility, organisation, a ruler whose appetite and glory ledger reward it.
 *  BRAKE   reasons to stay: cohesion and attachment, fortified neighbours, distance and the unknown, a lean treasury.
 * Pure: inputs are measured from the live game by the runtime; output is a multiplier and a stated reason. All 0..1 unless noted. */
import {clamp01} from './rulerCore';

export type DriverInputs={
 crowding:number;       // population against housing cap
 hunger:number;         // food reserve shortage
 climate:number;        // accumulated bad-weather stress
 cadets:number;         // unseated adult kin of the ruling house, per 4 people of pop
 grievance:number;      // feud, tribute or war pressure at home
 openLand:number;       // unclaimed room nearby
 richNeighbour:number;  // surplus held by others within reach
 weakNeighbour:number;  // neighbours weaker than us
 tradePull:number;      // known routes or markets to reach
 zeal:number;           // faith that wants more converts or a holy place
 seafaring:number;      // boat knowledge
 mobility:number;       // ability to move people and goods
 rulerDrive:number;     // 0..100 from personality plus glory appetite
 polityPressure:number; // 0..100 structural pressure from the polity
 cohesion:number;       // attachment to the homeland
 fortified:number;      // neighbours' defensive strength
 unknown:number;        // how little we know of the world beyond
};
export type Mode='settle'|'migrate'|'conquer'|'trade'|'explore'|'mission'|'stay';
export type Drivers={push:number;pull:number;enable:number;brake:number;drive:number;mode:Mode;why:string[]};
const n=(v:number)=>clamp01(Number.isFinite(v)?v:0);

export function assess(i:DriverInputs):Drivers{
 const push=n(.34*i.crowding+.26*i.hunger+.22*i.climate+.12*i.cadets*2+.06*i.grievance);
 const pull=n(.3*i.openLand+.2*i.richNeighbour+.2*i.weakNeighbour+.18*i.tradePull+.12*i.zeal);
 const enable=n(.25*i.seafaring+.2*i.mobility+.3*n(i.rulerDrive/100)+.25*n(i.polityPressure/100));
 const brake=n(.4*i.cohesion+.3*i.fortified*(1-.5*i.weakNeighbour)+.3*i.unknown*(1-.6*i.seafaring));
 // Push alone makes migrants, pull alone makes dreamers; the system moves when pressure meets a place and the means.
 const raw=(.55*push+.45*pull)*(.35+.65*enable)*(1-.55*brake)+.1*enable*pull;
 const drive=Math.round(100*(.25+1.6*n(raw)))/100;
 const parts:[Mode,number][]=[
  ['migrate',push*(1-i.openLand)*(i.hunger+i.climate)],
  ['settle',i.openLand*(.5+.5*push)],
  ['conquer',(i.weakNeighbour*.6+i.richNeighbour*.4)*n(i.rulerDrive/100*.6+i.polityPressure/100*.4)],
  ['trade',i.tradePull*(.5+.5*i.seafaring)],
  ['explore',i.unknown*(.3+.7*i.seafaring)*(.4+.6*pull)],
  ['mission',i.zeal*(.5+.5*i.rulerDrive/100)],
 ];
 parts.sort((a,b)=>b[1]-a[1]);
 const mode:Mode=drive<.5||parts[0][1]<.08?'stay':parts[0][0];
 const why:string[]=[];
 if(i.crowding>.7)why.push('the settlement is crowded');
 if(i.hunger>.5)why.push('food is short');
 if(i.climate>.5)why.push('bad seasons have worn the land');
 if(i.cadets>.25)why.push('there are kin with no seat at home');
 if(i.grievance>.5)why.push('old quarrels press at home');
 if(i.openLand>.5)why.push('open land lies within reach');
 if(i.richNeighbour>.5)why.push('neighbours hold surplus');
 if(i.weakNeighbour>.5)why.push('a neighbour looks weak');
 if(i.tradePull>.5)why.push('trade routes beckon');
 if(i.zeal>.5)why.push('the faith wants to spread');
 if(i.rulerDrive>65)why.push('the ruler hungers for renown');
 if(brake>.5)why.push(i.cohesion>.6?'people are rooted here':i.fortified>.5?'neighbours are well fortified':'the far country is unknown');
 return {push,pull,enable,brake,drive,mode,why};
}
