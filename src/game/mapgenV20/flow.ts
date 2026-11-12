/** Priority-flood depression filling, steepest-descent receivers and flow accumulation on a
 * vertex grid of `n` x `n` cells. Land cells drain to sea cells (sea[i]=1) or to a lake outlet. */
export const DX = [1, -1, 0, 0, 1, 1, -1, -1];
export const DZ = [0, 0, 1, -1, 1, -1, 1, -1];
const DIAG = Math.SQRT2;
export type Flow = {
  /** Filled surface: never lower than `h`, strictly decreasing along every flow path. */
  filled: Float32Array;
  /** Land cells in ascending filled height: receivers always come before their donors. */
  order: Int32Array;
  /** Receiver cell index, or -1 for sea cells. */
  rec: Int32Array;
};
class MinHeap {
  keys: Float64Array;
  ids: Int32Array;
  size = 0;
  constructor(capacity: number) {
    this.keys = new Float64Array(capacity + 1);
    this.ids = new Int32Array(capacity + 1);
  }
  push(key: number, id: number) {
    let i = this.size++;
    const keys = this.keys, ids = this.ids;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      keys[i] = keys[p];
      ids[i] = ids[p];
      i = p;
    }
    keys[i] = key;
    ids[i] = id;
  }
  pop() {
    const keys = this.keys, ids = this.ids, topId = ids[0];
    const n = --this.size;
    if (n > 0) {
      const key = keys[n], id = ids[n];
      let i = 0;
      for (;;) {
        let c = i * 2 + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= key) break;
        keys[i] = keys[c];
        ids[i] = ids[c];
        i = c;
      }
      keys[i] = key;
      ids[i] = id;
    }
    return topId;
  }
}
export function priorityFlood(h: Float32Array, n: number, sea: Uint8Array, cell: number, eps = 0.002, jitter?: Float32Array): Flow {
  const total = n * n, filled = new Float32Array(total), seen = new Uint8Array(total), rec = new Int32Array(total).fill(-1);
  const heap = new MinHeap(total), order = new Int32Array(total);
  let count = 0;
  for (let i = 0; i < total; i++) {
    if (sea[i]) {
      filled[i] = Math.min(0, h[i]);
      seen[i] = 1;
    }
  }
  // Seed with sea cells that touch land plus map-edge land cells (none in practice: edges are sea).
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = z * n + x;
      if (!sea[i]) continue;
      let edge = false;
      for (let k = 0; k < 8; k++) {
        const nx = x + DX[k], nz = z + DZ[k];
        if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
        if (!sea[nz * n + nx]) {
          edge = true;
          break;
        }
      }
      if (edge) heap.push(filled[i], i);
    }
  }
  while (heap.size) {
    const c = heap.pop(), cx = c % n, cz = (c / n) | 0, fc = filled[c];
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k], nz = cz + DZ[k];
      if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const j = nz * n + nx;
      if (seen[j]) continue;
      seen[j] = 1;
      const f = Math.max(h[j], fc + eps);
      filled[j] = f;
      rec[j] = c;
      order[count++] = j;
      heap.push(f, j);
    }
  }
  // Land cells never reached (should not happen) are treated as sea-adjacent flats.
  for (let i = 0; i < total; i++) {
    if (!seen[i]) {
      filled[i] = h[i];
      order[count++] = i;
    }
  }
  // Steepest descent among strictly lower neighbours; falls back to the flood parent.
  for (let t = 0; t < count; t++) {
    const i = order[t], x = i % n, z = (i / n) | 0, fi = filled[i];
    let best = rec[i], bestSlope = -1;
    for (let k = 0; k < 8; k++) {
      const nx = x + DX[k], nz = z + DZ[k];
      if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const j = nz * n + nx, fj = filled[j];
      if (fj >= fi) continue;
      const slope = ((fi - fj) / (k < 4 ? 1 : DIAG)) * (jitter ? jitter[j] : 1);
      if (slope > bestSlope) {
        bestSlope = slope;
        best = j;
      }
    }
    rec[i] = best;
  }
  return { filled, order: order.subarray(0, count), rec };
}
/** Accumulate `weight` (e.g. rainfall * cell area) downstream. Returns total upstream weight per cell. */
export function accumulate(flow: Flow, weight: Float32Array | number, total: number): Float32Array {
  const acc = new Float32Array(total);
  for (let i = 0; i < total; i++) acc[i] = typeof weight === 'number' ? weight : weight[i];
  const { order, rec } = flow;
  for (let t = order.length - 1; t >= 0; t--) {
    const i = order[t], r = rec[i];
    if (r >= 0) acc[r] += acc[i];
  }
  return acc;
}
