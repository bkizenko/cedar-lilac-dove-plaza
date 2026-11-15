/** Existing simulation calendar; visual daylight deliberately has its own pace.
 * ONE source of truth for the length of the game year. `SIM_CALENDAR_RULES` is the DEFAULT (Classic) calendar only; a world
 * may carry its own `state.yearLength` (chosen at creation, see YEAR_LENGTH_PRESETS). Never read `SIM_CALENDAR_RULES.yearSeconds`
 * for a live game: use `yearSecondsOf(g.state)` / `seasonSecondsOf(g.state)` / `yearScaleOf(g.state)`.
 * Day length is constant in real time (`simulationDaySeconds`), so a longer year simply holds more days. */
export const SIM_CALENDAR_RULES={yearSeconds:1800,daysPerYear:32} as const;
export const DEFAULT_YEAR_SECONDS:number=SIM_CALENDAR_RULES.yearSeconds;
/** One calendar day in simulation seconds. Constant for every year length. */
export const simulationDaySeconds=SIM_CALENDAR_RULES.yearSeconds/SIM_CALENDAR_RULES.daysPerYear;
/** Ageing, lifespan and skill-learning clocks. A person's "year of life" never stretches with the season length. */
export const LIFE_YEAR_SECONDS=1800;
export const YEAR_LENGTH_MIN=600,YEAR_LENGTH_MAX=14400;
export const YEAR_LENGTH_PRESETS=[
 {seconds:1800,name:'Classic',hint:'Seasons of 7½ minutes at normal speed'},
 {seconds:3600,name:'Long',hint:'Seasons twice as long'},
 {seconds:7200,name:'Extended',hint:'Seasons four times as long'},
 {seconds:14400,name:'Grand',hint:'Seasons eight times as long'},
] as const;
/** A usable year length: a whole number of seconds divisible by 12 (months), within range. */
export const validYearLength=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=YEAR_LENGTH_MIN&&v<=YEAR_LENGTH_MAX&&v%12===0;
/** The value to PERSIST: undefined for the default or anything unusable (a damaged value repairs to Classic instead of failing the save). */
export const normalizeYearLength=(v:unknown):number|undefined=>validYearLength(v)&&v!==DEFAULT_YEAR_SECONDS?v:undefined;
type YearBearer={yearLength?:number}|null|undefined;
export const yearSecondsOf=(s:YearBearer):number=>validYearLength(s?.yearLength)?s!.yearLength!:DEFAULT_YEAR_SECONDS;
export const seasonSecondsOf=(s:YearBearer):number=>yearSecondsOf(s)/4;
/** Multiplier for anything quoted "per 1800 s year" (annual yields, season-long timers). 1 for Classic. */
export const yearScaleOf=(s:YearBearer):number=>yearSecondsOf(s)/DEFAULT_YEAR_SECONDS;
