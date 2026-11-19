import type {RivalCourt,WardLine} from '../../game/rulersView';
/** A small kin tree for one neighbouring house from the existing rulers read model only: the ruler, any regent and
 * heir, wards and hostages between our halls, and marriages we are party to (from neighbour news). Pure. */
export type KinNode={label:string;children?:KinNode[]};
export function kinTree(n:{team:number;court?:RivalCourt;wards?:WardLine[]},news:readonly {kind:string;with:number;text:string}[]=[]):KinNode|null{
 const c=n.court;if(!c&&!n.wards?.length)return null;
 const line:KinNode[]=[];
 if(c?.regent)line.push({label:`${c.regent} · regent`});
 if(c?.heir)line.push({label:`${c.heir.name}, ${c.heir.age} · heir${c.heir.adult?'':' (a child)'}${c.heir.legit?'':', doubtful birth'}`});
 const wards=(n.wards??[]).map(w=>({label:`${w.name}, ${w.age} · ${w.kind==='hostage'?'hostage':'foster child'} ${w.heldByUs?'in our hall':'in their hall'}`}));
 const weds=news.filter(x=>x.with===n.team&&x.kind==='marriage').slice(0,3).map(x=>({label:x.text}));
 const kids:KinNode[]=[...line,...(wards.length?[{label:'Wards and hostages',children:wards}]:[]),...(weds.length?[{label:'Marriages with us',children:weds}]:[])];
 return {label:c?`${c.ruler}, ${c.rulerAge} · head of House ${c.house}${c.extinct?' (no heir)':''}`:'Their house',children:kids};
}
