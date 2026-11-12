/** GLSL for the painterly terrain surface. Injected by TerrainSurface.bind into MeshStandardMaterial's fragment shader (same attributes and
 * uniforms as the classic surface, plus the baked terrain light field). Nothing here moves a vertex. */
export const PAINTER_NOISE_GLSL=`
 float pHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float pNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(pHash(i),pHash(i+vec2(1.,0.)),f.x),mix(pHash(i+vec2(0.,1.)),pHash(i+vec2(1.)),f.x),f.y);}
 float pFbm(vec2 p){return pNoise(p)*.55+pNoise(p*2.07+vec2(5.2,1.3))*.3+pNoise(p*4.3+vec2(1.7,9.2))*.15;}
`;
export const PAINTER_FRAGMENT_PARS=`
 uniform sampler2D terrainLight;uniform vec4 pCloud;uniform vec3 pSunDir;uniform vec3 pSunColor;
 ${PAINTER_NOISE_GLSL}
`;
/** After #include <color_fragment>: albedo mottling, flowers, soil, rock strata, sand ripple, shore wetness, plus the shared light-field terms. */
export function painterColor(size:number,biomes:boolean){const dbg=(globalThis as {__PAINTER_DEBUG?:string}).__PAINTER_DEBUG;return `
    vec3 pN=normalize(vSurfaceNormal);
    float pSlope=1.-pN.y;
    vec2 pW=vSurfaceWorld.xz;
    // on steep faces the xz projection stretches every noise along the contour (hatching); project onto the face instead
    vec2 pTan=normalize(vec2(-pN.z,pN.x)+1e-4);
    vec2 pWu=mix(pW,vec2(dot(pW,pTan),vSurfaceWorld.y),smoothstep(.12,.34,pSlope));
    float pDist=length(vViewPosition);
    float pNear=1.-smoothstep(14.,85.,pDist);
    float pMid=1.-smoothstep(70.,360.,pDist);
    vec4 pLm=texture2D(terrainLight,pW/${size.toFixed(1)}+.5);
    float pSand=clamp(vSurfaceSand,0.,1.)*(1.-surfaceSnow*.9);
    float pNA=pFbm(pW/58.+vec2(3.1,7.7));
    float pNB=pFbm(pWu/15.+vec2(9.2,1.3));
    float pNC=mix(.5,pNoise(pWu/3.2+vec2(5.,2.)),1.-smoothstep(25.,90.,pDist));
    float pND=mix(.5,pNoise(pWu*vec2(4.6,12.)+vec2(1.,8.)),1.-smoothstep(5.,26.,pDist));
    float pRockRaw=clamp(vSurfaceRock,0.,1.)*(1.-pSand);
    float pRock=smoothstep(.26,.6,pRockRaw+(pNB-.5)*.36+(pNC-.5)*.2*pNear);
    float pSnow=clamp(surfaceSnow,0.,1.);
    float pGrass=(1.-pRock)*(1.-pSand)*(1.-pSnow*.92);
    float pOrganic=${biomes?'vBiomeCover.x':'.62'};
    float pLitter=${biomes?'vBiomeCover.y':'.2'};
    float pDamp=${biomes?'vBiomeCover.w':'.3'};
    vec3 pBase=diffuseColor.rgb;
    // 1. broad lush / dry patches and layered luminance mottle (soft painted wash, fades with distance)
    float pLush=smoothstep(.32,.7,pNA);
    vec3 pLushTint=mix(vec3(1.09,1.02,.74),vec3(.9,1.05,.96),pLush*(.55+pDamp*.5));
    pBase=mix(pBase,pBase*pLushTint,.62*pGrass*smoothstep(.08,.55,pOrganic));
    float pMottle=1.+(pNA-.5)*.3+(pNB-.5)*.26*pMid+(pNC-.5)*.2*pNear+(pND-.5)*.16*pNear;
    pBase*=mix(1.,pMottle,.35+.65*pGrass);
    // 2. trodden soil and leaf litter patches inside vegetation
    float pSoil=smoothstep(.62,.84,pNB*.6+pNA*.5+pLitter*.12-.1)*pGrass;
    pBase=mix(pBase,vec3(.30,.205,.115)*(.9+pNC*.3),pSoil*(.18+pLitter*.3)*pMid);
    // 3. meadow flowers: sparse coloured dots, near the camera only
    ${biomes?`vec2 pFc=floor(pW/.62);float pFh=pHash(pFc);
    if(pFh>.935&&pNear>.01){vec2 pFp=fract(pW/.62)-.5-(vec2(pHash(pFc+3.1),pHash(pFc+7.7))-.5)*.5;float pFm=smoothstep(.15,.04,length(pFp))*pNear*pGrass*smoothstep(.45,.95,pOrganic);
     vec3 pFcol=pFh>.985?vec3(.95,.93,.86):pFh>.96?vec3(.93,.76,.18):pFh>.948?vec3(.6,.36,.7):vec3(.82,.3,.24);pBase=mix(pBase,pFcol,pFm*.85);}`:''}
    // 4. rock: strata bands, fracture darkening, warm/cool lichen
    vec2 pWall=mix(pW*vec2(1.,.6),vec2(dot(pW,pTan),vSurfaceWorld.y),smoothstep(.12,.34,pSlope));
    float pSteepFade=1.-smoothstep(.45,.8,pSlope);
    float pStrata=mix(.5,sin(vSurfaceWorld.y*2.9+pNoise(pWall/6.)*2.5)*.5+.5,(1.-smoothstep(30.,140.,pDist))*pSteepFade);
    float pCrack=(1.-smoothstep(0.,.14,abs(pNoise(pWall*vec2(.55,.28)+3.)-.5)))*(1.-smoothstep(30.,140.,pDist))*pSteepFade;
    vec3 pRockCol=pBase*(.9+pStrata*.2)*(1.-pCrack*.12*pMid);
    pRockCol=mix(pRockCol,pRockCol*vec3(1.08,.98,.86),smoothstep(.55,.8,pNB));
    pBase=mix(pBase,pRockCol,pRock);
    float pMoss=smoothstep(.58,.8,pNoise(pW/5.+4.))*(1.-smoothstep(.2,.45,pSlope))*pRock;
    pBase=mix(pBase,vec3(.27,.36,.17),pMoss*.3*pMid);
    // 5. dune / beach sand ripple
    float pRip=sin(dot(pW,vec2(.9,.36))*2.6+pNoise(pW/7.)*6.)*.5+.5;
    pBase*=1.+(pRip-.5)*.1*pSand*pNear+(pND-.5)*.08*pSand*pNear;
    // 6. shore wetness from the light field: dark, saturated margin that breathes with a slow noise
    float pWetD=pLm.b*16.0;
    float pWet=1.-smoothstep(.15,2.1+pNoise(pW/3.4)*1.7,pWetD);
    pBase=mix(pBase,pBase*vec3(.6,.57,.52),pWet*.78);
    float pTide=smoothstep(2.0,2.8,pWetD)*(1.-smoothstep(2.8,4.4,pWetD))*pSand;
    pBase=mix(pBase,pBase*1.12+.02,pTide*.35);
    // 7. snow keeps its sparkle-free soft white
    pBase=mix(pBase,pBase*(.93+pNC*.1),pSnow);
    diffuseColor.rgb=${dbg==='vc'?'diffuseColor.rgb':dbg==='nrm'?'pN*.5+.5':dbg==='bank'?'vec3(0.,vSurfaceRock,vSurfaceSand)':'pBase'};
    float pCloudShade=pCloud.x*smoothstep(.46,.64,pFbm((pW+vec2(pCloud.y*2.4,pCloud.y*1.1))/200.))*(1.-smoothstep(520.,1600.,pDist));
    float pAO=mix(1.,pLm.r,.72);
    float pSun=mix(1.,pLm.g,.9);
`;}
export const painterLight=`
    #include <aomap_fragment>
    reflectedLight.directDiffuse*=pSun*(1.-pCloudShade)*mix(1.,pAO,.45);
    reflectedLight.directSpecular*=pSun*(1.-pCloudShade)*(1.-pWet*.5);
    reflectedLight.indirectDiffuse*=pAO*(.92+(pLm.a-.5)*.3);
    // cool skylight fills the places the sun does not reach
    reflectedLight.indirectDiffuse+=diffuseColor.rgb*(1.-pSun*(1.-pCloudShade*.6))*vec3(.07,.1,.15);
`;
export const painterRoughness=`
    #include <roughnessmap_fragment>
    roughnessFactor=clamp(mix(.97,.82,pRock)-pWet*.26+(pND-.5)*.06,.62,1.);
    roughnessFactor=mix(roughnessFactor,.6,pSnow*.6);
`;
export const painterNormal=(rockStrength:number,grassStrength:number)=>`
    #include <normal_fragment_maps>
    float pBumpFar=1.-smoothstep(60.,220.,pDist);
    float pBump=((pNC-.5)*.5+(pND-.5)*.35+(pNB-.5)*.2)*pNear*pGrass+(pStrata*.14+(pNB-.5)*.5-pCrack*.4)*pRock*pMid+(pRip-.5)*.35*pSand*pNear;
    normal=surfacePerturb(-vViewPosition,normal,pBump*(1.-smoothstep(.4,.7,pSlope))*mix(${grassStrength.toFixed(3)},${rockStrength.toFixed(3)},pRock)*(1.-pSnow*.5));
`;
