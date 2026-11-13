// Top-down species map of the stand model on a real generated world.
//   node --import ./scripts/game-loader.mjs tools/forest-ecology/species-map.mjs <seed> <preset> <name> [outDir] [forestEcology=1]
// Paints the stand's dominant species per 1 m cell (pale) and every placed tree as a dot in its own species colour. Colour key: docs/FOREST_ECOLOGY.md.
import {generateWorld,sampleWorldHeight,waterSurfaceAt} from '../../src/game/worldgen.ts';
import {ecologicalConditionsAt} from '../../src/game/ecologicalProvinces.ts';
import {StandField,ALL_STAND_SPECIES} from '../../src/game/forestEcology.ts';
import {deflateSync} from 'node:zlib';import fs from 'node:fs';import path from 'node:path';
export const SPECIES_COLOURS={oak:[86,140,52],beech:[40,170,150],birch:[240,240,120],maple:[220,90,40],poplar:[170,210,60],willow:[60,200,255],hawthorn:[220,120,200],scotsPine:[150,100,40],stonePine:[190,150,70],spruce:[10,70,40],fir:[30,110,100],cedar:[110,60,20],cypress:[60,60,20],juniper:[110,130,170],krummholz:[150,150,200],coconutPalm:[255,60,120],datePalm:[255,150,40],acacia:[230,200,40],baobab:[160,40,40],mangrove:[20,140,90],tamarisk:[190,170,210],olive:[120,140,90],eucalyptus:[120,200,170],snag:[20,20,20]};
function png(w,h,rgb){const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
 const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
 const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
 const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const [seedS,preset,name,out='docs/renders/forest-ecology',eco='1',cxS,czS]=process.argv.slice(2);
const seed=Number(seedS),request={size:1040,preset,geologyVersion:1,...(eco==='1'?{forestEcologyVersion:1}:{})};
const world=generateWorld(seed,21,request),grid=world.ecology;
const height=(x,z)=>sampleWorldHeight(world,x,z),water=(x,z)=>world.waterY;
const site=(x,z)=>{const c=ecologicalConditionsAt(grid,x,z),g=Math.hypot((height(x+3,z)-height(x-3,z))/6,(height(x,z+3)-height(x,z-3))/6);
 return {kind:c.kind,moisture:c.moisture,temp:c.temperatureOffsetCelsius,slope:g,soil:Math.max(0,Math.min(1,c.soil)),aspect:0,waterDist:c.freshwaterDistanceMeters,alt:height(x,z)-water(x,z),acid:.5};};
const field=new StandField(seed,site),camp=cxS!==undefined?{x:Number(cxS),z:Number(czS)}:world.camps[0],R=160,S=2,W=R*2*S,rgb=Buffer.alloc(W*W*3);
const counts={};
for(let py=0;py<W;py++)for(let px=0;px<W;px++){const x=camp.x-R+px/S,z=camp.z-R+py/S,h=height(x,z);let col;
 if(h<water(x,z)+.2)col=[40,70,120];else{const st=field.at(x,z),c=SPECIES_COLOURS[st.primary]??[128,128,128];col=c.map(v=>Math.round(90+v*.35));}
 rgb[(py*W+px)*3]=col[0];rgb[(py*W+px)*3+1]=col[1];rgb[(py*W+px)*3+2]=col[2];}
let nTrees=0;const dot=(x,z,c,r)=>{const cx=Math.round((x-(camp.x-R))*S),cy=Math.round((z-(camp.z-R))*S);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const px=cx+dx,py=cy+dy;if(px<0||py<0||px>=W||py>=W)continue;rgb[(py*W+px)*3]=c[0];rgb[(py*W+px)*3+1]=c[1];rgb[(py*W+px)*3+2]=c[2];}};
for(const t of world.trees){if(Math.abs(t.x-camp.x)>R||Math.abs(t.z-camp.z)>R)continue;const p=eco==='1'?field.plan(t.id,t.x,t.z):null;
 const sp=p?p.species:'unassigned';counts[sp]=(counts[sp]||0)+1;nTrees++;dot(t.x,t.z,(SPECIES_COLOURS[sp]??[255,255,255]),2);}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name+'.png'),png(W,W,rgb));
const kinds={};for(let i=0;i<400;i++){const x=camp.x-R+(i%20)*16,z=camp.z-R+Math.floor(i/20)*16;const k=site(x,z).kind;kinds[k]=(kinds[k]||0)+1;}
console.log(JSON.stringify({name,seed,preset,camp:[Math.round(camp.x),Math.round(camp.z)],trees:nTrees,species:counts,provinces:kinds}));
