import type { Game } from './sim';
import { YEAR_SECONDS } from './settlement';

export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const SEASON_REPORT_LIMIT = 20;
export const SEASON_METRICS = ['food', 'wood', 'stone', 'copper', 'iron', 'weapons'] as const;
export type SeasonMetric = typeof SEASON_METRICS[number];
type Counts = Record<SeasonMetric, number>;
type FoodFlow = { eaten: number; spoiled: number; partial: boolean };
type SeasonSample = { season: number; partial: boolean; totals: Counts; stock: Counts; foodFlow?: FoodFlow };
export type SeasonReports = { active: SeasonSample; history: SeasonSample[]; weaponsMade: number };

function foodFlow(g: Game, partial: boolean): FoodFlow {
 const totals = g.state.simulationEvents?.totals;
 return { eaten: totals?.['food_consumed:0:food'] ?? 0, spoiled: totals?.['food_spoiled:0:food'] ?? 0, partial };
}

function sample(g: Game, season: number, weapons: number, partial = false): SeasonSample {
 const tribe = g.tribe(0);
 const totals = g.state.simulationEvents?.totals;
 const delivery = (resource: string) => totals?.[`cargo_delivered:0:${resource}`] ?? 0;
 return {
  season, partial, foodFlow: foodFlow(g, partial),
  totals: {
   food: totals?.['food_received:0:food'] ?? 0,
   wood: delivery('wood'), stone: delivery('stone'), copper: delivery('copper'), iron: delivery('iron'),
   weapons,
  },
  stock: {
   food: tribe.food, wood: tribe.wood, stone: tribe.stone, copper: tribe.copper, iron: tribe.iron,
   weapons: tribe.spears + tribe.bows + tribe.blades,
  },
 };
}

function measureSeason(g: Game, report: SeasonReports): SeasonSample {
 const { active, weaponsMade } = report;
 const current = sample(g, active.season, weaponsMade, active.partial);
 for (const key of SEASON_METRICS) current.totals[key] = Math.max(0, current.totals[key] - active.totals[key]);
 if (active.foodFlow) {
  const total = foodFlow(g, active.foodFlow.partial);
  current.foodFlow = {
   eaten: Math.max(0, total.eaten - active.foodFlow.eaten),
   spoiled: Math.max(0, total.spoiled - active.foodFlow.spoiled),
   partial: total.partial,
  };
 } else delete current.foodFlow;
 return current;
}

export function currentSeasonReport(g: Game) {
 const report = g.state.seasonReports;
 return report ? measureSeason(g, report) : undefined;
}

export function updateSeasonReports(g: Game) {
 const season = Math.floor(g.state.time / (YEAR_SECONDS / 4));
 const report = g.state.seasonReports;
 if (!report) {
  g.state.seasonReports = {
   active: sample(g, season, 0, g.state.time % (YEAR_SECONDS / 4) > 1),
   history: [], weaponsMade: 0,
  };
  return;
 }
 if (report.active.season === season) {
  report.active.foodFlow ??= foodFlow(g, true);
  return;
 }
 const completed = measureSeason(g, report);
 report.history.push(completed);
 if (report.history.length > SEASON_REPORT_LIMIT) report.history.shift();
 report.active = sample(g, season, report.weaponsMade);
}

export function recordSeasonWeapon(g: Game, team: number) {
 if (team !== 0) return;
 updateSeasonReports(g);
 g.state.seasonReports!.weaponsMade++;
}

export function validSeasonReports(report: SeasonReports | undefined, time: number) {
 if (report === undefined) return true;
 const current = Math.floor(time / (YEAR_SECONDS / 4));
 const validSample = (row: SeasonSample) => !!row && Number.isSafeInteger(row.season) &&
  row.season >= 0 && row.season <= current && typeof row.partial === 'boolean' &&
  (row.foodFlow === undefined || !!row.foodFlow && typeof row.foodFlow.partial === 'boolean' &&
   [row.foodFlow.eaten,row.foodFlow.spoiled].every(n => Number.isFinite(n) && n >= 0)) &&
  [row.totals,row.stock].every(values => !!values && SEASON_METRICS.every(key =>
   Number.isFinite(values[key]) && values[key] >= 0));
 return !!report && Number.isSafeInteger(report.weaponsMade) && report.weaponsMade >= 0 &&
  validSample(report.active) && Array.isArray(report.history) && report.history.length <= SEASON_REPORT_LIMIT &&
  report.history.every((row, i, history) => validSample(row) && row.season < report.active.season &&
   (i === 0 || row.season > history[i - 1].season));
}
