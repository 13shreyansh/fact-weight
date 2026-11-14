import{scrape,all,put}from'../signal/providers.mjs';import{load}from'cheerio';
const cutoff=Date.parse('2026-11-01T00:00:00Z');
const tasks=all('telegram').filter(d=>!d.channel.includes('/'));
async function backfill(d){let page=d;for(let n=0;n<100;n++){
 const $=load(page.html?.data||''),els=$('.tgme_widget_message'),times=els.find('time').map((i,e)=>$(e).attr('datetime')).get().filter(Boolean);if(!times.length||Math.min(...times.map(Date.parse))<=cutoff){put('coverage',d.channel,{oldest:times.sort()[0]||null,through:'2026-11-14',pages:n+1,complete:!!times.length});return;}
 const ids=els.map((i,e)=>Number(($(e).attr('data-post')||'').split('/').at(-1))).get().filter(Boolean);if(!ids.length)return;const before=Math.min(...ids);
 try{page=await scrape('https://t.me/s/'+d.channel+'?before='+before);put('telegram',d.channel+'/'+before,{...page,channel:d.channel});if(n%5===0)console.log(d.channel,n+1,times.sort()[0]);}catch(e){console.log(d.channel,e.message);return;}
 }put('coverage',d.channel,{complete:false,pages:100,reason:'Backfill page limit'});}
for(let i=0;i<tasks.length;i+=8)await Promise.allSettled(tasks.slice(i,i+8).map(backfill));
