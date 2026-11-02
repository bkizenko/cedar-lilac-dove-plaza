/** Keep a terrain focus visible without changing the player's stored orbit.
 * Height queries occur only when the target/orbit/terrain revision changes. */
export const CAMERA_CLEARANCE_RULES={sampleSpacingMetres:3,maximumLineSamples:96,minimumEyeClearanceMetres:2,lineClearanceMetres:.25,focusHeightMetres:.55,maximumRaiseMetres:192,horizontalFallbacks:[1,.5,0]} as const;
export type CameraPoint={x:number;y:number;z:number};
export type CameraGround={size:number;height:(x:number,z:number)=>number};
export type CameraClearanceResult=CameraPoint&{focusY:number;raisedMetres:number;horizontalFraction:number;heightQueries:number;samples:number};
/** Pure calculation, bounded independently of map size. Outside the rendered
 * map there is no terrain wall; do not extrapolate edge heights into space. */
export function resolveCameraClearance(ground:CameraGround,focus:CameraPoint,desired:CameraPoint):CameraClearanceResult {
 let queries=0,samples=0;const half=ground.size/2;
 const surface=(x:number,z:number)=>{if(Math.abs(x)>half||Math.abs(z)>half)return -Infinity;queries++;return ground.height(x,z);};
 const focusSurface=surface(focus.x,focus.z),focusY=Number.isFinite(focusSurface)?focusSurface+CAMERA_CLEARANCE_RULES.focusHeightMetres:focus.y;
 const desiredY=desired.y+focusY-focus.y;
 for(const fraction of CAMERA_CLEARANCE_RULES.horizontalFallbacks){
  const x=focus.x+(desired.x-focus.x)*fraction,z=focus.z+(desired.z-focus.z)*fraction;
  const steps=Math.max(1,Math.min(CAMERA_CLEARANCE_RULES.maximumLineSamples,Math.ceil(Math.hypot(x-focus.x,z-focus.z)/CAMERA_CLEARANCE_RULES.sampleSpacingMetres)));
  let raise=0,previousHeight=-Infinity;
  for(let i=0;i<steps;i++){
   const t=i/steps,sx=x+(focus.x-x)*t,sz=z+(focus.z-z)*t,sy=desiredY+(focusY-desiredY)*t,h=surface(sx,sz);samples++;
   const obstruction=Math.max(h,previousHeight);previousHeight=h;
   if(!Number.isFinite(obstruction))continue;
   const margin=i===0?CAMERA_CLEARANCE_RULES.minimumEyeClearanceMetres:CAMERA_CLEARANCE_RULES.lineClearanceMetres;
   raise=Math.max(raise,(obstruction+margin-sy)/(1-t));
  }
  if(raise<=CAMERA_CLEARANCE_RULES.maximumRaiseMetres||fraction===0)return{x,y:desiredY+raise,z,focusY,raisedMetres:raise,horizontalFraction:fraction,heightQueries:queries,samples};
 }
 throw new Error('Camera clearance has no overhead fallback');
}
/** One stable point per active scene. No string keys, sample arrays, or terrain
 * queries during an unchanged paused view; navigation revisions invalidate it. */
export class TerrainCameraClearance {
 private solves=0;private cacheHits=0;private heightQueries=0;
 private ground:CameraGround|null=null;private revision=-1;private fx=NaN;private fz=NaN;private dx=NaN;private dz=NaN;private orbitY=NaN;private result:CameraClearanceResult|null=null;
 resolve(ground:CameraGround,focus:CameraPoint,desired:CameraPoint,revision=0){
  const orbitY=desired.y-focus.y;
  if(this.result&&this.ground===ground&&this.revision===revision&&this.fx===focus.x&&this.fz===focus.z&&this.dx===desired.x&&this.dz===desired.z&&Math.abs(this.orbitY-orbitY)<1e-10){this.cacheHits++;return this.result;}
  this.ground=ground;this.revision=revision;this.fx=focus.x;this.fz=focus.z;this.dx=desired.x;this.dz=desired.z;this.orbitY=orbitY;
  this.result=resolveCameraClearance(ground,focus,desired);this.solves++;this.heightQueries+=this.result.heightQueries;return this.result;
 }
 diagnostics(){return{solves:this.solves,cacheHits:this.cacheHits,heightQueries:this.heightQueries};}
 invalidate(){this.ground=null;this.result=null;}
}
