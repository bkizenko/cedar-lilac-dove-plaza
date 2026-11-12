/** Existing simulation calendar; visual daylight deliberately has its own pace. */
export const SIM_CALENDAR_RULES={yearSeconds:1800,daysPerYear:32} as const;
export const simulationDaySeconds=SIM_CALENDAR_RULES.yearSeconds/SIM_CALENDAR_RULES.daysPerYear;
