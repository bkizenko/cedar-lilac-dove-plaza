import * as THREE from 'three';
import type { Game } from '../game/sim';
import { sampleWorldHeight } from '../game/worldgen';
import { bankTileAt, type BankTerrain } from '../game/bankTerrain';
import { excavationTerrain } from '../game/excavation';
/** One merged sparse ground mesh. Actual completed cuts take priority, including
 * raycasting and shadows; no duplicate coincident surfaces remain underneath. */
export class BankTerrainLayer {
    readonly rayQueries = { queries: 0, lastTileCandidates: 0, lastTriangleTests: 0 };
    readonly mesh: THREE.Mesh;
    private readonly data: BankTerrain;
    private readonly fullIndices: Uint32Array;
    private cuts: unknown;
    private count = -1;
    private active: Uint8Array;
    private sampleColor: (x: number, z: number, out: number[]) => void = () => { };
    constructor(terrain: THREE.Mesh, g: Game, decorate?: (geometry: THREE.BufferGeometry) => void) {
        this.data = g.world.bankTerrain!;
        const data = this.data, n = data.subdivisions, positions: number[] = [], normals: number[] = [], colors: number[] = [], rock: number[] = [], sand: number[] = [], indices: number[] = [], source = terrain.geometry, coarsePos = source.getAttribute('position'), color = source.getAttribute('color'), rockSource = source.getAttribute('surfaceRock'), sandSource = source.getAttribute('surfaceSand');
        const sampleAttribute = (attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, x: number, z: number, channel: number) => { const segs = g.world.segs, px = Math.max(0, Math.min(segs, (x / g.world.size + .5) * segs)), pz = Math.max(0, Math.min(segs, (z / g.world.size + .5) * segs)), ix = Math.min(segs - 1, Math.floor(px)), iz = Math.min(segs - 1, Math.floor(pz)), fx = px - ix, fz = pz - iz, id = iz * (segs + 1) + ix, get = (i: number) => channel === 0 ? attr.getX(i) : channel === 1 ? attr.getY(i) : attr.getZ(i), a = get(id), b = get(id + 1), c = get(id + segs + 1), d = get(id + segs + 2); return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz); };
        this.sampleColor = (x: number, z: number, out: number[]) => { out[0] = sampleAttribute(color, x, z, 0); out[1] = sampleAttribute(color, x, z, 1); out[2] = sampleAttribute(color, x, z, 2); };
        const height = (x: number, z: number) => sampleWorldHeight(g.world, x, z), normal = new THREE.Vector3();
        for (const tile of data.tiles) {
            const offset = positions.length / 3;
            for (let iz = 0; iz <= n; iz++)
                for (let ix = 0; ix <= n; ix++) {
                    const x = (tile.x + ix / n) * data.tileSize - g.world.size / 2, z = (tile.z + iz / n) * data.tileSize - g.world.size / 2;
                    positions.push(x, tile.heights[iz * (n + 1) + ix], z);
                    normal.set(height(x - .5, z) - height(x + .5, z), 1, height(x, z - .5) - height(x, z + .5)).normalize();
                    normals.push(normal.x, normal.y, normal.z);
                    colors.push(sampleAttribute(color, x, z, 0), sampleAttribute(color, x, z, 1), sampleAttribute(color, x, z, 2));
                    rock.push(sampleAttribute(rockSource, x, z, 0));
                    sand.push(sampleAttribute(sandSource, x, z, 0));
                }
            for (let iz = 0; iz < n; iz++)
                for (let ix = 0; ix < n; ix++) {
                    const a = offset + iz * (n + 1) + ix, b = a + 1, c = a + n + 1, d = c + 1;
                    indices.push(a, c, b, b, c, d);
                }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('surfaceBank', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3).fill(1), 1));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('surfaceRock', new THREE.Float32BufferAttribute(rock, 1));
        geometry.setAttribute('surfaceSand', new THREE.Float32BufferAttribute(sand, 1));
        geometry.setIndex(indices);
        decorate?.(geometry);
        geometry.computeBoundingSphere();
        this.fullIndices = Uint32Array.from(indices);
        this.active = new Uint8Array(indices.length / 3).fill(1);
        this.mesh = new THREE.Mesh(geometry, terrain.material);
        this.mesh.name = 'terrain-refined-banks';
        this.mesh.receiveShadow = true;
        const boxes = data.tiles.map(t => new THREE.Box3(new THREE.Vector3(t.x * data.tileSize - g.world.size / 2, Math.min(...t.heights) - .001, t.z * data.tileSize - g.world.size / 2), new THREE.Vector3((t.x + 1) * data.tileSize - g.world.size / 2, Math.max(...t.heights) + .001, (t.z + 1) * data.tileSize - g.world.size / 2))), inverse = new THREE.Matrix4(), ray = new THREE.Ray(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3(), faceNormal = new THREE.Vector3(), edge = new THREE.Vector3();
        this.mesh.raycast = (caster, hits) => { this.rayQueries.queries++; this.rayQueries.lastTileCandidates = 0; this.rayQueries.lastTriangleTests = 0; inverse.copy(this.mesh.matrixWorld).invert(); ray.copy(caster.ray).applyMatrix4(inverse); const p = this.mesh.geometry.getAttribute('position'), perTile = n * n * 6; for (let t = 0; t < boxes.length; t++) {
            if (!ray.intersectsBox(boxes[t]))
                continue;
            this.rayQueries.lastTileCandidates++;
            for (let i = t * perTile; i < (t + 1) * perTile; i += 3) {
                if (!this.active[i / 3])
                    continue;
                this.rayQueries.lastTriangleTests++;
                const ai = this.fullIndices[i], bi = this.fullIndices[i + 1], ci = this.fullIndices[i + 2];
                a.fromBufferAttribute(p, ai);
                b.fromBufferAttribute(p, bi);
                c.fromBufferAttribute(p, ci);
                if (!ray.intersectTriangle(a, b, c, true, hit))
                    continue;
                const point = hit.clone().applyMatrix4(this.mesh.matrixWorld), distance = point.distanceTo(caster.ray.origin);
                if (distance < caster.near || distance > caster.far)
                    continue;
                faceNormal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
                hits.push({ distance, point, object: this.mesh, faceIndex: i / 3, face: { a: ai, b: bi, c: ci, normal: faceNormal.clone(), materialIndex: 0 } });
            }
        } };
        const kept: number[] = [], original = source.index!.array;
        for (let i = 0; i < original.length; i += 3) {
            const a = original[i], b = original[i + 1], c = original[i + 2], x = (coarsePos.getX(a) + coarsePos.getX(b) + coarsePos.getX(c)) / 3, z = (coarsePos.getZ(a) + coarsePos.getZ(b) + coarsePos.getZ(c)) / 3;
            if (!bankTileAt(data, x, z, g.world.size))
                kept.push(a, b, c);
        }
        source.setIndex(kept);
        this.sync(g);
    }
    sync(g: Game) { const records = g.state.excavations, count = records?.length || 0; if (records === this.cuts && count === this.count)
        return; this.cuts = records; this.count = count; if (!count) {
        this.active.fill(1);
        this.mesh.geometry.setIndex(new THREE.BufferAttribute(this.fullIndices, 1));
        return;
    } const cuts = excavationTerrain(g), positions = this.mesh.geometry.getAttribute('position'), kept: number[] = []; for (let i = 0; i < this.fullIndices.length; i += 3) {
        const a = this.fullIndices[i], b = this.fullIndices[i + 1], c = this.fullIndices[i + 2], x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3, z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3, key = Math.floor((z + g.world.size / 2) / cuts.tileSize) * cuts.width + Math.floor((x + g.world.size / 2) / cuts.tileSize);
        const keep = !cuts.tiles.has(key);
        this.active[i / 3] = keep ? 1 : 0;
        if (keep)
            kept.push(a, b, c);
    } this.mesh.geometry.setIndex(kept); }
    /** Painterly look: the shader no longer reads the baked colour texture on fine tiles, so re-sample the coarse painted colours (season, snow,
     * biome) into the tile vertices whenever the coarse terrain is repainted. Render-only. */
    repaint() { const geometry = this.mesh.geometry, p = geometry.getAttribute('position'), c = geometry.getAttribute('color') as THREE.BufferAttribute, out = [0, 0, 0]; for (let i = 0; i < p.count; i++) { this.sampleColor(p.getX(i), p.getZ(i), out); c.setXYZ(i, out[0], out[1], out[2]); } c.needsUpdate = true; }
    dispose() { this.mesh.geometry.dispose(); }
}
