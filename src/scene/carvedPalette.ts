/** Option H "carved honey-wood diorama" palette tokens (style board H,
 * bottom-middle of docs/art-reference/style-options-D-I.png). Pure data; the
 * three.js adapter bakes these into vertex colours so one shared material
 * serves every carved building (one draw call per variant/LOD).
 *
 * Every material id used by building generators must exist here; tests check
 * completeness and that contour edges are darker than the faces they edge. */
export type CarvedMaterialId=
 |'woodLight'|'woodMid'|'woodDark'|'woodEdge'
 |'thatch'|'shingle'|'tile'
 |'stone'|'stoneDark'|'plaster'
 |'foliage'|'foliageDark'|'trunk'
 |'water'|'fire'|'cloth'|'iron';
export type CarvedSwatch={hex:string;roughness:number};

export const CARVED_MATERIALS:Record<CarvedMaterialId,CarvedSwatch>={
 woodLight:{hex:'#e2b47c',roughness:.86},
 woodMid:{hex:'#c88f55',roughness:.88},
 woodDark:{hex:'#94603a',roughness:.9},
 woodEdge:{hex:'#6f4527',roughness:.92},
 // Roofs stay in the wood family (carved diorama), separated by value not hue.
 thatch:{hex:'#d6a868',roughness:.94},
 shingle:{hex:'#b0743f',roughness:.9},
 tile:{hex:'#b8693f',roughness:.88},
 stone:{hex:'#d9bf96',roughness:.95},
 stoneDark:{hex:'#a8865e',roughness:.96},
 plaster:{hex:'#ecc995',roughness:.95},
 // Desaturated sage foliage, rounded "lollipop" canopies.
 foliage:{hex:'#a9ad78',roughness:.9},
 foliageDark:{hex:'#8b9461',roughness:.92},
 trunk:{hex:'#a06d42',roughness:.9},
 // Slate-blue water, the only cool hue in the board.
 water:{hex:'#7f9fb2',roughness:.35},
 fire:{hex:'#f2a23c',roughness:.6},
 cloth:{hex:'#efd9ae',roughness:.9},
 iron:{hex:'#5d5248',roughness:.6},
};

/** Terrain contour terrace tokens: alternating honey bands, a darker carved
 * riser at each band edge, and the wood-grain modulation amplitude. */
export const CARVED_TERRAIN={
 bands:['#dcaa6c','#d29d5f','#e3b679','#cf9858'] as const,
 riser:'#8f5c33',
 shore:'#c08a52',
 riverbed:'#6f8fa3',
 bandMetres:1.6,
 riserWidth:.22,
 grainAmplitude:.06,
 grainWavelengthMetres:2.4,
} as const;

export function hexToRgb(hex:string):[number,number,number]{const n=parseInt(hex.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
/** Relative luminance (sRGB approximation) for value-ordering tests. */
export function luminance(hex:string){const [r,g,b]=hexToRgb(hex);return .2126*r+.7152*g+.0722*b;}
