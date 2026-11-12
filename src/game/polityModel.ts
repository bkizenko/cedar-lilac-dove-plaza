/** Polity layer: who counts (winning coalition vs selectorate), legitimacy mix, fiscal base, military organisation,
 * succession law and institutionalisation. Pure data plus pure derivations; nothing here touches game state.
 * Inspiration (not copies): selectorate theory, Weber on legitimacy, chiefdom/state typologies. */
import {clamp,clamp01,lerp,makeRng,hash32,normal,normalize,pick,weighted,type Rng} from './rulerCore';

export type Tier='band'|'chiefdom'|'state';
export const FORMS=['bigMan','chiefly','monarchy','oligarchy','republic','theocracy','league'] as const;
export type Form=(typeof FORMS)[number];
export const SUCCESSION_LAWS=['primogenitureMale','primogenitureAny','ultimogeniture','partible','agnaticSeniority','tanistry','electiveAssembly','designated','councilElders'] as const;
export type SuccessionLaw=(typeof SUCCESSION_LAWS)[number];
export const MILITARY_ORGS=['kinLevy','retinue','militia','professional','mercenary','slaveSoldier','feudalHost'] as const;
export type MilitaryOrg=(typeof MILITARY_ORGS)[number];
export const FISCAL_SOURCES=['tribute','tax','trade','levy','estates'] as const;
export type FiscalSource=(typeof FISCAL_SOURCES)[number];
export const LEGITIMACY_SOURCES=['kinship','charisma','performance','sacred','law'] as const;
export type LegitimacySource=(typeof LEGITIMACY_SOURCES)[number];

/** Ecology drives the polity. All values 0..1. */
export type Ecology={surplus:number;threat:number;trade:number;pastoral:number;sacred:number;scale:number};
export type Polity={
 tier:Tier;form:Form;selectorate:number;coalition:number;
 legitimacy:Record<LegitimacySource,number>;fiscal:Record<FiscalSource,number>;
 military:MilitaryOrg;succession:SuccessionLaw;institutionalization:number;
};

export const LAWS_BY_FORM:Record<Form,readonly SuccessionLaw[]>={
 bigMan:['councilElders','tanistry','electiveAssembly'],
 chiefly:['tanistry','agnaticSeniority','electiveAssembly','primogenitureMale','ultimogeniture'],
 monarchy:['primogenitureMale','primogenitureAny','partible','agnaticSeniority','designated','ultimogeniture'],
 oligarchy:['councilElders','electiveAssembly','designated'],
 republic:['electiveAssembly','councilElders'],
 theocracy:['designated','electiveAssembly','councilElders'],
 league:['electiveAssembly','tanistry','councilElders'],
};
const FORMS_BY_TIER:Record<Tier,readonly Form[]>={band:['bigMan'],chiefdom:['chiefly','bigMan','league','theocracy'],state:['monarchy','oligarchy','republic','theocracy','league']};
const LEG_BASE:Record<Form,Record<LegitimacySource,number>>={
 bigMan:{kinship:.3,charisma:.4,performance:.2,sacred:.05,law:.05},
 chiefly:{kinship:.4,charisma:.25,performance:.15,sacred:.15,law:.05},
 monarchy:{kinship:.35,charisma:.15,performance:.15,sacred:.25,law:.1},
 oligarchy:{kinship:.2,charisma:.1,performance:.25,sacred:.1,law:.35},
 republic:{kinship:.05,charisma:.15,performance:.3,sacred:.1,law:.4},
 theocracy:{kinship:.1,charisma:.15,performance:.15,sacred:.5,law:.1},
 league:{kinship:.2,charisma:.2,performance:.25,sacred:.1,law:.25},
};
/** Share of the selectorate that forms the winning coalition, by form (lo, hi). */
const COALITION_RATIO:Record<Form,readonly [number,number]>={
 bigMan:[.2,.45],chiefly:[.06,.2],monarchy:[.005,.02],oligarchy:[.02,.06],republic:[.12,.35],theocracy:[.01,.04],league:[.08,.25],
};

/** Kinship features unlock with polity complexity, not with a calendar era. */
export type KinshipFeatures={heirs:boolean;marriageExchange:boolean;fosterage:boolean;claims:boolean;regency:boolean;envoyHeirs:boolean;court:boolean};
export function features(tier:Tier):KinshipFeatures{
 return tier==='band'?{heirs:false,marriageExchange:false,fosterage:false,claims:false,regency:false,envoyHeirs:false,court:false}
  :tier==='chiefdom'?{heirs:true,marriageExchange:true,fosterage:true,claims:false,regency:false,envoyHeirs:false,court:false}
  :{heirs:true,marriageExchange:true,fosterage:true,claims:true,regency:true,envoyHeirs:true,court:true};
}
export function tierForScale(scale:number):Tier{return scale<.25?'band':scale<.6?'chiefdom':'state';}

