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
