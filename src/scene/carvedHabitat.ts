import type {Habitat} from './buildingStyleMap';
import type {ProvinceKind} from '../game/ecologicalProvinces';
/** Option H: which local-material habitat a village sits in, from the ecological province under it (pure, read-only). */
const MAP:Record<ProvinceKind,Habitat>={meadow:'plains','mixed-woodland':'forest','conifer-forest':'forest',alpine:'hills',wetland:'wetland','dry-scrub':'plains',arid:'desert','warm-coast':'plains'};
export function habitatForProvince(kind:ProvinceKind|undefined):Habitat|undefined{return kind?MAP[kind]:undefined;}
/** Legacy worlds (no ecology grid) have plains/forest/hills only; undefined keeps the old plains default. */
export function habitatForBaseKind(kind:string|undefined):Habitat|undefined{return kind==='forest'||kind==='hills'?kind:undefined;}
