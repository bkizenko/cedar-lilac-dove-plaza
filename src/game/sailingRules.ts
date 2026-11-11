/** Versioned gameplay coefficients, not historical wind speeds or rig measurements. */
export const SAILING_RULES={version:1,wood:8,cloth:8,cordage:4,workSeconds:120,mooringMeters:18,minimumRowedMeters:80,minimumDeliveredGoods:8,demonstrationNetMeters:20,forceScale:.85,headwindDrag:.3,minimumRaisedRowingFraction:.4,wearPerWaterMeter:.00002,maximumCounter:1e9,windPeriodSeconds:900}as const;
export type SailRig={version:1;raised:boolean;condition:number;fittedAt:number;trialOrigin?:{x:number;z:number};trialMaximumMeters?:number};
export type SailRigOrder={version:1;boatId:number;paid:{wood:number;cloth:number;cordage:number}};
export type SailingPractice={version:1;fitted:number;sailMeters:number;deliveredGoods:number;demonstratedAt?:number};
