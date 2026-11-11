/** Option H "carved honey-wood diorama" palette tokens (style board H,
 * bottom-middle of docs/art-reference/style-options-D-I.png). Pure data; the
 * three.js adapter bakes these into vertex colours so one shared material
 * serves every carved building (one draw call per variant/LOD).
 *
 * Calibration (measured from the original board, not from the later
 * village-H-E-comparison reinterpretation): warm wood pixels in panel H sit at
 * hue 27-31 deg, saturation 0.49-0.66, with value quantiles
 *   q05 #664017  q15 #8c5a2c  q30 #ab723e  q50 #bc824d  q70 #ca8d55
 *   q85 #d59a61  q95 #e2b07b  q99 #ebc08f
 * Paths are lighter inlaid strips (~#e2c49a..#e9d7ba). Water is a muted slate
 * (~#727972..#858b82 on the board; we push it slightly bluer so it stays
 * unmistakably water under the warm rig). Tree crowns are olive (#806327..
 * #a68951); we keep them a restrained olive-sage so foliage separates from
 * wood without becoming saturated green.
 *
 * The earlier Option H proof's default "natural" palette (#8d7c63 wood) and its
 * "warm" palette (#d29148) both rendered beige under the game's cool sky
 * hemisphere (#dcebf8). Warmth is therefore carried by BOTH these albedos and
 * the H light rig below; a palette-only swap under the classic rig will not
 * reproduce the board. Every material id used by generators must exist here;
 * tests check completeness, warmth ranges and contour-edge value ordering. */
export type CarvedMaterialId=
 |'woodLight'|'woodMid'|'woodDark'|'woodEdge'|'woodInlay'|'recess'
 |'thatch'|'shingle'|'tile'
 |'stone'|'stoneDark'|'plaster'
 |'foliage'|'foliageDark'|'trunk'
 |'water'|'fire'|'cloth'|'iron';
export type CarvedSwatch={hex:string;roughness:number;
 /** Wood-grain strength multiplier for this surface (0 = no grain). */
 grain:number};

export const CARVED_MATERIALS:Record<CarvedMaterialId,CarvedSwatch>={
 woodLight:{hex:'#dfa56b',roughness:.84,grain:1},
 woodMid:{hex:'#c8884d',roughness:.86,grain:1},
 woodDark:{hex:'#9c6433',roughness:.88,grain:1},
 woodEdge:{hex:'#6a4219',roughness:.9,grain:.7},
 woodInlay:{hex:'#e9c592',roughness:.82,grain:.6},
 recess:{hex:'#4a2e12',roughness:.95,grain:0},
 // Roofs stay in the wood family (carved diorama), separated by value and a
 // slightly more orange hue rather than by a foreign colour.
 thatch:{hex:'#cf9553',roughness:.92,grain:.8},
 shingle:{hex:'#b97a40',roughness:.88,grain:1},
 tile:{hex:'#c0723c',roughness:.86,grain:.8},
 // "Stone" is carved pale wood in H: lighter, slightly less saturated.
 stone:{hex:'#dcb688',roughness:.92,grain:.5},
 stoneDark:{hex:'#a97b4e',roughness:.93,grain:.5},
 plaster:{hex:'#e6b77e',roughness:.92,grain:.4},
 // Restrained olive-sage, rounded "lollipop" canopies.
 foliage:{hex:'#9d9a58',roughness:.9,grain:0},
 foliageDark:{hex:'#78773f',roughness:.92,grain:0},
 trunk:{hex:'#8a5a2c',roughness:.9,grain:1},
 // Slate-blue water, the only cool hue on the board.
 water:{hex:'#7a8f99',roughness:.35,grain:0},
 fire:{hex:'#f0a03a',roughness:.6,grain:0},
 cloth:{hex:'#ecd2a4',roughness:.9,grain:0},
 iron:{hex:'#5a4c40',roughness:.6,grain:0},
};
export const CARVED_MATERIAL_IDS=Object.keys(CARVED_MATERIALS) as CarvedMaterialId[];
export const WOOD_FAMILY:readonly CarvedMaterialId[]=['woodLight','woodMid','woodDark','thatch','shingle','tile','plaster','stone','stoneDark','trunk'];

/** Terrain contour terrace tokens: alternating honey laminations, a darker
 * carved riser at each band edge, inlaid paths and the grain modulation. */
export const CARVED_TERRAIN={
 bands:['#d1935a','#c8894f','#d79e63','#c17e44'] as const,
 riser:'#7e4d22',
 shore:'#b9804a',
 path:'#e6c08c',
 riverbed:'#6f8790',
 bandMetres:1.6,
 riserWidth:.22,
 grainAmplitude:.07,
 grainWavelengthMetres:2.4,
} as const;

