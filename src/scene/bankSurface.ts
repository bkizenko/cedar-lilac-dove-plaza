import * as THREE from 'three';
import { BANK_TERRAIN_RULES, type BankTerrain } from '../game/bankTerrain';
/** One sparse height atlas shared by fields, crops and their depth shadows. */
export class BankSurface {
    readonly uniforms = { bankTileMap: { value: new THREE.DataTexture(new Float32Array(1), 1, 1, THREE.RedFormat, THREE.FloatType) }, bankAtlas: { value: new THREE.DataTexture(new Float32Array(1), 1, 1, THREE.RedFormat, THREE.FloatType) }, bankInfo: { value: new THREE.Vector4(1, 1, 1, 0) }, bankAtlasSize: { value: new THREE.Vector2(1, 1) } };
    readonly size: number;
    private subdivisions: number = BANK_TERRAIN_RULES.subdivisions;
    get gridSubdivisions() { return this.subdivisions; }
    constructor(size: number) { this.size = size; for (const u of [this.uniforms.bankTileMap, this.uniforms.bankAtlas]) {
        u.value.minFilter = u.value.magFilter = THREE.NearestFilter;
        u.value.generateMipmaps = false;
        u.value.needsUpdate = true;
    } }
    update(terrain: BankTerrain) {
        this.subdivisions = terrain.subdivisions;
        const n = this.subdivisions + 1, columns = 16, rows = Math.max(1, Math.ceil(terrain.tiles.length / columns)), map = new Float32Array(terrain.width ** 2), atlas = new Float32Array(columns * n * rows * n);
        let index = 0;
        for (const tile of terrain.tiles) {
            map[tile.key] = index + 1;
            const tx = index % columns * n, tz = Math.floor(index / columns) * n;
            for (let z = 0; z < n; z++)
                for (let x = 0; x < n; x++)
                    atlas[(tz + z) * columns * n + tx + x] = tile.heights[z * n + x];
            index++;
        }
        const replace = (uniform: {
            value: THREE.DataTexture;
        }, data: Float32Array, w: number, h: number) => { uniform.value.dispose(); uniform.value = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.FloatType); uniform.value.minFilter = uniform.value.magFilter = THREE.NearestFilter; uniform.value.generateMipmaps = false; uniform.value.needsUpdate = true; };
        replace(this.uniforms.bankTileMap, map, terrain.width, terrain.width);
        replace(this.uniforms.bankAtlas, atlas, columns * n, rows * n);
        this.uniforms.bankInfo.value.set(terrain.tileSize, terrain.width, columns, index);
        this.uniforms.bankAtlasSize.value.set(columns * n, rows * n);
    }
    bind(shader: THREE.WebGLProgramParametersWithUniforms) { Object.assign(shader.uniforms, this.uniforms); }
    get glsl() {
        const n = this.subdivisions;
        return `
 uniform sampler2D bankTileMap;uniform sampler2D bankAtlas;uniform vec4 bankInfo;uniform vec2 bankAtlasSize;
 float refinedBankHeight(vec2 worldXZ,float fallbackHeight){
  if(bankInfo.w<.5)return fallbackHeight;
  vec2 grid=(worldXZ/${this.size.toFixed(1)}+.5)*bankInfo.y;
  vec2 tile=floor(grid);if(min(tile.x,tile.y)<0.||max(tile.x,tile.y)>=bankInfo.y)return fallbackHeight;
  float id=texture2D(bankTileMap,(tile+.5)/bankInfo.y).r-1.;if(id<-.5)return fallbackHeight;
  vec2 fine=fract(grid)*${n.toFixed(1)},cell=min(floor(fine),vec2(${(n - 1).toFixed(1)})),f=fine-cell;
  vec2 atlasTile=vec2(mod(id,bankInfo.z),floor(id/bankInfo.z))*${(n + 1).toFixed(1)};
  vec2 uv=(atlasTile+cell+.5)/bankAtlasSize,delta=1./bankAtlasSize;
  float a=texture2D(bankAtlas,uv).r,b=texture2D(bankAtlas,uv+vec2(delta.x,0.)).r,c=texture2D(bankAtlas,uv+vec2(0.,delta.y)).r,d=texture2D(bankAtlas,uv+delta).r;
  return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
 }
 `;
    }
    dispose() { this.uniforms.bankTileMap.value.dispose(); this.uniforms.bankAtlas.value.dispose(); }
}
