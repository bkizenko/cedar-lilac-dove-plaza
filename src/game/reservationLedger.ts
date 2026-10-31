/** Quantities use the domain's native units (goods, people or workplace slots).
 * Reservations never deduct inventory: executors consume once on actual work. */
export type ReservationRequest={key:string;amount:number;capacity:number};
export class ReservationLedger {
 private owners=new Map<string,ReservationRequest[]>();
 readonly metrics={attempts:0,failures:0,released:0,committed:0};
 used(key:string,except?:string){let total=0;for(const [owner,items] of this.owners)if(owner!==except)for(const item of items)if(item.key===key)total+=item.amount;return total;}
 reserve(owner:string,requests:ReservationRequest[]):{accepted:boolean;reason:string|null}{
  this.metrics.attempts++;
  const combined=new Map<string,ReservationRequest>();
  for(const item of requests){
   if(!item.key||!Number.isFinite(item.amount)||item.amount<0||!Number.isFinite(item.capacity)||item.capacity<0){this.metrics.failures++;return {accepted:false,reason:'Invalid reservation quantity'};}
   const old=combined.get(item.key);
   combined.set(item.key,{key:item.key,amount:(old?.amount||0)+item.amount,capacity:Math.min(old?.capacity??item.capacity,item.capacity)});
  }
  for(const item of combined.values())if(this.used(item.key,owner)+item.amount>item.capacity){this.metrics.failures++;return {accepted:false,reason:`Insufficient capacity: ${item.key}`};}
  // Only mutate after every key passes; a failed amendment retains prior claims.
  this.owners.set(owner,[...combined.values()]);return {accepted:true,reason:null};
 }
 release(owner:string){if(this.owners.delete(owner))this.metrics.released++;}
 commit(owner:string){if(this.owners.delete(owner))this.metrics.committed++;}
 reservations(owner:string){return (this.owners.get(owner)||[]).map(item=>({...item}));}
}
