/** Local solar time for a temperate island at 45° north.
 * March begins the game year. Calendar compression does not change saved timers.
 * The sunrise horizon includes the usual 0.833° refraction/solar-disc allowance.
 */
export function daylightAt(time: number, latitude = 45) {
  const year = ((time % 1800) + 1800) % 1800 / 1800;
  const dayOfYear = 60 + year * 365;
  const rad = Math.PI / 180;
  const declination = 23.44 * rad * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
  const lat = Math.max(-65, Math.min(65, latitude)) * rad;
  const cosine = (Math.cos(90.833 * rad) - Math.sin(lat) * Math.sin(declination)) /
    (Math.cos(lat) * Math.cos(declination));
  const halfDay = Math.acos(Math.max(-1, Math.min(1, cosine))) / Math.PI * 12;
  return { sunrise: 12 - halfDay, sunset: 12 + halfDay, hours: halfDay * 2 };
}

export function solarTimeLabel(hour: number) {
  const minute = Math.round(hour * 60);
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** Clock pacing allocates more real play time to seasonal daylight without
 * changing the displayed 24-hour day or astronomical sunrise/sunset hours. */
export const DAYLIGHT_PACING_RULES={minimumDayFraction:.88,maximumDayFraction:.94,clockCycleSlowdown:24,astronomicalWinterHours:8,astronomicalSummerHours:16,startHour:6.7} as const;
export function daylightPacingAt(time:number){
 const real=daylightAt(time),rules=DAYLIGHT_PACING_RULES;
 const season=Math.max(0,Math.min(1,(real.hours-rules.astronomicalWinterHours)/(rules.astronomicalSummerHours-rules.astronomicalWinterHours)));
 const dayFraction=rules.minimumDayFraction+(rules.maximumDayFraction-rules.minimumDayFraction)*season;
 return{dayFraction,nightFraction:1-dayFraction};
}
/** The clock cycle is deliberately much longer; simulation, work and consumption
 * seconds remain unchanged. Local clock minutes advance faster in darkness. seasonTime is explicit for
 * fixed-season diagnostics; ordinary gameplay uses the current season. */
export function pacedSolarHour(time:number,dayRate:number,seasonTime=time){
 const sun=daylightAt(seasonTime),budget=daylightPacingAt(seasonTime),first=daylightAt(0),initial=daylightPacingAt(0);
 const offset=(DAYLIGHT_PACING_RULES.startHour-first.sunrise)/first.hours*initial.dayFraction;
 const phase=((time*dayRate/86400/DAYLIGHT_PACING_RULES.clockCycleSlowdown+offset)%1+1)%1;
 const hour=phase<budget.dayFraction?sun.sunrise+phase/budget.dayFraction*sun.hours:
  sun.sunset+(phase-budget.dayFraction)/budget.nightFraction*(24-sun.hours);
 return hour%24;
}

/** Productive hours include lamplit shoulders around real seasonal daylight.
 * This is game pacing, not a claim about historical working hours. */
export function workdayAt(time: number, hour: number) {
  const sun=daylightAt(time);
  const hours=16+2*Math.max(0,Math.min(1,(sun.hours-8)/8));
  const start=Math.max(4,Math.min(5,sun.sunrise));
  const end=start+hours;
  return {start,end,hours,working:hour>=start&&hour<end};
}
