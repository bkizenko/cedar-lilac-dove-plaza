// Stand-in for three/addons/utils/BufferGeometryUtils.js, used ONLY when three's examples/jsm folder is not installed
// (the authoring sandbox ships build/ only). Same contract for the calls the scene code makes: mergeGeometries(list).
import { BufferGeometry, BufferAttribute } from 'three';
export function mergeGeometries(list) {
  const gs = list.map(g => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(gs[0].attributes).filter(n => gs.every(g => g.attributes[n]));
  const out = new BufferGeometry();
  for (const n of names) {
    const a0 = gs[0].attributes[n], size = a0.itemSize, total = gs.reduce((s, g) => s + g.attributes[n].count, 0), arr = new Float32Array(total * size);
    let o = 0; for (const g of gs) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new BufferAttribute(arr, size, a0.normalized));
  }
  return out;
}
export const mergeVertices = g => g;
