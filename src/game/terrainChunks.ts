/** Chunked terrain data and query interface (world-scale slice 1; design in docs/WORLD_SCALE_DESIGN.md).
 *
 * Pure data, no three.js, no simulation state, not wired into the renderer or sim: the old whole-grid terrain stays the default path.
 * The contract that makes streaming safe is simple: a chunk is a *pure function of (source, lod, cx, cz, edits)*. Every vertex height and
 * geology cell is a pure function of its world coordinates, so two chunks that share a border compute the identical value at every shared
 * vertex, a coarse chunk's vertices are a subset of the fine chunk's vertices (no cracks between LODs apart from the unsampled
 * midpoints), and evicting then rebuilding a chunk returns the same bytes.
 *
 * Coordinates are world metres, centred like the game (x,z in [-extent/2, extent/2]). Chunk (cx,cz) at lod L covers
 * [cx*span, (cx+1)*span) with span = 256 m * 2^L and always carries 65 x 65 vertices (spacing 4 m * 2^L). */
import {Noise} from './mapgen/noise';
import type {WorldData} from './worldgen';

export const CHUNK_RULES = Object.freeze({
  version: 1,
  /** cells per chunk side at every LOD (vertices = cells + 1) */
  cells: 64,
  /** vertex spacing at LOD 0, metres (the legacy grid is 4.0625 m; 4 m keeps chunk borders on whole metres) */
  baseSpacing: 4,
  maxLod: 5,
  /** vertical clamp shared with mapgen */
  maxHeight: 144,
  /** default cache budget: about 2,400 chunks of 38 KB */
  defaultMemoryBytes: 96 * 1024 * 1024,
  /** quadtree split rule: a chunk is refined while its nearest point is within splitFactor * span of the focus */
  splitFactor: 2.2,
  /** detail octaves added over a stretched macro field (metres of relief at full strength) */
  detailMetres: 1.4,
});

export type GeologyCell = {rock: number; under: number; strata: number; soil: number; landform: number};
/** What a chunk is generated from. A source is any deterministic field over world metres. */
export type TerrainSource = {
  readonly seed: number;
  /** side of the square (centred) region the source covers, metres; outside it the source returns its edge value */
  readonly extent: number;
  readonly waterY: number;
  readonly hasGeology: boolean;
  heightAt(x: number, z: number): number;
  geologyAt(x: number, z: number, out: GeologyCell): boolean;
};
export type TerrainEdit = {id: number; x: number; z: number; radius: number; /** metres removed at the centre (negative raises) */ depth: number};
export type TerrainChunk = {
  readonly key: string; readonly lod: number; readonly cx: number; readonly cz: number;
  /** world metres of the chunk's minimum corner, and its side */
  readonly x0: number; readonly z0: number; readonly span: number; readonly spacing: number; readonly n: number;
  readonly heights: Float32Array;
  readonly geology: {rock: Uint8Array; under: Uint8Array; strata: Uint8Array; soil: Uint8Array; landform: Uint8Array} | null;
  readonly minY: number; readonly maxY: number; readonly bytes: number;
};

export const chunkSpan = (lod: number) => CHUNK_RULES.cells * CHUNK_RULES.baseSpacing * 2 ** lod;
export const chunkSpacing = (lod: number) => CHUNK_RULES.baseSpacing * 2 ** lod;
export const chunkKey = (lod: number, cx: number, cz: number) => `${lod}:${cx}:${cz}`;
export function parseChunkKey(key: string) { const [lod, cx, cz] = key.split(':').map(Number); return {lod, cx, cz}; }
export const chunkAt = (lod: number, x: number, z: number) => ({cx: Math.floor(x / chunkSpan(lod)), cz: Math.floor(z / chunkSpan(lod))});
export function chunkBytes() { const v = (CHUNK_RULES.cells + 1) ** 2; return v * 4 + v * 5; }

/* ---------------------------------------------------------------- sources */

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const cubic = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));

