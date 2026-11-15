import {useState} from 'react';
import {Handshake,Swords,Scroll,Crown,Package} from 'lucide-react';
import {cx} from './kit';

export type WarCommand=
 |{kind:'accept-conquest';frontId:number;choice:'annex'|'puppet'|'pillage';people:'integrate'|'execute'|'spare'}
 |{kind:'refuse-capitulation';frontId:number}
 |{kind:'propose-peace';team:number}|{kind:'accept-peace';team:number}|{kind:'decline-peace';team:number};
export type PeaceInfo={canOffer:boolean;sent:boolean;incoming?:{term:string;label:string;expiresIn:number}};
export type ConquestInfo={frontId:number;offer:boolean;ratio:number;needRatio:number;willLeft:number;reason:string;expiresIn:number;factors:{armedPresent:number;armedDefending:number;fallen:number;buildingsLost:number;starving:boolean;unrelieved:boolean}};
const PEOPLE=[['integrate','Integrate everyone'],['execute','Kill warriors, keep the rest'],['spare','Spare all (they may rebel)']] as const;

/** Peace: incoming offers get Accept/Decline; a known enemy always has 'Offer peace'. */
export function PeaceActions({team,peace,send}:{team:number;peace?:PeaceInfo;send:(c:WarCommand)=>void}){
 if(!peace)return null;
 return <div className="hw-row" data-peace="1">
  {peace.incoming&&<><span className="hw-chip t-good"><Handshake size={16}/>They offer: {peace.incoming.label} · {peace.incoming.expiresIn}s</span>
   <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'accept-peace',team})}><Handshake size={18}/>Accept</button>
   <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'decline-peace',team})}>Decline</button></>}
  <button type="button" className="hw-btn-wide" disabled={!peace.canOffer} title={peace.sent?'A messenger is already on the way':'Send a messenger offering peace'} onClick={()=>send({kind:'propose-peace',team})}><Handshake size={18}/>{peace.sent?'Messenger sent':'Offer peace'}</button>
 </div>;
}
/** Surrender: while their will holds it shows how the fight is going; once they yield, Annex / Puppet / Pillage and what happens to the people. */
export function ConquestActions({c,send,compact}:{c?:ConquestInfo;send:(x:WarCommand)=>void;compact?:boolean}){
 const [people,setPeople]=useState<'integrate'|'execute'|'spare'>('integrate');
 if(!c)return null;
 const f=c.factors;
 if(!c.offer)return <div className="hw-conquest" data-conquest="pressing">
  <div className="hw-meter-row"><span className="hw-lbl">Their will</span><span className="hw-meter"><i className="t-bad" style={{width:c.willLeft+'%'}}/></span><b>{c.willLeft}%</b></div>
  {!compact&&<p className="hw-sub">{c.reason}. Strength {c.ratio}× theirs (need {c.needRatio}×){f.starving?' · they are starving':''}{f.unrelieved?' · no relief coming':''}.</p>}
 </div>;
 return <div className="hw-conquest" data-conquest="offer">
  <p className="hw-sub"><Scroll size={16}/> They offer to surrender ({c.expiresIn}s). Keep your force here.</p>
  <label className="hw-sub">People <select value={people} onChange={e=>setPeople(e.target.value as typeof people)}>{PEOPLE.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label>
  <div className="hw-row">
   <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'accept-conquest',frontId:c.frontId,choice:'annex',people})}><Crown size={18}/>Annex</button>
   <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'accept-conquest',frontId:c.frontId,choice:'puppet',people})}><Scroll size={18}/>Puppet</button>
   <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'accept-conquest',frontId:c.frontId,choice:'pillage',people})}><Package size={18}/>Pillage</button>
   <button type="button" className={cx('hw-btn-wide')} onClick={()=>send({kind:'refuse-capitulation',frontId:c.frontId})}><Swords size={18}/>Decline</button>
  </div>
 </div>;
}
