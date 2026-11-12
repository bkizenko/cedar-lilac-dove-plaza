import * as THREE from 'three';
/** Painterly map atmosphere: one pure palette function (testable, no THREE state) plus the sky dome material and the colour-grade pass.
 * Warm direct light against cool sky light, a horizon band the fog melts into, soft cloud shadows. Render-only. */
export type AtmosphereInput={elev:number;dawn:number;dusk:number;night:boolean;weather:string;winter:number;autumn:number;spring:number;snow:number;day:number};
export type AtmospherePalette={sun:string;sunIntensity:number;hemiSky:string;hemiGround:string;hemiIntensity:number;fillIntensity:number;fog:string;fogDensity:number;
 skyZenith:string;skyMid:string;skyHorizon:string;skyGround:string;exposure:number;cloudCover:number;cloudShadow:number;saturation:number;contrast:number;warmth:number;haze:number};
const c=(h:string)=>new THREE.Color(h);
const mixHex=(a:string,b:string,t:number)=>'#'+c(a).lerp(c(b),Math.max(0,Math.min(1,t))).getHexString();
/** Everything the sky, sun, fog and grade need for one moment. Deterministic. */
export function painterAtmosphere(i:AtmosphereInput):AtmospherePalette{
 const e=Math.max(0,Math.min(1,i.elev)),low=1-Math.min(1,e*1.7),wx=i.weather;
 const overcast=wx==='storm'?1:wx==='rain'||wx==='flood'?.85:wx==='mist'?.7:wx==='frost'?.35:wx==='drought'?0:0;
 const goldenWeather=wx==='golden'?1:0;
 // Clear-day base: deep cobalt zenith, warm pale horizon.
 let zen='#3f78b8',mid='#82b2dc',hor='#d8e4e8',gnd='#b8b49a',sun='#fff0cf',hemiSky='#b7d3f0',hemiGround='#8a7a55',fog='#c6d8e3';
 // Low sun (dawn, dusk, late afternoon): amber horizon, violet-blue zenith.
 const warm=Math.max(i.dawn*.9,i.dusk*1,low*.75,goldenWeather);
 zen=mixHex(zen,'#4a5f9e',warm*.6);mid=mixHex(mid,'#c9a6a0',warm*.55);hor=mixHex(hor,'#f6b077',warm*.9);fog=mixHex(fog,'#e7bd93',warm*.75);
 sun=mixHex(sun,'#ff9a4e',Math.max(low*.85,Math.max(i.dawn,i.dusk)*.8));hemiSky=mixHex(hemiSky,'#9fb4de',warm*.4);hemiGround=mixHex(hemiGround,'#b8844f',warm*.6);hemiSky=mixHex(hemiSky,'#e8b898',warm*.25);
 // Seasons.
 if(i.autumn>.15){hor=mixHex(hor,'#eed2a4',i.autumn*.4);fog=mixHex(fog,'#dcc29a',i.autumn*.4);sun=mixHex(sun,'#ffd49a',i.autumn*.4);hemiGround=mixHex(hemiGround,'#9a7240',i.autumn*.4);}
 if(i.spring>.15){zen=mixHex(zen,'#4b86c8',i.spring*.3);fog=mixHex(fog,'#d2e4e2',i.spring*.3);}
 if(i.winter>.15||i.snow>.3){const k=Math.max(i.winter*.6,i.snow*.8);zen=mixHex(zen,'#6c8db5',k*.7);mid=mixHex(mid,'#b7c9da',k*.7);hor=mixHex(hor,'#dfe7ee',k*.7);fog=mixHex(fog,'#d6e0ea',k*.8);sun=mixHex(sun,'#eef2fb',k*.6);hemiSky=mixHex(hemiSky,'#cddcf0',k*.6);hemiGround=mixHex(hemiGround,'#7a8592',k*.6);}
 if(wx==='drought'){hor=mixHex(hor,'#ecd0a0',.6);fog=mixHex(fog,'#d9c093',.55);sun=mixHex(sun,'#ffd9a0',.5);}
 // Weather: grey the whole dome, soften the light.
 if(overcast>0){zen=mixHex(zen,wx==='storm'?'#4b5460':'#7c8894',overcast*.85);mid=mixHex(mid,'#8f9aa4',overcast*.85);hor=mixHex(hor,wx==='storm'?'#79838c':'#aab4bb',overcast*.9);fog=mixHex(fog,wx==='storm'?'#69737c':'#a4afb6',overcast*.9);sun=mixHex(sun,'#d8e0e8',overcast*.8);hemiSky=mixHex(hemiSky,'#a7b3bf',overcast*.8);}
 if(wx==='flood')fog=mixHex(fog,'#7f9894',.4);
 // Night: deep blue, moonlit.
 if(i.night){zen='#0b1430';mid='#182444';hor='#2c3b5e';gnd='#1a2236';fog='#273450';sun='#aebde6';hemiSky='#6a7db0';hemiGround='#2a3348';}
 gnd=mixHex(gnd,fog,.5);
 const sunIntensity=i.night?.7:(1.75+e*1.1+(i.dawn+i.dusk)*.45)*(1-overcast*.62)*(wx==='drought'?1.06:1)*(1-Math.max(i.winter,i.snow)*.1);
 const hemiIntensity=i.night?.8:(.9+e*.22+low*.5)*(1+overcast*.35);
 const fillIntensity=i.night?.35:.12+overcast*.18;
 const fogDensity=i.night?.0026:wx==='storm'?.0042:wx==='rain'||wx==='flood'?.0034:wx==='mist'?.0052:wx==='drought'?.0024:wx==='frost'?.0026:Math.max(.0013,.0015+i.snow*.001+warm*.0003);
 const exposure=(i.night?1.1:1.04+e*.06+warm*.2+i.winter*.08)*(wx==='storm'||wx==='flood'?.9:1);
 return {sun,sunIntensity,hemiSky,hemiGround,hemiIntensity,fillIntensity,fog,fogDensity,skyZenith:zen,skyMid:mid,skyHorizon:hor,skyGround:gnd,exposure,
  cloudCover:i.night?.35:wx==='storm'?1:wx==='rain'||wx==='flood'?.92:wx==='mist'?.7:wx==='frost'?.3:wx==='drought'?.12:.42+i.spring*.06,
  cloudShadow:i.night?0:(1-overcast*.55)*(wx==='drought'?.4:1)*.2,
  saturation:i.night?.8:.98+(1-overcast)*.06-Math.max(i.winter,i.snow)*.12,contrast:1.05+(1-overcast)*.04,warmth:i.night?0:.4+warm*.6+(1-overcast)*.2,haze:overcast*.5+warm*.2};
}

