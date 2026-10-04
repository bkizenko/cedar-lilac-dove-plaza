import type { Game } from "./sim";
export const HABITATS = {
  plains: { name: "Grassland", crops: 1.2, forage: 1, timber: 0.85, winterFood: 1.08, advice: "Open fertile ground favors fields. Store the autumn harvest; timber is slower to collect." },
  forest: { name: "Woodland", crops: 0.8, forage: 1.2, timber: 1.2, winterFood: 1, advice: "Woodland supports gathering and timber. Smaller harvests make a mixed food supply valuable." },
  hills: { name: "Uplands", crops: 0.7, forage: 0.85, timber: 0.9, winterFood: 1.2, advice: "Thin soils give smaller harvests. Exposed winters need more food; prepare stores and trade for grain." },
} as const;
export function habitatAt(g: Game, x: number, z: number) {
  let kind: keyof typeof HABITATS = "plains", distance = Infinity;
  for (const biome of g.world.biomes || []) {
    const d = (biome.x-x)**2 + (biome.z-z)**2;
    if (d < distance) { distance = d; kind = biome.kind; }
  }
  return HABITATS[kind];
}

/** Site potential, separate from a field's fertility loss through repeated cropping. */
export function soilQuality(g: Game, x: number, z: number) {
  const h = g.height(x,z);
  const slope = Math.max(Math.abs(g.height(x+3,z)-h), Math.abs(g.height(x-3,z)-h),
    Math.abs(g.height(x,z+3)-h), Math.abs(g.height(x,z-3)-h));
  let distance = Infinity;
  for (const river of g.world.rivers || []) for (let i=1;i<river.pts.length;i++) {
    const a=river.pts[i-1], b=river.pts[i], dx=b.x-a.x, dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));
  }
  return Math.max(0.25,Math.min(1,0.35+habitatAt(g,x,z).crops*0.3 +
    Math.max(0,1-distance/40)*0.3 - slope*0.08));
}

/** Rain-fed cultivation remains possible; drought penalizes ground far from water. */
export function cropWater(g:Game,x:number,z:number) {
  if(g.state.weather!=="drought")return 1;
  let near=false;
  for(const r of g.world.rivers||[])for(const p of r.pts)if(Math.hypot(p.x-x,p.z-z)<24)near=true;
  return near?0.8:0.4;
}

/** Local weather drives real spoilage, not merely the calendar label. */
export function climateAt(g:Game,x:number,z:number,time=g.state.time,weather=g.state.weather) {
  const habitat=habitatAt(g,x,z),phase=(time%1800)/1800;
  let temperature=11+15*Math.sin((phase-.07)*Math.PI*2)-Math.max(0,g.height(x,z)-4)*.18;
  let humidity=habitat===HABITATS.forest?.76:habitat===HABITATS.hills?.47:.6;
  if(weather==="rain"||weather==="storm"||weather==="flood")humidity+=.2;
  if(weather==="mist")humidity+=.1;
  if(weather==="drought"){temperature+=5;humidity-=.28;}
  if(weather==="frost")temperature-=5;
  return {temperature,humidity:Math.max(.15,Math.min(1,humidity))};
}
