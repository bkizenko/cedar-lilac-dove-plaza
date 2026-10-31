export const GATE_FACINGS=['north','east','south','west'] as const;
export type GateFacing=typeof GATE_FACINGS[number];
export const GATE_GEOMETRY_RULES={defaultFacing:'north' as GateFacing,cellMeters:4,placementGridMeters:2,snapRadiusMeters:3,joinToleranceMeters:.12} as const;
export type GateWall={id:number;type:string;team:number;hp:number;x:number;z:number;w:number;d:number;gateFacing?:GateFacing};
export function validGateFacing(value:unknown):value is GateFacing{return typeof value==='string'&&GATE_FACINGS.some(f=>f===value);}
export function gateFacing(value:unknown):GateFacing{return validGateFacing(value)?value:GATE_GEOMETRY_RULES.defaultFacing;}
export function rotateGateFacing(facing:GateFacing,quarterTurns=1):GateFacing{return GATE_FACINGS[((GATE_FACINGS.indexOf(gateFacing(facing))+quarterTurns)%4+4)%4];}
/** Legacy local passage is on Z. Positive X is east, positive Z is south. */
export function gateOrientation(value:unknown){const facing=gateFacing(value),vectors={north:{x:0,z:-1,yaw:0},east:{x:1,z:0,yaw:-Math.PI/2},south:{x:0,z:1,yaw:Math.PI},west:{x:-1,z:0,yaw:Math.PI/2}};return{facing,passage:vectors[facing],wallAxis:(facing==='north'||facing==='south'?'x':'z') as 'x'|'z',yawRadians:vectors[facing].yaw};}
export function gateJoinPorts(gate:Pick<GateWall,'x'|'z'|'w'|'d'|'gateFacing'>){const axis=gateOrientation(gate.gateFacing).wallAxis,half=(axis==='x'?gate.w:gate.d)/2;return[-1,1].map(sign=>({x:gate.x+(axis==='x'?sign*half:0),z:gate.z+(axis==='z'?sign*half:0),side:sign as -1|1}));}
function wall(b:GateWall,team:number){return b.hp>0&&b.team===team&&(b.type==='palisade'||b.type==='stonewall');}
function matches(a:number,b:number){return Math.abs(a-b)<=GATE_GEOMETRY_RULES.joinToleranceMeters;}
export function gateJoinedWalls(buildings:readonly GateWall[],point:{x:number;z:number},facing:GateFacing,team=0){const axis=gateOrientation(facing).wallAxis,ids:number[]=[];for(const b of buildings){if(!wall(b,team))continue;const stride=(GATE_GEOMETRY_RULES.cellMeters+(axis==='x'?b.w:b.d))/2;if(axis==='x'?matches(b.z,point.z)&&matches(Math.abs(b.x-point.x),stride):matches(b.x,point.x)&&matches(Math.abs(b.z-point.z),stride))ids.push(b.id);}return ids;}
/** Snap into real endpoint/gap cells only. No wall deletion, refund or connector. */
export function snapGate(buildings:readonly GateWall[],point:{x:number;z:number},value:unknown,team=0){
 if(![point.x,point.z].every(Number.isFinite))return null;
 const orientation=gateOrientation(value),facing=orientation.facing,axis=orientation.wallAxis,grid=GATE_GEOMETRY_RULES.placementGridMeters,raw={x:Math.round(point.x/grid)*grid,z:Math.round(point.z/grid)*grid};let best={...raw,facing,yawRadians:orientation.yawRadians,snapped:false,joinedWallIds:gateJoinedWalls(buildings,raw,facing,team)},score=-Infinity;
 for(const b of buildings)if(wall(b,team))for(const sign of[-1,1]){const stride=(GATE_GEOMETRY_RULES.cellMeters+(axis==='x'?b.w:b.d))/2,p={x:b.x+(axis==='x'?stride*sign:0),z:b.z+(axis==='z'?stride*sign:0)},distance=Math.hypot(p.x-point.x,p.z-point.z);if(distance>GATE_GEOMETRY_RULES.snapRadiusMeters)continue;
  if(buildings.some(other=>other.hp>0&&matches(other.x,p.x)&&matches(other.z,p.z)))continue;
  const joinedWallIds=gateJoinedWalls(buildings,p,facing,team),value=joinedWallIds.length*10-distance;if(value>score){score=value;best={...p,facing,yawRadians:orientation.yawRadians,snapped:true,joinedWallIds};}
 }
 return best;
}
/** First wall section beyond an existing gate port, using real gate orientation. */
export function snapWallToGate(buildings:readonly GateWall[],point:{x:number;z:number},team=0){let best:{x:number;z:number;gateId:number}|null=null,distance:number=GATE_GEOMETRY_RULES.snapRadiusMeters;
 for(const gate of buildings)if(gate.type==='gate'&&gate.hp>0&&gate.team===team){const axis=gateOrientation(gate.gateFacing).wallAxis;for(const port of gateJoinPorts(gate)){const p={x:port.x+(axis==='x'?port.side*GATE_GEOMETRY_RULES.cellMeters/2:0),z:port.z+(axis==='z'?port.side*GATE_GEOMETRY_RULES.cellMeters/2:0)},d=Math.hypot(p.x-point.x,p.z-point.z);if(d<=distance){distance=d;best={...p,gateId:gate.id};}}}return best;
}

/** Optional initial orientation suggestion. Explicit player facing remains final. */
export function suggestGateSnap(buildings:readonly GateWall[],point:{x:number;z:number},preferred:GateFacing='north',team=0){
 let best=snapGate(buildings,point,preferred,team);for(let i=1;i<4;i++){const candidate=snapGate(buildings,point,rotateGateFacing(preferred,i),team);if(candidate&&candidate.joinedWallIds.length>(best?.joinedWallIds.length??-1))best=candidate;}return best;
}
/** Existing construction validates/pays/builds. Capture direction on the new
 * project immediately, including an unfunded plan; never rotate older gates. */
export function placeFacingGate(g:import('./sim').Game,point:{x:number;z:number},value:unknown,team=0){
 const facing=gateFacing(value);if(!g.placementValid('gate',point.x,point.z,team)){if(team===0)g.banner(g.placementIssue('gate',point.x,point.z,team)||'Choose a clear gate opening',2);return null;}
 const before=g.state.nextId;if(!g.placeBuilding('gate',point.x,point.z,team))return null;
 const project=g.state.buildings.find(b=>b.id>=before&&b.type==='gate'&&b.team===team);if(!project)return null;(project as typeof project&{gateFacing:GateFacing}).gateFacing=facing;return project;
}
