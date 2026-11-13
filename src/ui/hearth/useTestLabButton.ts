import {useCallback,useState} from 'react';
import {readTestLabButton,writeTestLabButton} from './testLabPrefs';
export function useTestLabButton(){
 const [show,setShow]=useState(()=>readTestLabButton());
 const set=useCallback((v:boolean)=>{setShow(v);writeTestLabButton(v);},[]);
 return [show,set] as const;
}
