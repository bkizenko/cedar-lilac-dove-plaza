/** Practical examples preserve demonstrated work, never a writing or age unlock.
 * Legacy record/project identifiers remain stable; this catalog is the bounded
 * admission list for new sources. Ordinary production gates still apply. */
export const METHOD_RECORD_METHODS={
 twistCordage:{title:'Cordage',family:'fibre'},
 weaveBasket:{title:'Basket weaving',family:'fibre'},
 formClay:{title:'Clay forming',family:'pottery'},
 fireClay:{title:'Pottery firing',family:'pottery'},
 makeCharcoal:{title:'Charcoal making',family:'metallurgy'},
 smeltCopper:{title:'Copper smelting',family:'metallurgy'},
 spinWool:{title:'Wool spinning',family:'textiles'},
 weaveWool:{title:'Wool weaving',family:'textiles'},
 sewWoolCoat:{title:'Wool coat sewing',family:'textiles'},
 weaveCloth:{title:'Cloth weaving',family:'textiles'},
} as const;
export type MethodRecipe=keyof typeof METHOD_RECORD_METHODS;
export function isMethodRecipe(value:unknown):value is MethodRecipe{return typeof value==='string'&&Object.hasOwn(METHOD_RECORD_METHODS,value);}
export const methodRecordTitle=(recipe:MethodRecipe)=>METHOD_RECORD_METHODS[recipe].title;
export const METHOD_RECORD_RULES={version:1,maximumRecords:64,maximumStudies:16,maximumAcquisitions:8,qualifiedBatches:3,clay:1,wood:1,authorSeconds:60,studySeconds:45,studyWood:1,loadUnits:1,recipe:'twistCordage'} as const;
