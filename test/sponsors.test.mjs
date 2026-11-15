import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
process.env.SIGNAL_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'sf-sponsors-'));
const {validateVerdicts,reviewNarratives,labelAgreement,NEMOTRON_MODEL}=await import('../v2/nemotron.mjs');
const {mentionRows,saveMentions,readTimelines}=await import('../v2/tiger.mjs');
const {narrativeMentions}=await import('../v2/narrative-mentions.mjs');
const {reviewStoredNarratives}=await import('../v2/upgrade-labels.mjs');
test('a configured model cannot approve a label with a missing, string or duplicate verdict',()=>{
 for(const value of [{verdicts:[{index:0,agree:'true'}]},{verdicts:[]},{verdicts:[{index:0,agree:true},{index:0,agree:true}]}])assert.throws(()=>validateVerdicts(value,1));
 assert.equal(labelAgreement([true,true],null,0,true),false);
 assert.equal(labelAgreement([true,false],{verdicts:[{index:0,agree:true}]},0,true),false);
 assert.equal(labelAgreement([true,true],{verdicts:[{index:0,agree:false}]},0,true),false);
});
test('real adapter parses a provider reply, caches exact input and records model provenance',async()=>{
 let calls=0;const payload={narratives:[{label:'The council changed its meeting date',headlines:['Council moves meeting to Monday']}]};
 const fake=async(url,request)=>{calls++;assert.match(url,/nemotron-3-5-super-vl-b300\/v1\/chat\/completions$/);assert.equal(JSON.parse(request.body).model,NEMOTRON_MODEL);return Response.json({choices:[{message:{content:'{"verdicts":[{"index":0,"agree":true}]}'}}],usage:{prompt_tokens:40,completion_tokens:12}});};
 const first=await reviewNarratives(payload,{token:'isolated-test',fetch:fake});const second=await reviewNarratives(payload,{token:'isolated-test',fetch:fake});
 assert.equal(calls,1);assert.equal(first.cached,false);assert.equal(second.cached,true);assert.equal(first.provider,'Verda');assert.equal(labelAgreement([true,true],first,0,true),true);
});
test('timeline ingest rejects missing timestamps and deduplicates source pages',()=>{
 const e={url:'https://news.example/story',site:'news.example',published_at:'2026-11-15T01:00:00Z'};
 assert.equal(mentionRows('FI',[{id:'n1',examples:[e,e,{...e,published_at:null},{...e,url:'javascript:alert(1)'}]}]).length,1);
});
test('two narratives in one cluster never inherit each others copies during upgrade',()=>{
 const a={url:'https://a.example/one',site:'a.example',published_at:'2026-11-15T01:00:00Z',cluster_id:'shared'},b={url:'https://b.example/two',site:'b.example',published_at:'2026-11-15T02:00:00Z',cluster_id:'shared'};
 const stories=[{copies:[a,b]}],first={id:'n1',cluster_id:'shared',examples:[a]},second={id:'n2',cluster_id:'shared',examples:[b]};
 assert.deepEqual(narrativeMentions(first,stories).map(p=>p.url),[a.url]);assert.deepEqual(narrativeMentions(second,stories).map(p=>p.url),[b.url]);
 assert.deepEqual(narrativeMentions({...first,source_urls:[b.url]},stories).map(p=>p.url),[b.url]);
});
test('a stored country with more than five narratives checks every label in bounded batches',async()=>{
 const items=Array.from({length:6},(_,i)=>({label:'Label '+i,proposed_label:'Label '+i,models:{agree:[true,true]},examples:[]}));let calls=0;
 await reviewStoredNarratives(items,async payload=>{calls++;assert(payload.narratives.length<=5);return {model:NEMOTRON_MODEL,at:new Date().toISOString(),ms:1,cached:false,verdicts:payload.narratives.map((n,index)=>({index,agree:n.label!=='Label 5'}))};});
 assert.equal(calls,2);assert.equal(items[5].label,null);assert(items.every(n=>n.models.verda?.model===NEMOTRON_MODEL));
});
test('public country view withholds labels that a configured checker rejected',async()=>{
 const {put}=await import('../v2/db.mjs'),{handleV2}=await import('../v2/api.mjs');
 put('country','FI',{code:'FI',story_ids:[],clusters:[],pickup:[],narratives:[{id:'rejected',label:null,proposed_label:'Unsupported accusation'},{id:'accepted',label:'Council changed its meeting date',trend_30d:[]} ]});
 let result;const response={writeHead(){},end(text){result=JSON.parse(text);}};
 await handleV2({method:'GET'},response,new URL('https://example.com/api/countries/FI'));
 assert.deepEqual(result.narratives.map(n=>n.id),['accepted']);
});
test('Tiger timeline uses parameterized storage and native time_bucket, never TLS downgrade',async()=>{
 let writes=0,queries=[];const pool={query:async(sql,args)=>{queries.push({sql,args});if(sql.startsWith('INSERT')){writes++;return{rowCount:1};}if(sql.startsWith('SELECT narrative_id'))return{rows:[{narrative_id:'n1',day:new Date().toISOString().slice(0,10),articles:2}]};return{rows:[]};}};
 await saveMentions('FI',[{id:'n1',examples:[{url:'https://a.example/x',published_at:'2026-11-15T01:00:00Z'}]}],pool);
 const rows=await readTimelines('FI',['n1'],pool);assert.equal(writes,1);assert.equal(rows.get('n1').length,30);assert.equal(rows.get('n1').at(-1).articles,2);assert.equal(rows.get('n1')[0].articles,0);
 assert.ok(queries.some(q=>q.sql.includes("time_bucket('1 day'")&&q.args[0]==='FI'));
 assert.ok(queries.find(q=>q.sql.startsWith('INSERT')).sql.includes('$1'));
});
test('the method page counts Verda requests without inventing a zero price or an undefined provider',async()=>{
 const {handleV2}=await import('../v2/api.mjs');let result;
 await handleV2({method:'GET'},{writeHead(){},end(text){result=JSON.parse(text);}},new URL('https://example.com/api/method'));
 assert.equal(result.spend.verda?.unit,'requests');assert.equal(result.spend.verda?.cost_usd,null);assert.equal(Object.hasOwn(result.spend,'undefined'),false);
});
