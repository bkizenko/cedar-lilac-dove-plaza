import {useEffect,useState} from 'react';
import type {Engine} from '../../game/engine';
/** The local play server reports which release it serves. When that changes while the game is open,
 *  offer a one-tap reload that saves the village first. Silent on hosts without the health endpoint. */
async function currentRelease():Promise<string|null>{
 try{const r=await fetch('/__hearthwild_health',{cache:'no-store'});if(!r.ok)return null;const j=await r.json();return j&&j.service==='hearthwild-play'&&typeof j.release==='string'?j.release:null;}catch{return null;}
}
export function UpdateReady({engine}:{engine:Engine}){
 const [base,setBase]=useState<string|null>(null),[latest,setLatest]=useState<string|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;currentRelease().then(r=>{if(live)setBase(r);});return()=>{live=false;};},[]);
 useEffect(()=>{if(!base)return;const t=setInterval(()=>{currentRelease().then(r=>{if(r)setLatest(r);});},20000);return()=>clearInterval(t);},[base]);
 if(!base||!latest||latest===base)return null;
 return <button type="button" className="hw-btn-wide" style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:60}} disabled={busy} onClick={async()=>{setBusy(true);try{await engine.saveNow();}catch{/* the autosave copy still exists */}location.reload();}}>{busy?'Saving…':'New version ready · Save and reload'}</button>;
}