export type WorldSourceOptions = {
  seed: number;
  /** linear stretch of the generated map: 1 = the map as it is, 10 = a world ten times wider and deeper (macro tier; see design doc) */
  scale?: number;
  /** metres of added fine relief over a stretched field; default 0 at scale 1 (exact legacy heights), CHUNK_RULES.detailMetres above */
  detail?: number;
};

/** A source over an existing generated world. At scale 1 and detail 0 it reproduces the legacy triangle-sampled terrain exactly at the legacy
 * grid points; at scale > 1 the world is a smooth (Catmull-Rom) stretch of the same map with deterministic fine detail. */
export function sourceFromWorld(world: Pick<WorldData, 'size' | 'segs' | 'heights' | 'waterY' | 'mapgen'>, options: WorldSourceOptions): TerrainSource {
  const scale = options.scale ?? 1, size = world.size, segs = world.segs, n = segs + 1, heights = world.heights, waterY = world.waterY;
  if (!(scale >= 1) || !Number.isFinite(scale)) throw new Error('scale must be a finite number >= 1');
  const detail = options.detail ?? (scale === 1 ? 0 : CHUNK_RULES.detailMetres);
  const noise = new Noise((options.seed ^ 0x6a09e667) | 0);
  const geo = (world.mapgen as {geology?: {n: number; size: number; rock: Uint8Array; under: Uint8Array; strata: Uint8Array; soil: Uint8Array; landform: Uint8Array}} | undefined)?.geology;
  const H = (ix: number, iz: number) => heights[clamp(iz, 0, segs) * n + clamp(ix, 0, segs)];
  /** continuous macro height at macro metres (u,w) */
  const triangle = (u: number, w: number) => {
    const gx = clamp((u / size + 0.5) * segs, 0, segs), gz = clamp((w / size + 0.5) * segs, 0, segs);
    const ix = Math.min(segs - 1, Math.floor(gx)), iz = Math.min(segs - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz, i = iz * n + ix;
    const a = heights[i], b = heights[i + 1], c = heights[i + n], d = heights[i + n + 1];
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  };
  const bicubic = (u: number, w: number) => {
    const gx = clamp((u / size + 0.5) * segs, 0, segs), gz = clamp((w / size + 0.5) * segs, 0, segs);
    const ix = Math.min(segs - 1, Math.floor(gx)), iz = Math.min(segs - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz;
    const row = (z: number) => cubic(H(ix - 1, z), H(ix, z), H(ix + 1, z), H(ix + 2, z), fx);
    return cubic(row(iz - 1), row(iz), row(iz + 1), row(iz + 2), fz);
  };
  return {
    seed: options.seed, extent: size * scale, waterY, hasGeology: !!geo,
    heightAt(x, z) {
      const u = x / scale, w = z / scale;
      let h = scale === 1 ? triangle(u, w) : bicubic(u, w);
      if (detail > 0) h += detail * smooth(waterY + 0.4, waterY + 4, h) * noise.fbm(x / 40, z / 40, 3);
      return Math.min(CHUNK_RULES.maxHeight, h);
    },
    geologyAt(x, z, out) {
      if (!geo) return false;
      const segsG = geo.n - 1, u = x / scale, w = z / scale;
      const ix = clamp(Math.round((u / geo.size + 0.5) * segsG), 0, segsG), iz = clamp(Math.round((w / geo.size + 0.5) * segsG), 0, segsG), i = iz * geo.n + ix;
      out.rock = geo.rock[i]; out.under = geo.under[i]; out.strata = geo.strata[i]; out.soil = geo.soil[i]; out.landform = geo.landform[i];
      return true;
    },
  };
}

/* ---------------------------------------------------------------- chunk generation */

/** Smooth bowl: depth at the centre falling to 0 at radius (cosine profile, zero slope at the rim). */
export function editDelta(e: TerrainEdit, x: number, z: number) {
  const d = Math.hypot(x - e.x, z - e.z);
  return d >= e.radius ? 0 : -e.depth * 0.5 * (1 + Math.cos(Math.PI * d / e.radius));
}

/** Build one chunk. Pure: same inputs, same bytes. `edits` are applied to the base height after generation. */
export function buildChunk(source: TerrainSource, lod: number, cx: number, cz: number, edits: readonly TerrainEdit[] = []): TerrainChunk {
  if (!Number.isInteger(lod) || lod < 0 || lod > CHUNK_RULES.maxLod) throw new Error(`lod ${lod} outside 0..${CHUNK_RULES.maxLod}`);
  const cells = CHUNK_RULES.cells, n = cells + 1, span = chunkSpan(lod), spacing = chunkSpacing(lod), x0 = cx * span, z0 = cz * span;
  const heights = new Float32Array(n * n);
  const geology = source.hasGeology ? {rock: new Uint8Array(n * n), under: new Uint8Array(n * n), strata: new Uint8Array(n * n), soil: new Uint8Array(n * n), landform: new Uint8Array(n * n)} : null;
  const cell: GeologyCell = {rock: 0, under: 0, strata: 0, soil: 0, landform: 0};
  let minY = Infinity, maxY = -Infinity;
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    // world coordinates are computed from integer lattice indices, never accumulated, so neighbours agree to the bit
    const x = x0 + ix * spacing, z = z0 + iz * spacing, i = iz * n + ix;
    let h = source.heightAt(x, z);
    for (const e of edits) h += editDelta(e, x, z);
    h = Math.fround(Math.min(CHUNK_RULES.maxHeight, h));
    heights[i] = h;
    if (h < minY) minY = h;
    if (h > maxY) maxY = h;
    if (geology && source.geologyAt(x, z, cell)) { geology.rock[i] = cell.rock; geology.under[i] = cell.under; geology.strata[i] = cell.strata; geology.soil[i] = cell.soil; geology.landform[i] = cell.landform; }
  }
  return {key: chunkKey(lod, cx, cz), lod, cx, cz, x0, z0, span, spacing, n, heights, geology, minY, maxY, bytes: chunkBytes()};
}

/* ---------------------------------------------------------------- chunk selection (LOD rings) */

export type ChunkRef = {lod: number; cx: number; cz: number};
/** Restricted quadtree around a focus: the set of chunks that tile the source extent exactly once, fine near the focus, coarse far away.
 * Result is deterministic and ordered nearest first. `maxLod` coarsest level used; chunks that lie wholly outside the extent are skipped. */
export function selectChunks(focusX: number, focusZ: number, extent: number, options: {maxLod?: number; minLod?: number; splitFactor?: number; maxChunks?: number} = {}): ChunkRef[] {
  const maxLod = Math.min(options.maxLod ?? CHUNK_RULES.maxLod, CHUNK_RULES.maxLod), minLod = options.minLod ?? 0, split = options.splitFactor ?? CHUNK_RULES.splitFactor, half = extent / 2;
  const out: (ChunkRef & {d: number})[] = [];
  const dist = (lod: number, cx: number, cz: number) => {
    const s = chunkSpan(lod), nx = clamp(focusX, cx * s, (cx + 1) * s), nz = clamp(focusZ, cz * s, (cz + 1) * s);
    return Math.max(Math.abs(focusX - nx), Math.abs(focusZ - nz));
  };
  const visit = (lod: number, cx: number, cz: number) => {
    const s = chunkSpan(lod);
    if ((cx + 1) * s <= -half || cx * s >= half || (cz + 1) * s <= -half || cz * s >= half) return;
    const d = dist(lod, cx, cz);
    if (lod > minLod && d < split * s) { for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) visit(lod - 1, cx * 2 + dx, cz * 2 + dz); return; }
    out.push({lod, cx, cz, d});
  };
  const top = chunkSpan(maxLod), x0 = Math.floor(-half / top), x1 = Math.floor((half - 1e-9) / top);
  for (let cz = x0; cz <= x1; cz++) for (let cx = x0; cx <= x1; cx++) visit(maxLod, cx, cz);
  out.sort((a, b) => a.d - b.d || a.lod - b.lod || a.cz - b.cz || a.cx - b.cx);
  if (options.maxChunks !== undefined && out.length > options.maxChunks) throw new Error(`selection needs ${out.length} chunks, cap ${options.maxChunks}`);
  return out.map(({lod, cx, cz}) => ({lod, cx, cz}));
}

