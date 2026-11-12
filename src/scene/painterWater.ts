import * as THREE from 'three';
import type {TerrainSurface} from './terrainSurface';
/** Painterly water surface: depth-graded colour (shallow turquoise over visible bed, to deep blue-green), sky-and-sun reflection with a soft
 * fresnel, layered ripples, animated shore foam bands, river flow streaks and a gentle wet-edge fade. Same geometry, uniforms and depth
 * measurement (terrain height texture) as the classic water, so shorelines, banks and collision are untouched. */
export const PAINTER_WATER_RULES={shallowMetres:.5,deepMetres:6.5,foamMetres:.9,riverFoamMetres:.28,glintPower:220} as const;
export type PainterWaterKind='sea'|'river'|'fall';
export function painterWaterUniforms(){return {uSkyHorizon:{value:new THREE.Color('#d8e4e8')},uSkyZenith:{value:new THREE.Color('#4a82c0')},uFoam:{value:new THREE.Color('#f3f6f2')},uSunColor:{value:new THREE.Color('#fff0cf')},uKind:{value:0}};}
export function painterWaterFragment(surface:TerrainSurface,falling:boolean,kind:PainterWaterKind){
 const banks=surface.banks?.glsl??'',cuts=surface.bankCuts?.glsl??'';
 return `uniform float uTime;uniform float uLight;uniform vec3 uSunDirection;uniform vec3 uColor;uniform vec3 uDeep;uniform sampler2D uHeights;
  uniform float uTerrainSize;uniform float uSegments;uniform float uFalling;uniform vec3 uSkyHorizon;uniform vec3 uSkyZenith;uniform vec3 uFoam;uniform vec3 uSunColor;
  varying vec3 vWPos;varying vec2 vWaterUv;
  ${banks}
  ${cuts}
  #include <fog_pars_fragment>
  float wHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float wNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wHash(i),wHash(i+vec2(1.,0.)),f.x),mix(wHash(i+vec2(0.,1.)),wHash(i+vec2(1.)),f.x),f.y);}
  float wFbm(vec2 p){return wNoise(p)*.55+wNoise(p*2.1+vec2(4.1,7.3))*.3+wNoise(p*4.4+vec2(9.2,1.7))*.15;}
  float bedHeight(vec2 worldXZ){
   vec2 grid=clamp((worldXZ/uTerrainSize+.5)*uSegments,vec2(0.),vec2(uSegments));
   vec2 cell=min(floor(grid),vec2(uSegments-1.)),f=grid-cell;float texel=1./(uSegments+1.);
   vec2 uv=(cell+.5)*texel;
   float a=texture2D(uHeights,uv).r,b=texture2D(uHeights,uv+vec2(texel,0.)).r;
   float c=texture2D(uHeights,uv+vec2(0.,texel)).r,d=texture2D(uHeights,uv+vec2(texel)).r;
   float base=f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
   return ${surface.banks?'refinedExcavationHeight(worldXZ,refinedBankHeight(worldXZ,base))':'base'};
  }
  void main(){
   float depth=max(0.,vWPos.y-bedHeight(vWPos.xz));
   if(uFalling<.5&&depth<.004)discard;
   vec2 p=vWPos.xz;float T=uTime;
   float dist=length(cameraPosition-vWPos);
   float near=1.-smoothstep(40.,260.,dist);
   // layered travelling ripples (analytic slope of three crossing wave trains plus a fine noise normal)
   ${kind==='river'?'vec2 flowDir=vec2(0.,1.);float flow=vWaterUv.y;':'float flow=0.;'}
   vec2 g=vec2(0.);
   g+=vec2(cos(p.x*.31+p.y*.17+T*.9)*.31+cos(p.x*.13-p.y*.29-T*.6)*.22,cos(p.x*.31+p.y*.17+T*.9)*.17-cos(p.x*.13-p.y*.29-T*.6)*.29)*.075;
   g+=vec2(cos(p.x*.83-p.y*.47+T*1.7),cos(p.x*.83-p.y*.47+T*1.7)*-.57+sin(p.y*1.1+T*1.3)*.9)*.045*near;
   float fine=wNoise(p*2.3+vec2(T*.5,-T*.4))+wNoise(p*5.1-vec2(T*.7,T*.3))*.5-.75;
   g+=vec2(fine,wNoise(p*2.1+vec2(7.,T*.45))-.5)*.05*near;
   ${kind==='river'?'float streak=wNoise(vec2(vWaterUv.x*9.,flow*1.6-T*1.4));g.y+=(streak-.5)*.09;':''}
   vec3 n=normalize(vec3(-g.x,1.,-g.y));
   vec3 V=normalize(cameraPosition-vWPos);
   float ndv=clamp(dot(n,V),0.,1.);
   float fres=.02+.98*pow(1.-ndv,4.);
   // depth colour: bright turquoise shelf, saturated deep water, bed showing through the shallows
   float shelf=1.-smoothstep(${PAINTER_WATER_RULES.shallowMetres.toFixed(2)},${PAINTER_WATER_RULES.deepMetres.toFixed(2)},depth);
   float mid=1.-smoothstep(.4,2.2,depth);
   vec3 col=mix(uDeep,uColor,pow(shelf,.8)*.92);
   col=mix(col,uColor*vec3(1.12,1.1,.98),mid*.35);
   col*=1.-.16*smoothstep(1.5,7.,depth)*wNoise(p*.35);
   // sky reflection: horizon haze low, zenith blue high
   vec3 R=reflect(-V,n);
   vec3 sky=mix(uSkyHorizon,uSkyZenith,clamp(R.y*1.6,0.,1.));
   col=mix(col,sky,clamp(fres*.85+.04,0.,.88));
   // sun: tight glint, soft glow, sparkle
   float sd=max(dot(R,normalize(uSunDirection)),0.);
   float glint=pow(sd,${PAINTER_WATER_RULES.glintPower.toFixed(1)})*1.6+pow(sd,14.)*.16;
   float sparkle=smoothstep(.88,1.,wNoise(p*7.+T*.8))*pow(sd,9.)*.22*near;
   col+=uSunColor*(glint+sparkle)*(.45+.55*uLight);
   // foam: wave-fed bands at the shore, broken by noise, plus streaked white water in fast reaches
   float foamM=${kind==='river'?PAINTER_WATER_RULES.riverFoamMetres.toFixed(2):PAINTER_WATER_RULES.foamMetres.toFixed(2)};
   float shore=1.-smoothstep(.03,foamM,depth);
   float wob=wFbm(p*.9+T*.12)*2.;
   float band=sin(depth*15.-T*1.5+wob*5.);
   float breaker=smoothstep(.2,.95,band*.5+.5)*(1.-smoothstep(.0,foamM,depth));
   float lace=smoothstep(${kind==='river'?'.5,.8':'.42,.72'},wFbm(p*${kind==='river'?'2.2':'3.1'}+vec2(T*.2,0.)));
   float foam=clamp(shore*(.3+.7*lace)*${kind==='river'?'.55':'1.'}+breaker*lace*.6,0.,1.)*(1.-smoothstep(.0,.04,depth)*.0);
   float edgeLine=smoothstep(.0,.07,depth)*(1.-smoothstep(.07,.2,depth));
   foam=max(foam,edgeLine*lace*.55);
   ${kind==='river'?'foam=max(foam,smoothstep(.7,.92,streak)*.1*(1.-smoothstep(.8,2.,depth)));':''}
   float fallAlpha=1.;
   ${falling?`vec2 fl=vec2(vWaterUv.x*7.,vWaterUv.y*9.+uTime*1.9);
   float turb=wNoise(fl*.65),strand=wNoise(vec2(fl.x+turb*.9,fl.y*.6));
   float small=wNoise(fl*vec2(2.1,1.4)+vec2(11.,-uTime*.8));
   float edgeWobble=(wNoise(fl*vec2(.6,.4))-.5)*.12;
   float edge=smoothstep(.01,.09,vWaterUv.x+edgeWobble)*(1.-smoothstep(.91,.99,vWaterUv.x+edgeWobble));
   fallAlpha=edge*(.5+strand*.36)*(.72+.28*small);
   col=mix(uColor*vec3(.7,.95,1.),vec3(.86,.94,.94),.3+strand*.6);
   foam=smoothstep(.62,1.,1.-vWaterUv.y)*(.25+small*.5);`:''}
   col=mix(col,uFoam,foam*.92);
   float alpha=mix(.34,.94,smoothstep(.0,3.2,depth))+fres*.05;
   alpha=mix(alpha,.96,foam*.7);
   alpha*=smoothstep(.0,.05,depth)*.5+.5;
   alpha=${falling?'fallAlpha':'alpha'};
   gl_FragColor=vec4(col*mix(.68,1.,uLight),clamp(alpha,0.,.98));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
  }`;
}
