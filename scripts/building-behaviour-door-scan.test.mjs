import test from 'node:test';import assert from 'node:assert/strict';
import {carvedBuildingSpec,CARVED_TYPES} from '../src/scene/buildingStyleMap.ts';
import {DOOR_HEIGHT_M,EAVE_MIN_M,HATCH_MAX_M} from '../src/scene/personScale.ts';
import {BUILDINGS} from '../src/game/constants.ts';
// Walk-in openings: 'recess' boxes from door()/doorway(), plus slot-built civ doors ('accent' boxes at floor level, door-sized).
const isOpening=p=>p.shape==='box'&&p.size[1]>=HATCH_MAX_M-1e-9&&p.pos[1]<=.15&&p.size[0]>=.6&&(p.mat==='recess'||(p.mat==='accent'&&p.size[2]<=.1&&p.size[0]<=2));
test('every building type: walk-in doors are at least 2.05 m and walls at least 2.2 m wherever a door exists',()=>{
 let doors=0,types=new Set();const bad=[];
 for(const type of CARVED_TYPES){if(!BUILDINGS[type])continue;
  for(const era of [0,1,3,5])for(const habitat of ['plains','desert','tundra'])for(const prosperity of [.1,.5,.9])for(const id of [1,2,3,4,5]){
   const b=BUILDINGS[type],spec=carvedBuildingSpec({worldSeed:7,type,id,era,habitat,prosperity,footprint:{w:b.w,d:b.d}});if(!spec)continue;
   const ops=spec.parts.filter(isOpening);
   for(const o of ops){doors++;types.add(type);if(o.size[1]<DOOR_HEIGHT_M-1e-6)bad.push(`${type} era${era} ${habitat} id${id}: door ${o.size[1].toFixed(2)}`);}
   if(ops.length){const wall=Math.max(...spec.parts.filter(p=>(p.shape==='box'||p.shape==='cylinder')&&Math.min(p.size[0],p.size[2])>=1.2&&p.size[1]>=.9&&p.mat!=='recess'&&p.mat!=='accent'&&!/roof|thatch|tile|shingle|slate|straw/.test(p.mat)).map(p=>p.pos[1]+p.size[1]),0);
    if(wall>0&&wall<EAVE_MIN_M-1e-6)bad.push(`${type} era${era} ${habitat} id${id}: wall ${wall.toFixed(2)}`);}
  }}
 assert.ok(doors>50,'scanned '+doors);
 const uniq=[...new Set(bad.map(s=>s.split(' ')[0]+' '+s.split(': ')[1].split(' ')[0]))];
 assert.deepEqual(uniq,[],`${bad.length} violations, e.g. ${bad.slice(0,8).join(' | ')}`);
});
