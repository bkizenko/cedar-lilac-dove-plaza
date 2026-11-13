import {MethodRecordLayer} from './methodRecordLayer';
import {GroundItemLayer} from './groundItemLayer';
import {DraftCartLayer,DRAFT_CART_RENDER} from './draftCartLayer';
import {SiegeRamLayer} from './siegeRams';
import {SailRigs} from './sailRigs';
import {InstanceCameraCull} from './instanceCameraCull';
import {HousingPacketLayer} from './housingPackets';
import{civicPartColor}from'./classicalBuildings';
import{BuildingGroundingLayer}from'./buildingGrounding';
import {countEntityFrustum,type CensusSource} from './entityFrustumCensus';
import {fishMarkerHeight} from './resourceSurface';
import {BankTerrainLayer} from './bankTerrainLayer';
import {beginRendererFrame,rendererFrameMetrics,type RendererFrameMetrics} from './renderMetrics';
import{HullFleet}from'./hullFleet';
import {bindSnowCap,carvedSnowUniform} from './roofSnow';
import {hasBuildingCraftsmanship,buildingCraftsmanship,makeCraftsmanshipAttribute,bindCraftsmanship} from './buildingCraftsmanship';
import {disposeBuildingSurfaceTextures} from './buildingSurfaces';
import type {CameraGround} from './cameraClearance';
import {FixedOrbitCameraCollision} from './fixedOrbitCollision';
import {survivalFireActive} from '@/game/survivalNeeds';
import {buildingCharacter,workingHearths} from './buildingCharacter';
import {wildlifeInstanceAnimals,growWildlifeMesh} from './wildlifeInstances';
import {FibreWorkLayer} from './fibreWorkLayer';
import {BasketLayer} from './basketLayer';
import {PenFenceLayer} from './penFenceLayer';
import {WaterVesselLayer} from './waterVesselLayer';
import {WornGarmentLayer} from './wornGarments';
import {WornArmorLayer} from './wornArmor';
import {PeopleAdapter} from './peopleAdapter';
import {unitFeedbackVisible,pointerNearPerson} from '../game/unitFeedback';
import {admitVisibleUnits} from './unitRenderAdmission';
import {ensureInstanceCapacity} from './instanceCapacity';
import {ExcavationLayer} from './excavationLayer';
import {excavationTerrain} from '../game/excavation';
import {WildPlantLayer} from './wildPlants';
import {wildPlantsEnabled,habitatKindAt} from '../game/ecology';
import {LandContinuation} from './landContinuation';
import {TowerPlatformLayer} from './towerPlatformLayer';
import {CarvedBuildingLayer,carvedGeometry,createCarvedMaterial,type CarvedInstance} from './carvedBuildingLayer';
import {carvedDaylightGrade,CARVED_LIGHT_RIG} from './carvedPalette';
import {habitatForProvince,habitatForBaseKind} from './carvedHabitat';
import {provinceAt} from '../game/ecologicalProvinces';
import {CARVED_TYPES} from './buildingStyleMap';
import {villageHeraldry} from './villageIdentity';
import {facesPlaza,nearestAnchor,plazaQuarterTurns} from './placementFacing';
import {lineIndex,joinMaskFor,LINE_OF_TYPE,waterSideFor} from './carvedLines';
import {fabricContext} from '@/game/buildingFabric';
import {hearthHeating} from '@/game/survivalNeeds';
import {towerPlatformGeos,towerPlatformGeometryKey} from './towerPlatformKit';
import type {TowerPlatform} from '../game/towerPlatforms';
import {gateOrientation,type GateFacing} from '../game/gateGeometry';
import {GRAPHICS_RULES,loadGraphicsQuality,graphicsPixelRatio} from '../game/graphics';
import {DrawDistanceGovernor,drawBands,loadDrawDistance,type DrawBands,type DrawDistance} from '../game/drawDistance';
import {currentRenderStyle,type RenderStyle} from './renderStyle';
import {loadMapStyle,rememberMapStyle,type MapStyle} from './mapStyle';
import {painterAtmosphere,makePainterSky,PAINTER_GRADE_SHADER} from './painterAtmosphere';
import {setBuildingGrammar} from './buildingFamilies';
import {skinOfTeam} from '@/game/skinState';
import {WonderLayer} from './wonderLayer';
/** Banners hang at half-mast this many sim seconds after a succession (two dynastic years). */
const MOURNING_SECONDS=180;
import {millPowerKw,MILL_RULES} from '@/game/millPower';
import {watermillSite} from '@/game/waterWorks';
import {setCarvedPalette} from './carvedPalette';
import {ContourFields} from './contourFields';
import {FieldSnapMarks} from './fieldSnapMarks';
import {fieldWater} from '../game/irrigation';
import {IrrigationLayer} from './irrigationLayer';
import {BiomeSceneLayer,biomeSurfaceAttributes} from './biomeSceneLayer';
import type {EcologicalProvinceGrid} from '../game/ecologicalProvinces';
import {TerrainSurface,duneSandWeight} from './terrainSurface';
import {TerrainLightmap} from './terrainLight';
import {PainterGround,blurGrid,smoothTileNormals,smoothGridNormals} from './painterGround';
import {geologyFor,dropGeology,type SurfaceGeology} from './painterGeology';
import {installPainterFog} from './painterFog';
import {ContactShadowMap} from './painterContact';
import {RouteFieldMap,routeRibbons} from './routeField';
import {WaystationLayer} from './waystationLayer';
import {routesEnabled} from '../game/routeWear';
import {trailStampTexture,painterNodeRock} from './painterTrees';
import {makeDepthWater,addLocalWaters,type RenderWaterBody,type RenderWaterfall} from './depthWater';
import {seaSurfaceY} from '../game/localWater';
import {CampVisual} from './campVisual';
import {landscapeSample,LANDSCAPE_ART_RULES,ATMOSPHERE_RULES,atmosphericDensity} from './landscapeArt';
import {foundationProfile,terrainLaidWorkplace} from './foundations';
import {FieldSurface} from "./fieldSurface";
import {daylightArt} from './daylightArt';
import {shorelineAt} from './shoreline';
import {plotModules} from './plotModules';
import {expandedGrainWorkplace} from '../game/plots';
import {compactGrainWorkplace} from '../game/cerealRules';
import {architectureStyle,localArchitecture} from "./architecture";
import {TRAIL_GRID} from "@/game/trails";
import {trailRibbons} from "@/game/trailRibbons";
import {smoothRivers} from "@/game/channelSmoothness";
import {buildingQuarterTurns,turnedFootprint} from "@/game/footprints";
import {siteRecord} from "@/game/slopeTiers";
import {foundationBoxes} from "@/game/siteFoundation";
import {carvedVariantFor,variantSpec} from './buildingStyleMap';
import {buildCarvedMesh} from './carvedMesh';
import {buildingGroundSupports} from './buildingGrounding';
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BUILDINGS, FOW, LUMBER_R, MAP, QUARRY_R, SEGS, TEAM_STYLE } from "@/game/constants";
import type { Game } from "@/game/sim";
import type { BldType, UnitType, ResKind } from "@/game/types";
import type { HaulageKind } from "@/game/haulage";
import { carryingCapacity } from "@/game/haulage";
import type { FarmToolUnit } from "@/game/farmTools";
import { draftTractionReady, farmToolRate } from "@/game/farmTools";
import { calendar } from "@/game/settlement";
import {carcassAvailable} from "@/game/hunting";
import { isFertile } from "@/game/worldgen";
import {
  buildingGeos,
  bushGeo,
  firepitGeo,
  flameGeo,
  goatGeo,
  horseGeo,
  cattleGeo,
  sheepGeo,
  deerGeo,
  boarGeo,
  birdGeo,
  makeMaterials,
  pineGeo,
  rockGeo,
  skyGeo,
  unitGeo,
  haulageGeo,
  canoePaddleGeo,
  riverboatGeo,
  cargoGeo,
  farmToolHeadGeo,
  woodenArdGeo,
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
export const BLD_TYPES: BldType[] = [
  "threshingFloor","fibreWorkshop","potter","kiln","smokehouse","grindingStone","oven","hearth","butcher","dryrack","tanner","tailor",
  "palisade", "gate", "stonewall", "trench", "moat",
  "townhall",
  "cornerstone",
  "hut", "house",
  "farm",
  "pen",  "lumber",
  "workshop",
  "quarry",
  "dock",
  "bridge",
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
  "well",
  "cistern",
  "watermill",
  "windmill",
  "aqueduct",
  "canal",
];

/** Types whose shipped look is terrain-laid or modular; Option H never replaces them. */
/** Types still drawn by the current (non-carved) path: field/pen crop and fence layers, the lumber yard's stacks, terrain-carving earthworks and the pitched bridge. Everything else is carved. */
const CARVED_KEEP_CURRENT=new Set<string>(['farm','pen','trench','moat','bridge','lumber']);
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _trailColor = new THREE.Color(), _trailColorB = new THREE.Color(), _trailColorC = new THREE.Color();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();
const _haulMatrix = new THREE.Matrix4();
const _haulEuler = new THREE.Euler(0, 0, 0, "YXZ");
const CARGO_COLORS = {food:"#c5ad71",wood:"#73502f",stone:"#a2a3a2",copper:"#bc7a4c",iron:"#666e78"};
const FARM_TOOL_COLORS = {stoneHoe:"#bcb6a6",copperTools:"#d38a55",ironTools:"#afbdc7"};

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
  foundations:BuildingGroundingLayer|null=null;
  mapSize=MAP;
  renderer: THREE.WebGLRenderer;
  latestRenderMetrics:RendererFrameMetrics|undefined;
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
  private cameraGround:CameraGround|null=null;
  private cameraGroundRevision:(()=>number)|null=null;
  private cameraCollision=new FixedOrbitCameraCollision();
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
  private towerPlatforms:TowerPlatformLayer|null=null;
  /** Option H adapter (C10 / WQ-11). 'current' is the shipped look and the default; 'carved' routes eligible
   * finished-or-growing buildings through CarvedBuildingLayer. Terrain-laid, fort, bridge and modular
   * buildings always keep the current renderer so footprints, collision and terrain stay exact. */
  private styleId:RenderStyle=currentRenderStyle();
  private renderStyle:'current'|'carved'=this.styleId==='current'?'current':'carved';
  /** Map look (2026-11 overhaul). 'painterly' is the default; 'classic' is the archived Codex-era map look. Changing it needs a rebuild(game). */
  mapStyle:MapStyle=loadMapStyle();
  private classicSky:THREE.Material|null=null;
  private painterSky:THREE.ShaderMaterial|null=null;
  private gradePass:ShaderPass|null=null;
  setMapStyle(style:MapStyle,remember=true){if(style!==this.mapStyle){this.mapStyle=style;if(remember)rememberMapStyle(style);this.applyMapStyleScene();this.setupComposer();}}
  getMapStyle(){return this.mapStyle;}
  /** Force the next sync to repaint the season-dependent ground and plant colours (used by render tools and style switches). */
  seasonDirty(){this.seasonAcc=1;this.lastSnow=-1;}
  private carvedLayer:CarvedBuildingLayer|null=null;
  private carvedOwners=new Map<THREE.Object3D,import("@/game/types").Building[]>();
  /** Select the world look: 'village' (new default grammar + natural palette), 'optionH' (legacy carved honey) or 'current' (original blocks). */
  setStyle(style:RenderStyle){
    this.styleId=style;this.renderStyle=style==='current'?'current':'carved';
    setBuildingGrammar(style==='optionH'?'legacy':'village');setCarvedPalette(style==='optionH'?'honey':'village');
  }
  getStyle():RenderStyle{return this.styleId;}
  /** CivSkins (civSkin.ts): when on (default, village style only) every society's buildings are drawn through its own skin; off = the neutral Village grammar for all. Never deletes the old grammars. */
  private skinsOn=(()=>{try{if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('skins')==='0')return false;}catch{/* on */}try{if(typeof localStorage!=='undefined'&&localStorage.getItem('hearthwild.skins')==='0')return false;}catch{/* on */}return true;})();
  setSkinsEnabled(on:boolean){this.skinsOn=on;}
  getSkinsEnabled(){return this.skinsOn;}
  /** Per team: the ruler last seen and the sim time until which the banners hang at half-mast (a succession just happened). Visual only, never saved. */
  private mourning=new Map<number,{ruler:string;until:number}>();
  private updateMourning(game:Game){
    const soc=game.state.rulers?.societies;if(!soc)return;
    for(const [id,sr] of Object.entries(soc)){
      const team=Number(id),ruler=sr.dynasty?.rulerId;if(!ruler)continue;
      const m=this.mourning.get(team);
      if(!m)this.mourning.set(team,{ruler,until:0});
      else if(m.ruler!==ruler){m.ruler=ruler;m.until=game.state.time+MOURNING_SECONDS;}
    }
  }

  setRenderStyle(style:'current'|'carved'){this.setStyle(style==='carved'?'optionH':'current');}
  getRenderStyle(){return this.renderStyle;}
  private contourFields: ContourFields | null = null;
  private wildPlantLayer:WildPlantLayer|null=null;
  private landContinuation:LandContinuation|null=null;
  private bankLayer:BankTerrainLayer|null=null;
  private excavationLayer:ExcavationLayer|null=null;
  private fieldSurface: FieldSurface | null = null;
  buildingSyncIn=0;
  private synchronizedState:Game["state"]|null=null;
  buildingInstances = new Map<THREE.Object3D, import("@/game/types").Building[]>();
  cargoMeshes = new Map<ResKind, THREE.InstancedMesh>();
  haulageMeshes = new Map<HaulageKind, THREE.InstancedMesh>();
  private packHorses: THREE.InstancedMesh | null = null;
  private packCattle: THREE.InstancedMesh | null = null;
  private packCattleOwners: import("@/game/types").Unit[] = [];
  private domesticCattleOwners: import("@/game/types").Building[] = [];
  private woodenArds: THREE.InstancedMesh | null = null;
  private woodenArdOwners: import("@/game/types").Unit[] = [];
  private packHorseOwners: import("@/game/types").Unit[] = [];
  private domesticHorseOwners: import("@/game/types").Building[] = [];
  canoePaddles: THREE.InstancedMesh | null = null;
  riverboats: THREE.InstancedMesh | null = null;
  hullFleet:HullFleet|null=null;
  private sailRigs:SailRigs|null=null;
  farmToolMesh: THREE.InstancedMesh | null = null;
  unitMeshes = new Map<UnitType, THREE.InstancedMesh>();
  private unitInstanceOwners = new Map<UnitType, import("@/game/types").Unit[]>();
  private penFences:PenFenceLayer|null=null;
  private wornGarments:WornGarmentLayer|null=null;
  private wornArmor:WornArmorLayer|null=null;
  /** Shared character rig (ASTRA-13); the legacy merged unit meshes stay as the archived set and as invisible picking proxies. */
  people:PeopleAdapter|null=null;
  private siegeRamLayer:SiegeRamLayer|null=null;
  private waterVessels:WaterVesselLayer|null=null;
  private baskets:BasketLayer|null=null;
  private housingPackets:HousingPacketLayer|null=null;
  private methodRecordMarkers:MethodRecordLayer|null=null;
  private groundItems:GroundItemLayer|null=null;
  private draftCarts:DraftCartLayer|null=null;
  private fibreWork:FibreWorkLayer|null=null;
  trailMesh!: THREE.InstancedMesh;
  private trailHalo: THREE.InstancedMesh | null = null;
  private trailSyncAt=-1;
  hoveredUnitId:number|null=null;
  rings!: THREE.InstancedMesh;
  resourceRing!: THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
  workRings!: THREE.InstancedMesh;
  ghost: THREE.Group;
  /** Terrain-fitting plinth/footing preview (world space, never rotated with the ghost) and the cache of carved ghost geometry per variant. */
  private ghostFoot=new THREE.Group();private ghostGeo=new Map<string,THREE.BufferGeometry>();private ghostGame:Game|null=null;private ghostBox=new THREE.BoxGeometry(1,1,1);
  private linePreview: THREE.InstancedMesh | null = null;
  arrows: THREE.InstancedMesh;
  huntingStones: THREE.InstancedMesh;
  smoke: THREE.Points;
  smokeGeo: THREE.BufferGeometry;
  smokePos: Float32Array;
  smokeTexture: THREE.DataTexture;
  flames!: THREE.InstancedMesh;
  pits!: THREE.InstancedMesh;
  floaters: THREE.Group;
  quality: "low" | "med" | "high" = "med";
  shadowsEnabled = GRAPHICS_RULES.defaultShadows as boolean;
  unitRingsEnabled = GRAPHICS_RULES.defaultUnitRings as boolean;
  sky: THREE.Mesh;
  sunDisc: THREE.Mesh;
  sunGlow: THREE.Mesh;
  bounce: THREE.DirectionalLight;
  deer: THREE.InstancedMesh | null = null;
  boars: THREE.InstancedMesh | null = null;
  wildGoats: THREE.InstancedMesh | null = null;
  wildHorses: THREE.InstancedMesh | null = null;
  wildCattle: THREE.InstancedMesh | null = null;
  domesticCattle: THREE.InstancedMesh | null = null;
  domesticHorses: THREE.InstancedMesh | null = null;
  wildSheep: THREE.InstancedMesh | null = null;
  domesticSheep: THREE.InstancedMesh | null = null;
  domesticGoats: THREE.InstancedMesh | null = null;
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
  private styleHalls:{id:number;x:number;z:number;team:number}[]=[];
  private villageStyles = new Map<string,ReturnType<typeof architectureStyle>>();
  private eraDetails: THREE.InstancedMesh | null = null;
  private biomeScene: BiomeSceneLayer | null = null;
  private localWater: THREE.Group | null = null;
  private terrainSurface: TerrainSurface | null = null;
  private painterGround: PainterGround | null = null;
  private surfaceGeology: SurfaceGeology | null = null;
  private contactMap: ContactShadowMap | null = null;private contactAt = 0;
  private routeField: RouteFieldMap | null = null;
  private waystations: WaystationLayer | null = null;
  private waterMaterials: THREE.Material[] = [];
  private campVisual: CampVisual | null = null;
  private terrainLandscape = new Float32Array(0);
  private terrainBiome: Uint8Array | null = null;
  private terrainRegion: Uint8Array | null = null;
  private terrainBlend = new Float32Array(0);
  private grassRegion: Uint8Array | null = null;
  private seasonAcc = 0.4;
  private lastSnow = -1;
  private carvedSnow = 0;
  private litSun = 1.2;
  private litHemi = 0.55;
  private litFogD = 0.003;
  private litFog = new THREE.Color("#d2dcbe");
  private litSunCol = new THREE.Color("#fff4d2");
  /** Draw distance (src/game/drawDistance.ts): the level the player chose, the level in force (the governor may ease it when frames stay over budget) and its bands. */
  private drawGovernor = new DrawDistanceGovernor(loadDrawDistance());
  private drawBandsNow: DrawBands = drawBands(this.drawGovernor.level, MAP);
  private lastRenderAt = 0;
  /** Called (once per easing) when the governor lowers the draw distance automatically. */
  onDrawDistanceEased?: (level: DrawDistance, chosen: DrawDistance) => void;
  private viewCull = new THREE.PerspectiveCamera();
  private viewFrustum = new THREE.Frustum();
  private viewProj = new THREE.Matrix4();
  private viewSphere = new THREE.Sphere();

  constructor(canvas: HTMLCanvasElement) {
    this.quality = loadGraphicsQuality();
    this.setStyle(this.styleId);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality === "high",
      powerPreference: "default",
      alpha: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(
      graphicsPixelRatio(this.quality,canvas.clientWidth||800,canvas.clientHeight||600,window.devicePixelRatio||1),
    );
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
    this.renderer.shadowMap.enabled = this.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.addEventListener("webglcontextlost", this.onGlLost, false);
    canvas.addEventListener("webglcontextrestored", this.onGlRestored, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#d8c4a0");
    installPainterFog();
    this.scene.fog = new THREE.FogExp2("#d8c4a0", 0.0034);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, this.drawBandsNow.cameraFar);
    try{if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('renderStyle')==='carved')this.renderStyle='carved';}catch{/* default stays 'current' */}
    this.mats = makeMaterials();

    this.hemi = new THREE.HemisphereLight("#dcebf8", "#5a6651", 0.72);
    this.scene.add(this.hemi);
    this.fill = new THREE.AmbientLight("#f1f1e6", 0.22);
    this.scene.add(this.fill);
    this.sun = new THREE.DirectionalLight("#fff1c4", 2.05);
    this.sun.castShadow = this.shadowsEnabled;
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
    this.classicSky=this.sky.material as THREE.Material;
    this.applyMapStyleScene();

    this.terrain = new THREE.Mesh();
    this.water = new THREE.Mesh();
    this.ghost = new THREE.Group();
    this.scene.add(this.ghost,this.ghostFoot);

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
    this.huntingStones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.13,0),new THREE.MeshStandardMaterial({color:"#777467",roughness:.95}),40);
    this.huntingStones.count=0;this.huntingStones.frustumCulled=false;this.scene.add(this.huntingStones);

    this.smokePos = new Float32Array(72 * 3);
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute("position", new THREE.BufferAttribute(this.smokePos, 3));
    const puffSize=32, pixels=new Uint8Array(puffSize*puffSize*4);
    for(let y=0;y<puffSize;y++)for(let x=0;x<puffSize;x++){
      const i=(y*puffSize+x)*4;
      const radius=Math.hypot((x+.5)/puffSize*2-1,(y+.5)/puffSize*2-1);
      pixels[i]=pixels[i+1]=pixels[i+2]=255;
      pixels[i+3]=Math.round(255*Math.max(0,1-radius)**2);
    }
    this.smokeTexture=new THREE.DataTexture(pixels,puffSize,puffSize);
    this.smokeTexture.magFilter=THREE.LinearFilter;
    this.smokeTexture.minFilter=THREE.LinearFilter;
    this.smokeTexture.needsUpdate=true;
    this.smoke = new THREE.Points(
      this.smokeGeo,
      new THREE.PointsMaterial({
        color: "#e8e0d4",
        map: this.smokeTexture,
        size: 1.1,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    this.smoke.frustumCulled=false;
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

    this.trailMesh=new THREE.InstancedMesh(new THREE.CircleGeometry(0.5,16),new THREE.MeshStandardMaterial({color:"#756d52",alphaMap:this.trailAlpha(),transparent:true,opacity:0.12,depthWrite:false,roughness:1,side:THREE.DoubleSide}),4096);
    this.trailMesh.count=0;this.trailMesh.frustumCulled=false;this.trailMesh.raycast=()=>{};this.scene.add(this.trailMesh);
    if(this.mapStyle==='painterly'){
     // Worn-earth ribbons read clearly: a packed-earth core over a flattened-grass halo, both soft at the rim. Colour follows wear.
     const stamp=trailStampTexture(),core=this.trailMesh.material as THREE.MeshStandardMaterial;core.alphaMap?.dispose();core.alphaMap=stamp;core.color.set('#ffffff');core.opacity=.78;core.polygonOffset=true;core.polygonOffsetFactor=-3;core.polygonOffsetUnits=-3;core.needsUpdate=true;
     this.trailMesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(4096*3).fill(1),3);
     const haloMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',alphaMap:stamp,transparent:true,opacity:.42,depthWrite:false,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
     this.trailHalo=new THREE.InstancedMesh(new THREE.CircleGeometry(0.5,16),haloMaterial,4096);this.trailHalo.count=0;this.trailHalo.frustumCulled=false;this.trailHalo.raycast=()=>{};this.trailHalo.renderOrder=-1;this.trailHalo.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(4096*3).fill(1),3);this.scene.add(this.trailHalo);
    }
    this.rings = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.7, 0.88, 20),
      new THREE.MeshBasicMaterial({
        color: "#e8c878",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
      512,
    );
    this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rings.count = 0;
    this.rings.frustumCulled = false;
    this.scene.add(this.rings);
    this.resourceRing=new THREE.Mesh(new THREE.RingGeometry(1.45,1.72,40),new THREE.MeshBasicMaterial({color:"#ffe076",side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    this.resourceRing.geometry.rotateX(-Math.PI/2);
    this.resourceRing.visible=false;this.resourceRing.frustumCulled=false;this.resourceRing.raycast=()=>{};
    this.scene.add(this.resourceRing);

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

  /** Scene-level pieces that differ between the painterly and the archived classic map look (sky dome, sun sprites, shadow softness). */
  private applyMapStyleScene() {
    const painterly=this.mapStyle==='painterly';
    if(painterly){
      this.painterSky??=makePainterSky();
      this.sky.material=this.painterSky;
      this.sunDisc.visible=false;this.sunGlow.visible=false;
      this.hemi.groundColor.set('#8a7a55');
      this.sun.shadow.bias=-0.0003;this.sun.shadow.normalBias=0.05;
      if(this.sun.shadow.radius!==undefined)this.sun.shadow.radius=2.2;
    }else{
      if(this.classicSky)this.sky.material=this.classicSky;
      this.sunDisc.visible=true;this.sunGlow.visible=true;
      this.sun.shadow.bias=-0.0004;this.sun.shadow.normalBias=0.04;this.sun.shadow.radius=1;
    }
  }

  resize() {
    if (this.lost || this.disposed) return;
    const el = this.renderer.domElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    const ratio=graphicsPixelRatio(this.quality,w,h,window.devicePixelRatio||1);
    this.renderer.setPixelRatio(ratio);
    this.composer?.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    if (this.bloom) this.bloom.resolution.set(w, h);
  }

  /** The draw distance the player chose, the one in force (lower when the governor eased it) and the bands in force. */
  getDrawDistance(): DrawDistance { return this.drawGovernor.chosen; }
  getEffectiveDrawDistance(): DrawDistance { return this.drawGovernor.level; }
  getDrawBands(): DrawBands { return this.drawBandsNow; }
  /** Choose a draw distance (the UI persists it). Resets the automatic easing. */
  setDrawDistance(level: DrawDistance) { this.drawGovernor.choose(level); this.lastRenderAt = 0; this.applyDrawBands(); }
  private applyDrawBands() {
    this.drawBandsNow = drawBands(this.drawGovernor.level, this.mapSize);
    this.camera.far = this.drawBandsNow.cameraFar;
    this.camera.updateProjectionMatrix();
  }
  /** What the tree layers need each sync: the bands, a conservative frustum test for far trees (camera frustum widened sideways so a quick turn does not show a hole
   * before the next refresh), and a key that changes when the camera moved or turned enough to need a fresh far list. */
  private treeView(prime: boolean) {
    const cam = this.camera, p = cam.position, c = this.viewCull;
    c.copy(cam); c.aspect = cam.aspect * 1.35; c.fov = Math.min(100, cam.fov * 1.12); c.near = 1; c.far = Math.max(cam.far, 100);
    c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    this.viewProj.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); this.viewFrustum.setFromProjectionMatrix(this.viewProj);
    const frustum = this.viewFrustum, sphere = this.viewSphere, y = this.look.y;
    const inView = (x: number, z: number, r: number) => { sphere.center.set(x, y, z); sphere.radius = r + 60; return frustum.intersectsSphere(sphere); };
    const key = `${Math.round(p.x / 6)}|${Math.round(p.z / 6)}|${Math.round(this.yaw * 14)}|${Math.round(this.pitch * 14)}|${Math.round(this.dist / 12)}`;
    return { bands: this.drawBandsNow, inView, key, prime };
  }

  applyQuality(q: "low" | "med" | "high") {
    this.quality = q;
    this.renderer.setPixelRatio(
      graphicsPixelRatio(q,this.renderer.domElement?.clientWidth||800,this.renderer.domElement?.clientHeight||600,window.devicePixelRatio||1),
    );
    this.composer?.setPixelRatio(this.renderer.getPixelRatio?.()??graphicsPixelRatio(q,800,600,window.devicePixelRatio||1));
    this.renderer.shadowMap.enabled = this.shadowsEnabled && q !== "low";
    this.sun.castShadow = this.shadowsEnabled && q !== "low";
    const map = q === "high" ? 1024 : 512;
    this.sun.shadow.mapSize.set(map, map);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    if (this.grass) this.grass.visible = q !== "low";
    if (q === "low") {
      this.composer?.dispose();
      this.bloom?.dispose();
      this.composer = null;
      this.bloom = null;
    } else if (!this.composer && !this.lost) {
      this.setupComposer();
    }
  }

  rebuild(game: Game) {
    const fogSegments=Math.round(Math.sqrt(game.world.heights.length))-1;
    if(this.fowMesh&&(this.mapSize!==game.world.size||(this.fowMesh.geometry as THREE.PlaneGeometry).parameters.widthSegments!==fogSegments)){
      this.fowMesh.geometry.dispose();this.fowMesh.geometry=new THREE.PlaneGeometry(game.world.size,game.world.size,fogSegments,fogSegments);
      const uniforms=(this.fowMesh.material as THREE.ShaderMaterial).uniforms;
      uniforms.uHalf.value=game.world.size/2;uniforms.uSize.value=game.world.size;
    }
    this.mapSize=game.world.size;
    this.applyDrawBands();
    this.trailSyncAt=-1;
    if (this.fowMesh) {
      const positions = this.fowMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, Math.max(game.world.waterY, game.height(positions.getX(i), -positions.getY(i))) + 0.8);
      }
      positions.needsUpdate = true;
      this.fowMesh.geometry.computeBoundingSphere();
    }
    this.disposeWorld();
    this.lastSnow = -1;
    this.seasonAcc = 1;
    this.buildTerrain(game);
    if(game.world.landContinuation&&this.terrainSurface)this.landContinuation=new LandContinuation(this.scene,game,this.terrainSurface,this.mats.ground as THREE.MeshStandardMaterial);
    this.cameraGround={size:game.world.size,height:(x,z)=>Math.max(game.height(x,z),game.waterAt(x,z))};
    this.cameraGroundRevision=()=>game.navigationRevision();this.cameraCollision.invalidate();
    this.fieldSurface = new FieldSurface(game.world.heights,game.world.size,this.terrainSurface?.banks,this.terrainSurface?.bankCuts);
    if(game.world.bankTerrain&&this.terrain){this.bankLayer=new BankTerrainLayer(this.terrain,game,geometry=>{if(this.mapStyle==='painterly')smoothTileNormals(geometry,game.world.bankTerrain!.subdivisions,7);if(game.world.ecology){const a=biomeSurfaceAttributes(game.world.ecology,geometry.getAttribute('position') as THREE.BufferAttribute);geometry.setAttribute('biomeCover',new THREE.BufferAttribute(a.cover,4));geometry.setAttribute('biomeMaterial',new THREE.BufferAttribute(a.material,4));geometry.setAttribute('biomeTint',new THREE.BufferAttribute(a.tint,3));}if(this.mapStyle==='painterly'&&this.surfaceGeology){const g=this.surfaceGeology.attributes(geometry.getAttribute('position') as THREE.BufferAttribute,undefined,(x,z)=>game.waterAt(x,z));geometry.setAttribute('geoRock',new THREE.BufferAttribute(g.rock,4));geometry.setAttribute('geoState',new THREE.BufferAttribute(g.state,4));}});this.scene.add(this.bankLayer.mesh);}
    if(game.state.excavations?.length)this.ensureExcavationLayer(game);
    if((game.world as typeof game.world&{ecology?:EcologicalProvinceGrid}).ecology)this.contourFields=new ContourFields(this.scene,this.fieldSurface,this.mapStyle==='painterly'?'painterly':'classic');
    this.buildNature(game);
    if(game.state&&wildPlantsEnabled(game)){this.wildPlantLayer=new WildPlantLayer(this.scene,game);if(this.bushes)this.bushes.count=0;}
    this.buildBuildings();
    this.buildUnits();
    this.buildHearths(game);
    this.campVisual=new CampVisual(this.scene,game.world.camps.length);
    this.campVisual.sync(game);
    this.buildWildlife();
    const home = game.world.camps.find((c) => c.team === 0) ||
      game.world.camps[0] || { x: 0, z: 0 };
    this.look.set(home.x, this.sampleY(game, home.x, home.z) + 0.55, home.z);
    this.updateCamera(0);
  }

  sampleY(game: Game, x: number, z: number) {
    return game.height(x, z);
  }

  private buildTerrain(game: Game) {
    const geo = new THREE.PlaneGeometry(this.mapSize, this.mapSize, game.world.segs, game.world.segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const landscape = new Float32Array(pos.count*5);
    const surfaceRock = new Float32Array(pos.count);
    const surfaceSand=new Float32Array(pos.count),sandFeatures=(game.world.features??[]).filter(f=>f.kind==='dunes');
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
      const heightDx=game.height(x+2.4,z)-game.height(x-2.4,z);
      const heightDz=game.height(x,z+2.4)-game.height(x,z-2.4);
      const art=landscapeSample(game.state.seed,x,z,h,heightDx/4.8,heightDz/4.8);
      const artOffset=i*5;
      surfaceRock[i]=art.exposure;surfaceSand[i]=duneSandWeight(sandFeatures,x,z);
      landscape[artOffset]=art.exposure;landscape[artOffset+1]=art.r;
      landscape[artOffset+2]=art.g;landscape[artOffset+3]=art.b;landscape[artOffset+4]=art.shade;
      const slope = Math.abs(heightDx)+Math.abs(heightDz);
      const dist = Math.hypot(x, z);
      const river = h < game.world.waterY + 0.32;
      const shore = shorelineAt((px,pz)=>game.height(px,pz),x,z,water);
      const pathN =
        Math.abs(x - home.x - Math.sin((z - home.z) * 0.08) * 1.6) < 1.7 &&
        Math.hypot(x - home.x, z - home.z) < 22;
      const fertile = !river && isFertile(game.world.heights, x, z, water,game.world.size);
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
    this.terrainLandscape = landscape;
    this.terrainBiome = biome;
    this.terrainRegion = region;
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    if(this.mapStyle==="painterly"){blurGrid(surfaceRock,3);blurGrid(surfaceSand,2);}
    geo.setAttribute("surfaceRock",new THREE.BufferAttribute(surfaceRock,1));
    geo.setAttribute("surfaceSand",new THREE.BufferAttribute(surfaceSand,1));
    if(game.world.bankTerrain)geo.setAttribute('surfaceBank',new THREE.BufferAttribute(new Float32Array(pos.count),1));
    this.terrainSurface=new TerrainSurface(game.world.heights,game.world.size,game.state.seed,game.world.bankTerrain,game.world.bankTerrain?geo.getAttribute('color').array as Float32Array:undefined);
    const ecology=(game.world as typeof game.world&{ecology?:EcologicalProvinceGrid}).ecology;
    if(ecology){const attributes=biomeSurfaceAttributes(ecology,pos as THREE.BufferAttribute);
      geo.setAttribute('biomeCover',new THREE.BufferAttribute(attributes.cover,4));
      geo.setAttribute('biomeMaterial',new THREE.BufferAttribute(attributes.material,4));
      geo.setAttribute('biomeTint',new THREE.BufferAttribute(attributes.tint,3));
    }
    const painterly=this.mapStyle==='painterly';
    this.painterGround=null;this.surfaceGeology=null;
    if(painterly){
      this.contactMap?.dispose();this.contactMap=new ContactShadowMap(game.world.size);this.terrainSurface.painter.pContactMap.value=this.contactMap.texture;this.contactAt=0;
      this.routeField?.dispose();this.routeField=new RouteFieldMap(game.world.size);this.terrainSurface.painter.pTrailMap.value=this.routeField.texture;this.terrainSurface.painter.pTrailCfg.value=this.routeField.cfg;
      dropGeology(game.world);
      this.surfaceGeology=geologyFor(game.world as never,game.state.seed,{height:(x,z)=>game.height(x,z),waterAt:(x,z)=>game.waterAt(x,z)});
      const g=this.surfaceGeology.attributes(pos as THREE.BufferAttribute,undefined,(x,z)=>game.waterAt(x,z));
      geo.setAttribute('geoRock',new THREE.BufferAttribute(g.rock,4));geo.setAttribute('geoState',new THREE.BufferAttribute(g.state,4));
      const wind=(game.world as {mapgen?:{wind?:{x:number;z:number}}}).mapgen?.wind,wl=Math.hypot(wind?.x??0,wind?.z??0);
      if(wind&&wl>1e-4)this.terrainSurface.painter.pWind.value.set(wind.x/wl,wind.z/wl);
    }
    if(painterly){
      this.terrainSurface.lightmap=new TerrainLightmap({size:game.world.size,height:(x,z)=>game.height(x,z),waterAt:(x,z)=>game.waterAt(x,z)});
      this.painterGround=new PainterGround(game as never,pos as THREE.BufferAttribute,landscape,biome,region);
    }
    this.terrainSurface.bind(this.mats.ground,!!ecology,painterly);
    geo.computeVertexNormals();
    if(painterly)smoothGridNormals(geo,game.world.segs,2);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    this.terrain = new THREE.Mesh(geo, this.mats.ground);
    this.terrain.receiveShadow = true;
    this.terrain.name = "terrain";
    this.scene.add(this.terrain);

    const wgeo = new THREE.PlaneGeometry(this.mapSize, this.mapSize, 48, 48);
    wgeo.rotateX(-Math.PI / 2);
    const waterMaterial=this.makeWaterMat(),fallMaterial=makeDepthWater(this.terrainSurface!,this.timeU,true,painterly?'painterly':'classic');
    const riverMaterial=painterly?makeDepthWater(this.terrainSurface!,this.timeU,false,'painterly','river'):waterMaterial;
    this.waterMaterials=painterly?[waterMaterial,fallMaterial,riverMaterial]:[waterMaterial,fallMaterial];
    this.water = new THREE.Mesh(wgeo, waterMaterial);
    this.water.position.y = seaSurfaceY(game.world);
    this.water.renderOrder = 1;
    this.scene.add(this.water);
    const localWater=new THREE.Group();localWater.name='local-water-bodies';this.localWater=localWater;
    localWater.position.y=game.world.waterY-game.world.baseWaterY;
    const hydrology=game.world as typeof game.world&{waterBodies?:RenderWaterBody[];waterfalls?:RenderWaterfall[]};
    addLocalWaters(localWater,hydrology.waterBodies??[],hydrology.waterfalls??[],waterMaterial,fallMaterial,riverMaterial);this.scene.add(localWater);
    this.buildBankRibbons(game);
    this.seasonAcc = 1;
  }

  /** GW-12/QA-013: soft shoreline ribbons on the smoothed river banks, hiding grid stair-steps.
   * Display only: no terrain, wet/dry, pathing or save state changes. Capped so huge worlds stay cheap. */
  private bankRibbons:THREE.Mesh|null=null;
  private buildBankRibbons(game:Game) {
    if(this.bankRibbons){this.scene.remove(this.bankRibbons);this.bankRibbons.geometry.dispose();(this.bankRibbons.material as THREE.Material).dispose();this.bankRibbons=null;}
    const pos:number[]=[],idx:number[]=[],CAP=24000,half=0.45;
    const y=(x:number,z:number)=>Math.max(game.height(x,z),game.waterAt(x,z))+0.035;
    try{
      for(const river of smoothRivers(game)){
        for(const bank of [river.left,river.right]){
          if(bank.length<2)continue;
          for(let i=0;i<bank.length&&pos.length/3<CAP;i++){
            const p=bank[i],q=bank[Math.min(bank.length-1,i+1)],r=bank[Math.max(0,i-1)];
            const dx=q.x-r.x,dz=q.z-r.z,len=Math.hypot(dx,dz)||1,nx=-dz/len*half,nz=dx/len*half;
            const base=pos.length/3;
            pos.push(p.x-nx,y(p.x-nx,p.z-nz),p.z-nz,p.x+nx,y(p.x+nx,p.z+nz),p.z+nz);
            if(i>0)idx.push(base-2,base-1,base,base-1,base+1,base);
          }
        }
      }
    }catch{return;}
    if(!pos.length)return;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
    const mat=new THREE.MeshBasicMaterial({color:'#d9e6e0',transparent:true,opacity:0.22,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const mesh=new THREE.Mesh(geo,mat);mesh.name='river-bank-ribbons';mesh.renderOrder=2;mesh.frustumCulled=false;mesh.raycast=()=>{};
    this.bankRibbons=mesh;this.scene.add(mesh);
  }

  private buildNature(game: Game) {
    const ecology=(game.world as typeof game.world&{ecology?:EcologicalProvinceGrid}).ecology;
    if(ecology){this.biomeScene=new BiomeSceneLayer(this.scene,game,ecology,this.mapStyle==='painterly'?'painterly':'classic');this.biomeScene.sync(game,this.camera.position,this.quality,1,this.treeView(true));this.treeCount=game.state.trees.length;}
    else {
    const pine = pineGeo();
    const nTree = game.state.trees.length;
    this.treesTrunk = new THREE.InstancedMesh(pine.trunk, this.mats.bark, Math.max(nTree, 1));
    this.treesLeaf = new THREE.InstancedMesh(
      pine.canopy,
      this.mats.leaf.clone(),
      Math.max(nTree, 1),
    );
    (this.treesLeaf.material as THREE.MeshStandardMaterial).color.set("#ffffff");
    (this.treesLeaf.material as THREE.MeshStandardMaterial).vertexColors=true;
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
    }

    const nRock = game.state.stones.length;
    const painterRocks=this.mapStyle==='painterly',painterRockMat=painterRocks?new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,metalness:0}):null;
    this.rocks = new THREE.InstancedMesh(painterRocks?painterNodeRock('stone'):rockGeo(), painterRockMat??this.mats.rock, Math.max(nRock, 1));
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
    if(painterRocks){cuMat.color.set('#ffffff');cuMat.vertexColors=true;cuMat.emissiveIntensity=.1;}
    this.copper = new THREE.InstancedMesh(painterRocks?painterNodeRock('copper',3):rockGeo(), cuMat, Math.max(nCu, 1));
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
    if(painterRocks){feMat.color.set('#ffffff');feMat.vertexColors=true;feMat.metalness=.25;feMat.roughness=.62;}
    this.iron = new THREE.InstancedMesh(painterRocks?painterNodeRock('iron',5):rockGeo(), feMat, Math.max(nFe, 1));
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
      _p.set(f.x, game.world.localWaterVersion===17?fishMarkerHeight(game,f):game.world.waterY+.12, f.z);
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

    // Decorative grass is disabled: no instance allocation, wind shader or seasonal upload.
  }

  private buildBuildings() {
    this.foundations=new BuildingGroundingLayer(this.scene,this.mats.stone);
    this.eraDetails=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94}),1600);
    this.eraDetails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.eraDetails.count=0;this.eraDetails.castShadow=true;this.eraDetails.receiveShadow=true;this.eraDetails.frustumCulled=false;
    this.scene.add(this.eraDetails);
    const geos = buildingGeos();
    for (const type of BLD_TYPES) {
      const g = geos[type];
      const capacity=["farm","warehouse"].includes(type)?2304:["palisade","gate","stonewall","trench","moat"].includes(type)?1024:compactGrainWorkplace(type)?720:80;
      const timberMaterial=this.mats[g.timberMat||'timber'].clone();
      if(type==='farm'){timberMaterial.map=null;timberMaterial.bumpMap=null;timberMaterial.roughnessMap=null;}
      timberMaterial.color.set("#ffffff"); // Instance palette supplies the actual era material color.
      if(type === "farm") timberMaterial.vertexColors = true;
      if(type === "farm" || type === "pen" || terrainLaidWorkplace(type)) this.fieldSurface?.bind(timberMaterial,{furrows:type==='farm'&&!!this.contourFields,painterly:type==='farm'&&this.mapStyle==='painterly'});
      if(type==='farm'&&this.contourFields){
        g.timber.setAttribute('fieldRows',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));
        const positions=g.timber.attributes.position,colors=g.timber.attributes.color,soilColor=new THREE.Color('#795632');
        for(let i=0;i<positions.count;i++)if(Math.abs(positions.getY(i)-.075)<.002)colors.setXYZ(i,soilColor.r,soilColor.g,soilColor.b);
        if(this.mapStyle==='painterly')for(const name of ['fieldEdges','fieldLook','fieldSoil'])g.timber.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));
      }
      const timber = new THREE.InstancedMesh(g.timber, timberMaterial, capacity);
      if((type === "farm" || type === "pen" || terrainLaidWorkplace(type)) && this.fieldSurface) timber.customDepthMaterial = this.fieldSurface.depth;
      const roofMat = g.roofMat?this.mats[g.roofMat]:
        type === "cornerstone" ? this.mats.hide :
        type === "keep" || type === "temple" || type === "university"
          ? this.mats.tile
          : this.mats.thatch;
      const roof = new THREE.InstancedMesh(g.roof, roofMat.clone(), capacity);
      if((type==='pen'||terrainLaidWorkplace(type))&&this.fieldSurface){this.fieldSurface.bind(roof.material as THREE.Material);roof.customDepthMaterial=this.fieldSurface.depth;}
      if(hasBuildingCraftsmanship(type)){for(const [mesh,isRoof]of[[timber,false],[roof,true]]as const){makeCraftsmanshipAttribute(mesh.geometry,capacity);bindCraftsmanship(mesh.material as THREE.Material,isRoof);mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});bindCraftsmanship(mesh.customDepthMaterial,isRoof);}}
      timber.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      timber.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
      roof.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      roof.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
      if(type!=='cornerstone'&&type!=='pen'&&!terrainLaidWorkplace(type))bindSnowCap(roof.material as THREE.Material);
      (roof.material as THREE.MeshStandardMaterial).vertexColors = false;
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
        const sourceExtra=this.mats[g.extraMat||"stone"];
        const extraMaterial = type === "farm" ? this.mats.crop.clone() : hasBuildingCraftsmanship(type)||terrainLaidWorkplace(type)?sourceExtra.clone():sourceExtra;
        if(type === "farm"||terrainLaidWorkplace(type)) this.fieldSurface?.bind(extraMaterial);
        extra = new THREE.InstancedMesh(g.extra, extraMaterial, capacity);
        if((type === "farm"||terrainLaidWorkplace(type)) && this.fieldSurface) extra.customDepthMaterial = this.fieldSurface.depth;
        if(hasBuildingCraftsmanship(type)){makeCraftsmanshipAttribute(extra.geometry,capacity);bindCraftsmanship(extraMaterial,false);extra.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});bindCraftsmanship(extra.customDepthMaterial,false);}
        extra.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if(type==="farm"){extra.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);}
        extra.castShadow = true;
        extra.count = 0;
        extra.frustumCulled = false;
        this.scene.add(extra);
      }
      this.bldMeshes.set(type, { timber, roof, extra });
    }
  }

  private buildUnits() {
    this.penFences=new PenFenceLayer(this.scene,this.mats.timber.clone());
    this.wornGarments=new WornGarmentLayer(this.scene);
    this.wornArmor=new WornArmorLayer(this.scene);
    this.people=new PeopleAdapter(this.scene);
    this.siegeRamLayer=new SiegeRamLayer(this.scene);
    this.waterVessels=new WaterVesselLayer(this.scene);
    this.baskets=new BasketLayer(this.scene);
    this.housingPackets=new HousingPacketLayer(this.scene);
    this.fibreWork=new FibreWorkLayer(this.scene);
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
    for(const kind of Object.keys(CARGO_COLORS) as ResKind[]){
      const mesh=new THREE.InstancedMesh(cargoGeo(kind),this.mats.timber.clone(),420);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;
      this.scene.add(mesh);this.cargoMeshes.set(kind,mesh);
    }
    this.draftCarts=new DraftCartLayer(this.scene,this.mats.timber);
    this.methodRecordMarkers=new MethodRecordLayer(this.scene,this.mats.stone);
    try{this.groundItems=new GroundItemLayer(this.scene);}catch(e){console.error('ground item models disabled:',e);this.groundItems=null;}
    for (const kind of ['sled', 'cart', 'canoe', 'pack'] as const) {
      const mesh = new THREE.InstancedMesh(haulageGeo(kind), kind==='pack'?this.mats.hide:this.mats.timber, 140);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0; mesh.frustumCulled = false;
      mesh.castShadow = this.quality !== 'low'; mesh.receiveShadow = true;
      this.haulageMeshes.set(kind, mesh); this.scene.add(mesh);
    }
    this.sailRigs=new SailRigs(this.scene,this.mats.timber);
    this.hullFleet=new HullFleet(this.scene,this.mats.timber);
    this.riverboats=new THREE.InstancedMesh(riverboatGeo(),this.mats.timber,96);
    this.riverboats.count=0;this.riverboats.frustumCulled=false;this.scene.add(this.riverboats);
    this.canoePaddles=new THREE.InstancedMesh(canoePaddleGeo(),this.mats.timber,140);
    this.canoePaddles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.canoePaddles.count=0;this.canoePaddles.frustumCulled=false;
    this.scene.add(this.canoePaddles);
    const toolMat = new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,metalness:.15});
    this.farmToolMesh = new THREE.InstancedMesh(farmToolHeadGeo(), toolMat, 140);
    this.farmToolMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.farmToolMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(140 * 3), 3);
    this.farmToolMesh.count = 0; this.farmToolMesh.frustumCulled = false;
    this.scene.add(this.farmToolMesh);
    this.woodenArds = new THREE.InstancedMesh(woodenArdGeo(), this.mats.timber, 32);
    this.woodenArds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.woodenArds.count=0;this.woodenArds.frustumCulled=false;
    this.woodenArds.castShadow=this.quality!=='low';this.woodenArds.receiveShadow=true;
    this.scene.add(this.woodenArds);
  }

  private buildHearths(game: Game) {
    const halls = game.state.buildings.filter((b) => b.type === "townhall" && b.hp > 0);
    this.pits = new THREE.InstancedMesh(firepitGeo(), this.mats.rock, 64);
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
    halls.slice(0,64).forEach((h, i) => {
      _p.set(h.x + 1.6, h.y, h.z + 4.2);
      _q.identity();
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.pits.setMatrixAt(i, _m);
    });
    this.pits.count = Math.min(halls.length,64);
    this.flames.count = 0;
    this.scene.add(this.pits, this.flames);
    const home = halls.find((h) => h.team === 0);
    if (home) this.hearth.position.set(home.x + 1.6, home.y + 0.8, home.z + 4.2);
  }

  private wildlifeOwners = new Map<THREE.InstancedMesh, import("@/game/types").Critter[]>();

  private buildWildlife() {
    const mkHerd = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(n, 1));
      mesh.castShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
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
    this.wildGoats = mkHerd(goatGeo(), this.mats.hideDark, 96);
    this.domesticGoats = mkHerd(goatGeo(), this.mats.hide, 96);
    const sheepMat=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true});
    this.wildSheep=mkHerd(sheepGeo(),sheepMat,32);this.domesticSheep=mkHerd(sheepGeo(),sheepMat,96);
    const horseMat = new THREE.MeshLambertMaterial({color:0xffffff, vertexColors:true});
    this.wildHorses = mkHerd(horseGeo(), horseMat, 32);
    this.domesticHorses = mkHerd(horseGeo(), horseMat, 32);
    this.packHorses = mkHerd(horseGeo(true), horseMat, 32);
    const cattleMat = new THREE.MeshLambertMaterial({color:0xffffff, vertexColors:true});
    this.wildCattle = mkHerd(cattleGeo(), cattleMat, 24);
    this.domesticCattle = mkHerd(cattleGeo(), cattleMat, 24);
    this.packCattle = mkHerd(cattleGeo(true), cattleMat, 24);
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
      this.look.x = THREE.MathUtils.clamp(this.look.x, -(this.mapSize/2) + 10, (this.mapSize/2) - 10);
      this.look.z = THREE.MathUtils.clamp(this.look.z, -(this.mapSize/2) + 10, (this.mapSize/2) - 10);
    }
    this.pitch = THREE.MathUtils.clamp(this.pitch, 0.2, 1.36);
    this.dist = THREE.MathUtils.clamp(this.dist, 14, 230);
    this.tmpCam.set(
      this.look.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      this.look.y + 1.2 + Math.sin(this.pitch) * this.dist,
      this.look.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist,
    );
    if(this.cameraGround){
      this.cameraCollision??=new FixedOrbitCameraCollision();
      const collision=this.cameraCollision.resolve(this.cameraGround,{x:this.look.x,z:this.look.z,distance:this.dist,yaw:this.yaw,pitch:this.pitch},this.cameraGroundRevision?.()??0);
      if(!collision.pose)return;
      const safe=collision.pose;this.look.set(safe.x,safe.focusY,safe.z);this.dist=safe.distance;this.yaw=safe.yaw;this.pitch=safe.pitch;this.tmpCam.set(safe.eye.x,safe.eye.y,safe.eye.z);
    }
    this.camera.position.copy(this.tmpCam);
    this.camera.lookAt(this.look.x, this.look.y + 1.2, this.look.z);
  }

  hoverPerson(cx:number,cy:number,game:Game){
    if(!pointerNearPerson(cx,cy,game.state.units,(x,y,z)=>this.project(x,y,z),u=>u.team===0||game.visibleAt(u.x,u.z)))return null;
    const hit=this.pickEntity(cx,cy,game);return hit?.kind==='unit'?hit.id:null;
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
        if (mesh && !(type === "farm" && mesh !== meshes.roof)) {
          // CPU raycasts cannot see the terrain displacement in field shaders.
          mesh.computeBoundingSphere();
          sources.set(mesh, this.buildingInstances.get(mesh)??entities);
        }
    }
    for(const [mesh,owners]of this.towerPlatforms?.sources()||[]){mesh.computeBoundingSphere();sources.set(mesh,owners);}
    for(const [mesh,owners]of this.carvedOwners){if(mesh instanceof THREE.InstancedMesh&&mesh.count>0){mesh.computeBoundingSphere();sources.set(mesh,owners);}}
    if(this.domesticGoats){
      this.domesticGoats.computeBoundingSphere();
      sources.set(this.domesticGoats,(game.state.livestock||[]).filter(a=>a.hp>0&&a.species==='goat').slice(0,instCap(this.domesticGoats)).map(a=>game.state.buildings.find(b=>b.id===a.pen)!));
    }
    if(this.domesticSheep){this.domesticSheep.computeBoundingSphere();sources.set(this.domesticSheep,(game.state.livestock||[]).filter(a=>a.hp>0&&a.species==='sheep').slice(0,instCap(this.domesticSheep)).map(a=>game.state.buildings.find(b=>b.id===a.pen)!));}
    if(this.domesticHorses){this.domesticHorses.computeBoundingSphere();sources.set(this.domesticHorses,this.domesticHorseOwners);}
    if(this.packHorses){this.packHorses.computeBoundingSphere();sources.set(this.packHorses,this.packHorseOwners);}
    if(this.domesticCattle){this.domesticCattle.computeBoundingSphere();sources.set(this.domesticCattle,this.domesticCattleOwners);}
    if(this.packCattle){this.packCattle.computeBoundingSphere();sources.set(this.packCattle,this.packCattleOwners);}
    if(this.woodenArds){this.woodenArds.computeBoundingSphere();sources.set(this.woodenArds,this.woodenArdOwners);}
    for (const [type, mesh] of this.unitMeshes) {
      mesh.computeBoundingSphere();
      sources.set(
        mesh,
        this.unitInstanceOwners.get(type)??[],
      );
    }
    for(const [mesh,owners]of [...(this.penFences?.pickingSources()||[]),...(this.wornGarments?.sources()||[]),...(this.wornArmor?.sources()||[]),...(this.waterVessels?.sources()||[]),...(this.baskets?.sources()||[]),...(this.draftCarts?.sources()||[])]){mesh.computeBoundingSphere();sources.set(mesh,owners);}
    for (const hit of _ray.intersectObjects([...sources.keys()], false)) {
      if (hit.instanceId === undefined) continue;
      const entity = sources.get(hit.object)?.[hit.instanceId];
      if (entity && entity.hp>0 && (entity.team === 0 || game.visibleAt(entity.x, entity.z))) return entity;
    }
    const ground = this.groundAt(cx, cy);
    if (ground) {
      const farm = game.state.buildings.find(b => b.hp > 0 && (b.type === 'farm'||b.type==='trench') &&
        (b.team === 0 || game.visibleAt(b.x, b.z)) &&
        Math.abs(ground.x - b.x) <= b.w / 2 && Math.abs(ground.z - b.z) <= b.d / 2);
      if (farm) return farm;
    }
    return null;
  }

  pickMethodRecord(cx:number,cy:number,game:Game){
    const el=this.renderer.domElement;_ndc.set((cx/(el.clientWidth||1))*2-1,(-cy/(el.clientHeight||1))*2+1);_ray.setFromCamera(_ndc,this.camera);return this.methodRecordMarkers?.pick(_ray,game)??null;
  }
  pickDraftCart(cx:number,cy:number,game:Game){
    const el=this.renderer.domElement;_ndc.set((cx/(el.clientWidth||1))*2-1,(-cy/(el.clientHeight||1))*2+1);_ray.setFromCamera(_ndc,this.camera);return this.draftCarts?.pickLoose(_ray,game)??null;
  }

  pickWildlife(cx:number,cy:number,game:Game){
    const el=this.renderer.domElement;
    _ndc.set(cx/(el.clientWidth||1)*2-1,-cy/(el.clientHeight||1)*2+1);_ray.setFromCamera(_ndc,this.camera);
    const terrainHit=this.terrain?_ray.intersectObjects(this.excavationLayer?[this.terrain,...(this.bankLayer?[this.bankLayer.mesh]:[]),this.excavationLayer.mesh]:[this.terrain,...(this.bankLayer?[this.bankLayer.mesh]:[])],false)[0]:undefined;
    for(const mesh of this.wildlifeOwners.keys())mesh.computeBoundingSphere();
    for(const hit of _ray.intersectObjects([...this.wildlifeOwners.keys()],false)){
      if(hit.instanceId===undefined||terrainHit&&terrainHit.distance+.02<hit.distance)continue;
      const c=this.wildlifeOwners.get(hit.object as THREE.InstancedMesh)?.[hit.instanceId];
      if(c&&game.state.wildlife.includes(c)&&(c.hp>0?game.visibleAt(c.x,c.z):carcassAvailable(game,c)&&game.exploredAt(c.x,c.z)))return c;
    }
    return null;
  }

  pickBoat(cx: number, cy: number, game: Game) {
    const mesh=this.riverboats;if(!mesh)return null;
    const el=this.renderer.domElement;
    _ndc.set(cx/(el.clientWidth||1)*2-1,-cy/(el.clientHeight||1)*2+1);
    _ray.setFromCamera(_ndc,this.camera);mesh.computeBoundingSphere();
    const boats=(game.state.boats||[]).filter(b=>!b.hullClass&&b.hp>0&&(b.team===0||game.exploredAt(b.x,b.z))).slice(0,instCap(mesh));
    const groundHit=this.terrain?_ray.intersectObjects(this.excavationLayer?[this.terrain,...(this.bankLayer?[this.bankLayer.mesh]:[]),this.excavationLayer.mesh]:[this.terrain,...(this.bankLayer?[this.bankLayer.mesh]:[])],false)[0]:undefined;
    const extra=new Map<THREE.InstancedMesh,import("../game/boats").Riverboat[]>([...(this.hullFleet?.pickingSources()??[]),...(this.sailRigs?.pickingSources()??[])]);for(const m of extra.keys())m.computeBoundingSphere();
    for(const hit of _ray.intersectObjects([mesh,...extra.keys()],false)) {
      if(groundHit&&groundHit.distance+.02<hit.distance)continue;
      const boat=hit.instanceId===undefined?null:hit.object===mesh?boats[hit.instanceId]:extra.get(hit.object as THREE.InstancedMesh)?.[hit.instanceId];
      if(boat&&(boat.team===0||game.visibleAt(boat.x,boat.z)))return boat;
    }
    return null;
  }

  waterAt(cx: number, cy: number, height: number) {
    const el=this.renderer.domElement;
    _ndc.set(cx/(el.clientWidth||1)*2-1,-cy/(el.clientHeight||1)*2+1);
    _ray.setFromCamera(_ndc,this.camera);
    // Elevated lakes and descending rivers are actual surfaces for boat orders.
    // Explicitly use Mesh raycasting because water is excluded from entity picks.
    if(this.localWater){
      const hits:THREE.Intersection[]=[];
      this.localWater.updateMatrixWorld(true);
      for(const mesh of this.localWater.children)if(mesh instanceof THREE.Mesh&&mesh.name.startsWith('water-'))THREE.Mesh.prototype.raycast.call(mesh,_ray,hits);
      hits.sort((a,b)=>a.distance-b.distance);
      if(hits.length)return hits[0].point.clone();
    }
    _ground.set(new THREE.Vector3(0,1,0),-height);
    return _ray.ray.intersectPlane(_ground,_hit)?_hit.clone():null;
  }

  pickResource(cx:number,cy:number,game:Game) {
    const el=this.renderer.domElement;
    _ndc.set(cx/(el.clientWidth||1)*2-1,-cy/(el.clientHeight||1)*2+1);
    _ray.setFromCamera(_ndc,this.camera);
    const sources=new Map<THREE.Object3D,(import("@/game/types").ResourceNode|undefined)[]>();
    for(const [mesh,nodes] of [[this.treesTrunk,game.state.trees],[this.treesLeaf,game.state.trees],
      [this.rocks,game.state.stones],[this.bushes,game.state.forage],
      [this.copper,game.state.copper],[this.iron,game.state.iron]] as const) {
      if(mesh&&(!this.wildPlantLayer||mesh!==this.bushes)&&(!this.biomeScene||mesh!==this.treesTrunk&&mesh!==this.treesLeaf)){mesh.computeBoundingSphere();sources.set(mesh,nodes);}
    }
    if(this.biomeScene){const treesById=new Map(game.state.trees.map(node=>[node.id,node]));
      for(const source of this.biomeScene.pickingSources()){source.mesh.computeBoundingSphere();sources.set(source.mesh,source.resourceIds.map(id=>treesById.get(id)));}
    }
    if(this.wildPlantLayer){const forageById=new Map(game.state.forage.map(node=>[node.id,node]));
      for(const source of this.wildPlantLayer.pickingSources()){source.mesh.computeBoundingSphere();sources.set(source.mesh,source.resourceIds.map(id=>forageById.get(id)));}
    }
    for(const hit of _ray.intersectObjects([...sources.keys()],false)) {
      if(hit.instanceId===undefined)continue;
      const node=sources.get(hit.object)?.[hit.instanceId];
      if(node&&node.amount>0&&game.exploredAt(node.x,node.z))return node;
    }
    return null;
  }

  groundAt(cx: number, cy: number): THREE.Vector3 | null {
    const el = this.renderer.domElement;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    _ndc.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const hits = _ray.intersectObjects(this.excavationLayer?[this.terrain,...(this.bankLayer?[this.bankLayer.mesh]:[]),this.excavationLayer.mesh]:[this.terrain,...(this.bankLayer?[this.bankLayer.mesh]:[])], false);
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

  private ensureExcavationLayer(game:Game){
    if(this.excavationLayer||!this.terrain?.geometry?.index||!this.fieldSurface)return;
    this.excavationLayer=new ExcavationLayer(this.terrain,this.fieldSurface,geometry=>{
      const positions=geometry.getAttribute('position') as THREE.BufferAttribute,ecology=game.world.ecology;
      if(ecology){const a=biomeSurfaceAttributes(ecology,positions);geometry.setAttribute('biomeCover',new THREE.BufferAttribute(a.cover,4));geometry.setAttribute('biomeMaterial',new THREE.BufferAttribute(a.material,4));geometry.setAttribute('biomeTint',new THREE.BufferAttribute(a.tint,3));}
      if(this.mapStyle==='painterly'&&this.surfaceGeology){const g=this.surfaceGeology.attributes(positions,undefined,(x,z)=>game.waterAt(x,z));geometry.setAttribute('geoRock',new THREE.BufferAttribute(g.rock,4));geometry.setAttribute('geoState',new THREE.BufferAttribute(g.state,4));}
    });this.scene.add(this.excavationLayer.mesh);
  }

  sync(game: Game, dt: number) {
    if (this.lost || this.disposed) return;
    if(this.synchronizedState!==game.state){this.synchronizedState=game.state;this.buildingSyncIn=0;this.biomeScene?.sync(game,this.camera.position,this.quality,1,this.treeView(true));}
    this.landContinuation?.sync(game);
    this.bankLayer?.sync(game);
    if(game.state.excavations?.length){this.ensureExcavationLayer(game);this.excavationLayer?.sync(game);}
    this.updateDay(game, dt);
    this.biomeScene?.sync(game,this.camera.position,this.quality,dt,this.treeView(false));this.biomeScene?.setTime(game.state.time);
    this.wildPlantLayer?.sync(game);
    this.syncNature(game);
    this.syncWildlife(game);
    this.buildingSyncIn-=dt;
    if(this.buildingSyncIn<=0){this.syncBuildings(game);this.campVisual?.sync(game);this.buildingSyncIn=.1;}
    this.carvedLayer?.animate(game.state.paused?0:dt);
    this.syncUnits(game);
    this.siegeRamLayer?.sync(game,this.camera,this.quality,this.shadowsEnabled);
    this.syncTrails(game);
    this.syncCargo(game);
    this.syncRiverboatMeshes(game);
    this.syncGhost(game);
    this.syncArrows(game);
    this.syncSmoke(game, dt);
    this.timeU.value = game.state.time;
    this.syncFow(game);
    this.syncRain(game, dt);
    this.paintSeason(game, dt);
    if(this.localWater)this.localWater.position.y=game.world.waterY-game.world.baseWaterY;
    if (this.water)
      this.water.position.y = seaSurfaceY(game.world) + Math.sin(game.state.time * 0.6) * 0.03;
  }

  private updateDay(game: Game, dt = 0.016) {
    const p = game.dayPhase();
    const hour = p * 24;
    const {sunrise:rise,sunset:set}=game.daylight();
    const t = (hour - rise) / (set - rise);
    const day = Math.max(0, Math.min(1, t));
    const elev = Math.sin(day * Math.PI);
    const dawn = Math.max(0, 1 - Math.abs(hour - (rise+.35)) * 0.55);
    const dusk = Math.max(0, 1 - Math.abs(hour - (set-.35)) * 0.5);
    const night = game.isNight();
    const wx = game.state.weather;
    const sn = game.seasonMix();
    const art=daylightArt(wx,night,sn.winter,elev);
    const wet = wx === "rain" || wx === "storm" || wx === "flood";
    const ang = ((hour - rise) / (set - rise)) * Math.PI;
    const dist = 110;
    this.sun.position.set(
      this.look.x + Math.cos(ang) * dist,
      8 + Math.max(4, art.sunElevation * 58),
      this.look.z + Math.sin(ang) * dist * 0.62,
    );
    this.sun.target.position.copy(this.look);
    this.bounce.position.set(this.look.x - 24, 20, this.look.z + 14);
    this.bounce.target.position.copy(this.look);

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
    let hemiI = night
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
              ? "#ffd0a1"
              : night
                ? "#c8d4ee"
                : "#fff4d2",
    );
    sunCol.lerp(_c.set("#ffe0aa"),art.warmth*.75);
    // Option H only (opt-in renderStyle): golden-hour daylight grade (CHAT-G2). Winter, storms and night are exempt inside carvedDaylightGrade/this gate; default 'current' look is untouched.
    let hGrade:ReturnType<typeof carvedDaylightGrade>|null=null;
    if(this.renderStyle==='carved'&&!night){const gr=hGrade=carvedDaylightGrade(day,{winter:sn.snow>0.4||wx==='frost',storm:wx==='storm'?1:wet?.5:0});sunCol.lerp(_c.set(gr.sun),.55);}
    this.hemi.color.set(
      night
        ? "#c4d0e8"
        : sn.snow > 0.4 || wx === "frost"
          ? "#d8e4f0"
          : sn.autumn > 0.4
            ? "#f0d4b0"
            : "#dcebf8",
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
                              ? "#d8e7e6"
                              : "#dce7ed",
    );
    fog.lerp(_c.set("#ead9bb"),art.warmth*.16);
    // Warm direct light against cool skylight separates valleys and distant ridges.
    const clearDay=!night&&!wet&&wx!=="mist"&&wx!=="drought";
    if(clearDay){
      fog.lerp(_c.set(ATMOSPHERE_RULES.coolDistance),ATMOSPHERE_RULES.distanceMix);
      this.hemi.color.lerp(_c.set(ATMOSPHERE_RULES.coolSky),ATMOSPHERE_RULES.skyMix);
    }
    // Option H only: warm the skylight and distance haze a little toward the golden grade (scaled by its own warmth, so winter/storm stay cool).
    if(hGrade&&clearDay){this.hemi.color.lerp(_c.set(hGrade.hemiSky),.3*hGrade.warmth);fog.lerp(_c.set(hGrade.sun),.12*hGrade.warmth);}
    // Option H only: soften the sun/skylight at the day's edges (long low light) and lift it near noon, a partial (35%) blend of the H grade shape onto the current intensity so weather dimming stays in charge.
    this.hemi.groundColor.set(ATMOSPHERE_RULES.coolGround);
    let dens=atmosphericDensity(wx,night,sn.snow);
    const painter=this.mapStyle==='painterly'?painterAtmosphere({elev,dawn,dusk,night,weather:wx,winter:sn.winter,autumn:sn.autumn,spring:sn.spring,snow:sn.snow,day}):null;
    if(painter){
      sunI=painter.sunIntensity;hemiI=painter.hemiIntensity/1.2;dens=painter.fogDensity;
      sunCol.set(painter.sun);fog.set(painter.fog);
      this.hemi.color.set(painter.hemiSky);this.hemi.groundColor.set(painter.hemiGround);
    }
    // Apply after the map palette chooses its base intensities.
    if(this.styleId==='optionH'&&hGrade&&clearDay){sunI*=1+.35*(hGrade.sunIntensity/CARVED_LIGHT_RIG.sunIntensity-1);hemiI*=1+.35*(hGrade.hemiIntensity/CARVED_LIGHT_RIG.hemiIntensity-1);}
    const k = dt > 0.4 ? 1 : 1 - Math.exp(-dt * 0.38);
    this.litSun += (sunI - this.litSun) * k;
    this.litHemi += (hemiI - this.litHemi) * k;
    this.litFogD += (dens - this.litFogD) * k;
    this.litFog.lerp(fog, k);
    this.litSunCol.lerp(sunCol, k);
    this.sun.intensity = this.litSun;
    this.sun.color.copy(this.litSunCol);
    this.hemi.intensity = this.litHemi * 1.2;
    this.fill.intensity = painter?painter.fillIntensity:night ? 0.45 : ATMOSPHERE_RULES.daylightFill + elev * ATMOSPHERE_RULES.elevatedFill;
    this.bounce.intensity = night ? 0.22 : 0.12 + elev * 0.12;
    (this.scene.fog as THREE.FogExp2).color.copy(this.litFog);
    this.scene.background = this.litFog;
    (this.scene.fog as THREE.FogExp2).density = (painter?-this.litFogD:this.litFogD)*this.drawBandsNow.fogScale; // negative density opts into the painterly aerial haze (painterFog.ts)
    this.renderer.toneMappingExposure = painter?painter.exposure:
      (night ? 1.08 : 1.02 + elev * 0.20 + dawn * 0.08 + sn.winter * 0.06) *
      (wx === "storm" || wx === "flood" ? 0.88 : 1);

    const sunDir = this.sun.position.clone().sub(this.look).normalize();
    for(const material of this.waterMaterials){
      const uniforms=(material as THREE.ShaderMaterial).uniforms;
      if(uniforms?.uSunDirection){uniforms.uSunDirection.value.copy(sunDir);uniforms.uLight.value=night?.32:Math.min(1.1,.45+this.litSun*.3);}
    }
    this.sunDisc.position.copy(this.camera.position).add(sunDir.clone().multiplyScalar(180));
    this.sunDisc.lookAt(this.camera.position);
    this.sunGlow.position.copy(this.sunDisc.position);
    this.sunGlow.lookAt(this.camera.position);
    const vis = night ? 0.22 : wx === "storm" ? 0.12 : wet ? 0.45 : 0.92;
    (this.sunDisc.material as THREE.MeshBasicMaterial).opacity = vis;
    (this.sunGlow.material as THREE.MeshBasicMaterial).opacity =
      (wx === "golden" ? 0.55 : 0.38) * vis;
    this.sky.position.copy(this.camera.position);
    if(painter&&this.painterSky){
      const u=this.painterSky.uniforms;
      u.uZenith.value.set(painter.skyZenith);u.uMid.value.set(painter.skyMid);u.uHorizon.value.set(painter.skyHorizon);u.uGround.value.set(painter.skyGround);u.uSun.value.set(painter.sun);
      u.uSunDir.value.copy(sunDir);u.uTime.value=game.state.time;u.uCover.value=painter.cloudCover;u.uNight.value=night?1:0;
      for(const material of this.waterMaterials){const w=(material as THREE.ShaderMaterial).uniforms;if(w?.uSkyHorizon){(w.uSkyHorizon.value as THREE.Color).set(painter.skyHorizon);(w.uSkyZenith.value as THREE.Color).set(painter.skyZenith);(w.uSunColor.value as THREE.Color).set(painter.sun);}}
      if(this.terrainSurface)this.terrainSurface.setAtmosphere(sunDir,painter.cloudShadow,game.state.time,painter.sun,painter.haze);
      this.biomeScene?.setSun(sunDir,night?0:Math.min(1,painter.sunIntensity/2.2)*(1-.6*(painter.cloudCover>.8?1:0)),this.renderer.shadowMap.enabled);
      const g=this.gradePass?.uniforms;
      if(g){g.uSat.value=painter.saturation;g.uContrast.value=painter.contrast;g.uWarm.value=painter.warmth;g.uHaze.value=painter.haze;}
    }
  }

  private syncWildlife(game: Game) {
    this.wildlifeOwners.clear();
    const stamp = (key: 'deer'|'boars'|'wildGoats'|'wildSheep'|'wildHorses'|'wildCattle'|'birds', species: string) => {
      const old=this[key];if(!old)return;
      const list=wildlifeInstanceAnimals(game.state.wildlife,species,(x,z)=>game.visibleAt(x,z),(x,z)=>game.exploredAt(x,z),c=>carcassAvailable(game,c));
      const mesh=growWildlifeMesh(this.scene,old,list.length);this[key]=mesh;
      for(let i=0;i<list.length;i++){
        const c=list[i],corpse=c.hp<=0;
        _p.set(c.x,c.y+(corpse?.3*c.scale:0),c.z);
        _haulEuler.set(corpse?Math.PI/2:0,c.facing,0);_q.setFromEuler(_haulEuler);_s.setScalar(c.scale);_m.compose(_p,_q,_s);mesh.setMatrixAt(i,_m);
      }
      mesh.count=list.length;mesh.instanceMatrix.needsUpdate=true;
      this.wildlifeOwners.set(mesh,list);
    };
    stamp('deer','deer');stamp('boars','boar');stamp('wildGoats','goat');stamp('wildSheep','sheep');stamp('wildHorses','horse');stamp('wildCattle','cattle');stamp('birds','bird');
    this.domesticHorseOwners = [];
    if(this.domesticHorses){
      const animals=(game.state.livestock||[]).filter(a=>a.hp>0&&a.species==='horse'&&(a.team===0||game.visibleAt(a.x,a.z)));
      const mesh=ensureInstanceCapacity(this.scene,this.domesticHorses,animals.length);this.domesticHorses=mesh;
      for(let i=0;i<animals.length;i++){
        const a=animals[i];
        _p.set(a.x,a.y,a.z);_e.set(0,a.facing,0);_q.setFromEuler(_e);_s.setScalar(a.scale);_m.compose(_p,_q,_s);mesh.setMatrixAt(i,_m);
        this.domesticHorseOwners.push(game.state.buildings.find(b=>b.id===a.pen)!);
      }
      mesh.count=animals.length;mesh.instanceMatrix.needsUpdate=true;
    }
    this.domesticCattleOwners=[];
    if(this.domesticCattle){
      const animals=(game.state.livestock||[]).filter(a=>a.hp>0&&a.species==='cattle'&&(a.team===0||game.visibleAt(a.x,a.z)));
      const mesh=ensureInstanceCapacity(this.scene,this.domesticCattle,animals.length);this.domesticCattle=mesh;
      for(let i=0;i<animals.length;i++){
        const a=animals[i];_p.set(a.x,a.y,a.z);_e.set(0,a.facing,0);_q.setFromEuler(_e);_s.setScalar(a.scale);_m.compose(_p,_q,_s);mesh.setMatrixAt(i,_m);
        this.domesticCattleOwners.push(game.state.buildings.find(b=>b.id===a.pen)!);
      }
      mesh.count=animals.length;mesh.instanceMatrix.needsUpdate=true;
    }
    for(const [mesh,species]of [[this.domesticGoats,'goat'],[this.domesticSheep,'sheep']] as const){
    if(mesh){
      const animals=(game.state.livestock||[]).filter(a=>a.hp>0&&a.species===species).slice(0,instCap(mesh));
      for(let i=0;i<animals.length;i++){
        const a=animals[i],seen=a.team===0||game.visibleAt(a.x,a.z);
        _p.set(a.x,a.y,a.z);_e.set(0,a.facing,0);_q.setFromEuler(_e);_s.setScalar(seen?a.scale:.001);_m.compose(_p,_q,_s);mesh.setMatrixAt(i,_m);
      }
      mesh.count=animals.length;mesh.instanceMatrix.needsUpdate=true;
    }
    }
  }

  private trailAlpha() {
    const canvas=document.createElement("canvas");canvas.width=canvas.height=32;
    const ctx=canvas.getContext("2d")!;
    const gradient=ctx.createRadialGradient(16,16,2,16,16,16);
    gradient.addColorStop(0,"white");gradient.addColorStop(.4,"#aaaaaa");gradient.addColorStop(1,"black");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
    return new THREE.CanvasTexture(canvas);
  }

  /** Render tools: repaint the route field now. */
  routeFieldNow(){this.routeField?.invalidate();this.trailSyncAt=-1;}

  private syncTrails(game:Game) {
    // GW-12/QA-013: continuous ribbons from the saved trail cells (display only; pace and state untouched).
    const stamp=Math.floor(game.state.time/4);
    if(this.trailSyncAt===stamp)return;this.trailSyncAt=stamp;
    let i=0;const CAP=4096;
    // Painterly look draws ground wear in the terrain shader (routeField.ts); the legacy ribbon meshes only serve the archived classic look.
    const fieldDrawn=!!this.routeField&&routesEnabled(game)&&!(globalThis as {__LEGACY_TRAILS?:boolean}).__LEGACY_TRAILS;
    const source=fieldDrawn?[]:routesEnabled(game)?routeRibbons(game):trailRibbons(game);
    for(const ribbon of source){
      const pts=ribbon.points;
      for(let k=1;k<pts.length&&i<CAP;k++){
        const a=pts[k-1],b=pts[k],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1e-3)continue;
        const x=(a.x+b.x)/2,z=(a.z+b.z)/2;if(!game.exploredAt(x,z))continue;
        const w=ribbon.widthMetres*(0.55+0.45*Math.min(1,(a.displayWear+b.displayWear)/2/0.45))*(this.trailHalo?2.7:1);
        _p.set(x,game.height(x,z)+0.12,z);_e.set(-Math.PI/2,0,-Math.atan2(dx,dz));_q.setFromEuler(_e);
        _s.set(w,len*1.3,1);_m.compose(_p,_q,_s);
        if(this.trailHalo){const wear=Math.min(1,(a.displayWear+b.displayWear)/2/.45),core=_trailColor.set('#7d5f3c').lerp(_trailColorB.set('#b79a6c'),Math.max(0,1-wear*1.1)*.7);this.trailMesh.setColorAt(i,core);
         _s.set(w*(.8+.6*wear)+.9,len*1.3+.5,1);_m.compose(_p,_q,_s);this.trailHalo.setMatrixAt(i,_m);this.trailHalo.setColorAt(i,_trailColorC.set('#9b9a52').lerp(_trailColorB.set('#a8955c'),wear*.6));
         _s.set(w*.92,len*1.3,1);_m.compose(_p,_q,_s);}
        this.trailMesh.setMatrixAt(i++,_m);
      }
    }
    this.trailMesh.count=i;this.trailMesh.instanceMatrix.needsUpdate=true;if(this.trailMesh.instanceColor)this.trailMesh.instanceColor.needsUpdate=true;
    if(this.trailHalo){this.trailHalo.count=i;this.trailHalo.instanceMatrix.needsUpdate=true;if(this.trailHalo.instanceColor)this.trailHalo.instanceColor.needsUpdate=true;}
  }

  private syncNature(game: Game) {
    if (!this.biomeScene&&this.treesTrunk) {
    const treeCap = instCap(this.treesTrunk);
    const nTree = Math.min(game.state.trees.length, treeCap);
    this.treeCount = nTree;
    for (let i = 0; i < nTree; i++) {
      const t = game.state.trees[i];
      const stump = t.amount <= 0&&!t.planted;
      const seen = game.exploredAt(t.x, t.z);
      const sc = !seen ? 0.001 : t.planted ? t.scale*(.18+.6*Math.max(0,1-t.regenT/120)) : stump ? t.scale * 0.22 : t.scale;
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
    }
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
    // Excavation can expose additional veins after scene construction.
    for(const kind of ['copper','iron'] as const){
      const old=this[kind],needed=game.state[kind].length;
      if(old&&needed>instCap(old)){
        const grown=new THREE.InstancedMesh(old.geometry,old.material,Math.max(needed,instCap(old)*2));
        grown.castShadow=old.castShadow;grown.receiveShadow=old.receiveShadow;grown.frustumCulled=false;
        this.scene.remove(old);old.dispose();this[kind]=grown;this.scene.add(grown);
      }
    }
    hideNodes(this.copper, game.state.copper);
    hideNodes(this.iron, game.state.iron);
    if (!this.bushes) return;
    const bushCap = instCap(this.bushes);
    const nBush = wildPlantsEnabled(game)?0:Math.min(game.state.forage.length, bushCap);
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
        _p.set(f.x, fishMarkerHeight(game,f) + bob, f.z);
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

  private villageStyle(game:Game,team:number,point:{x:number;z:number}) {
    const age=game.tribe(team)?.age||0;
    const local=localArchitecture(game.state.seed,team,age,point,this.styleHalls||[],game.world?.biomes||[],this.villageStyles);
    const cached=this.villageStyles.get(local.key);if(cached)return cached;
    this.villageStyles.set(local.key,local.style);return local.style;
  }

  /** Explicit inspection only: never called by the drawing loop. */
  entityFrustumCensus(game:Game){
    const bodies:CensusSource[]=[],unsheltered=new Set(game.state.units.filter(u=>!u.shelterId).map(u=>u.id));
    for(const [type,mesh]of this.unitMeshes)bodies.push({mesh,owners:this.unitInstanceOwners.get(type)||[],admitted:o=>unsheltered.has(o.id)});
    const structures:CensusSource[]=[];
    for(const [mesh,owners]of this.buildingInstances){
      // Contour fields and excavations have independent terrain geometry; do not
      // silently substitute their rectangular metadata for rendered bounds.
      if(!(mesh instanceof THREE.InstancedMesh))continue;
      const models=new Set(owners.filter(b=>b.type!=='farm'&&b.type!=='trench').map(b=>b.id));
      structures.push({mesh,owners,admitted:o=>models.has(o.id)});
    }
    for(const [mesh,owners]of this.towerPlatforms?.sources()||[])structures.push({mesh,owners});
    return{time:game.state.time,quality:this.quality,
      residents:countEntityFrustum(this.camera,bodies,game.state.units),
      structures:countEntityFrustum(this.camera,structures,game.state.buildings),
      unsupportedPlots:game.state.buildings.filter(b=>b.team===0&&b.hp>0&&(b.type==='farm'||b.type==='trench')).length,
      camera:{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z}};
  }

  private readonly buildingCameraCull=new InstanceCameraCull();

  private syncBuildings(game: Game) {
    this.buildingCameraCull.begin(this.camera);
    if(!this.towerPlatforms)this.towerPlatforms=new TowerPlatformLayer(this.scene,this.mats);
    this.towerPlatforms.sync(game);
    this.styleHalls=game.state.buildings.filter(b=>b.type==='townhall'&&game.finished(b));
    this.updateMourning(game);
    const carvedList:(CarvedInstance&{b:import("@/game/types").Building})[]=[];
    const lineIdx=lineIndex(game.state.buildings);
    const grouped = new Map<BldType, typeof game.state.buildings>();
    for (const type of BLD_TYPES) grouped.set(type, []);
    for (const b of game.state.buildings) if(b.hp>0)grouped.get(b.type)?.push(b);
    for (const type of BLD_TYPES) {
      const meshes=this.bldMeshes.get(type);if(!meshes)continue;
      const counts={timber:0,roof:0,extra:0};
      for(const mesh of [meshes.timber,meshes.roof,meshes.extra])if(mesh){
        let owners=this.buildingInstances.get(mesh);if(!owners){owners=[];this.buildingInstances.set(mesh,owners);}owners.length=0;
      }
      for(const b of grouped.get(type)!) {
        if(type==='watchtower'&&b.towerPlatform)continue;
        if(type==='trench'&&excavationTerrain(game).buildingIds.has(b.id))continue;
        const seen=b.team===0||game.exploredAt(b.x,b.z);if(!seen)continue;
        const st=TEAM_STYLE[b.team]||TEAM_STYLE[0],identity=this.villageStyle(game,b.team,b),character=buildingCharacter(game.state.seed,b.id),artisan=hasBuildingCraftsmanship(type)?buildingCraftsmanship(game.state.seed,b.id,type):null;
        const ys=b.plannedCost?.08:b.build>=1?1:.22+.78*Math.max(0,b.build);
        const fort=["palisade","gate","stonewall","trench","moat"].includes(type);
        const modular=type==="warehouse"||expandedGrainWorkplace(b);
        if(this.renderStyle==='carved'&&!b.bridge&&CARVED_TYPES.includes(type)&&!CARVED_KEEP_CURRENT.has(type)&&(!modular||type==='warehouse')&&(fort||type==='warehouse'||['dock','aqueduct','quarry','cornerstone','cairn','grove'].includes(type))){
          const lineSkin=this.skinsOn&&this.styleId==='village'?skinOfTeam(game.state,b.team):null,lineEra=fabricContext(b)?.built.era??(game.tribe(b.team)?.age||0);
          if(type==='warehouse'){
            for(const m of plotModules(b))carvedList.push({worldSeed:game.state.seed,type,id:b.id*16+Math.abs(Math.round(m.x*3+m.z*7))%13,era:lineEra,footprint:{w:BUILDINGS.warehouse.w*m.sx,d:BUILDINGS.warehouse.d*m.sz},settlementSeed:b.team,
              x:b.x+m.x,y:foundationProfile(game,b).level,z:b.z+m.z,...(lineSkin?{skin:lineSkin,heraldry:villageHeraldry(game.state.seed,b.team)}:{}),yaw:0,progress:ys,b});
            continue;
          }
          const inLine=!!LINE_OF_TYPE[type],join=inLine?joinMaskFor(lineIdx,b):0,gYaw=type==='gate'&&!join?gateOrientation(b.gateFacing).yawRadians:0;
          const side=type==='dock'?waterSideFor(b.x,b.z,(x,z)=>game.height(x,z)<game.waterAt(x,z)+.1):undefined;
          carvedList.push({worldSeed:game.state.seed,type,id:b.id,era:lineEra,footprint:{w:b.w,d:b.d},settlementSeed:b.team,x:b.x,y:foundationProfile(game,b).level,z:b.z,
            ...(inLine?{join}:{}),...(type==='gate'&&b.gateOpen?{gateOpen:true}:{}),...(side?{waterSide:side}:{}),...(lineSkin?{skin:lineSkin,heraldry:villageHeraldry(game.state.seed,b.team)}:{}),yaw:gYaw,progress:ys,b});
          continue;
        }
        if(this.renderStyle==='carved'&&!modular&&!b.bridge&&!fort&&CARVED_TYPES.includes(type)&&!CARVED_KEEP_CURRENT.has(type)){
          carvedList.push({...this.carvedInputFor(game,b,type,ys),b});
          continue;
        }
        const scalable=type==="farm"||modular;
        const write=(part:'timber'|'roof'|'extra',x:number,z:number,sx:number,sz:number)=>{
          const mesh=meshes[part];if(!mesh||!mesh.geometry.getAttribute('position')?.count||counts[part]>=instCap(mesh))return;
          const wx=b.x+x,wz=b.z+z;
          const ground=type==="farm"||type==='pen'?game.height(wx,wz):foundationProfile(game,b).level;
          _p.set(wx,ground,wz);
          const terrainWork=type==="dock",limit=.2;
          const pitch=terrainWork?Math.max(-limit,Math.min(limit,Math.atan((game.height(wx,wz+2)-game.height(wx,wz-2))/4))):0;
          const roll=terrainWork?Math.max(-limit,Math.min(limit,-Math.atan((game.height(wx+2,wz)-game.height(wx-2,wz))/4))):0;
          _e.set(pitch,type==='gate'?gateOrientation(b.gateFacing).yawRadians:fort||scalable||type==='pen'?0:st.yaw+buildingQuarterTurns(b)*Math.PI/2,roll);
          _s.set(scalable?sx:fort||type==='pen'?1:st.sx,ys*(scalable||fort||type==='pen'?1:st.sy),scalable?sz:fort||type==='pen'?1:st.sz);
          if(b.bridge){const span=b.bridge,len=Math.hypot(span.bx-span.ax,span.bz-span.az);_e.set(-Math.atan2(game.height(span.bx,span.bz)-game.height(span.ax,span.az),len),Math.atan2(span.bx-span.ax,span.bz-span.az),0);_s.set(1,ys,len/12);}
          if(part!=="timber"){
            if(b.build<.55||(type==="gate"&&b.gateOpen))_s.set(.001,.001,.001);
            else if(type!=="farm"&&type!=="pen"&&!["market","temple","university","house"].includes(type))_s.y*=identity.roofHeight*(fort?1:character.roofHeight);
          }
          if(type==="farm"&&part==="extra"){const c=b.crop;const growth=c?.ripened?(c.remaining>0?1:.04):.04+.75*(c?.planted||0)+.2*(c?.tended||0);_s.y*=growth;}
          _q.setFromEuler(_e);_m.compose(_p,_q,_s);
          // Shader-grounded surfaces have different bounds; preserve those and
          // off-camera shadow casters. Rigid parts outside the view need no instance.
          const rigid=type!=='farm'&&type!=='pen'&&!terrainLaidWorkplace(type)&&type!=='trench'&&type!=='moat';
          if(rigid&&!this.renderer.shadowMap.enabled&&!this.buildingCameraCull.visible(mesh,_m,8+this.dist*.12))return;
          const i=counts[part]++;mesh.setMatrixAt(i,_m);this.buildingInstances.get(mesh)!.push(b);
          const art=mesh.geometry.getAttribute('buildingArt')as THREE.InstancedBufferAttribute|undefined;if(art&&artisan)art.setXYZW(i,artisan.x,artisan.z,artisan.brace,artisan.lift);
          if(type==='farm'&&part==='timber'&&this.contourFields){const rows=this.contourFields.rows(game,b);(mesh.geometry.getAttribute('fieldRows') as THREE.InstancedBufferAttribute).setXYZW(i,rows.nx,rows.nz,rows.offset,rows.spacing);
            const edges=mesh.geometry.getAttribute('fieldEdges') as THREE.InstancedBufferAttribute|undefined;
            if(edges){const look=this.contourFields.look(game,b,this.fieldWaterMode?(fieldWater(game,b).kind==='dry'?1:2):0);edges.setXYZW(i,...look.edges);(mesh.geometry.getAttribute('fieldLook') as THREE.InstancedBufferAttribute).setXYZW(i,...look.look);(mesh.geometry.getAttribute('fieldSoil') as THREE.InstancedBufferAttribute).setXYZW(i,...look.soil);}}
          if(mesh.instanceColor){
            if(!civicPartColor(type,part,part==='timber'?identity.timber:identity.roof,_c))_c.set(part==='timber'?(b.plannedCost?"#87b7cb":type==="moat"?"#49787e":type==="trench"?"#493b27":type==="stonewall"?"#aaa494":type==="farm"?"#ffffff":identity.timber):type==="cornerstone"?game.tribe(b.team).color:identity.roof);
            if(type==="farm"&&part==="extra")_c.set(b.crop?.ripened&&b.crop.remaining>0?"#f1d16b":b.crop?.planted?"#b1df70":"#887453");
            if(type!=="farm"&&!fort)_c.multiplyScalar(character.tint);
            mesh.setColorAt(i,_c);
          }
        };
        if(modular){
          for(const m of plotModules(b))for(const part of ['timber','roof','extra'] as const)write(part,m.x,m.z,m.sx,m.sz);
        }else if(type==="farm"){
          write('timber',0,0,b.w/BUILDINGS.farm.w,b.d/BUILDINGS.farm.d);
          // A marked/planted plot has no roof building or free tool/storage shed.
          if(!this.contourFields)for(const m of plotModules(b))write('extra',m.x,m.z,m.sx,m.sz);
        }else for(const part of ['timber','roof','extra'] as const)write(part,0,0,1,1);
      }
      for(const part of ['timber','roof','extra'] as const){const mesh=meshes[part];if(!mesh)continue;mesh.count=counts[part];mesh.instanceMatrix.needsUpdate=true;const art=mesh.geometry.getAttribute('buildingArt')as THREE.InstancedBufferAttribute|undefined;if(art)art.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    }
    this.syncCarvedBuildings(carvedList);
    this.syncWonders(game);
    this.penFences?.sync(game,this.camera.position,this.shadowsEnabled&&this.quality!=='low');
    this.fibreWork?.sync(game,this.camera.position,this.shadowsEnabled&&this.quality!=='low');
    if(!this.irrigationLayer&&(game.state as {irrigation?:unknown}).irrigation){this.irrigationLayer=new IrrigationLayer(this.scene,(x,z)=>game.height(x,z));this.irrigationLayer.setPreview(this.ditchPreview);}
    this.irrigationLayer?.sync(game);
    this.contourFields?.sync(game,this.camera.position,b=>{const st=this.villageStyle(game,b.team,b);return{era:st.era,variant:st.variant};},{quality:this.quality});
    const contourRows=this.bldMeshes.get('farm')?.timber.geometry.getAttribute('fieldRows');if(contourRows)contourRows.needsUpdate=true;
    for(const name of ['fieldEdges','fieldLook','fieldSoil']){const a=this.bldMeshes.get('farm')?.timber.geometry.getAttribute(name);if(a)a.needsUpdate=true;}
    this.syncEraDetails(game);
    this.foundations?.sync(game);
    this.routeField?.update(game,performance.now(),game.state.weather,game.seasonMix().snow);
    if(!this.waystations){this.waystations=new WaystationLayer();this.scene.add(this.waystations.group);}
    this.waystations.sync(game);
    if(this.contactMap&&performance.now()-this.contactAt>350){this.contactAt=performance.now();this.contactMap.update(game.state.buildings.filter(b=>b.team===0||game.exploredAt(b.x,b.z)));}
  }

  private millYaw=new Map<string,number>();
  /** Quarter turn that puts the mill's wheel side (+X in the family frame) toward the river the wheel actually stands in
   * (watermillSite.wheel); a mill with no river in range keeps the placed turn. */
  private millFacing(game:Game,b:import("@/game/types").Building){
    const k=b.id+':'+b.x+':'+b.z,hit=this.millYaw.get(k);if(hit!==undefined)return hit;
    const wheel=watermillSite(game,b.x,b.z).wheel;let yaw=buildingQuarterTurns(b)*Math.PI/2;
    if(wheel&&Math.hypot(wheel.x-b.x,wheel.z-b.z)>.5)yaw=Math.round(Math.atan2(-(wheel.z-b.z),wheel.x-b.x)/(Math.PI/2))*(Math.PI/2);
    this.millYaw.set(k,yaw);return yaw;
  }
  /** Rotor speed (rad/s) from the live mill power (CURRENT-POWER-HOOK): the wheel turns with the real river current and head,
   * the sails with the measured wind at the site and the weather; below the grinding threshold the machine stands still. */
  private millSpin(game:Game,b:import("@/game/types").Building){
    const kw=millPowerKw(game,b);if(kw<MILL_RULES.minKw)return 0;
    if(b.type==='watermill')return Math.min(2.4,.45+.6*Math.sqrt(kw/MILL_RULES.referenceKw));
    return -Math.min(1.6,.3+.9*kw/MILL_RULES.maxWindKw);
  }

  private wonderLayer:WonderLayer|null=null;
  /** Wonders (state.wonders) drawn through the owner's skin; nothing is built until a record exists. */
  private syncWonders(game:Game){
    const list=game.state.wonders;if(!list?.length&&!this.wonderLayer)return;
    const layer=this.wonderLayer||(this.wonderLayer=new WonderLayer(this.scene));
    layer.sync(list||[],this.camera.position,t=>this.skinsOn&&this.styleId==='village'?skinOfTeam(game.state,t):null,(x,z)=>game.height(x,z),(x,z)=>game.exploredAt(x,z));
  }

  /** The ONE place a roofed building becomes carved-generator input. The finished building (syncBuildings) and the placement ghost (setGhost) both call it, so the preview is the same model, skin, heraldry and facing as what gets built. */
  private carvedInputFor(game:Game,b:import("@/game/types").Building,type:BldType,ys:number):CarvedInstance{
    const fab=fabricContext(b),mill=type==='watermill'||type==='windmill';
    const skin=this.skinsOn&&this.styleId==='village'?skinOfTeam(game.state,b.team):null,mourn=!!skin&&(this.mourning.get(b.team)?.until??0)>game.state.time;
    return {worldSeed:game.state.seed,type,id:b.id,era:fab?.built.era??(game.tribe(b.team)?.age||0),footprint:{w:b.w,d:b.d},
      settlementSeed:b.team,...(()=>{const h=game.world.ecology?habitatForProvince(provinceAt(game.world.ecology,b.x,b.z).kind):habitatForBaseKind(habitatKindAt(game,b.x,b.z));return h?{habitat:h}:{};})(),lit:type==='hearth'?hearthHeating(game,b.id):undefined,x:b.x,y:foundationProfile(game,b).level,z:b.z,
      ...(skin?{skin,heraldry:villageHeraldry(game.state.seed,b.team),...(mourn?{mourning:true}:{}),...(b.build>=1&&b.maxHp>0?{condition:b.hp/b.maxHp}:{})}:{}),yaw:type==='watermill'?this.millFacing(game,b):this.dwellingYaw(game,b),progress:ys,...(mill&&b.build>=1?{spin:this.millSpin(game,b)}:{})};
  }

  /** Quarter-turn yaw of a carved building. Dwellings the player did not turn explicitly swing their door toward the village's plaza (placementFacing.ts). */
  private dwellingYaw(game:Game,b:import("@/game/types").Building){
    const own=buildingQuarterTurns(b);
    if(own||!facesPlaza(b.type,b.w,b.d))return own*Math.PI/2;
    const halls=this.styleHalls.filter(h=>h.team===b.team),anchor=nearestAnchor(b.x,b.z,halls.length?halls:[game.campOf(b.team)]);
    return plazaQuarterTurns(b.x,b.z,anchor)*Math.PI/2;
  }

  private syncCarvedBuildings(list:(CarvedInstance&{b:import("@/game/types").Building})[]){
    if(!list.length&&!this.carvedLayer)return;
    const layer=this.carvedLayer||(this.carvedLayer=new CarvedBuildingLayer(this.scene));
    for(const mesh of this.carvedOwners.keys())this.buildingInstances.delete(mesh);this.carvedOwners.clear();
    layer.setSnow(this.carvedSnow);
    layer.sync(list,this.camera.position);
    for(const [mesh,owners] of layer.pickSources()){
      const buildings=(owners as (CarvedInstance&{b:import("@/game/types").Building})[]).map(o=>o.b);
      this.carvedOwners.set(mesh,buildings);this.buildingInstances.set(mesh,buildings);
    }
  }

  private syncEraDetails(game:Game){
    const mesh=this.eraDetails;if(!mesh)return;
    let count=0;const perType=new Map<BldType,number>();
    for(const b of game.state.buildings){
      if(b.hp<=0||b.build<1||b.plannedCost)continue;
      const n=(perType.get(b.type)||0)+1;perType.set(b.type,n);
      if(n>80||b.team!==0&&!game.exploredAt(b.x,b.z)||
        ['warehouse','farm','pen','dock','bridge','lumber','quarry','cornerstone','palisade','gate','stonewall','trench','moat','cairn','grove'].includes(b.type))continue;
      if(!['forge','stables','keep'].includes(b.type)||this.renderStyle==='carved'&&CARVED_TYPES.includes(b.type)&&!CARVED_KEEP_CURRENT.has(b.type))continue;
      const identity=this.villageStyle(game,b.team,b),era=identity.era;if(era===0)continue;
      const st=TEAM_STYLE[b.team]||TEAM_STYLE[0],yaw=st.yaw,co=Math.cos(yaw),si=Math.sin(yaw);
      const width=Math.max(2,b.w*.85),depth=Math.max(2,b.d*.85);
      const roof=this.bldMeshes.get(b.type)?.roof.geometry;
      if(roof&&!roof.boundingBox)roof.computeBoundingBox();
      const top=(roof?.boundingBox?.max.y||4)*identity.roofHeight;
      const block=(x:number,y:number,z:number,w:number,h:number,d:number,color=identity.trim)=>{
        if(count>=instCap(mesh))return;
        _p.set(b.x+(co*x+si*z)*st.sx,foundationProfile(game,b).level+y*st.sy,b.z+(-si*x+co*z)*st.sz);
        _e.set(0,yaw,0);_q.setFromEuler(_e);_s.set(w*st.sx,h*st.sy,d*st.sz);_m.compose(_p,_q,_s);
        mesh.setMatrixAt(count,_m);_c.set(color);mesh.setColorAt(count++,_c);
      };
      // Legacy enclosed-room trim only. Ground supports belong to actual bearings.

      block(-.72,1.1,depth*.5,.18,2.2,.22);block(.72,1.1,depth*.5,.18,2.2,.22);
      block(0,2.2,depth*.5,1.65,.22,.26);
      if(era>=2)block(0,.1,depth*.5+.35,1.8,.2,.8);
      if(era>=3){
        block(-width*.45,1.2,depth*.48,.23,2.4,.25);block(width*.45,1.2,depth*.48,.23,2.4,.25);
        block(0,2.4,depth*.48,width,.2,.25);
      }
      if(era>=4)block(width*.24,top*.87,-depth*.12,.55,top*.42,.6);
      if(era>=5)block(width*.24,top*1.09,-depth*.12,.8,.18,.85);
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }

  private syncCargo(game: Game) {
    this.housingPackets?.sync(game);
    this.draftCarts?.sync(game,this.quality,this.shadowsEnabled);
    this.methodRecordMarkers?.sync(game,this.quality,this.shadowsEnabled);
    try{this.groundItems?.sync(game,this.camera.position,this.quality,this.shadowsEnabled);}catch(e){console.error('ground item models disabled:',e);this.groundItems?.dispose();this.groundItems=null;}
    const counts:Record<ResKind,number>={food:0,wood:0,stone:0,copper:0,iron:0};
    const vehicles:Record<HaulageKind,number>={sled:0,cart:0,canoe:0,pack:0};let paddles=0;
    let horses=0,cattle=0,ards=0;this.packHorseOwners=[];this.packCattleOwners=[];this.woodenArdOwners=[];
    const spring=calendar(game).phase===0;
    const ploughing=(u:import("@/game/types").Unit)=>spring&&u.farmTool==='woodenArd'&&farmToolRate(u,0)>1&&u.order==='gather'&&u.node&&'type' in u.node&&u.node.type==='farm'&&draftTractionReady(u);
    const visible=game.state.units.filter(u=>u.hp>0&&!u.shelterId&&(u.team===0||game.visibleAt(u.x,u.z)));
    const neededCargo:Record<ResKind,number>={food:0,wood:0,stone:0,copper:0,iron:0},neededVehicles:Record<HaulageKind,number>={sled:0,cart:0,canoe:0,pack:0};
    for(const u of visible){const kind=u.boat||u.haulage==='pack'&&(!u.packAnimal||u.packAnimal.hp<=0)?undefined:u.haulage==='canoe'?'canoe':(u.type==='worker'&&!u.militia||u.caravanArmed)?u.haulage:undefined;if(kind&&!(kind==='pack'&&(u.packAnimal?.species==='horse'||u.packAnimal?.species==='cattle')))neededVehicles[kind]++;const cargo=u.plantingWork?'food':u.carryType;if(cargo&&(u.plantingWork||u.carry>0))neededCargo[cargo]++;}
    for(const b of game.state.buildings||[])if(b.hp<=0&&b.raidLoot&&game.visibleAt(b.x,b.z))for(const kind of Object.keys(CARGO_COLORS)as ResKind[])if((b.raidLoot[kind]||0)>0)neededCargo[kind]++;
    if(this.packHorses)this.packHorses=ensureInstanceCapacity(this.scene,this.packHorses,visible.filter(u=>!u.boat&&u.haulage==='pack'&&u.packAnimal?.species==='horse'&&u.packAnimal.hp>0&&(u.type==='worker'&&!u.militia||u.caravanArmed)).length);
    if(this.packCattle)this.packCattle=ensureInstanceCapacity(this.scene,this.packCattle,visible.filter(u=>!u.boat&&u.haulage==='pack'&&u.packAnimal?.species==='cattle'&&u.packAnimal.hp>0&&(u.type==='worker'&&!u.militia||u.caravanArmed)).length);
    if(this.woodenArds)this.woodenArds=ensureInstanceCapacity(this.scene,this.woodenArds,visible.filter(u=>!u.boat&&ploughing(u)).length);
    for(const [kind,mesh]of this.cargoMeshes)this.cargoMeshes.set(kind,ensureInstanceCapacity(this.scene,mesh,neededCargo[kind]));
    for(const [kind,mesh]of this.haulageMeshes)this.haulageMeshes.set(kind,ensureInstanceCapacity(this.scene,mesh,neededVehicles[kind]));
    if(this.canoePaddles)this.canoePaddles=ensureInstanceCapacity(this.scene,this.canoePaddles,neededVehicles.canoe);
    for (const u of visible) {
      const kind=u.boat||u.haulage==='pack'&&(!u.packAnimal||u.packAnimal.hp<=0)?undefined:u.haulage==='canoe'?'canoe':(u.type==='worker'&&!u.militia||u.caravanArmed)?u.haulage:undefined;
      const horse=kind==='pack'&&u.packAnimal?.species==='horse';
      const bovine=kind==='pack'&&u.packAnimal?.species==='cattle';
      const vehicle=horse?this.packHorses:bovine?this.packCattle:kind&&this.haulageMeshes.get(kind);
      const index=horse?horses:bovine?cattle:kind?vehicles[kind]:0;
      const mounted=!!vehicle&&index<instCap(vehicle);
      if(mounted){
        const dx=Math.sin(u.facing),dz=Math.cos(u.facing),offset=kind==='canoe'?0:2.1,x=u.x-dx*offset,z=u.z-dz*offset;
        const pitch=-Math.atan2(game.travelHeight(x+dx*.8,z+dz*.8)-game.travelHeight(x-dx*.8,z-dz*.8),1.6);
        const roll=Math.atan2(game.travelHeight(x+dz*.5,z-dx*.5)-game.travelHeight(x-dz*.5,z+dx*.5),1);
        const water=kind==='canoe'?game.waterAt(x,z):0;
        const afloat=kind==='canoe'&&game.height(x,z)<water+.3;
        _p.set(x,kind==='canoe'?(afloat?water-.12:u.y+1.8):game.travelHeight(x,z)+.04,z);
        _haulEuler.set(kind==='canoe'?0:THREE.MathUtils.clamp(pitch,-.45,.45),u.facing,kind==='canoe'?0:THREE.MathUtils.clamp(roll,-.4,.4));
        // Subtle loaded-animal gait shares the existing instance; no extra meshes.
        if(kind==='pack'&&Math.hypot(u.vx,u.vz)>.1){
          const gait=Math.sin(u.stride*2+u.id*.7);
          _p.y+=Math.abs(gait)*.055;_haulEuler.z+=gait*.025;
        }
        _q.setFromEuler(_haulEuler);_s.set(1,1,1);_haulMatrix.compose(_p,_q,_s);
        vehicle!.setMatrixAt(index,_haulMatrix);
        if(horse||bovine){
          if(horse){horses++;this.packHorseOwners.push(u);}else{cattle++;this.packCattleOwners.push(u);}
          if(this.woodenArds&&ploughing(u)){
            this.woodenArds.setMatrixAt(ards++,_haulMatrix);this.woodenArdOwners.push(u);
          }
        }else vehicles[kind!]++;
        if(kind==='canoe'&&this.canoePaddles&&paddles<instCap(this.canoePaddles)){
          const moving=afloat&&Math.hypot(u.vx,u.vz)>.1;
          const stroke=moving?Math.sin(game.state.time*4+u.id*.7):0;
          _p.set(.72,afloat?.85:.5,0);
          _e.set(afloat?stroke*.65:Math.PI/2,0,afloat?-.25:0);_q.setFromEuler(_e);_s.set(1,1,1);
          _m.compose(_p,_q,_s).premultiply(_haulMatrix);
          this.canoePaddles.setMatrixAt(paddles++,_m);
          _q.setFromEuler(_haulEuler);
        }
      }
      const carryType=u.plantingWork?'food':u.carryType,carried=u.plantingWork?1:u.carry;
      if(carried<=0||!carryType)continue;
      const mesh=this.cargoMeshes.get(carryType),i=counts[carryType];
      if(!mesh||i>=instCap(mesh))continue;
      const cartMatrix=this.draftCarts?.matrixFor(u);
      if(cartMatrix&&!u.plantingWork){
        const fullness=Math.min(1,carried/carryingCapacity(u,carryType)),height=.35+fullness*.55;
        _p.set(0,DRAFT_CART_RENDER.deckHeight+height*.5,0).applyMatrix4(cartMatrix);_q.setFromRotationMatrix(cartMatrix);_s.set(1.25,height/.55,1.65);_m.compose(_p,_q,_s);
      }else if(mounted&&!u.plantingWork){
        const fullness=Math.min(1,carried/carryingCapacity(u,carryType)),height=.35+fullness*.55;
        _p.set(0,(kind==='cart'?.7:kind==='pack'?(horse?1.40:bovine?1.46:1.05):.34)+height*.5,kind==='canoe'?-.85:0).applyMatrix4(_haulMatrix);
        _s.set(1.25,height/.55,1.65);_m.compose(_p,_q,_s);
      }else{
        _p.set(u.x-Math.sin(u.facing)*0.5,u.y+1.1,u.z-Math.cos(u.facing)*0.5);
        _e.set(0,u.facing,0);_q.setFromEuler(_e);_s.set(1,1,1);_m.compose(_p,_q,_s);
      }
      mesh.setMatrixAt(i,_m);_c.set(CARGO_COLORS[carryType]);mesh.setColorAt(i,_c);counts[carryType]++;
    }
    // Reuse cargo batches for visible finite ruin supplies, after residents so
    // decorative piles can never displace their carried loads from the pool.
    for(const b of game.state.buildings||[]){
      if(b.hp>0||!b.raidLoot||!game.visibleAt(b.x,b.z))continue;
      let slot=0;
      for(const kind of Object.keys(CARGO_COLORS) as ResKind[]){
        const amount=b.raidLoot[kind]||0,mesh=this.cargoMeshes.get(kind),i=counts[kind];
        if(amount<=0||!mesh||i>=instCap(mesh))continue;
        const x=b.x+(slot%3-1)*1.5,z=b.z+(Math.floor(slot/3)-.5)*1.5;
        const size=Math.min(1.8,.45+Math.cbrt(amount/12)*.45);
        _p.set(x,game.height(x,z)+.4*size,z);_e.set(0,(b.id%7)*.37,0);_q.setFromEuler(_e);_s.setScalar(size);_m.compose(_p,_q,_s);
        mesh.setMatrixAt(i,_m);_c.set(CARGO_COLORS[kind]);mesh.setColorAt(i,_c);counts[kind]++;slot++;
      }
    }
    for(const [kind,mesh] of this.cargoMeshes){mesh.count=counts[kind];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    if(this.woodenArds){this.woodenArds.count=ards;this.woodenArds.instanceMatrix.needsUpdate=true;}
    if(this.packCattle){this.packCattle.count=cattle;this.packCattle.instanceMatrix.needsUpdate=true;}
    if(this.packHorses){this.packHorses.count=horses;this.packHorses.instanceMatrix.needsUpdate=true;}
    if(this.canoePaddles){this.canoePaddles.count=paddles;this.canoePaddles.instanceMatrix.needsUpdate=true;}
    for(const [kind,vehicle] of this.haulageMeshes){vehicle.count=vehicles[kind];vehicle.instanceMatrix.needsUpdate=true;}
  }

  private syncRiverboatMeshes(game:Game){
    this.hullFleet?.sync(game,this.shadowsEnabled);
    this.sailRigs?.sync(game,this.shadowsEnabled);
    const mesh=this.riverboats;if(!mesh)return;let count=0;
    for(const b of game.state.boats||[]){
      if(b.hullClass||b.hp<=0||count>=instCap(mesh)||b.team!==0&&!game.exploredAt(b.x,b.z))continue;
      _p.set(b.x,game.waterAt(b.x,b.z)-.12,b.z);_e.set(0,b.facing,0);_q.setFromEuler(_e);_s.set(1,1,1);_m.compose(_p,_q,_s);mesh.setMatrixAt(count++,_m);
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
  }

  private syncUnits(game: Game) {
    this.wornGarments?.beginFrame(this.quality,this.shadowsEnabled);
    this.wornArmor?.beginFrame(this.quality,this.shadowsEnabled);
    this.waterVessels?.beginFrame(this.quality,this.shadowsEnabled);
    this.baskets?.beginFrame(this.quality,this.shadowsEnabled,this.camera.position);
    const grouped = new Map<UnitType, typeof game.state.units>();
    for (const t of UNIT_TYPES) grouped.set(t, []);
    for (const u of game.state.units) {
      if (u.hp > 0) grouped.get(u.type)?.push(u);
    }
    const rigPeople=this.people;
    if(rigPeople){const living:typeof game.state.units=[];for(const list of grouped.values())for(const u of list)living.push(u);rigPeople.begin(game,this.camera.position,this.quality,this.shadowsEnabled,living);
     for(const m of this.unitMeshes.values())(m.material as THREE.Material).visible=!rigPeople.active;}
    const foodWork = new Map<number,{recipe:string;siteId:number}>();
    for(const project of game.state.production?.projects||[]){
      if(project.phase!=='working'||project.actorId===null||project.blockedReason)continue;
      if(/^(threshCereal|winnowCereal|grindGrain|bakeBread|cookFish|cookMeat|cookPorridge)/.test(project.recipe)){
        foodWork.set(project.actorId,{recipe:project.recipe,siteId:project.workplace});
      }
    }
    let feedback=0,toolCount=0;
    for(const u of game.state.units)if(u.hp>0&&!u.shelterId&&(u.team===0||game.visibleAt(u.x,u.z))){if(unitFeedbackVisible(u,this.hoveredUnitId,this.unitRingsEnabled))feedback++;if(u.type==='worker'&&!u.militia&&(u as FarmToolUnit).farmTool&&(u as FarmToolUnit).farmTool!=='woodenArd')toolCount++;}
    const selectedBoat=game.state.boats?.find(b=>b.id===game.selectedBoat&&b.hp>0&&b.team===0);
    this.rings=ensureInstanceCapacity(this.scene,this.rings,feedback+(game.state.selBld&&game.state.selBld.hp>0?1:0)+(selectedBoat?1:0));
    if(this.farmToolMesh)this.farmToolMesh=ensureInstanceCapacity(this.scene,this.farmToolMesh,toolCount);
    let ri = 0, tools = 0;
    for (const t of UNIT_TYPES) {
      const old = this.unitMeshes.get(t);
      if (!old){this.unitInstanceOwners.set(t,[]);continue;}
      const peopleFar=this.drawBandsNow.peopleFar,cp=this.camera.position,list=admitVisibleUnits(grouped.get(t)!,grouped.get(t)!.length,u=>(u.team===0||game.visibleAt(u.x,u.z))&&(u.selected||peopleFar===Infinity||Math.hypot(u.x-cp.x,u.z-cp.z)<=peopleFar),this.hoveredUnitId);
      const mesh=ensureInstanceCapacity(this.scene,old,list.length);this.unitMeshes.set(t,mesh);
      this.unitInstanceOwners.set(t,list);
      const n=list.length;
      for (let i = 0; i < n; i++) {
        const u = list[i];
        const spd = Math.hypot(u.vx, u.vz);
        const walking = spd > 0.35;
        const chopping =
          !walking && (u.order === "gather" || u.order === "attack" || u.order === "build" || !!u.copperStudy&&!u.copperStudy.paused);
        const farming=!walking&&u.order==="gather"&&(!!u.plantingWork||u.node&&"type" in u.node&&u.node.type==="farm");
        const work=!walking?foodWork.get(u.id):undefined;
        const site=work?game.state.buildings.find(b=>b.id===work.siteId):undefined;
        const rhythm=game.state.time*(work?.recipe.startsWith('thresh')?10:5)+u.id*.75;
        const swing=(1+Math.sin(rhythm))*.5;
        const workPitch=work?.recipe.startsWith('thresh')?.48*swing**3:
          work?.recipe.startsWith('winnow')?-.12*Math.sin(rhythm):
          work?.recipe.startsWith('grind')?.25+.14*Math.sin(rhythm):.09+.31*swing;
        const phase = u.stride;
        const afloat=u.haulage==="canoe"&&game.height(u.x,u.z)<game.waterAt(u.x,u.z)+.3;
        const bob = afloat ? Math.sin(game.state.time*2+u.id)*.025 : walking
          ? Math.abs(Math.sin(phase)) * 0.16
          : chopping
            ? Math.abs(Math.sin(phase)) * 0.08
            : 0;
        const pitch = afloat ? 0 : walking ? Math.sin(phase) * 0.22 : work ? workPitch : farming ? .18+Math.sin(phase)*.16 : chopping ? Math.sin(phase) * 0.14 : 0;
        const roll = afloat ? 0 : walking ? Math.sin(phase * 2) * 0.12 :
          work?.recipe.startsWith('winnow') ? Math.sin(rhythm)*.23 : 0;
        const yScale = afloat ? 1.3 : walking ? 1.65 * (1 + Math.sin(phase * 2) * 0.045) : 1.65;
        const st = TEAM_STYLE[u.team] || TEAM_STYLE[0];
        const body =
          (u.type === "leader" ? 1.95 : 1.65) *
          (u.stature || 1) *
          (u.team === 1 ? 1.12 : u.team === 2 ? 0.92 : 1);
        _p.set(u.x, u.y + bob, u.z);
        _e.set(pitch, site?Math.atan2(site.x-u.x,site.z-u.z):u.facing, roll);
        _q.setFromEuler(_e);
        _s.set(
          body * st.sx,
          (u.type === "leader" ? yScale * 1.18 : yScale) * (u.stature || 1) * st.sy,
          body * st.sz,
        );
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
        const garmentCondition=u.garment?.condition??0,rigDrew=rigPeople?.active&&rigPeople.write(u,[_s.x,(u.type==="leader"?(afloat?1.3:1.65)*1.18:(afloat?1.3:1.65))*(u.stature||1)*st.sy,_s.z],afloat?bob:0,site?Math.atan2(site.x-u.x,site.z-u.z):u.facing,garmentCondition>0?.64+.36*Math.min(1,garmentCondition):1);
        if(!rigDrew){this.wornGarments?.write(game,u,_m);this.wornArmor?.write(game,u,_m);}
        this.waterVessels?.write(game,u,_m);
        this.baskets?.write(game,u,_m);
        const tool=(u as FarmToolUnit).farmTool;
        if(tool&&tool!=='woodenArd'&&u.type==='worker'&&!u.militia&&this.farmToolMesh&&tools<instCap(this.farmToolMesh)){
          this.farmToolMesh.setMatrixAt(tools,_m);
          _c.set(FARM_TOOL_COLORS[tool]);this.farmToolMesh.setColorAt(tools,_c);tools++;
        }
        _c.set(st.unit);
        _c.offsetHSL(((u.tint || 0) - 0.5) * 0.12, 0.04, ((u.stature || 1) - 1) * 0.12);
        if (mesh.instanceColor) mesh.setColorAt(i, _c);
        if (unitFeedbackVisible(u,this.hoveredUnitId,this.unitRingsEnabled) && ri < instCap(this.rings)) {
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
    rigPeople?.end(game);
    this.wornGarments?.endFrame();
    this.wornArmor?.writeGround(game,this.camera);
    this.wornArmor?.endFrame();
    this.waterVessels?.endFrame();
    this.baskets?.endFrame();
    if(this.farmToolMesh){this.farmToolMesh.count=tools;this.farmToolMesh.instanceMatrix.needsUpdate=true;if(this.farmToolMesh.instanceColor)this.farmToolMesh.instanceColor.needsUpdate=true;}
    if (game.state.selBld && game.state.selBld.hp > 0 && ri < instCap(this.rings)) {
      const b = game.state.selBld;
      _p.set(b.x, b.y + 0.06, b.z);
      _e.set(-Math.PI / 2, 0, 0);
      _q.setFromEuler(_e);
      _s.set(Math.max(b.w, b.d) * 0.55, Math.max(b.w, b.d) * 0.55, 1);
      _m.compose(_p, _q, _s);
      this.rings.setMatrixAt(ri, _m);
      ri++;
    }
    const boat=selectedBoat;
    if(boat&&ri<instCap(this.rings)){
      _p.set(boat.x,game.world.waterY+.08,boat.z);_e.set(-Math.PI/2,0,0);_q.setFromEuler(_e);_s.set(4,4,1);_m.compose(_p,_q,_s);
      this.rings.setMatrixAt(ri++,_m);
    }
    const resource = game.selectedResource;
    const reach=game.selectedWaterReach,marker=resource??reach;
    this.resourceRing.visible=!!marker&&(!resource||resource.amount>0)&&game.exploredAt(marker.x,marker.z);
    if(marker&&this.resourceRing.visible){
      // Drape the halo over the slope; a horizontal ring disappears into hills.
      const positions=this.resourceRing.geometry.getAttribute("position") as THREE.BufferAttribute;
      for(let i=0;i<positions.count;i++){
        const x=marker.x+positions.getX(i),z=marker.z+positions.getZ(i);
        positions.setY(i,(reach?Math.max(game.height(x,z),game.waterAt(x,z)):game.height(x,z))+.12);
      }
      positions.needsUpdate=true;this.resourceRing.position.set(marker.x,0,marker.z);
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
    this.ghostGame=_game; /* ghost visibility is owned by Engine.updateGhost / setGhost */
  }

  private fieldSnapMarks:FieldSnapMarks|null=null;private fieldWaterMode=false;private irrigationLayer:IrrigationLayer|null=null;private ditchPreview:{x0:number;z0:number;x1:number;z1:number;ok:boolean}|null=null;
  /** Planned ditch line (amber when affordable, red when not). Null clears. */
  setDitchPreview(p:{x0:number;z0:number;x1:number;z1:number;ok:boolean}|null){this.ditchPreview=p;this.irrigationLayer?.setPreview(p);}
  /** Water mode: irrigated plots read cool and dark, rain-fed plots pale (painterly look only). */
  setFieldWaterMode(on:boolean){this.fieldWaterMode=on;if(this.fieldSurface)this.fieldSurface.waterMode.value=on?1:0;}
  /** Highlight the seams a field being placed snaps to. Empty clears. */
  setFieldSnap(edges:readonly import('@/game/fieldSnap').SnapEdge[]){
    if(!edges.length){this.fieldSnapMarks?.set([]);return;}
    if(!this.fieldSnapMarks&&this.ghostGame)this.fieldSnapMarks=new FieldSnapMarks(this.scene,(x,z)=>this.ghostGame!.height(x,z));
    this.fieldSnapMarks?.set(edges);
  }

  setLinePreview(points:{x:number;z:number;y:number;ok:boolean}[]){
    if(!points.length){if(this.linePreview)this.linePreview.visible=false;return;}
    if(!this.linePreview){
      this.linePreview=new THREE.InstancedMesh(new THREE.BoxGeometry(3.8,.25,3.8),new THREE.MeshBasicMaterial({transparent:true,opacity:.65,depthWrite:false}),32);
      this.linePreview.frustumCulled=false;this.scene.add(this.linePreview);
    }
    this.linePreview.visible=true;this.linePreview.count=Math.min(32,points.length);
    const matrix=new THREE.Matrix4(),color=new THREE.Color();
    for(let i=0;i<this.linePreview.count;i++){
      const p=points[i];matrix.makeTranslation(p.x,p.y+.2,p.z);this.linePreview.setMatrixAt(i,matrix);
      color.set(p.ok?'#75db9a':'#f06958');this.linePreview.setColorAt(i,color);
    }
    this.linePreview.instanceMatrix.needsUpdate=true;
    if(this.linePreview.instanceColor)this.linePreview.instanceColor.needsUpdate=true;
  }

  setGhost(type: BldType | null, x: number, z: number, y: number, ok: boolean, quality?: number, bridge?: import("@/game/transport").BridgeSpan|null, size?:{w:number;d:number}, gateFacing?:GateFacing, towerPlatform?:TowerPlatform, quarterTurn=false) {
    if (!type) {
      this.clearGhost();
      this.ghost.visible = false;
      return;
    }
    this.ghost.visible = true;
    const carved=this.carvedGhostInput(type,x,z,quarterTurn,size,bridge,towerPlatform);
    this.ghost.position.set(x, carved?carved.y:y, z);
    this.ghost.rotation.set(0,carved?carved.yaw:type==='gate'?gateOrientation(gateFacing).yawRadians:quarterTurn?Math.PI/2:0,0);this.ghost.scale.set(1,1,1);
    if(bridge){const len=Math.hypot(bridge.bx-bridge.ax,bridge.bz-bridge.az);this.ghost.position.set((bridge.ax+bridge.bx)/2,y,(bridge.az+bridge.bz)/2);this.ghost.rotation.y=Math.atan2(bridge.bx-bridge.ax,bridge.bz-bridge.az);this.ghost.scale.z=len/12;}
    const qualityStep = quality === undefined ? null : Math.round(quality*10)/10;
    const carvedVariant=carved?carvedVariantFor(carved.input):null;
    const key = type + (ok ? "-ok" : "-bad") + qualityStep+JSON.stringify(size)+(type==='watchtower'&&towerPlatform?towerPlatformGeometryKey(towerPlatform):'')+(carvedVariant?`|${carvedVariant.key}|${Math.round(carved!.y*20)}|${Math.round(x*2)},${Math.round(z*2)}|${carved!.fake.site?.foundation??''}`:'');
    const fieldGame=type==='farm'?this.ghostGame:null,fieldSa=fieldGame&&fieldGame.state.terrainModel==='v2'?fieldGame.siteAssessment('farm',x,z,size?.w??BUILDINGS.farm.w,size?.d??BUILDINGS.farm.d):null;
    const fieldKey=fieldSa?`|f${fieldSa.ok}${fieldSa.terrace?.k}${fieldSa.terrace?.n}${Math.round(x*2)},${Math.round(z*2)}`:'';
    if (this.ghost.userData.key === key+fieldKey) return;
    this.clearGhost();
    this.ghost.userData.key = key+fieldKey;
    // terrain model v2: the terrace strips and walls the field will be built with, tinted like the other slope previews
    if(fieldGame&&fieldSa?.ok&&fieldSa.terrace&&fieldSa.terrace.k!=='none'){
      const tint=new THREE.Color(fieldSa.tier==='moderate'?'#f0b030':'#f08030'),w=size?.w??BUILDINGS.farm.w,d=size?.d??BUILDINGS.farm.d;
      for(const sp of foundationBoxes('strips',{x,z,w,d},{height:(px,pz)=>fieldGame.height(px,pz),level:fieldGame.height(x,z),downhill:fieldSa.downhill,terrace:{n:fieldSa.terrace.n,kind:fieldSa.terrace.k}})){
        const m=new THREE.Mesh(this.ghostBox,new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.4,depthWrite:false}));m.position.set(sp.x,sp.y,sp.z);m.rotation.y=sp.yaw;m.scale.set(sp.length,sp.height,sp.width);this.ghostFoot.add(m);
      }
    }
    if(carved&&carvedVariant){this.buildCarvedGhost(carved,carvedVariant,ok);return;}
    const meshes = this.bldMeshes.get(type);
    if (!meshes) return;
    const tint = !ok ? "#b53632" : qualityStep === null ? "#6a8a48" : new THREE.Color("#a69b46").lerp(new THREE.Color("#29df51"),qualityStep).getHex();
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
    const add=(geometry:THREE.BufferGeometry,material:THREE.Material,x=0,z=0,sx=1,sz=1)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,0,z);mesh.scale.set(sx,1,sz);this.ghost.add(mesh);};
    if(type==='watchtower'&&towerPlatform){const geo=towerPlatformGeos(towerPlatform);add(geo.timber,mt);if(geo.extra)add(geo.extra,mt);add(geo.roof,mr);
    }else if(size&&(type==='warehouse'||expandedGrainWorkplace({type,...size}))){
      for(const m of plotModules({type,...size} as import("@/game/types").Building)){add(meshes.timber.geometry,mt,m.x,m.z,m.sx,m.sz);add(meshes.roof.geometry,mr,m.x,m.z,m.sx,m.sz);}
    }else if(type==='pen'){
      add(meshes.timber.geometry,mt);add(meshes.roof.geometry,mr);
      const w=size?.w??BUILDINGS.pen.w,d=size?.d??BUILDINGS.pen.d;
      for(const side of[-1,1]){const across=new THREE.BoxGeometry(w,.08,.1),along=new THREE.BoxGeometry(.1,.08,d);across.userData.ownedGhost=along.userData.ownedGhost=true;add(across,mt,0,side*d/2);add(along,mt,side*w/2,0);}
    }else if(size&&type==='farm'){
      add(meshes.timber.geometry,mt,0,0,size.w/BUILDINGS.farm.w,size.d/BUILDINGS.farm.d);
      add(meshes.roof.geometry,mr,(size.w-BUILDINGS.farm.w)/2,(size.d-BUILDINGS.farm.d)/2);
    }else{add(meshes.timber.geometry,mt);add(meshes.roof.geometry,mr);}
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(size?.w??(type==='fibreWorkshop'?BUILDINGS.fibreWorkshop.w:8), size?.d??(type==='fibreWorkshop'?BUILDINGS.fibreWorkshop.d:8)),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    if(type==='pen')pad.geometry.userData.ownedGhost=true;
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.08;
    if(type!=="bridge")this.ghost.add(pad);else {pad.geometry.dispose();(pad.material as THREE.Material).dispose();}
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

  /** Same builder as the finished building (carvedInputFor), or null when this type keeps the classic ghost (fort lines, plots, bridges, towers on platforms, modular stores). */
  private carvedGhostInput(type:BldType,x:number,z:number,quarterTurn:boolean,size?:{w:number;d:number},bridge?:unknown,tower?:unknown){
    const game=this.ghostGame;
    if(!game||this.renderStyle!=='carved'||size||bridge||tower||!CARVED_TYPES.includes(type)||CARVED_KEEP_CURRENT.has(type))return null;
    if(['palisade','gate','stonewall','trench','moat','warehouse','dock','aqueduct','quarry','cornerstone','cairn','grove','watchtower','canal'].includes(type))return null;
    const t=quarterTurn?turnedFootprint(type):BUILDINGS[type];
    const fake={id:game.state.nextId,kind:'building',type,team:0,x,y:game.height(x,z),z,w:t.w,d:t.d,hp:1,maxHp:1,build:1} as unknown as import("@/game/types").Building;
    const sa=game.state.slopeModel==='graded'?game.siteAssessment(type,x,z,t.w,t.d):null,rec=sa&&sa.ok?siteRecord(sa):undefined;if(rec)fake.site=rec;
    const input=this.carvedInputFor(game,fake,type,1);
    return {input,y:input.y,yaw:input.yaw,fake};
  }
  private buildCarvedGhost(c:NonNullable<ReturnType<WorldView['carvedGhostInput']>>,variant:NonNullable<ReturnType<typeof carvedVariantFor>>,ok:boolean){
    let geo=this.ghostGeo.get(variant.key);
    if(!geo){if(this.ghostGeo.size>48){for(const g of this.ghostGeo.values())g.dispose();this.ghostGeo.clear();}geo=carvedGeometry(buildCarvedMesh(variantSpec(variant),0));this.ghostGeo.set(variant.key,geo);}
    const tier=c.fake.site?.tier,tint=new THREE.Color(!ok?'#f0604e':tier==='moderate'?'#f0b030':tier==='steep'?'#f08030':'#59e07a'),mat=createCarvedMaterial();
    mat.transparent=true;mat.opacity=.66;mat.depthWrite=false;mat.color.set('#ffffff').lerp(tint,.5);mat.emissive.copy(tint);mat.emissiveIntensity=.2;
    this.ghost.add(new THREE.Mesh(geo,mat));
    // the levelled plinth / footings the finished building will stand on, tinted the same way
    const game=this.ghostGame;if(!game)return;
    for(const sp of buildingGroundSupports(game,c.fake)){
      const m=new THREE.Mesh(this.ghostBox,new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.35,depthWrite:false}));
      m.position.set(sp.x,sp.y,sp.z);m.rotation.y=sp.yaw;m.scale.set(sp.length,sp.height,sp.width);this.ghostFoot.add(m);
    }
  }

  private clearGhost() {
    while (this.ghost.children.length) {
      const ch = this.ghost.children[0] as THREE.Mesh;
      this.ghost.remove(ch);
      if(ch.geometry?.userData.ownedGhost)ch.geometry.dispose();
      const mat = ch.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    }
    for(const ch of [...this.ghostFoot.children] as THREE.Mesh[]){this.ghostFoot.remove(ch);(ch.material as THREE.Material).dispose();}
    this.ghost.userData.key = "";
  }

  private syncArrows(game: Game) {
    const ps = game.state.projectiles;
    let arrows=0,stones=0;
    ps.forEach((p) => {
      if(p.huntingWeapon==='stone'){if(stones<40){_p.set(p.x,p.y,p.z);_q.identity();_s.set(1,1,1);_m.compose(_p,_q,_s);this.huntingStones.setMatrixAt(stones++,_m);}return;}
      if (arrows >= 40) return;
      _p.set(p.x, p.y, p.z);
      const dx = p.huntingVelocity?.x ?? p.tx - p.x,
        dy = p.huntingVelocity?.y ?? p.ty - p.y,
        dz = p.huntingVelocity?.z ?? p.tz - p.z;
      _e.set(0, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
      _q.setFromEuler(_e);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.arrows.setMatrixAt(arrows++, _m);
    });
    this.arrows.count = arrows;
    this.huntingStones.count=stones;this.huntingStones.instanceMatrix.needsUpdate=true;
    this.arrows.instanceMatrix.needsUpdate = true;
  }

  private syncSmoke(game: Game, dt: number) {
    const litHearths=workingHearths(game);
    const bakingOvens=new Set((game.state.production?.projects||[])
      .filter(p=>(p.recipe==='bakeBreadOven'||p.recipe==='bakeBreadDouble'||p.recipe==='bakeBreadBulk')&&p.phase==='working'&&!p.blockedReason).map(p=>p.workplace));
    const halls=game.state.buildings.filter(b=>b.type==='townhall'&&game.finished(b)&&survivalFireActive(game,b.team)&&
      !game.state.buildings.some(h=>h.team===b.team&&litHearths.has(h.id)));
    const sources=game.state.buildings.filter(b=>(litHearths.has(b.id)||bakingOvens.has(b.id))&&
      game.finished(b)&&(b.team===0||game.visibleAt(b.x,b.z)));
    const count=Math.min(this.smokePos.length/3,sources.length*8);
    this.smokeGeo.setDrawRange(0,count);
    for(let i=0;i<count;i++){
      const source=sources[i%sources.length];
      const t=game.state.time*.55+i*.67;
      const height=(t%3.2)/3.2;
      this.smokePos[i*3]=source.x+Math.sin(t)*(.16+height*.55);
      this.smokePos[i*3+1]=source.y+(source.type==='oven'?1.6:.3)+height*4.3;
      this.smokePos[i*3+2]=source.z+Math.cos(t*.7)*(.1+height*.35);
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
    if (this.flames) {
      const night = game.isNight();
      let fi = 0;
      const torchBlds = game.state.buildings.filter(
        (b) =>
          b.hp > 0 &&
          game.finished(b) &&
          (halls.includes(b) ||
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
      for(const b of game.state.buildings){if(fi>=instCap(this.flames))break;if(!litHearths.has(b.id)||!(b.team===0||game.visibleAt(b.x,b.z)))continue;
        _p.set(b.x,foundationProfile(game,b).level+.18,b.z);_q.identity();_s.set(.42,.55+Math.sin(game.state.time*8+b.id)*.06,.42);_m.compose(_p,_q,_s);this.flames.setMatrixAt(fi++,_m);
      }
      let pi=0;
      for(const h of halls){if(pi>=instCap(this.pits))break;_p.set(h.x+1.6,h.y,h.z+4.2);_q.set(0,0,0,1);_s.setScalar(1);_m.compose(_p,_q,_s);this.pits.setMatrixAt(pi++,_m);}
      if(night)for(const u of game.state.units){
        if(fi>=instCap(this.flames)||pi>=instCap(this.pits))break;
        if(u.hp<=0||!u.expedition||u.expedition.returning||!(u.workReason||"").startsWith("Night camp")||!game.visibleAt(u.x,u.z))continue;
        _p.set(u.x+.9,u.y,u.z+.8);_q.set(0,0,0,1);_s.setScalar(.5);_m.compose(_p,_q,_s);this.pits.setMatrixAt(pi++,_m);
        _p.y+=.25;_s.set(.3,.5,.3);_m.compose(_p,_q,_s);this.flames.setMatrixAt(fi++,_m);
      }
      this.pits.count=pi;this.pits.instanceMatrix.needsUpdate=true;
      if (night) {
        let torches = 0;
        for (const u of game.state.units) {
          if (fi >= instCap(this.flames) || torches >= 12) break;
          if (u.hp <= 0 || u.shelterId) continue;
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
    const fire=sources.find(b=>b.team===0&&litHearths.has(b.id));
    const home=halls.find(b=>b.team===0);
    if(fire||home){
      const site=(fire||home)!;
      this.hearth.position.set(site.x+(fire?0:1.6),site.y+.85,site.z+(fire?0:4.2));
      // living fire: three incommensurate flicker bands plus a rare gust, hotter/yellower on a surge, deeper orange as it sinks; lit fires only (light follows actual heating), no free light
      const t=game.state.time,fl=Math.sin(t*9)*.14+Math.sin(t*23.7+1.3)*.09+Math.sin(t*5.1+2.1)*.07+(Math.sin(t*1.7)>.93?-.22:0);
      this.hearth.intensity=(game.isNight()?2.4:1.35)*(fire?1:.8)+fl*(game.isNight()?1.6:1);
      this.hearth.color.setHSL(.07+fl*.05,.95,.58+fl*.08);
    }else this.hearth.intensity=0;
    void dt;
  }

  render() {
    this.latestRenderMetrics=undefined;
    if (this.lost || this.disposed) return;
    {const now=typeof performance!=='undefined'?performance.now():0;if(this.lastRenderAt>0){const eased=this.drawGovernor.observe(now-this.lastRenderAt);if(eased){this.applyDrawBands();this.onDrawDistanceEased?.(eased,this.drawGovernor.chosen);}}this.lastRenderAt=now;}
    beginRendererFrame(this.renderer.info);
    try {
    try {
      if (this.composer && this.quality !== "low") this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    } catch {
      this.composer?.dispose();
      this.bloom?.dispose();
      this.composer = null;
      this.bloom = null;
      try {
        this.renderer.render(this.scene, this.camera);
      } catch {
        this.lost = true;
      }
    }
    } finally { this.latestRenderMetrics=rendererFrameMetrics(this.renderer.info); }
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
    return makeDepthWater(this.terrainSurface!,this.timeU,false,this.mapStyle==='painterly'?'painterly':'classic','sea');
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
        uTime: this.timeU,
        uTerr: { value: this.terrTex },
        uHalf: { value: (this.mapSize/2) },
        uSize: { value: this.mapSize },
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
        uniform float uTime;
        uniform sampler2D uMap;
        uniform sampler2D uTerr;
        varying vec2 vUv;
        void main() {
          float v = texture2D(uMap, vUv).r;
          vec4 terr = texture2D(uTerr, vUv);
          float live = smoothstep(0.55, 0.85, v);
          float shroudA = mix(0.98, 0.10, smoothstep(0.05, 0.32, v)) * (1.0 - live);
          float seen = smoothstep(0.12, 0.28, v);
          // Colored land remains visible without concealing terrain detail.
          float contour = smoothstep(0.08,0.16,terr.a)*(1.0-smoothstep(0.22,0.32,terr.a));
          float wash = seen * (terr.a*mix(0.23,0.43,live) + contour*mix(0.24,0.45,live));
          float a = max(shroudA, wash);
          if (a < 0.012) discard;
          float cloud = sin(vUv.x * 115.0 + uTime * 0.08) * sin(vUv.y * 93.0 - uTime * 0.06);
          vec3 mist = mix(vec3(0.72, 0.82, 0.86), vec3(0.9, 0.94, 0.94), 0.5 + cloud * 0.22);
          vec3 col = mix(mist, terr.rgb, wash / max(a, 0.001));
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.fowMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.mapSize, this.mapSize, SEGS, SEGS), mat);
    this.fowMesh.rotation.x = -Math.PI / 2;
    this.fowMesh.position.y = 0.45;
    this.fowMesh.renderOrder = 6;
    this.fowMesh.raycast = () => {};
    this.scene.add(this.fowMesh);
  }

  private setupComposer() {
    try {
      this.composer?.dispose();
      this.bloom?.dispose();
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
      this.gradePass=null;
      const vig = this.mapStyle==='painterly'?(this.gradePass=new ShaderPass({uniforms:THREE.UniformsUtils.clone(PAINTER_GRADE_SHADER.uniforms),vertexShader:PAINTER_GRADE_SHADER.vertexShader,fragmentShader:PAINTER_GRADE_SHADER.fragmentShader})):new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          offset: { value: 0.85 },
          darkness: { value: 0.12 },
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
      this.composer.addPass(new FilmPass(this.mapStyle==='painterly'?0.012:0.025, false));
      // Match the direct renderer's display color conversion at every quality.
      this.composer.addPass(new OutputPass());
      this.composer.setSize(w, h);
    } catch {
      this.composer?.dispose();
      this.bloom?.dispose();
      this.composer = null;
      this.bloom = null;
    }
  }

  private syncFow(game: Game) {
    if (!this.fowTex) return;
    const src = game.vision;
    const cols: [number, number, number][] = [];
    for (let t = 0; t < game.state.tribes.length; t++) {
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
        this.terrData[o + 3] = Math.round(255 * (game.territoryStrength[i] || 0));
      } else {
        const c = cols[team] || cols[0];
        this.terrData[o] = c[0];
        this.terrData[o + 1] = c[1];
        this.terrData[o + 2] = c[2];
        this.terrData[o + 3] = Math.round(255 * (game.territoryStrength[i] || 0));
      }
    }
    this.fowTex.needsUpdate = true;
    if (this.terrTex) this.terrTex.needsUpdate = true;
  }

  private syncRain(game: Game, dt: number) {
    if (!this.rain || !this.rainGeo) return;
    const sn = game.seasonMix();
    const mountain=game.height(this.look.x,this.look.z)>8;
    const flake=sn.winter>0.3&&(mountain||sn.snow>0.35);
    const wet =
      game.state.weather === "rain" ||
      game.state.weather === "storm" ||
      game.state.weather === "flood" || (flake&&Math.sin(game.state.time/24)> (mountain?-0.15:0.5));
    this.rain.visible = wet;
    this.rainGeo.setDrawRange(0,this.quality==="low"?96:this.rainPos.length/3);
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
    if (this.seasonAcc < 1 && this.lastSnow >= 0) return;
    this.seasonAcc = 0;
    const sn = game.seasonMix();
    this.lastSnow = sn.snow;
    this.carvedSnow = this.styleId==='village'||this.renderStyle==='carved'?sn.snow:0;this.carvedLayer?.setSnow(this.carvedSnow);carvedSnowUniform.value=this.carvedSnow<.02?0:this.carvedSnow;
    if(this.terrainSurface){this.terrainSurface.snow.value=sn.snow;this.terrainSurface.heights.needsUpdate=true;}
    const geo = this.terrain.geometry as THREE.BufferGeometry;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
    const pos = geo.attributes.position;
    const biome = this.terrainBiome;
    const region = this.terrainRegion;
    if (!colAttr || !biome) return;
    const arr = colAttr.array as Float32Array;
    const c = _c;
    if(this.painterGround)this.painterGround.paint(arr,sn);
    else {
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
          0.28 * sn.spring + 0.24 * sn.summer + 0.36 * sn.autumn + 0.28 * sn.winter,
          0.44 * sn.spring + 0.39 * sn.summer + 0.33 * sn.autumn + 0.34 * sn.winter,
          0.2 * sn.spring + 0.16 * sn.summer + 0.16 * sn.autumn + 0.25 * sn.winter,
        );
      } else {
        const gR = 0.42 * sn.spring + 0.36 * sn.summer + 0.48 * sn.autumn + 0.4 * sn.winter;
        const gG = 0.72 * sn.spring + 0.62 * sn.summer + 0.38 * sn.autumn + 0.44 * sn.winter;
        const gB = 0.32 * sn.spring + 0.26 * sn.summer + 0.16 * sn.autumn + 0.32 * sn.winter;
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
      // Exposed rock follows real slope; warm layered cliffs and pale ridges share
      // continuous provinces. Snow remains the final seasonal layer.
      const artOffset=i*5,art=this.terrainLandscape;
      if (art.length && b!==0 && b!==1 && b!==6) {
        const blend=art[artOffset]*LANDSCAPE_ART_RULES.rockBlend;
        c.r+=(art[artOffset+1]-c.r)*blend;
        c.g+=(art[artOffset+2]-c.g)*blend;
        c.b+=(art[artOffset+3]-c.b)*blend;
        c.multiplyScalar(art[artOffset+4]);
      }
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
      const o = i * 3;
      arr[o] = c.r;
      arr[o + 1] = c.g;
      arr[o + 2] = c.b;
    }
    // Blend neighbouring palette samples; fog remains a separate continuous overlay.
    // Reuse one buffer so the low-memory renderer creates no per-frame allocations.
    if(this.terrainBlend.length!==arr.length)this.terrainBlend=new Float32Array(arr.length);
    const segments=(geo as THREE.PlaneGeometry).parameters.widthSegments;
    const width=segments+1;
    for(let pass=0;pass<2;pass++){
      this.terrainBlend.set(arr);
      for(let i=0;i<pos.count;i++){
        const ix=i%width,iz=Math.floor(i/width),o=i*3;
        for(let channel=0;channel<3;channel++){
          let sum=this.terrainBlend[o+channel]*4,count=4;
          if(ix>0){sum+=this.terrainBlend[o-3+channel];count++;}
          if(ix<segments){sum+=this.terrainBlend[o+3+channel];count++;}
          if(iz>0){sum+=this.terrainBlend[o-width*3+channel];count++;}
          if(iz<segments){sum+=this.terrainBlend[o+width*3+channel];count++;}
          arr[o+channel]=sum/count;
        }
      }
    }
    }
    colAttr.needsUpdate = true;if(this.terrainSurface?.bankColors)this.terrainSurface.bankColors.needsUpdate=true;if(this.painterGround)this.bankLayer?.repaint();

    if (!this.biomeScene&&this.treesLeaf?.instanceColor) {
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
        if (tree && game.chopMarks.has(tree.id)) c.set("#efb34b");
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
    if(this.mapStyle==='painterly'){
      const shallow=_c.set('#62b9ae').lerp(new THREE.Color('#6cc1b3'),sn.spring).lerp(new THREE.Color('#68aea4'),sn.autumn).lerp(new THREE.Color('#a3c0c4'),Math.min(1,sn.winter*1.2)).clone();
      const deep=_c.set('#1a5a7a').lerp(new THREE.Color('#1c6482'),sn.spring).lerp(new THREE.Color('#1d5470'),sn.autumn).lerp(new THREE.Color('#33505f'),Math.min(1,sn.winter*1.2)).clone();
      for(const material of this.waterMaterials){const u=(material as THREE.ShaderMaterial).uniforms;if(u?.uColor){(u.uColor.value as THREE.Color).copy(shallow);(u.uDeep.value as THREE.Color).copy(deep);}}
    }else if (waterMat?.uniforms?.uColor) {
      (waterMat.uniforms.uColor.value as THREE.Color).set(sn.winter > 0.5 ? "#8baeb9" : "#53b5b8");
      (waterMat.uniforms.uDeep.value as THREE.Color).set(sn.winter > 0.5 ? "#2a4450" : "#123d61");
    }
  }

  private disposeWorld() {
    this.foundations?.dispose();this.foundations=null;this.contactMap?.dispose();this.contactMap=null;this.routeField?.dispose();this.routeField=null;if(this.waystations){this.scene.remove(this.waystations.group);this.waystations.dispose();this.waystations=null;}
    this.penFences?.dispose();this.penFences=null;
    this.wornGarments?.dispose();this.wornGarments=null;
    this.wornArmor?.dispose();this.wornArmor=null;
    this.people?.dispose();this.people=null;
    this.siegeRamLayer?.dispose();this.siegeRamLayer=null;
    this.housingPackets?.dispose();this.housingPackets=null;
    this.draftCarts?.dispose();this.draftCarts=null;
    this.methodRecordMarkers?.dispose();this.methodRecordMarkers=null;
    this.groundItems?.dispose();this.groundItems=null;
    this.waterVessels?.dispose();this.waterVessels=null;
    this.baskets?.dispose();this.baskets=null;
    this.fibreWork?.dispose();this.fibreWork=null;
    this.wildPlantLayer?.dispose();this.wildPlantLayer=null;
    this.landContinuation?.dispose();this.landContinuation=null;
    this.bankLayer?.dispose();this.bankLayer=null;
    this.excavationLayer?.dispose();this.excavationLayer=null;
    this.hullFleet?.dispose();this.hullFleet=null;
    this.sailRigs?.dispose();this.sailRigs=null;
    this.towerPlatforms?.dispose();this.towerPlatforms=null;
    this.contourFields?.dispose();this.contourFields=null;this.fieldSnapMarks?.dispose();this.fieldSnapMarks=null;this.irrigationLayer?.dispose();this.irrigationLayer=null;
    this.biomeScene?.dispose();this.biomeScene=null;
    this.wildlifeOwners.clear();this.packHorseOwners=[];this.domesticHorseOwners=[];this.packCattleOwners=[];this.domesticCattleOwners=[];this.woodenArdOwners=[];
    if(!this.lost)this.woodenArds?.dispose();
    if(!this.lost){for(const mesh of [this.wildHorses,this.domesticHorses,this.packHorses])mesh?.dispose();if(this.wildHorses)(this.wildHorses.material as THREE.Material).dispose();}
    if(!this.lost){for(const mesh of [this.wildCattle,this.domesticCattle,this.packCattle])mesh?.dispose();if(this.wildCattle)(this.wildCattle.material as THREE.Material).dispose();}
    if(this.wildSheep&&!this.lost)(this.wildSheep.material as THREE.Material).dispose();
    this.terrainSurface?.dispose();this.terrainSurface=null;this.localWater=null;
    for(const material of this.waterMaterials)material.dispose();this.waterMaterials=[];
    this.campVisual?.dispose();this.campVisual=null;
    const keep = new Set([
      this.ghost,
      this.arrows,
      this.huntingStones,
      this.smoke,
      this.floaters,
      this.rings,
      this.resourceRing,
      this.trailMesh,
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
    this.wildSheep=null;this.domesticSheep=null;
    this.wildHorses=null;this.domesticHorses=null;this.packHorses=null;this.woodenArds=null;
    this.wildCattle=null;this.domesticCattle=null;this.packCattle=null;
    if(this.linePreview){(this.linePreview.material as THREE.Material).dispose();this.linePreview=null;}
    if(this.eraDetails){(this.eraDetails.material as THREE.Material).dispose();this.eraDetails=null;}
    this.villageStyles.clear();this.mourning.clear();
    if(this.fieldSurface){this.fieldSurface.dispose();this.fieldSurface=null;}
    for(const [type, meshes] of this.bldMeshes){
      if((type === "farm"||terrainLaidWorkplace(type)||hasBuildingCraftsmanship(type)) && meshes.extra) (meshes.extra.material as THREE.Material).dispose();
      if(hasBuildingCraftsmanship(type))for(const mesh of[meshes.timber,meshes.roof,meshes.extra])mesh?.customDepthMaterial?.dispose();
      (meshes.timber.material as THREE.Material).dispose();
      (meshes.roof.material as THREE.Material).dispose();
    }
    this.carvedLayer?.dispose();this.carvedLayer=null;this.wonderLayer?.dispose();this.wonderLayer=null;this.carvedOwners.clear();
    this.bldMeshes.clear();this.buildingInstances.clear();
    this.unitMeshes.clear();this.unitInstanceOwners.clear();
    this.haulageMeshes.clear();
    this.canoePaddles=null;this.riverboats=null;
    for(const mesh of this.cargoMeshes.values())(mesh.material as THREE.Material).dispose();
    this.cargoMeshes.clear();
    if(this.farmToolMesh){(this.farmToolMesh.material as THREE.Material).dispose();this.farmToolMesh=null;}
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
    this.smokeTexture.dispose();
    (this.smoke.material as THREE.PointsMaterial).dispose();
    this.smokeGeo.dispose();
    disposeBuildingSurfaceTextures(Object.values(this.mats));
    for (const k of Object.values(this.mats)) k.dispose();
  }
}
