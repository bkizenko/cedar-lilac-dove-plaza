import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { FOW, HALF, LUMBER_R, MAP, QUARRY_R, SEGS, TEAM_STYLE } from "@/game/constants";
import type { Game } from "@/game/sim";
import type { BldType, UnitType } from "@/game/types";
import { isFertile } from "@/game/worldgen";
import {
  buildingGeos,
  bushGeo,
  fenceSegGeo,
  firepitGeo,
  flameGeo,
  goatGeo,
  deerGeo,
  boarGeo,
  birdGeo,
  grassGeo,
  makeMaterials,
  pineGeo,
  rockGeo,
  skyGeo,
  unitGeo,
  fishGeo,
  dockPostGeo,
  type MatKit,
} from "./meshes";

const UNIT_TYPES: UnitType[] = [
  "worker",
  "spearman",
  "archer",
  "swordsman",
  "cavalry",
  "leader",
  "warden",
  "ranger",
];
const BLD_TYPES: BldType[] = [
  "townhall",
  "cornerstone",
  "hut",
  "farm",
  "lumber",
  "quarry",
  "dock",
  "warehouse",
  "barracks",
  "forge",
  "watchtower",
  "temple",
  "market",
  "keep",
  "stables",
  "university",
  "cairn",
  "grove",
];

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

function instCap(mesh: THREE.InstancedMesh) {
  return ((mesh.instanceMatrix.array as Float32Array).length / 16) | 0;
}

function makeSunSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
  g.addColorStop(0, "rgba(255,252,240,1)");
  g.addColorStop(0.14, "rgba(255,230,170,0.85)");
  g.addColorStop(0.36, "rgba(255,180,80,0.28)");
  g.addColorStop(0.62, "rgba(255,150,60,0.07)");
  g.addColorStop(1, "rgba(255,140,50,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class WorldView {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mats: MatKit;
  terrain: THREE.Mesh;
  water: THREE.Mesh;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fill: THREE.AmbientLight;
  hearth: THREE.PointLight;
  torchLights: THREE.PointLight[] = [];
  look = new THREE.Vector3(0, 1.2, 0);
  yaw = 1.12;
  pitch = 0.38;
  dist = 58;
  pan = { x: 0, z: 0 };
  treesTrunk!: THREE.InstancedMesh;
  treesLeaf!: THREE.InstancedMesh;
  rocks!: THREE.InstancedMesh;
  copper!: THREE.InstancedMesh;
  iron!: THREE.InstancedMesh;
  bushes!: THREE.InstancedMesh;
  fish: THREE.InstancedMesh | null = null;
  grass: THREE.InstancedMesh | null = null;
  bldMeshes = new Map<
    BldType,
    { timber: THREE.InstancedMesh; roof: THREE.InstancedMesh; extra?: THREE.InstancedMesh }
  >();
  unitMeshes = new Map<UnitType, THREE.InstancedMesh>();
  rings!: THREE.InstancedMesh;
  workRings!: THREE.InstancedMesh;
  ghost: THREE.Group;
  arrows: THREE.InstancedMesh;
  smoke: THREE.Points;
  smokeGeo: THREE.BufferGeometry;
  smokePos: Float32Array;
  flames!: THREE.InstancedMesh;
  pits!: THREE.InstancedMesh;
  floaters: THREE.Group;
  quality: "low" | "med" | "high" = "med";
  sky: THREE.Mesh;
  sunDisc: THREE.Mesh;
  sunGlow: THREE.Mesh;
  bounce: THREE.DirectionalLight;
  fence: THREE.InstancedMesh | null = null;
  goats: THREE.InstancedMesh | null = null;
  deer: THREE.InstancedMesh | null = null;
  boars: THREE.InstancedMesh | null = null;
  wildGoats: THREE.InstancedMesh | null = null;
  birds: THREE.InstancedMesh | null = null;
  private tmpCam = new THREE.Vector3();
  private disposed = false;
  private treeCount = 0;
  private rockCount = 0;
  private bushCount = 0;
  composer: EffectComposer | null = null;
  bloom: UnrealBloomPass | null = null;
  timeU = { value: 0 };
  godrays: THREE.Mesh[] = [];
  fowTex: THREE.DataTexture | null = null;
  fowData = new Uint8Array(FOW * FOW * 4);
  terrTex: THREE.DataTexture | null = null;
  terrData = new Uint8Array(FOW * FOW * 4);
  fowMesh: THREE.Mesh | null = null;
  rain: THREE.Points | null = null;
  rainGeo: THREE.BufferGeometry | null = null;
  rainPos = new Float32Array(0);
  lost = false;
  onContextLost: (() => void) | null = null;
  onContextRestored: (() => void) | null = null;
  private terrainBiome: Uint8Array | null = null;
  private terrainRegion: Uint8Array | null = null;
  private grassRegion: Uint8Array | null = null;
  private seasonAcc = 0.4;
  private lastSnow = -1;
  private litSun = 1.2;
  private litHemi = 0.55;
  private litFogD = 0.003;
  private litFog = new THREE.Color("#d2dcbe");
  private litSunCol = new THREE.Color("#fff4d2");

  constructor(canvas: HTMLCanvasElement) {
    const mobile = window.matchMedia("(max-width: 700px)").matches || navigator.maxTouchPoints > 1;
    const cores = navigator.hardwareConcurrency || 4;
    this.quality = mobile || cores <= 4 ? "med" : "high";
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality === "high",
      powerPreference: "default",
      alpha: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 1.5 : 1.25),
    );
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.addEventListener("webglcontextlost", this.onGlLost, false);
    canvas.addEventListener("webglcontextrestored", this.onGlRestored, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#d8c4a0");
    this.scene.fog = new THREE.FogExp2("#d8c4a0", 0.0034);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 860);
    this.mats = makeMaterials();

    this.hemi = new THREE.HemisphereLight("#ffe9c8", "#4a6a38", 0.72);
    this.scene.add(this.hemi);
    this.fill = new THREE.AmbientLight("#efe4cc", 0.22);
    this.scene.add(this.fill);
    this.sun = new THREE.DirectionalLight("#fff1c4", 2.05);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(
      this.quality === "high" ? 1024 : 512,
      this.quality === "high" ? 1024 : 512,
    );
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 280;
    this.sun.shadow.camera.left = -110;
    this.sun.shadow.camera.right = 110;
    this.sun.shadow.camera.top = 110;
    this.sun.shadow.camera.bottom = -110;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.bounce = new THREE.DirectionalLight("#c8d8b8", 0.28);
    this.bounce.castShadow = false;
    this.scene.add(this.bounce);
    this.scene.add(this.bounce.target);

    this.hearth = new THREE.PointLight("#ff8a38", 2.1, 26, 1.5);
    this.hearth.castShadow = false;
    this.scene.add(this.hearth);
    this.torchLights = [];
    for (let i = 0; i < 6; i++) {
      const L = new THREE.PointLight("#ff9944", 0, 22, 1.6);
      L.castShadow = false;
      this.scene.add(L);
      this.torchLights.push(L);
    }

    this.sky = new THREE.Mesh(
      skyGeo(),
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    );
    this.sky.renderOrder = -20;
    this.sky.frustumCulled = false;
    this.sky.scale.setScalar(1.7);
    this.scene.add(this.sky);

    const sunTex = makeSunSprite();
    this.sunDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({
        map: sunTex,
        color: "#fff6d8",
        fog: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        toneMapped: true,
      }),
    );
    this.sunGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshBasicMaterial({
        map: sunTex,
        color: "#ffc070",
        fog: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.45,
        toneMapped: true,
      }),
    );
    this.sunDisc.renderOrder = -19;
    this.sunGlow.renderOrder = -19;
    this.scene.add(this.sunDisc, this.sunGlow);

    this.terrain = new THREE.Mesh();
    this.water = new THREE.Mesh();
    this.ghost = new THREE.Group();
    this.scene.add(this.ghost);

    const arrowGeo = new THREE.ConeGeometry(0.08, 0.55, 5);
    arrowGeo.rotateX(Math.PI / 2);
    this.arrows = new THREE.InstancedMesh(
      arrowGeo,
      new THREE.MeshStandardMaterial({ color: "#3a2a14", roughness: 0.6 }),
      40,
    );
    this.arrows.count = 0;
    this.arrows.frustumCulled = false;
    this.scene.add(this.arrows);

    this.smokePos = new Float32Array(72 * 3);
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute("position", new THREE.BufferAttribute(this.smokePos, 3));
    this.smoke = new THREE.Points(
      this.smokeGeo,
      new THREE.PointsMaterial({
        color: "#e8e0d4",
        size: 0.55,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    this.scene.add(this.smoke);

    this.rainPos = new Float32Array(520 * 3);
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.Points(
      this.rainGeo,
      new THREE.PointsMaterial({
        color: "#c5d4e4",
        size: 0.11,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        fog: false,
      }),
    );
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);

    this.floaters = new THREE.Group();
    this.scene.add(this.floaters);

    this.rings = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.7, 0.88, 20),
      new THREE.MeshBasicMaterial({
        color: "#e8c878",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
      40,
    );
    this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rings.count = 0;
    this.scene.add(this.rings);

    this.workRings = new THREE.InstancedMesh(
      new THREE.RingGeometry(LUMBER_R - 0.55, LUMBER_R + 0.2, 48),
      new THREE.MeshBasicMaterial({
        color: "#7a9a48",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
      16,
    );
    this.workRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.workRings.count = 0;
    this.workRings.frustumCulled = false;
    this.scene.add(this.workRings);

    this.setupFow();
    this.setupComposer();
  }

  resize() {
    if (this.lost || this.disposed) return;
    const el = this.renderer.domElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    if (this.bloom) this.bloom.resolution.set(w, h);
  }

  applyQuality(q: "low" | "med" | "high") {
    this.quality = q;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, q === "low" ? 1 : q === "med" ? 1.25 : 1.5),
    );
    this.renderer.shadowMap.enabled = q !== "low";
    this.sun.castShadow = q !== "low";
    const map = q === "high" ? 1024 : 512;
    this.sun.shadow.mapSize.set(map, map);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    if (this.grass) this.grass.visible = q !== "low";
    if (q === "low") {
      this.composer = null;
      this.bloom = null;
    } else if (!this.composer && !this.lost) {
      this.setupComposer();
    }
  }

  rebuild(game: Game) {
    this.disposeWorld();
    this.lastSnow = -1;
    this.seasonAcc = 1;
    this.buildTerrain(game);
    this.buildNature(game);
    this.buildBuildings();
    this.buildUnits();
    this.buildHearths(game);
    this.buildCampDressing(game);
    const home = game.world.camps.find((c) => c.team === 0) ||
      game.world.camps[0] || { x: 0, z: 0 };
    this.look.set(home.x, this.sampleY(game, home.x, home.z) + 0.55, home.z);
    this.updateCamera(0);
  }

  sampleY(game: Game, x: number, z: number) {
    return game.height(x, z);
  }

  private buildTerrain(game: Game) {
    const geo = new THREE.PlaneGeometry(MAP, MAP, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const biome = new Uint8Array(pos.count);
    const region = new Uint8Array(pos.count);
    const home = game.world.camps.find((c) => c.team === 0) || { x: 0, z: 0 };
    const islandR = game.world.islandR || 88;
    const water = game.world.baseWaterY;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = game.height(x, z);
      pos.setY(i, h);
      const slope =
        Math.abs(game.height(x + 2.4, z) - game.height(x - 2.4, z)) +
        Math.abs(game.height(x, z + 2.4) - game.height(x, z - 2.4));
      const dist = Math.hypot(x, z);
      const river = h < game.world.waterY + 0.32;
      const shore = dist > islandR - 10;
      const pathN =
        Math.abs(x - home.x - Math.sin((z - home.z) * 0.08) * 1.6) < 1.7 &&
        Math.hypot(x - home.x, z - home.z) < 22;
      const fertile = !river && isFertile(game.world.heights, x, z, water);
      let b = 2;
      if (h < water + 0.08) b = 0;
      else if (river) b = 0;
      else if (shore) b = 1;
      else if (pathN) b = 6;
      else if (slope > 2.4 || h > 18) b = 5;
      else if (h > 11) b = 7;
      else if (h > 6.5 || slope > 1.45) b = 4;
      else if (fertile) b = 3;
      else b = 2;
      const biomes = game.world.biomes || [];
      if (biomes.length && b !== 0 && b !== 1 && b !== 5 && b !== 6) {
        let kind: "plains" | "forest" | "hills" = "plains";
        let bd = 1e12;
        for (const bio of biomes) {
          const d = (bio.x - x) ** 2 + (bio.z - z) ** 2;
          if (d < bd) {
            bd = d;
            kind = bio.kind;
          }
        }
        if (kind === "forest") b = 8;
        else if (kind === "hills" && b !== 7) b = 4;
        else if (kind === "plains" && b !== 7) b = 3;
      }
      biome[i] = b;
      const reg = game.regionAt(x, z);
      if (!reg) region[i] = 255;
      else if (reg.res === "copper") region[i] = 3;
      else region[i] = reg.cluster;
      colors.push(0.55, 0.62, 0.32);
    }
    this.terrainBiome = biome;
    this.terrainRegion = region;
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    this.terrain = new THREE.Mesh(geo, this.mats.ground);
    this.terrain.receiveShadow = true;
    this.terrain.name = "terrain";
    this.scene.add(this.terrain);

    const wgeo = new THREE.PlaneGeometry(MAP, MAP, 48, 48);
    wgeo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wgeo, this.makeWaterMat());
    this.water.position.y = game.world.waterY;
    this.water.renderOrder = 1;
    this.scene.add(this.water);
    this.seasonAcc = 1;
  }

  private buildNature(game: Game) {
    const pine = pineGeo();
    const nTree = game.state.trees.length;
    this.treesTrunk = new THREE.InstancedMesh(pine.trunk, this.mats.bark, Math.max(nTree, 1));
    this.treesLeaf = new THREE.InstancedMesh(
      pine.canopy,
      this.mats.leaf.clone(),
      Math.max(nTree, 1),
    );
    (this.treesLeaf.material as THREE.MeshStandardMaterial).color.set("#ffffff");
    (this.treesLeaf.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    this.treesLeaf.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(Math.max(nTree, 1) * 3),
      3,
    );
    this.treesTrunk.castShadow = this.quality !== "low";
    this.treesLeaf.castShadow = this.quality !== "low";
    this.treesTrunk.receiveShadow = true;
    this.treesLeaf.receiveShadow = true;
    this.treeCount = nTree;
    game.state.trees.forEach((t, i) => {
      _p.set(t.x, t.y, t.z);
      _e.set(0, i * 0.7, 0);
      _q.setFromEuler(_e);
      _s.set(t.scale, t.scale, t.scale);
      _m.compose(_p, _q, _s);
      this.treesTrunk.setMatrixAt(i, _m);
      this.treesLeaf.setMatrixAt(i, _m);
      _c.setHSL(0.31, 0.52, 0.42 + (i % 6) * 0.03);
      this.treesLeaf.setColorAt(i, _c);
    });
    this.treesTrunk.count = nTree;
    this.treesLeaf.count = nTree;
    this.scene.add(this.treesTrunk, this.treesLeaf);

    const nRock = game.state.stones.length;
    this.rocks = new THREE.InstancedMesh(rockGeo(), this.mats.rock, Math.max(nRock, 1));
    this.rocks.castShadow = true;
    this.rocks.receiveShadow = true;
    game.state.stones.forEach((s, i) => {
      _p.set(s.x, s.y, s.z);
      _e.set(0, i * 1.1, 0);
      _q.setFromEuler(_e);
      _s.set(s.scale, s.scale * 0.85, s.scale);
      _m.compose(_p, _q, _s);
      this.rocks.setMatrixAt(i, _m);
    });
    this.rocks.count = nRock;
    this.rockCount = nRock;
    this.scene.add(this.rocks);

    const nCu = game.state.copper.length;
    const cuMat = this.mats.rock.clone();
    cuMat.color.set("#b87333");
    cuMat.emissive.set("#6a3a10");
    cuMat.emissiveIntensity = 0.22;
    this.copper = new THREE.InstancedMesh(rockGeo(), cuMat, Math.max(nCu, 1));
    this.copper.castShadow = true;
    game.state.copper.forEach((s, i) => {
      _p.set(s.x, s.y, s.z);
      _e.set(0.1, i * 0.9, 0);
      _q.setFromEuler(_e);
      _s.set(s.scale * 0.85, s.scale * 0.55, s.scale * 0.85);
      _m.compose(_p, _q, _s);
      this.copper.setMatrixAt(i, _m);
    });
    this.copper.count = nCu;
    this.scene.add(this.copper);

    const nFe = game.state.iron.length;
    const feMat = this.mats.rock.clone();
    feMat.color.set("#4a4a52");
    feMat.metalness = 0.55;
    feMat.roughness = 0.4;
    this.iron = new THREE.InstancedMesh(rockGeo(), feMat, Math.max(nFe, 1));
    this.iron.castShadow = true;
    game.state.iron.forEach((s, i) => {
      _p.set(s.x, s.y, s.z);
      _e.set(0.15, i * 1.3, 0.05);
      _q.setFromEuler(_e);
      _s.set(s.scale * 0.9, s.scale * 0.5, s.scale * 0.8);
      _m.compose(_p, _q, _s);
      this.iron.setMatrixAt(i, _m);
    });
    this.iron.count = nFe;
    this.scene.add(this.iron);

    const nBush = game.state.forage.length;
    this.bushes = new THREE.InstancedMesh(bushGeo(), this.mats.berry, Math.max(nBush, 1));
    this.bushes.castShadow = true;
    game.state.forage.forEach((b, i) => {
      _p.set(b.x, b.y, b.z);
      _e.set(0, i, 0);
      _q.setFromEuler(_e);
      _s.set(b.scale, b.scale, b.scale);
      _m.compose(_p, _q, _s);
      this.bushes.setMatrixAt(i, _m);
    });
    this.bushes.count = nBush;
    this.bushCount = nBush;
    this.scene.add(this.bushes);

    const nFish = game.state.fish.length;
    const fishMat = this.mats.metal.clone();
    fishMat.color.set("#8ec8c4");
    fishMat.roughness = 0.35;
    fishMat.metalness = 0.45;
    this.fish = new THREE.InstancedMesh(fishGeo(), fishMat, Math.max(nFish, 1));
    this.fish.castShadow = false;
    game.state.fish.forEach((f, i) => {
      _p.set(f.x, game.world.waterY + 0.12, f.z);
      _e.set(0, i * 0.9, 0.15);
      _q.setFromEuler(_e);
      _s.set(f.scale, f.scale, f.scale);
      _m.compose(_p, _q, _s);
      this.fish!.setMatrixAt(i, _m);
    });
    this.fish.count = nFish;
    this.scene.add(this.fish);

    const sites = game.world.dockSites || [];
    if (sites.length) {
      const postMat = this.mats.timber.clone();
      postMat.color.set("#efe6c8");
      postMat.emissive.set("#c8b070");
      postMat.emissiveIntensity = 0.35;
      const posts = new THREE.InstancedMesh(dockPostGeo(), postMat, sites.length);
      posts.castShadow = true;
      sites.forEach((s, i) => {
        const y = game.height(s.x, s.z);
        _p.set(s.x, y, s.z);
        _e.set(0, i * 1.1, 0);
        _q.setFromEuler(_e);
        _s.set(1.15, 1.15, 1.15);
        _m.compose(_p, _q, _s);
        posts.setMatrixAt(i, _m);
      });
      posts.count = sites.length;
      this.scene.add(posts);
    }

    const megs = game.world.megaliths;
    if (megs.length) {
      const stones = new THREE.InstancedMesh(rockGeo(), this.mats.rock, megs.length);
      stones.castShadow = true;
      stones.receiveShadow = true;
      megs.forEach((m, i) => {
        const y = game.height(m.x, m.z);
        _p.set(m.x, y + 0.6, m.z);
        _e.set(0.08, m.ry, 0.04);
        _q.setFromEuler(_e);
        _s.set(1.15, 2.6, 0.95);
        _m.compose(_p, _q, _s);
        stones.setMatrixAt(i, _m);
      });
      stones.count = megs.length;
      this.scene.add(stones);
    }

    const gCount = this.quality === "low" ? 320 : this.quality === "med" ? 900 : 1600;
    if (gCount) {
      const grassMat = this.mats.crop.clone();
      grassMat.color.set("#ffffff");
      grassMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.timeU;
        shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float wind = sin(uTime * 1.35 + transformed.x * 0.9 + instanceMatrix[3].x * 0.17);
           transformed.x += wind * 0.14 * transformed.y;
           transformed.z += cos(uTime * 1.1 + instanceMatrix[3].z * 0.13) * 0.08 * transformed.y;`,
        );
      };
      grassMat.customProgramCacheKey = () => "grass-wind";
      this.grass = new THREE.InstancedMesh(grassGeo(), grassMat, gCount);
      this.grass.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(gCount * 3),
        3,
      );
      this.grassRegion = new Uint8Array(gCount);
      let gi = 0;
      const home = game.world.camps.find((c) => c.team === 0) || { x: 0, z: 0 };
      for (let i = 0; i < gCount * 5 && gi < gCount; i++) {
        const nearCamp = i < gCount * 0.35;
        const x = nearCamp
          ? home.x + (Math.random() - 0.5) * 30
          : (Math.random() - 0.5) * (MAP - 8);
        const z = nearCamp
          ? home.z + (Math.random() - 0.5) * 26
          : (Math.random() - 0.5) * (MAP - 8);
        const y = game.height(x, z);
        if (y < game.world.waterY + 0.45) continue;
        const reg = game.regionAt(x, z);
        const rk = !reg ? 255 : reg.res === "copper" ? 3 : reg.cluster;
        if (rk === 0 && Math.random() < 0.55) continue;
        if (rk === 3 && Math.random() < 0.4) continue;
        _p.set(x, y, z);
        _e.set(0, Math.random() * 6, 0);
        _q.setFromEuler(_e);
        const sc = 0.85 + Math.random() * 1.1;
        _s.set(sc, sc * (0.9 + Math.random() * 0.4), sc);
        _m.compose(_p, _q, _s);
        this.grass.setMatrixAt(gi, _m);
        _c.setHSL(0.27 + Math.random() * 0.06, 0.55, 0.42 + Math.random() * 0.1);
        this.grass.setColorAt(gi, _c);
        this.grassRegion[gi] = rk;
        gi++;
      }
      this.grass.count = gi;
      this.scene.add(this.grass);
    }
  }

  private buildBuildings() {
    const geos = buildingGeos();
    for (const type of BLD_TYPES) {
      const g = geos[type];
      const timber = new THREE.InstancedMesh(g.timber, this.mats.timber, 80);
      const roofMat =
        type === "cornerstone" ? this.mats.hide :
        type === "keep" || type === "temple" || type === "university"
          ? this.mats.tile
          : this.mats.thatch;
      const roof = new THREE.InstancedMesh(g.roof, roofMat.clone(), 80);
      timber.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      timber.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(80 * 3), 3);
      roof.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      roof.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(80 * 3), 3);
      (roof.material as THREE.MeshStandardMaterial).vertexColors = true;
      (roof.material as THREE.MeshStandardMaterial).color.set("#ffffff");
      timber.castShadow = true;
      roof.castShadow = true;
      timber.receiveShadow = true;
      timber.count = 0;
      roof.count = 0;
      timber.frustumCulled = false;
      roof.frustumCulled = false;
      this.scene.add(timber, roof);
      let extra: THREE.InstancedMesh | undefined;
      if (g.extra) {
        extra = new THREE.InstancedMesh(g.extra, this.mats[g.extraMat || "stone"], 80);
        extra.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        extra.castShadow = true;
        extra.count = 0;
        extra.frustumCulled = false;
        this.scene.add(extra);
      }
      this.bldMeshes.set(type, { timber, roof, extra });
    }
  }

  private buildUnits() {
    for (const t of UNIT_TYPES) {
      const geo = unitGeo(t);
      const mat = this.mats.hide.clone();
      mat.vertexColors = false;
      const mesh = new THREE.InstancedMesh(geo, mat, 140);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(140 * 3), 3);
      mesh.castShadow = this.quality !== "low";
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.unitMeshes.set(t, mesh);
    }
  }

  private buildHearths(game: Game) {
    const halls = game.state.buildings.filter((b) => b.type === "townhall" && b.hp > 0);
    this.pits = new THREE.InstancedMesh(firepitGeo(), this.mats.rock, 6);
    this.pits.castShadow = true;
    this.pits.receiveShadow = true;
    this.flames = new THREE.InstancedMesh(
      flameGeo(),
      new THREE.MeshBasicMaterial({
        color: "#ffb040",
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
      64,
    );
    this.flames.frustumCulled = false;
    halls.forEach((h, i) => {
      _p.set(h.x + 1.6, h.y, h.z + 4.2);
      _q.identity();
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.pits.setMatrixAt(i, _m);
    });
    this.pits.count = halls.length;
    this.flames.count = 0;
    this.scene.add(this.pits, this.flames);
    const home = halls.find((h) => h.team === 0);
    if (home) this.hearth.position.set(home.x + 1.6, home.y + 0.8, home.z + 4.2);
  }

  private buildCampDressing(game: Game) {
    const home = game.state.buildings.find((b) => b.type === "townhall" && b.team === 0);
    if (!home) return;
    const cx = home.x + 7.5;
    const cz = home.z + 2.5;
    const segs = 14;
    const radius = 5.2;
    this.fence = new THREE.InstancedMesh(fenceSegGeo(), this.mats.timber, segs);
    this.fence.castShadow = true;
    this.fence.receiveShadow = true;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const z = cz + Math.sin(a) * radius;
      _p.set(x, game.height(x, z), z);
      _e.set(0, -a + Math.PI / 2, 0);
      _q.setFromEuler(_e);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.fence.setMatrixAt(i, _m);
    }
    this.fence.count = segs;
    this.scene.add(this.fence);

    this.goats = new THREE.InstancedMesh(goatGeo(), this.mats.hideDark, 4);
    this.goats.castShadow = true;
    const goatPos = [
      [cx + 1.2, cz + 0.6, 0.4],
      [cx - 1.4, cz - 0.8, 2.1],
      [cx + 0.2, cz - 1.6, -0.7],
      [cx - 0.6, cz + 1.4, 1.3],
    ];
    goatPos.forEach((g, i) => {
      const x = g[0],
        z = g[1];
      _p.set(x, game.height(x, z), z);
      _e.set(0, g[2], 0);
      _q.setFromEuler(_e);
      _s.set(1.15, 1.15, 1.15);
      _m.compose(_p, _q, _s);
      this.goats!.setMatrixAt(i, _m);
    });
    this.goats.count = 4;
    this.scene.add(this.goats);

    const mkHerd = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(n, 1));
      mesh.castShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      this.scene.add(mesh);
      return mesh;
    };
    const hideMat = this.mats.hide.clone();
    hideMat.color.set("#8a6a48");
    const boarMat = this.mats.hideDark.clone();
    boarMat.color.set("#4a3a32");
    const birdMat = this.mats.hide.clone();
    birdMat.color.set("#c8c0b0");
    this.deer = mkHerd(deerGeo(), hideMat, 12);
    this.boars = mkHerd(boarGeo(), boarMat, 10);
    this.wildGoats = mkHerd(goatGeo(), this.mats.hideDark, 14);
    this.birds = mkHerd(birdGeo(), birdMat, 16);
  }

  updateCamera(dt: number) {
    const panSp = 22 * (this.dist / 38);
    if (this.pan.x || this.pan.z) {
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      this.look.x += (fx * this.pan.z + rx * this.pan.x) * panSp * dt;
      this.look.z += (fz * this.pan.z + rz * this.pan.x) * panSp * dt;
      this.look.x = THREE.MathUtils.clamp(this.look.x, -HALF + 10, HALF - 10);
      this.look.z = THREE.MathUtils.clamp(this.look.z, -HALF + 10, HALF - 10);
    }
    this.pitch = THREE.MathUtils.clamp(this.pitch, 0.2, 1.36);
    this.dist = THREE.MathUtils.clamp(this.dist, 14, 230);
    this.tmpCam.set(
      this.look.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      this.look.y + Math.sin(this.pitch) * this.dist,
      this.look.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist,
    );
    this.camera.position.copy(this.tmpCam);
    this.camera.lookAt(this.look.x, this.look.y + 1.2, this.look.z);
  }

  pickEntity(cx: number, cy: number, game: Game) {
    const el = this.renderer.domElement;
    _ndc.set((cx / (el.clientWidth || 1)) * 2 - 1, (-cy / (el.clientHeight || 1)) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const sources = new Map<
      THREE.Object3D,
      (import("@/game/types").Unit | import("@/game/types").Building)[]
    >();
    for (const [type, meshes] of this.bldMeshes) {
      const entities = game.state.buildings.filter((b) => b.hp > 0 && b.type === type);
      for (const mesh of [meshes.timber, meshes.roof, meshes.extra])
        if (mesh) {
          mesh.computeBoundingSphere();
          sources.set(mesh, entities);
        }
    }
    for (const [type, mesh] of this.unitMeshes) {
      mesh.computeBoundingSphere();
      sources.set(
        mesh,
        game.state.units.filter((u) => u.hp > 0 && u.type === type),
      );
    }
    for (const hit of _ray.intersectObjects([...sources.keys()], false)) {
      if (hit.instanceId === undefined) continue;
      const entity = sources.get(hit.object)?.[hit.instanceId];
      if (entity && (entity.team === 0 || game.visibleAt(entity.x, entity.z))) return entity;
    }
    return null;
  }

  groundAt(cx: number, cy: number): THREE.Vector3 | null {
    const el = this.renderer.domElement;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    _ndc.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const hits = _ray.intersectObject(this.terrain, false);
    if (hits[0]) return hits[0].point.clone();
    _ground.set(new THREE.Vector3(0, 1, 0), -this.look.y);
    if (_ray.ray.intersectPlane(_ground, _hit)) return _hit.clone();
    return null;
  }

  project(x: number, y: number, z: number) {
    _p.set(x, y, z).project(this.camera);
    const el = this.renderer.domElement;
    return {
      x: (_p.x * 0.5 + 0.5) * el.clientWidth,
      y: (-_p.y * 0.5 + 0.5) * el.clientHeight,
      behind: _p.z > 1,
    };
  }

  sync(game: Game, dt: number) {
    if (this.lost || this.disposed) return;
    this.updateDay(game, dt);
    this.syncNature(game);
    this.syncWildlife(game);
    this.syncBuildings(game);
    this.syncUnits(game);
    this.syncGhost(game);
    this.syncArrows(game);
    this.syncSmoke(game, dt);
    this.timeU.value = game.state.time;
    this.syncFow(game);
    this.syncRain(game, dt);
    this.paintSeason(game, dt);
    if (this.water)
      this.water.position.y = game.world.waterY + Math.sin(game.state.time * 0.6) * 0.03;
  }

  private updateDay(game: Game, dt = 0.016) {
    const p = game.dayPhase();
    const hour = p * 24;
    const rise = 5.4;
    const set = 20.2;
    const t = (hour - rise) / (set - rise);
    const day = Math.max(0, Math.min(1, t));
    const elev = Math.sin(day * Math.PI);
    const dawn = Math.max(0, 1 - Math.abs(hour - 6.7) * 0.55);
    const dusk = Math.max(0, 1 - Math.abs(hour - 18.8) * 0.5);
    const night = game.isNight();
    const wx = game.state.weather;
    const wet = wx === "rain" || wx === "storm" || wx === "flood";
    const ang = ((hour - 6) / 12) * Math.PI;
    const dist = 110;
    this.sun.position.set(
      this.look.x + Math.cos(ang) * dist,
      8 + Math.max(4, elev * 58),
      this.look.z + Math.sin(ang) * dist * 0.62,
    );
    this.sun.target.position.copy(this.look);
    this.bounce.position.set(this.look.x - 24, 20, this.look.z + 14);
    this.bounce.target.position.copy(this.look);

    const sn = game.seasonMix();
    let sunI = 1.15 + elev * 1.15 + dawn * 0.35;
    if (night) sunI = 0.62;
    if (wx === "storm") sunI *= 0.45;
    else if (wx === "rain") sunI *= 0.62;
    else if (wx === "flood") sunI *= 0.55;
    else if (wx === "mist") sunI *= 0.72;
    else if (wx === "frost") sunI *= 0.8;
    else if (wx === "golden") sunI *= 0.9;
    else if (wx === "drought") sunI *= 1.08;
    sunI *= 1 - sn.winter * 0.12 + sn.summer * 0.06;
    const hemiI = night
      ? 0.7
      : (0.52 + elev * 0.32) * (wx === "storm" ? 0.75 : 1) * (1 - sn.winter * 0.08);
    const sunCol = new THREE.Color(
      sn.snow > 0.55 || wx === "frost"
        ? "#e8eef8"
        : wx === "storm" || wx === "flood"
          ? "#9aa8bc"
          : wx === "drought" || sn.autumn > 0.5
            ? "#f0d8a8"
            : dawn > 0.2 || dusk > 0.25 || wx === "golden" || sn.autumn > 0.25
              ? "#ffb060"
              : night
                ? "#c8d4ee"
                : "#fff4d2",
    );
    this.hemi.color.set(
      night
        ? "#c4d0e8"
        : sn.snow > 0.4 || wx === "frost"
          ? "#d8e4f0"
          : sn.autumn > 0.4
            ? "#f0d4b0"
            : "#ffe9c8",
    );
    const fog = new THREE.Color().setStyle(
      night
        ? "#6a7890"
        : sn.snow > 0.5
          ? "#c8d4e0"
          : wx === "storm"
            ? "#6a7380"
            : wx === "flood"
              ? "#5e7a78"
              : wx === "drought"
                ? "#c4b090"
                : wx === "rain"
                  ? "#8aa0a8"
                  : wx === "mist"
                    ? "#c8c4b4"
                    : wx === "frost"
                      ? "#d4dce8"
                      : sn.autumn > 0.45
                        ? "#c4a878"
                        : dawn > 0.25
                          ? "#e4c8a0"
                          : dusk > 0.3 || wx === "golden"
                            ? "#e0b888"
                            : sn.spring > 0.4
                              ? "#c8dcbe"
                              : "#d2dcbe",
    );
    let dens = night ? 0.004 : 0.003;
    if (wx === "mist") dens = 0.0078;
    if (wx === "rain") dens = 0.0052;
    if (wx === "storm") dens = 0.009;
    if (wx === "flood") dens = 0.0074;
    if (wx === "drought") dens = 0.0044;
    if (wx === "frost" || sn.snow > 0.45) dens = 0.0064;
    const k = dt > 0.4 ? 1 : 1 - Math.exp(-dt * 0.38);
    this.litSun += (sunI - this.litSun) * k;
    this.litHemi += (hemiI - this.litHemi) * k;
    this.litFogD += (dens - this.litFogD) * k;
    this.litFog.lerp(fog, k);
    this.litSunCol.lerp(sunCol, k);
    this.sun.intensity = this.litSun;
    this.sun.color.copy(this.litSunCol);
    this.hemi.intensity = this.litHemi;
    this.fill.intensity = night ? 0.38 : 0.2 + elev * 0.12;
    this.bounce.intensity = night ? 0.22 : 0.12 + elev * 0.12;
    (this.scene.fog as THREE.FogExp2).color.copy(this.litFog);
    this.scene.background = this.litFog;
    (this.scene.fog as THREE.FogExp2).density = this.litFogD;
    this.renderer.toneMappingExposure =
      (night ? 1.08 : 0.94 + elev * 0.16 + dawn * 0.08 + sn.winter * 0.06) *
      (wx === "storm" || wx === "flood" ? 0.88 : 1);

    const sunDir = this.sun.position.clone().sub(this.look).normalize();
    this.sunDisc.position.copy(this.camera.position).add(sunDir.clone().multiplyScalar(180));
    this.sunDisc.lookAt(this.camera.position);
    this.sunGlow.position.copy(this.sunDisc.position);
    this.sunGlow.lookAt(this.camera.position);
    const vis = night ? 0.22 : wx === "storm" ? 0.12 : wet ? 0.45 : 0.92;
    (this.sunDisc.material as THREE.MeshBasicMaterial).opacity = vis;
    (this.sunGlow.material as THREE.MeshBasicMaterial).opacity =
      (wx === "golden" ? 0.55 : 0.38) * vis;
    this.sky.position.copy(this.camera.position);
  }

  private syncWildlife(game: Game) {
    const stamp = (mesh: THREE.InstancedMesh | null, species: string) => {
      if (!mesh) return;
      const list = game.state.wildlife.filter((c) => c.species === species);
      const n = Math.min(list.length, instCap(mesh));
      for (let i = 0; i < n; i++) {
        const c = list[i];
        const dead = c.hp <= 0 || !game.visibleAt(c.x, c.z);
        _p.set(c.x, c.y, c.z);
        _e.set(0, c.facing, 0);
        _q.setFromEuler(_e);
        _s.setScalar(dead ? 0.001 : c.scale);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    stamp(this.deer, "deer");
    stamp(this.boars, "boar");
    stamp(this.wildGoats, "goat");
    stamp(this.birds, "bird");
  }

  private syncNature(game: Game) {
    if (!this.treesTrunk) return;
    const treeCap = instCap(this.treesTrunk);
    const nTree = Math.min(game.state.trees.length, treeCap);
    this.treeCount = nTree;
    for (let i = 0; i < nTree; i++) {
      const t = game.state.trees[i];
      const stump = t.amount <= 0;
      const seen = game.exploredAt(t.x, t.z);
      const sc = !seen ? 0.001 : stump ? t.scale * 0.22 : t.scale;
      _p.set(t.x, t.y, t.z);
      _e.set(0, i * 0.7, 0);
      _q.setFromEuler(_e);
      _s.set(sc, sc, sc);
      _m.compose(_p, _q, _s);
      this.treesTrunk.setMatrixAt(i, _m);
      _s.set(stump || !seen ? 0.001 : sc, stump || !seen ? 0.001 : sc, stump || !seen ? 0.001 : sc);
      _m.compose(_p, _q, _s);
      this.treesLeaf.setMatrixAt(i, _m);
    }
    this.treesTrunk.count = nTree;
    this.treesLeaf.count = nTree;
    this.treesTrunk.instanceMatrix.needsUpdate = true;
    this.treesLeaf.instanceMatrix.needsUpdate = true;
    if (this.rocks) {
      const rockCap = instCap(this.rocks);
      this.rockCount = Math.min(game.state.stones.length, rockCap);
      for (let i = 0; i < this.rockCount; i++) {
        const s = game.state.stones[i];
        const gone = s.amount <= 0 || !game.exploredAt(s.x, s.z);
        _p.set(s.x, s.y, s.z);
        _e.set(0, i, 0);
        _q.setFromEuler(_e);
        _s.setScalar(gone ? 0.001 : s.scale);
        _m.compose(_p, _q, _s);
        this.rocks.setMatrixAt(i, _m);
      }
      this.rocks.count = this.rockCount;
      this.rocks.instanceMatrix.needsUpdate = true;
    }
    const hideNodes = (
      mesh: THREE.InstancedMesh | undefined,
      list: { x: number; z: number; y: number; amount: number; scale: number }[],
    ) => {
      if (!mesh) return;
      const n = Math.min(list.length, instCap(mesh));
      for (let i = 0; i < n; i++) {
        const s = list[i];
        _p.set(s.x, s.y, s.z);
        _e.set(0, i, 0);
        _q.setFromEuler(_e);
        _s.setScalar(s.amount <= 0 || !game.exploredAt(s.x, s.z) ? 0.001 : s.scale);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    hideNodes(this.copper, game.state.copper);
    hideNodes(this.iron, game.state.iron);
    if (!this.bushes) return;
    const bushCap = instCap(this.bushes);
    const nBush = Math.min(game.state.forage.length, bushCap);
    this.bushCount = nBush;
    for (let i = 0; i < nBush; i++) {
      const b = game.state.forage[i];
      const gone = b.amount <= 0 || !game.exploredAt(b.x, b.z);
      _p.set(b.x, b.y, b.z);
      _e.set(0, i, 0);
      _q.setFromEuler(_e);
      _s.setScalar(gone ? 0.001 : b.scale);
      _m.compose(_p, _q, _s);
      this.bushes.setMatrixAt(i, _m);
    }
    this.bushes.count = nBush;
    this.bushes.instanceMatrix.needsUpdate = true;

    if (this.fish) {
      const nFish = Math.min(game.state.fish.length, instCap(this.fish));
      const t = game.state.time;
      for (let i = 0; i < nFish; i++) {
        const f = game.state.fish[i];
        const gone = f.amount <= 0 || !game.exploredAt(f.x, f.z);
        const bob = Math.sin(t * 1.6 + i) * 0.08;
        _p.set(f.x, game.world.waterY + 0.1 + bob, f.z);
        _e.set(0, t * 0.4 + i, 0.12);
        _q.setFromEuler(_e);
        _s.setScalar(gone ? 0.001 : f.scale);
        _m.compose(_p, _q, _s);
        this.fish.setMatrixAt(i, _m);
      }
      this.fish.count = nFish;
      this.fish.instanceMatrix.needsUpdate = true;
    }
  }

  private syncBuildings(game: Game) {
    const grouped = new Map<BldType, typeof game.state.buildings>();
    for (const type of BLD_TYPES) grouped.set(type, []);
    for (const b of game.state.buildings) {
      if (b.hp <= 0) continue;
      grouped.get(b.type)?.push(b);
    }
    for (const type of BLD_TYPES) {
      const list = grouped.get(type)!;
      const meshes = this.bldMeshes.get(type);
      if (!meshes) continue;
      const cap = instCap(meshes.timber);
      const n = Math.min(list.length, cap);
      for (let i = 0; i < n; i++) {
        const b = list[i];
        const seen = b.team === 0 || game.exploredAt(b.x, b.z);
        const st = TEAM_STYLE[b.team] || TEAM_STYLE[0];
        const done = b.build >= 1;
        const ys = !seen ? 0.001 : done ? 1 : 0.22 + 0.78 * Math.max(0, b.build);
        _p.set(b.x, b.y, b.z);
        _e.set(0, st.yaw, 0);
        _q.setFromEuler(_e);
        _s.set(seen ? st.sx : 0.001, seen ? ys * st.sy : 0.001, seen ? st.sz : 0.001);
        _m.compose(_p, _q, _s);
        meshes.timber.setMatrixAt(i, _m);
        if (seen && b.build < 0.55) {
          _s.set(0.001, 0.001, 0.001);
          _m.compose(_p, _q, _s);
        }
        meshes.roof.setMatrixAt(i, _m);
        meshes.extra?.setMatrixAt(i, _m);
        _c.set(st.timber);
        if (meshes.timber.instanceColor) meshes.timber.setColorAt(i, _c);
        _c.set(type === "cornerstone" ? game.tribe(b.team).color : st.roof);
        if (meshes.roof.instanceColor) meshes.roof.setColorAt(i, _c);
      }
      meshes.timber.count = n;
      meshes.roof.count = n;
      if (meshes.extra) meshes.extra.count = n;
      meshes.timber.instanceMatrix.needsUpdate = true;
      meshes.roof.instanceMatrix.needsUpdate = true;
      if (meshes.extra) meshes.extra.instanceMatrix.needsUpdate = true;
      if (meshes.timber.instanceColor) meshes.timber.instanceColor.needsUpdate = true;
      if (meshes.roof.instanceColor) meshes.roof.instanceColor.needsUpdate = true;
    }
  }

  private syncUnits(game: Game) {
    const grouped = new Map<UnitType, typeof game.state.units>();
    for (const t of UNIT_TYPES) grouped.set(t, []);
    for (const u of game.state.units) {
      if (u.hp > 0) grouped.get(u.type)?.push(u);
    }
    let ri = 0;
    for (const t of UNIT_TYPES) {
      const list = grouped.get(t)!;
      const mesh = this.unitMeshes.get(t);
      if (!mesh) continue;
      const cap = instCap(mesh);
      const n = Math.min(list.length, cap);
      for (let i = 0; i < n; i++) {
        const u = list[i];
        const seen = u.team === 0 || game.visibleAt(u.x, u.z);
        if (!seen) {
          _p.set(u.x, u.y, u.z);
          _q.identity();
          _s.set(0.001, 0.001, 0.001);
          _m.compose(_p, _q, _s);
          mesh.setMatrixAt(i, _m);
          continue;
        }
        const spd = Math.hypot(u.vx, u.vz);
        const walking = spd > 0.35;
        const chopping =
          !walking && (u.order === "gather" || u.order === "attack" || u.order === "build");
        const phase = u.stride;
        const bob = walking
          ? Math.abs(Math.sin(phase)) * 0.16
          : chopping
            ? Math.abs(Math.sin(phase)) * 0.08
            : 0;
        const pitch = walking ? Math.sin(phase) * 0.22 : chopping ? Math.sin(phase) * 0.14 : 0;
        const roll = walking ? Math.sin(phase * 2) * 0.12 : 0;
        const yScale = walking ? 1.65 * (1 + Math.sin(phase * 2) * 0.045) : 1.65;
        const st = TEAM_STYLE[u.team] || TEAM_STYLE[0];
        const body =
          (u.type === "leader" ? 1.95 : 1.65) *
          (u.stature || 1) *
          (u.team === 1 ? 1.12 : u.team === 2 ? 0.92 : 1);
        _p.set(u.x, u.y + bob, u.z);
        _e.set(pitch, u.facing, roll);
        _q.setFromEuler(_e);
        _s.set(
          body * st.sx,
          (u.type === "leader" ? yScale * 1.18 : yScale) * (u.stature || 1) * st.sy,
          body * st.sz,
        );
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
        _c.set(st.unit);
        _c.offsetHSL(((u.tint || 0) - 0.5) * 0.12, 0.04, ((u.stature || 1) - 1) * 0.12);
        if (mesh.instanceColor) mesh.setColorAt(i, _c);
        if (u.selected && ri < 40) {
          _p.set(u.x, u.y + 0.05, u.z);
          _e.set(-Math.PI / 2, 0, 0);
          _q.setFromEuler(_e);
          _s.set(u.r * 1.6, u.r * 1.6, 1);
          _m.compose(_p, _q, _s);
          this.rings.setMatrixAt(ri, _m);
          ri++;
        }
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    if (game.state.selBld && game.state.selBld.hp > 0 && ri < 40) {
      const b = game.state.selBld;
      _p.set(b.x, b.y + 0.06, b.z);
      _e.set(-Math.PI / 2, 0, 0);
      _q.setFromEuler(_e);
      _s.set(Math.max(b.w, b.d) * 0.55, Math.max(b.w, b.d) * 0.55, 1);
      _m.compose(_p, _q, _s);
      this.rings.setMatrixAt(ri, _m);
      ri++;
    }
    this.rings.count = ri;
    this.rings.instanceMatrix.needsUpdate = true;

    let wi = 0;
    const wcap = instCap(this.workRings);
    for (const b of game.state.buildings) {
      if (b.hp <= 0 || b.team !== 0) continue;
      const r =
        b.type === "lumber"
          ? LUMBER_R
          : b.type === "quarry"
            ? QUARRY_R
            : b.type === "dock"
              ? 20
              : 0;
      if (!r) continue;
      if (b.type !== "lumber" && !b.selected && game.state.placing !== b.type) continue;
      if (wi >= wcap) break;
      const scale = r / LUMBER_R;
      _p.set(b.x, b.y + 0.08, b.z);
      _e.set(-Math.PI / 2, 0, 0);
      _q.setFromEuler(_e);
      _s.set(scale, scale, 1);
      _m.compose(_p, _q, _s);
      this.workRings.setMatrixAt(wi, _m);
      wi++;
    }
    if (game.state.placing === "lumber" && this.ghost.visible && wi < wcap) {
      _p.set(this.ghost.position.x, this.ghost.position.y + 0.08, this.ghost.position.z);
      _e.set(-Math.PI / 2, 0, 0);
      _q.setFromEuler(_e);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.workRings.setMatrixAt(wi, _m);
      wi++;
    }
    this.workRings.count = wi;
    this.workRings.instanceMatrix.needsUpdate = true;
  }

  private syncGhost(_game: Game) {
    /* ghost visibility is owned by Engine.updateGhost / setGhost */
  }

  setGhost(type: BldType | null, x: number, z: number, y: number, ok: boolean) {
    if (!type) {
      this.clearGhost();
      this.ghost.visible = false;
      return;
    }
    this.ghost.visible = true;
    this.ghost.position.set(x, y, z);
    const key = type + (ok ? "-ok" : "-bad");
    if (this.ghost.userData.key === key) return;
    this.clearGhost();
    this.ghost.userData.key = key;
    const meshes = this.bldMeshes.get(type);
    if (!meshes) return;
    const tint = ok ? "#6a8a48" : "#8a3a32";
    const mt = this.mats.timber.clone();
    mt.transparent = true;
    mt.opacity = 0.55;
    mt.depthWrite = false;
    mt.color.set(tint);
    mt.emissive.set(tint);
    mt.emissiveIntensity = 0.35;
    const mr = this.mats.thatch.clone();
    mr.transparent = true;
    mr.opacity = 0.5;
    mr.depthWrite = false;
    mr.color.set(ok ? "#8aaa58" : "#a05048");
    this.ghost.add(new THREE.Mesh(meshes.timber.geometry, mt));
    this.ghost.add(new THREE.Mesh(meshes.roof.geometry, mr));
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.08;
    this.ghost.add(pad);
    if (type === "lumber") {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(LUMBER_R - 0.5, LUMBER_R + 0.25, 48),
        new THREE.MeshBasicMaterial({
          color: ok ? "#8ab050" : "#8a3a32",
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      this.ghost.add(ring);
    }
  }

  private clearGhost() {
    while (this.ghost.children.length) {
      const ch = this.ghost.children[0] as THREE.Mesh;
      this.ghost.remove(ch);
      const mat = ch.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    }
    this.ghost.userData.key = "";
  }

  private syncArrows(game: Game) {
    const ps = game.state.projectiles;
    ps.forEach((p, i) => {
      if (i >= 40) return;
      _p.set(p.x, p.y, p.z);
      const dx = p.tx - p.x,
        dy = p.ty - p.y,
        dz = p.tz - p.z;
      _e.set(0, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
      _q.setFromEuler(_e);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.arrows.setMatrixAt(i, _m);
    });
    this.arrows.count = Math.min(ps.length, 40);
    this.arrows.instanceMatrix.needsUpdate = true;
  }

  private syncSmoke(game: Game, dt: number) {
    const halls = game.state.buildings.filter((b) => b.type === "townhall" && b.hp > 0);
    const n = 72;
    for (let i = 0; i < n; i++) {
      const h = halls[i % Math.max(halls.length, 1)];
      if (!h) {
        this.smokePos[i * 3 + 1] = -10;
        continue;
      }
      const t = game.state.time * 0.35 + i * 0.4;
      const k = (t % 3.2) / 3.2;
      this.smokePos[i * 3] = h.x + 1.6 + Math.sin(t) * 0.35;
      this.smokePos[i * 3 + 1] = h.y + 0.9 + k * 5.2;
      this.smokePos[i * 3 + 2] = h.z + 4.2 + Math.cos(t * 0.7) * 0.28;
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
    if (this.flames) {
      const night = game.isNight();
      let fi = 0;
      const torchBlds = game.state.buildings.filter(
        (b) =>
          b.hp > 0 &&
          game.finished(b) &&
          (b.type === "townhall" ||
            b.type === "hut" ||
            b.type === "watchtower" ||
            b.type === "keep" ||
            b.type === "lumber" ||
            b.type === "barracks"),
      );
      for (const h of torchBlds) {
        if (fi >= 40) break;
        const flicker = 0.85 + Math.sin(game.state.time * 11 + fi) * 0.18;
        _p.set(h.x + 1.2, h.y + (night ? 1.35 : 0.28), h.z + (h.type === "townhall" ? 4.2 : 1.4));
        _e.set(0, fi, 0);
        _q.setFromEuler(_e);
        const on = night || h.type === "townhall";
        _s.set(on ? 0.55 : 0.001, on ? flicker : 0.001, on ? 0.55 : 0.001);
        _m.compose(_p, _q, _s);
        this.flames.setMatrixAt(fi++, _m);
      }
      if (night) {
        let torches = 0;
        for (const u of game.state.units) {
          if (fi >= instCap(this.flames) || torches >= 12) break;
          if (u.hp <= 0) continue;
          const flicker = 0.7 + Math.sin(game.state.time * 14 + u.id) * 0.2;
          _p.set(u.x + Math.sin(u.facing) * 0.35, u.y + 1.15, u.z + Math.cos(u.facing) * 0.35);
          _e.set(0, u.facing, 0);
          _q.setFromEuler(_e);
          _s.set(0.28, flicker * 0.55, 0.28);
          _m.compose(_p, _q, _s);
          this.flames.setMatrixAt(fi++, _m);
          torches++;
        }
      }
      this.flames.count = fi;
      this.flames.instanceMatrix.needsUpdate = true;
      const spots: { x: number; y: number; z: number }[] = [];
      for (const h of torchBlds) {
        if (
          h.type === "townhall" ||
          h.type === "watchtower" ||
          h.type === "keep" ||
          (night && h.type === "hut")
        ) {
          spots.push({ x: h.x, y: h.y + 2.2, z: h.z });
        }
      }
      this.torchLights.forEach((L, i) => {
        const s = spots[i];
        if (!s) {
          L.intensity = 0;
          return;
        }
        L.position.set(s.x, s.y, s.z);
        L.intensity = night
          ? 1.55 + Math.sin(game.state.time * 9 + i) * 0.25
          : i === 0
            ? 0.45
            : 0.12;
        L.distance = night ? 24 : 14;
      });
    }
    const home = halls.find((h) => h.team === 0);
    if (home) {
      this.hearth.position.set(home.x + 1.6, home.y + 0.85, home.z + 4.2);
      this.hearth.intensity = (game.isNight() ? 2.4 : 1.35) + Math.sin(game.state.time * 9) * 0.25;
    }
    void dt;
  }

  render() {
    if (this.lost || this.disposed) return;
    try {
      if (this.composer && this.quality !== "low") this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    } catch {
      this.composer = null;
      this.bloom = null;
      try {
        this.renderer.render(this.scene, this.camera);
      } catch {
        this.lost = true;
      }
    }
  }

  private onGlLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.composer = null;
    this.bloom = null;
    this.onContextLost?.();
  };

  private onGlRestored = () => {
    this.lost = false;
    this.resize();
    this.setupComposer();
    this.onContextRestored?.();
  };

  private makeWaterMat() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: this.timeU,
        uColor: { value: new THREE.Color("#3e7a78") },
        uDeep: { value: new THREE.Color("#16323c") },
      },
      vertexShader: `
        varying vec3 vWPos;
        varying vec3 vN;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWPos = w.xyz;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uDeep;
        varying vec3 vWPos;
        varying vec3 vN;
        void main() {
          float waves = sin(vWPos.x * 0.32 + uTime * 1.35) + sin(vWPos.z * 0.26 + uTime * 1.05);
          vec3 n = normalize(vN + vec3(waves * 0.07, 0.0, waves * 0.05));
          float fres = pow(1.0 - clamp(n.y, 0.0, 1.0), 2.2);
          vec3 col = mix(uDeep, uColor, 0.52 + waves * 0.07);
          col += vec3(0.62, 0.78, 0.82) * fres * 0.5;
          gl_FragColor = vec4(col, 0.76 + fres * 0.14);
        }`,
    });
  }

  private setupGodrays() {
    const geo = new THREE.PlaneGeometry(3.2, 44);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: "#ffe6b8",
        transparent: true,
        opacity: 0.03,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.godrays.push(mesh);
    }
  }

  private setupFow() {
    this.fowTex = new THREE.DataTexture(this.fowData, FOW, FOW, THREE.RGBAFormat);
    this.fowTex.magFilter = THREE.LinearFilter;
    this.fowTex.minFilter = THREE.LinearFilter;
    this.fowTex.needsUpdate = true;
    this.terrTex = new THREE.DataTexture(this.terrData, FOW, FOW, THREE.RGBAFormat);
    this.terrTex.magFilter = THREE.LinearFilter;
    this.terrTex.minFilter = THREE.LinearFilter;
    this.terrTex.needsUpdate = true;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: this.fowTex },
        uTerr: { value: this.terrTex },
        uHalf: { value: HALF },
        uSize: { value: MAP },
      },
      vertexShader: `
        uniform float uHalf;
        uniform float uSize;
        varying vec2 vUv;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vUv = (w.xz + vec2(uHalf)) / uSize;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform sampler2D uTerr;
        varying vec2 vUv;
        void main() {
          float v = texture2D(uMap, vUv).r;
          vec4 terr = texture2D(uTerr, vUv);
          float live = smoothstep(0.55, 0.85, v);
          float shroudA = mix(0.94, 0.58, smoothstep(0.12, 0.55, v)) * (1.0 - live);
          float seen = smoothstep(0.12, 0.28, v);
          float wash = terr.a * seen * (live > 0.5 ? 0.2 : 0.12);
          float a = max(shroudA, wash);
          if (a < 0.012) discard;
          vec3 col = mix(vec3(0.04, 0.05, 0.06), terr.rgb, wash / max(a, 0.001));
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.fowMesh = new THREE.Mesh(new THREE.PlaneGeometry(MAP, MAP), mat);
    this.fowMesh.rotation.x = -Math.PI / 2;
    this.fowMesh.position.y = 0.45;
    this.fowMesh.renderOrder = 6;
    this.fowMesh.raycast = () => {};
    this.scene.add(this.fowMesh);
  }

  private setupComposer() {
    try {
      this.composer?.dispose();
      this.composer = null;
      this.bloom = null;
      if (this.quality === "low") return;
      const el = this.renderer.domElement;
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 600;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.14, 0.28, 0.92);
      this.composer.addPass(this.bloom);
      const vig = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          offset: { value: 0.85 },
          darkness: { value: 0.32 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - 0.5) * vec2(offset);
            float vig = clamp(1.0 - dot(uv, uv) * darkness, 0.35, 1.0);
            gl_FragColor = vec4(c.rgb * vig, c.a);
          }`,
      });
      this.composer.addPass(vig);
      this.composer.addPass(new FilmPass(0.11, false));
      this.composer.setSize(w, h);
    } catch {
      this.composer = null;
      this.bloom = null;
    }
  }

  private syncFow(game: Game) {
    if (!this.fowTex) return;
    const src = game.vision;
    const cols: [number, number, number][] = [];
    for (let t = 0; t < 3; t++) {
      const hex = game.tribe(t)?.color || "#c4a060";
      const n = Number.parseInt(hex.replace("#", ""), 16);
      cols.push([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    }
    const terr = game.territory;
    for (let i = 0; i < src.length; i++) {
      const v = src[i] === 2 ? 255 : src[i] === 1 ? 90 : 0;
      const o = i * 4;
      this.fowData[o] = v;
      this.fowData[o + 1] = v;
      this.fowData[o + 2] = v;
      this.fowData[o + 3] = 255;
      const team = terr ? terr[i] : 255;
      const seen = src[i] > 0;
      if (!seen || team === 255 || team === undefined) {
        this.terrData[o] = 0;
        this.terrData[o + 1] = 0;
        this.terrData[o + 2] = 0;
        this.terrData[o + 3] = 0;
      } else if (team === 254) {
        this.terrData[o] = 196;
        this.terrData[o + 1] = 154;
        this.terrData[o + 2] = 92;
        this.terrData[o + 3] = 255;
      } else {
        const c = cols[team] || cols[0];
        this.terrData[o] = c[0];
        this.terrData[o + 1] = c[1];
        this.terrData[o + 2] = c[2];
        this.terrData[o + 3] = 255;
      }
    }
    this.fowTex.needsUpdate = true;
    if (this.terrTex) this.terrTex.needsUpdate = true;
  }

  private syncRain(game: Game, dt: number) {
    if (!this.rain || !this.rainGeo) return;
    const sn = game.seasonMix();
    const flake = sn.snow > 0.35;
    const wet =
      flake ||
      game.state.weather === "rain" ||
      game.state.weather === "storm" ||
      game.state.weather === "flood";
    this.rain.visible = wet && this.quality !== "low";
    if (!wet) return;
    const n = this.rainPos.length / 3;
    const look = this.look;
    const heavy = flake ? 7 : game.state.weather === "storm" ? 28 : 16;
    const mat = this.rain.material as THREE.PointsMaterial;
    mat.color.set(flake ? "#eef4fa" : "#c5d4e4");
    mat.size = flake ? 0.22 : 0.11;
    mat.opacity = flake ? 0.7 : game.state.weather === "storm" ? 0.55 : 0.38;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      let x = this.rainPos[o];
      let y = this.rainPos[o + 1];
      let z = this.rainPos[o + 2];
      if (x === 0 && y === 0 && z === 0) {
        x = look.x + (Math.random() - 0.5) * 42;
        y = look.y + 6 + Math.random() * 14;
        z = look.z + (Math.random() - 0.5) * 42;
      }
      y -= heavy * dt;
      x += dt * (flake ? 1.4 : game.state.weather === "storm" ? -3 : -1.2);
      if (y < look.y - 0.2) {
        x = look.x + (Math.random() - 0.5) * 42;
        y = look.y + 8 + Math.random() * 12;
        z = look.z + (Math.random() - 0.5) * 42;
      }
      this.rainPos[o] = x;
      this.rainPos[o + 1] = y;
      this.rainPos[o + 2] = z;
    }
    const attr = this.rainGeo.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  private paintSeason(game: Game, dt: number) {
    this.seasonAcc += dt;
    if (this.seasonAcc < 0.2 && this.lastSnow >= 0) return;
    this.seasonAcc = 0;
    const sn = game.seasonMix();
    this.lastSnow = sn.snow;
    const geo = this.terrain.geometry as THREE.BufferGeometry;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
    const pos = geo.attributes.position;
    const biome = this.terrainBiome;
    const region = this.terrainRegion;
    if (!colAttr || !biome) return;
    const arr = colAttr.array as Float32Array;
    const c = _c;
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i);
      const b = biome[i];
      const n = (Math.sin(pos.getX(i) * 0.21) + Math.cos(pos.getZ(i) * 0.17)) * 0.08;
      if (b === 0) c.set("#cbb892");
      else if (b === 1) c.set("#c8b89a");
      else if (b === 5) c.set("#b8b4ac");
      else if (b === 6) c.set("#c4a070");
      else if (b === 7) c.set("#c8c4bc");
      else if (b === 4) {
        c.setRGB(
          0.55 * sn.spring + 0.52 * sn.summer + 0.5 * sn.autumn + 0.48 * sn.winter,
          0.48 * sn.spring + 0.46 * sn.summer + 0.38 * sn.autumn + 0.42 * sn.winter,
          0.28 * sn.spring + 0.26 * sn.summer + 0.2 * sn.autumn + 0.32 * sn.winter,
        );
      } else if (b === 8) {
        c.setRGB(
          0.2 * sn.spring + 0.18 * sn.summer + 0.26 * sn.autumn + 0.2 * sn.winter,
          0.36 * sn.spring + 0.32 * sn.summer + 0.24 * sn.autumn + 0.26 * sn.winter,
          0.14 * sn.spring + 0.12 * sn.summer + 0.1 * sn.autumn + 0.16 * sn.winter,
        );
      } else {
        const gR = 0.42 * sn.spring + 0.36 * sn.summer + 0.48 * sn.autumn + 0.4 * sn.winter;
        const gG = 0.62 * sn.spring + 0.52 * sn.summer + 0.38 * sn.autumn + 0.44 * sn.winter;
        const gB = 0.28 * sn.spring + 0.22 * sn.summer + 0.16 * sn.autumn + 0.32 * sn.winter;
        if (b === 3) {
          c.setRGB(gR * 0.92, gG * 1.08, gB * 0.9);
        } else c.setRGB(gR, gG, gB);
      }
      const rk = region ? region[i] : 255;
      if (rk === 0) {
        c.r = c.r * 0.88 + 0.46 * 0.12;
        c.g = c.g * 0.78 + 0.42 * 0.22;
        c.b = c.b * 0.82 + 0.38 * 0.18;
      } else if (rk === 1) {
        c.r = c.r * 0.9;
        c.g = Math.min(1, c.g * 1.12 + 0.04);
        c.b = Math.min(1, c.b * 1.06 + 0.02);
      } else if (rk === 2) {
        c.r = c.r * 0.86;
        c.g = c.g * 0.92;
        c.b = c.b * 0.8;
      } else if (rk === 3) {
        c.r = Math.min(1, c.r * 0.9 + 0.18);
        c.g = c.g * 0.82 + 0.08;
        c.b = c.b * 0.7;
      }
      c.r = Math.min(1, c.r + n);
      c.g = Math.min(1, c.g + n * 0.6);
      const snowH = Math.max(0, Math.min(1, (h - 3.2) / 12));
      let cover = Math.max(
        0,
        Math.min(1, sn.snow * (0.35 + snowH * 0.75) + (b === 7 || b === 5 ? sn.winter * 0.25 : 0)),
      );
      if (rk === 0) cover = Math.min(1, cover + sn.winter * 0.12);
      if (rk === 1) cover *= 0.72;
      if (cover > 0.02) {
        c.r = c.r + (0.93 - c.r) * cover;
        c.g = c.g + (0.95 - c.g) * cover;
        c.b = c.b + (0.97 - c.b) * cover;
      }
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      if (!game.exploredAt(vx, vz)) {
        c.r *= 0.05;
        c.g *= 0.05;
        c.b *= 0.06;
      } else if (!game.visibleAt(vx, vz)) {
        c.r *= 0.45;
        c.g *= 0.45;
        c.b *= 0.48;
      }
      const o = i * 3;
      arr[o] = c.r;
      arr[o + 1] = c.g;
      arr[o + 2] = c.b;
    }
    colAttr.needsUpdate = true;

    if (this.treesLeaf?.instanceColor) {
      const nTree = this.treesLeaf.count;
      for (let i = 0; i < nTree; i++) {
        const hue = 0.33 * sn.spring + 0.3 * sn.summer + 0.075 * sn.autumn + 0.2 * sn.winter;
        const sat = 0.62 * sn.spring + 0.55 * sn.summer + 0.72 * sn.autumn + 0.16 * sn.winter;
        const lit =
          0.34 * sn.spring +
          0.32 * sn.summer +
          0.42 * sn.autumn +
          0.48 * sn.winter +
          (i % 6) * 0.02;
        c.setHSL(hue, sat, lit);
        if (sn.autumn > 0.4) {
          c.r = c.r + (0.62 - c.r) * sn.autumn * 0.55;
          c.g = c.g + (0.32 - c.g) * sn.autumn * 0.4;
        }
        if (sn.spring > 0.45) {
          c.g = Math.min(1, c.g + 0.08 * sn.spring);
          c.r = Math.min(1, c.r + 0.04 * sn.spring);
        }
        if (sn.snow > 0.35) {
          const k = Math.min(1, sn.snow * 0.85);
          c.r = c.r + (0.9 - c.r) * k;
          c.g = c.g + (0.93 - c.g) * k;
          c.b = c.b + (0.95 - c.b) * k;
        }
        const tree = game.state.trees[i];
        if (tree) {
          const tr = game.regionAt(tree.x, tree.z);
          if (tr) {
            if (tr.cluster === 0) {
              c.r = Math.min(1, c.r + 0.08);
              c.g = c.g * 0.88;
            } else if (tr.cluster === 1) {
              c.g = Math.min(1, c.g + 0.07);
            } else if (tr.res === "copper") {
              c.r = Math.min(1, c.r + 0.1);
              c.g = c.g * 0.9;
            } else {
              c.r = c.r * 0.9;
              c.g = c.g * 0.92;
              c.b = c.b * 0.85;
            }
          }
        }
        this.treesLeaf.setColorAt(i, c);
      }
      this.treesLeaf.instanceColor.needsUpdate = true;
    }

    if (this.grass?.instanceColor) {
      const n = this.grass.count;
      this.grass.visible = this.quality !== "low" && sn.snow < 0.72;
      for (let i = 0; i < n; i++) {
        c.setHSL(
          0.3 * sn.spring + 0.28 * sn.summer + 0.09 * sn.autumn + 0.16 * sn.winter,
          0.62 * sn.spring + 0.5 * sn.summer + 0.55 * sn.autumn + 0.18 * sn.winter,
          0.38 * sn.spring + 0.36 * sn.summer + 0.4 * sn.autumn + 0.5 * sn.winter + (i % 5) * 0.02,
        );
        const gk = this.grassRegion ? this.grassRegion[i] : 255;
        if (gk === 0) {
          c.r = Math.min(1, c.r + 0.08);
          c.g = c.g * 0.82;
          c.b = c.b * 0.85;
        } else if (gk === 1) {
          c.g = Math.min(1, c.g + 0.1);
          c.b = Math.min(1, c.b + 0.03);
        } else if (gk === 2) {
          c.r = c.r * 0.88;
          c.g = c.g * 0.9;
        } else if (gk === 3) {
          c.r = Math.min(1, c.r + 0.14);
          c.g = c.g * 0.85;
        }
        if (sn.snow > 0.4) {
          const k = Math.min(1, sn.snow);
          c.r += (0.92 - c.r) * k;
          c.g += (0.94 - c.g) * k;
          c.b += (0.96 - c.b) * k;
        }
        this.grass.setColorAt(i, c);
      }
      this.grass.instanceColor.needsUpdate = true;
    }

    if (this.bushes) {
      const bm = this.bushes.material as THREE.MeshStandardMaterial;
      bm.color.setHSL(
        0.28 * sn.spring + 0.32 * sn.summer + 0.06 * sn.autumn + 0.2 * sn.winter,
        0.45,
        0.38 + sn.spring * 0.08,
      );
    }

    const waterMat = this.water?.material as THREE.ShaderMaterial | undefined;
    if (waterMat?.uniforms?.uColor) {
      (waterMat.uniforms.uColor.value as THREE.Color).set(sn.winter > 0.5 ? "#7a9aaa" : "#3e7a78");
      (waterMat.uniforms.uDeep.value as THREE.Color).set(sn.winter > 0.5 ? "#2a4450" : "#16323c");
    }
  }

  private disposeWorld() {
    const keep = new Set([
      this.ghost,
      this.arrows,
      this.smoke,
      this.floaters,
      this.rings,
      this.workRings,
      this.hemi,
      this.sun,
      this.sun.target,
      this.fill,
      this.hearth,
      this.sky,
      this.sunDisc,
      this.sunGlow,
      this.bounce,
      this.bounce.target,
    ]);
    for (const L of this.torchLights) keep.add(L);
    for (const r of this.godrays) keep.add(r);
    if (this.fowMesh) keep.add(this.fowMesh);
    if (this.rain) keep.add(this.rain);
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (o === this.scene || keep.has(o) || keep.has(o.parent as THREE.Object3D)) return;
      if (
        o.parent === this.scene &&
        o !== this.hemi &&
        o !== this.sun &&
        o !== this.fill &&
        o !== this.sun.target
      ) {
        toRemove.push(o);
      }
    });
    for (const o of toRemove) {
      this.scene.remove(o);
      if (this.lost) continue;
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
    this.bldMeshes.clear();
    this.unitMeshes.clear();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const el = this.renderer.domElement;
    el.removeEventListener("webglcontextlost", this.onGlLost);
    el.removeEventListener("webglcontextrestored", this.onGlRestored);
    this.disposeWorld();
    this.renderer.setAnimationLoop(null);
    try {
      this.composer?.dispose();
    } catch {
      /* context already gone */
    }
    this.composer = null;
    this.bloom = null;
    try {
      this.renderer.dispose();
    } catch {
      /* already torn down */
    }
    for (const k of Object.values(this.mats)) {
      k.map?.dispose();
      k.bumpMap?.dispose();
      k.dispose();
    }
  }
}
