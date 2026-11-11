/** Keep terrain in view while preserving the player's requested orbit. */
export const CAMERA_CLEARANCE_RULES={sampleSpacingMetres:3,maximumLineSamples:96,nearFocusDistanceMetres:8,nearFocusSpacingMetres:.25,horizontalSearchSteps:10,maximumHorizontalSolves:12,minimumEyeClearanceMetres:2,lineClearanceMetres:.25,focusHeightMetres:.55,maximumRaiseMetres:192,settleRatePerSecond:6,maximumDescentMetresPerSecond:48,maximumOrbitReturnMetresPerSecond:32} as const;
export type CameraPoint={x:number;y:number;z:number};
export type CameraGround={size:number;height:(x:number,z:number)=>number};
export type CameraClearanceResult=CameraPoint&{focusY:number;raisedMetres:number;horizontalFraction:number;heightQueries:number;samples:number};
/** A bounded continuous fallback avoids switching abruptly between half orbit
 * and overhead. Close foreground terrain gets extra samples: sparse distant
 * samples must not miss the ridge immediately beside the focus. */
export function resolveCameraClearance(ground:CameraGround,focus:CameraPoint,desired:CameraPoint):CameraClearanceResult {
 let queries=0,samples=0;const half=ground.size/2,R=CAMERA_CLEARANCE_RULES;
 const surface=(x:number,z:number)=>{if(Math.abs(x)>half||Math.abs(z)>half)return -Infinity;queries++;return ground.height(x,z);};
 const focusSurface=surface(focus.x,focus.z),focusY=Number.isFinite(focusSurface)?focusSurface+R.focusHeightMetres:focus.y;
 const desiredY=desired.y+focusY-focus.y;
 function solve(fraction:number){
  const x=focus.x+(desired.x-focus.x)*fraction,z=focus.z+(desired.z-focus.z)*fraction,distance=Math.hypot(x-focus.x,z-focus.z);
  let raise=0,previousHeight=-Infinity,previousMetres=distance,previousSlope=0;
  const near=Math.min(R.nearFocusDistanceMetres,distance),nearSteps=Math.max(1,Math.ceil(near/R.nearFocusSpacingMetres)),farSteps=Math.max(0,Math.min(R.maximumLineSamples-nearSteps,Math.ceil((distance-near)/R.sampleSpacingMetres))),steps=nearSteps+farSteps;
  for(let i=steps;i>0;i--){
   const metres=i<=nearSteps?near*i/nearSteps:near+(distance-near)*(i-nearSteps)/Math.max(1,farSteps),t=distance?metres/distance:1;
   const h=surface(focus.x+(x-focus.x)*t,focus.z+(z-focus.z)*t);samples++;
   const interval=Math.max(0,previousMetres-metres),slope=Number.isFinite(h)&&Number.isFinite(previousHeight)&&interval>0?Math.abs(h-previousHeight)/interval:0;
   // Bound an unsampled crest using both neighboring slopes, then extend
   // that interval's height toward the focus conservatively.
   const obstruction=Math.max(h,previousHeight)+Math.max(slope,previousSlope)*interval*.5;
   previousHeight=h;previousMetres=metres;previousSlope=slope;if(!Number.isFinite(obstruction))continue;
   const sy=focusY+(desiredY-focusY)*t,margin=i===steps?R.minimumEyeClearanceMetres:R.lineClearanceMetres;
   raise=Math.max(raise,(obstruction+margin-sy)/t);
  }
  return{x,y:desiredY+raise,z,focusY,raisedMetres:raise,horizontalFraction:fraction,heightQueries:0,samples:0};
 }
 let result=solve(1);
 if(result.raisedMetres>R.maximumRaiseMetres){
  let low=0,high=1;result=solve(0);
  for(let i=0;i<R.horizontalSearchSteps;i++){
   const middle=(low+high)/2,candidate=solve(middle);
   if(candidate.raisedMetres<=R.maximumRaiseMetres){low=middle;result=candidate;}else high=middle;
  }
 }
 return{...result,heightQueries:queries,samples};
}
/** Cache the terrain solution. Safety corrections happen immediately; excess
 * height and a shortened orbit ease back instead of snapping after a crest.
 * An unchanged, settled paused view makes no terrain queries. */
export class TerrainCameraClearance {
 private solves=0;private safetySolves=0;private cacheHits=0;private heightQueries=0;
 private ground:CameraGround|null=null;private revision=-1;private fx=NaN;private fz=NaN;private dx=NaN;private dz=NaN;private orbitY=NaN;private target:CameraClearanceResult|null=null;private result:CameraClearanceResult|null=null;
 resolve(ground:CameraGround,focus:CameraPoint,desired:CameraPoint,revision=0,dt=1/60){
  const orbitY=desired.y-focus.y;
  const unchanged=this.target&&this.ground===ground&&this.revision===revision&&this.fx===focus.x&&this.fz===focus.z&&this.dx===desired.x&&this.dz===desired.z&&Math.abs(this.orbitY-orbitY)<1e-10;
  if(unchanged)this.cacheHits++;
  else{
   this.ground=ground;this.revision=revision;this.fx=focus.x;this.fz=focus.z;this.dx=desired.x;this.dz=desired.z;this.orbitY=orbitY;
   this.target=resolveCameraClearance(ground,focus,desired);this.solves++;this.heightQueries+=this.target.heightQueries;
  }
  const target=this.target!;
  if(!this.result){this.result=target;return target;}
  const seconds=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)),decay=Math.exp(-CAMERA_CLEARANCE_RULES.settleRatePerSecond*seconds);
  const baseY=target.y-target.raisedMetres,carriedRaise=Math.max(0,this.result.y-baseY),radius=Math.max(.01,Math.hypot(desired.x-focus.x,desired.z-focus.z));
  let raise=Math.max(target.raisedMetres,carriedRaise-Math.min(carriedRaise*(1-decay),CAMERA_CLEARANCE_RULES.maximumDescentMetresPerSecond*seconds));
  let fraction=Math.min(target.horizontalFraction,this.result.horizontalFraction+Math.min((1-this.result.horizontalFraction)*(1-decay),CAMERA_CLEARANCE_RULES.maximumOrbitReturnMetresPerSecond*seconds/radius));
  if(raise-target.raisedMetres<.02)raise=target.raisedMetres;
  if(target.horizontalFraction-fraction<.0001)fraction=target.horizontalFraction;
  if(raise===target.raisedMetres&&fraction===target.horizontalFraction){this.result=target;return target;}
  // Every intermediate pose is checked, rather than interpolating the camera
  // through a mountain while its orbit relaxes.
  const safe=resolveCameraClearance(ground,focus,{x:focus.x+(desired.x-focus.x)*fraction,y:desired.y+raise,z:focus.z+(desired.z-focus.z)*fraction});
  this.safetySolves++;this.heightQueries+=safe.heightQueries;
  this.result={...safe,raisedMetres:raise+safe.raisedMetres,horizontalFraction:fraction*safe.horizontalFraction};return this.result;
 }
 diagnostics(){return{solves:this.solves,safetySolves:this.safetySolves,cacheHits:this.cacheHits,heightQueries:this.heightQueries};}
 invalidate(){this.ground=null;this.target=null;this.result=null;}
}
