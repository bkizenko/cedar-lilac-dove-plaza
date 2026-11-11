/** Offline art review assets. Metres, Y up, original geometry, no runtime game changes. */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!globalThis.FileReader) {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(result => {
        this.result = result;
        this.onloadend?.();
      });
    }
  };
}
const destination = resolve(process.argv[2] ?? '/Users/boriskizenko/Documents/Hearthwild Art Archive/3d-prototypes');
await mkdir(destination, { recursive: true });
const materials = {
  stone: new THREE.MeshStandardMaterial({ color: '#bcb29d', roughness: .96 }),
  pale: new THREE.MeshStandardMaterial({ color: '#d2c5a8', roughness: .94 }),
  dark: new THREE.MeshStandardMaterial({ color: '#756f61', roughness: 1 }),
  timber: new THREE.MeshStandardMaterial({ color: '#67523a', roughness: .97 }),
  roof: new THREE.MeshStandardMaterial({ color: '#967652', roughness: .97 }),
  earth: new THREE.MeshStandardMaterial({ color: '#65513c', roughness: 1 }),
  leaves: new THREE.MeshStandardMaterial({ color: '#626f46', roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: '#527e7d', roughness: .48 }),
  bronze: new THREE.MeshStandardMaterial({ color: '#8e7849', roughness: .7, metalness: .25 }),
};
function group(parent, name) {
  const result = new THREE.Group(); result.name = name; parent.add(result); return result;
}
function mesh(parent, name, geometry, material, x, y, z) {
  const result = new THREE.Mesh(geometry, materials[material]);
  result.name = name; result.position.set(x, y, z); parent.add(result); return result;
}
function box(parent, name, dimensions, at, material = 'stone') {
  return mesh(parent, name, new THREE.BoxGeometry(...dimensions), material, ...at);
}
function cylinder(parent, name, radius, height, at, material = 'stone', sides = 12) {
  return mesh(parent, name, new THREE.CylinderGeometry(radius, radius, height, sides), material, ...at);
}
function arc(parent, name, inner, outer, height, start, sweep, at, material = 'stone', segments = 24) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, start, start + sweep, false);
  shape.absarc(0, 0, inner, start + sweep, start, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: segments });
  geometry.rotateX(-Math.PI / 2);
  return mesh(parent, name, geometry, material, ...at);
}
function stair(parent, name, width, rise, run, steps, x, z, yaw = 0) {
  const flight = group(parent, name); flight.position.set(x, 0, z); flight.rotation.y = yaw;
  for (let i = 0; i < steps; i++) {
    const height = (i + 1) * rise / steps;
    box(flight, `tread-${i + 1}`, [width, height, run / steps], [0, height / 2, (i + .5) * run / steps]);
  }
  return flight;
}
function portal(parent, name, width, spring, depth, at, yaw = 0) {
  const frame = group(parent, name); frame.position.set(...at); frame.rotation.y = yaw;
  const thickness = .48, radius = width / 2, sections = 9;
  box(frame, 'left-pier', [thickness, spring, depth], [-radius - thickness / 2, spring / 2, 0]);
  box(frame, 'right-pier', [thickness, spring, depth], [radius + thickness / 2, spring / 2, 0]);
  // Radial voussoir wedges leave the passage genuinely open.
  for (let i = 0; i < sections; i++) {
    const a = i * Math.PI / sections, b = (i + 1) * Math.PI / sections;
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
    shape.lineTo(Math.cos(a) * (radius + thickness), Math.sin(a) * (radius + thickness));
    shape.lineTo(Math.cos(b) * (radius + thickness), Math.sin(b) * (radius + thickness));
    shape.lineTo(Math.cos(b) * radius, Math.sin(b) * radius); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.translate(0, spring, -depth / 2);
    mesh(frame, `arch-stone-${i + 1}`, geometry, 'pale', 0, 0, 0);
  }
  return frame;
}
function roof(parent, name, width, rise, depth, at, yaw = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(0, rise); shape.lineTo(width / 2, 0); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  const result = mesh(parent, name, geometry, 'roof', ...at); result.rotation.y = yaw; return result;
}
function tree(parent, x, y, z, height = 2) {
  cylinder(parent, 'tree-trunk', .11, height, [x, y + height / 2, z], 'timber', 6);
  mesh(parent, 'tree-crown', new THREE.IcosahedronGeometry(height * .55, 0), 'leaves', x, y + height, z);
}
function scene(name, description) {
  const result = new THREE.Scene(); result.name = name;
  result.userData = { title: name, description, status: 'art blockout for review', units: 'metres', axes: 'Y up', liveGameAsset: false };
  return result;
}

