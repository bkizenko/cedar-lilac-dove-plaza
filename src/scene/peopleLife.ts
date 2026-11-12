/** People v2 procedural life layer: cheap, deterministic, allocation-free additions on top of the authored clips.
 * Near tier only (the layer calls it when tier===0). Breathing for every clip; weight shift, head look-around and
 * idle gesture variants (hands clasped, arms folded, hand on hip) only while the real clip is `idle`; anticipation/ease
 * on the strike clips. Every output is finite for any (time,id) and bounded by small angles so it can never break a pose. */
import type {ClipId,Pose} from './animationClips';

const TAU=Math.PI*2;
const _p:Pose={parts:{hips:[0,0,0],spine:[0,0,0],head:[0,0,0],armL:[0,0,0],armR:[0,0,0],legL:[0,0,0],legR:[0,0,0]},root:[0,0,0],rootRot:[0,0,0],itemR:[0,0,0],itemL:[0,0,0]};
const copy=(a:readonly number[],b:number[])=>{b[0]=a[0];b[1]=a[1];b[2]=a[2];};
/** stable 0..1 hash of (id, salt); no Math.random so renders and tests repeat */
export const lifeRand=(id:number,salt:number)=>{let h=(id*2654435761^salt*40503)>>>0;h=Math.imul(h^h>>>15,2246822519)>>>0;h=Math.imul(h^h>>>13,3266489917)>>>0;return((h^h>>>16)>>>0)/4294967296;};
export const IDLE_GESTURES=['none','clasp','fold','hip'] as const;
export type IdleGesture=typeof IDLE_GESTURES[number];
/** the gesture a person falls into while idle (changes every ~20-40 s, per person) */
export function gestureFor(id:number,time:number):IdleGesture{
 const slot=Math.floor(time/(18+lifeRand(id,3)*20)+lifeRand(id,4)*7),r=lifeRand(id,slot+11);
 return r<.4?'none':r<.62?'clasp':r<.82?'fold':'hip';
}
/** Returns the same scratch Pose every call (copy of `pose` plus the life layer). `strike` is 0..1 of a strike cycle when the clip has one. */
export function lifePose(pose:Pose,clip:ClipId,time:number,id:number,age=.4,breathAmp=1):Pose{
 const o=_p;
 for(const k of ['hips','spine','head','armL','armR','legL','legR'] as const)copy(pose.parts[k],o.parts[k]);
 copy(pose.root,o.root);copy(pose.rootRot,o.rootRot);copy(pose.itemR,o.itemR);copy(pose.itemL,o.itemL);
 const ph=lifeRand(id,1)*TAU,rate=.22+lifeRand(id,2)*.08+(age>.7?-.03:0);
 const breath=Math.sin(time*TAU*rate+ph);                       // ~4 s chest cycle
 const amp=.018*breathAmp*(clip==='idle'?1:.55);
 o.parts.spine[0]+=breath*amp;o.parts.head[0]-=breath*amp*.6;o.parts.armL[2]+=breath*amp*.5;o.parts.armR[2]-=breath*amp*.5;o.root[1]+=breath*.0035;
 if(clip==='idle'){
  // weight shift: slow hip sway with the shoulders countering, one knee easing
  const sway=Math.sin(time*TAU*.07+ph*1.3),k=Math.max(0,Math.min(1,.5+sway*.5));
  o.parts.hips[2]+=sway*.045;o.parts.spine[2]-=sway*.03;o.parts.legL[2]+=sway*.02;o.parts.legR[2]+=sway*.02;o.root[0]+=sway*.012;o.parts.legL[0]+=k*.05;o.parts.legR[0]+=(1-k)*.05;
  // look around: eased, with a held glance
  const look=Math.sin(time*TAU*.045+ph*.7)*Math.max(0,Math.sin(time*TAU*.021+ph*2.1)+.35);
  o.parts.head[1]+=look*.5;o.parts.head[0]+=Math.sin(time*TAU*.031+ph)*.05;
  const g=gestureFor(id,time),ease=Math.min(1,Math.max(0,(((time/(18+lifeRand(id,3)*20)+lifeRand(id,4)*7)%1)*8)));
  const e=ease*ease*(3-2*ease),fade=Math.min(1,(1-((time/(18+lifeRand(id,3)*20)+lifeRand(id,4)*7)%1))*8),w=Math.min(e,fade<0?0:fade);
  if(g==='clasp'){o.parts.armL[0]-=.55*w;o.parts.armR[0]-=.55*w;o.parts.armL[2]+=.34*w;o.parts.armR[2]-=.34*w;}
  else if(g==='fold'){o.parts.armL[0]-=.95*w;o.parts.armR[0]-=.95*w;o.parts.armL[2]+=.62*w;o.parts.armR[2]-=.62*w;}
  else if(g==='hip'){o.parts.armR[2]-=.5*w;o.parts.armR[0]+=.1*w;}
 }
 return o;
}
/** strike easing: windup then snap. `x` is the clip's 0..1 cycle; returns a 0..1 weight to scale a tool swing (anticipation pulls back, follow-through settles). */
export function strikeEase(x:number){const c=((x%1)+1)%1;return c<.3?-.18*Math.sin(c/.3*Math.PI):c<.5?Math.pow((c-.3)/.2,2):1-(c-.5)/.5*.9;}
