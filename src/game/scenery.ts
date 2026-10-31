/** Generation-time landscape composition. Scores are design preferences, not
 * universal judgments; all components use a documented 0–1 scale. */
export const SCENERY_RULES = {
  version: 1,
  viewRadiusMeters: 120,
  nearRadiusMeters: 45,
  backdropRadiusMeters: 300,
  bearings: 16,
  reliefForFullScoreMeters: 28,
  waterTargetFraction: .22,
  playerCandidatePercentile: .65,
  weights: { water: .28, relief: .30, outlook: .22, contrast: .20 },
} as const;
export type ScenicScore = { score: number; water: number; relief: number; outlook: number; contrast: number; backdrop?:number };
const unit = (n:number) => Math.max(0, Math.min(1,n));
/** Uses actual terrain, including lakes/coasts, rather than decorative tags.
 * 32 samples per location, no simulation RNG consumption or frame-time work. */
export function scenicBeautyAt(height:(x:number,z:number)=>number, waterY:number, x:number,z:number,waterAt?:(x:number,z:number)=>number,backdropRadiusMeters=0):ScenicScore {
  const rules=SCENERY_RULES, center=height(x,z), views:number[]=[],near:number[]=[],viewWet:boolean[]=[],nearWet:boolean[]=[];
  for(let i=0;i<rules.bearings;i++){
    const a=i*Math.PI*2/rules.bearings,dx=Math.cos(a),dz=Math.sin(a);
    views.push(height(x+dx*rules.viewRadiusMeters,z+dz*rules.viewRadiusMeters));
    near.push(height(x+dx*rules.nearRadiusMeters,z+dz*rules.nearRadiusMeters));
    viewWet.push(views.at(-1)!<(waterAt?.(x+dx*rules.viewRadiusMeters,z+dz*rules.viewRadiusMeters)??waterY)+.32);
    nearWet.push(near.at(-1)!<(waterAt?.(x+dx*rules.nearRadiusMeters,z+dz*rules.nearRadiusMeters)??waterY)+.32);
  }
  const wet=[...viewWet,...nearWet].filter(Boolean).length/(rules.bearings*2);
  // Water framing peaks at a mixed land/water scene; open sea is not a perfect landscape.
  const water=unit(1-Math.abs(wet-rules.waterTargetFraction)/rules.waterTargetFraction);
  const dry=views.filter((h,i)=>waterAt?!viewWet[i]:h>waterY+.32), low=Math.min(center,...dry),high=Math.max(center,...dry);
  let relief=unit((high-low)/rules.reliefForFullScoreMeters),backdrop:number|undefined;
  if(backdropRadiusMeters>0){
    const distant:number[]=[];
    for(const radius of [backdropRadiusMeters*2/3,backdropRadiusMeters])for(let i=0;i<rules.bearings;i++){
      const a=i*Math.PI*2/rules.bearings,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius,h=height(px,pz);
      if(h>(waterAt?.(px,pz)??waterY)+.32)distant.push(h);
    }
    backdrop=unit((Math.max(center,...distant)-Math.min(center,...distant))/rules.reliefForFullScoreMeters);
    relief=relief*.4+backdrop*.6;
  }
  const outlook=views.filter(h=>h<center+6).length/rules.bearings;
  let transitions=0;
  for(let i=0;i<views.length;i++)if(Math.abs(views[i]-views[(i+1)%views.length])>6)transitions++;
  const contrast=unit(transitions/8);
  const w=rules.weights,score=100*(water*w.water+relief*w.relief+outlook*w.outlook+contrast*w.contrast);
  return {score,water,relief,outlook,contrast,...(backdrop!==undefined?{backdrop}:{})};
}
export function scenerySummary(scores:number[],player:ScenicScore){
  const sorted=[...scores].sort((a,b)=>a-b),mean=scores.reduce((s,n)=>s+n,0)/(scores.length||1);
  return {version:SCENERY_RULES.version,units:'points / 100' as const,candidateCount:scores.length,mean,
    minimum:sorted[0]??0,maximum:sorted.at(-1)??0,
    playerAboveAverage:scores.length>0&&player.score>mean,playerPercentile:scores.filter(n=>n<=player.score).length/(scores.length||1),player};
}
