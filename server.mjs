import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {analyze,VERSION,safeURL} from './engine.mjs';import {scrape} from './retrieval.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
for(const p of [process.env.FACT_WEIGHT_ENV||path.join(root,'.env')]){try{const env=await fs.readFile(p,'utf8');for(const l of env.split('\n')){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}catch{}}
const slots={active:0,total:0};const limits=new Map();const MAX_DAILY=Number(process.env.MAX_DAILY_ANALYSES||150);let day=new Date().toISOString().slice(0,10);
function send(res,status,d){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(d))}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
 const url=new URL(req.url,'http://localhost');
 try{
  if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{app:'Fact Weight',version:VERSION,hostingerRouterConfigured:!!process.env.HOSTINGER_AI_ROUTER_API_KEY,contextConfigured:!!process.env.CONTEXT_DEV_API_KEY,model:process.env.ROUTER_MODEL||'gpt-4.1-mini',time:new Date().toISOString()});
  if(req.method==='GET'&&url.pathname==='/api/evaluation'){let d;try{d=JSON.parse(await fs.readFile(path.join(root,'eval/summary.json'),'utf8'))}catch{d={status:'pending',note:'Evaluation has not run.'}}return send(res,200,d)}
  if(req.method==='POST'&&url.pathname==='/api/analyze'){
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'Send JSON.'});
   const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return send(res,403,{error:'Use this site to start an analysis.'});
   const now=Date.now(),ip=req.socket.remoteAddress;const history=(limits.get(ip)||[]).filter(t=>now-t<60000);if(history.length>=4)return send(res,429,{error:'Please wait a minute before another analysis.'});limits.set(ip,[...history,now]);if(limits.size>2000)limits.delete(limits.keys().next().value);
   const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;slots.total=0}
   if(slots.active>=2)return send(res,429,{error:'Two readers are checking evidence. Please retry shortly.'});if(slots.total>=MAX_DAILY)return send(res,429,{error:'The daily demo limit is reached. Please return tomorrow.'});
   let body='';for await(const b of req){body+=b;if(body.length>18000)return send(res,413,{error:'Use a shorter post, up to 6,000 characters.'})}
   let input;try{input=JSON.parse(body)}catch{return send(res,400,{error:'Invalid JSON.'})}
   if(typeof input.text!=='string'||input.text.trim().length<8||input.text.length>6000)return send(res,400,{error:'Paste a claim or post between 8 and 6,000 characters.'});
   const urls=[...new Set(Array.isArray(input.urls)?input.urls:[])];if(urls.length<1||urls.length>4||urls.some(u=>!safeURL(u)))return send(res,400,{error:'Add between one and four public HTTPS article URLs.'});
   slots.active++;slots.total++;const start=performance.now();
   try{
    const fetched=await Promise.allSettled(urls.map(u=>scrape(u,{fresh:input.fresh===true})));const sources=[],warnings=[];fetched.forEach((x,i)=>{if(x.status==='fulfilled')sources.push({...x.value,id:`S${i+1}`});else warnings.push({url:urls[i],error:x.reason?.message||'Retrieval failed.'})});
    if(!sources.length)return send(res,502,{error:'No source could be retrieved. Try another article URL.',warnings});
    const result=await analyze(input.text,sources);return send(res,200,{...result,warnings,elapsedMs:Math.round(performance.now()-start),analyzedAt:new Date().toISOString(),version:VERSION,retrieval:'Context.dev',hosting:process.env.DEPLOYMENT_LABEL||'Local development'});
   }finally{slots.active--}
  }
  if(req.method!=='GET')return send(res,405,{error:'Method not allowed.'});
  const name={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/method':'method.html'}[url.pathname];
  if(!name)return send(res,404,{error:'Page not found.'});
  const data=await fs.readFile(path.join(root,'public',name));res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-cache'});res.end(data);
 }catch(e){send(res,502,{error:e.message?.match(/Hostinger|Context.dev|model returned/)?e.message:'Analysis could not finish. Please retry.'})}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT||4320),process.env.HOST||'127.0.0.1',()=>console.log(`Fact Weight listening on ${process.env.HOST||'127.0.0.1'}:${process.env.PORT||4320}`));
