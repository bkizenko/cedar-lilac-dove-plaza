import type {ReactNode} from 'react';
import {GameTooltip} from '../GameTooltip';

export const cx=(...a:(string|false|null|undefined)[])=>a.filter(Boolean).join(' ');

/** Round or square icon button, 44px minimum hit area; label is always available to assistive tech and hover. */
export function IconBtn({label,tip,onClick,active,children,className,disabled,small,badge}:{label:string;tip?:string;onClick:()=>void;active?:boolean;children:ReactNode;className?:string;disabled?:boolean;small?:boolean;badge?:ReactNode}){
 return <GameTooltip title={label} description={tip}><button type="button" className={cx('hw-btn',small&&'hw-btn-s',active&&'is-on',className)} aria-label={label} aria-pressed={active===undefined?undefined:active} disabled={disabled} onClick={onClick}>{children}{badge!==undefined&&badge!==null&&badge!==false&&<i className="hw-btn-badge">{badge}</i>}</button></GameTooltip>;
}
/** Icon + number pill. */
export function Stat({icon,value,label,tone,className}:{icon:ReactNode;value:ReactNode;label:string;tone?:'bad'|'good'|'warn';className?:string}){
 return <GameTooltip title={label}><span className={cx('hw-stat',tone&&'t-'+tone,className)} role="img" aria-label={`${label} ${typeof value==='string'||typeof value==='number'?value:''}`}>{icon}<b>{value}</b></span></GameTooltip>;
}

