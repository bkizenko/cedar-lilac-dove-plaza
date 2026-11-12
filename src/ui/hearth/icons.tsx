import type {ReactNode} from 'react';
import {Home,Wheat,TreePine,Mountain,Users,Hammer,Warehouse,Shield,Landmark,GraduationCap,Castle,Church,Store,Pickaxe,Axe,Eye,PawPrint,Flame,Scissors,CookingPot,Package,Layers,Fish,Compass,Coins,Droplets,Gem,Sprout,Swords,Heart,Handshake,Flag,Baby,Tent,Scale,Route,AlignJustify,Triangle,Grip,User} from 'lucide-react';
/** Hearth icon vocabulary: one small, consistent set so every number has the same picture everywhere. */
export type IconProps={size?:number;className?:string};
const mk=(C:(p:{size?:number;strokeWidth?:number;className?:string;'aria-hidden'?:boolean})=>ReactNode)=>({size=24,className}:IconProps)=>C({size,strokeWidth:2,className,'aria-hidden':true});
export const RES_ICON={food:mk(p=><Wheat {...p}/>),wood:mk(p=><TreePine {...p}/>),stone:mk(p=><Mountain {...p}/>),water:mk(p=><Droplets {...p}/>),people:mk(p=><Users {...p}/>),copper:mk(p=><Coins {...p}/>),iron:mk(p=><Gem {...p}/>),seeds:mk(p=><Sprout {...p}/>)} as const;
export const RES_NAME:Record<string,string>={food:'Food',wood:'Logs',stone:'Stone',water:'Water',people:'People',copper:'Copper',iron:'Iron',seeds:'Seeds'};
const B:Record<string,(p:any)=>ReactNode>={
 hearth:p=><Flame {...p}/>,butcher:p=><Scissors {...p}/>,dryrack:p=><Layers {...p}/>,tanner:p=><Layers {...p}/>,tailor:p=><Scissors {...p}/>,potter:p=><CookingPot {...p}/>,kiln:p=><Flame {...p}/>,fibreWorkshop:p=><Package {...p}/>,
 hut:p=><Home {...p}/>,house:p=><Home {...p}/>,cornerstone:p=><Compass {...p}/>,townhall:p=><Landmark {...p}/>,smokehouse:p=><Fish {...p}/>,threshingFloor:p=><Wheat {...p}/>,grindingStone:p=><Wheat {...p}/>,oven:p=><Wheat {...p}/>,farm:p=><Wheat {...p}/>,grove:p=><Sprout {...p}/>,
 lumber:p=><Axe {...p}/>,quarry:p=><Pickaxe {...p}/>,dock:p=><Fish {...p}/>,bridge:p=><Hammer {...p}/>,warehouse:p=><Warehouse {...p}/>,barracks:p=><Shield {...p}/>,palisade:p=><Shield {...p}/>,gate:p=><Castle {...p}/>,stonewall:p=><Castle {...p}/>,trench:p=><Hammer {...p}/>,moat:p=><Shield {...p}/>,
 workshop:p=><Hammer {...p}/>,forge:p=><Hammer {...p}/>,watchtower:p=><Eye {...p}/>,temple:p=><Church {...p}/>,market:p=><Store {...p}/>,keep:p=><Castle {...p}/>,pen:p=><PawPrint {...p}/>,stables:p=><PawPrint {...p}/>,university:p=><GraduationCap {...p}/>};
export const bldIcon=(type:string|undefined,size=32,className?:string)=>(B[type||'']||(p=><Landmark {...p}/>))({size,strokeWidth:2,className,'aria-hidden':true});
export const PLAN_ICON:Record<string,(p:any)=>ReactNode>={grow:p=><Sprout {...p}/>,stockpile:p=><Package {...p}/>,settle:p=><Tent {...p}/>,trade:p=><Scale {...p}/>,raid:p=><Swords {...p}/>,ally:p=><Handshake {...p}/>,fortify:p=><Castle {...p}/>,recover:p=><Heart {...p}/>};
export const PLAN_NAME:Record<string,string>={grow:'Grow',stockpile:'Stockpile',settle:'Settle',trade:'Trade',raid:'Raid',ally:'Ally',fortify:'Fortify',recover:'Recover'};
export const POSTURE_ICON:Record<string,(p:any)=>ReactNode>={develop:p=><Hammer {...p}/>,defend:p=><Shield {...p}/>,recover:p=><Heart {...p}/>,raid:p=><Swords {...p}/>};
export const POSTURE_NAME:Record<string,string>={develop:'Develop',defend:'Defend',recover:'Recover',raid:'Raid'};
export const AGREEMENT_ICON:Record<string,(p:any)=>ReactNode>={pact:p=><Handshake {...p}/>,truce:p=><Flag {...p}/>,marriage:p=><Heart {...p}/>,tribute:p=><Coins {...p}/>,fosterage:p=><Baby {...p}/>};
export const AGREEMENT_NAME:Record<string,string>={pact:'Pact',truce:'Truce',marriage:'Marriage',tribute:'Tribute',fosterage:'Fostering'};
export const FORMATION_ICON:Record<string,(p:any)=>ReactNode>={line:p=><AlignJustify {...p}/>,wedge:p=><Triangle {...p}/>,shieldWall:p=><Shield {...p}/>,loose:p=><Grip {...p}/>};
export const ROUTE_ICON=(p:any)=><Route {...p}/>;
export const PERSON_ICON=(p:any)=><User {...p}/>;
/** Game seconds as a short age: now, 5m, 2h. */
export function ago(seconds:number|null|undefined):string{
 if(seconds===null||seconds===undefined)return 'never';
 if(seconds<60)return 'now';if(seconds<3600)return `${Math.round(seconds/60)}m`;if(seconds<86400)return `${Math.round(seconds/3600)}h`;return `${Math.round(seconds/86400)}d`;
}
/** Freshness band of a report: green recent, amber ageing, grey stale or never. */
export const freshness=(seconds:number|null|undefined):'fresh'|'aging'|'stale'=>seconds===null||seconds===undefined?'stale':seconds<1200?'fresh':seconds<3600?'aging':'stale';
