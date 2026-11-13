/** ITEM ICONS: small rendered pictures of real equipment for inventory panels.
 *
 *  BLUF: `itemIconUrl({kind,era,skin,condition})` returns a PNG data URL of that item's own model (inventory pose, three-quarter view, the society's skin, its age's
 *  material and its real condition), or null when no model exists or there is no WebGL (tests, server). Icons are cached by (model, era, skin, condition bucket,
 *  size), so a panel of fifty identical spears renders one picture. One small offscreen renderer is made on demand and released when idle. */
import * as THREE from 'three';
import {inventoryItemMesh,requestFor,conditionBucket,CONDITION_BUCKET_MID,type EquipmentState} from './itemRegistry';
import {meshGeometry,itemMaterial} from './itemGeometry';

const cache=new Map<string,string|null>();
let rd:THREE.WebGLRenderer|null=null,idle:ReturnType<typeof setTimeout>|null=null,broken=false;
export const ICON_RULES={px:96,maxCached:300,idleMs:4000} as const;
const release=()=>{if(rd){rd.dispose();rd.forceContextLoss();rd=null;}idle=null;};
export function itemIconUrl(eq:EquipmentState,px:number=ICON_RULES.px):string|null{
 if(typeof document==='undefined'||broken)return null;
 const req=requestFor(eq,0);if(!req)return null;
 const bucket=conditionBucket(eq.condition),key=`${req.id}|${req.era}|${req.skin??''}|${bucket}|${req.variant??''}|${px}`;
 if(cache.has(key))return cache.get(key)!;
 try{
  const e={...eq,condition:eq.broken?0:CONDITION_BUCKET_MID[bucket]},mesh=inventoryItemMesh(e,1);if(!mesh){cache.set(key,null);return null;}
  const g=meshGeometry(mesh);
  rd??=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});rd.setPixelRatio(1);rd.setSize(px,px,false);rd.setClearColor(0x000000,0);rd.outputColorSpace=THREE.SRGBColorSpace;rd.toneMapping=THREE.NeutralToneMapping;
  const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#f2eee4','#77735f',1.3));const sun=new THREE.DirectionalLight('#fff0d8',2.7);sun.position.set(-4,6,5);sc.add(sun);
  const fill=new THREE.DirectionalLight('#a9c0d8',.7);fill.position.set(5,2,-3);sc.add(fill);sc.add(new THREE.Mesh(g,itemMaterial()));
  const cam=new THREE.OrthographicCamera(-.58,.58,.58,-.58,.1,10);cam.position.set(0,0,3);cam.lookAt(0,0,0);
  rd.render(sc,cam);const url=rd.domElement.toDataURL('image/png');g.dispose();
  if(cache.size>=ICON_RULES.maxCached)cache.clear();cache.set(key,url);
  if(idle)clearTimeout(idle);idle=setTimeout(release,ICON_RULES.idleMs);
  return url;
 }catch{broken=true;release();return null;}
}
export const clearItemIcons=()=>{cache.clear();release();};
