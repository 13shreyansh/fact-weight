import {reviewNarratives,labelAgreement,NEMOTRON_MODEL} from './nemotron.mjs';

export async function reviewStoredNarratives(narratives,verify=reviewNarratives){
 let batches=0;
 for(let start=0;start<narratives.length;start+=5){
  const batch=narratives.slice(start,start+5),review=await verify({narratives:batch.map(n=>({label:n.proposed_label||n.label,headlines:(n.examples||[]).map(e=>e.headline)}))});
  if(!review)throw Error('The configured narrative check is unavailable.');
  for(const [i,n]of batch.entries()){
   const former=n.models?.agree?.slice(0,2)||[!!n.label,!!n.label],agreed=labelAgreement(former,review,i,true);
   n.label=agreed?n.proposed_label||n.label:null;
   n.label_reason=agreed?null:'The configured checking models did not all accept the proposed label';
   n.models={...n.models,checked_by:[...(n.models?.checked_by||[]).filter(x=>x!==NEMOTRON_MODEL),NEMOTRON_MODEL],agree:[...former,review.verdicts.find(v=>v.index===i)?.agree===true],verda:{model:NEMOTRON_MODEL,at:review.at,ms:review.ms,cached:review.cached}};
  }
  batches++;
 }
 return {batches,checked:narratives.length};
}
