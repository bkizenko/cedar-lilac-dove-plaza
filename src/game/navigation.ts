/** Bounded A*, 1=walkable, eight directions with no corner cutting. */
export function findPath(
  grid: Uint8Array,
  width: number,
  start: number,
  goal: number,
  budget = 24000,
): number[] | null {
  if (start < 0 || goal < 0 || start >= grid.length || goal >= grid.length || !grid[goal])
    return null;
  if (start === goal) return [];
  const cost = new Float64Array(grid.length).fill(Infinity),
    from = new Int32Array(grid.length).fill(-1),
    closed = new Uint8Array(grid.length);
  const heap: { id: number; f: number }[] = [];
  const gx = goal % width,
    gz = Math.floor(goal / width);
  const h = (id: number) => {
    const x = Math.abs((id % width) - gx),
      z = Math.abs(Math.floor(id / width) - gz);
    return Math.max(x, z) + (Math.SQRT2 - 1) * Math.min(x, z);
  };
  const push = (id: number, f: number) => {
    heap.push({ id, f });
    let i = heap.length - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p].f <= heap[i].f) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let j = i * 2 + 1;
        if (j >= heap.length) break;
        if (j + 1 < heap.length && heap[j + 1].f < heap[j].f) j++;
        if (heap[i].f <= heap[j].f) break;
        [heap[i], heap[j]] = [heap[j], heap[i]];
        i = j;
      }
    }
    return top.id;
  };
  cost[start] = 0;
  push(start, h(start));
  while (heap.length && budget-- > 0) {
    const id = pop();
    if (closed[id]) continue;
    closed[id] = 1;
    if (id === goal) {
      const path = [];
      for (let n = goal; n !== start; n = from[n]) path.push(n);
      return path.reverse();
    }
    const x = id % width,
      z = Math.floor(id / width);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (
          (!dx && !dz) ||
          x + dx < 0 ||
          x + dx >= width ||
          z + dz < 0 ||
          z + dz >= grid.length / width
        )
          continue;
        const n = id + dz * width + dx;
        if (!grid[n] || closed[n] || (dx && dz && (!grid[id + dx] || !grid[id + dz * width])))
          continue;
        const g = cost[id] + (dx && dz ? Math.SQRT2 : 1);
        if (g < cost[n]) {
          cost[n] = g;
          from[n] = id;
          push(n, g + h(n));
        }
      }
  }
  return null;
}
