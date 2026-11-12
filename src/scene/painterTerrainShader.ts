/** GLSL for the painterly terrain surface. Injected by TerrainSurface.bind into MeshStandardMaterial's fragment shader (same attributes and
 * uniforms as the classic surface, plus the baked terrain light field). Nothing here moves a vertex. */
import {rockPaletteGLSL} from './painterGeology';
export const PAINTER_NOISE_GLSL=`
 float pHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
 float pNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(pHash(i),pHash(i+vec2(1.,0.)),f.x),mix(pHash(i+vec2(0.,1.)),pHash(i+vec2(1.)),f.x),f.y);}
 float pFbm(vec2 p){return pNoise(p)*.55+pNoise(p*2.07+vec2(5.2,1.3))*.3+pNoise(p*4.3+vec2(1.7,9.2))*.15;}
`;
export const PAINTER_FRAGMENT_PARS=`
 uniform sampler2D terrainLight;uniform vec4 pCloud;uniform vec3 pSunDir;uniform vec3 pSunColor;uniform vec2 pWind;uniform vec4 pSnowCfg;uniform sampler2D pContactMap;uniform float pContactStrength;
 varying vec4 vGeoRock;varying vec4 vGeoState;
 ${PAINTER_NOISE_GLSL}
 ${rockPaletteGLSL()}
 // scattered rounded stones: x = coverage mask, y = per-stone shade. scale is stones per metre, cover is the fraction of cells holding a stone
 vec2 pStones(vec2 p,float scale,float cover){
  vec2 q=p*scale,c=floor(q),f=fract(q);float h=pHash(c);
  vec2 ctr=.5+(vec2(pHash(c+3.7),pHash(c+8.1))-.5)*.55;float r=.2+.24*pHash(c+5.3);
  float d=length((f-ctr)*vec2(1.,1.+pHash(c+2.2)*.5));
  return vec2(smoothstep(r,r*.55,d)*step(h,cover),pHash(c+11.3));
 }
 // dried-mud polygons: x = crack line, y = plate id hash
 vec2 pCracks(vec2 p){
  vec2 c=floor(p),f=fract(p);float d1=9.,d2=9.;float id=0.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)),g=o+vec2(pHash(c+o),pHash(c+o+17.3))-f;float d=dot(g,g);
   if(d<d1){d2=d1;d1=d;id=pHash(c+o+5.1);}else if(d<d2)d2=d;}
  return vec2(1.-smoothstep(.0,.07,sqrt(d2)-sqrt(d1)),id);
 }
 // bedded rock by family. y is height (m, including the regional dip), u runs along the contour. joint returns how deep the joint shadow is.
 vec3 pRockStrata(vec4 rw,float y0,float u,float fineK,out float joint){
  // fractured blocks: neighbouring columns of the face have slipped by a fraction of a bed, so beds step instead of tracing smooth contour lines
  float y=y0+(pHash(vec2(floor(u/5.3),7.7))-.5)*1.3+(pNoise(vec2(u*.31,y0*.4))-.5)*.45+(pNoise(vec2(u*.07+y0*.03,y0*.06))-.5)*3.2;
  vec3 col=vec3(0.);float tw=0.,jt=0.;float sh=max(0.,1.-rw.x-rw.y-rw.z-rw.w);
  if(rw.x>.01){ // sandstone: wavy cross-bedded layers, iron-stained bands, dark joints under each ledge
   float b=y/1.25+(pNoise(vec2(u*.035,y*.12))-.5)*.5;float id=floor(b),f=fract(b);
   float h0=pHash(vec2(id,3.1)),h1=pHash(vec2(id,9.7)),h2=pHash(vec2(id,17.3));
   vec3 c=mix(mix(SANDSTONE_0,SANDSTONE_1,h0),mix(SANDSTONE_2,SANDSTONE_3,h1),step(.55,h2))*(.78+.44*pHash(vec2(id,21.)));
   c*=1.+sin(b*34.+pNoise(vec2(u*.8,y*2.))*4.)*.05*fineK;
   float stain=smoothstep(.55,.8,pNoise(vec2(floor(y/3.9)*7.1,u*.06)));c=mix(c,c*vec3(1.12,.86,.7),stain*.45);
   float dk=smoothstep(.0,.1,f);c=mix(SANDSTONE_J*1.6,c,.76+.24*dk);jt+=rw.x*(1.-dk);col+=c*rw.x;tw+=rw.x;
  }
  if(rw.y>.01){ // limestone: thick cream beds, vertical dissolution streaks
   float b=y/2.1+(pNoise(vec2(u*.03,y*.1))-.5)*.4;float id=floor(b),f=fract(b);
   vec3 c=mix(mix(LIMESTONE_0,LIMESTONE_1,pHash(vec2(id,5.3))),mix(LIMESTONE_2,LIMESTONE_3,pHash(vec2(id,11.9))),.5)*(.86+.28*pHash(vec2(id,23.)));
   float karst=smoothstep(.62,.85,pNoise(vec2(u*1.25,y*.16)));c=mix(c,LIMESTONE_J*1.3+vec3(.02),karst*.35);
   c*=1.+(pNoise(vec2(u*3.1,y*3.1))-.5)*.12*fineK;
   float dk=smoothstep(0.,.07,f);c=mix(LIMESTONE_J*1.8,c,.82+.18*dk);jt+=rw.y*(1.-dk)*.8;col+=c*rw.y;tw+=rw.y;
  }
  if(rw.z>.01){ // basalt: dark columns with joint lines, rusty tiers
   float cu=u*1.2+(pNoise(vec2(y*.05,u*.05))-.5)*.4;float cid=floor(cu),cf=fract(cu);
   vec3 c=mix(BASALT_0,BASALT_1,pHash(vec2(cid,1.7)));c=mix(c,BASALT_2,smoothstep(.6,.9,pHash(vec2(cid,6.1)))*.7);
   float edge=smoothstep(.0,.07,cf)*smoothstep(1.,.93,cf);c=mix(BASALT_J*2.,c,.7+.3*edge);
   float tier=floor(y/5.5+pHash(vec2(cid,2.)));c=mix(c,BASALT_3,smoothstep(.7,1.,pHash(vec2(tier,cid*.3)))*.4);
   c*=1.+(pNoise(vec2(u*5.,y*1.4))-.5)*.14*fineK;jt+=rw.z*(1.-edge)*.9;col+=c*rw.z;tw+=rw.z;
  }
  if(rw.w>.01){ // granite: massive blocks split by orthogonal joints, pink feldspar, salt-and-pepper grain
   float bu=u/3.2,by=y/2.7+floor(bu)*.37;float bid=floor(by)+floor(bu)*13.;float f1=fract(by),f2=fract(bu);
   vec3 c=mix(GRANITE_0,GRANITE_1,pNoise(vec2(u*.17,y*.2)));c=mix(c,GRANITE_2,smoothstep(.55,.8,pHash(vec2(bid,4.2)))*.7);c=mix(c,GRANITE_3,smoothstep(.7,.9,pHash(vec2(bid,8.8)))*.5);
   float jn=min(smoothstep(0.,.05,f1),smoothstep(0.,.05,f2));c=mix(GRANITE_J*1.7,c,.74+.26*jn);
   c*=1.+(pHash(floor(vec2(u,y)*11.))-.5)*.16*fineK;jt+=rw.w*(1.-jn)*.9;col+=c*rw.w;tw+=rw.w;
  }
  if(sh>.01){ // shale: thin dark flaky beds
   float b=y/.9+(pNoise(vec2(u*.08,y*.3))-.5)*.9;float id=floor(b),f=fract(b);
   vec3 c=mix(mix(SHALE_0,SHALE_1,pHash(vec2(id,2.9))),mix(SHALE_2,SHALE_3,pHash(vec2(id,13.1))),.5);
   c*=1.+(pNoise(vec2(u*2.2,y*5.))-.5)*.2*fineK;
   float dk=smoothstep(.0,.15,f);c=mix(SHALE_J*1.5,c,.8+.2*dk);jt+=sh*(1.-dk)*.5;col+=c*sh;tw+=sh;
  }
  joint=jt/max(tw,.001);return col/max(tw,.001);
 }
 vec3 pRockMean(vec4 rw){float sh=max(0.,1.-rw.x-rw.y-rw.z-rw.w);return SANDSTONE_1*rw.x+LIMESTONE_1*rw.y+BASALT_1*rw.z+GRANITE_1*rw.w+SHALE_1*sh;}
 vec3 pSoilOf(vec4 rw){float sh=max(0.,1.-rw.x-rw.y-rw.z-rw.w);return SANDSTONE_SOIL*rw.x+LIMESTONE_SOIL*rw.y+BASALT_SOIL*rw.z+GRANITE_SOIL*rw.w+SHALE_SOIL*sh;}
`;
/** After #include <color_fragment>: albedo mottling, flowers, soil, rock strata, sand ripple, shore wetness, plus the shared light-field terms. */
export function painterColor(size:number,biomes:boolean){const dbg=(globalThis as {__PAINTER_DEBUG?:string}).__PAINTER_DEBUG;return `
    vec3 pN=normalize(vSurfaceNormal);
    float pSlope=1.-pN.y;
    vec2 pW=vSurfaceWorld.xz;
    // on steep faces the xz projection stretches every noise along the contour (hatching); project onto the face instead
    vec2 pTan=normalize(vec2(-pN.z,pN.x)+1e-4);
    vec2 pWu=mix(pW,vec2(dot(pW,pTan),vSurfaceWorld.y*.3),smoothstep(.3,.5,pSlope));
    float pDist=length(vViewPosition);
    float pNear=1.-smoothstep(12.,62.,pDist);
    float pMid=1.-smoothstep(70.,360.,pDist);
    vec4 pLm=texture2D(terrainLight,pW/${size.toFixed(1)}+.5);
    float pSand=clamp(vSurfaceSand,0.,1.)*(1.-surfaceSnow*.9);
    float pNA=pNoise(pW/58.+vec2(3.1,7.7))*.65+pNoise(pW/26.+vec2(5.2,1.3))*.35;
    float pNB=pNoise(pWu/15.+vec2(9.2,1.3))*.7+pNoise(pWu/6.8+vec2(1.7,9.2))*.3;
    float pNC=pDist<70.?mix(.5,pNoise(pWu/3.2+vec2(5.,2.)),1.-smoothstep(20.,70.,pDist)):.5;
    float pND=pDist<26.?mix(.5,pNoise(pWu*vec2(4.6,12.)+vec2(1.,8.)),1.-smoothstep(5.,26.,pDist)):.5;
    float pRockRaw=clamp(vSurfaceRock,0.,1.)*(1.-pSand);
    float pRock=smoothstep(.26,.6,pRockRaw+(pNB-.5)*.36+(pNC-.5)*.2*pNear);
    float pSnow=clamp(surfaceSnow,0.,1.);
    float pGrass=(1.-pRock)*(1.-pSand)*(1.-pSnow*.92);
    float pOrganic=${biomes?'vBiomeCover.x':'.62'};
    float pLitter=${biomes?'vBiomeCover.y':'.2'};
    float pDamp=${biomes?'vBiomeCover.w':'.3'};
    float pDry=clamp(1.-pDamp*1.5-pOrganic*.35,0.,1.);
    // geology: rock family weights, soil depth, scree, height above the local water, bed tilt
    vec4 pRW=vGeoRock;float pSoilD=clamp(vGeoState.x,0.,1.),pScree=clamp(vGeoState.y,0.,1.),pRel=vGeoState.z,pTilt=vGeoState.w;
    vec3 pBase=diffuseColor.rgb;
    // 1. broad lush / dry patches and layered luminance mottle (soft painted wash, fades with distance)
    float pLush=smoothstep(.32,.7,pNA);
    vec3 pLushTint=mix(vec3(1.09,1.02,.74),vec3(.9,1.05,.96),pLush*(.55+pDamp*.5));
    pBase=mix(pBase,pBase*pLushTint,.62*pGrass*smoothstep(.08,.55,pOrganic));
    float pMottle=1.+(pNA-.5)*.3+(pNB-.5)*.26*pMid+(pNC-.5)*.2*pNear+(pND-.5)*.16*pNear;
    pBase*=mix(1.,pMottle,.35+.65*pGrass);
    // 2. trodden soil and leaf litter patches inside vegetation, then the ground cover itself: tufts, litter, moss
    float pSoil=smoothstep(.62,.84,pNB*.6+pNA*.5+pLitter*.12-.1)*pGrass;
    pBase=mix(pBase,vec3(.30,.205,.115)*(.9+pNC*.3),pSoil*(.18+pLitter*.3)*pMid);
    ${dbg&&dbg.includes('nocover')?'if(false)':''}if(pNear>.01&&pGrass>.05){
     vec2 pTc=floor(pW/1.15);float pTh=pHash(pTc);
     vec2 pTp=fract(pW/1.15)-.5-(vec2(pHash(pTc+2.3),pHash(pTc+9.1))-.5)*.5;float pTd=length(pTp);
     float pTuft=step(pTh,.55*pOrganic+.15)*smoothstep(.34,.08,pTd);
     float pTRim=smoothstep(.1,.3,pTd)*smoothstep(.46,.3,pTd)*step(pTh,.55*pOrganic+.15);
     pBase*=1.-pTuft*.16*pNear*pGrass;pBase=mix(pBase,pBase*vec3(1.14,1.1,.8),pTRim*.35*pNear*pGrass);
     // leaf litter: fallen leaves on the woodland floor, small coloured specks
     vec2 pLq=pW*4.2;vec2 pLc=floor(pLq);float pLh=pHash(pLc+4.4);
     float pLeaf=step(1.-pLitter*.55*(1.-pDry*.5),pLh)*smoothstep(.34,.1,length(fract(pLq)-.5))*pNear*pGrass;
     vec3 pLcol=mix(vec3(.38,.22,.09),vec3(.55,.34,.1),pHash(pLc+9.9));pLcol=mix(pLcol,vec3(.3,.18,.07),step(.8,pHash(pLc+1.7)));
     pBase=mix(pBase,pLcol,pLeaf*.7);
     // moss on the shaded, damp ground
     float pMg=smoothstep(.48,.78,pNoise(pW/2.6+vec2(7.,3.)))*pDamp*(1.-pLm.g*.55)*pNear*pGrass;
     pBase=mix(pBase,vec3(.16,.27,.08)*(.8+pNC*.4),pMg*.5);
    }
    // 3. meadow flowers: sparse coloured dots, near the camera only
    ${biomes?`vec2 pFc=floor(pW/.62);float pFh=pHash(pFc);
    if(pFh>.935&&pNear>.01){vec2 pFp=fract(pW/.62)-.5-(vec2(pHash(pFc+3.1),pHash(pFc+7.7))-.5)*.5;float pFm=smoothstep(.15,.04,length(pFp))*pNear*pGrass*smoothstep(.45,.95,pOrganic);
     vec3 pFcol=pFh>.985?vec3(.95,.93,.86):pFh>.96?vec3(.93,.76,.18):pFh>.948?vec3(.6,.36,.7):vec3(.82,.3,.24);pBase=mix(pBase,pFcol,pFm*.85);}`:''}
    // 3b. exposed soil where the cover is thin (steep banks, wind-scoured knolls), in the colour of the rock that weathered into it; dry plates crack
    ${dbg&&dbg.includes('nobare')?'pSoilD=1.;':''}
    float pBare=(1.-pRock)*(1.-pSand)*(1.-pSnow)*smoothstep(.34,.03,pSoilD+(pNB-.5)*.5)*(1.-pScree*.6);
    if(pBare>.03){
     vec3 pSoilCol=mix(pSoilOf(pRW),vec3(.34,.27,.19),.4)*(.86+pNC*.28+(pND-.5)*.12*pNear);
     if(pSlope>.12){float pRill=smoothstep(.55,.85,pNoise(vec2(dot(pW,pTan)*2.1,vSurfaceWorld.y*.45)));pSoilCol*=1.-pRill*.14*smoothstep(.12,.4,pSlope);}
     if(pDry>.35&&pNear>.05){vec2 pCk=pCracks(pW*.62+pNoise(pW/5.)*.6);pSoilCol=mix(pSoilCol*(.9+pCk.y*.2),pSoilCol*.52,pCk.x*.8*pNear);}
     pBase=mix(pBase,pSoilCol,pBare*.82);
    }
    // 3c. desert pavement: dark varnished stones over pale fines on flat, dry, thin ground
    float pPave=pDry*smoothstep(.3,.0,pSoilD+pSlope*.8)*(1.-pRock)*(1.-pSand)*(1.-pSnow)*pNear;
    if(pPave>.03){vec2 pSt=pStones(pW,3.3,.8);vec3 pStc=pRockMean(pRW)*(.45+pSt.y*.55);pBase=mix(pBase,pStc,pSt.x*pPave*.85);}
    // 4. rock: bedded strata by family, fracture darkening, warm/cool lichen. Gentle outcrops get patchwork beds, only faces read the horizon lines.
    float pU=dot(pW,pTan);
    float pFace=smoothstep(.5,.85,pSlope);
    float pJoint=0.;
    ${dbg&&dbg.includes('norock')?'if(false)':''}if(pRock>.02){
     float pFineK=1.-smoothstep(50.,200.,pDist);
     vec3 pStrata=pRockStrata(pRW,vSurfaceWorld.y+pTilt,pU,pFineK,pJoint);
     // gentle slopes keep the rock's mean colour in broad patches (no contour stripes); only real faces show the beds
     vec3 pPatch=pRockMean(pRW)*(.82+pNB*.36+(pNC-.5)*.2*pNear);
     float pBedK=pFace*mix(.35,1.,smoothstep(.3,.7,pNoise(vec2(pU*.045,vSurfaceWorld.y*.03+4.))))*(1.-smoothstep(90.,320.,pDist)*.7);
     pStrata=mix(pPatch,pStrata,pBedK);pJoint*=pBedK;
     float pSteepFade=1.-smoothstep(.45,.8,pSlope);
     vec2 pWall=mix(pW*vec2(1.,.6),vec2(pU,vSurfaceWorld.y),smoothstep(.12,.34,pSlope));
     float pCrack=(1.-smoothstep(0.,.14,abs(pNoise(pWall*vec2(.55,.28)+3.)-.5)))*(1.-smoothstep(30.,140.,pDist))*pSteepFade;
     vec3 pRockCol=pStrata*(.93+pNB*.14)*(1.-pCrack*.12*pMid)*(1.-pJoint*.18*mix(.5,1.,pNear));
     // weathering: pale lichen and warm desert varnish on the open faces, shaded cool bottoms
     pRockCol=mix(pRockCol,pRockCol*vec3(1.1,1.04,.88),smoothstep(.55,.8,pNB)*.5);
     pRockCol*=1.-.22*smoothstep(.55,.0,pLm.r)*pFace;
     // desert varnish: dark rain streaks running down the faces
     pRockCol*=1.-smoothstep(.5,.9,pNoise(vec2(pU*.85,vSurfaceWorld.y*.045+pNoise(vec2(pU*.2,0.))*2.)))*.3*pFace*pMid;
     pBase=mix(pBase,pRockCol,pRock);
     float pMoss=smoothstep(.58,.8,pNoise(pW/5.+4.))*(1.-smoothstep(.2,.45,pSlope))*pRock;
     pBase=mix(pBase,vec3(.27,.36,.17),pMoss*.3*pMid*(.4+pDamp));
    }
    // 4b. scree and talus aprons: angular chips in the rock's own colour, thickest right under the face
    float pScM=pScree*(1.-pRock*.8)*smoothstep(.1,.5,pScree*(.65+pNB*.7))*(1.-pSnow*.8);
    if(pScM>.02){
     vec2 pCh=pStones(pW,1.7,.9),pCh2=pStones(pW+9.,5.2,.85);vec3 pMean=pRockMean(pRW);
     vec3 pDeb=pMean*(.5+pCh.y*.6)*mix(1.,.8+pCh2.y*.4,pNear);
     pDeb=mix(pDeb,pMean*.62+pSoilOf(pRW)*.3,(1.-max(pCh.x,pCh2.x*pNear))*.7);
     pBase=mix(pBase,pDeb,pScM*.88);
    }
    // 5. dunes and sand: ripples run across the wind, long slip-faced crests, windward sides paler
    float pRip=.5;
    float pSandish=max(pSand,pDry*smoothstep(.4,.0,pSoilD)*(1.-pRock)*.55);
    if(pSandish>.03){
     float pAlong=dot(pW,pWind);float pAcross=dot(pW,vec2(-pWind.y,pWind.x));
     pRip=fract(pAlong*.95+pNoise(vec2(pAcross*.18,pAlong*.05))*2.2);pRip=pow(pRip,.65);
     float pCrest=fract(pAlong/15.+pNoise(vec2(pAcross/36.,pAlong/50.))*.9);float pLee=smoothstep(.0,.78,pCrest)-smoothstep(.78,1.,pCrest);
     pBase*=1.+(pRip-.5)*.13*pSandish*pNear+(pND-.5)*.07*pSand*pNear;
     pBase*=1.+(pLee-.5)*.2*pSand*pMid;
     pBase=mix(pBase,pBase*vec3(1.08,.97,.82),pSand*smoothstep(.3,.9,pNoise(pW/9.))*.4);
    }
    // 6. water margins: wet dark band, bleached dry strand with pebbles, shallow bed gravel and sand bars, deep silt
    float pWetD=pLm.b*16.0;
    float pWet=1.-smoothstep(.15,2.1+pNoise(pW/3.4)*1.7,pWetD);
    pBase=mix(pBase,pBase*vec3(.6,.57,.52),pWet*.78);
    float pTide=smoothstep(2.0,2.8,pWetD)*(1.-smoothstep(2.8,4.4,pWetD))*pSand;
    pBase=mix(pBase,pBase*1.12+.02,pTide*.35);
    float pStrand=smoothstep(.3,.8,pRel)*(1.-smoothstep(1.2,2.6,pRel+pNoise(pW/2.4)*.8))*(1.-pRock)*(1.-pSnow);
    if(pStrand>.02&&pNear>.02){vec2 pSb=pStones(pW,4.4,.6);vec3 pSbc=pRockMean(pRW)*(.7+pSb.y*.7)+vec3(.05);pBase=mix(pBase*vec3(1.06,1.03,.94),pSbc,pSb.x*pStrand*.8*pNear);}
    float pBed=smoothstep(.03,-.2,pRel);
    if(pBed>.01){
     float pBar=smoothstep(.52,.72,pNoise(pW/8.5+vec2(3.,9.)))*(1.-smoothstep(.6,1.6,-pRel));
     vec2 pGr=pStones(pW,5.1,.85);vec2 pGr2=pStones(pW+4.3,11.,.8);
     vec3 pGravel=mix(pRockMean(pRW)*.9+vec3(.03),pRockMean(pRW)*.45,pGr.y)*mix(1.,.8+pGr2.y*.4,pNear);
     vec3 pBedCol=mix(pBase,pGravel,max(pGr.x,pGr2.x*.8*pNear)*(1.-pBar)*.8*(1.-smoothstep(1.4,3.,-pRel)));
     pBedCol=mix(pBedCol,vec3(.82,.72,.5)*(.9+pRip*.14),pBar*.85);
     pBedCol*=1.-smoothstep(1.2,5.,-pRel)*.55;pBedCol=mix(pBedCol,pBedCol*vec3(.7,.9,.95),smoothstep(1.,4.,-pRel)*.5);
     pBase=mix(pBase,pBedCol,pBed);
    }
    // 7. snow: a line that falls through the seasons, deeper in shaded hollows, stripped from cliff faces except on ledges
    float pSnowAmt=0.;
    if(pSnow>.01){
     float pSnowLine=mix(pSnowCfg.x,pSnowCfg.y,pSnow)+(pNoise(pW/23.)-.5)*5.+(pNB-.5)*3.;
     float pPocket=(1.-pLm.r)*7.+(1.-pLm.g)*5.;
     pSnowAmt=pSnow*smoothstep(-2.,2.5,vSurfaceWorld.y+pPocket-pSnowLine)*(1.-smoothstep(.5,.95,pSlope)*.75)*(1.-pWet*.8)*(1.-pBed);
     pSnowAmt=clamp(pSnowAmt+pSnow*.28*smoothstep(.3,.0,pSlope),0.,1.);
     pBase=mix(pBase,vec3(.9,.93,.97)*(.93+pNC*.1),pSnowAmt*.92);
    }
    diffuseColor.rgb=${dbg==='vc'?'diffuseColor.rgb':dbg==='nrm'?'pN*.5+.5':dbg==='bank'?'vec3(0.,vSurfaceRock,vSurfaceSand)':dbg==='geo'?'vGeoRock.xyz*.8+vec3(vGeoState.y)':'pBase'};
    float pCloudShade=pCloud.x*smoothstep(.46,.64,pFbm((pW+vec2(pCloud.y*2.4,pCloud.y*1.1))/200.))*(1.-smoothstep(520.,1600.,pDist));
    float pAO=mix(1.,pLm.r,.72);
    float pSun=mix(1.,pLm.g,.9);
    // soft contact shadow where walls meet the ground (footprint coverage map, painterContact.ts)
    float pContact=texture2D(pContactMap,pW/${size.toFixed(1)}+.5).r*pContactStrength;
    pAO*=1.-pContact*.6;pSun*=1.-pContact*.3;
    diffuseColor.rgb*=1.-pContact*.12;
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
    float pBump=((pNC-.5)*.5+(pND-.5)*.35+(pNB-.5)*.2)*pNear*pGrass+((pNB-.5)*.5+(pNoise(pWu/2.3)-.5)*.16*pNear)*pRock*pMid+(pRip-.5)*.35*pSand*pNear;
    normal=surfacePerturb(-vViewPosition,normal,pBump*(1.-smoothstep(.4,.7,pSlope))*mix(${grassStrength.toFixed(3)},${rockStrength.toFixed(3)},pRock)*(1.-pSnow*.5));
`;
