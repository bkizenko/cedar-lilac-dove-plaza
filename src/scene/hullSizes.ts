/** Seats per hull class, mirrored from src/game/boatClasses.ts (tests fail if they drift). */
export const HULL_SEATS={riverboat:5,scoutCanoe:2,freightPunt:8} as const;
/** Real hull footprint from seats: ~4.4 m / 1.0 m for a 2-seat canoe up to ~9.8 m / 2.3 m for an 8-seat punt. Assumption: boatClasses.ts has no dimensions yet (G13). */
export const hullSize=(seats:number)=>({length:Math.round((2.6+.9*seats)*100)/100,beam:Math.round((.55+.22*seats)*100)/100});
