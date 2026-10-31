export type GraphicsQuality='low'|'med'|'high';
export const GRAPHICS_RULES={defaultQuality:'med' as GraphicsQuality,defaultShadows:false,defaultUnitRings:false,profiles:{low:{pixelRatio:1,groundCover:false,bloom:false},med:{pixelRatio:1.25,groundCover:true,bloom:true},high:{pixelRatio:1.5,groundCover:true,bloom:true}}} as const;
