import type{FoodKind}from'./types';
import type{ItemStock}from'./production';
/** A change of current custody, never a new harvest, discovery or production event. */
export type HandoverStocks={food:number;foodLots:Partial<Record<FoodKind,number>>;wood:number;stone:number;copper:number;iron:number;spears:number;bows:number;blades:number;seeds:number;waterLiters:number;items:ItemStock};
export type HandoverAnchor={kind:'camp'|'building';id?:number;x:number;y:number;z:number};
export type CommunityHandover={version:1;id:number;fromTeam:number;toTeam:number;timeSeconds:number;scope:'society'|'community';knowledge?:import('./inheritedKnowledge').CommunityKnowledgeSnapshot;cacheAnchor?:HandoverAnchor;recipientCacheAnchor?:HandoverAnchor;hallIds:number[];residentIds:number[];siteIds:number[];boatIds:number[];productionIds:number[];haulageProjectIds:number[];livestockIds:number[];coastalVoyageIds:number[];societyMissionIds:number[];coastalCommissionIds:number[];stocks?:HandoverStocks};
export type HandoverProvenance={originTeam?:number;handoverId?:number};

export type InheritedCropTrial={sourceTeam:number;handoverId:number;trial:{kind:import("./types").CropKind;progress:number;duration:number};actorIds:number[];anchor:HandoverAnchor};
