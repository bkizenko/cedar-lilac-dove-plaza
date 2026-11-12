// Inert stand-ins for three/addons post-processing so WorldView bundles without three's examples folder.
// Live-harness renders force quality 'low' (no composer), so none of these run.
class Stub{constructor(){this.enabled=false;this.uniforms={};this.renderTarget1={texture:{}};}setSize(){}render(){}addPass(){}dispose(){}setPixelRatio(){}}
export class EffectComposer extends Stub{}
export class RenderPass extends Stub{}
export class UnrealBloomPass extends Stub{}
export class ShaderPass extends Stub{}
export class FilmPass extends Stub{}
export class OutputPass extends Stub{}
