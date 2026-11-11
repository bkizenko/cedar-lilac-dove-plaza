export type GraphicsQuality='low'|'med'|'high';
export const GRAPHICS_RULES={defaultQuality:'med' as GraphicsQuality,defaultShadows:false,defaultUnitRings:true,profiles:{low:{maximumPixels:800000,pixelRatio:1,groundCover:false,bloom:false},med:{maximumPixels:2100000,pixelRatio:1.25,groundCover:true,bloom:true},high:{maximumPixels:3200000,pixelRatio:1.5,groundCover:true,bloom:true}}} as const;
export const GRAPHICS_PREFERENCE_KEY='hearthwild:graphics-quality';
export function loadGraphicsQuality():GraphicsQuality {try{const q=localStorage.getItem(GRAPHICS_PREFERENCE_KEY);return q==='low'||q==='med'||q==='high'?q:GRAPHICS_RULES.defaultQuality;}catch{return GRAPHICS_RULES.defaultQuality;}}
export function rememberGraphicsQuality(q:GraphicsQuality):void {try{localStorage.setItem(GRAPHICS_PREFERENCE_KEY,q);}catch{/* Rendering remains available when local storage is full or disabled. */}}


export function graphicsPixelRatio(quality:GraphicsQuality,width:number,height:number,deviceRatio=1){
 const profile=GRAPHICS_RULES.profiles[quality];
 const area=Math.max(1,width)*Math.max(1,height);
 return Math.min(Math.max(.1,deviceRatio),profile.pixelRatio,Math.sqrt(profile.maximumPixels/area));
}
