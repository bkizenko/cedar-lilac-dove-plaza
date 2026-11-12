import type {BankSurface} from './bankSurface';
import * as THREE from 'three';
import {MAP} from '../game/constants';
import {ExcavationSurface} from './excavationSurface';

// One small height texture for every field. Keep the existing instanced draw
// calls instead of rebuilding a unique mesh for each growing plot.
export class FieldSurface {
  readonly excavations:ExcavationSurface;
  private readonly sharedCuts:boolean;private readonly banks?:BankSurface;
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
    material.customProgramCacheKey = () => (options.furrows?(options.painterly?'hearth-contour-field-painter-v1-cuts':'hearth-contour-field-v3-cuts'):'hearth-field-surface-v2-cuts')+(this.banks?`-banks-v19-${this.size}-${this.banks.gridSubdivisions}`:'');
    material.onBeforeCompile = shader => {
      this.excavations.bind(shader);this.banks?.bind(shader);
      shader.uniforms.fieldHeights = {value: this.texture};
      shader.vertexShader = `
        ${options.furrows?'attribute vec4 fieldRows;varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;':''}
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
        transformed.y += (fieldHeight(fieldWorld.xz) - fieldMatrix[3].y) / max(abs(fieldMatrix[1].y), .00001);
      `);
      if(options.furrows){
        shader.fragmentShader='varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float fieldAcross=dot(vFieldWorldXZ,vFieldRows.xy)+vFieldRows.z;
          ${options.painterly?`// Tilled earth: rounded ridges and shaded furrows, damp-dark troughs, per-plot clods and a breathing wash of colour.
          float fPhase=fieldAcross/max(.3,vFieldRows.w);
          float fBand=.5+.5*cos(fPhase*6.28318530718);
          float fFar=1.-smoothstep(45.,150.,length(vViewPosition));
          float fRidge=mix(.55,smoothstep(.12,.92,fBand),fFar);
          vec2 fCell=floor(vFieldWorldXZ*vec2(2.3,2.3));
          float fClod=fract(sin(dot(fCell,vec2(127.1,311.7)))*43758.5453);
          float fWash=.5+.5*sin(vFieldWorldXZ.x*.21+sin(vFieldWorldXZ.y*.17)*1.7);
          vec3 fSoil=mix(vec3(.56,.46,.38),vec3(1.16,1.04,.9),fRidge);
          fSoil*=.9+.16*mix(.5,fClod,fFar)+.08*fWash;
          diffuseColor.rgb*=fSoil;`:`float fieldBand=.5+.5*cos(fieldAcross/max(.3,vFieldRows.w)*6.28318530718);
          diffuseColor.rgb*=.86+.20*fieldBand;`}
        `);
        if(options.painterly)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          {float fP=(fieldAcross/max(.3,vFieldRows.w))*6.28318530718;vec3 fAcross=normalize((viewMatrix*vec4(vFieldRows.x,0.,vFieldRows.y,0.)).xyz);normal=normalize(normal+fAcross*(-sin(fP))*.42*(1.-smoothstep(45.,150.,length(vViewPosition))));}
        `);
      }
    };
  }

  dispose() { this.texture.dispose(); this.depth.dispose(); if(!this.sharedCuts)this.excavations.dispose(); }
}
