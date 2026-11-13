/** Collapse adjacent identical feed lines (compared without a leading "year:" stamp; the newest stamp is kept unless strip) into one row with a count, newest first kept
 * as given. Pure display: the underlying log is untouched, so saves and chronicles are unaffected. */
export type FeedRow={text:string;count:number;key:string};
export function dedupeFeed(lines:readonly string[],strip=true):FeedRow[]{
 const rows:FeedRow[]=[];
 for(const raw of lines){const key=raw.replace(/^\d+:\s*/,''),last=rows[rows.length-1];
  if(last&&last.key===key)last.count++;else rows.push({text:strip?key:raw,count:1,key});}
 return rows;
}
export const countLabel=(n:number)=>n>1?` ×${n}`:'';
