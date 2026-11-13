import {portraitSpec,type PortraitSpec} from './contactPortraitModel';
/** Etched bust of the person you are meeting. Thin dark line, hatched and tonal shading, paint and ornaments from the genome.
 *  Light falls from the upper left. No flat cartoon fills: every mass carries a shade and a hatch. Presentation only. */
const INK='#120c08';
const mix=(a:string,b:string,t:number)=>{const p=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((c,i)=>Math.round(c+(y[i]-c)*t).toString(16).padStart(2,'0')).join('');};
const flip=(x:number)=>160-x;
function Strands({id,d,fill,angle=80,dark=.5}:{id:string;d:string;fill:string;angle?:number;dark?:number}){
 return <g><path d={d} fill={fill}/><path d={d} fill={`url(#${id}s${angle})`} opacity={dark}/><path d={d} fill="none" stroke={mix(fill,'#000000',.7)} strokeWidth=".9" strokeLinejoin="round"/></g>;
}
function HairBack({s,id}:{s:PortraitSpec;id:string}){
 const c=s.hairColour;
 if(s.hair==='long'||s.hair==='locks'||s.hair==='braids'||s.hair==='sideplait')return <g><Strands id={id} fill={c} d="M52 70C42 96 40 140 46 186L66 186L62 110Z"/><Strands id={id} fill={c} d="M108 70C118 96 120 140 114 186L94 186L98 110Z"/>{s.hair==='braids'&&[48,58,102,112].map(x=><path key={x} d={`M${x} 120V186`} stroke={mix(c,'#000000',.6)} strokeWidth="2.4" strokeDasharray="3 2.4"/>)}</g>;
 if(s.hair==='bob')return <g><Strands id={id} fill={c} d="M52 66C46 90 46 114 52 128L66 128L62 90Z"/><Strands id={id} fill={c} d="M108 66C114 90 114 114 108 128L94 128L98 90Z"/></g>;
 return null;
}
function HairFront({s,id}:{s:PortraitSpec;id:string}){
 const c=s.hairColour;
 switch(s.hair){
  case 'shaved':return <path d="M52 64C54 44 66 38 80 38S106 44 108 64C100 52 92 50 80 50S60 52 52 64Z" fill={c} opacity=".32"/>;
  case 'crop':return <Strands id={id} fill={c} d="M51 72C48 46 62 34 80 34S112 46 109 72C104 58 98 52 80 52S56 58 51 72Z"/>;
  case 'topknot':return <g><Strands id={id} fill={c} d="M51 72C48 46 62 36 80 36S112 46 109 72C104 58 98 52 80 52S56 58 51 72Z"/><ellipse cx="80" cy="28" rx="9" ry="10" fill={c} stroke={mix(c,'#000000',.7)} strokeWidth=".9"/></g>;
  case 'bun':return <g><Strands id={id} fill={c} d="M51 72C48 46 62 36 80 36S112 46 109 72C104 58 98 52 80 52S56 58 51 72Z"/><ellipse cx="80" cy="34" rx="11" ry="9" fill={c} stroke={mix(c,'#000000',.7)} strokeWidth=".9"/></g>;
  case 'crest':return <Strands id={id} fill={c} d="M72 26H88L92 62H68Z"/>;
  case 'curls':return <g>{[[56,56],[64,44],[76,38],[90,38],[102,46],[108,60],[52,70],[110,74]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="9" fill={c} stroke={mix(c,'#000000',.7)} strokeWidth=".8"/>)}</g>;
  case 'wrapped':return <Strands id={id} fill={c} d="M50 74C46 46 62 30 80 30S114 46 110 74C100 62 92 58 80 58S60 62 50 74Z"/>;
  default:return <Strands id={id} fill={c} d="M49 90C44 54 58 34 80 34S116 54 111 90C108 70 100 56 80 54S52 70 49 90Z"/>;
 }
}
function Headwear({s,id}:{s:PortraitSpec;id:string}){
 const cl=s.cloth,t=s.trim,line=mix(cl,'#000000',.7);
 const F=(d:string,fill=cl)=><Strands id={id} fill={fill} d={d} angle={35} dark={.35}/>;
 switch(s.head){
  case 'turban':case 'veilwrap':case 'headcloth':case 'kerchief':return <g>{F('M48 76C44 44 60 24 80 24S116 44 112 76C102 62 92 58 80 58S58 62 48 76Z')}{[0,1,2].map(i=><path key={i} d={`M52 ${68-i*10}Q80 ${56-i*10} 108 ${68-i*10}`} stroke={line} strokeWidth="1" fill="none" opacity=".7"/>)}</g>;
  case 'feltcap':case 'flapcap':return F('M48 74C48 46 62 34 80 34S112 46 112 74C100 66 92 63 80 63S60 66 48 74Z');
  case 'furcap':case 'hood':return F('M40 110C36 56 54 26 80 26S124 56 120 110C116 84 108 64 80 62S44 84 40 110Z','#7a5a3a');
  case 'cone':return F('M50 74L80 6L110 74C100 66 92 63 80 63S60 66 50 74Z');
  case 'widebrim':return <g><ellipse cx="80" cy="66" rx="50" ry="9" fill={cl} stroke={line}/>{F('M56 66C56 40 66 30 80 30S104 40 104 66Z')}</g>;
  case 'plume':return <g>{F('M54 70C54 46 66 38 80 38S106 46 106 70Z')}<path d="M80 40C92 12 112 6 118 12C112 28 98 40 80 40Z" fill={s.accent} stroke={line} strokeWidth=".9"/></g>;
  case 'circlet':return <path d="M52 66Q80 58 108 66V73Q80 65 52 73Z" fill={t} stroke={line} strokeWidth=".9"/>;
  case 'fillet':return <path d="M52 68Q80 60 108 68V72Q80 64 52 72Z" fill={t} stroke={line} strokeWidth=".8"/>;
  default:return null;
 }
}
function Beard({s,id}:{s:PortraitSpec;id:string}){
 const c=s.hairColour;
 switch(s.beard){
  case 'stubble':return <path d="M54 104C56 132 66 150 80 150S104 132 106 104C100 120 92 126 80 126S60 120 54 104Z" fill={c} opacity=".3"/>;
  case 'short':return <Strands id={id} fill={c} dark={.45} d="M53 100C54 134 66 154 80 154S106 134 107 100C100 120 92 126 80 126S60 120 53 100Z"/>;
  case 'full':return <Strands id={id} fill={c} dark={.5} d="M52 98C50 140 64 178 80 180S110 140 108 98C100 120 92 126 80 126S60 120 52 98Z"/>;
  case 'braided':return <g><Strands id={id} fill={c} dark={.45} d="M53 100C54 134 66 152 80 152S106 134 107 100C100 120 92 126 80 126S60 120 53 100Z"/>{[-7,0,7].map(x=><path key={x} d={`M${80+x} 146V${186-Math.abs(x)}`} stroke={mix(c,'#000000',.55)} strokeWidth="5" strokeLinecap="round" strokeDasharray="4.2 2"/>)}</g>;
  case 'moustache':return <Strands id={id} fill={c} dark={.4} d="M62 124C68 116 76 118 80 122C84 118 92 116 98 124C92 130 84 128 80 126C76 128 68 130 62 124Z"/>;
  default:return null;
 }
}
function Paint({s}:{s:PortraitSpec}){
 const m=s.mark;if(!m||m.kind==='none'||!m.sites.includes('face'))return s.scar?<path d="M96 80L104 110" stroke="#7a3e30" strokeWidth="1.8" strokeLinecap="round"/>:null;
 const k=m.kind==='scar'?'#7a3e30':m.colour,o={opacity:.82};
 switch(m.pattern){
  case 'eyeBand':return <path d="M51 86H109V98H51Z" fill={k} {...o}/>;
  case 'cheekDots':return <g fill={k} {...o}>{[[60,110],[66,114],[72,110],[100,110],[94,114],[88,110]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2"/>)}</g>;
  case 'browStripe':return <path d="M52 76H108" stroke={k} strokeWidth="4.5" {...o}/>;
  case 'spiralBrow':return <path d="M66 70q-7-7 0-9t7 5q0 6-6 4" stroke={k} strokeWidth="2" fill="none" {...o}/>;
  case 'foreheadDot':return <circle cx="80" cy="68" r="3.6" fill={k} {...o}/>;
  case 'tideLines':return <g stroke={k} strokeWidth="2" fill="none" {...o}>{[0,1,2].map(i=><path key={i} d={`M54 ${106+i*6}q5-3.5 10 0t10 0M86 ${106+i*6}q5-3.5 10 0t10 0`}/>)}</g>;
  case 'tickRows':return <g stroke={k} strokeWidth="1.8" {...o}>{[0,1,2,3,4,5].map(i=><path key={i} d={`M${58+i*9} 62v9`}/>)}</g>;
  case 'leafBand':return <path d="M51 90Q80 80 109 90Q80 98 51 90Z" fill={k} {...o}/>;
  default:return <path d="M58 104l9 9M102 104l-9 9" stroke={k} strokeWidth="2.2" {...o}/>;
 }
}
function Jewels({s}:{s:PortraitSpec}){
 const g=s.accent,has=(j:string)=>s.jewel.includes(j as never),ln={stroke:INK,strokeWidth:.7};
 return <g>
  {has('beads')&&<g fill={g} {...ln}>{Array.from({length:11},(_,i)=><circle key={i} cx={56+i*4.8} cy={160+Math.sin(i/10*Math.PI)*14} r="2.6"/>)}</g>}
  {has('collar')&&<path d="M50 156Q80 186 110 156L106 168Q80 192 54 168Z" fill={g} {...ln}/>}
  {has('torc')&&<path d="M58 156Q80 176 102 156" stroke={g} strokeWidth="5" fill="none" strokeLinecap="round"/>}
  {has('shells')&&<g fill="#e8e0cc" {...ln}>{[60,70,80,90,100].map((x,i)=><path key={i} d={`M${x-3} ${166+(i%2)*3}h6l-3 7z`}/>)}</g>}
  {has('amulet')&&<g><path d="M80 158V176" stroke={INK}/><circle cx="80" cy="181" r="5.5" fill={g} {...ln}/></g>}
  {has('brooch')&&<circle cx="106" cy="176" r="5" fill={g} {...ln}/>}
  {has('earring')&&<g fill={g} {...ln}><circle cx="49" cy="108" r="2.8"/><circle cx="111" cy="108" r="2.8"/></g>}
  {has('earspool')&&<g fill={g} {...ln}><rect x="45" y="102" width="6" height="9"/><rect x="109" y="102" width="6" height="9"/></g>}
  {has('browband')&&<path d="M52 70Q80 62 108 70" stroke={g} strokeWidth="3.2" fill="none"/>}
 </g>;
}
export function ContactPortrait({spec,name,width=176}:{spec:PortraitSpec;name:string;width?:number}){
 const s=spec,uid='cp'+name.replace(/\W/g,''),sk=s.skin,shade=s.skinShade,deep=mix(sk,'#1a0f08',.75),jx=.9+.1*Math.min(1.2,Math.max(.85,s.jaw)),shx=Math.min(1.18,Math.max(.9,s.shoulder));
 const bare=s.torso==='bare'||s.torso==='wrapchest',fur=s.mantle==='fur',cape=s.mantle==='cape'||s.mantle==='blanket'||s.mantle==='shawl'||s.mantle==='feather';
 const hostile=s.mood==='hostile',nose=Math.min(1.2,Math.max(.85,s.nose)),brow=Math.min(1.3,Math.max(.8,s.brow));
 const mouth=s.mood==='friendly'?'M69 129Q80 134 91 129':s.mood==='hostile'?'M69 132Q80 125 91 132':s.mood==='wary'?'M70 130H90':'M70 129Q80 131 90 129';
 const eye=(x:number,m:number)=>{const X=(v:number)=>m>0?v:flip(v);return <g key={x}>
   <ellipse cx={X(69)} cy="92" rx="11" ry="6.5" fill={deep} opacity=".22"/>
   <path d={`M${X(61)} 93Q${X(69)} 87 ${X(77)} 93Q${X(69)} 97 ${X(61)} 93Z`} fill="#e4d8bf" stroke={INK} strokeWidth=".8"/>
   <circle cx={X(69.5)} cy="92.6" r="2.7" fill="#1b130d"/><circle cx={X(70.2)} cy="91.8" r=".7" fill="#e8dcc4"/>
   <path d={`M${X(60)} 93Q${X(69)} 85.5 ${X(78)} 92.6`} stroke={INK} strokeWidth="1.3" fill="none"/>
   <path d={`M${X(61)} 96Q${X(69)} 99 ${X(77)} 96`} stroke={deep} strokeWidth=".7" fill="none" opacity=".7"/>
   <path d={hostile?`M${X(58)} ${81+0}L${X(79)} 87`:`M${X(58)} 85Q${X(68)} ${79} ${X(80)} 85`} stroke={mix(s.hairColour,'#000000',.5)} strokeWidth={3.2*brow} strokeLinecap="round" fill="none"/>
  </g>;};
 const torsoD=`M${80-72*shx} 200C${80-70*shx} 176 ${80-52*shx} 166 ${80-30*shx} 160L${80+30*shx} 160C${80+52*shx} 166 ${80+70*shx} 176 ${80+72*shx} 200Z`;
 return <svg viewBox="0 0 160 200" width={width} height={width*1.25} role="img" aria-label={`Portrait of ${name}`} className="fc-portrait">
  <defs>
   {[35,80].map(a=><pattern key={a} id={`${uid}s${a}`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform={`rotate(${a})`}><line x1="0" y1="0" x2="0" y2="2.6" stroke="#000" strokeWidth=".7"/></pattern>)}
   <pattern id={`${uid}h`} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><line x1="0" y1="0" x2="0" y2="2.4" stroke={deep} strokeWidth=".75"/></pattern>
   <radialGradient id={`${uid}v`} cx="42%" cy="34%" r="80%"><stop offset="0" stopColor="#4a3b2b"/><stop offset=".55" stopColor="#1c150f"/><stop offset="1" stopColor="#0a0705"/></radialGradient>
   <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stopColor={mix(sk,'#fff2d0',.14)}/><stop offset=".5" stopColor={sk}/><stop offset="1" stopColor={mix(sk,deep,.55)}/></linearGradient>
   <linearGradient id={`${uid}t`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={mix(s.cloth,'#fff2d0',.1)}/><stop offset="1" stopColor={mix(s.cloth,'#000000',.55)}/></linearGradient>
   <clipPath id={`${uid}c`}><path d="M80 40C56 40 50 60 51 84C52 100 54 116 60 130C65 142 72 148 80 148C88 148 95 142 100 130C106 116 108 100 109 84C110 60 104 40 80 40Z"/></clipPath>
   <clipPath id={`${uid}r`}><rect x="0" y="0" width="160" height="200"/></clipPath>
  </defs>
  <g clipPath={`url(#${uid}r)`}>
  <rect width="160" height="200" fill={`url(#${uid}v)`}/>
  <HairBack s={s} id={uid}/>
  {/* garb */}
  <path d={torsoD} fill={bare?`url(#${uid}f)`:`url(#${uid}t)`} stroke={INK} strokeWidth="1"/>
  <path d={torsoD} fill={`url(#${uid}${bare?'h':'s35'})`} opacity={bare?.4:.28}/>
  {!bare&&<path d={`M${80-22*shx} 162L80 190L${80+22*shx} 162`} fill="none" stroke={s.trim} strokeWidth="3.2" strokeLinejoin="round"/>}
  {!bare&&<path d="M80 190V200M56 176Q60 188 58 200M104 176Q100 188 102 200" stroke={INK} strokeWidth=".8" opacity=".5" fill="none"/>}
  {bare&&<path d="M62 168Q80 176 98 168M80 172V190" stroke={deep} strokeWidth=".9" fill="none" opacity=".7"/>}
  {(fur||cape)&&<path d={`M${80-62*shx} 176L${80-54*shx} 160L${80-36*shx} 164L${80-28*shx} 154L${80-12*shx} 164L80 156L${80+12*shx} 164L${80+28*shx} 154L${80+36*shx} 164L${80+54*shx} 160L${80+62*shx} 176C${80+40*shx} 188 ${80-40*shx} 188 ${80-62*shx} 176Z`} fill={fur?'#8a6a48':s.under} stroke={INK} strokeWidth=".9"/>}
  {(fur||cape)&&<path d={`M${80-62*shx} 176L${80-54*shx} 160L${80-36*shx} 164L${80-28*shx} 154L${80-12*shx} 164L80 156L${80+12*shx} 164L${80+28*shx} 154L${80+36*shx} 164L${80+54*shx} 160L${80+62*shx} 176C${80+40*shx} 188 ${80-40*shx} 188 ${80-62*shx} 176Z`} fill={`url(#${uid}s80)`} opacity=".4"/>}
  {/* neck */}
  <path d="M65 134C66 150 62 160 56 168Q80 178 104 168C98 160 94 150 95 134Z" fill={`url(#${uid}f)`} stroke={INK} strokeWidth=".9"/>
  <path d="M65 134C66 150 62 160 56 168Q80 178 104 168C98 160 94 150 95 134Z" fill={`url(#${uid}h)`} opacity=".45"/>
  <path d="M66 142Q80 156 94 142Q80 150 66 142Z" fill={deep} opacity=".5"/>
  {/* ears */}
  {[1,-1].map(m=><g key={m}><path d={`M${m>0?51:109} 88C${m>0?42:118} 86 ${m>0?42:118} 108 ${m>0?52:108} 110`} fill={m>0?sk:mix(sk,deep,.3)} stroke={INK} strokeWidth=".9" transform={`translate(${m>0?-(s.ears-1)*3:(s.ears-1)*3} 0)`}/></g>)}
  {/* head */}
  <g transform={`translate(${80-80*jx} 0) scale(${jx} 1)`}>
   <path d="M80 40C56 40 50 60 51 84C52 100 54 116 60 130C65 142 72 148 80 148C88 148 95 142 100 130C106 116 108 100 109 84C110 60 104 40 80 40Z" fill={`url(#${uid}f)`} stroke={INK} strokeWidth="1"/>
  </g>
  <g clipPath={`url(#${uid}c)`}>
   <path d="M98 50C110 70 110 110 96 140L110 150L112 40Z" fill={deep} opacity=".28"/>
   <path d="M98 50C110 70 110 110 96 140L110 150L112 40Z" fill={`url(#${uid}h)`} opacity=".55"/>
   <path d="M54 104Q60 122 70 136L52 140Z" fill={deep} opacity=".18"/>
   <path d="M58 110C64 118 70 124 76 126M102 110C96 118 90 124 84 126" stroke={deep} strokeWidth=".8" opacity=".55" fill="none"/>
   <path d="M52 118C58 134 66 144 76 146L56 150Z" fill={`url(#${uid}h)`} opacity=".5"/>
  </g>
  <Paint s={s}/>
  {eye(69,1)}{eye(91,-1)}
  <path d={`M78 94C77 104 75 ${110*nose-4+4} 72 ${114+3*nose}`} stroke={deep} strokeWidth="1.1" fill="none"/>
  <path d={`M82 94C83 104 85 ${110*nose-4+4} 88 ${114+3*nose}Z`} fill={deep} opacity=".28"/>
  <path d={`M72 ${114+3*nose}Q76 ${118+3*nose} 80 ${116+3*nose}Q84 ${118+3*nose} 88 ${114+3*nose}`} stroke={INK} strokeWidth="1.1" fill="none"/>
  <path d={`M71 ${114+3*nose}q2 3 5 2M89 ${114+3*nose}q-2 3-5 2`} stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  <path d={mouth} stroke="#3a1a12" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
  <path d="M72 134Q80 138 88 134" stroke={deep} strokeWidth=".8" fill="none" opacity=".55"/>
  {s.age>.55&&<g stroke={deep} strokeWidth=".7" opacity=".6" fill="none"><path d="M58 68Q80 62 102 68M60 73Q80 68 100 73M56 98Q52 104 54 110M104 98Q108 104 106 110M66 120Q62 128 66 134M94 120Q98 128 94 134"/></g>}
  <Beard s={s} id={uid}/>
  <HairFront s={s} id={uid}/><Headwear s={s} id={uid}/><Jewels s={s}/>
  </g>
  <rect x=".75" y=".75" width="158.5" height="198.5" fill="none" stroke="#0a0705" strokeWidth="1.5"/>
 </svg>;
}
export {portraitSpec};
