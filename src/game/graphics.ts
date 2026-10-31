export type GraphicsQuality='low'|'med'|'high';
export const GRAPHICS_RULES={defaultQuality:'med' as GraphicsQuality,defaultShadows:false,defaultUnitRings:false,profiles:{low:{pixelRatio:1,groundCover:false,bloom:false},med:{pixelRatio:1.25,groundCover:true,bloom:true},high:{pixelRatio:1.5,groundCover:true,bloom:true}}} as const;
export const GRAPHICS_PREFERENCE_KEY='hearthwild:graphics-quality';
export function loadGraphicsQuality():GraphicsQuality {try{const q=localStorage.getItem(GRAPHICS_PREFERENCE_KEY);return q==='low'||q==='med'||q==='high'?q:GRAPHICS_RULES.defaultQuality;}catch{return GRAPHICS_RULES.defaultQuality;}}
export function rememberGraphicsQuality(q:GraphicsQuality):void {try{localStorage.setItem(GRAPHICS_PREFERENCE_KEY,q);}catch{/* Rendering remains available when local storage is full or disabled. */}}
