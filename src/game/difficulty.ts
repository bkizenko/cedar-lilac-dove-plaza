import type {Game} from './sim';
export const DIFFICULTIES={
 'super-easy':{name:'Super easy',food:.55,spoil:.35,raid:.35,band:.5,damage:.55,description:'Abundant reserves last longer; small, gentle raids.'},
 easy:{name:'Easy',food:.75,spoil:.65,raid:.65,band:.75,damage:.75,description:'Lower food needs, slower spoilage and lighter attacks.'},
 normal:{name:'Normal',food:1,spoil:1,raid:1,band:1,damage:1,description:'Standard food needs, spoilage and raid pressure.'},
 hard:{name:'Hard',food:1.15,spoil:1.3,raid:1.3,band:1.15,damage:1.2,description:'Tighter reserves, more frequent raids and stronger attackers.'},
 survival:{name:'Survival',food:1.3,spoil:1.65,raid:1.65,band:1.35,damage:1.45,description:'High food pressure and dangerous, persistent raids.'},
 apocalypse:{name:'Apocalypse',food:1.5,spoil:2,raid:2,band:1.6,damage:1.8,description:'Extreme food losses and very frequent, punishing attacks.'},
} as const;
export type Difficulty=keyof typeof DIFFICULTIES;
export function difficulty(g:Game){return DIFFICULTIES[g.state.difficulty??'normal'];}
