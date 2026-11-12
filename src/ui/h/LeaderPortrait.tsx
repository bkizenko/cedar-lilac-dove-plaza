import './theme.css';
import {portraitView,type PortraitInput} from './portraitModel';
/** G4: on-screen portrait for a leader encounter (presentation only). Place
 * beside LeaderConversation; dialog content stays with Societies. Flat carved
 * SVG bust on an inlay backdrop — no glossy card styling. */
export function LeaderPortrait(props:PortraitInput){
 const v=portraitView(props);
 const hair=v.hairStyle==='cropped'?<path d="M30 40c0-14 10-22 20-22s20 8 20 22c-4-6-10-9-20-9s-16 3-20 9z" fill={v.hair}/>
  :v.hairStyle==='braided'?<g fill={v.hair}><path d="M28 44c0-16 10-26 22-26s22 10 22 26c-5-7-12-10-22-10s-17 3-22 10z"/><rect x="26" y="44" width="6" height="30" rx="3"/><rect x="68" y="44" width="6" height="30" rx="3"/></g>
  :v.hairStyle==='bound'?<g fill={v.hair}><path d="M29 42c0-15 10-24 21-24s21 9 21 24c-5-6-11-9-21-9s-16 3-21 9z"/><circle cx="50" cy="16" r="7"/></g>
  :<path d="M26 60c-2-26 8-42 24-42s26 16 24 42c-4-10-8-24-24-24S30 50 26 60z" fill={v.hair}/>;
 const head=v.headwear==='fur hood'?<path d="M22 58c-2-30 10-46 28-46s30 16 28 46c-6-14-14-26-28-26S28 44 22 58z" fill="#b98a5c" stroke="#6a4219"/>
  :v.headwear==='band'?<rect x="30" y="32" width="40" height="5" fill={v.trim}/>
  :v.headwear==='woven cap'?<path d="M30 34c2-12 10-17 20-17s18 5 20 17z" fill={v.trim} stroke="#6a4219"/>
  :v.headwear==='bronze circlet'?<rect x="30" y="31" width="40" height="4" fill="#c8884d" stroke="#6a4219"/>:null;
 return <figure data-hw-theme="h" className="h-tip" style={{maxWidth:220}} aria-label={`${v.name} of ${v.society}`}>
  <svg viewBox="0 0 100 100" width="180" height="180" role="img" aria-label={`Portrait of ${v.name}, wearing a ${v.garment}${v.headwear!=='none'?` and ${v.headwear}`:''}`}>
   <rect width="100" height="100" fill={v.backdrop}/>
   <path d="M14 100c2-20 16-30 36-30s34 10 36 30z" fill={v.garmentColor} stroke="#6a4219"/>
   <path d="M38 72l12 10 12-10" fill="none" stroke={v.trim} strokeWidth="3"/>
   <rect x="43" y="56" width="14" height="16" fill={v.skin}/>
   {v.hairStyle==='loose'&&hair}
   <ellipse cx="50" cy="44" rx="17" ry="20" fill={v.skin} stroke="#6a4219" strokeWidth=".8"/>
   {v.hairStyle!=='loose'&&hair}{head}
   <circle cx="43" cy="44" r="1.6" fill="#2e1c0b"/><circle cx="57" cy="44" r="1.6" fill="#2e1c0b"/>
   <path d={v.stance==='friendly'?'M44 54q6 4 12 0':v.stance==='hostile'?'M44 56q6-4 12 0':'M44 55h12'} stroke="#4a2e12" strokeWidth="1.4" fill="none"/>
  </svg>
  <figcaption><strong>{v.name}</strong> · {v.society}<br/><span>{v.stanceText}</span><br/><span className="h-remedy">{v.goodsText}</span></figcaption>
 </figure>;
}
