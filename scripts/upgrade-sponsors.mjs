// Run against the existing public-evidence dataset. No search rebuild or seeded finding.
import {get,put,all} from '../v2/db.mjs';
import {loadSponsorSecrets} from '../signal/sponsor-secrets.mjs';
loadSponsorSecrets();
import {reviewNarratives,labelAgreement,NEMOTRON_MODEL} from '../v2/nemotron.mjs';
import {saveMentions,readTimelines,tigerConfigured,closeTiger} from '../v2/tiger.mjs';
import {narrativeMentions} from '../v2/narrative-mentions.mjs';

const requested=process.argv.find(x=>/^--country=/.test(x))?.split('=')[1]?.toUpperCase();
const countries=requested?[get('country',requested)].filter(Boolean):all('country');
const report=[];
for(const c of countries){
 const narratives=(c.narratives||[]).filter(n=>n.proposed_label||n.label).slice(0,5);
 if(!narratives.length)continue;
 const stories=(c.story_ids||[]).map(id=>get('story',id)).filter(Boolean);
 const enriched=narratives.map(n=>({...n,timeline_mentions:narrativeMentions(n,stories)}));
 let review=null;
 if(process.env.VERDA_INFERENCE_KEY){
  review=await reviewNarratives({narratives:narratives.map(n=>({label:n.proposed_label||n.label,headlines:(n.examples||[]).map(e=>e.headline)}))});
  for(const [i,n]of narratives.entries()){
   const former=n.models?.agree?.slice(0,2)||[!!n.label,!!n.label];
   const agreed=labelAgreement(former,review,i,true);
   n.label=agreed?n.proposed_label||n.label:null;
   n.label_reason=agreed?null:'The configured checking models did not all accept the proposed label';
   n.models={...n.models,checked_by:[...(n.models?.checked_by||[]).filter(x=>x!==NEMOTRON_MODEL),NEMOTRON_MODEL],agree:[...former,review.verdicts.find(v=>v.index===i)?.agree===true],verda:{model:NEMOTRON_MODEL,at:review.at,ms:review.ms,cached:review.cached}};
  }
 }
 let inserted=0;
 if(tigerConfigured()){
  inserted=(await saveMentions(c.code,enriched)).inserted;
  const timelines=await readTimelines(c.code,narratives.map(n=>n.id));
  for(const n of narratives){n.trend_30d=timelines.get(n.id)||[];n.timeline_store='Tiger Data';n.timeline_scope=n.source_urls||n.urls?'retrieved_matches':'linked_examples';n.trend_note=n.timeline_scope==='linked_examples'?'Counts only linked examples for this older narrative, not total publishing.':'Retrieved source pages grouped by publication day in Tiger Data. Missing days do not establish no publishing.';}
  put('meta','tiger_last_success',{at:new Date().toISOString(),country:c.code,inserted});
 }
 put('country',c.code,c);
 report.push({country:c.code,narratives:narratives.length,verda:!!review,accepted:narratives.filter(n=>n.label).length,tiger:tigerConfigured(),inserted});
}
await closeTiger();
console.log(JSON.stringify({at:new Date().toISOString(),countries:report},null,2));
