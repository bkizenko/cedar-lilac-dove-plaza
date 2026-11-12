import type {CameraGround,CameraPoint} from './cameraClearance';
export const FIXED_ORBIT_RULES=Object.freeze({minimumDistance:14,maximumDistance:230,focusHeight:.55,targetOffset:1.2,minimumEyeClearance:2,eyeHalfWidth:.5,sweepSpacing:.5,maximumSweepSteps:512,maximumHeightQueries:8192,initialDistanceSpacing:1,refinementSteps:10});
export type OrbitRequest={x:number;z:number;distance:number;yaw:number;pitch:number};
export type OrbitPose=OrbitRequest&{focusY:number;eye:CameraPoint};
export type OrbitCollisionResult={pose:OrbitPose|null;blocked:boolean;heightQueries:number};
/** Collision rejects movement. It never lifts an eye, tilts a view, or promises
 * a clear sightline through mountains. Only explicit requested orbit changes
 * may change yaw/pitch. The current accepted rigid pose is the sweep origin. */
export class FixedOrbitCameraCollision {
 private last:OrbitPose|null=null;
 private ground:CameraGround|null=null;private revision=-1;
 private request:OrbitRequest|null=null;private result:OrbitCollisionResult|null=null;
 private hits=0;private solves=0;private queries=0;
 invalidate(){this.ground=null;this.request=null;this.result=null;this.last=null;}
 diagnostics(){return{solves:this.solves,cacheHits:this.hits,heightQueries:this.queries};}
 resolve(ground:CameraGround,requested:OrbitRequest,revision=0):OrbitCollisionResult {
 const R=FIXED_ORBIT_RULES;
 if(this.ground===ground&&this.revision===revision&&this.request&&this.result&&this.request.x===requested.x&&this.request.z===requested.z&&this.request.distance===requested.distance&&this.request.yaw===requested.yaw&&this.request.pitch===requested.pitch){this.hits++;return this.result;}
 let queries=0;const half=ground.size/2;
 const height=(x:number,z:number):number|null=>{if(Math.abs(x)>half||Math.abs(z)>half)return -Infinity;if(queries>=R.maximumHeightQueries)return null;queries++;const y=ground.height(x,z);return Number.isFinite(y)?y:null;};
 const pose=(q:OrbitRequest):OrbitPose|null=>{const h=height(q.x,q.z);if(h===null||!Number.isFinite(h))return null;const focusY=h+R.focusHeight,c=Math.cos(q.pitch);return{...q,focusY,eye:{x:q.x+Math.sin(q.yaw)*c*q.distance,y:focusY+R.targetOffset+Math.sin(q.pitch)*q.distance,z:q.z+Math.cos(q.yaw)*c*q.distance}};};
 const eyeSafe=(eye:CameraPoint)=>{for(let iz=-1;iz<=1;iz++)for(let ix=-1;ix<=1;ix++){const h=height(eye.x+ix*R.eyeHalfWidth,eye.z+iz*R.eyeHalfWidth);if(h===null||eye.y<h+R.minimumEyeClearance)return false;}return true;};
 const segmentSafe=(a:CameraPoint,b:CameraPoint)=>{const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/R.sweepSpacing));if(steps>R.maximumSweepSteps)return false;for(let i=1;i<=steps;i++){const t=i/steps;if(!eyeSafe({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}))return false;}return true;};
 const mix=(a:OrbitRequest,b:OrbitRequest,t:number):OrbitRequest=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,distance:a.distance+(b.distance-a.distance)*t,yaw:a.yaw+(b.yaw-a.yaw)*t,pitch:a.pitch+(b.pitch-a.pitch)*t});
 const finish=(accepted:OrbitPose|null,blocked:boolean)=>{this.solves++;this.queries+=queries;this.ground=ground;this.revision=revision;this.request={...requested};this.last=accepted;this.result={pose:accepted,blocked,heightQueries:queries};return this.result;};
 // Revalidate after terrain edits or a newly restored camera. Search only the
 // same-angle distance axis; there is no overhead or vertical-raise fallback.
 let origin=this.last;
 if(this.ground!==ground||this.revision!==revision){if(origin&&!eyeSafe(origin.eye))origin=null;}
 if(!origin){
  const desired=pose(requested);if(desired&&eyeSafe(desired.eye))return finish(desired,false);
  for(let offset=R.initialDistanceSpacing;offset<=R.maximumDistance-R.minimumDistance;offset+=R.initialDistanceSpacing){for(const distance of[requested.distance-offset,requested.distance+offset]){if(distance<R.minimumDistance||distance>R.maximumDistance)continue;const candidate=pose({...requested,distance});if(candidate&&eyeSafe(candidate.eye))return finish(candidate,true);}}
  // No valid same-angle pose exists in the permitted interval. Returning no
  // pose is explicit rejection, never a fabricated clipped/overhead solution.
  return finish(null,true);
 }
 const requestedPose=pose(requested);if(!requestedPose)return finish(origin,true);
 const length=Math.hypot(requested.x-origin.x,requested.z-origin.z)+Math.abs(requested.distance-origin.distance)+Math.max(requested.distance,origin.distance)*(Math.abs(requested.yaw-origin.yaw)+Math.abs(requested.pitch-origin.pitch))+Math.abs(requestedPose.focusY-origin.focusY);
 const steps=Math.max(1,Math.ceil(length/R.sweepSpacing));let accepted=origin,acceptedT=0;
 for(let i=1;i<=Math.min(steps,R.maximumSweepSteps);i++){
  const t=i/steps,next=pose(mix(origin,requested,t));
  if(!next||!segmentSafe(accepted.eye,next.eye)){
   let lo=acceptedT,hi=t;for(let k=0;k<R.refinementSteps;k++){const mid=(lo+hi)/2,candidate=pose(mix(origin,requested,mid));if(candidate&&segmentSafe(accepted.eye,candidate.eye)){lo=mid;accepted=candidate;}else hi=mid;}
   return finish(accepted,true);
  }
  accepted=next;acceptedT=t;
 }
 return finish(accepted,steps>R.maximumSweepSteps);
 }
}
