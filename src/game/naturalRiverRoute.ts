export type RiverPoint = {
    x: number;
    z: number;
};
export const NATURAL_RIVER_ROUTE_RULES = { version: 19, sampleMetres: 3, smoothingMetres: [36, 32, 28, 24] as readonly number[], meanderWidths: [1.5, 1.25, 1, .75] as readonly number[], wavelengthMetres: 132, minimumBendRadiusWidths: 2, straightHeadingToleranceRadians: .0873 } as const;
function resample(path: readonly RiverPoint[], spacing: number) { const d = [0]; for (let i = 1; i < path.length; i++)
    d.push(d[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z)); const length = d.at(-1)!, count = Math.max(2, Math.ceil(length / spacing)), result: RiverPoint[] = []; let j = 1; for (let i = 0; i <= count; i++) {
    const target = length * i / count;
    while (j < path.length - 1 && d[j] < target)
        j++;
    const t = (target - d[j - 1]) / Math.max(1e-9, d[j] - d[j - 1]), a = path[j - 1], b = path[j];
    result.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
} return { points: result, length }; }
export function riverRouteMetrics(points: readonly RiverPoint[], channelWidth: number) { let length = 0, maximumCurvature = 0, longestStraight = 0, run = 0, heading: number | undefined; for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, segment = Math.hypot(dx, dz), h = Math.atan2(dz, dx);
    length += segment;
    if (heading === undefined)
        heading = h;
    const drift = Math.abs(Math.atan2(Math.sin(h - heading), Math.cos(h - heading)));
    if (drift > NATURAL_RIVER_ROUTE_RULES.straightHeadingToleranceRadians) {
        longestStraight = Math.max(longestStraight, run);
        run = 0;
        heading = h;
    }
    run += segment;
    if (i > 1 && i < points.length - 2) {
        const p = points[i - 2], prior = Math.atan2(a.z - p.z, a.x - p.x), turn = Math.abs(Math.atan2(Math.sin(h - prior), Math.cos(h - prior)));
        maximumCurvature = Math.max(maximumCurvature, turn / Math.max(.001, (segment + Math.hypot(a.x - p.x, a.z - p.z)) * .5));
    }
} return { lengthMetres: length, maximumCurvaturePerMetre: maximumCurvature, minimumBendRadiusMetres: maximumCurvature > 1e-9 ? 1 / maximumCurvature : Infinity, minimumBendRadiusWidths: maximumCurvature > 1e-9 ? 1 / (maximumCurvature * channelWidth) : Infinity, maximumStraightRunMetres: Math.max(longestStraight, run) }; }
/** Seeded bounded corridor curves. Only proposals: the caller probes every
 * metre range for real protected ground and actual connected downstream water
 * before carving. No random runtime movement or visual-only river distortion. */
export function naturalRiverRoutes(original: readonly RiverPoint[], seed: number, channelWidth: number) {
    const r = NATURAL_RIVER_ROUTE_RULES, { points: raw, length } = resample(original, r.sampleMetres), phase = ((seed >>> 0) % 65521) / 65521 * Math.PI * 2, proposals = [];
    for (let attempt = 0; attempt < r.smoothingMetres.length; attempt++) {
        const radius = Math.max(1, Math.round(r.smoothingMetres[attempt] / r.sampleMetres));
        let points = raw.map(p => ({ ...p }));
        for (let pass = 0; pass < 3; pass++) {
            const prior = points;
            points = prior.map((p, i) => { if (i === 0 || i === prior.length - 1)
                return p; let x = 0, z = 0, total = 0; for (let j = Math.max(0, i - radius); j <= Math.min(prior.length - 1, i + radius); j++) {
                const w = radius + 1 - Math.abs(j - i);
                x += prior[j].x * w;
                z += prior[j].z * w;
                total += w;
            } const edge = Math.min(1, i / radius, (prior.length - 1 - i) / radius); return { x: p.x + (x / total - p.x) * edge, z: p.z + (z / total - p.z) * edge }; });
        }
        const smooth = points;
        points = smooth.map((p, i) => { if (i === 0 || i === smooth.length - 1)
            return p; const a = smooth[Math.max(0, i - 1)], b = smooth[Math.min(smooth.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, s = i / (smooth.length - 1), along = s * length, wave = Math.sin(along / r.wavelengthMetres * Math.PI * 2 + phase) * .78 + Math.sin(along / (r.wavelengthMetres * .61) * Math.PI * 2 + phase * .7) * .22, offset = wave * channelWidth * r.meanderWidths[attempt] * Math.sin(s * Math.PI) ** 2; return { x: p.x - dz / d * offset, z: p.z + dx / d * offset }; });
        const metrics = riverRouteMetrics(points, channelWidth);
        proposals.push({ path: points, passes: 3, amplitudeMetres: channelWidth * r.meanderWidths[attempt], smoothingMetres: r.smoothingMetres[attempt], metrics });
    }
    return proposals;
}
