import {CircleHelp} from 'lucide-react';
import {Screen} from './screens';
import {HelpBody,rememberHelp} from './help';
export function HelpScreen({onClose}:{onClose:()=>void}){
 return <Screen title="Help" icon={<CircleHelp size={32}/>} onClose={()=>{rememberHelp();onClose();}}><HelpBody/></Screen>;
}
