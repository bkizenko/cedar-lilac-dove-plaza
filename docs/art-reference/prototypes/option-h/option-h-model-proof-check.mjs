import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('../',import.meta.resolve('three')));
const file=new URL('./option-h-model-proof.html',import.meta.url),html=readFileSync(file,'utf8');
let source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
source=source.replace("https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js",'file://'+base+'build/three.module.js').replace("https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/utils/BufferGeometryUtils.js",'file://'+base+'examples/jsm/utils/BufferGeometryUtils.js').replace("new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'})",'globalThis.mockRenderer');
const context={fillRect(){},stroke(){},beginPath(){},moveTo(){},lineTo(){},ellipse(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(512*512*4).fill(238)};},putImageData(){},createRadialGradient(){return {addColorStop(){}};}};
const controls=new Map();function control(){return {value:'timber',listeners:{},dataset:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){}};}
const stage={clientWidth:736,clientHeight:540},canvas={...control(),parentElement:stage,setPointerCapture(){}};
const root={querySelector(q){if(q==='canvas')return canvas;if(!controls.has(q))controls.set(q,control());return controls.get(q);},querySelectorAll(){return [];}};
globalThis.document={getElementById(){return root;},createElement(){return {getContext(){return context;}};},documentElement:{}};
globalThis.window={addEventListener(){}};globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.ResizeObserver=globalThis.MutationObserver=class {observe(){}};
globalThis.mockRenderer={setPixelRatio(){},shadowMap:{},info:{render:{}},setSize(){},render(){}};
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const proof=window.__hProof;if(!proof)throw Error(controls.get('#h-proof-status').textContent);
function counters(){let triangles=0,meshes=0;proof.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return {triangles,meshes,houseMeshes:proof.homes.children.length};}
const signature=proof.homeSignature;proof.rebuildHomes();if(proof.homeSignature!==signature)throw Error('Seed not deterministic');const results=[];
for(const tradition of ['timber','reed','cliff']){controls.get('#h-tradition').value=tradition;for(const seed of [73031,88888]){controls.get('#h-seed').value=seed;controls.get('#h-rebuild').listeners.click();results.push({seed,tradition,...counters()});}}
if(new Set(results.map(x=>x.triangles)).size<3)throw Error('Variation did not affect geometry');
console.log(JSON.stringify({deterministic:true,baseline:results[0],variants:results,bytes:Buffer.byteLength(html)},null,2));
