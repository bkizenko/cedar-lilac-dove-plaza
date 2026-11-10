import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BldGeo } from "./meshes";
import { fitCivilianFootprint } from "./civilianBuildings";
function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new T.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function merge(parts: T.BufferGeometry[]) {
  const gs = parts.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (n !== g) g.dispose();
      return n;
    }),
    out = mergeGeometries(gs)!;
  gs.forEach((g) => g.dispose());
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
/** Original compact timber-frame/earth-infill home. Structural surfaces and
 * empty interior only; delivered game materials are not decorative stock. */
export function improvedHomeGeo(): BldGeo {
  const wall: T.BufferGeometry[] = [],
    frame: T.BufferGeometry[] = [],
    roof: T.BufferGeometry[] = [];
  wall.push(
    box(4.2, 2.2, 0.17, 0, 0, -1.8),
    box(1.45, 2.2, 0.17, -1.38, 0, 1.8),
    box(1.45, 2.2, 0.17, 1.38, 0, 1.8),
    box(1.3, 0.45, 0.17, 0, 1.75, 1.8),
  );
  for (const x of [-2.1, 2.1]) {
    wall.push(
      box(0.17, 0.75, 3.6, x, 0, 0),
      box(0.17, 0.65, 3.6, x, 1.55, 0),
      box(0.17, 0.8, 1.1, x, 0.75, -1.25),
      box(0.17, 0.8, 1.1, x, 0.75, 1.25),
    );
  }
  for (const x of [-2.14, -0.62, 0.62, 2.14])
    for (const z of [-1.84, 1.84]) frame.push(box(0.14, 2.3, 0.14, x, 0, z));
  for (const z of [-1.84, 1.84]) {
    frame.push(box(4.35, 0.16, 0.18, 0, 2.18, z), box(4.35, 0.12, 0.16, 0, 0.15, z));
  }
  for (const x of [-2.14, 2.14]) {
    frame.push(box(0.15, 0.14, 3.7, x, 2.15, 0));
    for (const side of [-1, 1]) {
      const brace = new T.BoxGeometry(0.1, 1.9, 0.12)
        .rotateX(side * 0.45)
        .translate(x, 1.1, side * 0.85);
      frame.push(brace);
    }
  }
  const angle = Math.atan2(1.05, 2.4);
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const g = new T.BoxGeometry(0.46 / Math.cos(angle), 0.15, 4.25);
      g.rotateZ(-side * angle);
      g.translate(side * (2.4 - (i + 0.5) * 0.4), 2.28 + (1.05 * (i + 0.5)) / 6, 0);
      roof.push(g);
    }
  roof.push(box(0.2, 0.13, 4.45, 0, 3.33, 0));
  return fitCivilianFootprint("house", {
    entry: { x: 0, z: 1.83, width: 1.15 },
    timber: merge(wall),
    roof: merge(roof),
    extra: merge(frame),
    timberMat: "plaster",
    extraMat: "timber",
    roofMat: "thatch",
  });
}
