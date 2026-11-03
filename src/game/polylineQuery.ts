type Point={x:number;z:number};
type Segment={ax:number;az:number;bx:number;bz:number;id:number;x0:number;z0:number;x1:number;z1:number};
type Node={x0:number;z0:number;x1:number;z1:number;segments?:Segment[];left?:Node;right?:Node};
/** Generation-scoped exact nearest segment. Uses original Math.hypot/order and
 * lowest original segment index on ties; no point/body/state mutation. */
export function polylineQuery(points:readonly Point[]){
 const segments:Segment[]=points.slice(1).map((b,id)=>{const a=points[id];return{ax:a.x,az:a.z,bx:b.x,bz:b.z,id,x0:Math.min(a.x,b.x),z0:Math.min(a.z,b.z),x1:Math.max(a.x,b.x),z1:Math.max(a.z,b.z)};});
 const build=(list:Segment[]):Node=>{const node:Node={x0:Math.min(...list.map(s=>s.x0)),z0:Math.min(...list.map(s=>s.z0)),x1:Math.max(...list.map(s=>s.x1)),z1:Math.max(...list.map(s=>s.z1))};if(list.length<=8){node.segments=list;return node;}const axis=node.x1-node.x0>=node.z1-node.z0?'x':'z';list.sort((a,b)=>axis==='x'?(a.x0+a.x1)-(b.x0+b.x1):(a.z0+a.z1)-(b.z0+b.z1));const mid=Math.floor(list.length/2);node.left=build(list.slice(0,mid));node.right=build(list.slice(mid));return node;},tree=segments.length?build(segments):null;
 return(x:number,z:number)=>{let distance=Infinity,index=0,t=0,bestId=Infinity;if(!tree)return{distance,index,t};const bound=(n:Node)=>Math.hypot(Math.max(0,n.x0-x,x-n.x1),Math.max(0,n.z0-z,z-n.z1));
  const visit=(node:Node)=>{if(bound(node)>distance+1e-9)return;if(node.segments){for(const s of node.segments){const dx=s.bx-s.ax,dz=s.bz-s.az,k=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(x-s.ax-k*dx,z-s.az-k*dz);if(d<distance||(d===distance&&s.id<bestId)){distance=d;index=s.id;t=k;bestId=s.id;}}return;}const a=node.left!,b=node.right!;if(bound(a)<=bound(b)){visit(a);visit(b);}else{visit(b);visit(a);}};visit(tree);return{distance,index,t};
 };
}
