import * as THREE from 'three';
/** Independent raster survey from ACTUAL rendered geometry buffers. No index or
 * descriptor query is used to construct the expected water elevations. */
export function renderedWaterGrid(group,size,base,step=4){
 const width=Math.round(size/step)+1,data=new Float64Array(width*width).fill(base),half=size/2;
 group.updateMatrixWorld(true);
 for(const mesh of group.children){const p=mesh.geometry.attributes.position,indices=mesh.geometry.index;for(let i=0;i<(indices?.count??p.count);i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,indices?indices.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),[a,b,c]=v,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(den)<1e-10)continue;const x0=Math.max(0,Math.ceil((Math.min(a.x,b.x,c.x)+half)/step-1e-7)),x1=Math.min(width-1,Math.floor((Math.max(a.x,b.x,c.x)+half)/step+1e-7)),z0=Math.max(0,Math.ceil((Math.min(a.z,b.z,c.z)+half)/step-1e-7)),z1=Math.min(width-1,Math.floor((Math.max(a.z,b.z,c.z)+half)/step+1e-7));for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){const x=ix*step-half,z=iz*step-half,u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7){const at=iz*width+ix;data[at]=Math.max(data[at],a.y*u+b.y*v+c.y*(1-u-v));}}}}
 return{width,data,at:(x,z)=>data[Math.round((z+half)/step)*width+Math.round((x+half)/step)]};
}
