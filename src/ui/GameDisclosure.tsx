import {useState,type ReactNode} from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';
/** Lazy detail panels: closed controls perform no route searches or work. */
export function GameDisclosure({label,children,defaultOpen=false}:{label:string;children:ReactNode;defaultOpen?:boolean}){const[open,setOpen]=useState(defaultOpen);return<section className="game-disclosure"><button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<span>{label}</span></button>{open&&<div className="game-disclosure-content">{children}</div>}</section>;}
