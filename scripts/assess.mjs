import{all,get,put,search,scrape,judge,spend}from'../signal/providers.mjs';
for(const c of all('candidate').sort((a,b)=>b.posts.length-a.posts.length).slice(0,3)){
 const query=c.posts[0].text.split('\n')[0].slice(0,180);let sources=[];
 for(const q of [query+' site:yle.fi OR site:news.err.ee OR site:lrt.lt OR site:eng.lsm.lv',query+' site:understandingwar.org OR site:euvsdisinfo.eu']){try{const d=await search(q,5);for(const r of d.results||[]){try{const page=await scrape(r.url);if(page.markdown?.data)sources.push({id:'s'+sources.length,url:r.url,name:r.title,text:page.markdown.data.slice(0,16000),call:page._call});}catch{}}}catch(e){console.log(e.message)}}
 try{const j=await judge({posts:c.posts.map(p=>({id:p.id,text:p.text})),sources,signals:c.signals});put('assessed',c.id,{...c,judgement:j,sources});console.log(c.id,j.data.title,j.data.evidence?.length,j.usage)}catch(e){console.log(c.id,e.message)}
}console.log(spend());
