/** First-person mode, pure rules (docs/FIRST_PERSON_DESIGN.md, Phases 0 to 2). No three.js, no Game import, no saved state.
 * A bodiless witness walks the same height field the people walk. It owns nothing and changes nothing; acting goes through the
 * existing select/order paths at the crosshair. Axis convention matches the strategic camera and the controls skill:
 * yaw 0 faces world -Z, +yaw turns LEFT; forward=(-sin,-cos), right=(cos,-sin). So A strafes left, D right, mouse right lowers yaw. */
import {easeDrawDistance,DRAW_DISTANCE_LEVELS,type DrawDistance} from './drawDistance';

export const FIRST_PERSON_RULES={
 eyeHeight:1.7,radius:.45,walkSpeed:3.4,runSpeed:6.2,
 /** steepest ground (rise over run, about 40 degrees) a walker may step onto; steeper is a wall */
 maxGrade:.84,
 /** ground must stand this far above the water surface (the sim's walk clearance) */
 shoreClearance:.12,
 pitchLimit:1.45,mouseSensitivity:.0022,turnRate:1.6,
 /** small body-height spring so the eye follows the ground without stutter on 4 m terrain cells */
 eyeSmoothing:14,
 bobAmplitude:.035,bobStride:2.2,
 /** distance at which a person, building or resource is named at the crosshair */
 interactRange:40,
 /** frame-rate thresholds (fps) for the walking draw-distance guard */
 easeBelowFps:36,easeTwiceBelowFps:22,
} as const;

export type FirstPersonInput={forward:number;strafe:number;turn:number;run:boolean};
export type SolidRect={x:number;z:number;w:number;d:number};
/** Everything the movement step reads from the world. height/water are metres; solids are axis-aligned footprints (the sim's own solidBuilding test uses 0.4 of w/d). */
export type FirstPersonWorld={
 height:(x:number,z:number)=>number;
 water:(x:number,z:number)=>number;
 solids:readonly SolidRect[];
 /** half extent of the playable square, metres */
 half:number;
};
export type FirstPersonBody={x:number;z:number;y:number;yaw:number;pitch:number;bob:number;travelled:number};
export type SavedView={lookX:number;lookY:number;lookZ:number;yaw:number;pitch:number;dist:number;drawLevel:DrawDistance|null};
export type FirstPersonMode={active:boolean;body:FirstPersonBody;saved:SavedView|null;bobEnabled:boolean};

export function clamp(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
export function wrapAngle(a:number){const t=Math.PI*2;return a-Math.floor((a+Math.PI)/t)*t;}
export function forwardOf(yaw:number){return{x:-Math.sin(yaw),z:-Math.cos(yaw)};}
export function rightOf(yaw:number){return{x:Math.cos(yaw),z:-Math.sin(yaw)};}

/** Mouse look: right (positive dx) turns right (lower yaw), up (negative dy) looks up. Pitch is clamped short of the poles. */
export function lookDelta(body:{yaw:number;pitch:number},dx:number,dy:number,sensitivity:number=FIRST_PERSON_RULES.mouseSensitivity){
 return{yaw:wrapAngle(body.yaw-dx*sensitivity),pitch:clamp(body.pitch-dy*sensitivity,-FIRST_PERSON_RULES.pitchLimit,FIRST_PERSON_RULES.pitchLimit)};
}

/** True when a circle at (x,z) overlaps a footprint. Footprints are shrunk to the sim's 0.4 factor, so the witness cannot stand where a resident could not. */
export function insideSolid(x:number,z:number,solids:readonly SolidRect[],radius:number=FIRST_PERSON_RULES.radius){
 for(const s of solids)if(Math.abs(x-s.x)<s.w*.4+radius&&Math.abs(z-s.z)<s.d*.4+radius)return true;
 return false;
}

/** Whether the witness may stand at (x,z), arriving from (fx,fz): inside the world, dry enough, not in a building, and not stepping up a wall. */
export function canStand(world:FirstPersonWorld,fx:number,fz:number,x:number,z:number){
 const r=FIRST_PERSON_RULES;
 if(Math.abs(x)>world.half-2||Math.abs(z)>world.half-2)return false;
 const h=world.height(x,z);
 if(!Number.isFinite(h)||h<world.water(x,z)+r.shoreClearance)return false;
 if(insideSolid(x,z,world.solids))return false;
 const run=Math.hypot(x-fx,z-fz);
 if(run>1e-6){const grade=(h-world.height(fx,fz))/run;if(grade>r.maxGrade)return false;}
 return true;
}

/** Slide-collision: try the full step, then each axis alone, else stay. Never teleports; the step is short enough (a frame) that tunnelling needs a footprint thinner than a step. */
export function slideStep(world:FirstPersonWorld,x:number,z:number,dx:number,dz:number){
 if(canStand(world,x,z,x+dx,z+dz))return{x:x+dx,z:z+dz,blocked:false};
 if(dx!==0&&canStand(world,x,z,x+dx,z))return{x:x+dx,z,blocked:true};
 if(dz!==0&&canStand(world,x,z,x,z+dz))return{x,z:z+dz,blocked:true};
 return{x,z,blocked:true};
}

/** Advance the body one frame. Input axes are -1..1 (forward +1 = W, strafe +1 = D, turn +1 = turn right = E). dt is clamped so a hitch cannot carry the body through a wall. */
export function stepBody(body:FirstPersonBody,input:FirstPersonInput,dt:number,world:FirstPersonWorld,bobEnabled=false):FirstPersonBody{
 const r=FIRST_PERSON_RULES,t=clamp(dt,0,.1);
 const yaw=wrapAngle(body.yaw-input.turn*r.turnRate*t);
 let ix=input.forward,iz=input.strafe;const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len;}
 const speed=(input.run?r.runSpeed:r.walkSpeed)*(len>0?1:0);
 const f=forwardOf(yaw),rt=rightOf(yaw);
 let dx=(f.x*ix+rt.x*iz)*speed*t,dz=(f.z*ix+rt.z*iz)*speed*t;
 // A long step is cut into pieces no longer than a body radius.
 const pieces=Math.max(1,Math.ceil(Math.hypot(dx,dz)/(r.radius*.9)));
 let x=body.x,z=body.z,moved=0;
 for(let i=0;i<pieces;i++){
  const s=slideStep(world,x,z,dx/pieces,dz/pieces);moved+=Math.hypot(s.x-x,s.z-z);x=s.x;z=s.z;
 }
 const ground=world.height(x,z),target=Math.max(ground,world.water(x,z)),k=1-Math.exp(-r.eyeSmoothing*t);
 const y=body.y+(target-body.y)*k;
 const travelled=body.travelled+moved;
 return{x,z,y,yaw,pitch:body.pitch,bob:bobEnabled?Math.sin(travelled*r.bobStride*Math.PI):0,travelled};
}