function pickForm(r:Rng,tier:Tier,e:Ecology):Form{
 const opts=FORMS_BY_TIER[tier];if(opts.length===1)return opts[0];
 const w:Record<Form,number>={bigMan:.2,chiefly:.5,monarchy:.6+e.threat*.8,oligarchy:.3+e.trade*.9,republic:.15+e.trade*.8+(1-e.threat)*.3,theocracy:.1+e.sacred*1.2,league:.1+e.pastoral*.7};
 return weighted(r,opts.map(f=>[f,w[f]] as const));
}
function pickMilitary(r:Rng,tier:Tier,form:Form):MilitaryOrg{
 if(tier==='band')return 'kinLevy';
 if(tier==='chiefdom')return pick(r,['kinLevy','retinue']);
 switch(form){
  case 'monarchy':return pick(r,['feudalHost','professional','retinue','slaveSoldier']);
  case 'republic':return pick(r,['militia','professional','mercenary']);
  case 'oligarchy':return pick(r,['militia','mercenary','professional']);
  case 'theocracy':return pick(r,['retinue','slaveSoldier','militia']);
  default:return pick(r,['kinLevy','militia']);
 }
}
export function generatePolity(seed:number,eco:Ecology,culture:{traditionalism:number}={traditionalism:50},tier:Tier=tierForScale(eco.scale)):Polity{
 const r=makeRng(hash32('polity',seed));
 const form=pickForm(r,tier,eco);
 const selectorate=Math.round(tier==='band'?normal(r,35,12,12,90):tier==='chiefdom'?normal(r,180,70,60,400):normal(r,1200,500,300,4000));
 const ratio=COALITION_RATIO[form];
 const coalition=Math.max(1,Math.min(selectorate,Math.round(selectorate*lerp(ratio[0],ratio[1],r()))));
 const lb=LEG_BASE[form],legitimacy={} as Record<LegitimacySource,number>;
 for(const k of LEGITIMACY_SOURCES)legitimacy[k]=Math.max(.01,lb[k]+(r()-.5)*.16+(k==='kinship'||k==='sacred'?(culture.traditionalism-50)/500:0));
 const fiscal=normalize<FiscalSource>({
  tribute:.15+eco.threat*.4+(form==='monarchy'?.1:0),tax:tier==='state'?.1+eco.scale*.5:.02,trade:.1+eco.trade*.7,
  levy:.2*(1-eco.scale)+.1,estates:.1+eco.sacred*.4+(form==='theocracy'?.2:0),
 });
 const law=pick(r,LAWS_BY_FORM[form]);
 const inst=clamp(tier==='band'?normal(r,14,5):tier==='chiefdom'?normal(r,32,8):normal(r,55,14)+legitimacy.law*30,5,95);
 return {tier,form,selectorate,coalition,legitimacy:normalize<LegitimacySource>(legitimacy),fiscal,military:pickMilitary(r,tier,form),succession:law,institutionalization:Math.round(inst)};
}

export const loyaltyNorm=(p:Polity)=>p.coalition/Math.max(1,p.selectorate);
/** Share of what the ruler distributes that must be private goods (retinue gifts, spoils). Small coalitions => high. */
export const privateGoodsShare=(p:Polity)=>clamp01(1-2.2*loyaltyNorm(p));
const spoilsMilitary=new Set<MilitaryOrg>(['retinue','feudalHost','slaveSoldier']);
/** Structural expansion pressure 0..100 from the polity alone (the ruler adds personality on top, see glory.drive). */
export function expansionPressure(p:Polity):number{
 const v=.12+.55*privateGoodsShare(p)+.25*p.fiscal.tribute+(spoilsMilitary.has(p.military)?.08:0)-.2*(p.institutionalization/100);
 return Math.round(100*clamp01(v));
}
export function validatePolity(p:Polity):string[]{
 const bad:string[]=[];
 if(!FORMS_BY_TIER[p.tier].includes(p.form))bad.push(`form ${p.form} not allowed in tier ${p.tier}`);
 if(!LAWS_BY_FORM[p.form].includes(p.succession))bad.push(`law ${p.succession} not allowed for form ${p.form}`);
 if(!(p.coalition>=1&&p.coalition<=p.selectorate))bad.push('coalition must be within 1..selectorate');
 const sl=Object.values(p.legitimacy).reduce((a,b)=>a+b,0),sf=Object.values(p.fiscal).reduce((a,b)=>a+b,0);
 if(Math.abs(sl-1)>1e-6)bad.push('legitimacy mix must sum to 1');if(Math.abs(sf-1)>1e-6)bad.push('fiscal mix must sum to 1');
 if(!(p.institutionalization>=0&&p.institutionalization<=100))bad.push('institutionalization out of range');
 if(!MILITARY_ORGS.includes(p.military))bad.push('unknown military organisation');
 return bad;
}
