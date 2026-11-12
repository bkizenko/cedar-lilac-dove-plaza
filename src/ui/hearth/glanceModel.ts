/**
 * Pure models behind the Hearth glanceable-state layer (docs/UIUX_PROPOSAL.md changes 7, 8, 10):
 * supply meters (days of supply and trend), the alert priority ranking, and the screen projection used by world pins and edge arrows.
 * No React, no Game: everything takes plain numbers so it is testable without the sim. Game reads live in glanceReads.ts.
 */

/* ---------- supply meters ---------- */
export type Trend='up'|'down'|'flat';
export type SupplyLevel='ok'|'low'|'critical'|'unknown';
export const SUPPLY_RULES=Object.freeze({
 /** Days of supply at or under which the meter turns red / amber. */
 criticalDays:3,lowDays:6,
 /** A full meter is this many days of supply. */
 fullDays:10,
 /** Samples older than this many simulated days are dropped. */
 historyDays:2,
 /** A trend needs at least this share of a day of samples before it is shown. */
 minimumSpanDays:.25,
 /** Changes under this share of the stock per day (and under the absolute floor) read as flat. */
 flatShare:.03,flatFloor:1,
});
export function supplyLevel(days:number|null|undefined):SupplyLevel{
 if(days===null||days===undefined||!Number.isFinite(days))return 'unknown';
 return days<SUPPLY_RULES.criticalDays?'critical':days<SUPPLY_RULES.lowDays?'low':'ok';
}
/** 0..1 fill of the meter under a resource. Unknown supply has no meter. */
export function supplyFill(days:number|null|undefined):number|null{
 if(days===null||days===undefined||!Number.isFinite(days))return null;
 return Math.max(0,Math.min(1,days/SUPPLY_RULES.fullDays));
}
/** Whole days, one decimal under ten days so "2.4" and "9.9" stay different, "10+" beyond the meter. */
export function daysText(days:number){
 if(!Number.isFinite(days))return '';
 if(days>=SUPPLY_RULES.fullDays)return `${Math.floor(days)}`;
 return days<1?'<1':days.toFixed(1);
}
export type Sample={t:number;v:number};
/** Rolling stock history in simulated seconds. Reset when time goes backwards (restart, load). */
export class TrendTracker{
 samples:Sample[]=[];
 daySeconds:number;
 constructor(daySeconds:number){this.daySeconds=daySeconds;}
 push(t:number,v:number){
  const last=this.samples[this.samples.length-1];
  if(last&&t<last.t){this.samples.length=0;}
  const tail=this.samples[this.samples.length-1];
  if(tail&&t-tail.t<this.daySeconds/40){tail.v=v;return;}
  this.samples.push({t,v});
  const cutoff=t-this.daySeconds*SUPPLY_RULES.historyDays;
  while(this.samples.length>2&&this.samples[0].t<cutoff)this.samples.shift();
 }
 /** Change per simulated day measured over about the last day, or null while there is too little history. */
 perDay():number|null{
  const n=this.samples.length;if(n<2)return null;
  const now=this.samples[n-1];let from=this.samples[0];
  for(const s of this.samples){if(now.t-s.t<=this.daySeconds){from=s;break;}}
  const span=now.t-from.t;if(span<this.daySeconds*SUPPLY_RULES.minimumSpanDays)return null;
  return (now.v-from.v)*this.daySeconds/span;
 }
 trend():Trend|null{
  const d=this.perDay();if(d===null)return null;
  const now=this.samples[this.samples.length-1].v,floor=Math.max(SUPPLY_RULES.flatFloor,SUPPLY_RULES.flatShare*Math.abs(now));
  return Math.abs(d)<floor?'flat':d>0?'up':'down';
 }
}

