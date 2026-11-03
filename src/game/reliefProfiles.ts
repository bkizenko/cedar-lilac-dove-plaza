import{mulberry32}from'./rng';
export const RELIEF_PROFILE_RULES={version:1,worldWeights:{flatter:22,rolling:30,hilly:28,mountainous:20},regionStepMetres:280,matchingRegionWeight:.70,adjacentRegionWeight:.30} as const;
export type ReliefCharacter=keyof typeof RELIEF_PROFILE_RULES.worldWeights;
const keys=Object.keys(RELIEF_PROFILE_RULES.worldWeights) as ReliefCharacter[];
/** These coefficients change actual broad ground, not its displayed label.
 * Rare geological families and physically carved drainage are separate. */
export const RELIEF_CHARACTERS={
 flatter:{base:1.7,broad:3,fold:2,wave:.7,ridge:0},
 rolling:{base:3,broad:9,fold:12,wave:3,ridge:0},
 hilly:{base:4,broad:20,fold:42,wave:5,ridge:9},
 mountainous:{base:5,broad:30,fold:105,wave:7,ridge:26},
} as const;
/** Exactly one supplied unit draw: configuration never adds an RNG call. */
export function weightedReliefIndex(weights:readonly number[],draw:number){
 if(!weights.length||weights.some(v=>!Number.isFinite(v)||v<0))throw new Error('Relief weights must be finite and nonnegative');
 const total=weights.reduce((n,v)=>n+v,0);if(!Number.isFinite(total)||total<=0)throw new Error('Relief weights need a finite positive total');
 if(!Number.isFinite(draw)||draw<0||draw>=1)throw new Error('Relief draw must be in [0,1)');
 let q=draw*total;for(let i=0;i<weights.length;i++){q-=weights[i];if(q<0)return i;}return weights.length-1;
}
export function worldReliefCharacter(seed:number):ReliefCharacter{return keys[weightedReliefIndex(keys.map(k=>RELIEF_PROFILE_RULES.worldWeights[k]),mulberry32(seed^0x18c4a6e)())];}

export function createReliefProfiles(seed:number,size:number){
 const worldCharacter=worldReliefCharacter(seed),worldIndex=keys.indexOf(worldCharacter),step=RELIEF_PROFILE_RULES.regionStepMetres,width=Math.ceil(size/step)+2,half=size/2,coefficients=new Float64Array(width*width*5),regions:{x:number;z:number;character:ReliefCharacter}[]=[];
 for(let z=0;z<width;z++)for(let x=0;x<width;x++){const rand=mulberry32(seed^Math.imul(x+1,0x45d9f3b)^Math.imul(z+1,0x119de1f3)),q=rand(),index=weightedReliefIndex([RELIEF_PROFILE_RULES.matchingRegionWeight,RELIEF_PROFILE_RULES.adjacentRegionWeight],q)===0?worldIndex:Math.max(0,Math.min(3,worldIndex+(rand()<.5?-1:1))),character=keys[index],p=RELIEF_CHARACTERS[character],at=(z*width+x)*5;coefficients.set([p.base,p.broad,p.fold,p.wave,p.ridge],at);regions.push({x:x*step-half,z:z*step-half,character});}
 const smooth=(v:number)=>v*v*(3-2*v),height=(x:number,z:number,broad:number,fold:number,owner:number)=>{const gx=Math.max(0,Math.min(width-1.000001,(x+half)/step)),gz=Math.max(0,Math.min(width-1.000001,(z+half)/step)),ix=Math.floor(gx),iz=Math.floor(gz),fx=smooth(gx-ix),fz=smooth(gz-iz),a=(iz*width+ix)*5,b=a+5,c=a+width*5,d=c+5;
  const coefficient=(n:number)=>(coefficients[a+n]*(1-fx)+coefficients[b+n]*fx)*(1-fz)+(coefficients[c+n]*(1-fx)+coefficients[d+n]*fx)*fz;
  const wave=.5+.5*Math.sin(x/37+owner)*Math.sin(z/43),ridge=(1-Math.abs(fold*2-1))**3;
  return coefficient(0)+broad*coefficient(1)+Math.max(0,fold-.34)*coefficient(2)+wave*coefficient(3)+ridge*coefficient(4);
 };
 return{worldCharacter,seed,regionStepMetres:step,regions,rules:RELIEF_PROFILE_RULES,height};
}
