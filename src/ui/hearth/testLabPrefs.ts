/** "Show Test lab on main screen": remembered per browser, default on, never required (storage can throw). */
export const TESTLAB_BUTTON_KEY='hearthwild.ui.testLabButton';
export function readTestLabButton(storage?:Pick<Storage,'getItem'>|null):boolean{
 try{const s=storage===undefined?(typeof localStorage==='undefined'?null:localStorage):storage;return s?.getItem(TESTLAB_BUTTON_KEY)!=='0';}catch{return true;}
}
export function writeTestLabButton(value:boolean,storage?:Pick<Storage,'setItem'>|null){
 try{const s=storage===undefined?(typeof localStorage==='undefined'?null:localStorage):storage;s?.setItem(TESTLAB_BUTTON_KEY,value?'1':'0');}catch{/* private window or blocked storage: keep working */}
}
