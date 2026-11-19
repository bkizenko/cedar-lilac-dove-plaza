import type {KinNode} from './kinTree';
const Branch=({node}:{node:KinNode})=><li>{node.label}{node.children?.length?<ul className="ml-4 border-l border-parchment/20 pl-2">{node.children.map((c,i)=><Branch key={i} node={c}/>)}</ul>:null}</li>;
/** Folded kin tree for one neighbouring house; the header button centres the map on their known settlement. */
export function KinTreeView({tree,onCentre}:{tree:KinNode|null;onCentre?:()=>void}){
 if(!tree)return null;
 return <details className="hw-kin text-base" data-kin-tree><summary className="cursor-pointer">Kin tree</summary>
  <ul className="mt-1 space-y-1"><Branch node={tree}/></ul>
  {onCentre&&<button type="button" className="mt-1 min-h-11 rounded border border-bronze/40 px-2" onClick={onCentre}>Centre on their hall</button>}
 </details>;
}
