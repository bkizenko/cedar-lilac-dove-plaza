import {Game} from '../../src/game/sim.ts';
import * as THREE from 'three';
import {addLocalWaters} from '../../src/scene/depthWater.ts';
import {writeFileSync} from 'node:fs';
const rows=[];
for(const [seed,layout] of [[7,'archipelago'],[0,'continents'],[1,'pangaea']]){
 const g=new Game();g.reset(seed,17,{size:1040,layout});const w=g.world,group=new THREE.Group(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});addLocalWaters(group,w.waterBodies,w.waterfalls,mat,mat);group.updateMatrixWorld(true);for(const m of group.children)m.raycast=THREE.Mesh.prototype.raycast;
 const ray=new THREE.Raycaster(),at=(x,z)=>{ray.set(new THREE.Vector3(x,200,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(group.children).map(h=>({mesh:h.object.name,y:h.point.y}));};
 const ends=[],fall=[];for(const b of w.waterBodies)if(b.kind==='river')for(const end of [0,1]){const p=b.pts[end?b.pts.length-1:0],q=b.pts[end?b.pts.length-2:1],len=Math.hypot(p.x-q.x,p.z-q.z);for(const d of [1,2]){const x=p.x+(p.x-q.x)/len*d,z=p.z+(p.z-q.z)/len*d;if(Math.abs(x)>520||Math.abs(z)>520)continue;const height=g.height(x,z),water=g.waterAt(x,z),hit=at(x,z),shown=hit.some(h=>h.y>height+.02&&Math.abs(h.y-water)<.15);if(water>height+.1&&!shown)ends.push({body:b.id,end,d,x,z,height,water,hit});}}
 for(const f of w.waterfalls)for(const t of [.1,.25,.5,.75,.9]){const x=f.x+f.dx*t,z=f.z+f.dz*t,y=f.upperY+(f.lowerY-f.upperY)*t;fall.push({t,x,z,visualY:y,water:g.waterAt(x,z),height:g.height(x,z),walkable:g.walkable(x,z),hit:at(x,z)});}
 rows.push({seed,layout,phantomWetEndcapSamples:ends.filter(p=>p.water>w.waterY+.02).length,endExamples:ends.filter(p=>p.water>w.waterY+.02).slice(0,8),oceanCoveredMouthSamples:ends.filter(p=>p.water<=w.waterY+.02),fall});for(const m of group.children)m.geometry.dispose();mat.dispose();
}
writeFileSync('/tmp/hearthwild-v17-water-edge-audit.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
