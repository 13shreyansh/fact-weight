// Older records kept only linked examples. Never substitute an entire cluster for a narrative.
export function narrativeMentions(narrative, stories){
 if(Array.isArray(narrative.timeline_mentions))return narrative.timeline_mentions;
 const urls=narrative.source_urls||narrative.urls;
 if(Array.isArray(urls)){
  const membership=new Set(urls);
  return stories.flatMap(s=>(s.copies||[]).filter(p=>membership.has(p.url)).map(p=>({url:p.url,site:p.site,published_at:p.published_at})));
 }
 return (narrative.examples||[]).map(p=>({url:p.url,site:p.site,published_at:p.published_at}));
}
