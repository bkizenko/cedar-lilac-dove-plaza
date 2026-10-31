import * as THREE from 'three';
import {MAP} from '../game/constants';

// One small height texture for every field. Keep the existing instanced draw
// calls instead of rebuilding a unique mesh for each growing plot.
export class FieldSurface {
  readonly texture: THREE.DataTexture;
  readonly segments:number;
  readonly size:number;
  readonly depth = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking});

  constructor(heights: Float32Array,size=MAP) {
    this.size=size;
    this.segments=Math.round(Math.sqrt(heights.length))-1;
    this.texture = new THREE.DataTexture(heights, this.segments + 1, this.segments + 1, THREE.RedFormat, THREE.FloatType);
    this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    this.bind(this.depth);
  }

  bind(material: THREE.Material,options:{furrows?:boolean}={}) {
    material.customProgramCacheKey = () => options.furrows?'hearth-contour-field-v2':'hearth-field-surface-v1';
    material.onBeforeCompile = shader => {
      shader.uniforms.fieldHeights = {value: this.texture};
      shader.vertexShader = `
        ${options.furrows?'attribute vec4 fieldRows;varying vec4 vFieldRows;varying vec2 vFieldWorldXZ;':''}
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
          return f.x + f.y <= 1. ? a + (b-a)*f.x + (c-a)*f.y
            : d + (c-d)*(1.-f.x) + (b-d)*(1.-f.y);
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
          float fieldBand=.5+.5*cos(fieldAcross/max(.3,vFieldRows.w)*6.28318530718);
          diffuseColor.rgb*=.86+.20*fieldBand;
        `);
      }
    };
  }

  dispose() { this.texture.dispose(); this.depth.dispose(); }
}
