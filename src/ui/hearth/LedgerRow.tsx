import type {ReactNode} from 'react';
/** A ledger row: plain verb, one line of what it means, thin rule above. No fat buttons. */
export function LedgerRow({icon,label,line,onClick,blocked,reason,expanded,say,children}:{icon:ReactNode;label:string;line?:string;onClick:()=>void;blocked?:boolean;reason?:string|null;expanded?:boolean;say?:boolean;children?:ReactNode}){
 return <li className="fc-item"><button type="button" className={say?"fc-row fc-say":"fc-row"} aria-disabled={blocked||undefined} aria-expanded={expanded} title={reason||line||label} onClick={onClick}>
  <span className="fc-ico" aria-hidden="true">{icon}</span><span className="fc-txt"><b>{label}</b>{line&&<span>{line}</span>}</span>{children}
 </button></li>;
}
