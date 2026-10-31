import * as THREE from 'three';
import {MAP, SEGS} from '@/game/constants';

// One small height texture for every field. Keep the existing instanced draw
// calls instead of rebuilding a unique mesh for each growing plot.
export class FieldSurface {
  readonly texture: THREE.DataTexture;
  readonly depth = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking});

  constructor(heights: Float32Array) {
    this.texture = new THREE.DataTexture(heights, SEGS + 1, SEGS + 1, THREE.RedFormat, THREE.FloatType);
    this.texture.minFilter = this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    this.bind(this.depth);
  }

  bind(material: THREE.Material) {
    material.customProgramCacheKey = () => 'hearth-field-surface-v1';
    material.onBeforeCompile = shader => {
      shader.uniforms.fieldHeights = {value: this.texture};
      shader.vertexShader = `
        uniform sampler2D fieldHeights;
        float fieldHeight(vec2 worldXZ) {
          vec2 grid = clamp((worldXZ / ${MAP.toFixed(1)} + .5) * ${SEGS.toFixed(1)}, vec2(0.), vec2(${SEGS.toFixed(1)}));
          vec2 cell = min(floor(grid), vec2(${(SEGS - 1).toFixed(1)}));
          vec2 f = grid - cell;
          vec2 uv = (cell + .5) / ${(SEGS + 1).toFixed(1)};
          float stepUV = 1. / ${(SEGS + 1).toFixed(1)};
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
        transformed.y += (fieldHeight(fieldWorld.xz) - fieldMatrix[3].y) / max(abs(fieldMatrix[1].y), .00001);
      `);
    };
  }

  dispose() { this.texture.dispose(); this.depth.dispose(); }
}
