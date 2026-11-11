import type { LocalWaterBody, Waterfall } from './localWater';
import { lakeContains } from './localWater';
import { buildLocalWaterIndex, indexedWaterAt } from './indexedLocalWater';
/** Sparse V19 geometry; the same Float32 vertices and diagonal serve CPU/GPU. */
export const BANK_TERRAIN_RULES = { version: 1, coarseCellsPerTile: 4, subdivisions: 16, bankMarginMetres: 20, boundaryBlendMetres: 8, minimumWetDepthMetres: .24, maximumTiles: 2048, maximumRefinementDeltaMetres: 8, shoreBlendMetres: 6, maximumLocalChannelLoweringMetres: 2.5 } as const;
export type BankTile = {
    key: number;
    x: number;
    z: number;
    heights: readonly number[];
};
export type BankTerrain = {
    version: 1;
    tileSize: number;
    width: number;
    subdivisions: number;
    tiles: readonly BankTile[];
    tileMap: readonly number[];
    metrics: {
        tileCount: number;
        vertices: number;
        triangles: number;
        heightBytes: number;
        maximumDisplacementMetres: number;
        meanDisplacementMetres: number;
        maximumDisplacementAt: {
            x: number;
            z: number;
            coarse: number;
            refined: number;
        };
        clampedVertices: number;
    };
};
type Terrain = {
    size: number;
    segs: number;
    heights: Float32Array;
    waterY: number;
    waterBodies?: LocalWaterBody[];
    waterfalls?: Waterfall[];
};
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
/** Inputs are generation-owned. Published output is frozen plain data, so JSON
 * and structuredClone work; no callbacks or proxy enter WorldData/state. */