/* ---------- alert ranking ---------- */
export type AlertKind='raiders'|'thirsty'|'starving'|'freezing'|'full'|'exposed'|'harvest'|'backlog';
export type AlertSeverity='critical'|'warning';
export type AlertPoint={x:number;y:number;z:number};
export type Alert={kind:AlertKind;severity:AlertSeverity;count:number;/** Sentence for tooltip and screen reader only. */tip:string;at?:AlertPoint};
/** Higher ranks first. Only the first critical alert becomes the sticky card; the rest fall to chips. */
export const ALERT_RANK:Record<AlertKind,number>={raiders:100,thirsty:90,starving:80,freezing:70,full:40,exposed:30,harvest:20,backlog:10};
export const CRITICAL_KINDS:readonly AlertKind[]=['raiders','thirsty','starving','freezing'];
export function rankAlerts(alerts:readonly Alert[]){
 const sorted=alerts.slice().sort((a,b)=>ALERT_RANK[b.kind]-ALERT_RANK[a.kind]);
 const critical=sorted.find(a=>a.severity==='critical')??null;
 return {critical,chips:sorted.filter(a=>a!==critical)};
}
/** Keyboard-tip banners are teaching text, not events: they live in the Help screen, never in the notification stack (they moved to the Help screen). */
export const isKeyTip=(s:string)=>/^(C selects|Press [A-Z\]\[,]|Tip:)/.test(s)||/ · \] finds? /.test(s);
export const MAX_PINS=5;
/** At most five pins, critical first, then by rank. Only alerts that know where they are get one. */
export function pinSet(alerts:readonly Alert[],max=MAX_PINS){
 return alerts.filter(a=>a.at).sort((a,b)=>ALERT_RANK[b.kind]-ALERT_RANK[a.kind]).slice(0,max);
}
/** Timed info cards: shown for `ttl` seconds after they first appear, unless dismissed. Sticky cards stay until their condition clears. */
export const INFO_RULES=Object.freeze({ttlSeconds:8,fadeSeconds:1});
export function infoVisible(firstSeenSeconds:number,nowSeconds:number,sticky:boolean){
 if(sticky)return {show:true,fading:false};
 const age=nowSeconds-firstSeenSeconds;
 return {show:age<INFO_RULES.ttlSeconds,fading:age>=INFO_RULES.ttlSeconds-INFO_RULES.fadeSeconds};
}

/* ---------- screen projection ---------- */
export type CameraMatrices={matrixWorldInverse:{elements:ArrayLike<number>};projectionMatrix:{elements:ArrayLike<number>}};
export type ScreenPoint={x:number;y:number;/** True when the point is in front of the camera and inside the viewport. */onScreen:boolean;behind:boolean;/** NDC, flipped through the camera when the point is behind it, for edge arrows. */dx:number;dy:number};
/** Column-major 4x4 projection of a world point; matches three.js Vector3.project for a perspective or orthographic camera. */
export function projectToScreen(camera:CameraMatrices,p:{x:number;y:number;z:number},width:number,height:number):ScreenPoint{
 const v=camera.matrixWorldInverse.elements,m=camera.projectionMatrix.elements;
 const vx=v[0]*p.x+v[4]*p.y+v[8]*p.z+v[12],vy=v[1]*p.x+v[5]*p.y+v[9]*p.z+v[13],vz=v[2]*p.x+v[6]*p.y+v[10]*p.z+v[14],vw=v[3]*p.x+v[7]*p.y+v[11]*p.z+v[15];
 const cx=m[0]*vx+m[4]*vy+m[8]*vz+m[12]*vw,cy=m[1]*vx+m[5]*vy+m[9]*vz+m[13]*vw,cw=m[3]*vx+m[7]*vy+m[11]*vz+m[15]*vw;
 const behind=!(cw>0),inv=cw!==0?1/cw:0,nx=cx*inv,ny=cy*inv;
 const sx=(nx*.5+.5)*width,sy=(1-(ny*.5+.5))*height;
 const onScreen=!behind&&nx>=-1&&nx<=1&&ny>=-1&&ny<=1;
 return {x:sx,y:sy,onScreen,behind,dx:behind?-nx:nx,dy:behind?-ny:ny};
}
export type Inset={left:number;top:number;right:number;bottom:number};
/** Where an off-screen target's arrow sits: on the inset viewport edge along the line from the centre, and the angle it points (radians, 0 = right, y down). */
export function edgeArrow(pt:Pick<ScreenPoint,'dx'|'dy'|'behind'>,width:number,height:number,inset:Inset){
 const cx=width/2,cy=height/2;
 // NDC y is up, screen y is down.
 let dx=pt.dx*width/2,dy=-pt.dy*height/2;
 if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6){dx=0;dy=1;}
 // Asymmetric insets: scale along the ray until it touches the inset rectangle.
 const tx=dx>0?(width-inset.right-cx)/dx:dx<0?(inset.left-cx)/dx:Infinity,ty=dy>0?(height-inset.bottom-cy)/dy:dy<0?(inset.top-cy)/dy:Infinity;
 const t=Math.min(tx,ty);
 return {x:cx+dx*t,y:cy+dy*t,angle:Math.atan2(dy,dx)};
}
/** A perspective camera's matrices from eye and target, for harnesses and tests that have no three.js camera. Y up. */
export function lookAtCamera(eye:{x:number;y:number;z:number},target:{x:number;y:number;z:number},fovDegrees:number,aspect:number,near=.5,far=4000):CameraMatrices{
 const sub=(a:number[],b:number[])=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],norm=(a:number[])=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a:number[],b:number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const e=[eye.x,eye.y,eye.z],z=norm(sub(e,[target.x,target.y,target.z])),x=norm(cross([0,1,0],z)),y=cross(z,x);
 const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1];
 const f=1/Math.tan(fovDegrees*Math.PI/360),nf=1/(near-far);
 const proj=[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];
 return {matrixWorldInverse:{elements:view},projectionMatrix:{elements:proj}};
}