/** Sky dome: horizon-melting gradient, sun glow and disc, soft cumulus. Same sphere/transform as the classic dome. */
export function makePainterSky(){
 const uniforms={uZenith:{value:c('#3f78b8')},uMid:{value:c('#82b2dc')},uHorizon:{value:c('#d8e4e8')},uGround:{value:c('#b8b49a')},uSunDir:{value:new THREE.Vector3(.4,.6,.3).normalize()},uSun:{value:c('#fff0cf')},
  uTime:{value:0},uCover:{value:.42},uNight:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}`,
  fragmentShader:`uniform vec3 uZenith;uniform vec3 uMid;uniform vec3 uHorizon;uniform vec3 uGround;uniform vec3 uSunDir;uniform vec3 uSun;uniform float uTime;uniform float uCover;uniform float uNight;varying vec3 vDir;
   float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.)),f.x),f.y);}
   float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+vec2(7.3,3.1);a*=.5;}return s;}
   void main(){
    vec3 d=normalize(vDir);float y=d.y;
    vec3 col=mix(uHorizon,uMid,smoothstep(0.,.22,y));col=mix(col,uZenith,smoothstep(.12,.85,y));
    col=mix(col,uGround,smoothstep(0.,-.35,y)*(y<0.?1.:0.));
    float sd=max(dot(d,normalize(uSunDir)),0.);
    float glow=pow(sd,6.)*.34+pow(sd,48.)*.42;col+=uSun*glow*(1.-uNight*.8);
    float disc=smoothstep(.9992,.9997,sd);col=mix(col,uSun*1.6,disc*(1.-uNight*.6));
    if(y>0.){
     vec2 p=d.xz/(y+.32)*1.25+vec2(uTime*.006,uTime*.002);
     float n=fbm(p)*.72+fbm(p*2.7+3.)*.28;
     float cov=mix(.62,.34,uCover);
     float cloud=smoothstep(cov,cov+.2,n)*smoothstep(.0,.2,y);
     float lit=clamp(.55+.6*(fbm(p+uSunDir.xz*.35)-n)*4.+sd*.25,0.,1.2);
     vec3 cc=mix(uHorizon*.78+vec3(.02,.03,.05),uSun*.72+uHorizon*.38,clamp(lit,0.,1.));
     cc=mix(cc,cc*.55+uZenith*.25,uCover*uCover*.5);
     col=mix(col,cc,cloud*(.88-uNight*.55));
    }
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 return material;
}

/** Colour grade pass (runs on linear HDR, before the OutputPass tone map): split-toned contrast curve, saturation, vignette. */
export const PAINTER_GRADE_SHADER={
 uniforms:{tDiffuse:{value:null as THREE.Texture|null},uSat:{value:1.12},uContrast:{value:1.08},uWarm:{value:.6},uVignette:{value:.2},uShadowTint:{value:new THREE.Color('#e8f0ff')},uHighTint:{value:new THREE.Color('#fff0dc')},uHaze:{value:0}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uSat;uniform float uContrast;uniform float uWarm;uniform float uVignette;uniform vec3 uShadowTint;uniform vec3 uHighTint;uniform float uHaze;varying vec2 vUv;
  void main(){
   vec4 t=texture2D(tDiffuse,vUv);vec3 c=t.rgb;
   float l=dot(c,vec3(.2126,.7152,.0722));
   // contrast about mid grey, applied in a log-ish space so highlights are not clipped
   vec3 lc=log2(max(c,vec3(1e-4))/.18);lc=lc*uContrast;c=.18*exp2(lc);
   l=dot(c,vec3(.2126,.7152,.0722));
   float sh=1.-smoothstep(.0,.35,l),hi=smoothstep(.25,1.4,l);
   c*=mix(vec3(1.),uShadowTint,sh*.55);c*=mix(vec3(1.),uHighTint,hi*uWarm*.65);
   c=mix(vec3(l),c,uSat);
   c=mix(c,vec3(l)*vec3(.92,.98,1.04)+.012,uHaze*.35);
   vec2 q=(vUv-.5)*vec2(1.,.8);float v=1.-smoothstep(.28,.95,dot(q,q)*2.)*uVignette;c*=v;
   gl_FragColor=vec4(max(c,0.),t.a);
  }`};