export function buildBankTerrain(world: Terrain, coarse: (x: number, z: number) => number, analytic: (x: number, z: number) => number): BankTerrain {
    const r = BANK_TERRAIN_RULES, tileSize = world.size / world.segs * r.coarseCellsPerTile, width = Math.ceil(world.size / tileSize), half = world.size / 2, keys = new Set<number>(), margin = r.bankMarginMetres;
    const add = (x0: number, z0: number, x1: number, z1: number) => { for (let z = Math.max(0, Math.floor((z0 - margin + half) / tileSize)); z <= Math.min(width - 1, Math.floor((z1 + margin + half) / tileSize)); z++)
        for (let x = Math.max(0, Math.floor((x0 - margin + half) / tileSize)); x <= Math.min(width - 1, Math.floor((x1 + margin + half) / tileSize)); x++)
            keys.add(z * width + x); };
    for (const b of world.waterBodies || []) {
        if (b.kind === 'river')
            for (let i = 1; i < b.pts.length; i++) {
                const a = b.pts[i - 1], c = b.pts[i], w = Math.max(a.w ?? b.width, c.w ?? b.width) * .85;
                add(Math.min(a.x, c.x) - w, Math.min(a.z, c.z) - w, Math.max(a.x, c.x) + w, Math.max(a.z, c.z) + w);
            }
        else {
            const ps = b.shoreline || [];
            if (ps.length)
                for (let i = 0; i < ps.length; i++) {
                    const a = ps[i], c = ps[(i + 1) % ps.length];
                    add(Math.min(a.x, c.x), Math.min(a.z, c.z), Math.max(a.x, c.x), Math.max(a.z, c.z));
                }
            else
                add(b.x - b.rx, b.z - b.rz, b.x + b.rx, b.z + b.rz);
        }
    }
    for (const f of world.waterfalls || [])
        add(Math.min(f.x, f.x + f.dx) - f.width, Math.min(f.z, f.z + f.dz) - f.width, Math.max(f.x, f.x + f.dx) + f.width, Math.max(f.z, f.z + f.dz) + f.width);
    if (keys.size > r.maximumTiles)
        throw new Error(`V19 bank tile budget exceeded: ${keys.size}/${r.maximumTiles}`);
    const shoreBuckets = new Map<number, {
        a: {
            x: number;
            z: number;
            y: number;
            w?: number;
        };
        b: {
            x: number;
            z: number;
            y: number;
            w?: number;
        };
        width: number;
    }[]>();
    for (const body of world.waterBodies || [])
        if (body.kind === 'river')
            for (let i = 1; i < body.pts.length; i++) {
                const a = body.pts[i - 1], b = body.pts[i], pad = Math.max(a.w ?? body.width, b.w ?? body.width) * .5 + r.shoreBlendMetres;
                for (let z = Math.max(0, Math.floor((Math.min(a.z, b.z) - pad + half) / tileSize)); z <= Math.min(width - 1, Math.floor((Math.max(a.z, b.z) + pad + half) / tileSize)); z++)
                    for (let x = Math.max(0, Math.floor((Math.min(a.x, b.x) - pad + half) / tileSize)); x <= Math.min(width - 1, Math.floor((Math.max(a.x, b.x) + pad + half) / tileSize)); x++) {
                        const k = z * width + x, list = shoreBuckets.get(k) || [];
                        list.push({ a, b, width: body.width });
                        shoreBuckets.set(k, list);
                    }
            }
    const smoothShore = (x: number, z: number, base: number, fine: number) => { const list = shoreBuckets.get(Math.floor((z + half) / tileSize) * width + Math.floor((x + half) / tileSize)); if (!list)
        return fine; for (const { a, b, width: bodyWidth } of list) {
        const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1))), distance = Math.hypot(x - a.x - t * dx, z - a.z - t * dz), halfWidth = ((a.w ?? bodyWidth) + ((b.w ?? bodyWidth) - (a.w ?? bodyWidth)) * t) * .5;
        if (distance > halfWidth + r.shoreBlendMetres)
            continue;
        const water = a.y + (b.y - a.y) * t, target = distance <= halfWidth ? water - r.minimumWetDepthMetres - (1 - smooth(distance / halfWidth)) : water - r.minimumWetDepthMetres + (1.5 + r.minimumWetDepthMetres) * smooth((distance - halfWidth) / r.shoreBlendMetres);
        fine = Math.min(fine, Math.max(base - r.maximumLocalChannelLoweringMetres, target));
    } return fine; };
    const index = buildLocalWaterIndex(world.waterBodies || [], world.size, world.waterfalls || []), residual = new Map<number, number>(), step = world.size / world.segs;
    const gridResidual = (x: number, z: number) => { const ix = Math.max(0, Math.min(world.segs, x)), iz = Math.max(0, Math.min(world.segs, z)), id = iz * (world.segs + 1) + ix; let value = residual.get(id); if (value === undefined) {
        value = world.heights[id] - analytic(ix * step - half, iz * step - half);
        residual.set(id, value);
    } return value; };
    const repairResidual = (x: number, z: number) => { const gx = Math.max(0, Math.min(world.segs, (x + half) / step)), gz = Math.max(0, Math.min(world.segs, (z + half) / step)), ix = Math.min(world.segs - 1, Math.floor(gx)), iz = Math.min(world.segs - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz, a = gridResidual(ix, iz), b = gridResidual(ix + 1, iz), c = gridResidual(ix, iz + 1), d = gridResidual(ix + 1, iz + 1); return a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz; };
    const blend = (x: number, z: number, tx: number, tz: number) => { let distance = Infinity; for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
            const nx = tx + dx, nz = tz + dz;
            if (nx >= 0 && nz >= 0 && nx < width && nz < width && keys.has(nz * width + nx))
                continue;
            const x0 = nx * tileSize - half, z0 = nz * tileSize - half;
            distance = Math.min(distance, Math.hypot(Math.max(x0 - x, 0, x - x0 - tileSize), Math.max(z0 - z, 0, z - z0 - tileSize)));
        } return smooth(distance / r.boundaryBlendMetres); };
    const tiles: BankTile[] = [], tileMap = new Array<number>(width * width).fill(0), n = r.subdivisions;
    let maximum = 0, sum = 0, count = 0, clampedVertices = 0, maximumDisplacementAt = { x: 0, z: 0, coarse: 0, refined: 0 };
    for (const key of [...keys].sort((a, b) => a - b)) {
        const tx = key % width, tz = Math.floor(key / width), heights: number[] = [];
        for (let iz = 0; iz <= n; iz++)
            for (let ix = 0; ix <= n; ix++) {
                const x = (tx + ix / n) * tileSize - half, z = (tz + iz / n) * tileSize - half, base = coarse(x, z), mix = blend(x, z, tx, tz);
                let fine = analytic(x, z) + repairResidual(x, z);
                if (Math.abs(fine - base) > r.maximumRefinementDeltaMetres)
                    clampedVertices++;
                fine = Math.max(base - r.maximumRefinementDeltaMetres, Math.min(base + r.maximumRefinementDeltaMetres, fine));
                fine = smoothShore(x, z, base, fine);
                const local = indexedWaterAt(index, x, z, lakeContains);
                if (local !== null && base < local + 1)
                    fine = Math.min(fine, local - r.minimumWetDepthMetres);
                const height = Math.fround(base + (fine - base) * mix);
                heights.push(height);
                const delta = Math.abs(height - base);
                if (delta > maximum) {
                    maximum = delta;
                    maximumDisplacementAt = { x, z, coarse: base, refined: height };
                }
                sum += delta;
                count++;
            }
        tileMap[key] = tiles.length + 1;
        tiles.push(Object.freeze({ key, x: tx, z: tz, heights: Object.freeze(heights) }));
    }
    return Object.freeze({ version: 1, tileSize, width, subdivisions: n, tiles: Object.freeze(tiles), tileMap: Object.freeze(tileMap), metrics: Object.freeze({ tileCount: tiles.length, vertices: tiles.length * (n + 1) ** 2, triangles: tiles.length * n * n * 2, heightBytes: count * 8, maximumDisplacementMetres: maximum, meanDisplacementMetres: sum / Math.max(1, count), maximumDisplacementAt: Object.freeze(maximumDisplacementAt), clampedVertices }) });
}
export function bankTileAt(data: BankTerrain, x: number, z: number, size: number) { const gx = (x + size / 2) / data.tileSize, gz = (z + size / 2) / data.tileSize; if (gx < 0 || gz < 0 || gx >= data.width || gz >= data.width)
    return null; const id = data.tileMap[Math.floor(gz) * data.width + Math.floor(gx)]; return id ? data.tiles[id - 1] : null; }
export function bankHeightAt(data: BankTerrain | undefined, x: number, z: number, size: number, fallback: number) { if (!data)
    return fallback; const tile = bankTileAt(data, x, z, size); if (!tile)
    return fallback; const n = data.subdivisions, gx = ((x + size / 2) / data.tileSize - tile.x) * n, gz = ((z + size / 2) / data.tileSize - tile.z) * n, ix = Math.max(0, Math.min(n - 1, Math.floor(gx))), iz = Math.max(0, Math.min(n - 1, Math.floor(gz))), fx = gx - ix, fz = gz - iz, stride = n + 1, i = iz * stride + ix, a = tile.heights[i], b = tile.heights[i + 1], c = tile.heights[i + stride], d = tile.heights[i + stride + 1]; return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz); }
