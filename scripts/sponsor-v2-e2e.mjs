import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const origin=process.env.SIGNAL_URL||'https://signal-fire.72.61.22.106.sslip.io',expected=process.env.EXPECTED_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),out='artifacts/sponsors';await fs.mkdir(out,{recursive:true});
const health=await(await fetch(origin+'/api/health')).json();assert.equal(health.commit,expected);
const country=await(await fetch(origin+'/api/countries/IR')).json();const narratives=country.narratives.filter(n=>n.label&&n.models?.verda&&n.timeline_store==='Tiger Data');assert(narratives.length,'Real provider-verified narrative evidence is required before acceptance');
for(const n of narratives){assert.equal(n.trend_30d.length,30);assert.equal(n.trend_dates.length,30);assert(n.trend_30d.reduce((a,b)=>a+b,0)>0);}
const browser=await chromium.launch({headless:true}),report={origin,commit:expected,at:new Date().toISOString(),runs:[]};
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const shot=async name=>{await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,name+' overflow');assert(!/\bundefined\b|\bnull\b/.test(await page.locator('body').innerText()),name+' raw values');await page.screenshot({path:out+'/'+name+'-'+width+'.png'});};
 try{
  await page.goto(origin);await page.locator('a[href="/country?cc=FI"]').first().waitFor();await shot('home');
  await page.locator('a[href="/country?cc=FI"]').first().click();await page.locator('.dossier').first().waitFor();await shot('finland');
  await page.locator('.dossier summary').first().click();await page.locator('.dossier .evid[open]').first().waitFor();await shot('evidence');
  await page.getByRole('link',{name:'Every copy and the timeline',exact:true}).first().click();await page.locator('#lanes .lane.copy .pm').first().waitFor();await shot('story');
  await page.getByRole('link',{name:'Signal Fire',exact:true}).first().click();await page.locator('a[href="/country?cc=IR"]').first().waitFor();await page.locator('a[href="/country?cc=IR"]').first().click();
  await page.locator('.narr .nrow').first().waitFor();await page.getByText('Summary checked with NVIDIA Nemotron on Verda',{exact:true}).first().waitFor();await page.getByText(/Tiger Data.*linked examples/).first().waitFor();await page.locator('.narr').scrollIntoViewIfNeeded();await shot('nemotron-tiger');
  const charts=await page.locator('.narr svg[role="img"]').all();assert.equal(charts.length,narratives.length);for(const [i,chart]of charts.entries())assert((await chart.getAttribute('aria-label')).startsWith(narratives[i].trend_30d.reduce((a,b)=>a+b,0)+' retrieved source pages'));
  await page.getByRole('link',{name:'Method',exact:true}).first().click();await page.getByText('Verda request attempts',{exact:true}).waitFor();assert((await page.locator('#live').innerText()).toLowerCase().includes('verda request attempts'));await shot('method');assert.deepEqual(errors,[]);
  // A browser-only controlled regression. It never writes fabricated data to the service.
  await page.route('**/api/countries/IR',async route=>{const response=await route.fetch(),body=await response.json();body.narratives=body.narratives.map(n=>({...n,trend_30d:Array(30).fill(0)}));await route.fulfill({response,json:body});});
  await page.goto(origin+'/country?cc=IR');await page.locator('.narr svg[aria-label^="0 retrieved"]').first().waitFor();assert((await page.locator('.narr svg').first().getAttribute('aria-label')).includes('peak 0 in one day'),'An empty source history must not invent a peak');
  report.runs.push({width,passed:true,checks:['Finland briefing and evidence','real source copy timeline','Nemotron-verifiable narrative labels','Tiger Data 30-day source buckets','method usage without invented pricing','no console error or overflow','empty-history chart does not invent a peak'],screenshots:['home','finland','story','nemotron-tiger','method'].map(name=>out+'/'+name+'-'+width+'.png')});
 }finally{await context.close();}
}}finally{await browser.close();await fs.writeFile(out+'/v2-e2e.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