/* ---------------------------------------------------------------- cache, edits, queries */

export type ChunkStats = {chunks: number; bytes: number; capBytes: number; builds: number; hits: number; evictions: number; pinned: number; peakBytes: number; overCap: boolean};
export type EditShards = Record<string, TerrainEdit[]>;

/** The query interface: an LRU cache of chunks under a byte cap, per-chunk edit shards, point queries. Pinned chunks are never evicted
 * (the caller pins what it is drawing or simulating); if the pinned set alone exceeds the cap the cache reports overCap rather than dropping them. */
export class ChunkTerrain {
  readonly source: TerrainSource;
  private readonly cap: number;
  private readonly cache = new Map<string, TerrainChunk>();
  private readonly pins = new Map<string, number>();
  private readonly edits = new Map<number, TerrainEdit>();
  /** LOD 0 chunk key -> edit ids touching it: the per-chunk persistence shard index */
  private readonly shard = new Map<string, Set<number>>();
  private builds = 0; private hits = 0; private evictions = 0; private bytes = 0; private peak = 0;
  constructor(source: TerrainSource, options: {memoryBytes?: number} = {}) {
    this.source = source;
    this.cap = options.memoryBytes ?? CHUNK_RULES.defaultMemoryBytes;
    if (!(this.cap >= chunkBytes())) throw new Error('memory cap smaller than one chunk');
  }
  private editsFor(lod: number, cx: number, cz: number): TerrainEdit[] {
    if (!this.edits.size) return [];
    const r = 1 << lod, ids = new Set<number>();
    for (let dz = 0; dz < r; dz++) for (let dx = 0; dx < r; dx++) { const s = this.shard.get(chunkKey(0, cx * r + dx, cz * r + dz)); if (s) for (const id of s) ids.add(id); }
    return [...ids].sort((a, b) => a - b).map(id => this.edits.get(id)!);
  }
  /** Get a chunk, building it on a miss. Marks it most recently used. */
  get(lod: number, cx: number, cz: number): TerrainChunk {
    const key = chunkKey(lod, cx, cz), hit = this.cache.get(key);
    if (hit) { this.cache.delete(key); this.cache.set(key, hit); this.hits++; return hit; }
    const chunk = buildChunk(this.source, lod, cx, cz, this.editsFor(lod, cx, cz));
    this.builds++; this.cache.set(key, chunk); this.bytes += chunk.bytes; this.peak = Math.max(this.peak, this.bytes);
    this.evict();
    return chunk;
  }
  has(lod: number, cx: number, cz: number) { return this.cache.has(chunkKey(lod, cx, cz)); }
  private evict() {
    if (this.bytes <= this.cap) return;
    for (const [key, chunk] of this.cache) {
      if (this.bytes <= this.cap) break;
      if (this.pins.has(key)) continue;
      this.cache.delete(key); this.bytes -= chunk.bytes; this.evictions++;
    }
  }
  pin(lod: number, cx: number, cz: number) { const k = chunkKey(lod, cx, cz); this.pins.set(k, (this.pins.get(k) ?? 0) + 1); }
  unpin(lod: number, cx: number, cz: number) {
    const k = chunkKey(lod, cx, cz), c = this.pins.get(k) ?? 0;
    if (c <= 1) this.pins.delete(k); else this.pins.set(k, c - 1);
    this.evict();
  }
  /** Make exactly `refs` the pinned working set and build them; everything else becomes evictable. Returns the chunks in order. */
  setWorkingSet(refs: readonly ChunkRef[]): TerrainChunk[] {
    this.pins.clear();
    for (const r of refs) this.pin(r.lod, r.cx, r.cz);
    const out = refs.map(r => this.get(r.lod, r.cx, r.cz));
    this.evict();
    return out;
  }
  stats(): ChunkStats {
    return {chunks: this.cache.size, bytes: this.bytes, capBytes: this.cap, builds: this.builds, hits: this.hits, evictions: this.evictions, pinned: this.pins.size, peakBytes: this.peak, overCap: this.bytes > this.cap};
  }
  /** Height at a world point from the LOD 0 chunk that holds it (triangle split, like the legacy mesh). */
  heightAt(x: number, z: number): number {
    const {cx, cz} = chunkAt(0, x, z), c = this.get(0, cx, cz), n = c.n, gx = clamp((x - c.x0) / c.spacing, 0, n - 1), gz = clamp((z - c.z0) / c.spacing, 0, n - 1);
    const ix = Math.min(n - 2, Math.floor(gx)), iz = Math.min(n - 2, Math.floor(gz)), fx = gx - ix, fz = gz - iz, i = iz * n + ix, h = c.heights;
    const a = h[i], b = h[i + 1], cc = h[i + n], d = h[i + n + 1];
    return fx + fz <= 1 ? a + (b - a) * fx + (cc - a) * fz : d + (cc - d) * (1 - fx) + (b - d) * (1 - fz);
  }
  /** Geology of the nearest LOD 0 vertex, or null when the source has none. */
  geologyAt(x: number, z: number): GeologyCell | null {
    const {cx, cz} = chunkAt(0, x, z), c = this.get(0, cx, cz), g = c.geology;
    if (!g) return null;
    const ix = clamp(Math.round((x - c.x0) / c.spacing), 0, c.n - 1), iz = clamp(Math.round((z - c.z0) / c.spacing), 0, c.n - 1), i = iz * c.n + ix;
    return {rock: g.rock[i], under: g.under[i], strata: g.strata[i], soil: g.soil[i], landform: g.landform[i]};
  }
  /** Record a terrain edit. Cached chunks it touches (every LOD) are dropped so they rebuild with it. */
  applyEdit(edit: TerrainEdit) {
    if (!(edit.radius > 0) || !Number.isFinite(edit.depth)) throw new Error('bad edit');
    this.edits.set(edit.id, edit);
    const s = chunkSpan(0), x0 = Math.floor((edit.x - edit.radius) / s), x1 = Math.floor((edit.x + edit.radius) / s), z0 = Math.floor((edit.z - edit.radius) / s), z1 = Math.floor((edit.z + edit.radius) / s);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const k = chunkKey(0, cx, cz);
      let set = this.shard.get(k); if (!set) this.shard.set(k, set = new Set());
      set.add(edit.id);
    }
    // a pinned chunk is dropped too: it stays pinned and is rebuilt, with the edit, on its next get
    for (const [key, chunk] of this.cache) {
      const r = chunk.span;
      if (edit.x + edit.radius >= chunk.x0 && edit.x - edit.radius <= chunk.x0 + r && edit.z + edit.radius >= chunk.z0 && edit.z - edit.radius <= chunk.z0 + r) { this.cache.delete(key); this.bytes -= chunk.bytes; }
    }
  }
  /** Per-chunk persistence: LOD 0 chunk key -> its edits. Only chunks with edits appear, so a save grows with what the player changed. */
  exportEdits(): EditShards {
    const out: EditShards = {};
    for (const key of [...this.shard.keys()].sort()) out[key] = [...this.shard.get(key)!].sort((a, b) => a - b).map(id => this.edits.get(id)!);
    return out;
  }
  /** Load shards (all, or just those for chunks near the player). Edits already known by id are kept once. */
  importEdits(shards: EditShards) {
    for (const key of Object.keys(shards).sort()) for (const e of shards[key]) if (!this.edits.has(e.id)) this.applyEdit({...e});
  }
  editCount() { return this.edits.size; }
}

/** Memory table for a ring selection: chunk counts per LOD and total bytes (data only, not GPU meshes). */
export function selectionBudget(refs: readonly ChunkRef[]) {
  const perLod: Record<number, number> = {};
  for (const r of refs) perLod[r.lod] = (perLod[r.lod] ?? 0) + 1;
  return {chunks: refs.length, perLod, bytes: refs.length * chunkBytes()};
}
