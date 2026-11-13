import type {BankSurface} from './bankSurface';
import * as THREE from 'three';
import {MAP,BUILDINGS} from '../game/constants';
import {ExcavationSurface} from './excavationSurface';

/** Painterly tilled-field shading: irregular, noise-warped plot edge (square corners rounded, merged edges left straight), ridge and
 * furrow that follows the contour and meanders a little, one look per crop stage, weeds, stone terrace lips on slopes, and the Water
 * mode tint. All colours here are muted on purpose. */
const FIELD_GLSL_HEAD=`varying vec4 vFieldEdges;varying vec4 vFieldLook;varying vec4 vFieldSoil;varying vec2 vFieldLocal;varying vec2 vFieldHalf;uniform float fieldWaterMode;
float fHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fHash(i),fHash(i+vec2(1.,0.)),f.x),mix(fHash(i+vec2(0.,1.)),fHash(i+vec2(1.,1.)),f.x),f.y);}
vec3 fLin(vec3 c){return pow(c,vec3(2.2));}
`;
const FIELD_GLSL_COLOUR=`
          float fStage=vFieldLook.x,fGrade=vFieldLook.w;
          vec2 fRowN=vFieldRows.xy,fRowT=vec2(-fRowN.y,fRowN.x);
          // Plot edge: stretched along the rows so the outline follows the contour, merged sides stay straight.
          float dW=vFieldHalf.x+vFieldLocal.x,dE=vFieldHalf.x-vFieldLocal.x,dN=vFieldHalf.y+vFieldLocal.y,dS=vFieldHalf.y-vFieldLocal.y;
          if(vFieldEdges.x>.5)dW=99.;if(vFieldEdges.y>.5)dE=99.;if(vFieldEdges.z>.5)dN=99.;if(vFieldEdges.w>.5)dS=99.;
          vec2 fCorner=vec2(min(dW,dE),min(dN,dS));
          float fHalfMin=min(min(vFieldHalf.x,vFieldHalf.y),14.),fRr=1.8+.16*fHalfMin;
          float fIn=(fCorner.x<fRr&&fCorner.y<fRr)?fRr-length(vec2(fRr)-fCorner):min(fCorner.x,fCorner.y);
          // Same formula as fieldInset() in src/game/fieldLook.ts, so hedges and walls sit on this edge.
          float fWave=.55*sin(dot(vFieldWorldXZ,vec2(.2,.13))+vFieldLook.z*6.28)+.3*sin(dot(vFieldWorldXZ,vec2(-.31,.52))+vFieldLook.z*17.)+.15*sin(dot(vFieldWorldXZ,vec2(.9,-.7))+vFieldLook.z*29.);
          float fEdge=fIn-(.6+(1.+.22*fHalfMin)*(.5+.5*fWave))-(fNoise(vFieldWorldXZ*1.3)-.5)*.35;
          if(fEdge<0.)discard;
          // Ridge and furrow: meanders slightly; strong on bare ground, soft under a crop.
          float fAcrossW=fieldAcross+(fNoise(vFieldWorldXZ*.16)-.5)*1.1;
          float fBand=.5+.5*cos(fAcrossW/max(.3,vFieldRows.w)*6.28318530718);
          float fFar=1.-smoothstep(45.,150.,length(vViewPosition));
          float fAmp=fStage<.5?1.:fStage<1.5?.8:fStage<2.5?.45:fStage<3.5?.35:fStage<4.5?.8:.3;
          float fRidge=mix(.5,smoothstep(.1,.95,fBand),fFar*fAmp);
          vec3 fSoilC=fLin(vFieldSoil.rgb);
          vec3 fCol=fSoilC*mix(.88,1.1,fRidge);
          vec2 fCell=floor(vFieldWorldXZ*vec2(2.3,2.3));
          float fClod=fHash(fCell);
          fCol*=.92+.12*mix(.5,fClod,fFar)+.07*(fNoise(vFieldWorldXZ*.21)-.5)*2.;
          // Stage: faint seedling dust, a crop-coloured understorey, straw stubble, weedy fallow. Plants themselves are separate instances.
          float fDots=smoothstep(.55,.8,fNoise(vFieldWorldXZ*6.+vFieldLook.z*13.));
          // Plants are small at RTS range, so the stage also tints the whole plot (muted, ridge-modulated).
          float fMod=.88+.2*fBand;
          if(fStage>.5&&fStage<1.5)fCol=mix(fCol,fLin(vec3(.45,.55,.3))*fMod,.25+.35*fDots);
          else if(fStage<2.5&&fStage>1.5)fCol=mix(fCol,fLin(vec3(.34,.5,.24))*fMod,.8);
          else if(fStage<3.5&&fStage>2.5)fCol=mix(fCol,fLin(vec3(.78,.66,.34))*fMod,.85);
          else if(fStage<4.5&&fStage>3.5)fCol=mix(fCol,fLin(vec3(.7,.62,.43))*(.86+.26*fBand),.7);
          float fWeedN=fNoise(vFieldWorldXZ*.7+5.)*.65+fNoise(vFieldWorldXZ*2.6)*.35;
          float fWeed=smoothstep(.5,.72,fWeedN)*vFieldSoil.a;
          fCol=mix(fCol,fLin(vec3(.36,.4,.23))*(.9+.2*fClod),fWeed*.75);
          // Terrace lip: on steeper ground the rows step down with a worn stone/earth lip.
          float fTer=smoothstep(.22,.42,fGrade);
          if(fTer>0.){float fT=fAcrossW/max(1.4,.55/max(.12,fGrade));float fRise=fract(fT);float fLip=1.-smoothstep(0.,.07,fRise);fCol*=1.-.06*fTer*fRise;fCol=mix(fCol,fLin(vec3(.44,.4,.33)),fLip*fTer*.7*fFar);}
          // Soil blends into the surrounding ground at the rim; the rim itself is a little drier.
          vec3 fGround=fLin(vec3(.37,.36,.22));
          float fRim=1.-smoothstep(0.,2.4,fEdge+(fNoise(vFieldWorldXZ*1.7)-.5)*1.6);
          fCol=mix(fCol,fGround,fRim*.6);
          // Water mode: irrigated plots cool and dark, dry plots pale and sandy.
          if(fieldWaterMode>.5){
           if(vFieldLook.y>1.5)fCol=mix(fCol,fLin(vec3(.2,.34,.38)),.5);
           else if(vFieldLook.y>.5)fCol=mix(fCol,fLin(vec3(.66,.55,.36)),.4);
           if(fEdge<.55)fCol=mix(fCol,vFieldLook.y>1.5?fLin(vec3(.5,.74,.72)):fLin(vec3(.78,.66,.42)),.85);
          }
          diffuseColor.rgb=fCol;`;

