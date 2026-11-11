import type {Game} from './sim';
import type {GameState} from './types';
export const IDENTITY_SYMBOLS=['sun','river','mountain','sprout','star'] as const;
export const IDENTITY_PATTERNS=['plain','split','band'] as const;
export type SocietyIdentity={version:1;symbol:typeof IDENTITY_SYMBOLS[number];pattern:typeof IDENTITY_PATTERNS[number];primary:string;secondary:string;emblem:string};
export const IDENTITY_RULES={nameLength:40,minimumEmblemContrast:3} as const;
const palettes=[['#315847','#733d35','#f6e5ba'],['#304760','#78502d','#fff1d2'],['#63364a','#365752','#f6e4ba'],['#5b492f','#3d5368','#fff2d4'],['#36523a','#674b63','#f5e9c9'],['#593c35','#365663','#f7e6bc']] as const;
function luminance(hex:string){const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2];}
export function flagContrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function identityIssue(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))return 'Choose a flag design.';const v=value as SocietyIdentity;if(Object.keys(v).some(k=>!['version','symbol','pattern','primary','secondary','emblem'].includes(k))||v.version!==1||!IDENTITY_SYMBOLS.includes(v.symbol)||!IDENTITY_PATTERNS.includes(v.pattern))return 'Choose a supported symbol and pattern.';if([v.primary,v.secondary,v.emblem].some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))return 'Use six-digit flag colors.';if(flagContrast(v.primary,v.emblem)<3||flagContrast(v.secondary,v.emblem)<3)return 'The emblem needs more contrast with both flag colors.';return null;}
function hash(seed:number,team:number){let n=(seed^Math.imul(team+1,0x9e3779b9))>>>0;n^=n>>>16;n=Math.imul(n,0x85ebca6b)>>>0;n^=n>>>13;return n>>>0;}
/** Read-only fallback: old villages retain names and colors byte-for-byte.
 * No random generator, discovery, stat bonus or renderer color cache is touched. */
export function societyIdentity(g:Pick<Game,'state'>,team:number):SocietyIdentity{const explicit=g.state.tribes?.find(t=>t.id===team)?.identity;if(explicit&&!identityIssue(explicit))return explicit;const seed=hash(g.state.seed,team),p=palettes[seed%palettes.length];return{version:1,symbol:IDENTITY_SYMBOLS[(seed>>>4)%IDENTITY_SYMBOLS.length],pattern:IDENTITY_PATTERNS[(seed>>>8)%IDENTITY_PATTERNS.length],primary:p[0],secondary:p[1],emblem:p[2]};}
export function savePlayerIdentity(g:Game,name:string,identity:SocietyIdentity){const normalized=typeof name==='string'?name.trim().normalize('NFC'):'';if(!normalized||[...normalized].length>IDENTITY_RULES.nameLength||!/[\p{L}\p{N}]/u.test(normalized)||!/^[\p{L}\p{N} .,'’\-]+$/u.test(normalized))return{accepted:false,reason:'Use a community name of 1–40 letters, numbers or simple punctuation.'};const issue=identityIssue(identity);if(issue)return{accepted:false,reason:issue};const player=g.tribe(0);if(!player)return{accepted:false,reason:'Your community is unavailable.'};player.name=normalized;player.identity={...identity,primary:identity.primary.toLowerCase(),secondary:identity.secondary.toLowerCase(),emblem:identity.emblem.toLowerCase()};return{accepted:true,reason:'Community name and flag saved.'};}
export function validSocietyIdentities(s:GameState){return s.tribes.every(t=>t.identity===undefined||!identityIssue(t.identity));}
/** Affiliation stitching is visual only; armor construction/protection remain
 * governed by the actual paid armor asset, never this flag or a culture label. */
export function armorAffiliationColor(g:Pick<Game,'state'>,team:number){const color=g.state.tribes?.[team]?.identity?.emblem;return color&&/^#[0-9a-f]{6}$/i.test(color)?color:societyIdentity(g,team).emblem;}
