import type {ReactNode} from 'react';
import {Compass,Users,Hammer,Clock,Flag,Keyboard,Sparkles} from 'lucide-react';
/** One-time Help: the keys the old tip banners used to scroll past, grouped by what you are doing. Reachable any time from Menu. */
export const HELP_SEEN_KEY='hearthwild.ui.helpSeen';
export const helpSeen=():boolean=>{try{return globalThis.localStorage?.getItem(HELP_SEEN_KEY)==='1';}catch{return true;}};
export const rememberHelp=()=>{try{globalThis.localStorage?.setItem(HELP_SEEN_KEY,'1');}catch{/* convenience only */}};
type Row={keys:string[];does:string};
export const HELP_GROUPS:{id:string;title:string;icon:ReactNode;rows:Row[]}[]=[
 {id:'start',title:'First steps',icon:<Sparkles size={30}/>,rows:[
  {keys:['C'],does:'Pick a gatherer'},{keys:[']'],does:'Find resources'},{keys:['R'],does:'Give an order'},{keys:['1'],does:'Plan a hut'},{keys:['Enter'],does:'Place it'}]},
 {id:'view',title:'Look around',icon:<Compass size={30}/>,rows:[
  {keys:['W','A','S','D'],does:'Pan'},{keys:['Q','E'],does:'Rotate'},{keys:['PgUp','PgDn'],does:'Zoom'},{keys:['F'],does:'Home'},{keys:['K'],does:'Centre on target'}]},
 {id:'people',title:'People and orders',icon:<Users size={30}/>,rows:[
  {keys:['C','Shift+C'],does:'Next, previous person'},{keys:['J'],does:'Workers'},{keys:['V'],does:'Army'},{keys:['I'],does:'Idle worker'},
  {keys:['R'],does:'Contextual order'},{keys:['Z'],does:'Attack-move'},{keys:['.'],does:'Stop'},{keys:[';'],does:'Hold'},{keys:['Ctrl+1-9'],does:'Store group'},{keys:['Alt+1-9'],does:'Recall group'}]},
 {id:'build',title:'Build and gather',icon:<Hammer size={30}/>,rows:[
  {keys:['1-8'],does:'Quick build'},{keys:['Enter'],does:'Select or place'},{keys:['Shift+Enter'],does:'Add to selection'},{keys:['N'],does:'Mark trees'},{keys:['G'],does:'Drill an adult'},{keys:['X'],does:'Explore'}]},
 {id:'time',title:'Time and menus',icon:<Clock size={30}/>,rows:[
  {keys:['P','Space'],does:'Pause'},{keys:['-','+'],does:'Speed'},{keys:['L'],does:'Village ledger'},{keys:['Tab'],does:'Every menu'},{keys:['Esc'],does:'Cancel'},{keys:['M'],does:'Mute'}]},
 {id:'map',title:'Map layers',icon:<Flag size={30}/>,rows:[
  {keys:['Map'],does:'Territory, influence, resources, water: buttons under the map'}]},
];
export function HelpBody(){
 return <div className="hw-help">
  <p className="hw-help-note"><Keyboard size={26}/>Hover any icon for its name. These keys work with the world focused.</p>
  <div className="hw-grid-2">{HELP_GROUPS.map(g=><section key={g.id} className="hw-card hw-help-card" aria-label={g.title}>
   <h3>{g.icon}{g.title}</h3>
   <dl>{g.rows.map((r,i)=><div key={i}><dt>{r.keys.map(k=><kbd key={k}>{k}</kbd>)}</dt><dd>{r.does}</dd></div>)}</dl>
  </section>)}</div>
 </div>;
}
