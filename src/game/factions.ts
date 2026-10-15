/** Team 3 is reserved for raiders. Settled rivals may also use later save IDs. */
export function isRivalTeam(team:number){return Number.isInteger(team)&&team>0&&team!==3;}
/** Count follows habitable area, not an exposed list of undiscovered settlements. */
export function rivalCountForArea(area:number){return area>=585000?4:area>=550000?3:2;}
