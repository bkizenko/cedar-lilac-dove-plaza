import type {GameState} from './types';
import type {MethodRecord} from './methodRecords';
import {METHOD_RECORD_RULES as R} from './methodRecordRules';

/** A custody receipt, never a knowledge grant or a location report. */
export type MethodRecordAcquisition={kind:'captured'|'recovered'|'inherited';fromTeam:number;toTeam:number;at:number;by?:number;handoverId?:number;returnedAt?:number};
export function appendMethodRecordAcquisition(record:MethodRecord,receipt:MethodRecordAcquisition){
 if(receipt.fromTeam===receipt.toTeam)return;
 record.acquisitions??=[];record.acquisitions.push(receipt);
 if(record.acquisitions.length>R.maximumAcquisitions)record.acquisitions.splice(0,record.acquisitions.length-R.maximumAcquisitions);
}
export function markMethodRecordReturned(record:MethodRecord,team:number,time:number){
 const receipt=record.acquisitions?.at(-1);
 if(receipt?.toTeam===team&&receipt.returnedAt===undefined)receipt.returnedAt=time;
}
export function validMethodRecordAcquisitions(state:GameState,record:MethodRecord){
 if(record.acquisitions===undefined)return true;
 if(!Array.isArray(record.acquisitions)||record.acquisitions.length>R.maximumAcquisitions)return false;
 const team=(v:unknown)=>Number.isSafeInteger(v)&&state.tribes.some(t=>t.id===v),id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<state.nextId;
 const time=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=record.authoredAt&&v<=state.time;
 let previous=record.authoredAt,previousReturn:number|undefined,previousTeam:number|undefined;
 for(const receipt of record.acquisitions){
  if(!receipt||!['captured','recovered','inherited'].includes(receipt.kind)||!team(receipt.fromTeam)||!team(receipt.toTeam)||receipt.fromTeam===receipt.toTeam||!time(receipt.at)||receipt.at<previous||previousReturn!==undefined&&receipt.at<previousReturn||previousTeam!==undefined&&receipt.fromTeam!==previousTeam||receipt.by!==undefined&&!id(receipt.by))return false;
  if(receipt.returnedAt!==undefined&&(!time(receipt.returnedAt)||receipt.returnedAt<receipt.at))return false;
  if(receipt.handoverId!==undefined){
   if(receipt.kind!=='inherited'||!id(receipt.handoverId))return false;
   const history=state.communityHandovers||[],handover=history.find(h=>h.id===receipt.handoverId);
   if(handover?(handover.fromTeam!==receipt.fromTeam||handover.toTeam!==receipt.toTeam||handover.timeSeconds!==receipt.at):(!history.length||receipt.at>=history[0].timeSeconds))return false;
  }
  previous=receipt.at;previousReturn=receipt.returnedAt;previousTeam=receipt.toTeam;
 }
 return previousTeam===undefined||previousTeam===record.team;
}
