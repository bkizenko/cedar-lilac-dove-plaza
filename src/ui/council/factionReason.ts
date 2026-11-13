/** One-line, plain-words reason for each faction's mood: which of the ruler's traits it judges (mirrors houses.factionPleasure)
 * and the yearly pull from its demand. Display only; never changes loyalty. */
const TRAITS:Record<string,string>={
 warriors:'boldness, cruelty and ambition',priests:'piety and tradition',merchants:'prudence, innovation and generosity (cruelty counts against)',
 elders:'tradition and honor (innovation counts against)',commons:'mercy and generosity (pride counts against)',landholders:'tradition and generosity (ambition counts against)',
 kin:'honor and generosity',assembly:'mercy and honor (pride and cruelty count against)'};
export function factionReason(kind:string,demand:string,loyalty:number):string{
 const t=TRAITS[kind];const mood=loyalty<35?'It is turning against you.':loyalty>65?'It stands with you.':'It is undecided.';
 return `${t?`Judges your ruler on ${t}. `:''}Each year its mood drifts up if it gets ${demand}, and down if it does not. ${mood}`;
}
