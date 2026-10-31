import {fbm} from '../game/rng';

/** Render-only controls: distances/elevations in world metres, grade in m/m.
 * Changes never mutate terrain, deposits, navigation or saved villages. */
export const LANDSCAPE_ART_RULES = {
  provinceMetres: 240,
  exposedGrade: 0.32,
  bareGrade: 0.85,
  strataMetres: 4.5,
  strataContrast: 0.055,
  aspectContrast: 0.10,
  rockBlend: 0.78,
} as const;
export type LandscapeSample = {exposure:number;r:number;g:number;b:number;shade:number};
/** Connected rock provinces and contour-following strata, sampled once per terrain rebuild. */
export function landscapeSample(seed:number,x:number,z:number,height:number,dx:number,dz:number):LandscapeSample {
  const rules=LANDSCAPE_ART_RULES,grade=Math.hypot(dx,dz);
  const exposure=Math.max(0,Math.min(1,(grade-rules.exposedGrade)/(rules.bareGrade-rules.exposedGrade)));
  const province=fbm(x/rules.provinceMetres+seed%997,z/rules.provinceMetres-seed%619,3);
  // A continuous geological province avoids unrelated colored stamps on adjacent slopes.
  const warm=Math.max(0,Math.min(1,(province-.36)/.28));
  const strata=Math.sin(height/rules.strataMetres*Math.PI*2)*rules.strataContrast;
  const shade=1+Math.max(-1,Math.min(1,(dx*.65-dz*.75)/Math.max(.4,grade)))*rules.aspectContrast*exposure;
  return {exposure,r:.68+warm*.10+strata,g:.69-warm*.13+strata*.8,b:.66-warm*.22+strata*.55,shade};
}
