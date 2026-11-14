import {scrape,search,call,put,spend} from '../signal/providers.mjs';
const tasks=[
 ['usage',()=>call('context','/org/usage',{}, {method:'GET'})],
 ['tt-hashtag',()=>scrape('https://www.tiktok.com/tag/baltics','tiktok-feed')],
 ['tt-search',()=>scrape('https://www.tiktok.com/search?q=Ukraine%20Lithuania%20NATO','tiktok-feed')],
 ['ig-hashtag',()=>scrape('https://www.instagram.com/explore/tags/baltics/','instagram-feed')],
 ['reddit',()=>scrape('https://www.reddit.com/search/?q=Ukraine%20Baltic&sort=new&t=month','reddit-search')],
 ['report-seeds',()=>search('site:euvsdisinfo.eu Telegram Baltic Ukraine channels')],
 ['dfrlab-seeds',()=>search('site:dfrlab.org Baltic Telegram channels Ukraine Pravda')],
 ['campaigns',()=>search('CheckFirst Operation Overload Doppelganger Baltic LRT Estonia cloned sites dataset')],
 ['youtube-search',()=>search('site:youtube.com/watch Ukraine Lithuania NATO November 2026')],
 ...Object.entries({en:'Ukraine war Baltic states Russia NATO',ru:'война Украина страны Балтии Россия НАТО',et:'Ukraina sõda Balti riigid Venemaa NATO',lv:'Ukraina karš Baltijas valstis Krievija NATO',lt:'Ukraina karas Baltijos šalys Rusija NATO',uk:'війна Україна країни Балтії Росія НАТО'}).map(([lang,query])=>['news-'+lang,()=>call('context','/news/search',{searchBy:{type:'natural_language',query},filters:{articleLanguage:[lang],date:{from:Date.parse('2026-11-01T00:00:00Z'),to:Date.now()}},limit:50})])
];
for(let i=0;i<tasks.length;i+=4){await Promise.allSettled(tasks.slice(i,i+4).map(async([id,f])=>{try{const d=await f();put('discovery',id,d);console.log(id,JSON.stringify(d).length,'bytes',d.key_metadata||'');}catch(e){put('failure',id,{at:new Date().toISOString(),error:e.message});console.log(id,e.message)}}))}
console.log(spend());
