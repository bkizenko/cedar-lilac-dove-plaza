import type {Ctx} from './itemKit';
import type {ItemCategory,Frame} from './itemModels';
export const TOOL_GENERATORS:{id:string;name:string;category:ItemCategory;frame:Frame;gen:(c:Ctx)=>void;budget?:readonly [number,number,number]}[]=[];
