// Credentials arrive only on stdin. Output contains public evidence and measured receipts only.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
let input='';for await(const chunk of process.stdin)input+=chunk;
const values=JSON.parse(input);input='';
for(const key of ['VERDA_INFERENCE_KEY','TIGER_DATABASE_URL','TIGER_CA_CERT_B64'])if(values[key])process.env[key]=values[key];
process.env.SIGNAL_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'sf-sponsor-access-'));
const {reviewNarratives}=await import('../v2/nemotron.mjs');
const {saveMentions,readTimelines,closeTiger}=await import('../v2/tiger.mjs');
const cc=process.argv.find(x=>x.startsWith('--country='))?.split('=')[1]||'RU';
const report={at:new Date().toISOString(),country:cc,measurement:'measured',cost_usd:null,cost_note:'Provider pricing is not inferred. Token usage and latency are recorded when returned.'};
let failed=false;
try{
 const response=await fetch('https://signal-fire.72.61.22.106.sslip.io/api/countries/'+encodeURIComponent(cc));
 if(!response.ok)throw Error('Public evidence unavailable');
 const country=await response.json(),narratives=country.narratives.filter(n=>n.proposed_label||n.label).slice(0,5);
 if(!narratives.length)throw Error('No stored public narratives to check');
 try{const result=await reviewNarratives({narratives:narratives.map(n=>({label:n.proposed_label||n.label,headlines:(n.examples||[]).map(e=>e.headline)}))},{fresh:true});report.nemotron={ok:!!result,model:result?.model,latency_ms:result?.ms,usage:result?.usage,baseline_labels:narratives.map(n=>n.proposed_label||n.label),verdicts:result?.verdicts,comparison:'Agreement with existing model-accepted labels, not human-labelled accuracy'};}catch{failed=true;report.nemotron={ok:false,error:'Live model request or strict output validation failed'};}
 try{const result=await saveMentions(cc,narratives),timelines=await readTimelines(cc,narratives.map(n=>n.id));report.tiger={ok:result.enabled,inserted:result.inserted,narratives_read:timelines?.size||0,bucket_rows:[...(timelines?.values()||[])].reduce((n,v)=>n+v.length,0),source_scope:'Each older narrative uses its own linked examples only'};}catch{failed=true;report.tiger={ok:false,error:'TLS connection, native time-series storage or readback failed'};}
}catch{failed=true;report.source={ok:false,error:'Existing public country evidence could not be loaded'};}
await closeTiger();fs.mkdirSync('artifacts/sponsors',{recursive:true});fs.writeFileSync('artifacts/sponsors/access.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=failed?1:0;