function observatory() {
  const result = scene('Confluence ring observatory', 'An incomplete stone ring frames a central sighting court, with an offset entry stair and open astronomical slot.');
  const court = group(result, 'open-stone-court');
  arc(court, 'broken-outer-approach', 8.2, 10.7, .35, .25, Math.PI * 1.75, [0, 0, 0], 'dark');
  arc(court, 'raised-inner-walk', 5.1, 7.9, .65, .25, Math.PI * 1.75, [0, 0, 0]);
  for (let i = 0; i < 14; i++) {
    const angle = .45 + i * (Math.PI * 1.64 / 13), radius = 6.65;
    const frame = portal(result, `sighting-arch-${i + 1}`, 1.5, 2.5 + (i % 3) * .18, .75,
      [Math.cos(angle) * radius, .65, Math.sin(angle) * radius], Math.PI / 2 - angle);
    frame.userData.role = 'open colonnade';
  }
  cylinder(result, 'sighting-basin', 2.35, .45, [0, .225, 0], 'pale', 20);
  cylinder(result, 'central-gnomon', .2, 4.7, [.35, 2.8, -.2], 'bronze', 8);
  stair(result, 'east-entry-stair', 2.8, .65, 4, 5, 6.8, -2.5, Math.PI / 2);
  box(result, 'alignment-marker-low', [.6, 1.35, 1.1], [11.9, .675, -1.1], 'dark');
  box(result, 'alignment-marker-high', [.6, 2.1, 1.1], [11.9, 1.05, 1.1], 'dark');
  return result;
}
function harbor() {
  const result = scene('Crescent harbor of the headland', 'An open semicircular quay protects an empty navigable basin. Short finger piers and irregular working sheds face the inner water.');
  arc(result, 'crescent-quay', 12, 16, 1.3, 0, Math.PI, [0, -1.3, 0], 'dark', 28);
  arc(result, 'quay-paving', 12, 15.6, .18, 0, Math.PI, [0, 0, 0], 'pale', 28);
  for (let i = 0; i < 7; i++) {
    const angle = .14 + i * (Math.PI - .28) / 6;
    const bay = group(result, `working-bay-${i + 1}`);
    bay.position.set(Math.cos(angle) * 13.7, 0, -Math.sin(angle) * 13.7);
    bay.rotation.y = Math.PI / 2 - angle;
    box(bay, 'working-shed', [2.4, 2.3 + (i % 2) * .5, 3], [0, 1.15, -2.1], 'stone');
    roof(bay, 'pitched-roof', 2.9, .9, 3.5, [0, 2.35 + (i % 2) * .4, -2.1]);
    box(bay, 'timber-pier', [1.4, .18, 4.4], [0, .2, 2.2], 'timber');
    for (const x of [-.5, .5]) for (const z of [.7, 3.7]) cylinder(bay, 'pier-pile', .1, 1.8, [x, -.55, z], 'timber', 6);
  }
  for (const side of [-1, 1]) {
    const tower = group(result, side < 0 ? 'west-entry-tower' : 'east-entry-tower');
    tower.position.x = side * 14;
    cylinder(tower, 'tower-body', 1.4, 5.2, [0, 2.6, 0], 'stone', 10);
    arc(tower, 'open-parapet', 1.2, 1.6, .8, 0, Math.PI * 2, [0, 5.2, 0], 'pale', 10);
    cylinder(tower, 'signal-mast', .08, 3, [0, 6.3, 0], 'timber', 6);
  }
  return result;
}
function gardens() {
  const result = scene('Cascade teaching gardens', 'Three stepped courtyards use open stone arcades, planted roof beds, and a visible gravity-fed water spine.');
  for (let level = 0; level < 3; level++) {
    const tier = group(result, `garden-tier-${level + 1}`), width = 20 - level * 5, depth = 11 - level * 2, height = level * 4.2;
    tier.position.z = -level * 1.6;
    const bayWidth = width / 5;
    for (let bay = 0; bay < 5; bay++) {
      portal(tier, `front-arcade-${bay + 1}`, bayWidth - .6, 1.8, .8, [-width / 2 + (bay + .5) * bayWidth, height, depth / 2]);
      portal(tier, `back-arcade-${bay + 1}`, bayWidth - .6, 1.8, .8, [-width / 2 + (bay + .5) * bayWidth, height, -depth / 2]);
    }
    box(tier, 'roof-garden-slab', [width + .5, .4, depth + 1], [0, height + 3.8, 0], 'pale');
    for (const side of [-1, 1]) {
      box(tier, 'soil-bed', [width * .38, .28, 1.8], [side * width * .25, height + 4.1, depth * .25], 'earth');
      for (let i = 0; i < 3; i++) tree(tier, side * width * .25 + (i - 1) * 1.8, height + 4.25, depth * .25, 1.3 + level * .2);
    }
    // Stepped lateral access stays physically open between the arcades.
    stair(result, `terrace-stair-${level + 1}`, 2.1, 4.2, 6, 14, width / 2 + 1.5, -level * 3.2, 0).position.y = height;
    box(tier, 'central-water-course', [1.2, .14, depth + 1], [0, height + 4.04, 0], 'water');
    box(tier, 'front-cascade', [1.1, 3.8, .13], [0, height + 2.05, depth / 2 + .55], 'water');
  }
  return result;
}
function stats(root) {
  let meshes = 0, triangles = 0;
  const names = [];
  root.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
    names.push(node.name);
  });
  return { meshes, triangles, dimensionsMetres: new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray(), namedMeshes: names, authoredParts: root.userData.sourceParts?.length ?? meshes };
}
function batchMaterials(root) {
  const batches = new Map();
  const sourceNames = [];
  root.updateMatrixWorld(true);
  root.traverse(node => {
    if (!node.isMesh) return;
    sourceNames.push(node.name);
    const geometry = (node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone()).applyMatrix4(node.matrixWorld);
    const parts = batches.get(node.material) ?? [];
    parts.push(geometry); batches.set(node.material, parts);
  });
  const result = scene(root.name, root.userData.description);
  result.userData.sourceParts = sourceNames;
  for (const [material, parts] of batches) {
    const geometry = mergeGeometries(parts);
    if (!geometry) throw new Error('Geometry batching failed');
    const combined = new THREE.Mesh(geometry, material);
    combined.name = Object.entries(materials).find(([, value]) => value === material)[0] + '-surfaces';
    result.add(combined);
  }
  return result;
}
function validateGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Invalid GLB header');
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  if (!json.scenes?.length || !json.meshes?.length || !json.accessors?.length) throw new Error('Missing glTF model data');
  return { scene: json.scenes[0].name, meshes: json.meshes.length, nodes: json.nodes.length, buffers: json.buffers.map(buffer => buffer.byteLength) };
}
const manifest = { status: '3D blockouts for art review', seed: 'fixed authored prototypes', generatedAt: new Date().toISOString(), models: [] };
for (const [filename, make] of [['ring-observatory', observatory], ['crescent-harbor', harbor], ['cascade-gardens', gardens]]) {
  const model = batchMaterials(make()); model.updateMatrixWorld(true);
  const bytes = Buffer.from(await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true }));
  const path = resolve(destination, filename + '.glb');
  await writeFile(path, bytes);
  const validation = validateGlb(await readFile(path));
  const metrics = stats(model);
  manifest.models.push({ file: filename + '.glb', bytes: bytes.length, ...validation, ...metrics, description: model.userData.description });
  console.log(JSON.stringify({ file: path, bytes: bytes.length, scene: validation.scene, triangles: metrics.triangles, meshes: metrics.meshes }));
}
await writeFile(resolve(destination, 'wonder-blockouts.json'), JSON.stringify(manifest, null, 2) + '\n');