/** Light rig for the H style. Warm sky/sun with one faint cool bounce so the
 * water and shadow side keep separation; soft (no hard noon contrast). The
 * classic renderer's rig is untouched unless the H style is selected. */
export const CARVED_LIGHT_RIG={
 toneMapping:'neutral' as const,
 exposure:1,
 hemiSky:'#ffe8c8',hemiGround:'#94643a',hemiIntensity:1.05,
 sun:'#fff0d8',sunIntensity:1.9,
 bounce:'#c9dbe6',bounceIntensity:.22,
 fog:'#e2b884',fogNearMetres:120,fogFarMetres:420,
} as const;

/** Wood-grain texture parameters shared by every carved surface (one texture,
 * metric UVs, so grain density reads the same on a post and a hillside). */
export const CARVED_GRAIN={textureSize:256,tileMetres:1.8,lineCount:90,darkest:.74,mean:.93} as const;

export function hexToRgb(hex:string):[number,number,number]{const n=parseInt(hex.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
/** Relative luminance (sRGB approximation) for value-ordering tests. */
export function luminance(hex:string){const [r,g,b]=hexToRgb(hex);return .2126*r+.7152*g+.0722*b;}
/** Hue (degrees), saturation and value for palette range tests. */
export function hsv(hex:string):[number,number,number]{
 const [r,g,b]=hexToRgb(hex),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
 let h=0;if(d>0)h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;
 return [(h*60+360)%360,mx?d/mx:0,mx];
}

/** Deterministic greyscale wood-grain pixels (RGBA, near-white with darker
 * warped growth lines) for the shared carved material map. It multiplies the
 * vertex colour, so its mean stays close to 1 and only lines darken. */
export function woodGrainPixels(size:number=CARVED_GRAIN.textureSize,seed=7){
 const out=new Uint8Array(size*size*4),lines:number[]=[];let s=seed>>>0;
 const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 for(let i=0;i<CARVED_GRAIN.lineCount;i++)lines.push(rnd());
 const strengths=lines.map(()=>.35+rnd()*.65);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  // Lines run along U (x); V position is warped by slow waves so grain bends.
  const u=x/size,v=y/size,warp=.012*Math.sin(u*Math.PI*2*2+v*9)+.006*Math.sin(u*Math.PI*2*5+1.3);
  let shade=1;
  for(let i=0;i<lines.length;i++){let dv=Math.abs(v+warp-lines[i]);dv=Math.min(dv,1-dv);const w=.0035+strengths[i]*.004;if(dv<w)shade=Math.min(shade,1-(1-CARVED_GRAIN.darkest)*strengths[i]*(1-dv/w));}
  // Very soft broad figure so planks are not uniformly flat between lines.
  shade*=.97+.03*Math.sin(v*Math.PI*2*3+u*2);
  const c=Math.max(0,Math.min(255,Math.round(shade*255))),o=(y*size+x)*4;out[o]=c;out[o+1]=c;out[o+2]=c;out[o+3]=255;
 }
 return out;
}

/** G2 golden-hour-dominant daytime grade for the H style. `t` is the fraction
 * of the visible daylight period (0 sunrise, .5 noon, 1 sunset). Warmth stays
 * high for most of the day and only dips gently around noon, so the world
 * reads like the board's late-afternoon light rather than flat white noon.
 * Returns colours to lerp the H rig towards; it never touches the classic rig
 * and does not change the simulation clock or daylight duration. */
export function carvedDaylightGrade(t:number){
 const x=Math.max(0,Math.min(1,t)),noon=Math.exp(-Math.pow((x-.5)/.16,2));
 // warmth 1 = full golden hour, ~0.62 at noon; edges stay warm but dimmer.
 const warmth=1-.38*noon,edge=Math.min(1,Math.min(x,1-x)/.08);
 const lerp=(a:string,b:string,k:number)=>{const A=hexToRgb(a),B=hexToRgb(b);return '#'+A.map((v,i)=>Math.round((v+(B[i]-v)*k)*255).toString(16).padStart(2,'0')).join('');};
 return {warmth,sun:lerp('#fff6ea','#ffd49a',warmth),hemiSky:lerp('#fff3e2','#ffdcae',warmth),sunIntensity:CARVED_LIGHT_RIG.sunIntensity*(.55+.45*edge)*(.9+.1*noon),hemiIntensity:CARVED_LIGHT_RIG.hemiIntensity*(.75+.25*edge)};
}
