import type {CritterKind} from './types';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export type Rhythm='diurnal'|'crepuscular'|'nocturnal';
export type Traits={role:'prey'|'predator'|'flier';rhythm:Rhythm;
 /** walk, trot, canter, gallop in m/s (game scale) */gaits:[number,number,number,number];turn:number;gallopSeconds:number;
 fid:number;fidPred:number;vigil:number;slope:number;forest:number;group:[number,number];spacing:number;home:number;
 rut:number;wallow:boolean;dust:boolean;browse:number;grazer:boolean};
export const ANIMAL_TRAITS:Record<CritterKind,Traits>={
 deer:{role:'prey',rhythm:'crepuscular',gaits:[.9,2.2,3.2,4.1],turn:3.4,gallopSeconds:14,fid:15,fidPred:26,vigil:1.8,slope:.7,forest:.9,group:[3,6],spacing:2.4,home:55,rut:2,wallow:false,dust:false,browse:.6,grazer:true},
 boar:{role:'prey',rhythm:'nocturnal',gaits:[.8,1.8,2.6,3],turn:3,gallopSeconds:8,fid:6,fidPred:10,vigil:1.5,slope:.6,forest:1,group:[4,8],spacing:1.8,home:45,rut:3,wallow:true,dust:false,browse:.9,grazer:false},
 goat:{role:'prey',rhythm:'crepuscular',gaits:[.7,1.7,2.4,2.9],turn:4,gallopSeconds:12,fid:11,fidPred:18,vigil:1.8,slope:1.6,forest:.8,group:[6,12],spacing:1.6,home:50,rut:3,wallow:false,dust:true,browse:.7,grazer:true},
 sheep:{role:'prey',rhythm:'diurnal',gaits:[.7,1.7,2.4,2.9],turn:3.4,gallopSeconds:9,fid:9,fidPred:16,vigil:1.6,slope:.6,forest:.6,group:[8,15],spacing:1.4,home:45,rut:3,wallow:false,dust:false,browse:.3,grazer:true},
 horse:{role:'prey',rhythm:'diurnal',gaits:[1.1,2.6,3.8,4.8],turn:2.8,gallopSeconds:28,fid:18,fidPred:30,vigil:2,slope:.55,forest:.35,group:[4,9],spacing:2.8,home:70,rut:0,wallow:false,dust:true,browse:.2,grazer:true},
 cattle:{role:'prey',rhythm:'diurnal',gaits:[.8,1.8,2.7,3.5],turn:2.4,gallopSeconds:10,fid:12,fidPred:16,vigil:1.5,slope:.45,forest:.35,group:[10,24],spacing:3,home:60,rut:1,wallow:true,dust:false,browse:.2,grazer:true},
 wolf:{role:'predator',rhythm:'nocturnal',gaits:[1,2.4,3.5,4.2],turn:3.4,gallopSeconds:17,fid:22,fidPred:22,vigil:1.6,slope:.8,forest:1,group:[3,6],spacing:2,home:48,rut:3,wallow:false,dust:false,browse:0,grazer:false},
 bird:{role:'flier',rhythm:'diurnal',gaits:[.6,2.5,4,5.5],turn:1.6,gallopSeconds:1e9,fid:9,fidPred:9,vigil:1.2,slope:9,forest:9,group:[6,12],spacing:2.2,home:60,rut:-1,wallow:false,dust:false,browse:0,grazer:false},
};
export const ANIMAL_RULES=Object.freeze({adultScale:{deer:1.15,boar:1.05,goat:.95,sheep:.95,horse:1.2,cattle:1.2,wolf:1,bird:.7} as Record<CritterKind,number>,
 lodNear:45,lodMid:110,intervalNear:0,intervalMid:.2,intervalFar:1,maxStepsPerTick:90,maxStep:2,stalkMetres:12,chaseGiveUp:46,chaseSeconds:26,contact:1.15,feedMeatFraction:.55,
 accel:1.6,decel:3,pivot:1.1,huntFidScale:.42,habMax:.5,wolfPrey:['deer','goat','sheep'] as CritterKind[]});

export function animalRand(seed:number,id:number,n:number){let h=(seed^Math.imul(id|0,0x9e3779b1)^Math.imul((n|0)+1,0x85ebca6b))>>>0;h=Math.imul(h^h>>>16,0x7feb352d);h=Math.imul(h^h>>>15,0x846ca68b);return((h^h>>>16)>>>0)/4294967296;}

/** Drive toward foraging 0..1 from time of day and rhythm (hour is local solar hour). */
export function activityLevel(r:Rhythm,hour:number,sunrise:number,sunset:number){
 const bump=(h:number,c:number,w:number)=>{let d=Math.abs(h-c);d=Math.min(d,24-d);return Math.exp(-((d/w)**2));};
 const day=hour>=sunrise&&hour<=sunset;
 if(r==='diurnal')return clamp(Math.max(bump(hour,sunrise+1.8,2.2),bump(hour,sunset-1.8,2.2))+(day?.3:.04),0,1);
 if(r==='crepuscular')return clamp(Math.max(bump(hour,sunrise+.3,1.6),bump(hour,sunset-.3,1.6))+(day?.16:.3),0,1);
 return clamp(Math.max(bump(hour,sunset+1,3.2),bump(hour,sunrise-1,2.2))+(day?.08:.38),0,1);
}
