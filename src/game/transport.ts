import type {Game} from './sim';
import type {Building,Unit} from './types';

export type BridgeSpan={ax:number;az:number;bx:number;bz:number};
export const BRIDGE_WIDTH=5.2;
export const MAX_BRIDGE_SPAN=28;

/** Short timber crossings need two gentle dry banks, not an ocean-spanning road. */
export function planBridge(g:Game,x:number,z:number):BridgeSpan|null {
  if(g.height(x,z)>g.world.waterY+.12)return null;
  let best:BridgeSpan|null=null,bestLength=Infinity;
  for(let i=0;i<16;i++){
    const a=i*Math.PI/16,dx=Math.sin(a),dz=Math.cos(a);
    const bank=(sign:number)=>{
      for(let r=2;r<=MAX_BRIDGE_SPAN/2;r+=.5){
        const px=x+sign*dx*r,pz=z+sign*dz*r;
        if(g.height(px,pz)<=g.world.waterY+.55)continue;
        // Dry frontage across the entire deck, plus room to walk off the end.
        let clear=true;
        for(const along of [0,1.5])for(const side of [-BRIDGE_WIDTH/2,0,BRIDGE_WIDTH/2]){
          const sx=px+sign*dx*along+dz*side,sz=pz+sign*dz*along-dx*side;
          const h=g.height(sx,sz);
          if(h<=g.world.waterY+.28||Math.abs(h-g.height(px,pz))>1.5||
            g.state.buildings.some(b=>b.hp>0&&Math.abs(sx-b.x)<b.w*.4+.6&&Math.abs(sz-b.z)<b.d*.4+.6)){clear=false;break;}
        }
        if(clear)return {x:px,z:pz};
      }
      return null;
    };
    const left=bank(-1),right=bank(1);if(!left||!right)continue;
    const length=Math.hypot(right.x-left.x,right.z-left.z);
    if(length<5||length>MAX_BRIDGE_SPAN||length>=bestLength||Math.abs(g.height(left.x,left.z)-g.height(right.x,right.z))>length*.18)continue;
    let water=0,valid=true;
    for(let t=0;t<=length;t+=.5){const px=left.x+(right.x-left.x)*t/length,pz=left.z+(right.z-left.z)*t/length,h=g.height(px,pz);
      if(h<g.world.waterY-3.5||h>Math.max(g.height(left.x,left.z),g.height(right.x,right.z))+1){valid=false;break;}
      if(h<g.world.waterY+.12)water++;
    }
    const candidate={ax:left.x,az:left.z,bx:right.x,bz:right.z};
    if(valid&&water>=4&&!bridgeDeckBlocked(g,candidate)){best=candidate;bestLength=length;}
  }
  return best;
}

export function onBridge(span:BridgeSpan,x:number,z:number,margin=0){
  const dx=span.bx-span.ax,dz=span.bz-span.az,length=Math.hypot(dx,dz);
  const along=((x-span.ax)*dx+(z-span.az)*dz)/length;
  const across=Math.abs((x-span.ax)*dz-(z-span.az)*dx)/length;
  return along>=-margin&&along<=length+margin&&across<=BRIDGE_WIDTH/2-margin;
}
export function bridgeHeight(g:Game,span:BridgeSpan,x:number,z:number){
  const dx=span.bx-span.ax,dz=span.bz-span.az;
  const t=Math.max(0,Math.min(1,((x-span.ax)*dx+(z-span.az)*dz)/(dx*dx+dz*dz)));
  return g.height(span.ax,span.az)*(1-t)+g.height(span.bx,span.bz)*t+.18;
}
export function bridgeApproach(g:Game,u:Unit,b:Building){
  if(!b.bridge)return null;
  const {ax,az,bx,bz}=b.bridge;
  return [{x:ax,z:az},{x:bx,z:bz}].filter(p=>g.walkable(p.x,p.z)&&g.workBoard.connected(g,u.x,u.z,p.x,p.z))
    .sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))[0]||null;
}

/** Survey the full deck, including islands between otherwise clear banks. */
function bridgeDeckBlocked(g:Game,s:BridgeSpan){
 const dx=s.bx-s.ax,dz=s.bz-s.az,len=Math.hypot(dx,dz);
 for(let t=0;t<=len;t+=.5)for(const side of [-BRIDGE_WIDTH/2,0,BRIDGE_WIDTH/2]){
  const x=s.ax+dx*t/len+dz*side/len,z=s.az+dz*t/len-dx*side/len;
  if(g.state.buildings.some(b=>b.hp>0&&Math.abs(x-b.x)<b.w*.4+.6&&Math.abs(z-b.z)<b.d*.4+.6))return true;
 }
 return false;
}

/** Validate a player-drawn crossing without silently moving either bank. */
export function validBridgeSpan(g:Game,s:BridgeSpan){
 if(![s.ax,s.az,s.bx,s.bz].every(Number.isFinite))return false;
 const dx=s.bx-s.ax,dz=s.bz-s.az,len=Math.hypot(dx,dz);
 if(len<5||len>MAX_BRIDGE_SPAN)return false;
 const a=g.height(s.ax,s.az),b=g.height(s.bx,s.bz);
 if(Math.min(a,b)<=g.world.waterY+.55||Math.abs(a-b)>len*.18)return false;
 let water=0;
 for(let t=-1.5;t<=len+1.5;t+=.5){
  for(const side of [-BRIDGE_WIDTH/2,0,BRIDGE_WIDTH/2]){
   const x=s.ax+dx*t/len+dz*side/len,z=s.az+dz*t/len-dx*side/len,h=g.height(x,z);
   if(h<g.world.waterY-3.5||h>Math.max(a,b)+1)return false;
   if((t<=0||t>=len)&&h<=g.world.waterY+.28)return false;
   if(g.state.buildings.some(site=>site.hp>0&&Math.abs(x-site.x)<site.w*.4+.6&&Math.abs(z-site.z)<site.d*.4+.6))return false;
   if(side===0&&t>=0&&t<=len&&h<g.world.waterY+.12)water++;
  }
 }
 return water>=4;
}
export function bridgeCostScale(span?:BridgeSpan){return span?Math.max(1,Math.hypot(span.bx-span.ax,span.bz-span.az)/16):1;}
