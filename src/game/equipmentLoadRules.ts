import {ARMOR_RULES} from './armorRules';
/** Tunable abstract item-volume units, not historical kilograms. */
export const EQUIPMENT_LOAD_RULES={armor:ARMOR_RULES.loadUnits,farmTool:4,weapons:{spears:3,bows:2,blades:2}} as const;
