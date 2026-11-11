import {generateWorld,sampleWorldHeight} from '../../src/game/worldgen.ts';
import {waterSurfaceAt} from '../../src/game/localWater.ts';

const cases = [
  {seed:7,size:1040,layout:'archipelago'},
  {seed:42,size:1560,layout:'continents'},
  {seed:1,size:1040,layout:'pangaea'},
];
const spacing = 2;
const lateralStep = .25;
const depthThreshold = .05;
const metres = value => Number(value.toFixed(3));

function measureRiver(world,river) {
  let sections=0, dryCenters=0, longestDryRun=0, dryRun=0;
  let lateralDeviation=0, widthError=0, widthJumps=0, previousWidth;
  for (let i=1;i<river.pts.length;i++) {
    const a=river.pts[i-1], b=river.pts[i];
    const dx=b.x-a.x, dz=b.z-a.z, distance=Math.hypot(dx,dz);
    if (!distance) continue;
    const rows=Math.ceil(distance/spacing);
    const nx=-dz/distance,nz=dx/distance;
    for (let row=0;row<rows;row++) {
      const t=(row+.5)/rows;
      const x=a.x+dx*t,z=a.z+dz*t;
      const designedWidth=(a.w??river.width)*(1-t)+(b.w??river.width)*t;
      const radius=designedWidth/2;
      if (Math.max(Math.abs(x),Math.abs(z))+radius+4>=world.size/2) continue;
      const wet=offset=>{
        const px=x+nx*offset,pz=z+nz*offset;
        return waterSurfaceAt(world,px,pz)-sampleWorldHeight(world,px,pz)>depthThreshold;
      };
      sections++;
      if (!wet(0)) {
        dryCenters++;
        dryRun+=distance/rows;
        longestDryRun=Math.max(longestDryRun,dryRun);
        previousWidth=undefined;
        continue;
      }
      dryRun=0;
      const limit=radius+4;
      const edge=direction=>{
        let offset=0;
        for (;offset+lateralStep<=limit;offset+=lateralStep) {
          if (!wet((offset+lateralStep)*direction)) break;
        }
        return offset;
      };
      const left=edge(-1),right=edge(1),width=left+right;
      widthError+=Math.abs(width-designedWidth);
      lateralDeviation+=Math.abs(left-right)/2;
      if (previousWidth!==undefined&&Math.abs(width-previousWidth)>=2) widthJumps++;
      previousWidth=width;
    }
  }
  const wetSections=sections-dryCenters;
  return {
    id:river.id,sections,dryCenters,longestDryRunMetres:metres(longestDryRun),
    meanWidthErrorMetres:metres(widthError/Math.max(1,wetSections)),
    meanBankAsymmetryMetres:metres(lateralDeviation/Math.max(1,wetSections)),
    widthJumpsAtLeastTwoMetres:widthJumps,
  };
}

for (const {seed,size,layout} of cases) {
  for (const version of [18,19]) {
    const world=generateWorld(seed,version,{size,layout});
    const rivers=world.waterBodies.filter(body=>body.kind==='river').map(body=>measureRiver(world,body));
    console.log(JSON.stringify({seed,size,layout,version,terrainSeed:world.generation.terrainSeed,
      bankTiles:world.bankTerrain?.metrics.tileCount??0,rivers}));
  }
}
