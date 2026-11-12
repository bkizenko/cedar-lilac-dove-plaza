// Stand-in for three/addons/postprocessing/{EffectComposer,RenderPass,ShaderPass,UnrealBloomPass,FilmPass,OutputPass}.js, used ONLY when three's
// examples/jsm folder is not installed (the authoring sandbox ships build/ only). Same pass contract as the real addons, so WorldView's composer
// chain (render -> bloom -> vignette ShaderPass -> film -> OutputPass tone map + sRGB) is exercised exactly; bloom is a simplified blur-and-add.
import * as THREE from 'three';
const quadGeo = new THREE.BufferGeometry();
quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
quadGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
class FullScreenQuad {
  constructor(material) { this._mesh = new THREE.Mesh(quadGeo, material); this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); }
  get material() { return this._mesh.material; } set material(m) { this._mesh.material = m; }
  render(r) { r.render(this._mesh, this.camera); } dispose() { this._mesh.geometry = null; }
}
export class Pass { constructor() { this.enabled = true; this.needsSwap = true; this.clear = false; this.renderToScreen = false; } setSize() { } render() { } dispose() { } }
export class EffectComposer {
  constructor(renderer, rt) {
    this.renderer = renderer; const size = renderer.getSize(new THREE.Vector2()); this._pixelRatio = renderer.getPixelRatio(); this._width = size.x; this._height = size.y;
    if (!rt) rt = new THREE.WebGLRenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, { type: THREE.HalfFloatType });
    this.renderTarget1 = rt; this.renderTarget2 = rt.clone(); this.writeBuffer = this.renderTarget1; this.readBuffer = this.renderTarget2; this.renderToScreen = true; this.passes = [];
  }
  swapBuffers() { const t = this.readBuffer; this.readBuffer = this.writeBuffer; this.writeBuffer = t; }
  addPass(p) { this.passes.push(p); p.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio); }
  render(dt) {
    const enabled = this.passes.filter(p => p.enabled), last = enabled[enabled.length - 1];
    for (const p of enabled) { p.renderToScreen = this.renderToScreen && p === last; p.render(this.renderer, this.writeBuffer, this.readBuffer, dt, false); if (p.needsSwap) this.swapBuffers(); }
  }
  setSize(w, h) { this._width = w; this._height = h; const W = w * this._pixelRatio, H = h * this._pixelRatio; this.renderTarget1.setSize(W, H); this.renderTarget2.setSize(W, H); for (const p of this.passes) p.setSize(W, H); }
  setPixelRatio(r) { this._pixelRatio = r; this.setSize(this._width, this._height); }
  dispose() { this.renderTarget1.dispose(); this.renderTarget2.dispose(); for (const p of this.passes) p.dispose(); }
}
export class RenderPass extends Pass {
  constructor(scene, camera) { super(); this.scene = scene; this.camera = camera; this.needsSwap = false; this.clear = true; }
  render(r, w, read) { r.setRenderTarget(this.renderToScreen ? null : read); r.clear(); r.render(this.scene, this.camera); }
}
export class ShaderPass extends Pass {
  constructor(shader, textureID = 'tDiffuse') {
    super(); this.textureID = textureID;
    this.uniforms = shader.uniforms instanceof Object ? THREE.UniformsUtils.clone(shader.uniforms) : shader.uniforms;
    this.material = new THREE.ShaderMaterial({ name: shader.name || 'ShaderPass', defines: Object.assign({}, shader.defines), uniforms: this.uniforms, vertexShader: shader.vertexShader, fragmentShader: shader.fragmentShader });
    this.fsQuad = new FullScreenQuad(this.material);
  }
  render(r, w, read) { if (this.uniforms[this.textureID]) this.uniforms[this.textureID].value = read.texture; this.fsQuad.material = this.material; r.setRenderTarget(this.renderToScreen ? null : w); if (this.clear) r.clear(); this.fsQuad.render(r); }
  dispose() { this.material.dispose(); }
}
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, intensity: { value: .5 }, grayscale: { value: false } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float intensity; uniform bool grayscale; uniform float time; uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); float x=vUv.x*vUv.y*time*1000.; x=mod(x,13.)*mod(x,123.); float dx=mod(x,.01); vec3 cr=c.rgb+c.rgb*clamp(.1+dx*100.,0.,1.); cr=c.rgb+clamp(intensity,0.,1.)*(cr-c.rgb); gl_FragColor=vec4(cr,c.a); }'
};
export class FilmPass extends ShaderPass {
  constructor(intensity = .5, grayscale = false) { super(FilmShader); this.uniforms.intensity.value = intensity; this.uniforms.grayscale.value = grayscale; }
  render(r, w, read, dt) { this.uniforms.time.value += dt || .016; super.render(r, w, read); }
}
export class OutputPass extends ShaderPass {
  constructor() {
    super({
      name: 'OutputShader', uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv;\n#include <tonemapping_pars_fragment>\n#include <colorspace_pars_fragment>\nvoid main(){ gl_FragColor=texture2D(tDiffuse,vUv);\n#ifdef LINEAR_TONE_MAPPING\n gl_FragColor.rgb=LinearToneMapping(gl_FragColor.rgb);\n#elif defined(NEUTRAL_TONE_MAPPING)\n gl_FragColor.rgb=NeutralToneMapping(gl_FragColor.rgb);\n#elif defined(ACES_FILMIC_TONE_MAPPING)\n gl_FragColor.rgb=ACESFilmicToneMapping(gl_FragColor.rgb);\n#elif defined(AGX_TONE_MAPPING)\n gl_FragColor.rgb=AgXToneMapping(gl_FragColor.rgb);\n#endif\n \n#ifdef SRGB_TRANSFER\n gl_FragColor=sRGBTransferOETF(gl_FragColor);\n#endif\n}'
    });
    const m = this.material; this.material = new THREE.RawShaderMaterial({ name: 'OutputShader', uniforms: m.uniforms, defines: {},
      vertexShader: 'precision highp float; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; attribute vec3 position; attribute vec2 uv; varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'precision highp float; uniform sampler2D tDiffuse; varying vec2 vUv;\n' + m.fragmentShader.split('varying vec2 vUv;')[1] }); this.fsQuad.material = this.material; this._tm = null;
  }
  render(r, w, read) {
    const tm = r.toneMapping, key = String(tm);
    if (this._tm !== key) { const d = this.material.defines; for (const k of Object.keys(d)) delete d[k]; if (tm === THREE.NeutralToneMapping) d.NEUTRAL_TONE_MAPPING = ''; else if (tm === THREE.ACESFilmicToneMapping) d.ACES_FILMIC_TONE_MAPPING = ''; else if (tm === THREE.AgXToneMapping) d.AGX_TONE_MAPPING = ''; else if (tm === THREE.LinearToneMapping) d.LINEAR_TONE_MAPPING = ''; d.SRGB_TRANSFER = ''; this.material.needsUpdate = true; this._tm = key; }
    this.uniforms.toneMappingExposure.value = r.toneMappingExposure;
    super.render(r, w, read);
  }
}
const blurShader = (dir) => ({
  uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, dir: { value: dir } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform vec2 texel; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 s=texture2D(tDiffuse,vUv).rgb*.227; for(int i=1;i<5;i++){ float w=i==1?.19:i==2?.12:i==3?.06:.02; vec2 o=dir*texel*float(i)*1.6; s+=(texture2D(tDiffuse,vUv+o).rgb+texture2D(tDiffuse,vUv-o).rgb)*w; } gl_FragColor=vec4(s,1.); }'
});
export class UnrealBloomPass extends Pass {
  constructor(resolution, strength = 1, radius = 0, threshold = 0) {
    super(); this.resolution = resolution; this.strength = strength; this.radius = radius; this.threshold = threshold; this.needsSwap = true;
    this.a = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType }); this.b = this.a.clone(); this.c = this.a.clone();
    this.high = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, th: { value: threshold } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float th; varying vec2 vUv; void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float l=dot(c,vec3(.299,.587,.114)); gl_FragColor=vec4(c*smoothstep(th,th+.01,l),1.); }' });
    this.bh = new THREE.ShaderMaterial(blurShader(new THREE.Vector2(1, 0))); this.bv = new THREE.ShaderMaterial(blurShader(new THREE.Vector2(0, 1)));
    this.add = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, k: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform sampler2D tBloom; uniform float k; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); gl_FragColor=vec4(c.rgb+texture2D(tBloom,vUv).rgb*k,c.a); }', depthTest: false, depthWrite: false });
    this.q = new FullScreenQuad(this.high);
  }
  setSize(w, h) { const W = Math.max(8, w >> 1), H = Math.max(8, h >> 1); for (const t of [this.a, this.b, this.c]) t.setSize(W, H); this.bh.uniforms.texel.value.set(1 / W, 1 / H); this.bv.uniforms.texel.value.set(1 / W, 1 / H); }
  render(r, w, read) {
    this.high.uniforms.th.value = this.threshold; this.high.uniforms.tDiffuse.value = read.texture; this.q.material = this.high; r.setRenderTarget(this.a); r.clear(); this.q.render(r);
    for (let i = 0; i < 3; i++) { this.bh.uniforms.tDiffuse.value = this.a.texture; this.q.material = this.bh; r.setRenderTarget(this.b); this.q.render(r); this.bv.uniforms.tDiffuse.value = this.b.texture; this.q.material = this.bv; r.setRenderTarget(this.a); this.q.render(r); }
    this.add.uniforms.tDiffuse.value = read.texture; this.add.uniforms.tBloom.value = this.a.texture; this.add.uniforms.k.value = this.strength * 2; this.q.material = this.add; r.setRenderTarget(this.renderToScreen ? null : w); this.q.render(r);
  }
  dispose() { this.a.dispose(); this.b.dispose(); this.c.dispose(); }
}
