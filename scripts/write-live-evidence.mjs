import fs from 'node:fs';
const base='https://signal-fire.72.61.22.106.sslip.io',state=await(await fetch(base+'/api/state')).json();
const ids=['a6b0d22b1d61','aa9426e2b5e6','nab032987aff'], rows=[];
for(const id of ids)rows.push(await(await fetch(base+'/api/push/'+id)).json());
fs.mkdirSync('artifacts/findings',{recursive:true});
const slim={at:new Date().toISOString(),commit:state.commit,metrics:state.metrics,findings:rows.map(p=>({id:p.id,title:p.title,verdict:p.verdict,posts:p.posts.length,accounts:p.accounts.length,peak:p.peak,peakAt:p.peakAt,firstSeen:p.firstSeen,lastSeen:p.lastSeen,copied:p.copied.length,signals:p.signals,claim:p.claim,evidence:p.evidence,techniques:p.techniques,origins:p.origins,pickups:p.pickups?.length||0,seenBefore:p.seenBefore,judgement:{model:p.judgement.model,promptVersion:p.judgement.promptVersion,at:p.judgement.at}}))};
fs.writeFileSync('artifacts/findings/live-summary.json',JSON.stringify(slim,null,2));
let text='# REAL FINDINGS\n\nSnapshot '+slim.at+'. Counts may grow as the VPS continues reading. All three are real publication sets from the documented Pravda network.\n';
for(const p of rows){text+='\n## '+p.title+'\n\n'+`[Open the push](${base}/w/baltics/p/${p.id}) · Looks coordinated: ${p.verdict}. ${p.posts.length} posts; ${p.accounts.length} publishing identities. Peak ${p.peak} in ten minutes at ${p.peakAt}.\n\n`;
text+='### Measured signals\n\n'+p.signals.map(s=>'- '+s.name+': '+s.reason).join('\n')+'\n\n';
text+='### Posts\n\n'+p.posts.map(x=>'- '+x.postedAt+' · ['+x.handle+']('+x.url+') · '+x.language).join('\n')+'\n\n';
text+='### Accounts and ages\n\nPublisher identities are not individual people. Dates are never inferred from domain registration.\n\n'+p.accounts.map(a=>'- ['+a.handle+']('+a.url+') · creation: '+(a.createdAt||'could not be measured')+' · followers: '+(a.followers??'not public')).join('\n')+'\n\n';
text+='### Origin and public pickup\n\n'+(p.origins?.map(o=>'- ['+(o.handle||o.title||o.url)+']('+o.url+') · '+(o.relationship||'Cited origin')).join('\n')||'The original post has not been matched.')+'\n\n';
text+=(p.pickups?.map(x=>'- ['+(x.title||x.handle||x.platform)+']('+x.url+') · '+(x.copyLinkEstablished?'A shared link establishes a copying connection.':'Matching claim; a causal copy connection was not established.')).join('\n')||'No matching local pickup established in the searches so far.')+'\n\n';
text+='### Claim and tracker evidence\n\n'+p.claim+'\n\n';
for(const e of p.evidence){const quote=e.stance==='not reported'?e.quote.split(/(?<=[.!?])\s/)[0]:e.quote;text+='- '+e.stance+' · ['+e.name+']('+e.url+')\n\n> '+quote.replaceAll('\n','\n> ')+(quote.length<e.quote.length?' …':'')+'\n\n'+(e.reason||'')+'\n\n';}
text+='### Wording, site and seen before\n\n'+(p.techniques.length?p.techniques.map(t=>'- '+t.name+': “'+t.phrase+'” · '+t.explanation).join('\n'):'No wording technique established by the current Router reading.')+'\n\n'+(p.sites.length?p.sites.map(s=>s.domain).join(', '):'No verified cloned site linked in this push.')+'\n\n'+(p.seenBefore.length?p.seenBefore.map(c=>'['+c.title+']('+c.url+') · '+(c.recordedAt||'date could not be read')).join('\n'):'No retrieved EUvsDisinfo case passed the match threshold. That does not show the claim is new.')+'\n\n';
text+='Judgement: '+p.judgement.model+' · '+p.judgement.promptVersion+' · '+p.judgement.at+'.\n';}
fs.writeFileSync('artifacts/findings/REAL_FINDINGS.md',text);
if(fs.existsSync('work/live-state.json')){const old=JSON.parse(fs.readFileSync('work/live-state.json'));fs.writeFileSync('artifacts/findings/checkpoint.json',JSON.stringify({source:'Saved response from the deployed public state endpoint',at:old.metrics.asOf,commit:old.commit,findings:old.pushes.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,verdict:p.verdict,posts:p.posts.length,accounts:p.accounts.length}))},null,2));}
console.log('Live findings snapshot written',rows.map(p=>({id:p.id,posts:p.posts.length,accounts:p.accounts.length})));
