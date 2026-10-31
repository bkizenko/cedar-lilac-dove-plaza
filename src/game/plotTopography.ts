export const PLOT_TOPOGRAPHY_RULES={sampleSpacingMeters:2,maximumOrdinaryFieldGrade:.6,dryClearanceMeters:.3} as const;
type Ground={height(x:number,z:number):number;waterAt(x:number,z:number):number};
type Footprint={x:number;z:number;w:number;d:number};
/** Include every edge and the interior, including enlarged plots. No terrain is
 * flattened or edited. The survey is run on placement/expansion, not per tick. */
export function surveyFieldTopography(ground:Ground,plot:Footprint){
 const nx=Math.max(1,Math.ceil(plot.w/PLOT_TOPOGRAPHY_RULES.sampleSpacingMeters)),nz=Math.max(1,Math.ceil(plot.d/PLOT_TOPOGRAPHY_RULES.sampleSpacingMeters));
 let minHeight=Infinity,maxHeight=-Infinity,maxGrade=0,wet=0,samples=0,gradientX=0,gradientZ=0;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=plot.x+(i/nx-.5)*plot.w,z=plot.z+(j/nz-.5)*plot.d,h=ground.height(x,z);
  const dx=(ground.height(x+1,z)-ground.height(x-1,z))/2,dz=(ground.height(x,z+1)-ground.height(x,z-1))/2;
  samples++;minHeight=Math.min(minHeight,h);maxHeight=Math.max(maxHeight,h);maxGrade=Math.max(maxGrade,Math.hypot(dx,dz));gradientX+=dx;gradientZ+=dz;
  if(h<ground.waterAt(x,z)+PLOT_TOPOGRAPHY_RULES.dryClearanceMeters)wet++;
 }
 return{samples,minHeightMeters:minHeight,maxHeightMeters:maxHeight,heightRangeMeters:maxHeight-minHeight,maxGrade,wetFraction:wet/samples,meanGradientX:gradientX/samples,meanGradientZ:gradientZ/samples,contourAngleRadians:Math.atan2(-gradientX,gradientZ)};
}
export function fieldTopographyIssue(ground:Ground,plot:Footprint):string|null{
 const survey=surveyFieldTopography(ground,plot);
 if(survey.wetFraction>0)return 'Part of this field is wet; reduce the plot or choose a dry bank';
 if(survey.maxGrade>PLOT_TOPOGRAPHY_RULES.maximumOrdinaryFieldGrade)return 'Part of this field is too steep; reduce the plot or use a gentler natural bench';
 return null;
}