// One small height texture for every field. Keep the existing instanced draw
// calls instead of rebuilding a unique mesh for each growing plot.
export class FieldSurface {
  readonly excavations:ExcavationSurface;
  private readonly sharedCuts:boolean;private readonly banks?:BankSurface;
  /** Shared by every painterly field material: 1 shows irrigated and dry plots in the Water mode tint. */
  readonly waterMode={value:0};
  readonly texture: THREE.DataTexture;
  readonly segments:number;
  readonly size:number;
  readonly depth = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking});

  constructor(heights: Float32Array,size=MAP,banks?:BankSurface,cuts?:ExcavationSurface) {
    this.banks=banks;this.sharedCuts=!!cuts;
    this.size=size;
    this.excavations=cuts??new ExcavationSurface(size);
    this.segments=Math.round(Math.sqrt(heights.length))-1;
    this.texture = new THREE.DataTexture(heights, this.segments + 1, this.segments + 1, THREE.RedFormat, THREE.FloatType);
    this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    this.bind(this.depth);
  }

  bind(material: THREE.Material,options:{furrows?:boolean;painterly?:boolean}={}) {
    material.customProgramCacheKey = () => (options.furrows?(options.painterly?'hearth-contour-field-painter-v2-cuts':'hearth-contour-field-v3-cuts'):'hearth-field-surface-v2-cuts')+(this.banks?`-banks-v19-${this.size}-${this.banks.gridSubdivisions}`:'');
    material.onBeforeCompile = shader => {
      this.excavations.bind(shader);this.banks?.bind(shader);
      shader.uniforms.fieldHeights = {value: this.texture};
      if(options.painterly)shader.uniforms.fieldWaterMode=this.waterMode;
      shader.vertexShader = `
        ${options.furrows?'attribute vec4 fieldRows;varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;':''}
        ${options.painterly?'attribute vec4 fieldEdges;attribute vec4 fieldLook;attribute vec4 fieldSoil;varying vec4 vFieldEdges;varying vec4 vFieldLook;varying vec4 vFieldSoil;varying vec2 vFieldLocal;varying vec2 vFieldHalf;':''}
        ${this.banks?.glsl??''}
        ${this.excavations.glsl}
        uniform sampler2D fieldHeights;
        float fieldHeight(vec2 worldXZ) {
          vec2 grid = clamp((worldXZ / ${this.size.toFixed(1)} + .5) * ${this.segments.toFixed(1)}, vec2(0.), vec2(${this.segments.toFixed(1)}));
          vec2 cell = min(floor(grid), vec2(${(this.segments - 1).toFixed(1)}));
          vec2 f = grid - cell;
          vec2 uv = (cell + .5) / ${(this.segments + 1).toFixed(1)};
          float stepUV = 1. / ${(this.segments + 1).toFixed(1)};
          float a = texture2D(fieldHeights, uv).r;
          float b = texture2D(fieldHeights, uv + vec2(stepUV, 0.)).r;
          float c = texture2D(fieldHeights, uv + vec2(0., stepUV)).r;
          float d = texture2D(fieldHeights, uv + vec2(stepUV)).r;
          // Match the terrain plane's actual triangles, including valley creases.
          float baseHeight=f.x + f.y <= 1. ? a + (b-a)*f.x + (c-a)*f.y
            : d + (c-d)*(1.-f.x) + (b-d)*(1.-f.y);
          return refinedExcavationHeight(worldXZ,${this.banks?'refinedBankHeight(worldXZ,baseHeight)':'baseHeight'});
        }
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        mat4 fieldMatrix = modelMatrix;
        #ifdef USE_INSTANCING
          fieldMatrix = modelMatrix * instanceMatrix;
        #endif
        vec3 fieldWorld = (fieldMatrix * vec4(transformed, 1.)).xyz;
        ${options.furrows?'vFieldRows=fieldRows;vFieldWorldXZ=fieldWorld.xz;':''}
        ${options.painterly?`vec2 fieldScale=vec2(length(fieldMatrix[0].xyz),length(fieldMatrix[2].xyz));vFieldLocal=transformed.xz*fieldScale;vFieldHalf=vec2(${(BUILDINGS.farm.w/2).toFixed(3)},${(BUILDINGS.farm.d/2).toFixed(3)})*fieldScale;vFieldEdges=fieldEdges;vFieldLook=fieldLook;vFieldSoil=fieldSoil;`:''}
        transformed.y += (fieldHeight(fieldWorld.xz) - fieldMatrix[3].y) / max(abs(fieldMatrix[1].y), .00001);
      `);
      if(options.furrows){
        shader.fragmentShader='varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;\n'+(options.painterly?FIELD_GLSL_HEAD:'')+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float fieldAcross=dot(vFieldWorldXZ,vFieldRows.xy)+vFieldRows.z;
          ${options.painterly?FIELD_GLSL_COLOUR:`float fieldBand=.5+.5*cos(fieldAcross/max(.3,vFieldRows.w)*6.28318530718);
          diffuseColor.rgb*=.86+.20*fieldBand;`}
        `);
        if(options.painterly)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          {float fP=(fAcrossW/max(.3,vFieldRows.w))*6.28318530718;vec3 fAcross=normalize((viewMatrix*vec4(vFieldRows.x,0.,vFieldRows.y,0.)).xyz);normal=normalize(normal+fAcross*(-sin(fP))*.3*fAmp*(1.-smoothstep(45.,150.,length(vViewPosition))));}
        `);
      }
    };
  }

  dispose() { this.texture.dispose(); this.depth.dispose(); if(!this.sharedCuts)this.excavations.dispose(); }
}