/** Camera eye position and look for a body. bob is a vertical offset in metres only (off by default). */
export function eyePose(body:FirstPersonBody,bobEnabled=false){
 const bob=bobEnabled?body.bob*FIRST_PERSON_RULES.bobAmplitude:0;
 return{x:body.x,y:body.y+FIRST_PERSON_RULES.eyeHeight+bob,z:body.z,yaw:body.yaw,pitch:body.pitch};
}

/** Nearest open standing point to (x,z): spiral outward until canStand holds, so entering never starts inside a wall or the sea. */
export function nearestStandable(world:FirstPersonWorld,x:number,z:number,maxRadius=30){
 const ok=(px:number,pz:number)=>Math.abs(px)<=world.half-2&&Math.abs(pz)<=world.half-2&&world.height(px,pz)>=world.water(px,pz)+FIRST_PERSON_RULES.shoreClearance&&!insideSolid(px,pz,world.solids);
 if(ok(x,z))return{x,z};
 for(let ring=1;ring*1.5<=maxRadius;ring++){
  const rad=ring*1.5,n=Math.max(8,ring*8);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;if(ok(px,pz))return{x:px,z:pz};}
 }
 return null;
}

export function newMode():FirstPersonMode{return{active:false,body:{x:0,z:0,y:0,yaw:0,pitch:0,bob:0,travelled:0},saved:null,bobEnabled:false};}

/** Enter: remember the strategic view exactly, then stand at a clear spot near (x,z) facing `yaw`. Returns null (mode unchanged) if no standable ground is near. */
export function enter(mode:FirstPersonMode,world:FirstPersonWorld,at:{x:number;z:number;yaw:number},view:SavedView):FirstPersonMode|null{
 if(mode.active)return null;
 const spot=nearestStandable(world,at.x,at.z);if(!spot)return null;
 const y=Math.max(world.height(spot.x,spot.z),world.water(spot.x,spot.z));
 return{active:true,bobEnabled:mode.bobEnabled,saved:{...view},body:{x:spot.x,z:spot.z,y,yaw:wrapAngle(at.yaw),pitch:0,bob:0,travelled:0}};
}
/** Exit: hand back the saved strategic view; the mode becomes inactive and forgets it. */
export function exit(mode:FirstPersonMode):{mode:FirstPersonMode;restore:SavedView|null}{
 if(!mode.active)return{mode,restore:null};
 return{mode:{...newMode(),bobEnabled:mode.bobEnabled},restore:mode.saved};
}

/** Walking draw-distance guard: eye-level frames draw a dense near field, so a slow frame rate eases the level one step (two when very slow). Never raises above the chosen level; the strategic level is restored on exit. */
export function walkingDrawLevel(chosen:DrawDistance,fps:number):DrawDistance{
 if(!Number.isFinite(fps)||fps<=0)return chosen;
 let level=chosen;
 if(fps<FIRST_PERSON_RULES.easeBelowFps)level=easeDrawDistance(level);
 if(fps<FIRST_PERSON_RULES.easeTwiceBelowFps)level=easeDrawDistance(level);
 return DRAW_DISTANCE_LEVELS.indexOf(level)<=DRAW_DISTANCE_LEVELS.indexOf(chosen)?level:chosen;
}

/** Preference only (the single thing persisted, in localStorage, never in a save). */
export const FIRST_PERSON_PREF_KEY='hearthwild:first-person-prefs';
export function parseFirstPersonPrefs(raw:string|null|undefined):{bob:boolean}{
 try{const v=raw?JSON.parse(raw):null;return{bob:v?.bob===true};}catch{return{bob:false};}
}
