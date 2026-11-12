/** What is historically plausible at each stage of complexity. Gated by tier and by technology/material milestones the sim
 * already tracks, NOT by calendar eras. Each stage lists the political machinery that exists, and what it is not allowed to have yet.
 * Sources of the pattern: Service/Fried band-tribe-chiefdom-state typology; Early State and Feudal pattern studies (general knowledge, unverified for this build). */
import type {Tier,Form} from './polityModel';

export type Stage='forager'|'tribal'|'chiefdom'|'earlyState'|'agrarianState'|'maturePolity';
export const STAGES:readonly Stage[]=['forager','tribal','chiefdom','earlyState','agrarianState','maturePolity'];
export type Machinery={
 rule:string[];succession:string[];marriage:string;diplomacy:string[];internal:string[];conflict:string[];notYet:string[];
};
export const MACHINERY:Record<Stage,Machinery>={
 forager:{rule:['camp consensus','skilled hunter leads in the hunt'],succession:['none: leadership follows ability'],marriage:'exchange between bands to avoid inbreeding; builds a safety net of kin',diplomacy:['gift exchange','shared ceremony'],internal:['elder voice'],conflict:['raids','feud'],notYet:['heirs','claims','tribute','regents','titles']},
 tribal:{rule:['big man earns followers by giving','council of clan heads'],succession:['election by the clans','tanistry'],marriage:'bride-price and clan alliance; the main way to make peace',diplomacy:['truce and feast','blood-price'],internal:['clan heads','elders'],conflict:['feud','raid','retaliation'],notYet:['permanent offices','claims by law','standing army']},
 chiefdom:{rule:['hereditary chief','ranked lineages'],succession:['eldest of the chief’s line','brother-then-son (agnatic)','chosen from the ranked line'],marriage:'high-rank marriage secures tribute and rank; fosterage binds vassals',diplomacy:['tribute','fosterage','feast-hosting'],internal:['ranked kin','priest-adviser','war-leaders'],conflict:['raids for tribute','succession fights'],notYet:['written law','taxes','professional army']},
 earlyState:{rule:['king or council','temple and palace economy'],succession:['primogeniture','designated heir','elective council'],marriage:'dynastic marriage; envoys and hostages; claims through blood',diplomacy:['embassy','treaty oath','dynastic marriage'],internal:['court','priesthood','landed elite','bureaucrats'],conflict:['conquest','tribute wars','succession wars'],notYet:['modern bureaucracy','national identity']},
 agrarianState:{rule:['monarchy/oligarchy/republic','law codes'],succession:['any law incl. partible'],marriage:'treaty marriages; claims inherited; regents',diplomacy:['alliances','guarantees','trade pacts','casus belli'],internal:['estates','assemblies','guilds','church'],conflict:['claims wars','holy war','revolts'],notYet:['mass conscription','ideologies']},
 maturePolity:{rule:['any form'],succession:['any law, constitutional rules'],marriage:'rarely decisive; prestige and alliance',diplomacy:['full diplomacy'],internal:['parties/factions','bureaucracy','press'],conflict:['total war','revolution'],notYet:[]},
};
/** Map the sim's measurable complexity onto a stage. Inputs 0..1 (scale) plus booleans the sim already knows. */
export function stageFor(tier:Tier,scale:number,hasWriting:boolean,hasMetal:boolean,hasTemples:boolean):Stage{
 if(tier==='band')return scale<.12?'forager':'tribal';
 if(tier==='chiefdom')return 'chiefdom';
 if(!hasWriting||!hasMetal)return 'earlyState';
 return hasTemples&&scale>.85?'maturePolity':'agrarianState';
}
/** Allowed political actions at a stage: the sim hides everything else from UI and AI. */
export function allowed(stage:Stage):Set<string>{
 const s=new Set<string>(['envoy']);
 const i=STAGES.indexOf(stage);
 if(i>=0)s.add('giftExchange');
 if(i>=1){s.add('marriage');s.add('truce');}
 if(i>=2){s.add('fosterage');s.add('tributeMarriage');s.add('hostageExchange');}
 if(i>=3){s.add('claim');s.add('regency');s.add('treaty');}
 if(i>=4){s.add('casusBelli');s.add('assembly');s.add('holyWar');}
 return s;
}
/** Which forms are plausible at a stage (a republic in a forager band would be ahistorical). */
export const FORMS_AT:Record<Stage,Form[]>={
 forager:['bigMan'],tribal:['bigMan','league'],chiefdom:['chiefly','theocracy','league','bigMan'],earlyState:['monarchy','theocracy','oligarchy'],agrarianState:['monarchy','oligarchy','republic','theocracy','league'],maturePolity:['monarchy','oligarchy','republic','theocracy','league'],
};
