/** Era materials with a stable local palette. These change presentation only:
 * building identity, footprint, storage, pathfinding and saved progress stay put. */
export function architectureStyle(seed:number,team:number,age:number,habitat:'plains'|'forest'|'hills'='plains'){
  const era=Math.max(0,Math.min(5,Math.floor(age)));
  const variant=(Math.abs(Math.imul(seed^team,2654435761))>>>0)%4;
  const roofs=[
    ['#e2bb70','#dba080','#b5c690','#dfbf88'],
    ['#d59a62','#c97b62','#8dab9b','#ddba77'],
    ['#865f46','#985f48','#73818a','#947b66'],
    ['#b97150','#a55f4c','#7b8b91','#c28863'],
    ['#706477','#86564a','#637e87','#85715d'],
    ['#987257','#b36a50','#78929d','#bd9870'],
  ];
  const walls=['#dfc599','#ead3ad','#aa9e86','#ddd3bc','#c5b594','#e2dbc8'];
  const trim=['#907354','#b49b75','#777e77','#cbc2ad','#64523c','#9b9c93'];
  // Local construction materials remain readable at RTS distance without textures.
  const localWalls={plains:walls,forest:['#c5aa80','#d1b58a','#a3947d','#c8b99b','#baa988','#d5c7aa'],hills:['#c9c1aa','#d7cbb5','#a9aaa0','#d1d1c3','#b7b5a3','#dcdad0']};
  return {roof:roofs[era][variant],timber:localWalls[habitat][era],roofHeight:[1,1.035,1.075,1.10,1.17,1.21][era],
    trim:trim[era],era,variant};
}

export function localArchitecture(seed:number,team:number,age:number,point:{x:number;z:number},
 halls:{id:number;x:number;z:number;team:number}[],biomes:{kind:'plains'|'forest'|'hills';x:number;z:number}[],cache?:Map<string,ReturnType<typeof architectureStyle>>){
 const own=halls.filter(h=>h.team===team);
 let home=own[0],nearest=Infinity;
 for(const h of own){const d=(h.x-point.x)**2+(h.z-point.z)**2;if(d<nearest){nearest=d;home=h;}}
 const center=home??point;
 let habitat:'plains'|'forest'|'hills'='plains',distance=Infinity;
 for(const b of biomes){const d=(b.x-center.x)**2+(b.z-center.z)**2;if(d<distance){distance=d;habitat=b.kind;}}
 // Preserve the founding village's palette; offshoot towns develop their own.
 const localSeed=home&&home!==own[0]?seed^Math.imul(home.id,0x45d9f3b):seed;
 const key=`${seed}/${team}/${age}/${own[0]?.id??0}/${home?.id??0}/${habitat}`;
 let style=cache?.get(key);if(!style){style=architectureStyle(localSeed,team,age,habitat);cache?.set(key,style);}
 return {key,style};
}
