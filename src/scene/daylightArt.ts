/** Art direction is independent of the astronomical clock and work schedules. */
export function daylightArt(weather:string,night:boolean,winter:number,elevation:number){
 const season=1-Math.max(0,Math.min(1,winter));
 const weatherWarmth=weather==='storm'||weather==='flood'?0:weather==='rain'?.15:weather==='mist'?.35:.9;
 const warmth=night?0:season*weatherWarmth;
 return {warmth,sunElevation:elevation*(1-warmth)+Math.min(elevation,.42)*warmth};
}
